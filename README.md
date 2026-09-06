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
- `/feed`, `/articles/*`, and `/topics/*` require a valid Supabase Auth session.
- Feed and quote API routes also return `401` without a valid session.

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

## Weekly AI Digest

`/api/digest/generate` summarizes everything crawled in the most recently completed ISO week (Mon-Sun, UTC) into one `weekly_digests` row, grouped by category. It is grounded strictly in that week's crawled articles — see [`docs/weekly-ai-digest-plan.md`](./docs/weekly-ai-digest-plan.md) for the full feature scope.

Set `ANTHROPIC_API_KEY` alongside `CRON_SECRET`. The route uses the same bearer-token contract as `/api/crawl`:

```bash
curl -X POST "https://your-deployment/api/digest/generate" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Add a weekly call to the same external scheduler used for `/api/crawl` (e.g. Monday mornings, after that week's articles have been crawled). To (re)generate a specific past week instead of the most recently completed one, pass `?week_start=YYYY-MM-DD` (any date in that ISO week); regenerating a week is idempotent — it upserts on `week_start` rather than duplicating.
