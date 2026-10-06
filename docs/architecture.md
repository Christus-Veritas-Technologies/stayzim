# Architecture

How the pieces of the StayZim monorepo fit together. For setup, see the [README](../README.md).

## Overview

```
 Browser (phone first)
   │
   ├── stayzim.co.zw ─────────────┐
   ├── app.stayzim.co.zw ─────────┤  apps/web (Next.js 16)
   │                              │    landing page, /login, /dashboard
   │                              │
   │   fetch, with session cookie ▼
   └────────────────────────▶ apps/server (Hono on Bun) :9998
                                │  /api/auth/*      better-auth
                                │  /api/account/*   signed-in user
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

- `/` is the landing page, built from `designs/StayZim Landing Page.html`. Sections live in `src/components/landing/`; copy and sample data in `content.ts`.
- Animations use framer-motion with `MotionConfig reducedMotion="user"`, so the OS setting turns them off.
- Every call to action opens WhatsApp with a pre-written message (`src/lib/whatsapp.ts`) and records a click (`src/lib/track.ts`).
- `/login`, `/forgot-password`, `/reset-password`, `/set-password` are the owner account screens, in the `(auth)` route group.
- `/dashboard/*` is the owner dashboard, built from `designs/StayZim App Screens.html`: overview, `site` (lodge info), `rooms`, `gallery`, `analytics`, `billing`.
  - `DashboardShell` (`src/components/dashboard/shell.tsx`) checks the session, loads the lodge through `LodgeProvider`, and lays out the sidebar and white panel (desktop) or header and bottom bar (phones).
  - `LodgeProvider` loads `GET /api/lodge` once. Every lodge route answers with the whole lodge, so `save()` just swaps it in and every screen stays current.
  - Photos are resized on the device (`src/lib/images.ts`) and uploaded one at a time with progress (`use-photo-uploads.ts`).
  - Visit numbers come from `visitStats()` in `src/lib/stats.ts`, all zeros until lodge sites record visits.
- `src/proxy.ts` redirects requests without a session cookie away from `/dashboard` and `/set-password`. The pages check the session again.
- Screens build on the shared components in `packages/ui` (`@stayzim/ui/components/*`). Colours, shadows and fonts are tokens in `packages/ui/src/styles/globals.css`. Fonts load with `next/font`: Familjen Grotesk, Instrument Sans, Newsreader.
- Motion helpers (`src/components/motion.tsx`) are shared by the landing page and the dashboard. `MotionConfig reducedMotion="user"` turns them off with the OS setting.

### apps/server: Hono on Bun, port 9998

| Route | Purpose |
| --- | --- |
| `GET/POST /api/auth/*` | better-auth: sign in and out, session, password reset |
| `GET /api/account/me` | The signed-in user and a short summary of their lodge |
| `POST /api/account/set-password` | Change password (first login or later); lifts the temporary-password block |
| `POST /api/landing/events` | Landing page views and CTA clicks. Public, validated, 60 requests/minute per IP |
| `GET/PATCH /api/lodge` | The owner's lodge with rooms and photos; edit info, location and look |
| `POST /api/lodge/map-location` | Coordinates from a Google Maps link (follows Google's own redirects only) |
| `POST/DELETE /api/lodge/logo`, `POST /api/lodge/shared` | Logo upload; mark the link as shared (setup checklist) |
| `/api/lodge/rooms` | `POST`, `PATCH /:id`, `DELETE /:id`, `PUT /order` |
| `/api/lodge/photos` | `POST` (multipart, one photo), `PATCH /:id` (caption), `DELETE /:id`, `PUT /order` |

- **CORS:** allows only `CORS_ORIGIN` (the web app), with credentials, so the session cookie is sent.
- **Mail check at boot:** if SMTP is configured, the server checks the connection on startup and logs the result.
- **Lodge routes** need a signed-in owner with their own password and a lodge (`requireLodge` in `src/lib/lodge.ts`, 404 until StayZim creates it). Each answers with the whole lodge (`lodgeJson`).
- **Photos** (`src/lib/uploads.ts`): JPG, PNG or WebP (checked by file signature), 5 MB at most, stored in Cloudflare R2 through Bun's built-in S3 client and served from the bucket's public URL. Without the `R2_*` settings (development), they go to `UPLOAD_DIR` and this server serves them at `/uploads`; production refuses to start without R2. The storage in use is logged at boot.

### apps/outreach: Hono on Bun, port 9997

Internal tool for messaging leads on WhatsApp from 3 numbers, with daily limits per number, reply tracking and opt-outs. It has its own database (`stayzim-outreach`), its own password, and server-rendered admin pages. Full reference: [apps/outreach/API.md](../apps/outreach/API.md).

### apps/native: Expo

Scaffold from the starter template. Not part of the MVP yet.

## Packages

| Package | What it holds |
| --- | --- |
| `@stayzim/db` | Prisma schema, split by area in `prisma/schema/`, the shared client (`import prisma from "@stayzim/db"`), and `scripts/create-lodge.ts` |
| `@stayzim/auth` | better-auth config (`auth`), `MIN_PASSWORD_LENGTH`, and `scripts/create-owner.ts` |
| `@stayzim/mail` | `sendEmail()` over SMTP with Nodemailer, `verifyMailConnection()`, and templates in `templates.ts` |
| `@stayzim/env` | Validated env per app: `server`, `web`, `outreach`, `native` |
| `@stayzim/ui` | StayZim design tokens and shadcn-style components on Base UI (buttons, fields, dialogs, sheets, tabs, menus, …) |
| `@stayzim/config` | Base `tsconfig` |

## Data

One Prisma schema, split into files:

| File | Models | Used by |
| --- | --- | --- |
| `auth.prisma` | `User` (with `role`, `mustChangePassword`), `Session`, `Account`, `Verification` | server |
| `landing.prisma` | `LandingEvent` | server |
| `lodge.prisma` | `Lodge` (plan, status, trial, theme, one per owner), `Room`, `Photo` (gallery when `roomId` is null) | server |
| `outreach.prisma` | `WhatsappSession`, `Contact`, `OutreachMessage`, `InboundMessage` | outreach |

Both databases get the whole schema; each app only uses its own tables. There are no migrations yet; `pnpm db:push` applies the schema. Switch to `prisma migrate` before the first production deploy.

## Environment

| App | File | Key settings |
| --- | --- | --- |
| server | `apps/server/.env` | `DATABASE_URL`, `CORS_ORIGIN`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `WEB_URL`, `COOKIE_DOMAIN`, `R2_*`, `SMTP_*`. See [.env.example](../apps/server/.env.example). |
| web | `apps/web/.env` | `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`. See [.env.example](../apps/web/.env.example). |
| outreach | `apps/outreach/.env` | `DATABASE_URL`, `OUTREACH_PASSWORD`, `WHATSAPP_*`. See [.env.example](../apps/outreach/.env.example). |

Every `.env` file is gitignored; only the `.env.example` files are committed.

## Docker

| Image | Dockerfile | Base | Runs | Notes |
| --- | --- | --- | --- | --- |
| server | `apps/server/Dockerfile` | `node:22-slim` + Bun | `docker/start.sh` → `bun src/index.ts` | Applies the schema to `DATABASE_URL` on start. Needs the `R2_*` settings (photos live in R2, so no volume) |
| web | `apps/web/Dockerfile` | `node:22-slim` | `next start` | `NEXT_PUBLIC_SERVER_URL` and `NEXT_PUBLIC_WHATSAPP_NUMBER` are build args, baked in at build time |
| outreach | `apps/outreach/Dockerfile` | `node:22-slim` + Bun + Chromium | `docker/start.sh` → `bun src/index.ts` | Applies the schema to its own database on start |

How they're built:

- **Build context:** the repo root. `.dockerignore` keeps out `node_modules`, `.env` files, designs, docs and WhatsApp scratch folders.
- **Install:** every workspace `package.json` is copied so the lockfile matches, then `pnpm install --frozen-lockfile --filter "<app>..."` installs only that app and its workspace packages. For server and outreach, `packages/db`'s postinstall runs `prisma generate` against a placeholder `DATABASE_URL`; nothing connects at build time.
- **Runtime:** Node is the base because pnpm and the Prisma CLI need it; Bun is copied in from `oven/bun:1` and runs the TypeScript entry directly, as in development, so there's no separate bundling step. OpenSSL is installed for Prisma's schema engine.
- **Start:** `docker/start.sh` runs `prisma db push` without `--accept-data-loss`. A schema change that would drop data stops the container instead of deleting rows. Set `SKIP_DB_PUSH=1` to skip it. Move to `prisma migrate deploy` once migrations exist.
- **Users and health:** every container runs as the unprivileged `node` user and has a `HEALTHCHECK` (server `/`, web `/`, outreach `/health`).
- **Outreach:**
  - Puppeteer's Chromium download is skipped; Debian's `chromium` is used via `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`.
  - Give it `--shm-size=1g` and about 300 MB of memory per number.
  - Sessions are backed up to Postgres, so no volume is required. A volume on `/app/apps/outreach/.wwebjs_auth` only saves restoring them on restart.

## Production shape (planned)

- `stayzim.co.zw` and `app.stayzim.co.zw`: apps/web
- `media.stayzim.co.zw`: the R2 bucket's public domain, for lodge photos
- `api.stayzim.co.zw`: apps/server, with `COOKIE_DOMAIN=.stayzim.co.zw` so web and API share the session cookie
- `{slug}.stayzim.co.zw`: lodge sites, via a wildcard DNS record and certificate
- Outreach runs on the same VPS but isn't exposed publicly beyond its password-protected pages
- **To do before launch:** `CORS_ORIGIN` accepts a single origin today. Both `stayzim.co.zw` (landing events) and `app.stayzim.co.zw` (login) call the API, so it needs to accept a list.
