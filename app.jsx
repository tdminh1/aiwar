// AI War — editorial homepage (centered feed + quiet fixed sidebars)
const { useState, useMemo, useEffect, useRef } = React;
const { SOURCES, CATEGORIES, ARTICLES, TOPICS, MOST_READ, now } = window.AIWAR_DATA;
const HeroArt = window.HeroArt;

// ---------- icon helper (Lucide) ----------
function Icon({ name, size = 16, strokeWidth = 2, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (window.lucide && ref.current) {
      ref.current.innerHTML = '';
      const i = document.createElement('i');
      i.setAttribute('data-lucide', name);
      i.style.width = size + 'px';
      i.style.height = size + 'px';
      ref.current.appendChild(i);
      window.lucide.createIcons({ attrs: { 'stroke-width': strokeWidth, width: size, height: size } });
    }
  }, [name, size, strokeWidth]);
  return <span ref={ref} style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width: size, height: size, ...style}}></span>;
}

// ---------- time helpers ----------
function timeAgo(iso) {
  const t = new Date(iso).getTime();
  const diff = (now.getTime() - t) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  const d = Math.floor(diff/86400);
  if (d < 7) return d + 'd ago';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function dayBucket(iso) {
  const t = new Date(iso);
  const today = new Date(now); today.setHours(0,0,0,0);
  const y = new Date(today); y.setDate(y.getDate()-1);
  const w = new Date(today); w.setDate(w.getDate()-7);
  const d = new Date(t); d.setHours(0,0,0,0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === y.getTime()) return 'Yesterday';
  if (d.getTime() > w.getTime()) return 'This week';
  return 'Earlier';
}

// ---------- atoms ----------
function SourceBadge({ sourceId, size = 16 }) {
  const s = SOURCES.find(x => x.id === sourceId);
  if (!s) return null;
  return (
    <span className="src-mark" style={{ width: size, height: size }}>
      <img src={s.logo} alt={s.name}/>
    </span>
  );
}

function ArticleMeta({ article }) {
  const src = SOURCES.find(s => s.id === article.source_id);
  const cat = CATEGORIES.find(c => c.id === article.category);
  return (
    <div className="article-meta">
      <span className="src-chip">
        <SourceBadge sourceId={article.source_id}/>
        {src.name}
      </span>
      <span className="dot-sep">·</span>
      <span>{timeAgo(article.published_at)}</span>
      {cat && (<>
        <span className="dot-sep">·</span>
        <span className="cat-chip">{cat.name}</span>
      </>)}
      <span className="dot-sep">·</span>
      <span>{article.read_min} min read</span>
    </div>
  );
}

function FeaturedCard({ article, onOpen }) {
  return (
    <article className="featured" onClick={()=>onOpen(article)}>
      <div className="featured-img">
        <HeroArt kind={article.hero}/>
        <span className="featured-badge"><span className="dot"></span>Latest</span>
      </div>
      <div className="featured-body">
        <ArticleMeta article={article}/>
        <h2 className="featured-title">{article.title}</h2>
        <p className="featured-excerpt">{article.excerpt}</p>
        <span className="read-link">
          Read on {SOURCES.find(s => s.id === article.source_id).domain}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </span>
      </div>
    </article>
  );
}

function ArticleCard({ article, onOpen }) {
  return (
    <article className="article-card" onClick={()=>onOpen(article)}>
      <div className="article-card-img">
        <HeroArt kind={article.hero}/>
      </div>
      <div className="article-card-body">
        <ArticleMeta article={article}/>
        <h3 className="article-card-title">{article.title}</h3>
        <p className="article-card-excerpt">{article.excerpt}</p>
      </div>
    </article>
  );
}

function ArticleRow({ article, onOpen }) {
  return (
    <article className="article-row" onClick={()=>onOpen(article)}>
      <div className="article-body">
        <ArticleMeta article={article}/>
        <h3 className="article-title">{article.title}</h3>
        <p className="article-excerpt">{article.excerpt}</p>
        <div className="article-foot">
          <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
            <Icon name="external-link" size={11}/>
            {SOURCES.find(s => s.id === article.source_id).domain}
          </span>
          <button className="bookmark" onClick={(e)=>e.stopPropagation()} aria-label="Save">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>
      <div className="article-thumb">
        <HeroArt kind={article.hero}/>
      </div>
    </article>
  );
}

// ---------- LEFT SIDEBAR (quiet filters) ----------
function LeftFilters({ filters, setFilters }) {
  const counts = useMemo(() => {
    const out = { all: ARTICLES.length };
    CATEGORIES.forEach(c => {
      if (c.id !== 'all') out[c.id] = ARTICLES.filter(a => a.category === c.id).length;
    });
    return out;
  }, []);

  const toggleSource = (id) => {
    const has = filters.sources.includes(id);
    setFilters({ ...filters, sources: has ? filters.sources.filter(x => x !== id) : [...filters.sources, id] });
  };
  const setPreset = (p) => setFilters({ ...filters, datePreset: p, dateStart: '', dateEnd: '' });

  return (
    <>
      <div className="side-search">
        <span className="icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
        </span>
        <input
          type="text"
          placeholder="Search the feed…"
          value={filters.search}
          onChange={e=>setFilters({...filters, search: e.target.value})}
        />
      </div>

      <div className="side-section">
        <div className="eyebrow">Categories</div>
        <div className="filter-list">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`filter-row ${filters.category === c.id ? 'active' : ''}`}
              onClick={()=>setFilters({...filters, category: c.id})}
            >
              <span>{c.name}</span>
              <span className="count">{counts[c.id] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="side-section">
        <div className="eyebrow">Sources</div>
        <div>
          {SOURCES.map(s => {
            const checked = filters.sources.includes(s.id);
            return (
              <label key={s.id} className={`source-toggle ${checked ? 'checked' : ''}`}>
                <input type="checkbox" checked={checked} onChange={()=>toggleSource(s.id)}/>
                <SourceBadge sourceId={s.id} size={16}/>
                <span className="label">{s.name}</span>
                <span className="check">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="side-section">
        <div className="eyebrow">Time range</div>
        <div className="date-presets">
          {[['24h','24h'],['7d','7d'],['30d','30d'],['all','All']].map(([id,label])=>(
            <button
              key={id}
              className={`date-preset ${filters.datePreset === id ? 'active' : ''}`}
              onClick={()=>setPreset(id)}
            >{label}</button>
          ))}
        </div>
      </div>

    </>
  );
}

// ---------- RIGHT SIDEBAR — Reader Quotes ----------
const SEED_QUOTES = [
  { id: 'q1', name: 'mira_k', text: "Long context killed my RAG side project — and I'm not even mad.", t: '2h ago' },
  { id: 'q2', name: 'devon', text: "Reading three lab blogs back to back used to take my whole morning.", t: '6h ago' },
  { id: 'q3', name: 'sora.k', text: "The RSP v3 thresholds finally feel like they're written for the world we live in.", t: '1d ago' },
];

function avatarColor(name) {
  const palette = ['#FF6719','#10A37F','#4285F4','#D97757','#7C3AED','#0EA5E9'];
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function QuoteWall() {
  const [quotes, setQuotes] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('aiwar_quotes') || 'null');
      return saved && saved.length ? saved : SEED_QUOTES;
    } catch { return SEED_QUOTES; }
  });
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('aiwar_quotes', JSON.stringify(quotes)); } catch {}
  }, [quotes]);

  const submit = (e) => {
    e.preventDefault();
    const n = name.trim() || 'anon';
    const t = text.trim();
    if (!t) return;
    setQuotes([{ id: 'q' + Date.now(), name: n, text: t, t: 'just now' }, ...quotes]);
    setText(''); setOpen(false);
  };

  return (
    <div className="r-section quote-wall">
      <div className="r-head">
        <h3 className="r-title">Reader Quotes</h3>
        <button className="r-add" onClick={()=>setOpen(o=>!o)} aria-label="Add quote">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {open ? <path d="M18 6L6 18M6 6l12 12"/> : <path d="M12 5v14M5 12h14"/>}
          </svg>
        </button>
      </div>

      {open && (
        <form className="quote-form" onSubmit={submit}>
          <input
            className="quote-name"
            type="text"
            placeholder="Nickname"
            value={name}
            onChange={e=>setName(e.target.value)}
            maxLength={24}
          />
          <textarea
            className="quote-text"
            placeholder="Share a thought on what the labs are shipping…"
            value={text}
            onChange={e=>setText(e.target.value)}
            maxLength={180}
            rows={3}
          />
          <div className="quote-form-foot">
            <span className="quote-count">{text.length}/180</span>
            <button type="submit" disabled={!text.trim()}>Post</button>
          </div>
        </form>
      )}

      <ul className="quote-list">
        {quotes.map(q => (
          <li key={q.id} className="quote-item">
            <span className="quote-avatar" style={{ background: avatarColor(q.name) }}>{q.name.slice(0,1).toUpperCase()}</span>
            <div>
              <p className="quote-body">“{q.text}”</p>
              <div className="quote-meta">
                <span className="quote-name-lbl">@{q.name}</span>
                <span className="dot-sep">·</span>
                <span>{q.t}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Keep RightDiscovery as the wrapper for QuoteWall (so the rest of the App code stays the same)
function RightDiscovery() {
  return <QuoteWall/>;
}

// ---------- App ----------
function App() {
  const [view, setView] = useState('list'); // 'list' | 'grid'
  const [filters, setFilters] = useState({
    category: 'all',
    sources: SOURCES.map(s => s.id),
    search: '',
    datePreset: 'all',
    dateStart: '',
    dateEnd: '',
    sort: 'newest',
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = ARTICLES.slice();
    if (filters.category !== 'all') list = list.filter(a => a.category === filters.category);
    list = list.filter(a => filters.sources.includes(a.source_id));
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(a => (a.title + ' ' + a.excerpt).toLowerCase().includes(q));
    }
    const t = now.getTime();
    const presets = { '24h': 24, '7d': 24*7, '30d': 24*30 };
    if (presets[filters.datePreset]) {
      const cutoff = t - presets[filters.datePreset] * 3600 * 1000;
      list = list.filter(a => new Date(a.published_at).getTime() >= cutoff);
    }
    list.sort((a,b) => filters.sort === 'newest'
      ? new Date(b.published_at) - new Date(a.published_at)
      : (MOST_READ.findIndex(m=>m.id===a.id)+1 || 99) - (MOST_READ.findIndex(m=>m.id===b.id)+1 || 99)
    );
    return list;
  }, [filters]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  const grouped = useMemo(() => {
    const out = {};
    rest.forEach(a => {
      const b = dayBucket(a.published_at);
      if (!out[b]) out[b] = [];
      out[b].push(a);
    });
    return out;
  }, [rest]);

  const openArticle = (a) => { console.log('open', a.url); };

  const clearFilter = (k, v) => {
    if (k === 'category') setFilters({...filters, category: 'all'});
    else if (k === 'source') setFilters({...filters, sources: [...filters.sources, v]});
    else if (k === 'search') setFilters({...filters, search: ''});
    else if (k === 'date') setFilters({...filters, datePreset: 'all', dateStart: '', dateEnd: ''});
  };

  const activeFilterPills = [];
  if (filters.category !== 'all') activeFilterPills.push({k:'category', label: CATEGORIES.find(c=>c.id===filters.category).name});
  SOURCES.forEach(s => { if (!filters.sources.includes(s.id)) activeFilterPills.push({k:'source', v: s.id, label: `Hide ${s.name}`}); });
  if (filters.search) activeFilterPills.push({k:'search', label: `"${filters.search}"`});
  if (filters.datePreset !== 'all' && filters.datePreset !== 'custom') {
    const map = {'24h':'Last 24h','7d':'Last 7 days','30d':'Last 30 days'};
    activeFilterPills.push({k:'date', label: map[filters.datePreset]});
  }

  return (
    <div className="shell">
      {/* Fixed left filters — desktop only */}
      <div className="left-side">
        <LeftFilters filters={filters} setFilters={setFilters}/>
      </div>

      {/* Fixed right discovery — desktop only */}
      <div className="right-side">
        <RightDiscovery onTopicClick={(name)=>setFilters({...filters, search: name})}/>
      </div>

      {/* CENTER feed — always horizontally centered in viewport */}
      <main className="feed-col">
        <div className="brand-row">
          <a className="brand" href="#">
            <img src="assets/aiwar-logo-mark.png" alt="AI War" className="brand-logo"/>
            <span className="brand-tag">Live</span>
          </a>
          <span className="brand-strap">One feed for every frontier lab.</span>
        </div>

        <div className="mobile-bar">
          <button className="mobile-filter-btn" onClick={()=>setDrawerOpen(true)}>
            <Icon name="sliders-horizontal" size={14}/>
            Filters
            {activeFilterPills.length > 0 && <span style={{background:'var(--ember)', color:'white', borderRadius:'50%', width:18, height:18, fontSize:10, display:'grid', placeItems:'center'}}>{activeFilterPills.length}</span>}
          </button>
          <span style={{fontSize:12, color:'var(--mute)', display:'inline-flex', alignItems:'center', gap:6}}>
            <Icon name="arrow-down-narrow-wide" size={12}/>Newest first
          </span>
        </div>

        <div className="feed-meta-row">
          <div className="feed-meta">
            <span className="strong">{filtered.length}</span> articles
            {filters.category !== 'all' && <span> in <span className="strong">{CATEGORIES.find(c=>c.id===filters.category).name}</span></span>}
            <span className="dot-sep">·</span>
            <span>updated {timeAgo(featured ? featured.published_at : new Date().toISOString())}</span>
          </div>
          <div style={{display:'inline-flex', alignItems:'center', gap:14}}>
            <span style={{fontSize:12, color:'var(--mute)', display:'inline-flex', alignItems:'center', gap:6}}>
              <Icon name="arrow-down-narrow-wide" size={12}/>Newest first
            </span>
            <div className="view-toggle">
              <button className={view==='list' ? 'active' : ''} onClick={()=>setView('list')} aria-label="List view">
                <Icon name="rows-3" size={14}/>
              </button>
              <button className={view==='grid' ? 'active' : ''} onClick={()=>setView('grid')} aria-label="Grid view">
                <Icon name="layout-grid" size={14}/>
              </button>
            </div>
          </div>
        </div>

        {activeFilterPills.length > 0 && (
          <div className="active-filters">
            {activeFilterPills.map((p,i)=>(
              <span key={i} className="fp">
                {p.label}
                <button onClick={()=>clearFilter(p.k, p.v)} aria-label="Remove filter">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty">
            <Icon name="search-x" size={28} style={{color:'var(--mute)'}}/>
            <h3>No articles match your filters</h3>
            <p>Try widening the date range or enabling more sources.</p>
            <button className="btn" onClick={()=>setFilters({category:'all', sources: SOURCES.map(s=>s.id), search:'', datePreset:'all', dateStart:'', dateEnd:'', sort:'newest'})}>Reset filters</button>
          </div>
        ) : (
          <>
            {view === 'list' && featured && <FeaturedCard article={featured} onOpen={openArticle}/>}
            {(() => {
              const items = view === 'grid' ? filtered : rest;
              const groupedItems = {};
              items.forEach(a => {
                const b = dayBucket(a.published_at);
                if (!groupedItems[b]) groupedItems[b] = [];
                groupedItems[b].push(a);
              });
              return (
                <div className={view === 'grid' ? 'feed-grid-wrap' : 'feed-list'}>
                  {Object.entries(groupedItems).map(([bucket, items]) => (
                    <div key={bucket}>
                      <div className="day-divider">
                        <span className="label">{bucket}</span>
                        <span className="line"></span>
                        <span className="label" style={{color:'var(--mute-2)'}}>{items.length}</span>
                      </div>
                      {view === 'grid' ? (
                        <div className="feed-grid">
                          {items.map(a => <ArticleCard key={a.id} article={a} onOpen={openArticle}/>)}
                        </div>
                      ) : (
                        items.map(a => <ArticleRow key={a.id} article={a} onOpen={openArticle}/>)
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}

        {/* Mobile / tablet — show discovery stacked below feed when sidebar hidden */}
        <div className="mobile-aside">
          <RightDiscovery onTopicClick={(name)=>setFilters({...filters, search: name})}/>
        </div>
      </main>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div className={`mobile-drawer open`} onClick={(e)=>{ if (e.target.classList.contains('mobile-drawer')) setDrawerOpen(false); }}>
          <div className="drawer-content">
            <button className="drawer-close" onClick={()=>setDrawerOpen(false)} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <h3 style={{fontFamily:'var(--font-sans)', fontSize: 18, margin: 0, letterSpacing:'-0.02em'}}>Refine the feed</h3>
            <LeftFilters filters={filters} setFilters={setFilters}/>
            <button className="btn" style={{background:'var(--ink)', color:'white', borderColor:'var(--ink)', height:40}} onClick={()=>setDrawerOpen(false)}>
              Show {filtered.length} articles
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
