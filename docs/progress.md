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
| Email (SMTP via Nodemailer) | ✅ Built, needs SMTP credentials |
| Owner dashboard (overview, lodge info, rooms, gallery) | ✅ Built |
| Photo storage (Cloudflare R2) | ✅ Built, needs R2 credentials |
| Shared UI components (packages/ui) | ✅ Built |
| Lodge sites ({slug}.stayzim.co.zw) | ⬜ Not started |
| Owner analytics | 🟡 Screen built; waits for visit tracking on lodge sites |
| Billing screen | ✅ Built, payment details are placeholders |
| Shared states (suspended, 404, locked features) | 🟡 Dashboard side done (errors, loading, locked analytics); lodge-site pages not started |
| Mobile app (apps/native) | ⬜ Scaffold only |
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

- [ ] S1–S9 Hero, rooms with WhatsApp booking, gallery, map, contact, sticky button, visit tracking, under 1.5 MB

### Analytics (Screen 5) and Billing (Screen 6)

- [ ] N1–N2 Visits table and totals (screen and stat cards built; no visit data until lodge sites record visits)
- [x] N3 Locked preview for Starter, with an upgrade button
- [x] N4 Empty state with Copy link and Share on WhatsApp
- [ ] N5 Owner visits excluded (with visit tracking)
- [x] B1–B5 Plan, status pill and due date, how to pay, "I have paid" and plan-change WhatsApp buttons
- [x] B6 Overdue and suspended warnings
- [ ] Real Paynow link and EcoCash/InnBucks merchant codes (`apps/web/src/lib/billing.ts`)

### Shared states

- [ ] X1 Suspended site page
- [ ] X2 Unknown lodge 404
- [x] X3–X5 Save errors, loading skeletons and spinners, locked features (dashboard)

## Next up

1. **Lodge site renderer** for `{slug}.stayzim.co.zw`, starting with the three demo lodges. The data is ready (lodge, rooms, photos, theme).
2. **Visit tracking** on lodge sites (S8), then wire it into `visitStats()` in `apps/web/src/lib/stats.ts` so the overview and Analytics show real numbers (N1, N2, N5).
3. **Suspended and 404 pages** for lodge sites (X1, X2).
4. **Deployment:**
   - Create the R2 bucket with a public custom domain (e.g. `media.stayzim.co.zw`) and set the `R2_*` variables.
   - Build and run the three Docker images on a machine with Docker; none have been built yet.
   - VPS, wildcard subdomains, HTTPS, `COOKIE_DOMAIN=.stayzim.co.zw`.
   - Let `CORS_ORIGIN` accept both `stayzim.co.zw` and `app.stayzim.co.zw`.
   - Switch from `db push` to migrations.

## Blocked on / needs a decision

- **SMTP credentials** for hello@stayzim.co.zw (Spacemail), to send real reset emails.
- **Cloudflare R2** bucket, API token and public domain for lodge photos.
- **Payment details:** the Paynow link and the EcoCash and InnBucks merchant codes for the Billing screen.
- **Sales WhatsApp number** for the landing page.
- **First real demo lodge** (photos and content).
- The open questions in [project.md](project.md#open-questions).

## Log

Newest first. One line per piece of work that landed on `main`.

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
