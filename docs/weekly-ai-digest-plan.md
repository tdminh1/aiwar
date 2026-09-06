# Weekly AI Digest — Feature Plan & Scope

Status: proposed, not yet implemented. This document scopes the "AI summarizes this week's events across OpenAI, Anthropic, and Google DeepMind" feature requested on 2026-09-06. It builds on roadmap items #1 ("AI-generated article summaries") and #6 ("Weekly digest email") from [`AI_War_Project_Context_For_AI.md`](../uploads/AI_War_Project_Context_For_AI.md), narrowed to an in-app (non-email) V1.

## 1. One-line description

Once a week, AI War automatically reads everything the three tracked labs published in the last 7 days and generates a grounded, per-category recap — surfaced as a new page on the site — so a user can catch up without reading every article.

## 2. Decisions already confirmed with the requester

| Decision | Choice |
|---|---|
| Delivery channel | In-app page/section only. No email in V1 (the `subscribers` table stays unused for this feature; no email-sending infra exists in the repo today). |
| Generation trigger | Both: automatic weekly Vercel Cron **and** manual on-demand regeneration. Manual trigger reuses the same bearer-token-protected endpoint pattern as `/api/crawl` — no new admin role/UI is introduced in V1. |
| Content depth | Full recap grouped by category (not just 3–5 highlights per lab). Every category with activity that week gets an AI-written paragraph plus the underlying article list. |

## 3. In scope (V1)

- **Schema**: new `weekly_digests` table, one row per ISO week, holding the overall summary, a per-category summary (JSON), per-source article counts, and generation status/metadata.
- **Pipeline** (`lib/digest.ts`): for a given week window, pull all `articles` with `published_at` in range, group by `category` (per `lib/categories.ts`), then by `source_id`. Make one structured LLM call per digest via OpenRouter's OpenAI-compatible API (not per category — cheaper, more consistent; default model `anthropic/claude-sonnet-5`, overridable via `OPENROUTER_MODEL`) that returns:
  - a 3–6 sentence overall "this week across OpenAI, Anthropic, and Google DeepMind" summary;
  - one paragraph per category that actually had articles that week;
  - nothing else — the model is only given the real article titles/excerpts/urls/sources for that week and is instructed not to add facts beyond them.
- **API routes**, mirroring the existing `/api/crawl` pattern:
  - `POST /api/digest/generate` — `CRON_SECRET`-protected (same header contract as `/api/crawl`). Computes the current ISO week by default, or accepts a `week_start` param for backfill/manual regeneration of a past week. Upserts on `week_start` (regenerating never duplicates).
- **Vercel Cron**: one weekly entry (e.g. Monday 06:00 UTC) calling `/api/digest/generate`, added next to the existing crawl schedule.
- **UI**:
  - `/digest` — list of past weekly digests, newest first.
  - `/digest/[slug]` — week range header, per-source stat chips (reusing existing source colors/logos), overall summary, then one section per category (AI paragraph + list of the underlying articles linking back to originals — this keeps every claim checkable against a real source).
  - A "This week in AI" teaser card linking to the latest digest, added to the main feed.
  - Explicit "AI-generated — verify against the linked sources" note on every digest page.
  - Empty state for "not generated yet" and a visible `status: failed` state that never breaks the homepage.
- **Types**: `WeeklyDigest`, `WeeklyDigestCategorySummary` added to `lib/types.ts`.
- **Env var**: `OPENROUTER_API_KEY` (OpenRouter's OpenAI-compatible chat-completions API, server-only, same handling discipline as `SUPABASE_SERVICE_ROLE_KEY`); optional `OPENROUTER_MODEL` to pick a different OpenRouter model slug.

## 4. Out of scope for V1 (later roadmap)

- Emailing the digest to `subscribers` (needs separate email-sending infra work first).
- Any admin role/UI for triggering regeneration — V1 manual trigger is the same bearer-token call an operator already uses for `/api/crawl`.
- Cross-week trend charts or a lab-comparison dashboard.
- Multi-language digests.
- Per-user customized digests (subscribe to specific sources/categories only).
- Any change to the existing `topics` feature (manually-seeded topic summaries stay as-is; this is article-recap based, not topic-clustering based).

## 5. Data model sketch

```sql
create table if not exists weekly_digests (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  week_end date not null,
  slug text unique,
  overall_summary text,
  category_summaries jsonb,      -- { [category]: { summary: string, article_ids: uuid[] } }
  source_stats jsonb,            -- { [source_id]: { count: number } }
  articles_considered integer not null default 0,
  status text not null default 'success', -- success | failed | partial
  error_message text,
  model text,                    -- e.g. "claude-sonnet-5"
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint weekly_digests_week_start_unique unique (week_start)
);

create index if not exists weekly_digests_week_start_idx on weekly_digests(week_start desc);
alter table weekly_digests enable row level security;
```

Follows the same RLS posture as the rest of the schema: browser never queries this table directly, only server components / API routes using the service role key.

## 6. Pipeline flow

1. Vercel Cron (or a manual bearer-token call) hits `POST /api/digest/generate`.
2. Route validates `Authorization: Bearer <CRON_SECRET>`, same as `/api/crawl`.
3. Compute the week window: ISO week, Monday 00:00 UTC – Sunday 23:59 UTC, to match the existing crawler's UTC-based cutoff logic. (Flag if you want a different boundary.)
4. Query `articles` in that window, joined to `sources` for names/colors.
5. Group by category, then by source; build a compact JSON context (title, excerpt, source, url, published_at) per category.
6. One OpenRouter call (tool-calling forced to a fixed JSON schema), system prompt constrained to: *summarize only what is in the provided article list; if a category or source has zero articles, say so; never introduce outside facts*.
7. Upsert the `weekly_digests` row (unique on `week_start`).
8. On any failure, write `status: 'failed'` + `error_message`, and the UI keeps showing the last successful digest instead of breaking.

## 7. Non-functional requirements

- **Groundedness**: every summary sentence must trace back to an article actually crawled that week; the digest page links to each underlying article so a reader can verify. No invented figures, quotes, or claims.
- **Cost**: at current 3-source volume, expect well under 100 articles/week → a single LLM call per week (~4–5 calls/month). Cap input size defensively (e.g. same 80-article cap style already used in `getFeedData()`).
- **Reliability**: a digest failure must never break `/api/crawl`, the homepage, or existing pages — isolated route, isolated table, graceful "not generated yet" / "generation failed" states.
- **Security**: `OPENROUTER_API_KEY` and `CRON_SECRET` stay server-only, same discipline as the existing service-role key; RLS enabled on the new table.
- **Idempotency**: regenerating a week overwrites via upsert on `week_start`, never creates duplicates.

## 8. Rollout milestones

Branch names follow the existing `feature/*` convention:

1. `feature/digest-schema` — migration (`weekly_digests` table) + `lib/types.ts` additions.
2. `feature/digest-pipeline` — `lib/digest.ts` (window + grouping + Claude call) + `/api/digest/generate` route + Vercel Cron entry.
3. `feature/digest-ui` — `/digest` list page, `/digest/[slug]` detail page, feed teaser card.
4. `feature/digest-polish` — empty/error/loading states, SEO (sitemap entry + `opengraph-image.tsx`, matching the pattern already used for `/articles/[slug]` and `/topics/[slug]`), responsive pass per `DESIGN.md`.

## 9. Open smaller decisions (defaults proposed, confirm before or during build)

- **Week boundary**: default to ISO week Mon 00:00 UTC – Sun 23:59 UTC (matches the crawler's existing UTC-based cutoff logic). Say if you want a different boundary (e.g. local timezone, or Sun–Sat).
- **Teaser placement**: default to a card near the top of the feed column (keeps discovery visible without touching the currently-quiet right rail, which is reserved for Reader Quotes per `DESIGN.md`). Alternative: a new top-nav link "Digest".
- **Backfill**: whether to generate digests retroactively for prior weeks once this ships, or start counting from the first live cron run.
