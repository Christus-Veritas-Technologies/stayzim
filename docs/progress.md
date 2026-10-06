# Progress

_What's built, what's next, and what's blocking. Update this file whenever a piece of work lands. For what StayZim is and why, see [project.md](project.md)._

**Last updated:** 6 October 2026 (late night)

## At a glance

| Area | Status |
| --- | --- |
| Marketing landing page | ✅ Built |
| Landing page analytics (CTA clicks, page views) | ✅ Built |
| Privacy and Terms pages | ✅ Drafted in plain language; need a review before launch |
| WhatsApp outreach tool (internal) | ✅ Built |
| Self sign-up and the 2-day demo (`/signup`, `/start`) | ✅ Sign-up to a live demo site in about 5 minutes (6 s automated), demo badges, offline when it ends, deleted 30 days later |
| Owner sign-in (login, reset, first-login password) | ✅ Built, matches the app screens design |
| Sign in with Google | ✅ Built (signs in or signs up), needs a Google OAuth client to test for real |
| Email (SMTP via Nodemailer) | ✅ Built, needs SMTP credentials |
| Owner dashboard (overview, lodge info, rooms, gallery, design, requests) | ✅ Built |
| Photo storage (Cloudflare R2) | ✅ Built, needs R2 credentials |
| Shared UI components (packages/ui) | ✅ Built |
| Lodge sites ({slug}.stayzim.co.zw) | ✅ Rendering, subdomain routing, tracking, suspended and 404 pages, template preview route, robots and sitemap |
| Custom domains per lodge | ✅ Any plan once paid (free .co.zw on Growth and Pro): `set-domain`, routing, CORS, canonical URLs, the dashboard address card and a catch-all Traefik route |
| Site templates (9, 3 per plan) | 🟡 Catalog, plan rules, Design screen and preview done. Only Classic has a real design; the 8 placeholders stay untouched until the user's designer delivers |
| Change requests | ✅ Owner screen, team screen (`/admin/requests`), API and script |
| Owner analytics | ✅ Live numbers, chart, countries, activity, and the visits table (filters, pages, each visit's path, 90 days) |
| Booking calendar | ⏸ Skipped for now at the user's request (Growth and Pro when built) |
| Billing and payments | ✅ Paynow (phone prompt, InnBucks code, card), invoices and receipts (emailed and printable), `mark-paid`, hourly job for reminders, overdue and suspension. Tested against a Paynow stand-in; needs real Paynow credentials |
| Shared states (suspended, 404, errors, locked features, offline) | ✅ Built |
| UX pass (back, loading, pending, disabled, unsaved changes, offline) | ✅ Built |
| Mobile app (apps/native) | ⬜ Scaffold only. Out of scope for now: work on web and server only |
| Database migrations | ✅ Prisma migrations, applied on container start |
| Tests and CI | ✅ Unit tests (`pnpm test`), Playwright browser tests, GitHub Actions |
| Docker images (server, web) | ✅ Built and run with `deploy/compose.yaml` against Postgres and a test S3 server |
| Deployment | 🟡 Kit and guide ready (`deploy/`, [deployment.md](deployment.md)); needs the VPS, Coolify, Cloudflare and credentials |

## MVP checklist

Story IDs refer to the designer brief.

### Landing page (stayzim.co.zw)

- [x] L1 Headline visible without scrolling at 360px
- [x] L2 Plans and prices, Growth marked most popular
- [x] L3 Three demo lodge cards linking to their sites
- [x] L4 WhatsApp button always in reach (floating button), pre-filled messages per button
- [x] L5 Free 2-day demo, "live before you pay" stated (the 14-day trial is gone)
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
- [x] D2 Demo time left banner (was trial days left)
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
- [x] S9 Under 1.5 MB: about 1.36 MB on a phone with realistic photos (smaller copies, `srcset`, lazy carousels)
- [x] Templates: 9 in the catalog, plan rules, preview route, Starter templates completely still
- [ ] Real designs for the 8 placeholder templates (waiting on the user's designer; don't touch the placeholders until then)

### Analytics (Screen 5) and Billing (Screen 6)

- [x] N1–N2 Totals, chart, countries and the latest 10 visits (`/api/lodge/stats`, `/visits`, `/activity`)
- [x] Visits table: filters (Zimbabwe, outside Zimbabwe, device, page, booking chat), sorting, numbered pages, each visit's path, a list on phones, a 90-day period
- [x] N3 Locked preview for Starter, with an upgrade button (and an upgrade card on the overview)
- [x] N4 Empty state with Copy link and Share on WhatsApp
- [x] N5 Owner visits excluded (server skips events from the owner's or an admin's session; works in production where cookies are shared on .stayzim.co.zw)
- [x] B1–B5 Plan, status pill and due date, how to pay, "I have paid" and plan-change WhatsApp buttons
- [x] B6 Overdue and suspended warnings
- [ ] Real Paynow credentials and EcoCash/InnBucks merchant codes (`PAYNOW_*`, `ECOCASH_MERCHANT_CODE`, `INNBUCKS_MERCHANT_CODE`; the code is ready)

### Shared states

- [x] X1 Suspended site page
- [x] X2 Unknown lodge 404 (and unknown paths on a lodge site), and a StayZim-branded 404 for the main site
- [x] X3–X5 Save errors, loading skeletons and spinners, locked features (dashboard)
- [x] Error screens with Try again (app, root layout, dashboard), offline banner

## Next up

Everything that could be done without the user is done. What's left needs them (see [Blocked on](#blocked-on--needs-a-decision)):

1. **Credentials,** then test with the real services:
   - Paynow (test mode first);
   - R2 uploads;
   - Google sign-in;
   - emails over SMTP (welcome, invoices, receipts, resets);
   - visits behind Cloudflare (countries).
2. **Deploy** with [deployment.md](deployment.md): VPS, Coolify, Cloudflare DNS and the origin certificate.
3. **Business details on invoices:** set `BUSINESS_NAME`, `BUSINESS_ADDRESS` and `BUSINESS_TAX_NUMBER` on the server.
4. **Demo lodges:** run `seed-demos` with the sales number, then add real photos as each demo owner.
5. **Real template designs** for the 8 placeholders, when the designer delivers. Leave `basic.tsx` and `looks.ts` alone until then.
6. **Booking calendar** (skipped for now; Growth and Pro).
7. **Real devices:** iOS Safari and Android Chrome.

## Handoff (6 October 2026, late night)

Written at the end of a session so the next agent can continue. Everything is committed and pushed on `main`. `pnpm check-types` and `pnpm test` pass, and CI runs both, plus browser tests against Postgres.

The user's rules:

- Work on `main` (no separate branches), one commit per small task, and never add a Co-Authored-By line, even when a tool suggests one.
- Add subtle framer-motion animations wherever they fit, all off with "reduce motion".
- Web and server only; ignore apps/native.
- **Don't touch the 8 placeholder templates** (`templates/basic.tsx`, `looks.ts`) until the user's designer delivers.
- **The booking calendar is skipped** for now.
- **There is no trial.** Owners sign up for a free 2-day demo on the plan they pick (`/signup`, `/start`), and pay through Paynow.

### Local setup that differs from the examples

- **Sites domain:**
  - `apps/server/.env` has `SITES_DOMAIN=localhost:9999` and `apps/web/.env` has `NEXT_PUBLIC_SITES_DOMAIN=localhost:9999`.
  - Lodge sites open at `http://{slug}.localhost:9999` (Chrome resolves `*.localhost`).
- **Logins:**
  - Test owner `rudo@mistvalley.test` (lodge `mistvalley`, with the test custom domain `mistvalleylodge.test`).
  - Demo owners `msasaridge@demo.stayzim.co.zw` and `lakeview@demo.stayzim.co.zw` (made by `seed-demos`).
  - Reset any of them with `create-owner --email … --reset`. Team account: `create-owner … --admin`.
- **Sign-in limits** are in the `rate_limit` table and survive restarts. Clear them locally with `DELETE FROM rate_limit;` if tests keep signing in.
- **Photos** are on local disk (`apps/server/uploads`), because R2 isn't configured locally.
- **Agent files:** the root `AGENTS.md` (written by turbo) is committed. `next dev` also writes `apps/web/AGENTS.md` and `CLAUDE.md`; they're untracked, so leave them out of commits unless the user asks.

### Built this session (sign-up, demos and billing)

The user's answers:

- There are 3 plans and no free plan. Custom domains are on all 3, once paid; Growth and Pro get a free .co.zw, which StayZim registers by hand.
- Use Cloudflare for SaaS while it's free, else Coolify.
- The booking calendar will be Growth and Pro.
- The 14-day trial was a mistake. It's replaced by a free 2-day self-serve demo: the plan is chosen at sign-up; the site goes offline when the demo ends; it's deleted 30 days later.
- Payments: Paynow (phone prompt and checkout page), `mark-paid`, invoices 3 days and 1 day before and on the day, receipts. Overdue and suspension are automatic.

What was built:

- **Shared rules** in `@stayzim/sites`: plans and prices, slugs, and billing dates in Harare time.
- **`DEMO` status** (the migration renames `TRIAL`): `demoEndsAt`, a dashboard countdown, `create-lodge --paid-months/--sample-rooms`.
- **Self sign-up:**
  - better-auth sign-up is on (email and Google), with a rate limit.
  - `/signup` and the `/start` wizard.
  - `/api/onboarding` (slug suggestions, lodge creation), the welcome email.
  - The landing page CTAs go to sign-up.
- **Demo sites:** badges around any template; "demo ended" page; noindex; own domains not served.
- **Billing:**
  - `billing.prisma` (Invoice, Payment, BillingNotice, BillingCounter).
  - `lib/paynow.ts`: the protocol client, the hash tested.
  - `lib/billing.ts`: `applyPayment`, which is idempotent, plus receipts.
  - Routes `/api/lodge/billing/*` and `/api/paynow/result`.
  - The Billing screen (pay card with live status, invoices and receipts, plans you can pay for) and printable documents.
  - `mark-paid` and `run-billing` scripts, and the hourly job (`jobs/billing.ts`).
- **Domains:** `set-domain` refuses demos and says if the .co.zw is free; plan-aware address card; Traefik catch-all; Cloudflare for SaaS steps.
- **Terms and Privacy** updated for the demo, payments and deletion.
- **Tests:**
  - Unit tests: plans, slugs, dates, Paynow hash, email templates.
  - A Playwright sign-up test, and `/signup` at 360px.
  - Verified by hand against a local Paynow stand-in: phone prompt, InnBucks code, card redirect, declined payment, forged callback. The job was run against seeded lodges, with emails received by a local SMTP server.

Known gaps:

- **Paynow** is only tested against a stand-in written from the official SDK's code; the first real test-mode payment is the real check.
- **Cloudflare for SaaS origin certificate:** see deployment.md; on the first custom domain, check for a 526.
- **Changing plan mid-period** takes effect when the payment goes through, and the new period is added at the new price; there's no proration.
- **The dev API's hot reload** can leave Prisma in a bad state ("not valid UTF-8" errors). Restart it; production doesn't hot-reload.

### Built in the session before (tiers 4 and 5)

Each of these is its own commit on `main`; the architecture doc, the README and deployment.md have the details.

- **Page weight:**
  - Photos get 1280px and 640px copies, made on the phone, and lodge sites use `srcset` and `sizes`.
  - Carousels load photos lazily, and zod is out of the browser bundle.
  - A lodge site's first load on a phone is about 1.36 MB.
- **Migrations:**
  - The baseline is `0_init`; containers run `migrate deploy`; there's a baselining guide.
  - Later migrations: `auth_rate_limit`, `lodge_custom_domain`.
- **Production hardening:**
  - Sign-in rate limits are kept in Postgres.
  - `CLIENT_IP_HEADER` (`cf-connecting-ip` behind Cloudflare).
  - `/health` checks the database.
  - Security headers, and `poweredByHeader` off.
  - Host-aware robots and sitemap.
  - `docker/backup.sh`.
- **Demo lodges:** `seed-demos` creates the landing page's three lodges with demo owner logins.
- **Tests and CI:**
  - `bun test` in sites, mail, server and web.
  - Playwright tests in `apps/web/e2e`: smoke tests, plus every screen at 360px.
  - `.github/workflows/ci.yml`.
  - `pnpm check-types` now covers the web app too.
- **Mobile:**
  - Tap targets of at least 32px.
  - `viewport-fit=cover` with safe-area padding.
  - Coordinates can be typed on iPhone.
  - Landing cards no longer overflow at 360px (found by CI's different fonts).
- **Deployment kit:**
  - `deploy/compose.yaml` and `deploy/.env.example`, with [deployment.md](deployment.md).
  - Both images were built and run here.
  - Fixed: the web image couldn't start (its public settings were missing at runtime), and dev photos were going into images.
- **Custom domains:**
  - `Lodge.customDomain` and `set-domain`.
  - The API lookup and CORS.
  - The proxy routes those domains.
  - Links and canonical URLs prefer the custom domain.
  - The "Your web address" card, with "Ask us" opening a prefilled change request.
- `next build` skips its own type check (`ignoreBuildErrors`, as the user asked). `check-types` covers it.

Known gaps:

- **Owner visits on a custom domain** are counted (the session cookie is StayZim's). On the subdomain they're skipped.
- **The Docker build here** skipped `apt-get` (Debian mirrors are blocked in this sandbox). Production builds install OpenSSL as written.
- **Template thumbnails** are still sketches from `looks.ts`.
- **Unsaved changes:** the guard doesn't catch the browser's own Back button.

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

## Blocked on / needs a decision

- **Paynow:** the integration ID and key (test mode first), then live approval from Paynow.
- **Business details for invoices and receipts:** registered name, address and tax number. Set them as `BUSINESS_*` on the server; the code is ready.
- **SMTP credentials** for hello@stayzim.co.zw (Spacemail). Welcome emails, invoices, receipts and resets all need them.
- **Cloudflare R2:** a bucket, API token and public domain for lodge photos.
- **Google OAuth client** (ID and secret), to switch on and test Google sign-in and sign-up.
- **Merchant codes:** EcoCash and InnBucks, for owners who pay outside Paynow. Set them as `ECOCASH_MERCHANT_CODE` and `INNBUCKS_MERCHANT_CODE`; the cards stay hidden until then.
- **Sales WhatsApp number,** for the landing page and the demo lodges (`seed-demos --whatsapp`).
- **Demo lodge photos,** and a check of the demo copy in `packages/auth/scripts/seed-demos.ts`.
- **Hosting:** the VPS, Coolify, the Cloudflare zone, and the origin certificate ([deployment.md](deployment.md)).
- **Template designs** for the 8 placeholders, from the designer.
- **Real-device check** on iOS Safari and Android Chrome, especially the sign-up flow and photo picking.
- **A review of the Privacy and Terms drafts** (`apps/web/src/app/privacy`, `apps/web/src/app/terms`), now covering the demo, payments and deletion.
- **Facebook ads:** the Meta Pixel is built and off. Set `NEXT_PUBLIC_META_PIXEL_ID` and rebuild web to switch it on; the privacy notice then mentions it. Server-side Conversions API isn't added (it needs a Meta access token).
- The open questions in [project.md](project.md#open-questions).

## Log

Newest first. One line per piece of work that landed on `main`.

### 6 October 2026 (late night)

- The trial is replaced by a self-serve 2-day demo: `DEMO` status, `/signup` and `/start`, demo badges, the "demo ended" page.
- Billing: Paynow (phone prompt, InnBucks code, card), invoices and receipts, `mark-paid`, the hourly billing job (reminders, overdue, suspension, deleting old demos).
- Own domains once paid; a free .co.zw on Growth and Pro; a Traefik catch-all for custom domains.
- Shared plan, slug and date rules in `@stayzim/sites`; Terms, Privacy and docs updated; a browser test for sign-up.

### 6 October 2026 (night)

- Smaller photo copies and `srcset` on lodge sites; zod out of the browser bundle.
- Prisma migrations instead of `db push`; containers apply them on start.
- Sign-in rate limits in Postgres, a trusted client IP header, `/health`, security headers, robots and sitemap, and a backup script.
- `seed-demos` for the landing page's demo lodges.
- Unit tests, Playwright browser tests, and GitHub Actions CI.
- Mobile fixes: tap targets, safe areas, iPhone coordinates, and narrow landing cards.
- Deployment kit (`deploy/`, deployment.md); the web image now starts.
- Custom domains per lodge.
- `ignoreBuildErrors` for `next build`.

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
