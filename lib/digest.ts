import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { CATEGORIES } from "@/lib/categories";
import { createSupabaseServerClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import type {
  Article,
  ArticleCategory,
  Source,
  WeeklyDigest,
  WeeklyDigestCategoryDetail,
  WeeklyDigestCategorySummary,
  WeeklyDigestDetail,
  WeeklyDigestSourceStat,
  WeeklyDigestSourceStats,
  WeeklyDigestStatus,
} from "@/lib/types";

// Requests go through OpenRouter's OpenAI-compatible API rather than a
// provider SDK, so the model is just whichever OpenRouter slug is configured
// (see https://openrouter.ai/models). Default: Anthropic's Claude Sonnet 5.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-5";
const LLM_TIMEOUT_MS = 55_000;
const MAX_ARTICLES_PER_DIGEST = 200;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const DIGEST_TOOL_NAME = "emit_weekly_digest";

export type DigestGenerationResult = {
  weekStart: string;
  weekEnd: string;
  slug: string;
  status: WeeklyDigestStatus;
  articlesConsidered: number;
  errorMessage?: string;
};

type DigestRow = {
  week_start: string;
  week_end: string;
  slug: string;
  overall_summary: string | null;
  category_summaries: Partial<Record<ArticleCategory, WeeklyDigestCategorySummary>> | null;
  source_stats: Record<string, WeeklyDigestSourceStats>;
  articles_considered: number;
  status: WeeklyDigestStatus;
  error_message: string | null;
  model: string | null;
  generated_at: string;
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// ISO week: Monday is day 1 ... Sunday is day 7 (Date#getUTCDay() returns 0 for Sunday).
function mondayOfUtcWeek(date: Date) {
  const day = date.getUTCDay();
  const isoDay = day === 0 ? 7 : day;
  const monday = startOfUtcDay(date);
  monday.setUTCDate(monday.getUTCDate() - (isoDay - 1));
  return monday;
}

function slugFor(weekStart: Date) {
  return weekStart.toISOString().slice(0, 10);
}

/**
 * Resolves the [weekStart, weekEnd) window to summarize, in UTC.
 * - With no input: the most recently completed ISO week (Mon 00:00 UTC - Sun
 *   23:59:59.999 UTC), so a cron firing Monday morning summarizes the week
 *   that just ended.
 * - With a `weekStartInput` date: the ISO week (Mon-Sun) containing that
 *   date, for backfill or manual regeneration of a specific past week.
 */
export function resolveWeekRange(weekStartInput?: string | null) {
  if (weekStartInput) {
    const parsed = new Date(`${weekStartInput}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`Invalid week_start: ${weekStartInput}`);
    }
    const weekStart = mondayOfUtcWeek(parsed);
    return { weekStart, weekEnd: new Date(weekStart.getTime() + WEEK_MS) };
  }

  const thisWeekStart = mondayOfUtcWeek(new Date());
  const weekStart = new Date(thisWeekStart.getTime() - WEEK_MS);
  return { weekStart, weekEnd: thisWeekStart };
}

function buildSourceStats(articles: Article[]) {
  const stats: Record<string, WeeklyDigestSourceStats> = {};
  for (const article of articles) {
    stats[article.source_id] = { count: (stats[article.source_id]?.count ?? 0) + 1 };
  }
  return stats;
}

function groupByCategory(articles: Article[]) {
  const grouped = new Map<ArticleCategory, Article[]>();
  for (const article of articles) {
    if (!article.category) continue;
    const bucket = grouped.get(article.category) ?? [];
    bucket.push(article);
    grouped.set(article.category, bucket);
  }
  return grouped;
}

type LlmSummaryResult = {
  overallSummary: string;
  categorySummaries: Partial<Record<ArticleCategory, string>>;
  model: string;
};

type OpenRouterResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      tool_calls?: Array<{
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
  error?: { message?: string };
};

/**
 * Calls the configured OpenRouter model once for the whole digest (cheaper
 * and more consistent than one call per category) and forces a structured
 * tool-call response so the summary shape is reliable to parse. OpenRouter
 * exposes an OpenAI-compatible chat-completions API in front of many
 * providers/models (see https://openrouter.ai/docs), so this uses plain
 * `fetch` rather than a provider-specific SDK.
 *
 * The model is only ever shown the article rows actually crawled that week —
 * it is explicitly instructed not to introduce facts beyond them, and every
 * category summary stays linked (via `article_ids`) back to its source
 * articles so a reader can verify any claim against the original post.
 */
async function summarizeWithOpenRouter(
  apiKey: string,
  articlesByCategory: Map<ArticleCategory, Article[]>,
  sourceNameById: Map<string, string>,
): Promise<LlmSummaryResult> {
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const categoryLabelById = new Map(CATEGORIES.map((category) => [category.id, category.name]));

  const categoryPayload = [...articlesByCategory.entries()].map(([category, bucket]) => ({
    category,
    label: categoryLabelById.get(category) ?? category,
    articles: bucket.map((article) => ({
      title: article.title,
      excerpt: article.excerpt?.slice(0, 300) ?? null,
      source: sourceNameById.get(article.source_id) ?? article.source_id,
      url: article.url,
      published_at: article.published_at,
    })),
  }));

  const categoryProperties: Record<string, { type: "string"; description: string }> = {};
  for (const { category, label } of categoryPayload) {
    categoryProperties[category] = {
      type: "string",
      description: `2-4 sentence recap for the "${label}" category, grounded only in the given articles for that category.`,
    };
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      // Optional but recommended by OpenRouter for attributing usage; safe to
      // send even without a real deployed URL.
      "HTTP-Referer": "https://www.aiwar.site",
      "X-Title": "AI War Weekly Digest",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: [
            "You write factual weekly recaps for AI War, a site that tracks OpenAI, Anthropic, and Google DeepMind.",
            "You will be given the ONLY facts you may use: a JSON list of articles actually published this week, grouped by category.",
            "Never invent facts, numbers, dates, or claims that are not present in the given article titles or excerpts.",
            "If a category has few articles, keep its summary short rather than padding it.",
            "Write in a neutral, editorial tone. No marketing language, no exclamation points.",
          ].join(" "),
        },
        {
          role: "user",
          content:
            `Here is this week's crawled article data, grouped by category:\n\n${JSON.stringify(categoryPayload, null, 2)}` +
            `\n\nCall ${DIGEST_TOOL_NAME} with your recap.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: DIGEST_TOOL_NAME,
            description: "Emit the structured weekly AI digest.",
            parameters: {
              type: "object",
              properties: {
                overall_summary: {
                  type: "string",
                  description:
                    "3-6 sentence overall recap of the week across OpenAI, Anthropic, and Google DeepMind, grounded only in the given articles.",
                },
                categories: {
                  type: "object",
                  properties: categoryProperties,
                  required: Object.keys(categoryProperties),
                },
              },
              required: ["overall_summary", "categories"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: DIGEST_TOOL_NAME } },
    }),
  });

  const payload = (await response.json()) as OpenRouterResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message || `OpenRouter request failed with status ${response.status}`);
  }

  const toolCall = payload.choices?.[0]?.message?.tool_calls?.find(
    (call) => call.function?.name === DIGEST_TOOL_NAME,
  );
  if (!toolCall?.function?.arguments) {
    throw new Error("OpenRouter did not return a structured digest.");
  }

  let input: { overall_summary?: string; categories?: Record<string, string> };
  try {
    input = JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error("OpenRouter returned malformed digest JSON.");
  }

  if (!input.overall_summary || !input.categories) {
    throw new Error("OpenRouter response is missing overall_summary or categories.");
  }

  return {
    overallSummary: input.overall_summary,
    categorySummaries: input.categories as Partial<Record<ArticleCategory, string>>,
    model: payload.model || model,
  };
}

async function upsertDigest(supabase: SupabaseClient, row: DigestRow) {
  const { error } = await supabase.from("weekly_digests").upsert(row, { onConflict: "week_start" });
  if (error) throw error;
}

/**
 * Generates (or regenerates) the weekly digest for one ISO week and upserts
 * it into `weekly_digests`. Safe to call repeatedly for the same week
 * (upserts on `week_start`, never duplicates). A generation failure is
 * recorded on that week's row with `status: "failed"` instead of throwing
 * past this function, so callers (the cron route, a manual trigger) don't
 * need special-case handling and other weeks' rows are left untouched.
 */
export async function generateWeeklyDigest(options?: { weekStart?: string | null }): Promise<DigestGenerationResult> {
  if (!hasSupabaseServerEnv()) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY.");
  }

  const { weekStart, weekEnd } = resolveWeekRange(options?.weekStart);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = new Date(weekEnd.getTime() - DAY_MS).toISOString().slice(0, 10);
  const slug = slugFor(weekStart);
  const supabase = createSupabaseServerClient();

  const [articlesResult, sourcesResult] = await Promise.all([
    supabase
      .from("articles")
      .select("*")
      .gte("published_at", weekStart.toISOString())
      .lt("published_at", weekEnd.toISOString())
      .order("published_at", { ascending: true })
      .limit(MAX_ARTICLES_PER_DIGEST),
    supabase.from("sources").select("id, name"),
  ]);

  if (articlesResult.error) throw articlesResult.error;
  if (sourcesResult.error) throw sourcesResult.error;

  const articles = (articlesResult.data ?? []) as Article[];
  const sources = (sourcesResult.data ?? []) as Pick<Source, "id" | "name">[];
  const sourceNameById = new Map(sources.map((source) => [source.id, source.name]));
  const sourceStats = buildSourceStats(articles);

  if (articles.length === 0) {
    await upsertDigest(supabase, {
      week_start: weekStartStr,
      week_end: weekEndStr,
      slug,
      overall_summary: "No articles were crawled from OpenAI, Anthropic, or Google DeepMind this week.",
      category_summaries: {},
      source_stats: sourceStats,
      articles_considered: 0,
      status: "success",
      error_message: null,
      model: null,
      generated_at: new Date().toISOString(),
    });
    return { weekStart: weekStartStr, weekEnd: weekEndStr, slug, status: "success", articlesConsidered: 0 };
  }

  const articlesByCategory = groupByCategory(articles);

  try {
    const { overallSummary, categorySummaries, model } = await summarizeWithOpenRouter(
      apiKey,
      articlesByCategory,
      sourceNameById,
    );

    const categorySummariesRecord: Partial<Record<ArticleCategory, WeeklyDigestCategorySummary>> = {};
    for (const [category, bucket] of articlesByCategory) {
      categorySummariesRecord[category] = {
        summary: categorySummaries[category] ?? "",
        article_ids: bucket.map((article) => article.id),
      };
    }

    await upsertDigest(supabase, {
      week_start: weekStartStr,
      week_end: weekEndStr,
      slug,
      overall_summary: overallSummary,
      category_summaries: categorySummariesRecord,
      source_stats: sourceStats,
      articles_considered: articles.length,
      status: "success",
      error_message: null,
      model,
      generated_at: new Date().toISOString(),
    });

    return { weekStart: weekStartStr, weekEnd: weekEndStr, slug, status: "success", articlesConsidered: articles.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await upsertDigest(supabase, {
      week_start: weekStartStr,
      week_end: weekEndStr,
      slug,
      overall_summary: null,
      category_summaries: null,
      source_stats: sourceStats,
      articles_considered: articles.length,
      status: "failed",
      error_message: message,
      model: null,
      generated_at: new Date().toISOString(),
    });

    return {
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      slug,
      status: "failed",
      articlesConsidered: articles.length,
      errorMessage: message,
    };
  }
}

// ---------------------------------------------------------------------------
// Read side: page data loaders for /digest, /digest/[slug], and the digest
// panel's API routes (app/api/digests/**). These never touch OpenRouter —
// they only read what generateWeeklyDigest() already wrote to
// weekly_digests. See lib/digest-format.ts for the client-safe date
// formatter shared with components/DigestPanel.tsx.
// ---------------------------------------------------------------------------

const WEEK_START_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function getLatestWeeklyDigest() {
  if (!hasSupabaseServerEnv()) return null;

  const { data, error } = await createSupabaseServerClient()
    .from("weekly_digests")
    .select("*")
    .eq("status", "success")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as WeeklyDigest;
}

export async function getWeeklyDigestList(limit = 52) {
  if (!hasSupabaseServerEnv()) return [];

  const { data, error } = await createSupabaseServerClient()
    .from("weekly_digests")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as WeeklyDigest[];
}

export async function getWeeklyDigestPageData(slug: string): Promise<WeeklyDigestDetail | null> {
  if (!hasSupabaseServerEnv() || !WEEK_START_PATTERN.test(slug)) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("weekly_digests").select("*").eq("week_start", slug).maybeSingle();
  if (error || !data) return null;

  const digest = data as WeeklyDigest;
  const articleIds = Object.values(digest.category_summaries ?? {}).flatMap((entry) => entry.article_ids);
  const sourceIds = Object.keys(digest.source_stats ?? {});

  const [articlesResult, sourcesResult] = await Promise.all([
    articleIds.length
      ? supabase.from("articles").select("*").in("id", articleIds)
      : Promise.resolve({ data: [] as Article[], error: null }),
    sourceIds.length
      ? supabase.from("sources").select("id, name, color, logo_path").in("id", sourceIds)
      : Promise.resolve({ data: [] as Source[], error: null }),
  ]);

  const articlesById = new Map(((articlesResult.data ?? []) as Article[]).map((article) => [article.id, article]));
  const sourceById = new Map(
    ((sourcesResult.data ?? []) as Pick<Source, "id" | "name" | "color" | "logo_path">[]).map((source) => [
      source.id,
      source,
    ]),
  );

  const categories: WeeklyDigestCategoryDetail[] = [];
  for (const option of CATEGORIES) {
    if (option.id === "all") continue;
    const entry = digest.category_summaries?.[option.id];
    if (!entry) continue;

    const categoryArticles = entry.article_ids
      .map((id) => articlesById.get(id))
      .filter((article): article is Article => Boolean(article))
      .sort((a, b) => new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime());
    if (!categoryArticles.length) continue;

    categories.push({ category: option.id, label: option.name, summary: entry.summary, articles: categoryArticles });
  }

  const sourceStats: WeeklyDigestSourceStat[] = Object.entries(digest.source_stats ?? {})
    .map(([sourceId, stat]) => {
      const source = sourceById.get(sourceId);
      return source ? { source, count: stat.count } : null;
    })
    .filter((item): item is WeeklyDigestSourceStat => Boolean(item))
    .sort((a, b) => b.count - a.count);

  return { digest, sourceStats, categories };
}
