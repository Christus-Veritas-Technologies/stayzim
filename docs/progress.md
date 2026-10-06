# Progress

_What's built, what's next, and what's blocking. Update this file whenever a piece of work lands. For what StayZim is and why, see [project.md](project.md)._

**Last updated:** 6 October 2026

## At a glance

| Area | Status |
| --- | --- |
| Marketing landing page | ✅ Built |
| Landing page analytics (CTA clicks, page views) | ✅ Built |
| Privacy and Terms pages | ✅ Drafted in plain language; need a review before launch |
| WhatsApp outreach tool (internal) | ✅ Built |
| Owner sign-in (login, reset, first-login password) | ✅ Built, matches the app screens design |
| Sign in with Google | ✅ Built (links to existing owners only), needs a Google OAuth client to test for real |
| Email (SMTP via Nodemailer) | ✅ Built, needs SMTP credentials |
| Owner dashboard (overview, lodge info, rooms, gallery, design, requests) | ✅ Built |
| Photo storage (Cloudflare R2) | ✅ Built, needs R2 credentials |
| Shared UI components (packages/ui) | ✅ Built |
| Lodge sites ({slug}.stayzim.co.zw) | ✅ Rendering, subdomain routing, tracking, suspended and 404 pages, template preview route |
| Site templates (9, 3 per plan) | 🟡 Catalog, plan rules, Design screen and preview done. Only Classic has a real design; 8 placeholders wait for the design files |
| Change requests | ✅ Owner screen, team screen (`/admin/requests`), API and script |
| Owner analytics | 🟡 Live numbers, chart, countries, latest visits and activity. The visits table still needs filters, pages and a 90-day period |
| Billing screen | ✅ Built, payment details are placeholders |
| Shared states (suspended, 404, errors, locked features, offline) | ✅ Built |
| UX pass (back, loading, pending, disabled, unsaved changes, offline) | ✅ Built |
| Mobile app (apps/native) | ⬜ Scaffold only. Out of scope for now: work on web and server only |
| Docker images (server, web, outreach) | ✅ Written, not yet built in Docker |
| Deployment | ⬜ Not started |

## MVP checklist

Story IDs refer to the designer brief.

### Landing page (stayzim.co.zw)

- [x] L1 Headline visible without scrolling at 360px
- [x] L2 Plans and prices, Growth marked most popular
- [x] L3 Three demo lodge cards linking to their sites
- [x] L4 WhatsApp button always in reach (floating button), pre-filled messages per button
- [x] L5 14-day trial and "built before you pay" stated
- [x] L6 Page views record UTM source (`landing_event` table)
- [x] Privacy and Terms pages (`/privacy`, `/terms`), linked from the footer and every lodge site. Drafts: review before launch
- [ ] Demo lodge sites live at mistvalley., msasaridge. and lakeview.stayzim.co.zw
- [ ] Sales WhatsApp number set (`NEXT_PUBLIC_WHATSAPP_NUMBER`)

### Login (Screen 3)

- [x] A1 Email and password sign-in; wrong details say "Email or password is wrong" without saying which
- [x] A2 Sessions last 30 days on the same device
- [x] A3 Temporary password forces a new 8+ character password before the dashboard opens
- [x] A4 Reset link by email, valid 1 hour, same message whether or not the email exists
- [x] A5 Log out
- [x] A6 5 failed sign-ins in 10 minutes pauses sign-in for 10 minutes
- [x] Accounts created by StayZim only (`create-owner` script); public sign-up disabled
- [x] Owners already logged in skip the login screen; team accounts land on `/admin/requests`
- [ ] Real SMTP credentials (Spacemail) configured and tested

### Dashboard (Screen 4)

- [x] D1 Lodge name, plan, status and View my site
- [x] D2 Trial days left banner
- [x] D3 Edit lodge info, WhatsApp number validated ("Remove the 0 at the start")
- [x] D4 Location from a Google Maps link (short links followed, Google only) or coordinates
- [x] D5 Theme colour and logo
- [x] D6–D7 Add, edit, reorder (drag or menu) and delete rooms
- [x] D8–D9 Upload, reorder and delete gallery photos, resized on the phone; pick the hero
- [x] D10 Copy link and share on WhatsApp (ticks off the setup checklist)
- [x] Setup checklist: rooms, 5 gallery photos, WhatsApp number, link shared
- [x] Responsive: sidebar on desktop (collapsible), header and bottom bar on phones
- [x] Design: hero text, template gallery by plan, preview (Phone and Desktop), apply with Undo, downgrade notice
- [x] Change requests: send, WhatsApp hand-off, status and replies

### Lodge site (Screen 2)

- [x] S1–S7 Hero, rooms with a pre-filled Book on WhatsApp per room, gallery with lightbox, map embed, contact, sticky booking button on phones ("Classic" template)
- [x] S8 Visit tracking: page views and Book on WhatsApp taps (`site_event`), owner and staff visits skipped
- [ ] S9 Under 1.5 MB: not measured yet (server-rendered; photos are lazy and resized to 1600px)
- [x] Templates: 9 in the catalog, plan rules, preview route, Starter templates completely still
- [ ] Real designs for the 8 placeholder templates (waiting on the design files)

### Analytics (Screen 5) and Billing (Screen 6)

- [x] N1–N2 Totals, chart, countries and the latest 10 visits (`/api/lodge/stats`, `/visits`, `/activity`)
- [ ] Visits table: filters (Zimbabwe, outside Zimbabwe, device, booking chat), Previous/Next pages, a list on phones, a 90-day period
- [x] N3 Locked preview for Starter, with an upgrade button (and an upgrade card on the overview)
- [x] N4 Empty state with Copy link and Share on WhatsApp
- [x] N5 Owner visits excluded (server skips events from the owner's or an admin's session; works in production where cookies are shared on .stayzim.co.zw)
- [x] B1–B5 Plan, status pill and due date, how to pay, "I have paid" and plan-change WhatsApp buttons
- [x] B6 Overdue and suspended warnings
- [ ] Real Paynow link and EcoCash/InnBucks merchant codes (`apps/web/src/lib/billing.ts`)

### Shared states

- [x] X1 Suspended site page
- [x] X2 Unknown lodge 404 (and unknown paths on a lodge site), and a StayZim-branded 404 for the main site
- [x] X3–X5 Save errors, loading skeletons and spinners, locked features (dashboard)
- [x] Error screens with Try again (app, root layout, dashboard), offline banner

## Next up

Tiers 1–3 of the remaining work are done. What's left, roughly easiest first:

1. **Analytics visits table:** filters, Previous/Next pages ("Total N visits"), a list on phones, and a 90-day period (the API already supports all of it).
2. **Test with the real services** once the credentials arrive: R2 uploads, Google sign-in, reset emails over SMTP, and visit tracking behind Cloudflare (countries).
3. **Demo lodge sites** with real photos and content, the sales WhatsApp number and the payment details.
4. **Page weight (S9):** measure a lodge site against 1.5 MB.
5. **Tests:** unit tests for `@stayzim/sites` and the server routes, and a Playwright smoke test (login → dashboard → lodge site).
6. **Real devices:** iOS Safari and Android Chrome.
7. **Real template designs,** when the user adds the design files to `designs/`.
8. **Deployment on Coolify,** migrations instead of `db push`, backups and monitoring. Notes below.

## Handoff (6 October 2026, evening)

Written at the end of a session so the next agent can continue. Everything listed as done is committed and pushed on `main`, and type-checks (`tsc` in apps/web, `pnpm --filter server check-types`).

The user's rules:

- Work on `main` (no separate branches), one commit per small task, and never add a Co-Authored-By line, even when a tool suggests one.
- Add subtle framer-motion animations wherever they fit, all off with "reduce motion".
- Web and server only; ignore apps/native.

### Local setup that differs from the examples

- **Sites domain:**
  - `apps/server/.env` has `SITES_DOMAIN=localhost:9999` and `apps/web/.env` has `NEXT_PUBLIC_SITES_DOMAIN=localhost:9999`.
  - Lodge sites open at `http://{slug}.localhost:9999` (Chrome resolves `*.localhost`).
- **Test owner:** `rudo@mistvalley.test`, with lodge `mistvalley`. Reset its password with `pnpm --filter @stayzim/auth create-owner --email rudo@mistvalley.test --reset`.
- **Team account:** make one with `create-owner … --admin` to use `/admin/requests`.
- **Photos** are on local disk (`apps/server/uploads`), because R2 isn't configured locally.
- **Agent files:** the root `AGENTS.md` (written by turbo) is committed. `next dev` also writes `apps/web/AGENTS.md` and `CLAUDE.md`; they're untracked, so leave them out of commits unless the user asks.

### Built this session

Each of these is its own commit on `main`; the architecture doc has the details.

- **Tier 1:**
  - `pnpm install` works without `DATABASE_URL`.
  - Starter templates are completely still.
  - Logged-in visitors skip `/login`.
  - Branded 404, and error screens with Try again.
  - Disabled controls explain themselves (`WhyDisabled`): "No changes to save" and the 30-photo gallery cap.
  - Rows and photos fade with a spinner while they delete or move, with "Saving order…".
- **Tier 2:**
  - A Kariba progress bar during page changes.
  - `useLinkStatus` spinners in the nav.
  - "‹ My site" back links on phones.
  - An offline banner, with Save disabled while offline.
  - Forms lock while they submit.
  - The template downgrade notice.
  - Privacy and Terms.
  - These docs.
- **Tier 3:**
  - The Design screen and the preview route.
  - Change requests for owners, plus a team screen and API (`/admin/requests`, `/api/admin/requests`).
  - Live visit stats on the overview and Analytics, with an upgrade card on Starter.
  - Visits in the activity card.
  - "Discard your changes?" on Lodge info, Design and the room sheet.

How it was checked: a local Postgres with seeded visits, both apps running, and Playwright screenshots of every new screen at 1280px and 375px (no horizontal overflow).

Known gaps and choices worth knowing:

- **Unsaved changes:** the guard catches links inside the app, reloads and closing the tab, but not the browser's own Back button.
- **Change requests:** after sending, the WhatsApp hand-off is a button on the success card, not opened automatically, because browsers block pop-ups after a network request.
- **Nav spinners** only show when the page wasn't prefetched yet (slow connections). In production, Next prefetches visible links.
- **Template thumbnails** are sketches drawn from `components/site/templates/looks.ts`. Update them when the real designs arrive (or switch to iframe snapshots).
- **Privacy and Terms** are plain-language drafts based on what the code collects. Review them (ideally with a lawyer) before launch.

### Spec: site templates

Agreed with the user:

- **9 templates, 3 per plan.**
  - The plan sets design quality and motion: Starter is static (`none`), Growth `subtle`, Pro `rich`.
  - Catalog: `packages/sites/src/index.ts`. Keys: `starter-clear|simple|compact`, `growth-classic|panorama|journal`, `pro-signature|safari|horizon`.
  - Only `growth-classic` has a real design so far (`apps/web/src/components/site/templates/classic.tsx`). The other 8 are plain placeholders from one configurable component (`templates/basic.tsx`, looks in `templates/looks.ts`).
  - The user will add real design files later. When they arrive, give each template its own file and remove its `PLACEHOLDER_LOOKS` entry.
- **Access is cumulative:** a plan can use its own templates and every lower plan's (`templateAllowed`).
  - Templates above the plan are shown locked, with an upgrade button (an upsell).
  - The server refuses them on PATCH (403, "Signature comes with the Pro plan").
- **Downgrades:**
  - The site shows the plan's default (`DEFAULT_TEMPLATE`) via `effectiveTemplate()`.
  - `LodgeJson.template` is the owner's pick; `siteTemplate` is what's live.
  - When the two differ, the Design screen must say "Your plan doesn't include X; your site shows Y".
- **Global data:**
  - Every template reads the same `PublicSite`: name, description, place, WhatsApp, phone, email, map, theme colour, logo, hero photo, rooms and gallery. What owners enter in Lodge info is used everywhere.
  - Templates must cope with missing pieces (no rooms, photos, WhatsApp or map).
- **Owner-editable text (MVP, not a CMS):**
  - Only the hero headline (60 characters) and subline (140): `Lodge.heroHeadline` and `heroSubline`.
  - Saved with PATCH `/api/lodge`; an empty string resets to the template default.
  - Stored once, not per template, so switching keeps them.
  - Each template has default copy with `{name}` and `{place}` (`heroText()`, `fillCopy()`).
- **Switching:** preview, then apply. It goes live straight away, and the "Template changed" toast needs an Undo action (PATCH back to the previous key).
- **Everything else** goes through change requests.

Built (web):

- **Preview route** `apps/web/src/app/preview/[slug]/[template]/page.tsx`: any template, including locked ones; `noindex`; tracking off; a slim "Preview: {name} template" bar. Hero text that is the live template's default switches to the previewed template's (`withTemplate()` in `lib/site.ts`).
- **Design screen** `apps/web/src/app/dashboard/design/page.tsx` (under My site): hero text with counters and a live phone preview; templates grouped by plan with thumbnails (`template-thumb.tsx`), a sliding "Live" ring, locked cards with "Upgrade to {plan}" on WhatsApp; a preview sheet (iframe, Phone and Desktop); "Use this template" (disabled with a reason when locked or live) applies straight away, with Undo in the toast.
- **Starter templates** have no motion at all (`basic.tsx`).

### Deployment notes to discuss with the user (Coolify on a VPS)

- **DNS:**
  - `stayzim.co.zw` and `app.` → web
  - `api.` → server
  - wildcard `*.stayzim.co.zw` → web (lodge sites)
  - `media.` → the R2 custom domain
- **TLS for the wildcard,** two options:
  - Cloudflare's proxy. Universal SSL covers `*.stayzim.co.zw`, and it also sends `CF-IPCountry`, which gives owners visitor countries.
  - Traefik in Coolify, with a DNS-01 challenge for a wildcard Let's Encrypt certificate.
- **Coolify:** add the wildcard to the web service's domains (`https://*.stayzim.co.zw`), or add a custom Traefik router rule with `HostRegexp`.
- **Env:**
  - Server: `CORS_ORIGIN=https://app.stayzim.co.zw,https://stayzim.co.zw`, `SITES_DOMAIN=stayzim.co.zw`, `COOKIE_DOMAIN=.stayzim.co.zw`, plus the `R2_*`, `GOOGLE_*` and SMTP settings.
  - Web build args: `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_SITES_DOMAIN` and `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- **New lodges:** setup stays a script (`create-owner`, then `create-lodge`). With a wildcard record, nothing per lodge is needed in DNS or Coolify.
- **Custom `.co.zw` domains** (later) will need per-domain routing and certificates.
- **Before launch:** switch from `db push` to migrations.

## Blocked on / needs a decision

- **SMTP credentials** for hello@stayzim.co.zw (Spacemail), to send real reset emails.
- **Cloudflare R2** bucket, API token and public domain for lodge photos.
- **Payment details:** the Paynow link and the EcoCash and InnBucks merchant codes for the Billing screen.
- **Google OAuth client** (ID and secret) to switch on and test Sign in with Google.
- **Template designs:** the user will add design files for the 9 templates to `designs/`.
- **Sales WhatsApp number** for the landing page.
- **First real demo lodge** (photos and content).
- **A review of the Privacy and Terms drafts** (`apps/web/src/app/privacy`, `apps/web/src/app/terms`).
- The open questions in [project.md](project.md#open-questions).

## Log

Newest first. One line per piece of work that landed on `main`.

### 6 October 2026 (evening)

- Template preview route and the Design screen (hero text, templates by plan, preview, apply with Undo, downgrade notice).
- Change requests screen for owners, and a team screen and API to answer them.
- Live visit stats: overview and Analytics numbers, chart, countries, latest visits, activity card; upgrade card on Starter.
- UX pass: progress bar, nav spinners, back links, offline banner, locked forms, explained disabled states, busy rows, unsaved-changes guard, branded 404 and error screens.
- Privacy and Terms pages; logged-in visitors skip the login screen; `pnpm install` works without a database.
- Docs: architecture, README, auth and project updated.

### 6 October 2026 (later)

- Sign in with Google (existing owners only).
- Lodge sites at `{slug}` subdomains: Classic template, gallery lightbox, map, contact, sticky booking, suspended and 404 pages.
- Visit and booking-tap tracking with owner visits excluded; stats, visits and activity API for owners.
- CORS accepts several web origins and lodge subdomains.
- Site template catalog (`packages/sites`, 9 templates), template and hero text in the schema and API, and a registry rendering all 9 (8 placeholders).
- Change requests: model, API and `resolve-request` script.
- Fixed: the analytics plan check no longer blocks Starter owners from rooms and photos.

### 6 October 2026

- **Shared UI (`packages/ui`):** StayZim tokens moved into the package (one palette for the landing page and the app). shadcn-style components on Base UI, restyled to the app design: Button (with loading), Input, InputGroup, PasswordInput, Textarea, Field, Badge, Avatar, Card, Tabs (sliding indicator), Toggle chips, Dialog, AlertDialog, Sheet, DropdownMenu, Tooltip, Progress and ProgressRing, Collapsible, NumberField, CopyButton, EmptyState, Skeleton, Spinner.
- **Auth screens to the design:** form on the left and the animated Kariba panel on the right (Kariba header on phones); check-your-email state; first login shows the owner's live site. First-login "Set your password" no longer asks for the temporary password.
- **Lodge data and API:** `Lodge`, `Room` and `Photo` models; `/api/lodge` (info, map link, logo, link shared), `/api/lodge/rooms` and `/api/lodge/photos`; `create-lodge` script.
- **Photos:** resized on the phone, uploaded one at a time with progress and Retry, stored in Cloudflare R2 (a local folder in development without R2).
- **Dashboard:** overview (setup checklist, stat cards, visits chart, Send your link, rooms, activity), Lodge info (details, location, look, live preview), Rooms (drag to reorder, side sheet), Gallery (hero, captions, reorder), Analytics (empty and locked states) and Billing. Subtle framer-motion animations throughout, off with the OS "reduce motion" setting.

### 5 October 2026

- **Docker:**
  - Rewrote the server and web Dockerfiles and added one for outreach (with Chromium).
  - All three install from the now-committed `pnpm-lock.yaml`. Server and outreach apply the schema on start.
  - Checked without Docker:
    - each image's frozen, filtered install;
    - the server's start path from an isolated install;
    - a production `next build`.
  - The images themselves haven't been built yet; there's no Docker on the dev machine.
- **Auth base:**
  - better-auth on the server with Prisma.
  - Login, forgot-password, reset-password and set-password pages.
  - Placeholder dashboard and a route guard.
  - `create-owner` script.
  - SMTP email package with branded reset and password-changed emails.
  - Login rate limit. See [auth.md](auth.md).
- **Landing page:**
  - Built from `designs/StayZim Landing Page.html` with subtle framer-motion animations, responsive from 360px.
  - Every button opens WhatsApp with a pre-written message.
- **Landing analytics:** `POST /api/landing/events` records page views and CTA clicks (button, section, plan, visitor, UTM), with validation and rate limiting.
- **Outreach tool:**
  - 3 WhatsApp numbers with sessions stored in Postgres (whatsapp-web.js RemoteAuth).
  - Contacts, campaigns, daily limits of 40 per number, reply tracking, opt-outs.
  - Admin pages and an API. See [apps/outreach/API.md](../apps/outreach/API.md).
- Server database moved from the shared `postgres` database to its own `stayzim` database.
