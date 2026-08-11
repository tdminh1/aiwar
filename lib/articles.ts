import "server-only";

import { createSupabaseServerClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import type { Article, Topic } from "@/lib/types";
import { absoluteUrl, compactText, SITE_NAME, slugify } from "@/lib/seo";
import { articleIdFromSlug, articlePath, articleUrl, topicPath, topicUrl } from "@/lib/routing";

export { articleIdFromSlug, articlePath, articleUrl, topicPath, topicUrl };

export type ArticlePageData = {
  article: Article;
  relatedArticles: Article[];
  topics: Topic[];
};

export type TopicPageData = {
  topic: Topic;
  articles: Article[];
  relatedTopics: Topic[];
  latestUpdate: string | null;
};

export function topicNameFromSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(" ");
}

function termsFromSlug(slug: string) {
  const stop = new Set(["ai", "the", "and", "for", "with", "from", "release", "update", "news", "latest"]);
  return slug
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 1 && !stop.has(term));
}

export function articleSeoSummary(article: Article) {
  const source = article.source_domain || "the original source";
  const date = article.published_at
    ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(article.published_at))
    : "recently";
  const excerpt = compactText(article.excerpt, 260);

  return [
    `${SITE_NAME} is tracking this ${article.category || "AI"} update from ${source}, published ${date}.`,
    excerpt || `This page collects the article details, source attribution, and related frontier AI updates so readers can compare the move against adjacent lab activity.`,
    `Use the original-source link for the full announcement and the related updates below for broader context across frontier AI labs.`,
  ].join(" ");
}

export function articleKeyPoints(article: Article) {
  const points = [
    article.excerpt ? compactText(article.excerpt, 135) : `${article.title} was added to the AI War frontier lab feed.`,
    `Source tracked by AI War: ${article.source_domain || article.author || "frontier AI source"}.`,
    `Category: ${article.category || "AI lab update"}.`,
  ];

  return points;
}

export function articleJsonLd(article: Article) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: compactText(article.excerpt || articleSeoSummary(article), 220),
    image: article.thumbnail_url ? [article.thumbnail_url] : [absoluteUrl("/opengraph-image")],
    datePublished: article.published_at || article.created_at,
    dateModified: article.crawled_at || article.published_at || article.created_at,
    mainEntityOfPage: articleUrl(article),
    author: {
      "@type": "Organization",
      name: article.author || article.source_domain || SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/icon.png"),
      },
    },
    isBasedOn: article.url,
    sameAs: article.url,
  };
}

export function topicJsonLd(data: TopicPageData) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: data.topic.name,
      description: compactText(data.topic.summary || topicSummary(data), 220),
      url: topicUrl(data.topic),
      dateModified: data.latestUpdate || data.topic.updated_at || data.topic.created_at,
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/icon.png"),
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${data.topic.name} articles`,
      itemListElement: data.articles.slice(0, 20).map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: articleUrl(article),
        item: {
          "@type": "Article",
          headline: article.title,
          url: articleUrl(article),
          datePublished: article.published_at || article.created_at,
        },
      })),
    },
  ];
}

export function topicSummary(data: TopicPageData) {
  const sourceCount = new Set(data.articles.map((article) => article.source_domain || article.source_id)).size;
  const latest = data.latestUpdate
    ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(data.latestUpdate))
    : "recent updates";

  return `${SITE_NAME} tracks ${data.topic.name} across ${data.articles.length} related updates from ${sourceCount} source${sourceCount === 1 ? "" : "s"}. The page summarizes the story, orders the latest signals by time, and links to source articles for verification. Latest tracked update: ${latest}.`;
}

export function topicKeyPoints(data: TopicPageData) {
  if (data.topic.key_points?.length) return data.topic.key_points;

  return data.articles.slice(0, 4).map((article) => compactText(article.title, 120));
}

export async function getArticlePageData(slug: string): Promise<ArticlePageData | null> {
  const id = articleIdFromSlug(slug);
  if (!id || !hasSupabaseServerEnv()) return null;

  const supabase = createSupabaseServerClient();
  const { data: article, error } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
  if (error || !article) return null;

  const typedArticle = article as Article;
  let relatedQuery = supabase.from("articles").select("*").neq("id", typedArticle.id);
  relatedQuery = typedArticle.category
    ? relatedQuery.or(`category.eq.${typedArticle.category},source_id.eq.${typedArticle.source_id}`)
    : relatedQuery.eq("source_id", typedArticle.source_id);

  const [relatedResult, topicsResult] = await Promise.all([
    relatedQuery.order("published_at", { ascending: false, nullsFirst: false }).limit(6),
    supabase.from("topics").select("*").order("trend_score", { ascending: false }).limit(12),
  ]);

  return {
    article: typedArticle,
    relatedArticles: ((relatedResult.data ?? []) as Article[]).filter((item) => item.id !== typedArticle.id),
    topics: ((topicsResult.data ?? []) as Topic[]).filter((topic) => topicMatchesArticle(topic, typedArticle)).slice(0, 3),
  };
}

export async function getTopicPageData(slug: string): Promise<TopicPageData | null> {
  if (!hasSupabaseServerEnv()) return null;

  const supabase = createSupabaseServerClient();
  const [topicsResult, articlesResult] = await Promise.all([
    supabase.from("topics").select("*").order("trend_score", { ascending: false }).limit(50),
    supabase
      .from("articles")
      .select("*")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(240),
  ]);

  if (articlesResult.error) return null;

  const topics = (topicsResult.data ?? []) as Topic[];
  const topic =
    topics.find((item) => (item.slug || slugify(item.name)) === slug) || {
      id: slug,
      name: topicNameFromSlug(slug),
      slug,
      summary: null,
      key_points: null,
      trend_score: 0,
      created_at: new Date().toISOString(),
      updated_at: null,
      last_activity_at: null,
    };
  const terms = termsFromSlug(topic.slug || slugify(topic.name));
  const articles = ((articlesResult.data ?? []) as Article[])
    .map((article) => ({ article, score: scoreArticleForTopic(article, terms, topic.name) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.article.published_at || 0).getTime() - new Date(a.article.published_at || 0).getTime())
    .map((item) => item.article)
    .slice(0, 60);

  if (!articles.length) return null;

  return {
    topic,
    articles,
    relatedTopics: topics.filter((item) => (item.slug || slugify(item.name)) !== slug).slice(0, 8),
    latestUpdate:
      articles
        .map((article) => article.published_at || article.crawled_at || article.created_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null,
  };
}

export async function getSitemapArticles(limit = 5000) {
  if (!hasSupabaseServerEnv()) return [];

  const { data, error } = await createSupabaseServerClient()
    .from("articles")
    .select("id, title, published_at, crawled_at, created_at")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as Article[];
}

export async function getSitemapTopics(limit = 200) {
  if (!hasSupabaseServerEnv()) return [];

  const { data, error } = await createSupabaseServerClient()
    .from("topics")
    .select("*")
    .order("trend_score", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as Topic[];
}

function scoreArticleForTopic(article: Article, terms: string[], topicName: string) {
  const haystack = [article.title, article.excerpt, article.author, article.source_domain, article.category]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const topicText = topicName.toLowerCase();
  let score = 0;

  for (const term of terms) {
    if (haystack.includes(term)) score += article.title.toLowerCase().includes(term) ? 3 : 1;
  }
  if (haystack.includes(topicText)) score += 8;
  if (article.source_id && terms.includes(article.source_id.toLowerCase())) score += 2;

  return score;
}

function topicMatchesArticle(topic: Topic, article: Article) {
  const terms = termsFromSlug(topic.slug || slugify(topic.name));
  return scoreArticleForTopic(article, terms, topic.name) > 0;
}
