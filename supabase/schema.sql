create extension if not exists pgcrypto;

create table if not exists sources (
  id text primary key,
  name text not null,
  domain text not null,
  color text not null,
  logo_path text,
  feed_url text,
  is_active boolean not null default true,
  last_crawled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  url text not null unique,
  source_id text not null references sources(id) on delete cascade,
  source_domain text,
  author text,
  category text check (
    category in (
      'announcements',
      'models',
      'research',
      'product',
      'safety',
      'science',
      'policy',
      'company'
    )
  ),
  thumbnail_url text,
  hero_variant text,
  read_minutes integer not null default 4,
  published_at timestamptz,
  crawled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists articles_source_id_idx on articles(source_id);
create index if not exists articles_category_idx on articles(category);
create index if not exists articles_published_at_idx on articles(published_at desc);
create index if not exists articles_search_idx on articles using gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(author, ''))
);

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  trend_score integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists article_metrics (
  article_id uuid primary key references articles(id) on delete cascade,
  view_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now()
);

create table if not exists crawl_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text references sources(id) on delete set null,
  status text not null default 'success',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  articles_found integer not null default 0,
  articles_saved integer not null default 0,
  error_message text
);

create or replace view most_read_articles as
select
  a.*,
  coalesce(m.view_count, 0) as view_count
from articles a
left join article_metrics m on m.article_id = a.id
order by coalesce(m.view_count, 0) desc, a.published_at desc nulls last;
