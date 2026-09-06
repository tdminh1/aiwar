import type { Metadata } from "next";
import Link from "next/link";
import { formatDigestWeekRange, getWeeklyDigestList } from "@/lib/digest";
import { digestPath } from "@/lib/routing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Weekly AI Digest",
  description: "AI-generated weekly recaps of what OpenAI, Anthropic, and Google DeepMind published, grouped by category.",
  robots: { index: false, follow: false },
};

export default async function DigestListPage() {
  const digests = await getWeeklyDigestList();

  return (
    <main className="detail-shell">
      <nav className="detail-nav" aria-label="Breadcrumb">
        <Link href="/feed">AI War feed</Link>
        <span>/</span>
        <span>Weekly Digest</span>
      </nav>

      <div className="story-page">
        <header className="story-header">
          <div className="article-meta detail-meta">
            <span>AI-generated, grounded in tracked articles</span>
          </div>
          <h1>Weekly AI Digest</h1>
          <p className="story-dek">
            One recap per week of everything AI War tracked from OpenAI, Anthropic, and Google DeepMind, grouped by
            category. Every summary links back to the source articles it was written from.
          </p>
        </header>

        {digests.length === 0 ? (
          <section className="story-section">
            <h2>No digest yet</h2>
            <p>The first weekly digest has not been generated yet. Check back after the next scheduled run.</p>
          </section>
        ) : (
          <section className="digest-list">
            {digests.map((digest) => (
              <Link key={digest.id} className="digest-list-item" href={digestPath(digest)}>
                <div className="digest-list-item-head">
                  <strong>{formatDigestWeekRange(digest.week_start, digest.week_end)}</strong>
                  {digest.status !== "success" ? <span className="digest-status-flag">{digest.status}</span> : null}
                </div>
                <p>{digest.overall_summary || "This digest is still being generated."}</p>
                <span className="digest-list-item-meta">{digest.articles_considered} articles tracked</span>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
