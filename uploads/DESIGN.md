# AI War - Current Design System
> Quiet editorial intelligence feed for frontier AI lab updates. The interface keeps the article column centered, moves filtering and discovery to low-noise side rails, and uses one warm orange accent to signal live status and interaction.

**Theme:** warm light editorial

AI War is a content-first Next.js application for tracking OpenAI, Anthropic, Google DeepMind, and related frontier AI updates. The current UI is not a marketing landing page. It opens directly into the working feed: fixed filters on the left, a centered article stream, and reader quotes on the right. On smaller screens, the sidebars collapse into a filter drawer and stacked discovery section.

## Colors

| Token | Value | Role |
|---|---:|---|
| `--ember` | `#FF6719` | Primary accent for live status, hover article titles, active filter marker, active text, quote submit button, and alert/error text. |
| `--ember-hover` | `#E85A12` | Hover state for orange buttons. |
| `--ember-soft` | `#FFF1E8` | Active filter pill background and soft orange emphasis. |
| `--ink` | `#2A2B2B` | Primary text, selected states, primary dark buttons, and major headings. |
| `--ink-2` | `#363737` | Secondary strong text and article summary text. |
| `--mute` | `#777777` | Metadata, placeholders, inactive controls, timestamps, and supporting copy. |
| `--mute-2` | `#999999` | Low-priority counts, disabled labels, and faint metadata. |
| `--rule` | `#EAE7E0` | Main divider and border color, intentionally warmer than neutral gray. |
| `--rule-2` | `#F1EEE7` | Softer dividers and image placeholder backgrounds. |
| `--paper` | `#FBFAF6` | Page background and mobile drawer background. |
| `--paper-2` | `#F4F1E8` | Segmented controls, category chips, and media placeholders. |
| `--white` | `#FFFFFF` | Inputs, small floating controls, quote form surface, and active segmented buttons. |
| `--overlay` | `#1E1F1F` | Dark translucent mobile drawer overlay base. |
| `--src-openai` | `#10A37F` | Source identity color for OpenAI. |
| `--src-anthropic` | `#D97757` | Source identity color for Anthropic. |
| `--src-deepmind` | `#4285F4` | Source identity color for Google DeepMind. |

## Typography

### Sans
- **Token:** `--font-sans`
- **Stack:** `"Sora", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`
- **Use:** Brand-adjacent labels, article titles, detail page headings, section headers, controls, and compact UI emphasis.
- **Weights:** 600, 700
- **Typical sizes:** 10px, 13px, 17px, 18px, 20px, 28px, 34px, 36px, 46px

### Body
- **Token:** `--font-body`
- **Stack:** `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Use:** Default page text, filters, metadata, forms, and general UI.
- **Weights:** 400, 500, 600, 700
- **Typical sizes:** 10px, 11px, 12px, 13px, 14px, 15px, 16px, 17px

### Serif
- **Token:** `--font-serif`
- **Stack:** `"Spectral", Georgia, "Times New Roman", serif`
- **Use:** Editorial excerpts, story dek text, quote body, and the brand strapline.
- **Weights:** 400
- **Typical sizes:** 13px, 14px, 15px, 16px, 18px, 21px

### Mono
- **Token:** `--font-mono`
- **Stack:** `"JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace`
- **Use:** Operational metadata such as crawl timestamps and compact technical status.
- **Typical sizes:** 10px, 11px

### Type Scale

| Role | Size | Line Height | Font |
|---|---:|---:|---|
| micro-label | 10px | 1.2 | Sans or body, uppercase with positive tracking |
| metadata | 11-13px | 1.35-1.5 | Body |
| body | 15px | 1.5 | Body |
| article excerpt | 14-18px | 1.5-1.55 | Serif |
| row title | 20px | 1.22 | Sans |
| card title | 17px | 1.22 | Sans |
| featured title | 36px | 1.1 | Sans |
| detail title | 46px desktop, 34px mobile | 1.08 | Sans |

## Spacing And Layout

**Base unit:** 4px

**Primary layout tokens**

| Token | Value | Role |
|---|---:|---|
| `--feed-w` | `720px` | Maximum width of the centered feed column. |
| `--feed-half` | `360px` | Half feed width for sidebar positioning calculations. |
| `--gap` | `64px` | Intended breathing room between feed and side rails. |
| `--left-w` | `200px` | Fixed desktop filter rail width. |
| `--right-w` | `280px` | Fixed desktop discovery rail width. |

The `.feed-col` is always centered in the viewport with `max-width: 720px` and does not shift when sidebars appear or disappear. The left and right sidebars are `position: fixed`, pinned to viewport edges, and visually quiet: no card shell, no shadow, no panel background. Both sidebars scroll independently.

### Breakpoints

| Width | Behavior |
|---:|---|
| `> 1280px` | Left filters, centered feed, and right reader quotes are all visible. |
| `<= 1280px` | Right sidebar is hidden; reader quotes move below the feed in `.mobile-aside`. |
| `<= 1020px` | Left sidebar is hidden; filters open from the mobile drawer. |
| `<= 760px` | Feed padding tightens, grid becomes one column, article thumbnails stack above text, and large titles reduce size. |
| `<= 720px` | Detail page title and page padding reduce. |

## Radius

| Token | Value | Role |
|---|---:|---|
| `--r-card` | `12px` | Featured media, story media, empty states. |
| `--r-input` | `10px` | Search input, newsletter input/button style, compact form controls. |
| `--r-pill` | `9999px` | Filter pills, date presets, buttons, source/category chips, segmented controls. |

Additional local radii:
- `10px` for article thumbnails and quote forms.
- `8px` for quote inputs and success/error surfaces.
- `4px` for small source logo marks and checkbox squares.
- `50%` for live dots, icon buttons, and avatars.

## Core Components

### Centered Feed Shell
**Classes:** `.shell`, `.feed-col`, `.left-side`, `.right-side`

The shell uses a centered reading column with fixed side rails. Sidebars are not containers around the feed; they are utility rails. This keeps the main article stream stable and readable.

### Brand Row
**Classes:** `.brand-row`, `.brand`, `.brand-logo`, `.brand-tag`, `.brand-strap`

The top of the feed shows the AI War mark, a small orange `Live` indicator with a pulsing dot, and an italic serif strapline: "One feed for every frontier lab." The visible H1 is screen-reader only to avoid turning the app into a hero page.

### Left Filters
**Classes:** `.side-search`, `.filter-row`, `.source-toggle`, `.date-presets`, `.date-preset`

Filters are compact and text-forward:
- Search field with a lucide `Search` icon.
- Category rows with counts and a left orange marker for the active category.
- Source checkboxes with source logos and custom square check controls.
- Date presets as compact pills: `24h`, `7d`, `30d`, `All`.

Filtering is performed client-side against loaded articles. The API is only used for loading more articles.

### Feed Metadata And Tools
**Classes:** `.feed-meta-row`, `.feed-meta`, `.feed-tools`, `.sort-status`, `.view-toggle`

The metadata row reports visible article count, loaded total, selected category, and latest update time. Sorting is currently displayed as "Newest first". The view toggle switches between list and grid using lucide `Rows3` and `LayoutGrid` icons.

### Active Filter Pills
**Class:** `.fp`

Active filters appear as orange-soft pills with a compact remove button. They are used for category, hidden sources, search, and date range state.

### Featured Article
**Classes:** `.featured`, `.featured-img`, `.featured-badge`, `.featured-title`, `.featured-excerpt`, `.read-link`

In list view, the first filtered article becomes the featured item. It uses a large media slot when available, a small "Latest" badge, a 36px sans title, serif excerpt, and orange source link.

### Article Row
**Classes:** `.article-row`, `.article-body`, `.article-title`, `.article-excerpt`, `.article-thumb`, `.article-foot`

List items are divided by warm rules. Desktop rows use a two-column layout with a 160px thumbnail on the right when available. Mobile rows stack the thumbnail above the text.

### Article Grid Card
**Classes:** `.feed-grid`, `.article-card`, `.article-card-img`, `.article-card-title`, `.article-card-excerpt`

Grid view uses two columns on desktop and one column below 760px. Cards do not have boxed backgrounds or shadows; image, type, spacing, and hover color provide structure.

### Week Groups
**Classes:** `.week-section`, `.week-toggle`

Articles are bucketed by week. Each group has a compact uppercase label, divider line, count, and chevron. Groups can collapse without changing the visual language of the feed.

### Reader Quotes
**Classes:** `.quote-wall`, `.r-head`, `.r-add`, `.quote-form`, `.quote-list`, `.quote-item`, `.quote-avatar`

The right rail currently hosts Reader Quotes. Users can submit a quote with a Facebook, X, or Instagram profile URL. Existing quotes display platform avatars when available, quote text in italic serif, handle, and relative time.

### Mobile Drawer
**Classes:** `.mobile-bar`, `.mobile-filter-btn`, `.mobile-drawer`, `.drawer-content`, `.drawer-close`

Below 1020px, filters move into a top drawer. The drawer uses a dark translucent overlay with blur, a warm paper surface, and the same filter controls reused from desktop.

### Detail Pages
**Classes:** `.detail-shell`, `.detail-nav`, `.story-page`, `.story-header`, `.story-dek`, `.story-actions`, `.story-media`, `.story-section`, `.related-list`, `.timeline-list`

Article and topic detail pages use a single centered column up to 820px. They rely on large sans titles, serif dek text, warm dividers, pill topic chips, timeline rows, and related article rows. Primary external reading actions use a dark ink button, not orange.

## Interaction Rules

- Article titles turn orange on hover.
- Image thumbnails lift slightly on hover with a small translate, not a shadow.
- Primary orange buttons darken to `--ember-hover`.
- Selected segmented buttons use white surfaces over `--paper-2`.
- Disabled buttons use `--rule` background and `--mute-2` text.
- The feed does not recenter or jump when filters change height; scrollbar space is reserved globally.

## Imagery And Icons

The app uses real source logos and article thumbnails when available:
- AI War brand assets live under `/public/assets`.
- Source badges use `source.logo_path`, with `/assets/aiwar-logo-mark.png` as fallback.
- Reader quote avatars use Facebook, X, and Instagram logo assets.
- Article thumbnails are optional. Rows and cards have explicit no-thumbnail states.

Icons come from `lucide-react` for UI controls: search, filters, check, view toggle, external link, add, close, chevron, and empty state search.

## Do

- Keep the feed column centered and stable.
- Keep sidebars visually quiet and utility-focused.
- Use `--ember` sparingly for active, live, error, and hover emphasis.
- Use warm paper and rule colors instead of pure gray page chrome.
- Use serif text for excerpts, quote bodies, and editorial dek copy.
- Prefer dividers, whitespace, and type hierarchy over card shells.
- Preserve mobile parity by reusing desktop filter controls inside the drawer.

## Don't

- Do not reintroduce a marketing hero as the first screen.
- Do not wrap the feed or sidebars in decorative cards.
- Do not use Cahuenga or other unused custom heading fonts in current UI docs.
- Do not describe login/signup modules as active UI; they are not part of the current implemented feed.
- Do not make the palette one-note orange; orange is an accent, while warm paper, ink, source colors, and white surfaces carry the interface.
- Do not add heavy shadows to article cards or sidebars.
- Do not make article cards depend on images; no-thumbnail states are first-class.

## Current Screens And Data Surfaces

- **Home feed:** SSR data from `getFeedData()`, rendered by `FeedClient`.
- **Load more:** `/api/articles` paginates article rows by `published_at`.
- **Reader quotes:** `/api/quotes` fetches and creates quote entries.
- **Subscribe endpoint:** `/api/subscribe` exists for email upsert, but the current visible `FeedClient` surface is focused on reader quotes.
- **Crawler:** `/api/crawl` is protected by bearer token and updates Supabase article/source/crawl data.
- **Article detail:** `/articles/[slug]` renders source metadata, summary, key points, topics, and related updates.
- **Topic detail:** `/topics/[slug]` renders topic summary, key points, timeline, related articles, and related topics.
