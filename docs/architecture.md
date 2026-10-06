# Architecture

How the pieces of the StayZim monorepo fit together. For setup, see the [README](../README.md).

## Overview

```
 Browser (phone first)
   │
   ├── stayzim.co.zw ─────────────┐
   ├── app.stayzim.co.zw ─────────┤  apps/web (Next.js 16)
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
- **The main domain** (`stayzim.co.zw`, `app.stayzim.co.zw`) serves the landing page, login, dashboard and team screens. Requests without a session cookie are sent to `/login` before any `/dashboard`, `/set-password` or `/admin` code loads; the pages check the session again.

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
| `/sites/[slug]` | A lodge site (reached through its subdomain) |
| `/preview/[slug]/[template]` | A lodge site in any template, for the Design screen. `noindex`, tracking off |

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
| `UnsavedChangesGuard` | `src/components/dashboard/unsaved-changes.tsx` | "Discard your changes?" before an in-app link leaves a form with edits, plus the browser's prompt on reload. The room sheet asks before closing |
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
| `POST /api/sites/:slug/events` | Page views and Book on WhatsApp taps from lodge sites. 60/minute per IP; skips the owner's and the team's own visits |
| `GET /api/admin/requests?status=open\|done\|all`, `PATCH /api/admin/requests/:id` | Team only: list requests across lodges, set status and reply |

- **CORS:** allows the `CORS_ORIGIN` list (comma-separated web origins) and any `{slug}.SITES_DOMAIN` origin (lodge sites report visits), with credentials, so the session cookie is sent.
- **Mail check at boot:** if SMTP is configured, the server checks the connection on startup and logs the result.
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
- **Reserved subdomains** (`www`, `app`, `api`, `admin`, `media`, …) are listed in three places; keep them in sync: `apps/web/src/lib/site-host.ts`, `apps/server/src/lib/sites.ts` and `packages/db/scripts/create-lodge.ts`.
- **Rendering:** `/sites/[slug]` fetches `GET /api/sites/:slug` on every request (owners' edits show straight away) and renders `<SiteTemplate>`. Suspended lodges get `SuspendedSite`; unknown ones `UnknownSite`.
- **Tracking:** `components/site/tracking.tsx` posts page views and Book on WhatsApp taps, with a random visitor id kept in `localStorage`. The server adds device and browser (user agent), IP and country (Cloudflare's `CF-IPCountry`, so countries are empty until the sites sit behind Cloudflare). Owners see visits on Growth and Pro.
- **Footer:** "Made with StayZim" and a Privacy link back to the main site (`MAIN_URL`).

### Templates

- **Catalog** (`packages/sites`): 9 templates, 3 per plan (`starter-clear|simple|compact`, `growth-classic|panorama|journal`, `pro-signature|safari|horizon`). The plan sets the motion level: Starter `none`, Growth `subtle`, Pro `rich`.
- **Access is cumulative** (`templateAllowed`): a plan can use its own templates and every lower plan's. `PATCH /api/lodge` refuses higher ones (403, "Signature comes with the Pro plan").
- **Downgrades:** `LodgeJson.template` is the owner's pick; `siteTemplate` is what's live (`effectiveTemplate()`: the pick if the plan allows it, else the plan's `DEFAULT_TEMPLATE`). The Design screen says so and offers the upgrade.
- **Hero text:** owners can set the headline (60 characters) and the line under it (140). Stored once on the lodge (`heroHeadline`, `heroSubline`), so switching templates keeps them; empty means the template's default copy, with `{name}` and `{place}` filled in (`heroText()`, `fillCopy()`).
- **Web registry** (`components/site/templates/index.tsx`): `growth-classic` has its own design (`classic.tsx`); the other 8 are placeholders from one configurable component (`basic.tsx`, looks in `looks.ts`, which the Design screen's thumbnails also read). When real designs arrive, give each template its own file and remove its placeholder look.
- **Design screen** (`/dashboard/design`): hero text with a live phone preview; templates grouped by plan with thumbnails, a sliding "Live" ring, and locked cards with "Upgrade to {plan}"; a preview sheet with the real site in an iframe (`/preview/{slug}/{key}`, Phone and Desktop widths); "Use this template" applies it at once, with Undo in the toast.

## Change requests

Anything owners can't change themselves goes through change requests.

1. **Owner** (`/dashboard/requests`): picks a topic (Words, Photos, Rooms, Design, Something else), writes the message (10–1000 characters) and sends it. The request gets a reference like `R-7K2Q`, and the owner can pass it on to StayZim on WhatsApp in one tap.
2. **Team** (`/admin/requests`): the Waiting list (open and in progress, oldest first). Set the status and write a reply; Message {owner} opens WhatsApp to the lodge's number.
3. **Owner** sees the status badge (Open, In progress, Done, Declined) and the team's reply under their request.

The `resolve-request` script does the same from a terminal (`pnpm --filter @stayzim/db resolve-request --list`, or `--ref R-XXXX --status done --reply "…"`).

## Sign-in

- Email and password through better-auth. There's no public sign-up; StayZim creates accounts with `create-owner`. Details, rules and flows: [auth.md](auth.md).
- **Google:** "Continue with Google" shows when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set. It signs in the existing account with the same (verified) email and never creates one. Errors come back to `/login?error=…`.
- **After login:** team accounts (`--admin`) land on `/admin/requests`, owners on `/dashboard`, and anyone on a temporary password on `/set-password` first.

## Packages

| Package | What it holds |
| --- | --- |
| `@stayzim/db` | Prisma schema, split by area in `prisma/schema/`, the shared client (`import prisma from "@stayzim/db"`), and the `create-lodge` and `resolve-request` scripts |
| `@stayzim/auth` | better-auth config (`auth`), `MIN_PASSWORD_LENGTH`, `googleSignInEnabled`, and `scripts/create-owner.ts` |
| `@stayzim/sites` | The template catalog and its rules: plans, `templateAllowed`, `effectiveTemplate`, `DEFAULT_TEMPLATE`, `HERO_LIMITS`, `heroText`, `fillCopy`. Shared by server and web |
| `@stayzim/mail` | `sendEmail()` over SMTP with Nodemailer, `verifyMailConnection()`, and templates in `templates.ts` |
| `@stayzim/env` | Validated env per app: `server`, `web`, `outreach`, `native` |
| `@stayzim/ui` | StayZim design tokens and shadcn-style components on Base UI (buttons, fields, dialogs, sheets, tabs, menus, …) |
| `@stayzim/config` | Base `tsconfig` |

## Data

One Prisma schema, split into files:

| File | Models | Used by |
| --- | --- | --- |
| `auth.prisma` | `User` (with `role` `OWNER` or `ADMIN`, `mustChangePassword`), `Session`, `Account`, `Verification` | server |
| `landing.prisma` | `LandingEvent` | server |
| `lodge.prisma` | `Lodge` (plan, status, trial, theme, template and hero text, one per owner), `Room`, `Photo` (gallery when `roomId` is null), `ChangeRequest` | server |
| `site.prisma` | `SiteEvent` (lodge site page views and booking chats) | server |
| `outreach.prisma` | `WhatsappSession`, `Contact`, `OutreachMessage`, `InboundMessage` | outreach |

Both databases get the whole schema; each app only uses its own tables. Changes go through Prisma migrations in `packages/db/prisma/migrations` (`0_init` is the baseline): `pnpm db:migrate` creates one after a schema edit, and `pnpm db:deploy` (or a container start) applies new ones. Databases made with `db push` before then need baselining once (README, [Database changes](../README.md#database-changes)). `prisma generate` runs on every install and works without `DATABASE_URL`.

## Environment

| App | File | Key settings |
| --- | --- | --- |
| server | `apps/server/.env` | `DATABASE_URL`, `CORS_ORIGIN` (comma-separated), `SITES_DOMAIN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_URL`, `COOKIE_DOMAIN`, `GOOGLE_*`, `R2_*`, `SMTP_*`. See [.env.example](../apps/server/.env.example). |
| web | `apps/web/.env` | `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_SITES_DOMAIN`, `NEXT_PUBLIC_WHATSAPP_NUMBER`. See [.env.example](../apps/web/.env.example). |
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
- **Start:** `docker/start.sh` runs `prisma migrate deploy`, which applies only committed migrations, so nothing changes the database that wasn't reviewed in a migration file. When server and outreach start together, Prisma's lock makes one wait. A database made with `db push` stops the container with P3005 and the baselining command. Set `SKIP_DB_MIGRATE=1` to skip it.
- **Users and health:** every container runs as the unprivileged `node` user and has a `HEALTHCHECK` (server `/`, web `/`, outreach `/health`).
- **Outreach:**
  - Puppeteer's Chromium download is skipped; Debian's `chromium` is used via `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
  - Give it `--shm-size=1g` and about 300 MB of memory per number.
  - Sessions are backed up to Postgres, so no volume is required. A volume on `/app/apps/outreach/.wwebjs_auth` only saves restoring them on restart.

## Production shape (planned)

- `stayzim.co.zw` and `app.stayzim.co.zw`: apps/web
- `{slug}.stayzim.co.zw`: lodge sites, also apps/web, via a wildcard DNS record and certificate (see the deployment notes in [progress.md](progress.md))
- `api.stayzim.co.zw`: apps/server, with `COOKIE_DOMAIN=.stayzim.co.zw` so web and API share the session cookie, and `CORS_ORIGIN=https://app.stayzim.co.zw,https://stayzim.co.zw`
- `media.stayzim.co.zw`: the R2 bucket's public domain, for lodge photos
- Outreach runs on the same VPS but isn't exposed publicly beyond its password-protected pages
