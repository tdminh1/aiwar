"use client";

import { ArrowLeft, ChevronRight, ExternalLink, Newspaper, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loginPathForCurrentPage } from "@/lib/auth-utils";
import { formatDigestWeekRange } from "@/lib/digest-format";
import { articlePath, digestPath } from "@/lib/routing";
import type { WeeklyDigest, WeeklyDigestDetail } from "@/lib/types";

type PanelView = "list" | "detail";

function redirectExpiredSession(response: Response) {
  if (response.status !== 401) return false;
  window.location.assign(loginPathForCurrentPage());
  return true;
}

// Button + slide-in side panel: click to see the list of weekly journal
// entries, click an entry to read its full recap without leaving the feed.
// /digest and /digest/[slug] still exist as shareable full pages — this is a
// faster, in-context way to reach the same data via /api/digests[/[slug]].
export function DigestPanel() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>("list");

  const [digests, setDigests] = useState<WeeklyDigest[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");

  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, WeeklyDigestDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");

  async function loadList() {
    setLoadingList(true);
    setListError("");

    try {
      const response = await fetch("/api/digests");
      if (redirectExpiredSession(response)) return;
      if (!response.ok) throw new Error("Could not load the weekly journal.");

      const payload = (await response.json()) as { digests: WeeklyDigest[] };
      setDigests(payload.digests);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Could not load the weekly journal.");
    } finally {
      setLoadingList(false);
    }
  }

  function openPanel() {
    setOpen(true);
    setView("list");
    if (!digests && !loadingList) void loadList();
  }

  async function openDigest(slug: string) {
    setSelectedSlug(slug);
    setView("detail");
    if (detailCache[slug]) return;

    setLoadingDetail(true);
    setDetailError("");

    try {
      const response = await fetch(`/api/digests/${slug}`);
      if (redirectExpiredSession(response)) return;
      if (!response.ok) throw new Error("Could not load this weekly entry.");

      const payload = (await response.json()) as WeeklyDigestDetail;
      setDetailCache((cache) => ({ ...cache, [slug]: payload }));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Could not load this weekly entry.");
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button type="button" className="digest-panel-trigger" onClick={openPanel}>
        <Newspaper size={14} />
        Weekly Journal
      </button>

      {open ? (
        <div
          className="digest-panel-overlay"
          onClick={(event) => {
            if ((event.target as HTMLElement).classList.contains("digest-panel-overlay")) setOpen(false);
          }}
        >
          <div className="digest-panel" role="dialog" aria-label="Weekly journal">
            <div className="digest-panel-header">
              {view === "detail" ? (
                <button
                  type="button"
                  className="digest-panel-icon-btn"
                  onClick={() => setView("list")}
                  aria-label="Back to list"
                >
                  <ArrowLeft size={16} />
                </button>
              ) : (
                <span className="digest-panel-title">Weekly Journal</span>
              )}
              <button type="button" className="digest-panel-icon-btn" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="digest-panel-body">
              {view === "list" ? (
                <DigestList digests={digests} loading={loadingList} error={listError} onRetry={loadList} onSelect={openDigest} />
              ) : (
                <DigestDetail
                  detail={selectedSlug ? detailCache[selectedSlug] : undefined}
                  loading={loadingDetail}
                  error={detailError}
                  onRetry={() => selectedSlug && openDigest(selectedSlug)}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DigestList({
  digests,
  loading,
  error,
  onRetry,
  onSelect,
}: {
  digests: WeeklyDigest[] | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onSelect: (slug: string) => void;
}) {
  if (loading && !digests) {
    return <p className="digest-panel-status">Loading…</p>;
  }

  if (error) {
    return (
      <div className="digest-panel-status">
        <p>{error}</p>
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (!digests || digests.length === 0) {
    return <p className="digest-panel-status">No weekly entries yet. Check back after the next scheduled digest.</p>;
  }

  return (
    <div className="digest-panel-list">
      {digests.map((digest) => (
        <button
          key={digest.id}
          type="button"
          className="digest-panel-list-item"
          onClick={() => onSelect(digest.slug || digest.week_start)}
        >
          <span className="digest-panel-list-item-body">
            <strong>{formatDigestWeekRange(digest.week_start, digest.week_end)}</strong>
            <span>{digest.status === "failed" ? "Generation failed" : `${digest.articles_considered} articles tracked`}</span>
          </span>
          <ChevronRight size={16} />
        </button>
      ))}
    </div>
  );
}

function DigestDetail({
  detail,
  loading,
  error,
  onRetry,
}: {
  detail: WeeklyDigestDetail | null | undefined;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (loading && !detail) {
    return <p className="digest-panel-status">Loading…</p>;
  }

  if (error) {
    return (
      <div className="digest-panel-status">
        <p>{error}</p>
        <button type="button" className="btn" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (!detail) return null;

  const { digest, sourceStats, categories } = detail;

  return (
    <div className="digest-panel-detail">
      <h3>{formatDigestWeekRange(digest.week_start, digest.week_end)}</h3>

      {digest.status === "failed" ? (
        <p className="digest-error-dek">
          This week&apos;s digest failed to generate{digest.error_message ? `: ${digest.error_message}` : "."}
        </p>
      ) : (
        <p className="digest-panel-summary">{digest.overall_summary}</p>
      )}

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
        <div key={category.category} className="digest-panel-category">
          <h4>{category.label}</h4>
          <p>{category.summary}</p>
          <div className="digest-panel-articles">
            {category.articles.map((article) => (
              <Link key={article.id} className="digest-panel-article" href={articlePath(article)}>
                <span>{article.source_domain || article.author || "AI source"}</span>
                <strong>{article.title}</strong>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <Link className="digest-panel-full-link" href={digestPath(digest)}>
        Open full page
        <ExternalLink size={12} />
      </Link>
    </div>
  );
}
