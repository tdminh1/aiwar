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
  slug text unique,
  summary text,
  key_points jsonb,
  trend_score integer not null default 0,
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz,
  created_at timestamptz not null default now()
);

alter table topics add column if not exists slug text unique;
alter table topics add column if not exists summary text;
alter table topics add column if not exists key_points jsonb;
alter table topics add column if not exists updated_at timestamptz not null default now();
alter table topics add column if not exists last_activity_at timestamptz;

create table if not exists article_topics (
  article_id uuid not null references articles(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, topic_id)
);

create index if not exists topics_slug_idx on topics(slug);
create index if not exists article_topics_topic_id_idx on article_topics(topic_id);

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

create table if not exists reader_quotes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  text text not null,
  profile_url text,
  profile_platform text check (profile_platform in ('facebook', 'x', 'instagram')),
  profile_handle text,
  created_at timestamptz not null default now(),
  constraint reader_quotes_name_length check (char_length(name) between 1 and 24),
  constraint reader_quotes_profile_handle_length check (profile_handle is null or char_length(profile_handle) between 1 and 32),
  constraint reader_quotes_text_length check (char_length(text) between 1 and 180)
);

alter table reader_quotes add column if not exists profile_url text;
alter table reader_quotes add column if not exists profile_platform text;
alter table reader_quotes add column if not exists profile_handle text;

create index if not exists reader_quotes_created_at_idx on reader_quotes(created_at desc);

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

-- One row per ISO week. category_summaries / source_stats are grounded strictly
-- in articles actually crawled that week (see lib/digest.ts) so every summary
-- sentence traces back to a real, linkable article.
create table if not exists weekly_digests (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  slug text unique,
  overall_summary text,
  category_summaries jsonb,
  source_stats jsonb,
  articles_considered integer not null default 0,
  status text not null default 'success' check (status in ('success', 'partial', 'failed')),
  error_message text,
  model text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint weekly_digests_week_start_unique unique (week_start)
);

create index if not exists weekly_digests_week_start_idx on weekly_digests(week_start desc);
create index if not exists weekly_digests_slug_idx on weekly_digests(slug);

-- Browser clients authenticate through Supabase Auth, but all application data
-- is served by protected Next.js routes. Keep direct anon/authenticated access
-- closed even if the default Supabase grants change.
alter table sources enable row level security;
alter table articles enable row level security;
alter table topics enable row level security;
alter table article_topics enable row level security;
alter table article_metrics enable row level security;
alter table subscribers enable row level security;
alter table reader_quotes enable row level security;
alter table crawl_runs enable row level security;
alter table weekly_digests enable row level security;

create or replace view most_read_articles as
select
  a.*,
  coalesce(m.view_count, 0) as view_count
from articles a
left join article_metrics m on m.article_id = a.id
order by coalesce(m.view_count, 0) desc, a.published_at desc nulls last;

alter view most_read_articles set (security_invoker = true);
revoke all on table most_read_articles from public, anon, authenticated;
grant select on table most_read_articles to service_role;
