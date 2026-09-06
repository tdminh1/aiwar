import "server-only";

import { CATEGORIES } from "@/lib/categories";
import { getLatestWeeklyDigest } from "@/lib/digest";
import { createSupabaseServerClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import type { Article, FeedData, Source, Topic, XQuote } from "@/lib/types";

const EMPTY_FEED: FeedData = {
  sources: [],
  categories: CATEGORIES,
  articles: [],
  articlesTotal: 0,
  topics: [],
  mostRead: [],
  xQuotes: [],
  lastCrawledAt: null,
  renderedAt: new Date().toISOString(),
  isConfigured: false,
  latestDigest: null,
};

export async function getFeedData(): Promise<FeedData> {
  const renderedAt = new Date().toISOString();

  if (!hasSupabaseServerEnv()) {
    return { ...EMPTY_FEED, renderedAt };
  }

  const supabase = createSupabaseServerClient();

  const [sourcesResult, articlesResult, topicsResult, mostReadResult, xQuotesResult, latestDigest] = await Promise.all([
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
      .from("x_quotes")
      .select("*")
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(20),
    getLatestWeeklyDigest(),
  ]);

  if (sourcesResult.error) throw sourcesResult.error;
  if (articlesResult.error) throw articlesResult.error;
  if (topicsResult.error) throw topicsResult.error;
  if (mostReadResult.error) throw mostReadResult.error;
  if (xQuotesResult.error) throw xQuotesResult.error;

  const sources = (sourcesResult.data ?? []) as Source[];
  const articles = (articlesResult.data ?? []) as Article[];
  const mostRead = (mostReadResult.data ?? []) as Article[];
  const topics = (topicsResult.data ?? []) as Topic[];
  const xQuotes = (xQuotesResult.data ?? []) as XQuote[];
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
    xQuotes,
    lastCrawledAt,
    renderedAt,
    isConfigured: true,
    latestDigest,
  };
}
