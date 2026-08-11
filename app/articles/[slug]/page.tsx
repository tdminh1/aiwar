import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { SafeImage } from "@/components/SafeImage";
import {
  articleJsonLd,
  articleKeyPoints,
  articlePath,
  articleSeoSummary,
  articleUrl,
  getArticlePageData,
  topicPath,
} from "@/lib/articles";
import { breadcrumbJsonLd, compactText, organizationJsonLd, SITE_NAME } from "@/lib/seo";

type ArticlePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getArticlePageData(slug);
  if (!data) return {};

  const { article } = data;
  const description = compactText(article.excerpt || articleSeoSummary(article), 160);
  const url = articleUrl(article);
  const image = article.thumbnail_url || `/articles/${slug}/opengraph-image`;

  return {
    title: article.title,
    description,
    alternates: {
      canonical: articlePath(article),
    },
    openGraph: {
      type: "article",
      url,
      siteName: SITE_NAME,
      title: article.title,
      description,
      publishedTime: article.published_at || undefined,
      modifiedTime: article.crawled_at || article.published_at || undefined,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: [image],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const data = await getArticlePageData(slug);
  if (!data) notFound();

  const { article, relatedArticles, topics } = data;
  const jsonLd = [
    organizationJsonLd(),
    breadcrumbJsonLd([
      { name: SITE_NAME, path: "/" },
      { name: "Feed", path: "/feed" },
      { name: article.title, path: articlePath(article) },
    ]),
    articleJsonLd(article),
  ];

  return (
    <main className="detail-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav className="detail-nav" aria-label="Breadcrumb">
        <Link href="/feed">AI War feed</Link>
        <span>/</span>
        <span>Article</span>
      </nav>

      <article className="story-page">
        <header className="story-header">
          <div className="article-meta detail-meta">
            <span>{article.source_domain || article.author || "AI source"}</span>
            <span className="dot-sep">·</span>
            <time dateTime={article.published_at || article.created_at}>{formatDate(article.published_at || article.created_at)}</time>
            {article.category ? (
              <>
                <span className="dot-sep">·</span>
                <span className="cat-chip">{article.category}</span>
              </>
            ) : null}
          </div>
          <h1>{article.title}</h1>
          <p className="story-dek">{compactText(article.excerpt || articleSeoSummary(article), 260)}</p>
          <div className="story-actions">
            <a className="btn primary-btn" href={article.url} target="_blank" rel="noopener noreferrer">
              Read original
              <ExternalLink size={14} />
            </a>
            {topics[0] ? (
              <Link className="btn" href={topicPath(topics[0])}>
                View topic
              </Link>
            ) : null}
          </div>
        </header>

        {article.thumbnail_url ? (
          <figure className="story-media">
            <SafeImage src={article.thumbnail_url} />
          </figure>
        ) : null}

        <section className="story-section">
          <h2>AI War Summary</h2>
          <p>{articleSeoSummary(article)}</p>
        </section>

        <section className="story-section">
          <h2>Key Points</h2>
          <ul className="story-list">
            {articleKeyPoints(article).map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        {topics.length ? (
          <section className="story-section">
            <h2>Related Topics</h2>
            <div className="topic-chip-row">
              {topics.map((topic) => (
                <Link key={topic.id} className="topic-chip" href={topicPath(topic)}>
                  {topic.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {relatedArticles.length ? (
          <section className="story-section">
            <h2>Related Updates</h2>
            <div className="related-list">
              {relatedArticles.map((item) => (
                <Link key={item.id} className="related-item" href={articlePath(item)}>
                  <span>{item.source_domain || item.author || "AI source"}</span>
                  <strong>{item.title}</strong>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}
