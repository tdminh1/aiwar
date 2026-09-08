# AI War

A curated AI lab intelligence feed built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:20128` when running with:

```bash
npm run dev -- -p 20128
```

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.
4. Seed initial MVP data:

```bash
npm run seed:supabase
```

5. Crawl configured sources from the last two months:

```bash
npm run crawl:sources
```

Secrets are only read on the server. The client does not receive the Supabase service role key.

## Authentication

- `/` is the public landing page.
- `/login` handles email/password sign-in, account creation, confirmation resend, and password recovery.
- `/reset-password` lets a verified recovery session choose a new password.
- `/feed`, `/articles/*`, `/topics/*`, and `/digest*` require a valid Supabase Auth session.
- Client-fetched API routes (`/api/articles`, `/api/digests*`) also return `401` without a valid session.

For email confirmation, add these Supabase Auth redirect URLs:

```text
http://localhost:3003/auth/callback
http://localhost:3003/auth/recovery
http://localhost:20128/auth/callback
http://localhost:20128/auth/recovery
https://www.aiwar.site/auth/callback
https://www.aiwar.site/auth/recovery
https://aiwar-six.vercel.app/auth/callback
https://aiwar-six.vercel.app/auth/recovery
```

## Scheduled Crawling

The app exposes a protected `/api/crawl` endpoint for scheduled crawlers.

Set `CRON_SECRET` in both `.env.local` and Vercel Production environment variables. The API route rejects requests without `Authorization: Bearer <CRON_SECRET>`.

The production project currently uses an external scheduler that calls `/api/crawl` approximately every two hours with the bearer token. Keep the scheduler and Vercel `CRON_SECRET` values identical.

Run the crawler manually with:

```bash
npm run crawl:sources
```

## AI Voices on X

The right rail's quote wall shows recent tweets crawled from a configured list of X (Twitter) handles — [`lib/x-quotes-config.ts`](./lib/x-quotes-config.ts), edit that list any time, no other code changes needed. It replaces the earlier reader-submitted quote wall (`reader_quotes` data is kept, just no longer read or written by the app).

Set `X_BEARER_TOKEN` (an X API v2 app-only bearer token) alongside `CRON_SECRET`. `GET /api/crawl-x-quotes` uses the same bearer-token contract as `/api/crawl`:

```bash
curl -X GET "https://your-deployment/api/crawl-x-quotes" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Each run resolves the configured handles to X user IDs in one call, then fetches each handle's latest original tweets (retweets and replies excluded) and upserts them into `x_quotes` by `tweet_id` — safe to re-run, never duplicates. One handle failing (suspended, renamed, rate-limited) does not block the others.

`vercel.json` registers a daily Vercel Cron Job for this route (`0 7 * * *`, 07:00 UTC) — chosen to stay well within paid X API plans' rate limits. Adjust the schedule (`vercel crons add --path /api/crawl-x-quotes --schedule "..."`, or edit `vercel.json` and redeploy) if your plan allows more or needs less.

### Adding a tweet manually

`POST /api/crawl-x-quotes` (same bearer token) adds or refreshes one tweet by URL through X's free, unauthenticated oEmbed endpoint — no `X_BEARER_TOKEN` or API credits required, so it works even while the crawl above is rate-limited or out of credits. It also doubles as a way to pin a specific tweet the configured handle list wouldn't otherwise surface.

```bash
curl -X POST "https://your-deployment/api/crawl-x-quotes" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://x.com/handle/status/1234567890"}'
```

Or locally, without needing the deployment or `CRON_SECRET` at all:

```bash
npm run add:x-quote -- https://x.com/handle/status/1234567890
```

### Adding a tweet from the UI (admin-only)

The quote wall itself also has an add form — a "+" button next to "AI Voices on X" — but it only renders, and `POST /api/x-quotes/manual` only accepts requests, for a signed-in user whose email is in `ADMIN_EMAILS` (comma-separated, see [`lib/admin.ts`](./lib/admin.ts)). Everyone else signed in can view the quote wall but not post to it. This is a separate, session-based check from the `CRON_SECRET` bearer-token routes above, which stay open to anyone holding that secret (operator/automation use, not tied to a specific account).

## Weekly AI Digest

`/api/digest/generate` summarizes everything crawled in the most recently completed ISO week (Mon-Sun, UTC) into one `weekly_digests` row, grouped by category. It is grounded strictly in that week's crawled articles — see [`docs/weekly-ai-digest-plan.md`](./docs/weekly-ai-digest-plan.md) for the full feature scope.

Set `OPENROUTER_API_KEY` alongside `CRON_SECRET`. Summaries are generated through [OpenRouter](https://openrouter.ai/docs)'s OpenAI-compatible API rather than a provider SDK directly, so any tool-calling-capable model slug from OpenRouter's catalog works — set `OPENROUTER_MODEL` to override the default (`anthropic/claude-sonnet-5`). The route uses the same bearer-token contract as `/api/crawl`:

```bash
curl -X POST "https://your-deployment/api/digest/generate" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Unlike `/api/crawl` (which needs every-two-hours frequency, beyond what Vercel's Hobby-plan Cron allows, hence the external scheduler above), a weekly cadence fits Vercel's native Cron Jobs directly. `vercel.json` registers one:

```json
{
  "crons": [{ "path": "/api/digest/generate", "schedule": "0 6 * * 1" }]
}
```

This fires every Monday at 06:00 UTC — after `/api/crawl`'s external scheduler has had time to pick up that week's last articles. Vercel automatically sends `Authorization: Bearer $CRON_SECRET` for registered cron jobs, so no extra wiring is needed beyond the `CRON_SECRET` env var already set for `/api/crawl`. Manage it with `vercel crons ls` / `vercel crons add` / `vercel crons run <path>` (`vercel crons` is currently in beta), or edit `vercel.json` directly and redeploy.

To (re)generate a specific past week instead of the most recently completed one, pass `?week_start=YYYY-MM-DD` (any date in that ISO week); regenerating a week is idempotent — it upserts on `week_start` rather than duplicating.
