-- Run once in Supabase SQL Editor for project wrrgaahfidrlszgvmegf.
-- Adds the weekly_digests table for the Weekly AI Digest feature.
-- Idempotent: safe to re-run.

create table if not exists public.weekly_digests (
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

create index if not exists weekly_digests_week_start_idx on public.weekly_digests(week_start desc);
create index if not exists weekly_digests_slug_idx on public.weekly_digests(slug);

alter table public.weekly_digests enable row level security;
