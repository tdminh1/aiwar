-- Run once in Supabase SQL Editor for project wrrgaahfidrlszgvmegf.
-- Application data is served by authenticated Next.js routes using service_role.

create table if not exists public.article_topics (
  article_id uuid not null references public.articles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (article_id, topic_id)
);

create index if not exists article_topics_topic_id_idx on public.article_topics(topic_id);

alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.topics enable row level security;
alter table public.article_topics enable row level security;
alter table public.article_metrics enable row level security;
alter table public.subscribers enable row level security;
alter table public.reader_quotes enable row level security;
alter table public.crawl_runs enable row level security;

alter view public.most_read_articles set (security_invoker = true);
revoke all on table public.most_read_articles from public, anon, authenticated;
grant select on table public.most_read_articles to service_role;
