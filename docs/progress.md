# Progress

_What's built, what's next, and what's blocking. Update this file whenever a piece of work lands. For what StayZim is and why, see [project.md](project.md)._

**Last updated:** 7 October 2026 (designed templates, yearly discounts, plan-change carry-over)

## At a glance

| Area | Status |
| --- | --- |
| Marketing landing page | ✅ Built |
| Landing page analytics (CTA clicks, page views) | ✅ Built |
| Privacy and Terms pages | ✅ Drafted in plain language; need a review before launch |
| WhatsApp outreach tool (internal) | ✅ Built |
| Self sign-up and the 2-day demo (`/create`) | ✅ Lodge name + WhatsApp + 3 photos to a live demo in about 90 seconds (6 s automated), no email until Claim my site, ad tags saved, drop-off tracked per step, demo badges, offline when it ends, deleted 30 days later |
| Owner sign-in (login, reset, first-login password) | ✅ Built, matches the app screens design |
| Sign in with Google | ✅ Built (signs in or signs up), needs a Google OAuth client to test for real |
| Email (SMTP via Nodemailer) | ✅ Built, needs SMTP credentials |
| Owner dashboard (overview, lodge info, rooms, gallery, design, requests) | ✅ Built |
| Photo storage (Cloudflare R2) | ✅ Built, needs R2 credentials |
| Shared UI components (packages/ui) | ✅ Built |
| Lodge sites ({slug}.stayzim.co.zw) | ✅ Rendering, subdomain routing, tracking, suspended and 404 pages, template preview route, robots and sitemap |
| Custom domains per lodge | ✅ Any plan once paid (free .co.zw on Growth and Pro): `set-domain`, routing, CORS, canonical URLs, the dashboard address card and a catch-all Traefik route |
| Site templates (9, 3 per plan) | ✅ All nine designed (`designs/StayZim Lodge Templates.html`): Veranda, Rondavel, Shade; Shoreline, Wordmark, Overlap; Escarpment, Courtyard, Canopy. Previews open the booking sheet without sending |
| Change requests | ✅ Owner screen, team screen (`/admin/requests`), API and script |
| Owner analytics | ✅ Live numbers, chart, countries, activity, and the visits table (filters, pages, each visit's path, 90 days) |
| Lodge CMS (rooms, guest info, quick wins) | ✅ Built, all plans: room details, how many, hide, duplicate, photo order; Guest info (times, rules, policy, FAQ, links); most asked-about rooms; edit your name. See [CMS](#cms) and [cms/](cms/README.md) |
| Bookings calendar and on-site booking | ✅ Built, Growth and Pro: guests book on the site (WhatsApp second), the owner confirms or turns on Confirm bookings automatically, plus add, close dates, edit, cancel, emails, and booking data on the overview and Analytics. Starter keeps Book on WhatsApp |
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
- [x] Self sign-up (`/signup`, email or Google), plus `create-owner` for accounts StayZim makes (that script was the only way in before sign-up opened)
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
- [x] Real designs for all nine templates, with reviews and a journal on Pro
- [ ] Look at each template with real photos (the designs had none)

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

## CMS

Planned with the user on 6 October 2026 ([docs/cms/](cms/README.md)) and built on 6 and 7 October, in this order, one commit per step.

The rule behind all of it: every lodge and every template has the same data shape; only the rendering differs.

### 1. Foundation ([rooms.md](cms/rooms.md#1-foundation))

- [x] Content contract in `packages/sites/src/content/`: limits, amenities, input schemas, `publicSiteSchema`, dashboard types, date helpers
- [x] Server serializers checked with `satisfies`; the shared schemas used in the lodge and room routes
- [x] Web copies of the types and the amenity list replaced by the shared ones; `getSite` parses with defaults; no zod in lodge site browser chunks

### 2. Rooms CMS (core, all plans, [rooms.md](cms/rooms.md))

- [x] Migration `room_details`: description, beds, size, `units` (how many), `visible`
- [x] Room sheet: Basics with "How many of this room", Details · Optional, Show on site switch
- [x] Hide or show a room from the row menu, with Undo; a Hidden badge and tab *(5-minute)*
- [x] Duplicate a room (`POST /rooms/:id/duplicate`, hidden copy) *(5-minute)*
- [x] Reorder a room's photos in the sheet (the API exists) *(5-minute)*
- [x] Classic shows the room facts and description; only visible rooms reach any template; `HotelRoom` JSON-LD

### 3. Guest info (3 small, all plans, [guest-info.md](cms/guest-info.md))

- [x] Migration `lodge_guest_info` and the `guestInfo` schema
- [x] Stay details: check-in and check-out times, house rules (with chips), cancellation policy *(small)*
- [x] FAQ: up to 8, with suggested questions; `FAQPage` JSON-LD *(small)*
- [x] Social and listing links: Facebook, Instagram, TikTok, TripAdvisor, Booking.com, Airbnb *(small)*
- [x] The Guest info page under My site; Classic's Good to know and FAQ sections; social icons; "Add guest info" on the checklist

### 4. Quick wins ([quick-wins.md](cms/quick-wins.md))

- [x] Most asked-about rooms on Analytics *(5-minute)*
- [x] Edit your name in the account menu *(5-minute)*

### 5. Bookings calendar and owner tools (hard, Growth and Pro, [bookings.md](cms/bookings.md#part-1-the-calendar-and-owner-tools))

- [x] Migration `bookings` (`Booking`, `BOOKING_REQUEST` event type); `dates` and `availability` helpers with tests
- [x] `/api/lodge/bookings`: list, requests, search, add, close dates, confirm, decline, cancel, edit; advisory lock and 409 when full
- [x] Bookings page: Requests, Calendar (timeline on desktop, month grid on phones), Upcoming, Past; locked preview on Starter
- [x] Booking sheet: add, edit, cancel with a reason, notes, totals, ready-made WhatsApp messages to the guest
- [x] Today card on the overview; the "waiting" badge; Delete refused for rooms with bookings; the overbooked warning when "how many" drops
- [x] Guest emails (confirmed, declined, cancelled) when they gave an email

### 6. Booking requests from the lodge site (hard, Growth and Pro, [bookings.md](cms/bookings.md#part-2-booking-requests-from-the-lodge-site))

- [x] `range-calendar` and `switch` in `packages/ui`
- [x] Public `availability` and `bookings` routes: rate limit, honeypot, daily cap, full-night check
- [x] `BookLink` opens the lazily loaded booking sheet in request mode (every template, placeholders untouched); "Send on WhatsApp too"
- [x] Owner email for new requests; analytics count requests
- [x] Privacy page, and guest details cleared 12 months after the stay (in the hourly job, which kept its name, `jobs/billing.ts`)
- [x] Landing page, pricing and plan lists stop saying the calendar is coming later

### 7. Added while building (asked by the user on 7 October)

- [x] Guests book on the site first, WhatsApp second (Growth and Pro): Classic's buttons read Book now in the lodge's colour, with a WhatsApp button beside them; the contact number always opens the chat (`BookLink channel="whatsapp"`). Starter keeps Book on WhatsApp
- [x] **Confirm bookings automatically**, an owner setting on the Bookings page: a booking on free nights is confirmed straight away, under the room lock, and the guest sees "You're booked"
- [x] Booking data in the dashboard: Today strip and Coming up card on the overview, bookings and WhatsApp chats counted apart in the stats tile, upcoming bookings on Rooms (hide instead of delete), a downgrade note on Billing
- [x] Direct-booking copy on the landing page (hero, how it works, a new FAQ), the sign-in panel and `/start`
- [x] Browser tests (`apps/web/e2e/cms.e2e.ts`) and 360px checks for Bookings and Guest info; CI seeds a Starter lodge (`cliffview`)

## Next up

Everything that could be done without the user is done (the CMS and bookings too). What's left needs them (see [Blocked on](#blocked-on--needs-a-decision)):

1. **Credentials,** then test with the real services:
   - Paynow (test mode first);
   - R2 uploads;
   - Google sign-in;
   - emails over SMTP (welcome, invoices, receipts, resets, and booking emails to owners and guests);
   - visits behind Cloudflare (countries).
2. **Deploy** with [deployment.md](deployment.md): VPS, Coolify, Cloudflare DNS and the origin certificate.
3. **Demo lodges:** run `seed-demos` with the sales number, then add real photos as each demo owner.
4. **Real devices:** iOS Safari and Android Chrome, especially the booking sheet's date picker and the dashboard calendar.

## Handoff (7 October 2026)

Written at the end of a session so the next agent can continue. Everything is committed and pushed on `main`. `pnpm check-types` and `pnpm test` pass, and CI runs both, plus browser tests against Postgres.

The user's rules:

- Work on `main` (no separate branches), one commit per small task, and never add a Co-Authored-By line, even when a tool suggests one.
- Add subtle framer-motion animations wherever they fit, all off with "reduce motion".
- Web and server only; ignore apps/native.
- **Templates** follow `designs/StayZim Lodge Templates.html`, one file each under `components/site/templates/`.
- **The CMS is built** ([docs/cms/](cms/README.md)). Same data for every template; only the rendering differs; the shapes live once in `packages/sites/src/content/`. Rooms are room types with a count.
- **Bookings are Growth and Pro only:** guests book on the site first, WhatsApp second; the owner confirms (or turns on Confirm bookings automatically). Starter sites keep Book on WhatsApp. Anything under the CMS docs' "Later" list (seasonal prices, deposits, iCal sync, custom sections) needs the user first.
- **There is no trial.** Owners make a free 2-day demo at `/create` (one flow for ads and organic), claim it with an email, and pay through Paynow.

### Local setup that differs from the examples

- **Sites domain:**
  - `apps/server/.env` has `SITES_DOMAIN=localhost:9999` and `apps/web/.env` has `NEXT_PUBLIC_SITES_DOMAIN=localhost:9999`.
  - Lodge sites open at `http://{slug}.localhost:9999` (Chrome resolves `*.localhost`).
- **Logins:**
  - Test owner `rudo@mistvalley.test` (lodge `mistvalley`, with the test custom domain `mistvalleylodge.test`).
  - Demo owners `msasaridge@demo.stayzim.co.zw` and `lakeview@demo.stayzim.co.zw` (made by `seed-demos`).
  - Reset any of them with `create-owner --email … --reset`. Team account: `create-owner … --admin`.
- **Sign-in limits** are in the `rate_limit` table and survive restarts. Clear them locally with `DELETE FROM rate_limit;` if tests keep signing in.
- **Booking requests from a site** are limited to 5 per 10 minutes per IP, in the API's memory: restart the API if local runs hit it.
- **A Starter lodge** for tests: `cliffview` (owner `starter@e2e.test`), made with `create-owner` and `create-lodge --plan starter --sample-rooms`. CI makes the same.
- **After a schema change,** restart the API without `--hot`: Prisma misbehaves after its client is regenerated under hot reload.
- **Photos** are on local disk (`apps/server/uploads`), because R2 isn't configured locally.
- **Agent files:** the root `AGENTS.md` (written by turbo) is committed. `next dev` also writes `apps/web/AGENTS.md` and `CLAUDE.md`; they're untracked, so leave them out of commits unless the user asks.

### Built this session (CMS and bookings)

The user's answers:

- A small CMS like Framer's, for rooms and what a lodge needs: one data shape for every template, owners edit it themselves.
- Bookings: guests request dates on the site (Growth and Pro), owners confirm; rooms are room types with a count. Later: book on the site first, WhatsApp second, and an owner option to confirm automatically.

What was built, in order (each its own commit on `main`):

1. **The content contract** in `packages/sites/src/content/`: limits, amenities, zod input schemas (`@stayzim/sites/schemas`, server and server-side web only), the `PublicSite`/`LiveSite`/`DashboardLodge` types, date and availability helpers. The server's serializers `satisfies` them; the web copies are gone; `getSite` parses with defaults. PATCH schemas have no defaults (zod 4's `.partial()` keeps them, which used to reset amenities).
2. **Rooms CMS:** migration `room_details`; the sheet's Basics, Details · Optional and Show on site; hide, duplicate, photo order; Classic's room facts and description; `HotelRoom` JSON-LD.
3. **Guest info:** migration `lodge_guest_info`; a new My site page; Classic's Good to know and Questions sections, social links; `FAQPage` JSON-LD.
4. **Quick wins:** most asked-about rooms; edit your name (account menu, and the sidebar name opens it).
5. **Bookings calendar:** `booking.prisma`; `/api/lodge/bookings` with a per-room advisory lock; the Bookings page (Requests, a timeline on desktop, a month per room on phones, Upcoming, Past); the booking sheet; WhatsApp messages to guests; guest emails.
6. **On-site booking:** public availability and bookings routes (rate limit, honeypot, daily cap); `BookLink` opens the lazily loaded sheet; owner email; analytics event; guest details cleared after 12 months; privacy and terms.
7. **Confirm bookings automatically,** **Book first** on Classic, booking data across the dashboard, copy, `.env.example` audit, browser tests.

Known gaps:

- **Template previews** open the booking sheet with real availability, but its last step says it's a preview and sends nothing.
- **Demo lodges** (`seed-demos`) are Growth and Pro, so they take booking requests; they go to the demo owner accounts.
- **The guest's date picker** shows availability for 120 days at a time and fetches more as they page.

### Built in the session before (sign-up, demos and billing)

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
- **Changing plan mid-period** takes effect when the payment goes through. The time left moves to the new plan at the two monthly prices, in whole days rounded down (`carriedOverMs`), then the months paid for start; the pay card shows the result first.
- **The dev API's hot reload** can leave Prisma in a bad state ("not valid UTF-8" errors). Restart it; production doesn't hot-reload.

### Built earlier (tiers 4 and 5)

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

- **Owner visits on a custom domain** are skipped once the owner has opened their site from a dashboard View site link on that device (the per-lodge key, `lib/owner-key.ts`). Typing the address on a new device, before ever using that link there, still counts.
- **The Docker build here** skipped `apt-get` (Debian mirrors are blocked in this sandbox). Production builds install OpenSSL as written.
- **Unsaved changes:** the browser's Back button asks too (an extra history entry while a form has edits). Sheets (room, booking) still close on Back without asking.

### Spec: site templates

Agreed with the user:

- **9 templates, 3 per plan.**
  - The plan sets design quality and motion: Starter is static (`none`), Growth `subtle`, Pro `rich`.
  - Catalog: `packages/sites/src/index.ts`. Keys: `starter-veranda|rondavel|shade`, `growth-shoreline|wordmark|overlap`, `pro-escarpment|courtyard|canopy`, each built from `designs/StayZim Lodge Templates.html` in its own file under `apps/web/src/components/site/templates/`.
  - The first nine keys (Clear … Classic … Horizon) are retired: a migration moved each lodge to the design that replaced its template in the same plan, and `RETIRED_TEMPLATES` still reads an old key.
  - Pro designs show reviews and a journal, which the StayZim team keeps (`/admin/lodges`).
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
- **Owner-editable content:**
  - The hero headline (60 characters) and subline (140): `Lodge.heroHeadline` and `heroSubline`.
  - Through the CMS: room details, guest info (stay details, FAQ, links) and, on Growth and Pro, bookings. Every template receives the same `LiveSite`; the sections every template must render, and `BookLink` for every Book button, are in [cms/README.md](cms/README.md#the-template-contract).
  - Saved with PATCH `/api/lodge`; an empty string resets to the template default.
  - Stored once, not per template, so switching keeps them.
  - Each template has default copy with `{name}` and `{place}` (`heroText()`, `fillCopy()`).
- **Switching:** preview, then apply. It goes live straight away, and the "Template changed" toast needs an Undo action (PATCH back to the previous key).
- **Everything else** goes through change requests (design changes, domains, custom sections).

Built (web):

- **Preview route** `apps/web/src/app/preview/[slug]/[template]/page.tsx`: any template, including locked ones; `noindex`; tracking off; a slim "Preview: {name} template" bar. Hero text that is the live template's default switches to the previewed template's (`withTemplate()` in `lib/site.ts`).
- **Design screen** `apps/web/src/app/dashboard/design/page.tsx` (under My site): hero text with counters and a live phone preview; templates grouped by plan with thumbnails (`template-thumb.tsx`), a sliding "Live" ring, locked cards with "Upgrade to {plan}" on WhatsApp; a preview sheet (iframe, Phone and Desktop); "Use this template" (disabled with a reason when locked or live) applies straight away, with Undo in the toast.
- **Starter templates** have no motion at all.

## Blocked on / needs a decision

- **Paynow:** the integration ID and key (test mode first), then live approval from Paynow.
- **SMTP credentials** for hello@stayzim.co.zw (Spacemail). Welcome emails, invoices, receipts and resets all need them.
- **Cloudflare R2:** a bucket, API token and public domain for lodge photos.
- **Google OAuth client** (ID and secret), to switch on and test Google sign-in and sign-up.
- **Merchant codes:** EcoCash and InnBucks, for owners who pay outside Paynow. Set them as `ECOCASH_MERCHANT_CODE` and `INNBUCKS_MERCHANT_CODE`; the cards stay hidden until then.
- **Sales WhatsApp number,** for the landing page and the demo lodges (`seed-demos --whatsapp`).
- **Demo lodge photos,** and a check of the demo copy in `packages/auth/scripts/seed-demos.ts`.
- **Hosting:** the VPS, Coolify, the Cloudflare zone, and the origin certificate ([deployment.md](deployment.md)).
- **Real photos and copy for the Pro extras:** each Pro lodge's Booking.com score, a few guest quotes and the first journal posts, entered at `/admin/lodges` (team accounts).
- **Real-device check** on iOS Safari and Android Chrome, especially the sign-up flow and photo picking.
- **A review of the Privacy and Terms drafts** (`apps/web/src/app/privacy`, `apps/web/src/app/terms`), now covering the demo, payments and deletion.
- **Facebook ads:** the Meta Pixel (`1632288361926055`) is hard-coded and on in production. Check in Meta's Events Manager that PageView, CompleteRegistration, StartTrial and Purchase arrive after the deploy. Server-side Conversions API isn't added (it needs a Meta access token).
- The open questions in [project.md](project.md#open-questions).

## Log

Newest first. One line per piece of work that landed on `main`.

### 7 October 2026

- One sign-up flow for ads and everyone else: `/create` (name + WhatsApp, then 3 photos, live in about 90 seconds), guest accounts until Claim my site, ad tags on each lodge, drop-off events per step, lighter retries for photos on weak lines, lodges-only wording. Deploys onto an empty db-push database recover by themselves.
- Tier 1 and the small gaps: a foreign phone number no longer shows "+263 +44…"; the "Coming to Growth" box is gone; 12 months cost 10%, 17% or 30% less (Starter $216, Growth $398, Pro $630, rounded down); Guest info no longer opens as edited; Back asks before losing edits; owner visits on their own domain aren't counted; previews open the booking sheet; plan changes carry the time left over; the Meta Pixel is hard-coded.
- Guests book on Growth and Pro sites (date picker, full nights greyed out); the owner confirms, or turns on Confirm bookings automatically. Classic leads with Book now, WhatsApp second; Starter stays on WhatsApp.
- Booking data on the dashboard: Coming up, Today, the stats tile split, upcoming bookings on Rooms, a downgrade note on Billing; direct-booking copy on the landing page, sign-in and `/start`.
- `.env.example` files list every setting; browser tests for the CMS and bookings; a Starter lodge in CI.
- Bookings page redesign: four tiles for today, queue-style request cards (clashes outlined), an agenda-style desktop calendar, tinted days on the phone month, and calendar-leaf dates in booking lists.
- Auth screens on phones checked against `designs/StayZim App Screens.html`: the logo sits in a ringed tile and the Kariba header is a little taller.
- The nine designed templates from `designs/StayZim Lodge Templates.html` replace the placeholders and Classic: Veranda, Rondavel, Shade (Starter); Shoreline, Wordmark, Overlap (Growth, with an enquiry bar); Escarpment, Courtyard, Canopy (Pro, with reviews, a journal and a parallax hero). Stored keys migrated; new Design screen sketches.
- Reviews and a journal for Pro sites: data, team screens at `/admin/lodges`, `/journal` pages and the sitemap.
- Browser tests for every template at 360px, the enquiry bar, and the team's reviews and journal; CI seeds a Pro lodge and a team account.

### 6 October 2026 (CMS)

- The content contract, the Rooms CMS, Guest info, quick wins, and the owner's bookings calendar.

### 6 October 2026 (CMS plan)

- Planned the lodge CMS with the user and wrote it up in `docs/cms/`: the shared content contract, the Rooms CMS, guest info, quick wins, the bookings calendar and booking requests. Added the [CMS](#cms) checklist. Docs only; no code changed.

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
