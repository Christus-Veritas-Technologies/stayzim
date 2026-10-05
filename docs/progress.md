# Progress

_What's built, what's next, and what's blocking. Update this file whenever a piece of work lands. For what StayZim is and why, see [project.md](project.md)._

**Last updated:** 5 October 2026

## At a glance

| Area | Status |
| --- | --- |
| Marketing landing page | ✅ Built |
| Landing page analytics (CTA clicks, page views) | ✅ Built |
| WhatsApp outreach tool (internal) | ✅ Built |
| Owner sign-in (login, reset, first-login password) | ✅ Built |
| Email (SMTP via Nodemailer) | ✅ Built, needs SMTP credentials |
| Owner dashboard | 🟡 Placeholder only |
| Lodge sites ({slug}.stayzim.co.zw) | ⬜ Not started |
| Owner analytics | ⬜ Not started |
| Billing screen | ⬜ Not started |
| Shared states (suspended, 404, locked features) | ⬜ Not started |
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

- [ ] D1 Lodge name, plan, status and View my site
- [ ] D2 Trial days left banner
- [ ] D3 Edit lodge info, WhatsApp number validated
- [ ] D4 Location from a Google Maps link or coordinates
- [ ] D5 Theme colour and logo
- [ ] D6–D7 Add, edit, reorder and delete rooms
- [ ] D8–D9 Upload, reorder and delete gallery photos (resized on the phone)
- [ ] D10 Copy link and share on WhatsApp

### Lodge site (Screen 2)

- [ ] S1–S9 Hero, rooms with WhatsApp booking, gallery, map, contact, sticky button, visit tracking, under 1.5 MB

### Analytics (Screen 5) and Billing (Screen 6)

- [ ] N1–N5 Visits table, totals, locked preview for Starter, empty state, owner visits excluded
- [ ] B1–B6 Plan, status pill and due date, how to pay, "I have paid" and plan-change WhatsApp buttons, overdue warning

### Shared states

- [ ] X1 Suspended site page
- [ ] X2 Unknown lodge 404
- [ ] X3–X5 Save errors, loading spinners, locked features

## Next up

1. **Data model for lodges:** lodge (slug, plan, status, trial end, theme), rooms, photos, link to the owner's user.
2. **Owner dashboard (D1–D10)** on top of the auth base.
3. **Lodge site renderer** for `{slug}.stayzim.co.zw`, starting with the three demo lodges.
4. **Visit tracking and owner analytics** (S8, N1–N5).
5. **Billing screen** and plan/status rules (B1–B6, X1).
6. **Deployment:**
   - Build and run the three Docker images on a machine with Docker; none have been built yet.
   - VPS, wildcard subdomains, HTTPS, `COOKIE_DOMAIN=.stayzim.co.zw`.
   - Let `CORS_ORIGIN` accept both `stayzim.co.zw` and `app.stayzim.co.zw`.
   - Switch from `db push` to migrations.

## Blocked on / needs a decision

- **SMTP credentials** for hello@stayzim.co.zw (Spacemail), to send real reset emails.
- **Sales WhatsApp number** for the landing page.
- **First real demo lodge** (photos and content).
- The open questions in [project.md](project.md#open-questions).

## Log

Newest first. One line per piece of work that landed on `main`.

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
