"use client";

import {
  ArrowDownNarrowWide,
  Check,
  ChevronDown,
  ExternalLink,
  LayoutGrid,
  Plus,
  Rows3,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { DigestPanel } from "@/components/DigestPanel";
import { SafeImage } from "@/components/SafeImage";
import { loginPathForCurrentPage } from "@/lib/auth-utils";
import { articlePath } from "@/lib/routing";
import type { Article, CategoryOption, FeedData, Source, XQuote } from "@/lib/types";

type Filters = {
  category: string;
  sources: string[];
  search: string;
  datePreset: "24h" | "7d" | "30d" | "all";
  sort: "newest" | "popular";
};

type ActiveFilterPill = {
  k: string;
  label: string;
  v?: string;
};

type WeekGroup = {
  key: string;
  label: string;
  articles: Article[];
};

type StoredFeedState = {
  filters: Filters;
  view: "list" | "grid";
  collapsedWeeks: Record<string, boolean>;
};

const FEED_STATE_KEY = "aiwar.feed-state.v1";

function redirectExpiredSession(response: Response) {
  if (response.status !== 401) return false;
  window.location.assign(loginPathForCurrentPage());
  return true;
}

function timeAgo(iso: string | null, now = new Date()) {
  if (!iso) return "unknown";
  const t = new Date(iso).getTime();
  const diff = (now.getTime() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  const d = Math.floor(diff / 86400);
  if (d < 7) return d + "d ago";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function weekStart(date: Date) {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

function formatWeekDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function weekBucket(iso: string | null, now = new Date()) {
  if (!iso) return { key: "undated", label: "Undated" };

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { key: "undated", label: "Undated" };

  const start = weekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const currentWeekStart = weekStart(now);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  let label = `${formatWeekDate(start)} - ${formatWeekDate(end)}`;
  if (start.getFullYear() !== now.getFullYear() || end.getFullYear() !== now.getFullYear()) {
    label += `, ${end.getFullYear()}`;
  }
  if (start.getTime() === currentWeekStart.getTime()) label = "This week";
  if (start.getTime() === previousWeekStart.getTime()) label = "Last week";

  return {
    key: start.toISOString().slice(0, 10),
    label,
  };
}

function isWithinLastHours(iso: string | null, now: Date, hours: number) {
  if (!iso) return false;

  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return false;

  return value.getTime() >= now.getTime() - hours * 3600 * 1000 && value.getTime() <= now.getTime();
}

function sourceLogo(source: Source | undefined) {
  return source?.logo_path || "/assets/aiwar-logo-mark.png";
}

function SourceBadge({ sourceId, sources, size = 16 }: { sourceId: string; sources: Source[]; size?: number }) {
  const source = sources.find((item) => item.id === sourceId);
  if (!source) return null;

  return (
    <span className="src-mark" style={{ width: size, height: size }}>
      <img src={sourceLogo(source)} alt={source.name} />
    </span>
  );
}

function ArticleMeta({
  article,
  sources,
  categories,
  now,
}: {
  article: Article;
  sources: Source[];
  categories: CategoryOption[];
  now: Date;
}) {
  const source = sources.find((item) => item.id === article.source_id);
  const category = categories.find((item) => item.id === article.category);

  return (
    <div className="article-meta">
      <span className="src-chip">
        <SourceBadge sourceId={article.source_id} sources={sources} />
        {source?.name || "Unknown source"}
      </span>
      <span className="dot-sep">·</span>
      <span>{timeAgo(article.published_at, now)}</span>
      {category ? (
        <>
          <span className="dot-sep">·</span>
          <span className="cat-chip">{category.name}</span>
        </>
      ) : null}
      <span className="dot-sep">·</span>
      <span>{article.read_minutes || 4} min read</span>
    </div>
  );
}

function FeaturedArticleItem({
  article,
  sources,
  categories,
  now,
}: {
  article: Article;
  sources: Source[];
  categories: CategoryOption[];
  now: Date;
}) {
  return (
    <Link className={`featured-item ${article.thumbnail_url ? "" : "no-thumb"}`} href={articlePath(article)}>
      <div className="featured-item-body">
        <ArticleMeta article={article} sources={sources} categories={categories} now={now} />
        <h2 className="featured-title">{article.title}</h2>
        {article.excerpt ? <p className="featured-excerpt">{article.excerpt}</p> : null}
      </div>
      {article.thumbnail_url ? (
        <div className="featured-thumb">
          <SafeImage src={article.thumbnail_url} loading="lazy" />
        </div>
      ) : null}
    </Link>
  );
}

function FeaturedSection({
  articles,
  sources,
  categories,
  now,
}: {
  articles: Article[];
  sources: Source[];
  categories: CategoryOption[];
  now: Date;
}) {
  if (!articles.length) return null;

  return (
    <section className="featured-section" aria-label="Last 24 hours">
      <div className="featured-head">
        <span className="featured-label">
          <span className="dot" />
          Last 24h
        </span>
        <span className="featured-count">{articles.length}</span>
      </div>
      <div className="featured-list">
        {articles.map((article) => (
          <FeaturedArticleItem
            key={article.id}
            article={article}
            sources={sources}
            categories={categories}
            now={now}
          />
        ))}
      </div>
    </section>
  );
}

function ArticleCard({
  article,
  sources,
  categories,
  now,
}: {
  article: Article;
  sources: Source[];
  categories: CategoryOption[];
  now: Date;
}) {
  return (
    <Link className={`article-card ${article.thumbnail_url ? "" : "no-thumb"}`} href={articlePath(article)}>
      {article.thumbnail_url ? (
        <div className="article-card-img">
          <SafeImage src={article.thumbnail_url} loading="lazy" />
        </div>
      ) : null}
      <div className="article-card-body">
        <ArticleMeta article={article} sources={sources} categories={categories} now={now} />
        <h3 className="article-card-title">{article.title}</h3>
        <p className="article-card-excerpt">{article.excerpt}</p>
      </div>
    </Link>
  );
}

function ArticleRow({
  article,
  sources,
  categories,
  now,
}: {
  article: Article;
  sources: Source[];
  categories: CategoryOption[];
  now: Date;
}) {
  const source = sources.find((item) => item.id === article.source_id);

  return (
    <Link className={`article-row ${article.thumbnail_url ? "" : "no-thumb"}`} href={articlePath(article)}>
      <div className="article-body">
        <ArticleMeta article={article} sources={sources} categories={categories} now={now} />
        <h3 className="article-title">{article.title}</h3>
        <p className="article-excerpt">{article.excerpt}</p>
        <div className="article-foot">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ExternalLink size={11} />
            {source?.domain || article.source_domain || "source"}
          </span>
        </div>
      </div>
      {article.thumbnail_url ? (
        <div className="article-thumb">
          <SafeImage src={article.thumbnail_url} loading="lazy" />
        </div>
      ) : null}
    </Link>
  );
}

function LeftFilters({
  filters,
  setFilters,
  sources,
  categories,
  articles,
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  sources: Source[];
  categories: CategoryOption[];
  articles: Article[];
}) {
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: articles.length };
    categories.forEach((category) => {
      if (category.id !== "all") {
        out[category.id] = articles.filter((article) => article.category === category.id).length;
      }
    });
    return out;
  }, [articles, categories]);

  const toggleSource = (id: string) => {
    const has = filters.sources.includes(id);
    setFilters({
      ...filters,
      sources: has ? filters.sources.filter((item) => item !== id) : [...filters.sources, id],
    });
  };

  return (
    <>
      <div className="side-search">
        <span className="icon">
          <Search size={14} />
        </span>
        <input
          type="text"
          placeholder="Search the feed..."
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
        />
      </div>

      <div className="side-section">
        <div className="eyebrow">Categories</div>
        <div className="filter-list">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`filter-row ${filters.category === category.id ? "active" : ""}`}
              onClick={() => setFilters({ ...filters, category: category.id })}
            >
              <span>{category.name}</span>
              <span className="count">{counts[category.id] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="side-section">
        <div className="eyebrow">Sources</div>
        <div>
          {sources.map((source) => {
            const checked = filters.sources.includes(source.id);
            return (
              <label key={source.id} className={`source-toggle ${checked ? "checked" : ""}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleSource(source.id)} />
                <SourceBadge sourceId={source.id} sources={sources} />
                <span className="label">{source.name}</span>
                <span className="check">
                  <Check size={10} strokeWidth={3} />
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="side-section">
        <div className="eyebrow">Time range</div>
        <div className="date-presets">
          {[
            ["24h", "24h"],
            ["7d", "7d"],
            ["30d", "30d"],
            ["all", "All"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={`date-preset ${filters.datePreset === id ? "active" : ""}`}
              onClick={() => setFilters({ ...filters, datePreset: id as Filters["datePreset"] })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

const LOAD_MORE_LIMIT = 40;

function xQuoteAuthorLabel(quote: XQuote) {
  return quote.author_handle || "ai";
}

// Quotes are crawled from lib/x-quotes-config.ts's handle list (see
// /api/crawl-x-quotes) or added by an admin via the form below
// (/api/x-quotes/manual) — everyone else only views the list, isAdmin
// controls whether the add form renders at all.
function XQuoteWall({ initialQuotes, now, isAdmin }: { initialQuotes: XQuote[]; now: Date; isAdmin: boolean }) {
  const [quotes, setQuotes] = useState<XQuote[]>(initialQuotes);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tweetUrl = url.trim();
    if (!tweetUrl || isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch("/api/x-quotes/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tweetUrl }),
      });
      if (redirectExpiredSession(response)) return;
      const payload = (await response.json().catch(() => null)) as { quote?: XQuote; error?: string } | null;

      if (!response.ok || !payload?.quote) {
        throw new Error(payload?.error || "Could not add tweet.");
      }

      const savedQuote = payload.quote;
      setQuotes((items) => [savedQuote, ...items.filter((item) => item.id !== savedQuote.id)].slice(0, 20));
      setUrl("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add tweet.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="r-section quote-wall">
      <div className="r-head">
        <h3 className="r-title">AI Voices on X</h3>
        {isAdmin ? (
          <button className="r-add" onClick={() => setOpen((value) => !value)} aria-label="Add tweet">
            {open ? <X size={12} strokeWidth={2.5} /> : <Plus size={12} strokeWidth={2.5} />}
          </button>
        ) : null}
      </div>

      {isAdmin && open ? (
        <form className="quote-form" onSubmit={submit}>
          <input
            className="quote-name"
            type="url"
            placeholder="Paste a tweet URL (x.com/handle/status/...)"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            maxLength={200}
          />
          <div className="quote-form-foot">
            <span className="quote-count">{error || "Uses X's free oEmbed — no API credits spent"}</span>
            <button type="submit" disabled={!url.trim() || isSaving}>
              {isSaving ? "Adding" : "Add"}
            </button>
          </div>
        </form>
      ) : null}

      {quotes.length === 0 ? (
        <p className="quote-empty">No tweets yet. Check back after the next scheduled run.</p>
      ) : (
        <ul className="quote-list">
          {quotes.map((quote) => (
            <li key={quote.id} className="quote-card">
              <a className="quote-card-link" href={quote.tweet_url} target="_blank" rel="noopener noreferrer">
                <div className="quote-card-head">
                  <span className="quote-avatar x">
                    {quote.author_avatar_url ? (
                      <img src={quote.author_avatar_url} alt={quote.author_handle} />
                    ) : (
                      <span className="quote-avatar-fallback">𝕏</span>
                    )}
                  </span>
                  <span className="quote-card-who">
                    <strong>{quote.author_name || xQuoteAuthorLabel(quote)}</strong>
                    <span className="quote-card-handle">@{xQuoteAuthorLabel(quote)}</span>
                  </span>
                  {quote.posted_at ? <span className="quote-card-time">{timeAgo(quote.posted_at, now)}</span> : null}
                </div>
                <p className="quote-card-body">{quote.text}</p>
                <span className="quote-card-cta">
                  View on X
                  <ExternalLink size={11} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RightDiscovery({ xQuotes, now, isAdmin }: { xQuotes: XQuote[]; now: Date; isAdmin: boolean }) {
  return (
    <>
      <XQuoteWall initialQuotes={xQuotes} now={now} isAdmin={isAdmin} />
    </>
  );
}

export function FeedClient({ initialData, isAdmin }: { initialData: FeedData; isAdmin: boolean }) {
  const initialNow = useMemo(() => new Date(initialData.renderedAt), [initialData.renderedAt]);
  const [articles, setArticles] = useState<Article[]>(initialData.articles);
  const [articlesTotal, setArticlesTotal] = useState(initialData.articlesTotal);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [collapsedWeeks, setCollapsedWeeks] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<"list" | "grid">("list");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hasRestoredFeedState, setHasRestoredFeedState] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    category: "all",
    sources: initialData.sources.map((source) => source.id),
    search: "",
    datePreset: "all",
    sort: "newest",
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const raw = window.sessionStorage.getItem(FEED_STATE_KEY);
        if (!raw) return;

        const stored = JSON.parse(raw) as Partial<StoredFeedState>;
        const storedFilters = stored.filters;
        const availableSources = new Set(initialData.sources.map((source) => source.id));

        if (storedFilters) {
          const sources = Array.isArray(storedFilters.sources)
            ? storedFilters.sources.filter((source) => availableSources.has(source))
            : initialData.sources.map((source) => source.id);
          const datePreset = ["24h", "7d", "30d", "all"].includes(storedFilters.datePreset)
            ? storedFilters.datePreset
            : "all";
          const sort = ["newest", "popular"].includes(storedFilters.sort) ? storedFilters.sort : "newest";
          const category = initialData.categories.find((item) => item.id === storedFilters.category)?.id || "all";

          setFilters({
            category,
            sources,
            search: typeof storedFilters.search === "string" ? storedFilters.search.slice(0, 160) : "",
            datePreset,
            sort,
          });
        }
        if (stored.view === "list" || stored.view === "grid") setView(stored.view);
        if (stored.collapsedWeeks && typeof stored.collapsedWeeks === "object") {
          setCollapsedWeeks(
            Object.fromEntries(Object.entries(stored.collapsedWeeks).filter(([, value]) => typeof value === "boolean")),
          );
        }
      } catch {
        window.sessionStorage.removeItem(FEED_STATE_KEY);
      } finally {
        setHasRestoredFeedState(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [initialData.categories, initialData.sources]);

  useEffect(() => {
    if (!hasRestoredFeedState) return;
    const state: StoredFeedState = { filters, view, collapsedWeeks };
    window.sessionStorage.setItem(FEED_STATE_KEY, JSON.stringify(state));
  }, [collapsedWeeks, filters, hasRestoredFeedState, view]);

  const filtered = useMemo(() => {
    let list = articles.slice();
    if (filters.category !== "all") list = list.filter((article) => article.category === filters.category);
    list = list.filter((article) => filters.sources.includes(article.source_id));
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase();
      list = list.filter((article) =>
        [article.title, article.excerpt, article.author, article.source_domain]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }
    const presets = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };
    if (filters.datePreset !== "all") {
      const cutoff = initialNow.getTime() - presets[filters.datePreset] * 3600 * 1000;
      list = list.filter((article) => article.published_at && new Date(article.published_at).getTime() >= cutoff);
    }
    list.sort((a, b) => {
      if (filters.sort === "popular") return (b.view_count || 0) - (a.view_count || 0);
      return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
    });
    return list;
  }, [filters, articles, initialNow]);

  const featuredArticles = filtered.filter((article) => isWithinLastHours(article.published_at, initialNow, 24));
  const featuredIds = new Set(featuredArticles.map((article) => article.id));
  const rest = filtered.filter((article) => !featuredIds.has(article.id));
  const hasMoreArticles = articles.length < articlesTotal;
  const displayedArticles = view === "grid" ? filtered : rest;
  const weekGroups = useMemo(() => {
    const groups = new Map<string, WeekGroup>();

    displayedArticles.forEach((article) => {
      const bucket = weekBucket(article.published_at, initialNow);
      const group = groups.get(bucket.key) || { key: bucket.key, label: bucket.label, articles: [] };
      group.articles.push(article);
      groups.set(bucket.key, group);
    });

    return [...groups.values()];
  }, [displayedArticles, initialNow]);
  const activeFilterPills: ActiveFilterPill[] = [];
  const selectedCategory = initialData.categories.find((category) => category.id === filters.category);
  if (filters.category !== "all" && selectedCategory) activeFilterPills.push({ k: "category", label: selectedCategory.name });
  initialData.sources.forEach((source) => {
    if (!filters.sources.includes(source.id)) activeFilterPills.push({ k: "source", v: source.id, label: `Hide ${source.name}` });
  });
  if (filters.search) activeFilterPills.push({ k: "search", label: `"${filters.search}"` });
  if (filters.datePreset !== "all") {
    const map = { "24h": "Last 24h", "7d": "Last 7 days", "30d": "Last 30 days" };
    activeFilterPills.push({ k: "date", label: map[filters.datePreset] });
  }

  const clearFilter = (kind: string, sourceId?: string) => {
    if (kind === "category") setFilters({ ...filters, category: "all" });
    if (kind === "source" && sourceId) setFilters({ ...filters, sources: [...filters.sources, sourceId] });
    if (kind === "search") setFilters({ ...filters, search: "" });
    if (kind === "date") setFilters({ ...filters, datePreset: "all" });
  };

  const resetFilters = () =>
    setFilters({
      category: "all",
      sources: initialData.sources.map((source) => source.id),
      search: "",
      datePreset: "all",
      sort: "newest",
    });

  function toggleWeek(key: string) {
    setCollapsedWeeks((items) => ({ ...items, [key]: !items[key] }));
  }

  async function loadMoreArticles() {
    if (isLoadingMore || !hasMoreArticles) return;

    setIsLoadingMore(true);
    setLoadMoreError("");

    try {
      const params = new URLSearchParams({
        offset: String(articles.length),
        limit: String(LOAD_MORE_LIMIT),
      });
      const response = await fetch(`/api/articles?${params}`, { cache: "no-store" });
      if (redirectExpiredSession(response)) return;
      const payload = (await response.json().catch(() => null)) as {
        articles?: Article[];
        total?: number;
        error?: string;
      } | null;

      if (!response.ok || !payload?.articles) {
        throw new Error(payload?.error || "Could not load articles.");
      }

      setArticles((items) => {
        const seen = new Set(items.map((article) => article.id));
        return [...items, ...payload.articles!.filter((article) => !seen.has(article.id))];
      });
      if (typeof payload.total === "number") setArticlesTotal(payload.total);
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error.message : "Could not load articles.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="shell feed-private-shell">
      <div className="feed-shell">
        <aside className="left-side">
          <LeftFilters
            filters={filters}
            setFilters={setFilters}
            sources={initialData.sources}
            categories={initialData.categories}
            articles={articles}
          />
        </aside>

        <aside className="right-side">
          <RightDiscovery xQuotes={initialData.xQuotes} now={initialNow} isAdmin={isAdmin} />
        </aside>

        <main className="feed-col">
        <div className="brand-row feed-brand-row">
          <span>
            <strong>Intelligence feed</strong>
            <small>One feed for every frontier lab.</small>
          </span>
          <span className="brand-tag">Live</span>
        </div>
        <h1 className="sr-only">AI War - live frontier AI lab news, research, safety, and product updates</h1>

        <div className="mobile-bar">
          <button className="mobile-filter-btn" onClick={() => setDrawerOpen(true)}>
            <SlidersHorizontal size={14} />
            Filters
            {activeFilterPills.length > 0 ? (
              <span
                style={{
                  background: "var(--ember)",
                  color: "white",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  fontSize: 10,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {activeFilterPills.length}
              </span>
            ) : null}
          </button>
          <span style={{ fontSize: 12, color: "var(--mute)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowDownNarrowWide size={12} />
            Newest first
          </span>
        </div>

        {!initialData.isConfigured ? (
          <div className="empty">
            <SearchX size={28} style={{ color: "var(--mute)" }} />
            <h3>Supabase is not configured</h3>
            <p>Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, run the SQL migration, then seed articles.</p>
          </div>
        ) : null}

        <div className="feed-meta-row">
          <div className="feed-meta">
            <span className="strong">{filtered.length}</span> articles
            {filters.category === "all" && !filters.search && filters.datePreset === "all" ? (
              <span className="loaded-count">loaded of {articlesTotal}</span>
            ) : null}
            {filters.category !== "all" && selectedCategory ? (
              <span>
                {" "}
                in <span className="strong">{selectedCategory.name}</span>
              </span>
            ) : null}
            <span className="dot-sep">·</span>
            <span>updated {timeAgo(initialData.lastCrawledAt || filtered[0]?.published_at || null, initialNow)}</span>
          </div>
          <div className="feed-tools">
            <DigestPanel />
            <span className="sort-status">
              <ArrowDownNarrowWide size={12} />
              Newest first
            </span>
            <div className="view-toggle">
              <button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="List view">
                <Rows3 size={14} />
              </button>
              <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="Grid view">
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>

        {activeFilterPills.length > 0 ? (
          <div className="active-filters">
            {activeFilterPills.map((pill, index) => (
              <span key={index} className="fp">
                {pill.label}
                <button onClick={() => clearFilter(pill.k, pill.v)} aria-label="Remove filter">
                  <X size={10} strokeWidth={3} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <div className="empty">
            <SearchX size={28} style={{ color: "var(--mute)" }} />
            <h3>No articles match your filters</h3>
            <p>Try widening the date range or enabling more sources.</p>
            <button className="btn" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        ) : (
          <>
            {view === "list" ? (
              <FeaturedSection
                articles={featuredArticles}
                sources={initialData.sources}
                categories={initialData.categories}
                now={initialNow}
              />
            ) : null}
            <div className={view === "grid" ? "feed-grid-wrap" : "feed-list"}>
              {weekGroups.map((group) => {
                const collapsed = Boolean(collapsedWeeks[group.key]);

                return (
                  <section key={group.key} className={`week-section ${collapsed ? "collapsed" : ""}`}>
                    <button className="week-toggle" onClick={() => toggleWeek(group.key)} aria-expanded={!collapsed}>
                      <span className="label">{group.label}</span>
                      <span className="line" />
                      <span className="count">{group.articles.length}</span>
                      <ChevronDown size={14} className="chev" />
                    </button>
                    {!collapsed ? (
                      view === "grid" ? (
                        <div className="feed-grid">
                          {group.articles.map((article) => (
                            <ArticleCard
                              key={article.id}
                              article={article}
                              sources={initialData.sources}
                              categories={initialData.categories}
                              now={initialNow}
                            />
                          ))}
                        </div>
                      ) : (
                        group.articles.map((article) => (
                          <ArticleRow
                            key={article.id}
                            article={article}
                            sources={initialData.sources}
                            categories={initialData.categories}
                            now={initialNow}
                          />
                        ))
                      )
                    ) : null}
                  </section>
                );
              })}
            </div>
            {hasMoreArticles ? (
              <div className="load-more-wrap">
                <button className="btn load-more-btn" onClick={loadMoreArticles} disabled={isLoadingMore}>
                  {isLoadingMore ? "Loading..." : `Load ${Math.min(LOAD_MORE_LIMIT, articlesTotal - articles.length)} more`}
                </button>
                {loadMoreError ? <p className="load-more-error">{loadMoreError}</p> : null}
              </div>
            ) : null}
          </>
        )}

        <div className="mobile-aside">
          <RightDiscovery xQuotes={initialData.xQuotes} now={initialNow} isAdmin={isAdmin} />
        </div>
        </main>
      </div>

      {drawerOpen ? (
        <div
          className="mobile-drawer open"
          onClick={(event) => {
            if ((event.target as HTMLElement).classList.contains("mobile-drawer")) setDrawerOpen(false);
          }}
        >
          <div className="drawer-content">
            <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close">
              <X size={14} />
            </button>
            <h3 style={{ fontFamily: "var(--font-sans)", fontSize: 18, margin: 0 }}>Refine the feed</h3>
            <LeftFilters
              filters={filters}
              setFilters={setFilters}
              sources={initialData.sources}
              categories={initialData.categories}
              articles={articles}
            />
            <button
              className="btn"
              style={{ background: "var(--ink)", color: "white", borderColor: "var(--ink)", height: 40 }}
              onClick={() => setDrawerOpen(false)}
            >
              Show {filtered.length} articles
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
