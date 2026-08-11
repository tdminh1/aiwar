import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  articlePath,
  getTopicPageData,
  topicJsonLd,
  topicKeyPoints,
  topicPath,
  topicSummary,
  topicUrl,
} from "@/lib/articles";
import { breadcrumbJsonLd, compactText, organizationJsonLd, SITE_NAME } from "@/lib/seo";

type TopicPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTopicPageData(slug);
  if (!data) return {};

  const description = compactText(data.topic.summary || topicSummary(data), 160);
  const title = `${data.topic.name}: Latest Updates, Timeline, and Sources`;

  return {
    title,
    description,
    alternates: {
      canonical: topicPath(data.topic),
    },
    openGraph: {
      type: "website",
      url: topicUrl(data.topic),
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: `/topics/${slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: data.topic.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/topics/${slug}/opengraph-image`],
    },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const data = await getTopicPageData(slug);
  if (!data) notFound();

  const jsonLd = [
    organizationJsonLd(),
    breadcrumbJsonLd([
      { name: SITE_NAME, path: "/" },
      { name: "Topics", path: "/feed" },
      { name: data.topic.name, path: topicPath(data.topic) },
    ]),
    ...topicJsonLd(data),
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
        <span>Topic</span>
      </nav>

      <article className="story-page topic-page">
        <header className="story-header">
          <div className="article-meta detail-meta">
            <span>{data.articles.length} tracked updates</span>
            {data.latestUpdate ? (
              <>
                <span className="dot-sep">·</span>
                <span>latest {formatDate(data.latestUpdate)}</span>
              </>
            ) : null}
          </div>
          <h1>{data.topic.name}</h1>
          <p className="story-dek">{data.topic.summary || topicSummary(data)}</p>
        </header>

        <section className="story-section">
          <h2>Key Points</h2>
          <ul className="story-list">
            {topicKeyPoints(data).map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>

        <section className="story-section">
          <h2>Timeline</h2>
          <div className="timeline-list">
            {data.articles.slice(0, 12).map((article) => (
              <Link key={article.id} className="timeline-item" href={articlePath(article)}>
                <time dateTime={article.published_at || article.created_at}>{formatDate(article.published_at || article.created_at)}</time>
                <strong>{article.title}</strong>
                <span>{article.source_domain || article.author || "AI source"}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="story-section">
          <h2>Related Articles</h2>
          <div className="related-list">
            {data.articles.map((article) => (
              <Link key={article.id} className="related-item" href={articlePath(article)}>
                <span>{article.source_domain || article.author || "AI source"}</span>
                <strong>{article.title}</strong>
              </Link>
            ))}
          </div>
        </section>

        {data.relatedTopics.length ? (
          <section className="story-section">
            <h2>Related Topics</h2>
            <div className="topic-chip-row">
              {data.relatedTopics.map((topic) => (
                <Link key={topic.id} className="topic-chip" href={topicPath(topic)}>
                  {topic.name}
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
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
