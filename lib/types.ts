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
  trend_score: number;
  created_at: string;
};

export type CategoryOption = {
  id: "all" | ArticleCategory;
  name: string;
};

export type FeedData = {
  sources: Source[];
  categories: CategoryOption[];
  articles: Article[];
  topics: Topic[];
  mostRead: Article[];
  lastCrawledAt: string | null;
  isConfigured: boolean;
};
