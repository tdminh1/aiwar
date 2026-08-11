# AI War SEO Validation

Use this checklist after deploying article and topic pages.

## Content Quality

- Article pages include an AI War summary, key points, source attribution, and related updates.
- Topic pages include a summary, key points, timeline, related articles, and related topics.
- Canonical URLs point to AI War internal URLs when the goal is to index AI War.
- Original-source URLs are linked from the page and represented with `isBasedOn`/`sameAs`.

## Technical Checks

- `/sitemap.xml` includes `/`, `/articles/[slug]`, and `/topics/[slug]`.
- `/robots.txt` links to the sitemap and keeps `/api/` disallowed.
- Rendered HTML includes one visible `h1`, canonical metadata, Open Graph tags, and JSON-LD.
- Homepage and detail pages return cacheable ISR HTML.
- OG images render at 1200x630 for homepage, articles, and topics.

## Search Console

- Submit `/sitemap.xml`.
- Inspect one homepage URL, one article URL, and one topic URL.
- Track impressions and CTR for query families such as `openai gpt release`, `claude model release`, and `gemini update`.
- Improve topic summaries when impressions are present but CTR or average position is weak.
