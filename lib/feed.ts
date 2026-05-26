import "server-only";

import { CATEGORIES } from "@/lib/categories";
import { createSupabaseServerClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import type { Article, FeedData, Source, Topic } from "@/lib/types";

const EMPTY_FEED: FeedData = {
  sources: [],
  categories: CATEGORIES,
  articles: [],
  topics: [],
  mostRead: [],
  lastCrawledAt: null,
  isConfigured: false,
};

export async function getFeedData(): Promise<FeedData> {
  if (!hasSupabaseServerEnv()) {
    return EMPTY_FEED;
  }

  const supabase = createSupabaseServerClient();

  const [sourcesResult, articlesResult, topicsResult, mostReadResult] = await Promise.all([
    supabase
      .from("sources")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("articles")
      .select("*")
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
  ]);

  if (sourcesResult.error) throw sourcesResult.error;
  if (articlesResult.error) throw articlesResult.error;
  if (topicsResult.error) throw topicsResult.error;
  if (mostReadResult.error) throw mostReadResult.error;

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
    topics,
    mostRead,
    lastCrawledAt,
    isConfigured: true,
  };
}
