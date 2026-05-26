import { XMLParser } from "fast-xml-parser";
import { createClient } from "@supabase/supabase-js";
import { load } from "cheerio";
import { config } from "dotenv";

config({ path: ".env.local" });

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
};

type ArticleRow = {
  title: string;
  excerpt: string | null;
  url: string;
  source_id: string;
  source_domain: string;
  author: string;
  category: string;
  hero_variant: string;
  read_minutes: number;
  published_at: string;
  crawled_at: string;
};

type SourceConfig = {
  pageUrl: string;
  rssUrl?: string;
  hero: string;
};

const SOURCE_CONFIG: Record<string, SourceConfig> = {
  openai: {
    pageUrl: "https://openai.com/news/company-announcements/",
    // The category page is Cloudflare-protected for server-side fetches. The official RSS
    // feed remains accessible, so we use it as the machine-readable source and keep the
    // requested page URL in Supabase as the source landing page.
    rssUrl: "https://openai.com/news/rss.xml",
    hero: "spiral",
  },
  anthropic: {
    pageUrl: "https://www.anthropic.com/news",
    hero: "aurora",
  },
  deepmind: {
    pageUrl: "https://deepmind.google/blog/",
    rssUrl: "https://deepmind.google/blog/rss.xml",
    hero: "grid",
  },
};

const TWO_MONTHS_MS = 1000 * 60 * 60 * 24 * 61;
const cutoff = new Date(Date.now() - TWO_MONTHS_MS);
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

function toIsoDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isRecent(iso: string | null) {
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

function rowFromFeedItem(item: FeedItem, source: Source, config: SourceConfig): ArticleRow | null {
  const url = linkFrom(item);
  const publishedAt = toIsoDate(item.pubDate || item.published || item.updated);
  if (!item.title || !url || !publishedAt || !isRecent(publishedAt)) return null;

  const rawCategory = arrayify(item.category).join(" ");
  if (source.id === "openai" && !/\bcompany\b/i.test(rawCategory)) {
    return null;
  }

  return {
    title: stripHtml(item.title),
    excerpt: stripHtml(item.description || "").slice(0, 420) || null,
    url,
    source_id: source.id,
    source_domain: source.domain,
    author: item.author || source.name,
    category: normalizeCategory(`${rawCategory} ${item.title}`),
    hero_variant: config.hero,
    read_minutes: 4,
    published_at: publishedAt,
    crawled_at: new Date().toISOString(),
  };
}

async function fetchText(url: string) {
  const response = await fetch(url, {
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

async function crawlRss(source: Source, config: SourceConfig) {
  if (!config.rssUrl) return [];

  const xml = await fetchText(config.rssUrl);
  const parsed = parser.parse(xml);
  const channel = parsed.rss?.channel;
  return arrayify<FeedItem>(channel?.item ?? parsed.feed?.entry)
    .map((item) => rowFromFeedItem(item, source, config))
    .filter((row): row is ArticleRow => Boolean(row));
}

async function crawlAnthropic(source: Source, config: SourceConfig) {
  const html = await fetchText(config.pageUrl);
  const $ = load(html);
  const rows = new Map<string, ArticleRow>();

  $("a").each((_, element) => {
    const link = $(element);
    const href = link.attr("href");
    if (!href || (!href.startsWith("/news/") && !href.startsWith("/glasswing") && !href.startsWith("/81k-interviews"))) {
      return;
    }

    const dateText = link.find("time").first().text().trim();
    const publishedAt = toIsoDate(dateText);
    if (!publishedAt || !isRecent(publishedAt)) return;

    const title = link.find("h2,h3,h4").first().text().trim();
    if (!title) return;

    const categoryText = link.find("span").first().text().trim();
    const excerpt = link.find("p").first().text().trim();
    const url = absoluteUrl(href, config.pageUrl);

    rows.set(url, {
      title,
      excerpt: excerpt || null,
      url,
      source_id: source.id,
      source_domain: source.domain,
      author: source.name,
      category: normalizeCategory(`${categoryText} ${title}`),
      hero_variant: config.hero,
      read_minutes: 4,
      published_at: publishedAt,
      crawled_at: new Date().toISOString(),
    });
  });

  return [...rows.values()];
}

async function crawlSource(source: Source) {
  const config = SOURCE_CONFIG[source.id];
  if (!config) return { found: 0, saved: 0 };

  const startedAt = new Date().toISOString();

  await supabase
    .from("sources")
    .update({ feed_url: config.pageUrl })
    .eq("id", source.id);

  await supabase
    .from("articles")
    .delete()
    .eq("source_id", source.id)
    .not("id", "is", null);

  let rows: ArticleRow[] = [];
  if (source.id === "anthropic") {
    rows = await crawlAnthropic(source, config);
  } else {
    rows = await crawlRss(source, config);
  }

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

async function main() {
  const { data: sources, error } = await supabase
    .from("sources")
    .select("id, name, domain, feed_url")
    .eq("is_active", true)
    .in("id", Object.keys(SOURCE_CONFIG));

  if (error) throw error;

  for (const source of (sources ?? []) as Source[]) {
    try {
      const result = await crawlSource(source);
      console.log(`${source.name}: found ${result.found}, saved ${result.saved} since ${cutoff.toISOString().slice(0, 10)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await supabase.from("crawl_runs").insert({
        source_id: source.id,
        status: "error",
        finished_at: new Date().toISOString(),
        error_message: message,
      });
      console.error(`${source.name}: ${message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
