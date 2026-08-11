-- Run once in Supabase SQL Editor for project wrrgaahfidrlszgvmegf.
-- Application data is served by authenticated Next.js routes using service_role.

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
