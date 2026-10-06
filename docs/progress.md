# Progress

_What's built, what's next, and what's blocking. Update this file whenever a piece of work lands. For what StayZim is and why, see [project.md](project.md)._

**Last updated:** 6 October 2026

## At a glance

| Area | Status |
| --- | --- |
| Marketing landing page | ✅ Built |
| Landing page analytics (CTA clicks, page views) | ✅ Built |
| WhatsApp outreach tool (internal) | ✅ Built |
| Owner sign-in (login, reset, first-login password) | ✅ Built, matches the app screens design |
| Sign in with Google | ✅ Built (links to existing owners only), needs a Google OAuth client to test for real |
| Email (SMTP via Nodemailer) | ✅ Built, needs SMTP credentials |
| Owner dashboard (overview, lodge info, rooms, gallery) | ✅ Built |
| Photo storage (Cloudflare R2) | ✅ Built, needs R2 credentials |
| Shared UI components (packages/ui) | ✅ Built |
| Lodge sites ({slug}.stayzim.co.zw) | 🟡 Rendering, subdomain routing, tracking, suspended and 404 pages built. Templates: catalog, schema and API done; dashboard Design screen and preview route not started |
| Site templates (9, 3 per plan) | 🟡 In progress, see [Handoff](#handoff-6-october-2026) |
| Change requests | 🟡 API and script done; dashboard screen not started |
| Owner analytics | 🟡 Tracking and stats API built; dashboard still shows zeros until wired to the API |
| Billing screen | ✅ Built, payment details are placeholders |
| Shared states (suspended, 404, locked features) | ✅ Suspended and unknown-lodge pages on sites; dashboard errors, loading, locked analytics |
| UX pass (back, loading, disabled states) | ⬜ Planned, see Handoff |
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
- [ ] Demo lodge sites live at mistvalley., msasaridge. and lakeview.stayzim.co.zw
- [ ] Sales WhatsApp number set (`NEXT_PUBLIC_WHATSAPP_NUMBER`)
- [ ] Privacy and Terms pages

### Login (Screen 3)

- [x] A1 Email and password sign-in; wrong details say "Email or password is wrong" without saying which
- [x] A2 Sessions last 30 days on the same device
- [x] A3 Temporary password forces a new 8+ character password before the dashboard opens
- [x] A4 Reset link by email, valid 1 hour, same message whether or not the email exists
- [x] A5 Log out
- [x] A6 5 failed sign-ins in 10 minutes pauses sign-in for 10 minutes
- [x] Accounts created by StayZim only (`create-owner` script); public sign-up disabled
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

### Lodge site (Screen 2)

- [x] S1–S7 Hero, rooms with a pre-filled Book on WhatsApp per room, gallery with lightbox, map embed, contact, sticky booking button on phones ("Classic" template)
- [x] S8 Visit tracking: page views and Book on WhatsApp taps (`site_event`), owner and staff visits skipped
- [ ] S9 Under 1.5 MB: not measured yet (server-rendered; photos are lazy and resized to 1600px)
- [ ] Templates: see Handoff

### Analytics (Screen 5) and Billing (Screen 6)

- [ ] N1–N2 Visits table and totals: API done (`/api/lodge/stats`, `/visits`, `/activity`); dashboard not wired yet
- [x] N3 Locked preview for Starter, with an upgrade button
- [x] N4 Empty state with Copy link and Share on WhatsApp
- [x] N5 Owner visits excluded (server skips events from the owner's or an admin's session; works in production where cookies are shared on .stayzim.co.zw)
- [x] B1–B5 Plan, status pill and due date, how to pay, "I have paid" and plan-change WhatsApp buttons
- [x] B6 Overdue and suspended warnings
- [ ] Real Paynow link and EcoCash/InnBucks merchant codes (`apps/web/src/lib/billing.ts`)

### Shared states

- [x] X1 Suspended site page
- [x] X2 Unknown lodge 404 (and unknown paths on a lodge site)
- [x] X3–X5 Save errors, loading skeletons and spinners, locked features (dashboard)

## Next up

The order to work in. Details for each are in the Handoff below.

1. **Templates, dashboard side:** Design screen (pick, preview, apply, hero text) and the preview route.
2. **Change requests screen** in the dashboard.
3. **Wire real visit stats** into the overview, Analytics (visits table) and the activity card.
4. **UX pass** across the app: back, loading, pending and disabled states, unsaved-changes guard, offline banner, error and not-found pages.
5. **Docs:** architecture.md and README for templates, change requests, Google sign-in and the sites domain.
6. **Deployment on Coolify:** the user wants to discuss subdomain provisioning once the features are done. Notes below.
7. **Real template designs,** when the user adds the design files to `designs/`.

## Handoff (6 October 2026)

Written at the end of a session so the next agent can continue. Everything listed as done is committed on `main` and type-checks (`pnpm check-types`).

The user's rules:

- Work on `main`, one commit per small task, and never add a Co-Authored-By line.
- Add subtle framer-motion animations wherever they fit, all off with "reduce motion".
- Web and server only; ignore apps/native.

### Local setup that differs from the examples

- **Sites domain:**
  - `apps/server/.env` has `SITES_DOMAIN=localhost:9999` and `apps/web/.env` has `NEXT_PUBLIC_SITES_DOMAIN=localhost:9999`.
  - Lodge sites open at `http://{slug}.localhost:9999` (Chrome resolves `*.localhost`).
- **Test owner:** `rudo@mistvalley.test`, with lodge `mistvalley` (Growth trial, 4 rooms, 5 gallery photos). Reset its password with `pnpm --filter @stayzim/auth create-owner --email rudo@mistvalley.test --reset`.
- **Photos** are on local disk (`apps/server/uploads`), because R2 isn't configured locally.
- **`AGENTS.md`** at the repo root is written by turbo. It's untracked on purpose; ask the user before committing it.

### Done this session (beyond the log below)

#### Google sign-in (`packages/auth/src/index.ts`)

- better-auth's Google provider with `disableSignUp: true`, and account linking with Google as a trusted provider. It signs in the existing owner with the same (verified) email and never creates users.
- A database hook: when an owner still on a temporary password first links Google, the temporary password is replaced with a random one and `mustChangePassword` is cleared. Tested with a throwaway user.
- `GET /api/account/sign-in-options` tells the login screen whether to show "Continue with Google" (`apps/web/src/components/auth/google-button.tsx`).
- Errors come back to `/login?error=…`; `oauthErrorMessage` in `auth-client.ts` handles `signup_disabled`, `account_not_linked` and `access_denied`.
- **Verified:** the button is hidden without config and shown with it; the authorization URL is correct (redirect `…/api/auth/callback/google`, `prompt=select_account`).
- **Not verified:** a real Google round trip. That needs a real OAuth client; setup steps are in `apps/server/.env.example`.

#### CORS

- `CORS_ORIGIN` is now a comma-separated list.
- Any `{slug}.SITES_DOMAIN` origin is also allowed (`apps/server/src/lib/sites.ts`), so lodge sites can post visits with cookies.

#### Lodge sites

- `apps/web/src/proxy.ts`:
  - rewrites `{slug}.SITES_DOMAIN` to `/sites/{slug}`;
  - sends `/sites/x` on the main domain to the subdomain;
  - still guards `/dashboard`.
- Reserved subdomains are listed in three places; keep them in sync:
  - `apps/web/src/lib/site-host.ts`
  - `apps/server/src/lib/sites.ts`
  - `packages/db/scripts/create-lodge.ts`
- Content comes from `GET /api/sites/:slug`: public, no plan or owner data, fresh on every request.
- Suspended lodges get `SuspendedSite` and unknown ones `UnknownSite` (`components/site/site-states.tsx`).

#### Tracking

- `POST /api/sites/:slug/events` (rate-limited to 60/min per IP) records `PAGE_VIEW` and `BOOKING_CHAT` in `site_event`, with:
  - device and browser from the user agent;
  - the IP;
  - the country from Cloudflare's `CF-IPCountry` header (null without Cloudflare).
- It skips events from the owner's and admins' sessions.
- Client: `components/site/tracking.tsx` (`SiteTracking` context, `PageViewTracker`, `BookLink`); the visitor id lives in localStorage.

#### Owner stats API (`apps/server/src/routes/stats.ts`)

Growth and Pro only; Starter gets a 403. Days are Zimbabwe time (UTC+2).

- `GET /api/lodge/stats?period=today|7d|30d|90d`: visits today and yesterday, the period against the one before, booking chats, top countries, and chart buckets with an ISO `start`.
- `GET /api/lodge/visits?page&pageSize&where=all|zw|abroad&device&type`
- `GET /api/lodge/activity`: the latest 6 events.

#### Templates and change requests, server side

- **Templates** (spec below). Done: the `packages/sites` catalog, the schema fields, PATCH validation, `template` and `hero` in the public API, and the web registry rendering all 9.
- **Change requests:**
  - `GET/POST /api/lodge/requests`.
  - `pnpm --filter @stayzim/db resolve-request --list`, or `--ref R-XXXX --status open|in-progress|done|declined [--reply "…"]`.

### Spec: site templates

Agreed with the user:

- **9 templates, 3 per plan.**
  - The plan sets design quality and motion: Starter is static (`none`), Growth `subtle`, Pro `rich`.
  - Catalog: `packages/sites/src/index.ts`. Keys: `starter-clear|simple|compact`, `growth-classic|panorama|journal`, `pro-signature|safari|horizon`.
  - Only `growth-classic` has a real design so far (`apps/web/src/components/site/templates/classic.tsx`). The other 8 are plain placeholders from one configurable component (`templates/basic.tsx`, configs in `templates/index.tsx`).
  - The user will add real design files later. When they arrive, give each template its own file and remove its `BASIC` entry.
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

To do (web):

1. **Preview route** `apps/web/src/app/preview/[slug]/[template]/page.tsx`:
   - A server component: `getSite(slug)`, then override `site.template` with the param. Allow any template, including locked ones, so owners can see what they'd get.
   - Render `<SiteTemplate site={site} preview />`, which turns tracking off. `SiteTemplate` already supports `preview`.
   - Set `robots: noindex`.
   - Add a slim top banner, "Preview: {name} template" (dismissable is fine).
   - Check `src/proxy.ts` leaves `/preview` alone (it only touches `/sites`).
2. **Design screen** `apps/web/src/app/dashboard/design/page.tsx`, linked under My site. Add it to the `navLinks` children in `components/dashboard/nav.ts`, to `breadcrumb()`, and to the phone `SitePagesNav` pills.
   - **Hero text card:**
     - Two fields with counters (`Field` `count`), with placeholders showing the template's default (`fillCopy(template.defaults.*, …)`).
     - "Reset to template text", and Save/Discard with `useLodge().save("", "PATCH", {...})`.
     - A live hero mock as they type: reuse `components/dashboard/site-preview.tsx`, which takes name, place and description, and extend it with headline and subline.
   - **Template gallery,** grouped by plan (Starter, Growth, Pro). Each card has:
     - a coloured thumbnail (or an iframe snapshot later), the name, description and a plan badge;
     - "Live" on the current template;
     - a lock and "Upgrade to Pro" on templates above the plan (WhatsApp via `stayzimChatUrl`).
   - **Preview:**
     - A Sheet or Dialog with `<iframe src="/preview/{slug}/{key}">` and a Phone/Desktop width toggle (Tabs).
     - "Use this template", disabled with a reason when the template is locked or already live.
     - Apply with `save("", "PATCH", { template })`, then a toast with Undo.
   - **Animations:** stagger the cards (`Appear`/`Item`) and slide a `layoutId` ring onto the live template.
3. **Classic and basic templates:** the `Motion` wrapper in `basic.tsx` uses `Reveal`. Keep Starter templates free of motion.

### Spec: change requests

- **Model** `ChangeRequest`:
  - `reference`, like `R-7K2Q`;
  - `topic`: TEXT, PHOTOS, ROOMS, DESIGN or OTHER;
  - `message`, 10–1000 characters;
  - `status`: OPEN, IN_PROGRESS, DONE or DECLINED;
  - `reply` and `resolvedAt`.
  - At most 10 open per lodge (429).
- **To do (web):** `apps/web/src/app/dashboard/requests/page.tsx`, in the nav under My site as "Change requests" (or top level).
  - **Form:** topic as `Toggle` chips, a message `Textarea` with a count, and Send.
  - **On success:** open WhatsApp to StayZim pre-filled with "Change request R-XXXX for {lodge}: {message}" (`stayzimChatUrl`), and show a toast.
  - **List:**
    - newest first;
    - a status `Badge` (Open purple, In progress brand, Done success, Declined neutral);
    - StayZim's reply under the message, and dates via `lib/format.ts`;
    - an empty state.
  - **Entry points:** point the sidebar's "Need a change? Message us" card and the Lodge info and Design screens at it ("Need something else changed? Request it").

### Spec: wire real visit stats

- **Data hook:** replace `visitStats()` in `apps/web/src/lib/stats.ts` with a hook (e.g. `useVisitStats(period)`) that calls `api("/api/lodge/stats?period=…")`.
  - Turn `chart[].start` into labels the way `chartSlots()` does (`formatWeekday`, `formatClock`, `formatDate`).
  - Keep `tracking: true` from the server, and show skeletons while loading.
- **Starter:** the API answers 403. On the overview, replace the stat cards and chart with an upgrade card; Analytics already shows the locked preview.
- **Countries:**
  - The server sends codes, plus "Other"; show names with `Intl.DisplayNames(["en"], { type: "region" })`.
  - Without Cloudflare in front, countries are empty: show "Not known".
- **Analytics visits table** (from the design):
  - Filters: All, Zimbabwe, Outside Zimbabwe; Device; Activity (booking chat).
  - Columns: Date (`formatWhen`), Country, Page, Device, IP and an Activity badge.
  - Previous/Next pagination, with "Total N visits".
  - A list instead of the table on phones.
  - A 90-day period (the API supports `90d`; add it to `PERIODS` or a local list).
- **Overview activity card:** merge `/api/lodge/activity` ("Visit from {country}", "Booking chat started · {room}") with the content changes it shows today.

### Spec: UX pass (asked for across the whole app)

- **Back:**
  - A back link at the top of sub-screens on phones: "‹ My site" on Lodge info, Rooms, Gallery, Design and Requests, as in the design.
  - Use `router.back()` when there's history, otherwise the parent route.
  - Auth screens already have "Back to log in".
- **Signed in on /login:** visitors who already have a session go straight to `/dashboard` (check `authClient.useSession()`).
- **Navigation feedback:**
  - A thin Kariba progress bar at the top during route changes.
  - Next's `useLinkStatus` for a spinner on the sidebar or bottom-nav item being opened.
- **Unsaved changes:** on Lodge info, Design and the room sheet, intercept in-app link clicks while there are edits and confirm with an `AlertDialog` ("Discard your changes?"). `beforeunload` already covers Lodge info.
- **Disabled states that explain themselves:**
  - "Save changes" disabled → tooltip "No changes to save".
  - Upload disabled at the limit → "The gallery holds up to 30 photos".
  - Locked templates → "Comes with Pro".
  - Rows busy deleting or reordering show a spinner and fade.
  - "Saving order…" text while a reorder saves.
- **Offline:** a banner when `navigator.onLine` is false ("You're offline. Changes won't save until you're back."), with Save buttons disabled while offline.
- **Errors:** `app/not-found.tsx` (StayZim-branded), and `app/dashboard/error.tsx` and `app/global-error.tsx` with Try again.
- **Forms:** disable the fieldset while a form submits, everywhere (login already does).

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
- The open questions in [project.md](project.md#open-questions).

## Log

Newest first. One line per piece of work that landed on `main`.

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
