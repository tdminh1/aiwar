import "server-only";

import { CATEGORIES } from "@/lib/categories";
import { createSupabaseServerClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import type { Article, FeedData, ReaderQuote, Source, Topic } from "@/lib/types";

const EMPTY_FEED: FeedData = {
  sources: [],
  categories: CATEGORIES,
  articles: [],
  articlesTotal: 0,
  topics: [],
  mostRead: [],
  readerQuotes: [],
  lastCrawledAt: null,
  renderedAt: new Date().toISOString(),
  isConfigured: false,
};

function isMissingProfileColumn(error: { message?: string }) {
  return /profile_(url|platform|handle)/i.test(error.message || "");
}

function withProfileFallback(data: unknown[] | null | undefined) {
  return (data ?? []).map((quote) => ({
    ...(quote as Record<string, unknown>),
    profile_url: null,
    profile_platform: null,
    profile_handle: null,
  })) as ReaderQuote[];
}

export async function getFeedData(): Promise<FeedData> {
  const renderedAt = new Date().toISOString();

  if (!hasSupabaseServerEnv()) {
    return { ...EMPTY_FEED, renderedAt };
  }

  const supabase = createSupabaseServerClient();

  const [sourcesResult, articlesResult, topicsResult, mostReadResult, readerQuotesResult] = await Promise.all([
    supabase
      .from("sources")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("articles")
      .select("*", { count: "exact" })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(80),
    supabase
      .from("topics")
      .select("*")
      .order("trend_score", { ascending: false })
      .limit(12),
    supabase
      .from("most_read_articles")
      .select("*")
      .limit(5),
    supabase
      .from("reader_quotes")
      .select("id, name, text, profile_url, profile_platform, profile_handle, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (sourcesResult.error) throw sourcesResult.error;
  if (articlesResult.error) throw articlesResult.error;
  if (topicsResult.error) throw topicsResult.error;
  if (mostReadResult.error) throw mostReadResult.error;
  let readerQuotes = readerQuotesResult.data ?? [];
  if (readerQuotesResult.error) {
    if (!isMissingProfileColumn(readerQuotesResult.error)) throw readerQuotesResult.error;

    const legacyReaderQuotesResult = await supabase
      .from("reader_quotes")
      .select("id, name, text, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (legacyReaderQuotesResult.error) throw legacyReaderQuotesResult.error;
    readerQuotes = withProfileFallback(legacyReaderQuotesResult.data);
  }

  const sources = (sourcesResult.data ?? []) as Source[];
  const articles = (articlesResult.data ?? []) as Article[];
  const mostRead = (mostReadResult.data ?? []) as Article[];
  const topics = (topicsResult.data ?? []) as Topic[];
  const lastCrawledAt =
    sources
      .map((source) => source.last_crawled_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return {
    sources,
    categories: CATEGORIES,
    articles,
    articlesTotal: articlesResult.count ?? articles.length,
    topics,
    mostRead,
    readerQuotes,
    lastCrawledAt,
    renderedAt,
    isConfigured: true,
  };
}
