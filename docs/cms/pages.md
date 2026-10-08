# Pages per plan

_Built 8 October 2026. Contract: `packages/sites/src/content/pages.ts`. Web: `app/sites/[slug]/`, `components/site/page-shell.tsx`, `components/site/site-pages.tsx`, `components/site/room-filters.tsx`._

A lodge site's plan decides how many pages it has. The design the owner picks only changes how they look: a Pro lodge on a Starter design still gets every Pro page.

| Plan | Pages | Room features |
| --- | --- | --- |
| Starter | Home only | Filters on the home page's rooms: guests, top price, sort (price, most space). Shown at 2 rooms or more |
| Growth | Home, `/rooms`, `/rooms/{room}`, `/gallery`, `/contact` | `/rooms` adds amenity toggles; a page per room (photos, facts, what's in it, Book, other rooms) with room JSON-LD |
| Pro | Growth's, plus `/about` (Our story), `/experiences` (Things to do), `/reviews`, `/journal` | `/rooms` adds Check dates (hides rooms already full, from `/api/sites/:slug/availability`, where the site takes bookings) and a compare table |

## How it fits together

- **Contract:** `PLAN_PAGES` lists each plan's pages; the API sends them as `LiveSite.pages`. The zod schema defaults to `["home"]`, so an older API means a one-page site, never an error.
- **Routes:** each page has its own route under `app/sites/[slug]/` (they win over the `[...rest]` catch-all, which still 404s anything else). `lib/site-page-route.ts` loads the site and 404s a page outside the plan; `sitePageMetadata` sets the title, canonical address and noindex for demos. `src/proxy.ts` needed no change: every path on a lodge host is rewritten under `/sites/{slug}`.
- **Room addresses:** made from the room's name in order (`roomSlugs`: "Garden Room" is `/rooms/garden-room`, a second one `-2`). Nothing is stored, so renaming a room changes its address.
- **Links:** `lib/site-pages.ts`. `pageOr(site, "rooms", "#rooms")` goes to the page where there is one, else to the home page's section, so the nine templates' nav works on every plan. Links are absolute (the site's own domain when it has one), like the journal's.
- **Look:** `PageShell` gives every page the lodge's name, the pages along the top (a sideways row on phones), Book, the footer, the WhatsApp button, the phone booking bar and the demo marks. `pageLook(template)` holds each design's font, heading style, page and card colours and corners. The journal uses the same shell.
- **Filters** (`RoomFilters`): a client component around a list the server already drew. Each room item carries `data-room-id`; the filter hides and reorders them in place (CSS `order`), so it works with every design's own markup, and without JavaScript every room shows.
- **Home page:** templates show "See all rooms, with filters" under their rooms where there's a Rooms page (`AllRoomsLink`), and "Our story" in the nav on Pro.
- **Sitemap** (`app/sitemap.ts`): a paid site lists its plan's pages, each room's page and (Pro) the journal and posts. Demos stay out of search.

## Adding a page

1. Add its key to `SITE_PAGES` and to the plans in `PLAN_PAGES`.
2. Add the route under `app/sites/[slug]/{page}/page.tsx` using `sitePageData` and `sitePageMetadata`, and a component in `site-pages.tsx` inside `PageShell`.
3. Add it to `NAV` in `page-shell.tsx`, to the sitemap, and to `e2e/pages.e2e.ts`.
