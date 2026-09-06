export type ArticleCategory =
  | "announcements"
  | "models"
  | "research"
  | "product"
  | "safety"
  | "science"
  | "policy"
  | "company";

export type Source = {
  id: string;
  name: string;
  domain: string;
  color: string;
  logo_path: string | null;
  feed_url?: string | null;
  is_active: boolean;
  last_crawled_at: string | null;
  created_at: string;
};

export type Article = {
  id: string;
  title: string;
  excerpt: string | null;
  url: string;
  source_id: string;
  source_domain: string | null;
  author: string | null;
  category: ArticleCategory | null;
  thumbnail_url: string | null;
  hero_variant: string | null;
  read_minutes: number | null;
  published_at: string | null;
  crawled_at: string;
  created_at: string;
  view_count?: number;
};

export type Topic = {
  id: string;
  name: string;
  slug?: string | null;
  summary?: string | null;
  key_points?: string[] | null;
  trend_score: number;
  updated_at?: string | null;
  last_activity_at?: string | null;
  created_at: string;
};

export type ReaderQuote = {
  id: string;
  name: string;
  text: string;
  profile_url: string | null;
  profile_platform: "facebook" | "x" | "instagram" | null;
  profile_handle: string | null;
  created_at: string;
};

export type CategoryOption = {
  id: "all" | ArticleCategory;
  name: string;
};

export type WeeklyDigestStatus = "success" | "partial" | "failed";

export type WeeklyDigestCategorySummary = {
  summary: string;
  article_ids: string[];
};

export type WeeklyDigestSourceStats = {
  count: number;
};

export type WeeklyDigest = {
  id: string;
  week_start: string;
  week_end: string;
  slug: string | null;
  overall_summary: string | null;
  category_summaries: Partial<Record<ArticleCategory, WeeklyDigestCategorySummary>> | null;
  source_stats: Record<string, WeeklyDigestSourceStats> | null;
  articles_considered: number;
  status: WeeklyDigestStatus;
  error_message: string | null;
  model: string | null;
  generated_at: string;
  created_at: string;
};

export type FeedData = {
  sources: Source[];
  categories: CategoryOption[];
  articles: Article[];
  articlesTotal: number;
  topics: Topic[];
  mostRead: Article[];
  readerQuotes: ReaderQuote[];
  lastCrawledAt: string | null;
  renderedAt: string;
  isConfigured: boolean;
};
