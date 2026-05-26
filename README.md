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
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`.
4. Seed initial MVP data:

```bash
npm run seed:supabase
```

5. Crawl configured sources from the last two months:

```bash
npm run crawl:sources
```

Secrets are only read on the server. The client does not receive the Supabase service role key.
