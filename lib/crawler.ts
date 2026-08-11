import { XMLParser } from "fast-xml-parser";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { load } from "cheerio";

type Source = {
  id: string;
  name: string;
  domain: string;
  feed_url: string | null;
};

type FeedItem = {
  title?: string;
  link?: string | { href?: string };
  guid?: string | { "#text"?: string };
  description?: string;
  pubDate?: string;
  published?: string;
  updated?: string;
  author?: string;
  category?: string | string[];
  enclosure?: unknown;
  image?: unknown;
  "media:content"?: unknown;
  "media:thumbnail"?: unknown;
  [key: string]: unknown;
};

type ArticleRow = {
  title: string;
  excerpt: string | null;
  url: string;
  source_id: string;
  source_domain: string;
  author: string;
  category: string;
  thumbnail_url: string | null;
  hero_variant: string;
  read_minutes: number;
  published_at: string;
  crawled_at: string;
};

type ExistingArticle = {
  url: string;
  thumbnail_url: string | null;
};

type BackfillArticle = {
  id: string;
  url: string;
  source_id: string;
};

type SourceConfig = {
  pageUrls: string[];
  rssUrl?: string;
  hero: string;
};

const SOURCE_CONFIG: Record<string, SourceConfig> = {
  openai: {
    pageUrls: [
      "https://openai.com/news/research/",
      "https://openai.com/news/product-releases/",
      "https://openai.com/news/safety-alignment/",
      "https://openai.com/news/engineering/",
      "https://openai.com/news/security/",
      "https://openai.com/news/global-affairs/",
      "https://openai.com/news/ai-adoption/",
      "https://openai.com/news/company-announcements/",
    ],
    // OpenAI category pages can be Cloudflare-protected for server-side fetches. The
    // official RSS feed is the stable machine-readable source for these news sections.
    rssUrl: "https://openai.com/news/rss.xml",
    hero: "spiral",
  },
  anthropic: {
    pageUrls: [
      "https://www.anthropic.com/research",
      "https://www.anthropic.com/news",
    ],
    hero: "aurora",
  },
  deepmind: {
    pageUrls: [
      "https://deepmind.google/research/",
      "https://deepmind.google/science/",
    ],
    rssUrl: "https://deepmind.google/blog/rss.xml",
    hero: "grid",
  },
};

const TWO_MONTHS_MS = 1000 * 60 * 60 * 24 * 61;
const FETCH_TIMEOUT_MS = 12_000;
const READER_REQUEST_INTERVAL_MS = 3_200;
let nextReaderRequestAt = 0;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
});

function arrayify<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function stripHtml(value = "") {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(value: string, baseUrl: string) {
  return new URL(value, baseUrl).toString();
}

function normalizeImageUrl(value: string | null | undefined, baseUrl: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;

  try {
    const url = new URL(trimmed, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const nested = url.searchParams.get("url");
    if (url.pathname.includes("/_next/image") && nested) {
      return new URL(nested, baseUrl).toString();
    }
    return url.toString();
  } catch {
    return null;
  }
}

function urlFromUnknown(value: unknown, baseUrl: string): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = urlFromUnknown(item, baseUrl);
      if (url) return url;
    }
    return null;
  }
  if (typeof value === "string") return normalizeImageUrl(value, baseUrl);
  if (typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  return (
    urlFromUnknown(record.url, baseUrl) ||
    urlFromUnknown(record.href, baseUrl) ||
    urlFromUnknown(record.src, baseUrl)
  );
}

function firstSrcSetUrl(srcset: string | undefined, baseUrl: string) {
  const first = srcset?.split(",").at(-1)?.trim().split(/\s+/)[0];
  return normalizeImageUrl(first, baseUrl);
}

function imageFromHtml(html: string | undefined, baseUrl: string) {
  if (!html) return null;
  const $ = load(html);
  const image = $("img").first();
  return (
    normalizeImageUrl(image.attr("src"), baseUrl) ||
    firstSrcSetUrl(image.attr("srcset"), baseUrl)
  );
}

function imageFromFeedItem(item: FeedItem, baseUrl: string) {
  return (
    urlFromUnknown(item["media:thumbnail"], baseUrl) ||
    urlFromUnknown(item["media:content"], baseUrl) ||
    urlFromUnknown(item.enclosure, baseUrl) ||
    urlFromUnknown(item.image, baseUrl) ||
    imageFromHtml(item.description, baseUrl)
  );
}

function dedupeRows(rows: ArticleRow[]) {
  return [...new Map(rows.map((row) => [row.url, row])).values()];
}

function imageFromElement($: ReturnType<typeof load>, element: ReturnType<ReturnType<typeof load>>, baseUrl: string) {
  const image = element.find("img").first();
  return (
    normalizeImageUrl(image.attr("src"), baseUrl) ||
    firstSrcSetUrl(image.attr("srcset"), baseUrl)
  );
}

async function fetchArticleThumbnail(url: string) {
  if (new URL(url).hostname === "openai.com") {
    return fetchReaderThumbnail(url);
  }

  try {
    const html = await fetchText(url);
    const $ = load(html);
    const metaImage =
      $("meta[property='og:image']").attr("content") ||
      $("meta[name='twitter:image']").attr("content");
    const articleImage =
      $("main img").first().attr("src") ||
      $("article img").first().attr("src") ||
      $("img").first().attr("src");

    return normalizeImageUrl(metaImage || articleImage, url);
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReaderSlot() {
  const waitMs = Math.max(0, nextReaderRequestAt - Date.now());
  if (waitMs > 0) await sleep(waitMs);
  nextReaderRequestAt = Date.now() + READER_REQUEST_INTERVAL_MS;
}

async function fetchReaderThumbnail(url: string) {
  await waitForReaderSlot();

  try {
    const sourceUrl = new URL(url);
    const readerUrl = `https://r.jina.ai/http://${sourceUrl.host}${sourceUrl.pathname}${sourceUrl.search}`;
    const response = await fetch(readerUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      data?: { metadata?: Record<string, unknown> };
    };
    const metadata = payload.data?.metadata;
    const image = metadata?.["og:image"] || metadata?.["twitter:image"];

    return typeof image === "string" ? normalizeImageUrl(image, url) : null;
  } catch {
    return null;
  }
}

function toIsoDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function dateFromText(value: string) {
  const match = value.match(
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+\d{4}\b/i,
  );
  return toIsoDate(match?.[0]);
}

function isRecent(iso: string | null, cutoff: Date) {
  if (!iso) return false;
  return new Date(iso).getTime() >= cutoff.getTime();
}

function normalizeCategory(input: string) {
  const text = input.toLowerCase();

  if (/model|gpt|claude|gemini|release|launch|opus|sonnet|haiku|o\d/.test(text)) return "models";
  if (/research|paper|benchmark|eval|study|science|geometry/.test(text)) return "research";
  if (/api|developer|product|platform|app|tool|codex|design/.test(text)) return "product";
  if (/safety|preparedness|alignment|risk|policy|provenance/.test(text)) return "safety";
  if (/alphafold|biology|health|protein|medicine|climate/.test(text)) return "science";
  if (/government|society|education|economic|public|country|global affairs/.test(text)) return "policy";
  if (/partnership|company|enterprise|adoption|customer|malta|singapore|dell|uol|folha/.test(text)) return "company";
  return "announcements";
}

function linkFrom(item: FeedItem) {
  if (typeof item.link === "string") return item.link;
  return item.link?.href || (typeof item.guid === "string" ? item.guid : item.guid?.["#text"]);
}

function rowFromFeedItem(item: FeedItem, source: Source, config: SourceConfig, cutoff: Date): ArticleRow | null {
  const url = linkFrom(item);
  const publishedAt = toIsoDate(item.pubDate || item.published || item.updated);
  if (!item.title || !url || !publishedAt || !isRecent(publishedAt, cutoff)) return null;

  const rawCategory = arrayify(item.category).join(" ");

  return {
    title: stripHtml(item.title),
    excerpt: stripHtml(item.description || "").slice(0, 420) || null,
    url,
    source_id: source.id,
    source_domain: source.domain,
    author: item.author || source.name,
    category: normalizeCategory(`${rawCategory} ${item.title}`),
    thumbnail_url: imageFromFeedItem(item, url),
    hero_variant: config.hero,
    read_minutes: 4,
    published_at: publishedAt,
    crawled_at: new Date().toISOString(),
  };
}

async function fetchText(url: string, timeoutMs = FETCH_TIMEOUT_MS) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "user-agent": "AIWarBot/0.1 (+https://github.com/tdminh1/aiwar)",
    },
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.text();
}

async function crawlRss(source: Source, config: SourceConfig, cutoff: Date) {
  if (!config.rssUrl) return [];

  const xml = await fetchText(config.rssUrl);
  const parsed = parser.parse(xml);
  const channel = parsed.rss?.channel;
  return arrayify<FeedItem>(channel?.item ?? parsed.feed?.entry)
    .map((item) => rowFromFeedItem(item, source, config, cutoff))
    .filter((row): row is ArticleRow => Boolean(row));
}

async function crawlAnthropic(source: Source, config: SourceConfig, cutoff: Date) {
  const rows = new Map<string, ArticleRow>();

  for (const pageUrl of config.pageUrls) {
    const html = await fetchText(pageUrl);
    const $ = load(html);

    $("a").each((_, element) => {
      const link = $(element);
      const href = link.attr("href");
      if (
        !href ||
        (
          !href.startsWith("/research/") &&
          !href.startsWith("/news/") &&
          !href.startsWith("/glasswing") &&
          !href.startsWith("/81k-interviews")
        )
      ) {
        return;
      }

      const fullText = link.text().replace(/\s+/g, " ").trim();
      const publishedAt = toIsoDate(link.find("time").first().text().trim()) || dateFromText(fullText);
      if (!publishedAt || !isRecent(publishedAt, cutoff)) return;

      const title =
        link.find("h2,h3,h4").first().text().trim() ||
        fullText.replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+\d{4}\b/i, "").trim();
      if (!title) return;

      const categoryText = link.find("span").first().text().trim();
      const excerpt = link.find("p").first().text().trim();
      const url = absoluteUrl(href, pageUrl);
      const container = link.closest("div");
      const thumbnail =
        imageFromElement($, link, pageUrl) ||
        imageFromElement($, container, pageUrl);

      rows.set(url, {
        title,
        excerpt: excerpt || null,
        url,
        source_id: source.id,
        source_domain: source.domain,
        author: source.name,
        category: normalizeCategory(`${categoryText} ${title}`),
        thumbnail_url: thumbnail,
        hero_variant: config.hero,
        read_minutes: 4,
        published_at: publishedAt,
        crawled_at: new Date().toISOString(),
      });
    });
  }

  return [...rows.values()];
}

async function hydrateNewArticleThumbnails(
  supabase: SupabaseClient,
  source: Source,
  rows: ArticleRow[],
) {
  const { data, error } = await supabase
    .from("articles")
    .select("url, thumbnail_url")
    .eq("source_id", source.id);

  if (error) throw error;

  const existingByUrl = new Map(
    ((data ?? []) as ExistingArticle[]).map((article) => [article.url, article.thumbnail_url]),
  );

  for (const row of rows) {
    const existingThumbnail = existingByUrl.get(row.url);
    if (existingThumbnail) {
      row.thumbnail_url = existingThumbnail;
      continue;
    }

    if (!existingByUrl.has(row.url) && !row.thumbnail_url) {
      row.thumbnail_url = await fetchArticleThumbnail(row.url);
    }
  }
}

async function crawlSource(
  supabase: SupabaseClient,
  source: Source,
  cutoff: Date,
) {
  const config = SOURCE_CONFIG[source.id];
  if (!config) return { found: 0, saved: 0 };

  const startedAt = new Date().toISOString();

  await supabase
    .from("sources")
    .update({ feed_url: config.pageUrls[0] })
    .eq("id", source.id);

  let rows: ArticleRow[] = [];
  if (source.id === "anthropic") {
    rows = await crawlAnthropic(source, config, cutoff);
  } else {
    rows = await crawlRss(source, config, cutoff);
  }
  rows = dedupeRows(rows);
  await hydrateNewArticleThumbnails(supabase, source, rows);

  if (rows.length > 0) {
    const { error } = await supabase.from("articles").upsert(rows, { onConflict: "url" });
    if (error) throw error;
  }

  await supabase.from("sources").update({ last_crawled_at: new Date().toISOString() }).eq("id", source.id);
  await supabase.from("crawl_runs").insert({
    source_id: source.id,
    status: "success",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    articles_found: rows.length,
    articles_saved: rows.length,
  });

  return { found: rows.length, saved: rows.length };
}

export type CrawlSourceSummary = {
  sourceId: string;
  sourceName: string;
  status: "success" | "error";
  found: number;
  saved: number;
  error?: string;
};

function createCrawlerClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function backfillThumbnails(options?: {
  limit?: number;
  sourceId?: string;
  dryRun?: boolean;
  onProgress?: (message: string) => void;
}) {
  const limit = Math.min(500, Math.max(1, Math.trunc(options?.limit ?? 80)));
  const supabase = createCrawlerClient();

  let query = supabase
    .from("articles")
    .select("id, url, source_id")
    .is("thumbnail_url", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (options?.sourceId) query = query.eq("source_id", options.sourceId);

  const { data, error } = await query;
  if (error) throw error;

  const articles = (data ?? []) as BackfillArticle[];
  let found = 0;
  let updated = 0;

  for (const [index, article] of articles.entries()) {
    const thumbnailUrl = await fetchArticleThumbnail(article.url);
    if (!thumbnailUrl) {
      options?.onProgress?.(`[${index + 1}/${articles.length}] ${article.source_id}: no thumbnail`);
      continue;
    }

    found += 1;
    if (!options?.dryRun) {
      const { error: updateError } = await supabase
        .from("articles")
        .update({ thumbnail_url: thumbnailUrl })
        .eq("id", article.id)
        .is("thumbnail_url", null);
      if (updateError) throw updateError;
      updated += 1;
    }

    options?.onProgress?.(
      `[${index + 1}/${articles.length}] ${article.source_id}: ${options?.dryRun ? "found" : "updated"}`,
    );
  }

  return { checked: articles.length, found, updated, dryRun: Boolean(options?.dryRun) };
}

export async function runCrawler() {
  const cutoff = new Date(Date.now() - TWO_MONTHS_MS);
  const supabase = createCrawlerClient();

  const { data: sources, error } = await supabase
    .from("sources")
    .select("id, name, domain, feed_url")
    .eq("is_active", true)
    .in("id", Object.keys(SOURCE_CONFIG));

  if (error) throw error;

  const summaries = await Promise.all(((sources ?? []) as Source[]).map(async (source) => {
    try {
      const result = await crawlSource(supabase, source, cutoff);
      return {
        sourceId: source.id,
        sourceName: source.name,
        status: "success",
        found: result.found,
        saved: result.saved,
      } satisfies CrawlSourceSummary;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await supabase.from("crawl_runs").insert({
        source_id: source.id,
        status: "error",
        finished_at: new Date().toISOString(),
        error_message: message,
      });
      return {
        sourceId: source.id,
        sourceName: source.name,
        status: "error",
        found: 0,
        saved: 0,
        error: message,
      } satisfies CrawlSourceSummary;
    }
  }));

  return {
    cutoff: cutoff.toISOString(),
    sources: summaries,
    found: summaries.reduce((total, item) => total + item.found, 0),
    saved: summaries.reduce((total, item) => total + item.saved, 0),
    errors: summaries.filter((item) => item.status === "error").length,
  };
}
