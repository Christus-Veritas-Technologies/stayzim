# Architecture

How the pieces of the StayZim monorepo fit together. For setup, see the [README](../README.md).

## Overview

```
 Browser (phone first)
   │
   ├── stayzim.co.zw ─────────────┐
   ├── (www. → stayzim.co.zw) ────┤  apps/web (Next.js 16)
   ├── {slug}.stayzim.co.zw ──────┤    landing page, /login, /dashboard, /admin,
   │                              │    lodge sites (rewritten to /sites/{slug})
   │                              │
   │   fetch, with session cookie ▼
   └────────────────────────▶ apps/server (Hono on Bun) :9998
                                │  /api/auth/*      better-auth (email + password, Google)
                                │  /api/account/*   signed-in user
                                │  /api/lodge/*     the owner's lodge, rooms, photos, stats, requests
                                │  /api/sites/*     public lodge site content and visit tracking
                                │  /api/admin/*     StayZim team only
                                │  /api/landing/*   landing analytics
                                ▼
                         PostgreSQL "stayzim"

 apps/outreach (Hono on Bun) :9997   internal tool, own login
   │  3 × whatsapp-web.js clients (one Chrome each)
   ▼
 PostgreSQL "stayzim-outreach"
```

## Apps

### apps/web: Next.js 16 (App Router), port 9999

One app serves three kinds of host, told apart in `src/proxy.ts`:

- **Lodge sites** at `{slug}.SITES_DOMAIN` are rewritten to `/sites/{slug}`. Anything else on a lodge host is that site's own 404. `/sites/x` opened on the main domain is redirected to the subdomain.
- **The main domain** (`stayzim.co.zw`; `www.` and `app.` redirect there with a 308) serves the landing page, login, dashboard and team screens. Requests without a session cookie are sent to `/login` before any `/dashboard`, `/set-password` or `/admin` code loads; the pages check the session again.

Routes:

| Route | What it is |
| --- | --- |
| `/` | Landing page, built from `designs/StayZim Landing Page.html`. Sections in `src/components/landing/`, copy and sample data in `content.ts` |
| `/privacy`, `/terms` | Plain-language legal pages (`src/components/legal-page.tsx`) |
| `/login`, `/forgot-password`, `/reset-password`, `/set-password` | Owner account screens, in the `(auth)` route group. Owners already logged in skip `/login` |
| `/dashboard` | Overview: setup checklist, visit stats, Send your link, rooms, activity |
| `/dashboard/site`, `rooms`, `gallery`, `design`, `requests` | The "My site" pages: Lodge info, Rooms, Gallery, Design (template and hero text) and Change requests |
| `/dashboard/analytics`, `billing` | Visits (Growth and Pro; a locked preview on Starter) and Billing |
| `/admin/requests` | Team screen: work through owners' change requests (`role` `ADMIN` only) |
| `/sites/[slug]` | A lodge site (reached through its subdomain, or the lodge's own domain) |
| `/preview/[slug]/[template]` | A lodge site in any template, for the Design screen. `noindex`, tracking off |

Search engines and the browser:

- **Security headers** (`next.config.ts`) on every page:
  - `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin`.
  - Same-origin framing only (`X-Frame-Options: SAMEORIGIN`, CSP `frame-ancestors 'self'`). The Design screen frames `/preview/…`.
  - A `Permissions-Policy` that turns off the camera, microphone, location and payment APIs. Photo inputs use the file picker, which isn't affected.
  - HSTS, except on localhost.
  - A small CSP (`base-uri`, `object-src`, `form-action`). A full script policy needs per-request nonces, which would make every page dynamic.
  - `X-Powered-By` is off.
- **`robots.txt` and `sitemap.xml`** (`src/app/robots.ts`, `sitemap.ts`) depend on the host:
  - On StayZim's domain, they list the landing page, Privacy and Terms, and disallow the dashboard, team screen, sign-in pages, `/preview` and `/sites`. Those pages are also `noindex`.
  - On a lodge site, everything is allowed and the sitemap is its one page.

How the dashboard works:

- `DashboardShell` (`src/components/dashboard/shell.tsx`) checks the session, loads the lodge through `LodgeProvider`, and lays out the sidebar and white panel (desktop) or header and bottom bar (phones). The My site pages share one bottom tab on phones, with pills (`SitePagesNav`) and a "‹ My site" back link (`back-link.tsx`).
- `LodgeProvider` loads `GET /api/lodge` once. Every lodge route answers with the whole lodge, so `save()` just swaps it in and every screen stays current.
- Photos are resized on the device (`src/lib/images.ts`) and uploaded one at a time with progress (`use-photo-uploads.ts`). Each upload also carries a 1280px and a 640px copy (`smallerCopies`), made from the resized photo, so lodge sites can send phones only what they need.
- Code that runs in the browser reads public settings from `src/lib/public-env.ts`, not `@stayzim/env/web`: the settings are still validated once at build and start (`next.config.ts` imports the env package), but guests' phones don't download zod. Server-only code (`src/lib/site.ts`) keeps using `@stayzim/env/web`.
- Visit numbers come from `useVisitStats(period)` in `src/lib/stats.ts` (`/api/lodge/stats`). Chart buckets arrive as ISO start times and are labelled in Zimbabwe time; countries arrive as ISO codes and are named with `Intl.DisplayNames`. Starter gets a 403, and the overview shows an upgrade card instead.
- Screens build on the shared components in `packages/ui` (`@stayzim/ui/components/*`). Colours, shadows and fonts are tokens in `packages/ui/src/styles/globals.css`. Fonts load with `next/font` from `src/lib/fonts.ts`: Familjen Grotesk, Instrument Sans, Newsreader.

Shared UX pieces, so every screen behaves the same:

| Piece | Where | What it does |
| --- | --- | --- |
| Motion helpers | `src/components/motion.tsx` | `Appear`/`Item`, `Reveal`, `CountUp` and friends. `MotionConfig reducedMotion="user"` turns all framer-motion off with the OS setting |
| `NavigationProgress` | `src/components/navigation-progress.tsx` | Thin Kariba bar at the top while the next page loads (starts on internal link clicks, ends when the address changes) |
| `NavIcon`, `NavTrailing` | `src/components/dashboard/link-pending.tsx` | `useLinkStatus` spinner on the nav item being opened |
| `WhyDisabled` | `src/components/why-disabled.tsx` | Tooltip on a disabled control saying why ("No changes to save", "Comes with Pro") |
| `OfflineBanner`, `useOnline` | `src/components/dashboard/offline-banner.tsx`, `src/lib/online.ts` | Strip under the header while offline; Save buttons disable with `OFFLINE_REASON` |
| `UnsavedChangesGuard` | `src/components/dashboard/unsaved-changes.tsx` | "Discard your changes?" before an in-app link or the browser's Back button leaves a form with edits (Back lands on an extra history entry first), plus the browser's prompt on reload. The room sheet asks before closing |
| Error and 404 screens | `src/app/not-found.tsx`, `error.tsx`, `global-error.tsx`, `dashboard/error.tsx` | StayZim-branded, with Try again (`retry()`) and Message us |

### apps/server: Hono on Bun, port 9998

| Route | Purpose |
| --- | --- |
| `GET/POST /api/auth/*` | better-auth: sign in and out (email and password, Google), session, password reset |
| `GET /api/account/me` | The signed-in user and a short summary of their lodge |
| `GET /api/account/sign-in-options` | Public: whether the login screen shows "Continue with Google" |
| `POST /api/account/set-password` | Change password (first login or later); lifts the temporary-password block |
| `POST /api/landing/events` | Landing page views and CTA clicks. Public, validated, 60 requests/minute per IP |
| `GET/PATCH /api/lodge` | The owner's lodge with rooms and photos; edit info, location, look, template and hero text |
| `POST /api/lodge/map-location` | Coordinates from a Google Maps link (follows Google's own redirects only) |
| `POST/DELETE /api/lodge/logo`, `POST /api/lodge/shared` | Logo upload; mark the link as shared (setup checklist) |
| `/api/lodge/rooms` | `POST`, `PATCH /:id`, `DELETE /:id`, `PUT /order` |
| `/api/lodge/photos` | `POST` (multipart, one photo), `PATCH /:id` (caption), `DELETE /:id`, `PUT /order` |
| `GET /api/lodge/stats?period=today\|7d\|30d\|90d` | Visits today and yesterday, the period against the one before, booking chats, top countries, chart buckets. Growth and Pro (403 on Starter) |
| `GET /api/lodge/visits`, `GET /api/lodge/activity` | Visits newest first with filters and pages; the latest 6 for the overview. Growth and Pro |
| `GET/POST /api/lodge/requests` | The owner's change requests; send one (at most 10 open) |
| `GET /api/sites/:slug` | Public lodge site content (no plan or owner data), fresh on every request |
| `POST /api/sites/:slug/events` | Page views and Book on WhatsApp taps from lodge sites. 60/minute per IP; skips the owner's and the team's own visits (by session cookie, or by the owner key on a lodge's own domain) |
| `GET /api/admin/requests?status=open\|done\|all`, `PATCH /api/admin/requests/:id` | Team only: list requests across lodges, set status and reply |

- **CORS:** allows the `CORS_ORIGIN` list (comma-separated web origins) and any `{slug}.SITES_DOMAIN` origin (lodge sites report visits), with credentials, so the session cookie is sent.
- **Mail check at boot:** if SMTP is configured, the server checks the connection on startup and logs the result.
- **Health:** `GET /health` answers `{"status":"ok"}` when the database replies to `SELECT 1` within 2 seconds, and 503 otherwise (the reason is logged). The Docker health check uses it; `GET /` stays a plain `OK`.
- **Custom domains:** `Lodge.customDomain` (set with `packages/db/scripts/set-domain.ts`). `GET /api/sites/domain/:host` answers which lodge a domain belongs to (`slugForCustomDomain` in `src/lib/sites.ts`, cached). CORS accepts those origins as lodge sites. The web proxy uses the same lookup (`src/lib/custom-domains.ts`), and `siteHost`/`siteUrl` prefer the custom domain, so dashboard links and share messages use it. Setup is in [deployment.md](deployment.md#custom-domains).
- **Client IP:** read from `CLIENT_IP_HEADER` (`cf-connecting-ip` behind Cloudflare), for visit records and sign-in rate limits ([auth.md](auth.md#rules)).
- **Lodge routes** need a signed-in owner with their own password and a lodge (`requireLodge` in `src/lib/lodge.ts`, 404 until StayZim creates it). Each answers with the whole lodge (`lodgeJson`).
- **Team routes** (`src/routes/admin.ts`) need a signed-in user with `role` `ADMIN`.
- **Photos** (`src/lib/uploads.ts`): JPG, PNG or WebP (checked by file signature), 5 MB at most, stored in Cloudflare R2 through Bun's built-in S3 client and served from the bucket's public URL. Without the `R2_*` settings (development), they go to `UPLOAD_DIR` and this server serves them at `/uploads`; production refuses to start without R2. The storage in use is logged at boot. `R2_ENDPOINT` overrides the endpoint, for buckets in R2's EU jurisdiction or any S3-compatible store (the upload, content type and delete paths were tested against an S3 test server).
- **Photo copies:** each photo has up to three files: the full one (1600px at most), `-md` (1280px) and `-sm` (640px), stored as `key`, `mediumKey` and `smallKey`. Copies are skipped when the photo is already that small, and older uploads have none. `photoSrcSet` turns them into a `srcset` (`srcSet` on photos, `heroSrcSet` on the lodge and site), and the templates give each image a `sizes` that matches its layout. Deleting a photo or room removes every copy. With realistic photos, a lodge site's first load on a phone is about 1.36 MB (976 KB of images, 274 KB of scripts, 72 KB of fonts), under the 1.5 MB budget; room carousels load each photo only when the guest swipes to it.

### apps/outreach: Hono on Bun, port 9997

Internal tool for messaging leads on WhatsApp from 3 numbers, with daily limits per number, reply tracking and opt-outs. It has its own database (`stayzim-outreach`), its own password, and server-rendered admin pages. Full reference: [apps/outreach/API.md](../apps/outreach/API.md).

### apps/native: Expo

Scaffold from the starter template. Not part of the MVP yet.

## Lodge sites

- **Addresses:** every lodge lives at `{slug}.SITES_DOMAIN`: `stayzim.co.zw` in production, `localhost:9999` locally (Chrome resolves `mistvalley.localhost:9999`). The server's `SITES_DOMAIN` and the web app's `NEXT_PUBLIC_SITES_DOMAIN` must match.
- **Reserved subdomains** (`www`, `app`, `api`, `admin`, `media`, …) are listed once, in `RESERVED_SLUGS` (`packages/sites/src/slugs.ts`), and used by web, server and the scripts.
- **Rendering:** `/sites/[slug]` fetches `GET /api/sites/:slug` on every request (owners' edits show straight away) and renders `<SiteTemplate>`. Suspended lodges get `SuspendedSite`; unknown ones `UnknownSite`.
- **Tracking:** `components/site/tracking.tsx` posts page views and Book on WhatsApp taps, with a random visitor id kept in `localStorage`. The server adds device and browser (user agent), IP and country (Cloudflare's `CF-IPCountry`, so countries are empty until the sites sit behind Cloudflare). Owners see visits on Growth and Pro.
- **Owner key:** on a lodge's own domain StayZim's cookie isn't sent, so the dashboard's View site links (`ownerSiteUrl`) end in `#stayzim-owner={key}`, an HMAC of the lodge id (`apps/server/src/lib/owner-key.ts`). The site keeps it in `localStorage`, takes it off the address and sends it with each event; the API skips events that carry the lodge's key. Copied and shared links never carry it.
- **Footer:** "Made with StayZim" and a Privacy link back to the main site (`MAIN_URL`).

### Templates

- **Catalog** (`packages/sites`): 9 designed templates, 3 per plan, from `designs/StayZim Lodge Templates.html`: `starter-veranda|rondavel|shade`, `growth-shoreline|wordmark|overlap`, `pro-escarpment|courtyard|canopy`. The plan sets the motion level: Starter `none`, Growth `subtle` (fades and rises), Pro `rich` (also a parallax hero).
- **Retired keys:** the first nine (Clear, Classic, Signature…) map to the design that replaced each in the same plan (`RETIRED_TEMPLATES`); migration `20261007130000_designed_templates` moved stored keys, and `findTemplate` still reads an old key.
- **Access is cumulative** (`templateAllowed`): a plan can use its own templates and every lower plan's. `PATCH /api/lodge` refuses higher ones (403, "Signature comes with the Pro plan").
- **Downgrades:** `LodgeJson.template` is the owner's pick; `siteTemplate` is what's live (`effectiveTemplate()`: the pick if the plan allows it, else the plan's `DEFAULT_TEMPLATE`). The Design screen says so and offers the upgrade.
- **Hero text:** owners can set the headline (60 characters) and the line under it (140). Stored once on the lodge (`heroHeadline`, `heroSubline`), so switching templates keeps them; empty means the template's default copy, with `{name}` and `{place}` filled in (`heroText()`, `fillCopy()`).
- **Web registry** (`components/site/templates/index.tsx`): one file per template, typed `Record<TemplateKey, …>` so a key without a design doesn't compile. Shared pieces live beside them:
  - `components/site/parts.tsx`: `siteBasics`, `BookLabel`, `HeroPhoto`, `Photo`, `StayDetails`, `Questions`, `SocialLinks`, `MapView` (Google's embed, or a drawn map), `FindUsLinks`, `MessageUs`, `WhatsAppFab`, `MobileBookBar`, `MadeWith`;
  - `enquiry-bar.tsx` (Growth and Pro): room, dates and guests; opens the booking sheet filled in, or WhatsApp with a message;
  - `carousel.tsx`, `quote-rotator.tsx`, `parallax.tsx`, and gallery layouts in `gallery.tsx`;
  - `template-fonts.ts`: each design's typeface, not preloaded, so a site downloads only its own;
  - `lib/site-content.ts`: shared wording (`splitIntro`, `amenitySummary`, `roomStats`, `highlightWords`, `scoreWord`, `countWords`), and `*stars*` in hero text for words a design sets apart.
- **Pro content:** reviews (the listing's score and guests' quotes) and journal posts, which the StayZim team keeps at `/admin/lodges`. Pro sites get them in `LiveSite.reviews` and `journal`; the journal has its own pages, `/journal` and `/journal/{post}`, and is in the lodge's sitemap.
- **Every template reads the same data.** Templates differ only in rendering. The CMS makes this a written contract ([docs/cms/README.md](cms/README.md#the-template-contract)):
  - the sections every template renders when they have content;
  - `BookLink` for every Book button;
  - optional fields as `null` or empty lists, never missing.
- **Design screen** (`/dashboard/design`): hero text with a live phone preview; templates grouped by plan with thumbnails, a sliding "Live" ring, and locked cards with "Upgrade to {plan}"; a preview sheet with the real site in an iframe (`/preview/{slug}/{key}`, Phone and Desktop widths); "Use this template" applies it at once, with Undo in the toast.

## Lodge CMS

The design is in [docs/cms/](cms/README.md); what was built is in [progress.md](progress.md#cms).

- **One content contract** in `packages/sites/src/content/`: limits, the amenity list, zod input schemas (`@stayzim/sites/schemas`, for the server and server-side web only, so zod stays out of browser bundles), the `publicSiteSchema` output schema, and the `LiveSite` / `DashboardLodge` types. The server's serializers `satisfies` them; the web app imports them (`apps/web/src/lib/lodge.ts` and `site.ts` re-export them).
- **Additive only:** new fields arrive with defaults, so old rows and old clients keep working.
- **Rooms** are room types with a count:
  - `units`, how many the lodge has;
  - `visible`;
  - a description, beds and size.
- **Guest info:** check-in and check-out times, house rules, cancellation policy, FAQ, and social and listing links. Lists are Json columns on `Lodge`.
- **Bookings** (Growth and Pro; [cms/bookings.md](cms/bookings.md)):
  - a `Booking` table (`booking.prisma`) holding stays and closed dates, with date-only check-in and check-out;
  - **on the site:** `LiveSite.booking.mode` is `request` on Growth and Pro (with WhatsApp and a visible room). Every Book button is a `BookLink`, which then opens the lazily loaded booking sheet (`components/site/booking-request.tsx`); `channel="whatsapp"` keeps a button on WhatsApp. `GET /api/sites/:slug/availability` gives the full nights only, `POST /api/sites/:slug/bookings` takes the booking (rate limit, honeypot, daily cap);
  - **requests hold no rooms** until the owner confirms, unless the owner turned on **Confirm bookings automatically** (`Lodge.autoConfirmBookings`);
  - **owners** (`/dashboard/bookings`, `/api/lodge/bookings`) confirm, decline, cancel, edit, add bookings and close dates. Anything that holds rooms runs under a per-room Postgres advisory lock and recounts first, so the last room can't go twice (409 "… is full on 12 Oct");
  - **emails:** a new booking or request to the owner; confirmed, declined and cancelled to guests who gave an email;
  - **privacy:** the hourly job clears guests' details 12 months after the stay.

## Change requests

Anything owners can't change themselves goes through change requests. Room details, guest info and bookings are self-serve now, through the CMS.

1. **Owner** (`/dashboard/requests`): picks a topic (Words, Photos, Rooms, Design, Something else), writes the message (10–1000 characters) and sends it. The request gets a reference like `R-7K2Q`, and the owner can pass it on to StayZim on WhatsApp in one tap.
2. **Team** (`/admin/requests`): the Waiting list (open and in progress, oldest first). Set the status and write a reply; Message {owner} opens WhatsApp to the lodge's number.
3. **Owner** sees the status badge (Open, In progress, Done, Declined) and the team's reply under their request.

The `resolve-request` script does the same from a terminal (`pnpm --filter @stayzim/db resolve-request --list`, or `--ref R-XXXX --status done --reply "…"`).

## Sign-up and the demo

- **`/create`** (`app/create/page.tsx`, steps in `components/create/`) is the one way in, for ads and organic visitors alike: `stayzim.co.zw/create?utm_source=meta&utm_campaign=…`. About 90 seconds from Get started to a live site:
  1. **Step 1 of 2 (about 60 seconds):** lodge name and WhatsApp number, nothing else. On Next, a guest account is made (better-auth's anonymous plugin, `POST /api/auth/sign-in/anonymous`) and `POST /api/onboarding/lodge` creates the lodge as a Growth `DEMO` (or the plan on the link), with an address made from the name, `demoEndsAt` 2 days ahead, its first invoice, and the link's utm_* and referrer.
  2. **Step 2 of 2 (about 30 seconds):** 3 photos (1 is enough; "go live without them" is there as a way out). Resized on the phone; one that drops on a weak line retries once by itself, smaller.
  3. **Live:** open, share, and **Claim my site**: name, email and password (or Google). Signing up from the guest account moves the lodge to the new account (`onLinkAccount` in `packages/auth`) and deletes the guest; `POST /api/onboarding/claimed` then sends the welcome email.

  The site takes shape beside the form as they type and upload (`components/create/preview.tsx`; a strip above the form on phones). Town, rooms, logo and guest info come after, from the dashboard checklist. Each step is in the URL, so a reload carries on. `/signup` and `/start` redirect here with their query (plan, utm_*).
- **Guest accounts** (`user.is_anonymous`): their email is a placeholder at `guest.stayzim.co.zw`, which `sendEmail` never sends to. Until they claim, the dashboard shows a "Claim my site" banner, the account menu has Claim instead of Log out, and Billing asks them to claim before paying (the pay route refuses guests). Logging in to an existing account from a guest session also moves the demo across, if that account has no lodge.
- **Where lodges come from:** `lodge.utm_source`, `utm_medium`, `utm_campaign`, `utm_content` and `signup_referrer`, from the first page of the visit (`signupSource()` in `lib/track.ts`). The team's lodge list (`/admin/lodges`) shows "via meta · registration_test".
- **The funnel:** each step is a `CTA_CLICK` landing event in the `create` section (`create_open`, `create_lodge`, `create_photo`, `create_live`, `create_claim`) and a custom Pixel event (`CreateStep`, with `step`), plus Meta's `StartTrial` when the demo is made and `CompleteRegistration` on claim. Drop-off between steps reads straight off `landing_event`.
- **Per-IP limits** are generous (30 guest sign-ins per 10 minutes, 30 demos an hour), because many phones on one mobile network share an IP address.
- **Demo sites:**
  - They carry badges, added around any template in `components/site/templates/index.tsx` (`demo-badges.tsx`).
  - They're `noindex`, and robots and the sitemap leave them out.
  - Their own domains aren't served.
  - Once `demoEndsAt` passes, the API answers `DEMO_ENDED` and the site shows "isn't online right now". This is worked out when the site is served, so it's on time without the job.
- **Rules** (prices, `DEMO_DAYS`, `GRACE_DAYS`, `DEMO_KEEP_DAYS`, slugs, billing dates in Zimbabwe time) live in `@stayzim/sites` (`plans.ts`, `slugs.ts`, `billing-dates.ts`) for the server, the web app and the scripts.

## Billing

- **Statuses:**
  - `DEMO`: free for 2 days. When it ends, the site is offline; the lodge is deleted 30 days after that if never paid.
  - `ACTIVE`: paid until `paidUntil`.
  - `OVERDUE`: past `paidUntil`, and the site stays up.
  - `SUSPENDED`: 3 days later, and the site is offline.

  A payment makes any of them `ACTIVE`.
- **Models** (`billing.prisma`):
  - `Invoice`: `SZ-2026-00042`, one month of a plan, `OPEN`, `PAID` or `VOID`.
  - `Payment`: `PAYNOW` or `MANUAL`, with a receipt number `R-2026-00007` once paid.
  - `BillingNotice`: one row per email sent, keyed by what it was about, so nothing goes twice.
  - `BillingCounter`: running numbers, and the job's hourly lease.
- **Paynow** (`apps/server/src/lib/paynow.ts`): a small client for Paynow's form protocol, with the same hash as the official SDK.
  - Owners pay from Billing: a prompt on the phone (EcoCash, OneMoney), a code for the InnBucks app, or Paynow's page ("web", for cards).
  - The Billing screen polls `GET /api/lodge/billing/payments/:id`, which asks Paynow at most every 5 seconds.
  - Paynow also posts to `POST /api/paynow/result`. The hash is checked, then we poll Paynow ourselves with the stored poll URL and check the amount before applying.
  - `applyPayment()` (`lib/billing.ts`) is idempotent: it moves the lodge to the plan paid for, `ACTIVE`, sets `paidUntil` with `paidUntilAfterPayment()` (`packages/sites`: the time left, moved to the new plan at the two monthly prices in whole days rounded down, then the months paid for), closes open invoices, and emails the receipt.
- **Prices** (`packages/sites/src/plans.ts`): `planPrice(plan, months)` is the monthly price times the months, except 12 months, which take `ANNUAL_DISCOUNT` (Starter 10%, Growth 17%, Pro 30%) and round down to whole dollars: $216, $398, $630. Paynow amounts, `mark-paid`, the pay card, Billing and the pricing page all use it.
  - Without `PAYNOW_INTEGRATION_*`, the Paynow buttons are hidden and the merchant codes remain.
- **Merchant codes:** `ECOCASH_MERCHANT_CODE` and `INNBUCKS_MERCHANT_CODE` on the server. `GET /api/lodge/billing` returns the ones that are set, and Billing shows a card for each. With none, it shows "Message us" instead. They're runtime settings, so changing them needs no rebuild.
- **Manual payments:** `pnpm --filter server mark-paid --slug … [--months 3] [--plan pro] [--channel cash]` records one with the same `applyPayment` (receipt included). `--status` sets a status by hand; `--list` shows everyone.
- **The job** (`apps/server/src/jobs/billing.ts`) runs a minute after the server starts and then hourly, under a lease, so only one server runs it. `pnpm --filter server run-billing [--now …]` runs it by hand. Each run:
  1. **Invoices:** for paying lodges within 3 days of `paidUntil`, it makes the next invoice and sends the reminder for the current window (3 days before, the day before, on the day, in Harare dates). Demos get their reminders the day before and on the day.
  2. **Status:** `ACTIVE` → `OVERDUE` → `SUSPENDED`, with the "site offline" email, plus the "demo ended" email.
  3. **Missed callbacks:** it re-checks Paynow payments still pending.
  4. **Clean-up:** it deletes demos never paid for 30 days after they ended (photos, lodge, account).
- **Documents:** `/dashboard/billing/[number]` shows an invoice or receipt, laid out to print or save as PDF (no PDF library). The issuer details (StayZim Platform Inc, stayzim.co.zw, hello@stayzim.co.zw, +263 77 510 1506; no street address yet) are hard-coded in `apps/server/src/lib/business.ts`. They're sent with each document and printed in invoice and receipt emails.

## Meta Pixel (ads)

- The Pixel ID (`1632288361926055`) is hard-coded in `lib/meta-pixel.ts`. In production builds, `components/meta-pixel.tsx` loads Meta's snippet (and its `<noscript>` image) only on StayZim's own pages: the landing page, `/create` and the dashboard. Lodge sites never load it.
- Dev servers never load it, and `NEXT_PUBLIC_META_PIXEL=off` leaves it out of a production build: CI sets that, so browser tests don't report to Meta.
- `metaEvent()` (`lib/meta-pixel.ts`) reports:
  - `PageView`, on each route change;
  - `Contact`, on WhatsApp buttons;
  - `CompleteRegistration`, on email sign-up;
  - `StartTrial`, when a demo is made;
  - `InitiateCheckout` and `Purchase`, with value and currency, on Billing.
- The privacy notice always describes the Pixel.

## Sign-in

- Email and password through better-auth. Owners sign up themselves (above); StayZim can still create accounts with `create-owner`. Details, rules and flows: [auth.md](auth.md).
- **Google:** "Continue with Google" shows when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. It signs in the account with the same email, or creates one (then `/create`). From a guest account it claims the guest's site (back on `/dashboard?claimed=1`). Errors come back to `/login?error=…`.
- **After login:** team accounts (`--admin`) land on `/admin/requests`, owners on `/dashboard`, anyone on a temporary password on `/set-password` first, and an owner without a lodge on `/create`.

## Packages

| Package | What it holds |
| --- | --- |
| `@stayzim/db` | Prisma schema, split by area in `prisma/schema/`, the shared client (`import prisma from "@stayzim/db"`), and the `create-lodge` and `resolve-request` scripts |
| `@stayzim/auth` | better-auth config (`auth`), `MIN_PASSWORD_LENGTH`, `googleSignInEnabled`, and `scripts/create-owner.ts` |
| `@stayzim/sites` | The template catalog and its rules (`templateAllowed`, `effectiveTemplate`, `DEFAULT_TEMPLATE`, `HERO_LIMITS`, `heroText`), plan prices and inclusions (`plans.ts`), slug rules (`slugs.ts`), and billing dates in Zimbabwe time (`billing-dates.ts`). Shared by server, web and scripts. And the CMS content contract (`content/`: limits, amenities, guest-info rules, dates and availability, types; zod schemas at `@stayzim/sites/schemas`) |
| `@stayzim/mail` | `sendEmail()` over SMTP with Nodemailer, `verifyMailConnection()`, and templates: account emails in `templates.ts`; welcome, invoice, receipt, demo ended and site offline in `billing.ts` |
| `@stayzim/env` | Validated env per app: `server`, `web`, `outreach`, `native` |
| `@stayzim/ui` | StayZim design tokens and shadcn-style components on Base UI (buttons, fields, dialogs, sheets, tabs, menus, …) |
| `@stayzim/config` | Base `tsconfig` |

## Data

One Prisma schema, split into files:

| File | Models | Used by |
| --- | --- | --- |
| `auth.prisma` | `User` (with `role` `OWNER` or `ADMIN`, `mustChangePassword`), `Session`, `Account`, `Verification` | server |
| `landing.prisma` | `LandingEvent` | server |
| `lodge.prisma` | `Lodge` (plan, status, `demoEndsAt`, `paidUntil`, own domain, theme, template and hero text, one per owner), `Room`, `Photo` (gallery when `roomId` is null), `ChangeRequest` | server |
| `billing.prisma` | `Invoice`, `Payment`, `BillingNotice` (emails sent), `BillingCounter` (running numbers) | server |
| `site.prisma` | `SiteEvent` (lodge site page views, booking chats and booking requests) | server |
| `booking.prisma` | `Booking` (stays and closed dates, guests' requests, the owner's notes; snapshots of the room name and price) | server |
| `outreach.prisma` | `WhatsappSession`, `Contact`, `OutreachMessage`, `InboundMessage` | outreach |

Both databases get the whole schema; each app only uses its own tables. Changes go through Prisma migrations in `packages/db/prisma/migrations` (`0_init` is the baseline): `pnpm db:migrate` creates one after a schema edit, and `pnpm db:deploy` (or a container start) applies new ones. Databases made with `db push` before then need baselining once (README, [Database changes](../README.md#database-changes)). `prisma generate` runs on every install and works without `DATABASE_URL`.

## Environment

| App | File | Key settings |
| --- | --- | --- |
| server | `apps/server/.env` | `DATABASE_URL`, `CORS_ORIGIN` (comma-separated), `SITES_DOMAIN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_URL`, `COOKIE_DOMAIN`, `GOOGLE_*`, `R2_*`, `SMTP_*`, `PAYNOW_*`, `ECOCASH_MERCHANT_CODE`, `INNBUCKS_MERCHANT_CODE`. See [.env.example](../apps/server/.env.example). |
| web | `apps/web/.env` | `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_SITES_DOMAIN`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_META_PIXEL` (optional, `off` to leave the Pixel out). See [.env.example](../apps/web/.env.example). |
| outreach | `apps/outreach/.env` | `DATABASE_URL`, `OUTREACH_PASSWORD`, `WHATSAPP_*`. See [.env.example](../apps/outreach/.env.example). |

Every `.env` file is gitignored; only the `.env.example` files are committed.

## Docker

| Image | Dockerfile | Base | Runs | Notes |
| --- | --- | --- | --- | --- |
| server | `apps/server/Dockerfile` | `node:22-slim` + Bun | `docker/start.sh` → `bun src/index.ts` | Applies new migrations to `DATABASE_URL` on start. Needs the `R2_*` settings (photos live in R2, so no volume) |
| web | `apps/web/Dockerfile` | `node:22-slim` | `next start` | `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_SITES_DOMAIN` and `NEXT_PUBLIC_WHATSAPP_NUMBER` are build args, baked in at build time |
| outreach | `apps/outreach/Dockerfile` | `node:22-slim` + Bun + Chromium | `docker/start.sh` → `bun src/index.ts` | Applies new migrations to its own database on start |

How they're built:

- **Build context:** the repo root. `.dockerignore` keeps out `node_modules`, `.env` files, designs, docs and WhatsApp scratch folders.
- **Install:** every workspace `package.json` is copied so the lockfile matches, then `pnpm install --frozen-lockfile --filter "<app>..."` installs only that app and its workspace packages. For server and outreach, `packages/db`'s postinstall runs `prisma generate`; nothing connects at build time.
- **Runtime:** Node is the base because pnpm and the Prisma CLI need it; Bun is copied in from `oven/bun:1` and runs the TypeScript entry directly, as in development, so there's no separate bundling step. OpenSSL is installed for Prisma's schema engine.
- **Start:** `docker/start.sh` runs `prisma migrate deploy`, which applies only committed migrations, so nothing changes the database that wasn't reviewed in a migration file. When server and outreach start together, Prisma's lock makes one wait. A database made with `db push` gives P3005: with no accounts or lodges in it, `packages/db/scripts/reset-if-empty.ts` drops its tables and the migrations run from scratch; with data, the container stops with the baselining command. Set `SKIP_DB_MIGRATE=1` to skip it.
- **Users and health:** every container runs as the unprivileged `node` user and has a `HEALTHCHECK` (server `/health`, which also checks the database; web `/`; outreach `/health`).
- **Backups:** `docker/backup.sh` writes a compressed `pg_dump` (custom format) and keeps the newest `KEEP` (14); it prints the `pg_restore` command. A backup and restore of the dev database were checked to give the same row counts. In production, Coolify's scheduled backups to R2 come first ([deployment.md](deployment.md)).
- **Outreach:**
  - Puppeteer's Chromium download is skipped; Debian's `chromium` is used via `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
  - Give it `--shm-size=1g` and about 300 MB of memory per number.
  - Sessions are backed up to Postgres, so no volume is required. A volume on `/app/apps/outreach/.wwebjs_auth` only saves restoring them on restart.

## Production shape

Step by step in [deployment.md](deployment.md).

- `stayzim.co.zw`: apps/web (`www.` and `app.` redirect to it)
- `{slug}.stayzim.co.zw`: lodge sites, also apps/web, via a wildcard DNS record and certificate (see [deployment.md](deployment.md))
- `api.stayzim.co.zw`: apps/server, with `COOKIE_DOMAIN=.stayzim.co.zw` so web and API share the session cookie, and `CORS_ORIGIN=https://stayzim.co.zw`
- `cdn.stayzim.co.zw`: the R2 bucket's public domain, for lodge photos (the hero photo is preloaded: React does it for a high-priority `<img>`)
- Outreach runs on the same VPS but isn't exposed publicly beyond its password-protected pages
