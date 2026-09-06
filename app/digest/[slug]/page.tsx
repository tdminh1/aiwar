import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWeeklyDigestPageData } from "@/lib/digest";
import { formatDigestWeekRange } from "@/lib/digest-format";
import { articlePath, digestPath, digestUrl } from "@/lib/routing";
import { breadcrumbJsonLd, compactText, organizationJsonLd, SITE_NAME } from "@/lib/seo";

type DigestPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: DigestPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getWeeklyDigestPageData(slug);
  if (!data) return {};

  const { digest } = data;
  const title = `Weekly AI Digest — ${formatDigestWeekRange(digest.week_start, digest.week_end)}`;
  const description = compactText(
    digest.overall_summary || "AI-generated weekly recap of OpenAI, Anthropic, and Google DeepMind updates.",
    160,
  );

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: digestPath(digest) },
    openGraph: {
      type: "website",
      url: digestUrl(digest),
      siteName: SITE_NAME,
      title,
      description,
    },
  };
}

export default async function DigestPage({ params }: DigestPageProps) {
  const { slug } = await params;
  const data = await getWeeklyDigestPageData(slug);
  if (!data) notFound();

  const { digest, sourceStats, categories } = data;
  const jsonLd = [
    organizationJsonLd(),
    breadcrumbJsonLd([
      { name: SITE_NAME, path: "/" },
      { name: "Weekly Digest", path: "/digest" },
      { name: formatDigestWeekRange(digest.week_start, digest.week_end), path: digestPath(digest) },
    ]),
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
        <Link href="/digest">Weekly Digest</Link>
      </nav>

      <article className="story-page">
        <header className="story-header">
          <div className="article-meta detail-meta">
            <span>{digest.articles_considered} articles tracked</span>
            <span className="dot-sep">·</span>
            <span>generated {formatDate(digest.generated_at)}</span>
          </div>
          <h1>{formatDigestWeekRange(digest.week_start, digest.week_end)}</h1>
          {digest.status === "failed" ? (
            <p className="story-dek digest-error-dek">
              This week&apos;s digest failed to generate{digest.error_message ? `: ${digest.error_message}` : "."} A
              new attempt will run on the next scheduled generation.
            </p>
          ) : (
            <p className="story-dek">{digest.overall_summary}</p>
          )}
          <p className="digest-disclaimer">
            AI-generated from articles AI War actually tracked this week. Verify any claim against the linked source
            article.
          </p>
        </header>

        {sourceStats.length ? (
          <div className="digest-stats">
            {sourceStats.map(({ source, count }) => (
              <span key={source.id} className="src-chip digest-stat-chip">
                <span className={`source-dot ${source.id}`} />
                {source.name}
                <span className="digest-stat-count">{count}</span>
              </span>
            ))}
          </div>
        ) : null}

        {categories.map((category) => (
          <section key={category.category} className="story-section">
            <h2>{category.label}</h2>
            <p>{category.summary}</p>
            <div className="related-list">
              {category.articles.map((article) => (
                <Link key={article.id} className="related-item" href={articlePath(article)}>
                  <span>{article.source_domain || article.author || "AI source"}</span>
                  <strong>{article.title}</strong>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </article>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}
