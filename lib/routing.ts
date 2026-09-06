import type { Article, Topic, WeeklyDigest } from "@/lib/types";
import { absoluteUrl, slugify } from "@/lib/seo";

const UUID_AT_END = /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function articlePath(article: Pick<Article, "id" | "title">) {
  return `/articles/${slugify(article.title) || "article"}-${article.id}`;
}

export function articleUrl(article: Pick<Article, "id" | "title">) {
  return absoluteUrl(articlePath(article));
}

export function articleIdFromSlug(slug: string) {
  return slug.match(UUID_AT_END)?.[1] ?? null;
}

export function topicPath(topic: Pick<Topic, "name" | "slug">) {
  return `/topics/${topic.slug || slugify(topic.name)}`;
}

export function topicUrl(topic: Pick<Topic, "name" | "slug">) {
  return absoluteUrl(topicPath(topic));
}

// digest.slug is always set to the ISO week_start date (see slugFor() in
// lib/digest.ts), so the two are interchangeable; week_start is the fallback
// for any row saved before slug existed.
export function digestPath(digest: Pick<WeeklyDigest, "slug" | "week_start">) {
  return `/digest/${digest.slug || digest.week_start}`;
}

export function digestUrl(digest: Pick<WeeklyDigest, "slug" | "week_start">) {
  return absoluteUrl(digestPath(digest));
}
