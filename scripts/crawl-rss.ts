import { XMLParser } from "fast-xml-parser";
import { createClient } from "@supabase/supabase-js";

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
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategory(item: FeedItem) {
  const raw = arrayify(item.category).join(" ").toLowerCase();
  const title = (item.title || "").toLowerCase();
  const text = `${raw} ${title}`;

  if (/model|gpt|claude|gemini|release|launch|o\d/.test(text)) return "models";
  if (/research|paper|benchmark|eval/.test(text)) return "research";
  if (/api|developer|product|platform|app|tool/.test(text)) return "product";
  if (/safety|preparedness|alignment|risk|policy/.test(text)) return "safety";
  if (/science|alphafold|biology|health|protein/.test(text)) return "science";
  if (/government|society|economic|public/.test(text)) return "policy";
  if (/partnership|company|enterprise/.test(text)) return "company";
  return "announcements";
}

function linkFrom(item: FeedItem) {
  if (typeof item.link === "string") return item.link;
  return item.link?.href || (typeof item.guid === "string" ? item.guid : item.guid?.["#text"]);
}

async function crawlSource(source: Source) {
  if (!source.feed_url) return { found: 0, saved: 0 };

  const startedAt = new Date().toISOString();
  const response = await fetch(source.feed_url, {
    headers: { "user-agent": "AIWarBot/0.1 (+https://github.com/tdminh1/aiwar)" },
  });

  if (!response.ok) {
    throw new Error(`${source.name} feed returned ${response.status}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);
  const channel = parsed.rss?.channel;
  const entries = arrayify<FeedItem>(channel?.item ?? parsed.feed?.entry).slice(0, 25);
  const rows = entries
    .map((item) => {
      const url = linkFrom(item);
      if (!item.title || !url) return null;

      return {
        title: stripHtml(item.title),
        excerpt: stripHtml(item.description || "").slice(0, 420) || null,
        url,
        source_id: source.id,
        source_domain: source.domain,
        author: item.author || source.name,
        category: normalizeCategory(item),
        hero_variant: source.id === "openai" ? "spiral" : source.id === "deepmind" ? "grid" : "aurora",
        read_minutes: 4,
        published_at: new Date(item.pubDate || item.published || item.updated || Date.now()).toISOString(),
        crawled_at: new Date().toISOString(),
      };
    })
    .filter((row): row is ArticleRow => Boolean(row));

  const { error } = await supabase.from("articles").upsert(rows, { onConflict: "url" });
  if (error) throw error;

  await supabase.from("sources").update({ last_crawled_at: new Date().toISOString() }).eq("id", source.id);
  await supabase.from("crawl_runs").insert({
    source_id: source.id,
    status: "success",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    articles_found: entries.length,
    articles_saved: rows.length,
  });

  return { found: entries.length, saved: rows.length };
}

async function main() {
  const { data: sources, error } = await supabase
    .from("sources")
    .select("id, name, domain, feed_url")
    .eq("is_active", true)
    .not("feed_url", "is", null);

  if (error) throw error;

  for (const source of (sources ?? []) as Source[]) {
    try {
      const result = await crawlSource(source);
      console.log(`${source.name}: found ${result.found}, saved ${result.saved}`);
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
