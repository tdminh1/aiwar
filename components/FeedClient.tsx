"use client";

import {
  ArrowDownNarrowWide,
  Check,
  ExternalLink,
  LayoutGrid,
  Rows3,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { HeroArt } from "@/components/HeroArt";
import type { Article, CategoryOption, FeedData, Source } from "@/lib/types";

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

function dayBucket(iso: string | null, now = new Date()) {
  if (!iso) return "Undated";
  const t = new Date(iso);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  const w = new Date(today);
  w.setDate(w.getDate() - 7);
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === y.getTime()) return "Yesterday";
  if (d.getTime() > w.getTime()) return "This week";
  return "Earlier";
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
}: {
  article: Article;
  sources: Source[];
  categories: CategoryOption[];
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
      <span>{timeAgo(article.published_at)}</span>
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

function openArticle(article: Article) {
  window.open(article.url, "_blank", "noopener,noreferrer");
}

function FeaturedCard({
  article,
  sources,
  categories,
}: {
  article: Article;
  sources: Source[];
  categories: CategoryOption[];
}) {
  const source = sources.find((item) => item.id === article.source_id);

  return (
    <article className="featured" onClick={() => openArticle(article)}>
      <div className="featured-img">
        <HeroArt kind={article.hero_variant} />
        <span className="featured-badge">
          <span className="dot" />
          Latest
        </span>
      </div>
      <div className="featured-body">
        <ArticleMeta article={article} sources={sources} categories={categories} />
        <h2 className="featured-title">{article.title}</h2>
        <p className="featured-excerpt">{article.excerpt}</p>
        <span className="read-link">
          Read on {source?.domain || article.source_domain || "source"}
          <ExternalLink size={14} strokeWidth={2.5} />
        </span>
      </div>
    </article>
  );
}

function ArticleCard({
  article,
  sources,
  categories,
}: {
  article: Article;
  sources: Source[];
  categories: CategoryOption[];
}) {
  return (
    <article className="article-card" onClick={() => openArticle(article)}>
      <div className="article-card-img">
        <HeroArt kind={article.hero_variant} />
      </div>
      <div className="article-card-body">
        <ArticleMeta article={article} sources={sources} categories={categories} />
        <h3 className="article-card-title">{article.title}</h3>
        <p className="article-card-excerpt">{article.excerpt}</p>
      </div>
    </article>
  );
}

function ArticleRow({
  article,
  sources,
  categories,
}: {
  article: Article;
  sources: Source[];
  categories: CategoryOption[];
}) {
  const source = sources.find((item) => item.id === article.source_id);

  return (
    <article className="article-row" onClick={() => openArticle(article)}>
      <div className="article-body">
        <ArticleMeta article={article} sources={sources} categories={categories} />
        <h3 className="article-title">{article.title}</h3>
        <p className="article-excerpt">{article.excerpt}</p>
        <div className="article-foot">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ExternalLink size={11} />
            {source?.domain || article.source_domain || "source"}
          </span>
        </div>
      </div>
      <div className="article-thumb">
        <HeroArt kind={article.hero_variant} />
      </div>
    </article>
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

function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setStatus(response.ok ? "success" : "error");
    if (response.ok) setEmail("");
  }

  return (
    <div className="r-section newsletter">
      <div className="nl-eyebrow">Newsletter</div>
      <h3 className="nl-title">Get frontier lab updates in your inbox.</h3>
      <p className="nl-sub">A compact digest for important AI research, model, and platform posts.</p>
      {status === "success" ? (
        <div className="nl-success">Subscribed.</div>
      ) : (
        <form className="nl-form" onSubmit={submit}>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Saving..." : "Subscribe"}
          </button>
        </form>
      )}
      {status === "error" ? <div className="nl-foot">Supabase is not configured or the request failed.</div> : null}
    </div>
  );
}

function RightDiscovery({
  data,
  setSearch,
}: {
  data: FeedData;
  setSearch: (value: string) => void;
}) {
  return (
    <>
      <div className="r-section">
        <div className="r-head">
          <h3 className="r-title">Trending Topics</h3>
          <span className="r-meta">Live</span>
        </div>
        <div className="topic-pills">
          {data.topics.map((topic, index) => (
            <button
              key={topic.id}
              className={`topic-pill ${index < 2 ? "hot" : ""}`}
              onClick={() => setSearch(topic.name)}
            >
              {topic.name}
              <span className="trend">{topic.trend_score}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="r-section">
        <div className="r-head">
          <h3 className="r-title">Most Read</h3>
          <span className="r-meta">Top 5</span>
        </div>
        <div className="most-read">
          {data.mostRead.map((article, index) => {
            const source = data.sources.find((item) => item.id === article.source_id);
            return (
              <article key={article.id} className="mr-item" onClick={() => openArticle(article)}>
                <span className="mr-rank">{index + 1}</span>
                <div>
                  <h4 className="mr-title">{article.title}</h4>
                  <div className="mr-meta">
                    <SourceBadge sourceId={article.source_id} sources={data.sources} size={12} />
                    {source?.name || "Unknown"}
                    <span className="dot-sep">·</span>
                    {article.view_count ? `${article.view_count.toLocaleString()} views` : "popular"}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <Newsletter />

      <div className="r-section">
        <div className="r-head">
          <h3 className="r-title">Crawl Status</h3>
          <span className="crawl-status">
            <span className="dot" />
            Ready
          </span>
        </div>
        <div className="crawl">
          {data.sources.map((source) => (
            <div className="crawl-row" key={source.id}>
              <span className="lab">
                <img src={sourceLogo(source)} alt="" />
                {source.name}
              </span>
              <span className="time">{timeAgo(source.last_crawled_at)}</span>
            </div>
          ))}
        </div>
        <div className="crawl-foot">
          <span>LAST CRAWL</span>
          <span>{data.lastCrawledAt ? timeAgo(data.lastCrawledAt) : "pending"}</span>
        </div>
      </div>
    </>
  );
}

export function FeedClient({ initialData }: { initialData: FeedData }) {
  const [view, setView] = useState<"list" | "grid">("list");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    category: "all",
    sources: initialData.sources.map((source) => source.id),
    search: "",
    datePreset: "all",
    sort: "newest",
  });

  const filtered = useMemo(() => {
    let list = initialData.articles.slice();
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
      const cutoff = Date.now() - presets[filters.datePreset] * 3600 * 1000;
      list = list.filter((article) => article.published_at && new Date(article.published_at).getTime() >= cutoff);
    }
    list.sort((a, b) => {
      if (filters.sort === "popular") return (b.view_count || 0) - (a.view_count || 0);
      return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime();
    });
    return list;
  }, [filters, initialData.articles]);

  const featured = filtered[0];
  const rest = filtered.slice(1);
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

  const setSearch = (value: string) => setFilters((current) => ({ ...current, search: value }));

  return (
    <div className="shell">
      <div className="left-side">
        <LeftFilters
          filters={filters}
          setFilters={setFilters}
          sources={initialData.sources}
          categories={initialData.categories}
          articles={initialData.articles}
        />
      </div>

      <div className="right-side">
        <RightDiscovery data={initialData} setSearch={setSearch} />
      </div>

      <main className="feed-col">
        <div className="brand-row">
          <a className="brand" href="#">
            <img src="/assets/aiwar-logo-mark.png" alt="AI War" className="brand-logo" />
            <span className="brand-tag">Live</span>
          </a>
          <span className="brand-strap">One feed for every frontier lab.</span>
        </div>

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
            {filters.category !== "all" && selectedCategory ? (
              <span>
                {" "}
                in <span className="strong">{selectedCategory.name}</span>
              </span>
            ) : null}
            <span className="dot-sep">·</span>
            <span>updated {timeAgo(initialData.lastCrawledAt || featured?.published_at || null)}</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 12, color: "var(--mute)", display: "inline-flex", alignItems: "center", gap: 6 }}>
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
            {view === "list" && featured ? (
              <FeaturedCard article={featured} sources={initialData.sources} categories={initialData.categories} />
            ) : null}
            <div className={view === "grid" ? "feed-grid-wrap" : "feed-list"}>
              {Object.entries(
                (view === "grid" ? filtered : rest).reduce<Record<string, Article[]>>((groups, article) => {
                  const bucket = dayBucket(article.published_at);
                  groups[bucket] = groups[bucket] || [];
                  groups[bucket].push(article);
                  return groups;
                }, {}),
              ).map(([bucket, items]) => (
                <div key={bucket}>
                  <div className="day-divider">
                    <span className="label">{bucket}</span>
                    <span className="line" />
                    <span className="label" style={{ color: "var(--mute-2)" }}>
                      {items.length}
                    </span>
                  </div>
                  {view === "grid" ? (
                    <div className="feed-grid">
                      {items.map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          sources={initialData.sources}
                          categories={initialData.categories}
                        />
                      ))}
                    </div>
                  ) : (
                    items.map((article) => (
                      <ArticleRow
                        key={article.id}
                        article={article}
                        sources={initialData.sources}
                        categories={initialData.categories}
                      />
                    ))
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mobile-aside">
          <RightDiscovery data={initialData} setSearch={setSearch} />
        </div>
      </main>

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
              articles={initialData.articles}
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
