-- Run once in Supabase SQL Editor for project wrrgaahfidrlszgvmegf.
-- Adds the x_quotes table (tweets crawled from a configured list of X
-- handles) that replaces the retired Reader Quotes feature. reader_quotes
-- itself is left in place — its data is not deleted, just no longer read or
-- written by the app.
-- Idempotent: safe to re-run.

create table if not exists public.x_quotes (
  id uuid primary key default gen_random_uuid(),
  tweet_id text not null unique,
  author_handle text not null,
  author_name text,
  author_avatar_url text,
  text text not null,
  tweet_url text not null,
  posted_at timestamptz,
  crawled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists x_quotes_posted_at_idx on public.x_quotes(posted_at desc);

alter table public.x_quotes enable row level security;
