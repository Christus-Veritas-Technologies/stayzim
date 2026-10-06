# StayZim: the project

_Last updated 6 October 2026. Based on the designer brief of the same date, corrected where the build has moved on (see [What changed from the brief](#what-changed-from-the-brief))._

**Owner:** Kin, Where They Are (Mutare) · **Domain:** stayzim.co.zw

## What StayZim is

StayZim gives Zimbabwean lodges, guesthouses, cottages and Airbnbs their own website, where guests book directly over WhatsApp.

**The problem.** Lodges pay Booking.com 15–20% commission on every booking, and many smaller places can barely be found on Google at all.

**The pitch.** "Stop paying 20% to Booking.com." A night costs $80–$250 at most lodges, so one extra direct booking a month pays for StayZim.

**What it is not.** StayZim does not replace Booking.com; lodges keep their listings there. StayZim turns guests who already found them (repeat guests, Facebook and Instagram followers, WhatsApp forwards, Google searches) into direct bookings with no commission.

## What it aims to do

1. **Get lodges booked direct.** Every lodge gets a fast, phone-first site with a "Book on WhatsApp" button on every room, pre-filled with the room and lodge name.
2. **Remove the setup burden.** StayZim builds the site from photos and prices sent on WhatsApp, before the owner pays anything.
3. **Prove the value.** Visit analytics show owners that people are looking, and are the reason to upgrade.
4. **Stay simple to run.** One founder sells, onboards and supports every lodge, mostly over WhatsApp. No card payments, no admin screens until they're needed.

**Growth path.** Own Zimbabwe first (up to about 150–200 lodges), then Zambia and Botswana, then South Africa. Currency, phone codes and copy must stay easy to change.

## Who uses it

| Person | Who they are | Where they use StayZim |
| --- | --- | --- |
| Lodge owner or manager | Runs a lodge, guesthouse or Airbnb. Busy, sometimes in the diaspora, mostly on a phone. | Owner dashboard (app.stayzim.co.zw) |
| Guest | Local or regional traveller, tourist or diaspora visitor, often on slow or expensive data. | The lodge's own site ({slug}.stayzim.co.zw) |
| Prospect | A lodge owner who hasn't signed up. Arrives from a Facebook ad, a link or an in-person demo. | Marketing site (stayzim.co.zw) |
| Kin (admin) | Founder. Sells, onboards and supports every lodge. | Team screen for change requests (`/admin/requests`), scripts and the database |

**Where the lodges are:** Victoria Falls, Kariba, Nyanga, Vumba, Chimanimani, Bulawayo, and Airbnbs in Harare suburbs such as Borrowdale and Greendale. The first demos target the Eastern Highlands (Vumba, Nyanga, Chimanimani), close to Mutare.

## How it reaches lodges

- **Facebook click-to-WhatsApp ads** aimed at lodge, guesthouse and Airbnb owners, from about $5 a day.
- **Walking into lodges** with a demo of their own site already built.
- **WhatsApp outreach** to leads who opted in or replied to the ads, sent from 3 StayZim numbers with daily limits (`apps/outreach`).
- **Facebook ads** to `/signup`: owners make their own live demo in about 5 minutes.
- **Free .co.zw domains** on Growth and Pro, registered by StayZim.

## Plans

| | Starter | Growth (most popular) | Pro |
| --- | --- | --- | --- |
| Price | $20/month | $40/month | $75/month |
| Tagline | Get found | Get booked | Get full |
| For | New Airbnbs and small guesthouses | About 80% of lodges; the plan to sell | Busy lodges with 5+ rooms, diaspora owners |
| Includes | Site on {slug}.stayzim.co.zw (hero, rooms, gallery, map), Book on WhatsApp button, Google Business setup, connect a domain they have | Starter + visitor analytics + a free .co.zw domain. Coming: booking calendar, Paynow/InnBucks deposits, Instagram feed, local SEO | Growth + StayZim manages Booking.com and Airbnb photos and text, channel sync, 2 SEO blog posts a month, priority WhatsApp support |

- **Three plans, no free plan.** Owners sign up and pick a plan. Their site is live straight away as a **free 2-day demo** on that plan, with "demo" badges.
- **Unpaid demos:** the site goes offline when the demo ends, and the demo is deleted 30 days later.
- **No commission** on any plan.
- **Paying:**
  - Owners pay online through Paynow: EcoCash, InnBucks or OneMoney (a prompt on the phone or a code), or card. They can pay for 1, 3 or 12 months.
  - They can also pay to the EcoCash or InnBucks merchant code; StayZim records it with `mark-paid`.
  - Invoices are emailed 3 days before, the day before and on the day the paid time ends; receipts on payment.
- **Missed payment:** Active → Overdue when the paid time ends (the site stays up 3 more days) → Suspended (the site shows "temporarily unavailable"; the dashboard still works so they can pay) → Active once paid. This all happens automatically.
- **Own domains** on every plan, once paid. Growth and Pro include a free `.co.zw`.
- **Booking calendar:** Growth and Pro, when it's built.

## Decisions so far

| Topic | Decision |
| --- | --- |
| Niche | Lodges, guesthouses and Airbnbs only. Restaurants were considered and rejected (may be taken on by referral, not marketed to). |
| Booking | WhatsApp first. No card payments in the MVP. |
| Sign-up | No public sign-up. StayZim creates every owner account with a temporary password; the owner chooses their own on first login. |
| Analytics | Basic visit tracking (date, IP, page, country). Shown on Growth and Pro only, as the reason to upgrade. |
| Admin | One team screen, for answering owners' change requests (`/admin/requests`). Everything else (creating owners and lodges, marking payments) stays in scripts and the database. |
| Email | Nodemailer over SMTP with a Spacemail address. |
| Photos | Stored in Cloudflare R2, resized on the owner's phone before upload. |
| Lodge sites | Belong to the lodge: the lodge's photos, name and theme colour lead; StayZim shrinks to a "Made with StayZim" footer link. |

## The MVP

| Surface | Screen | Where |
| --- | --- | --- |
| Marketing site | Landing page (how it works, demo lodges, the maths, pricing, questions) | stayzim.co.zw/ |
| Lodge site | One-page lodge site (hero, rooms, gallery, map, contact, sticky WhatsApp button) | {slug}.stayzim.co.zw/ |
| Owner app | Login, forgot password, set new password | app.stayzim.co.zw/login |
| Owner app | Dashboard: lodge info, rooms and gallery on one screen | /dashboard |
| Owner app | Analytics (locked preview on Starter) | /dashboard/analytics |
| Owner app | Billing (read-only: plan, status, how to pay, "I have paid") | /dashboard/billing |

Plus shared states: suspended site, 404, save errors, loading, locked features.

**After the MVP** (once the first 3 lodges pay): self sign-up, separate dashboard pages for site/rooms/gallery, bookings inbox and calendar, custom domains, Pro blog, expanded analytics, room and gallery pages on lodge sites, and an admin area (all lodges, revenue, churn, payment chasing, sign in as a lodge).

Progress against all of this is tracked in [progress.md](progress.md).

## What changed from the brief

The brief is a few weeks old. Where it disagrees with what's built, the build wins:

| Brief said | What we do now |
| --- | --- |
| Highland green (`#1E4A3B`) as the brand colour, Hanken Grotesk headings | StayZim blue (`#007DA2`) brand with Familjen Grotesk headings and Instrument Sans body, from the final landing page design. Highland, Msasa bronze and Kariba blue remain lodge theme colours. |
| Hono and Prisma on Cloudflare Workers | Hono on Bun with Prisma and PostgreSQL, intended for a small VPS. |
| Very little motion, no scroll animations | The landing page has subtle scroll and entrance animations, and the owner app has light ones (screens rising in, sliding tabs and nav, numbers counting up, charts drawing in). All use framer-motion and switch off with the OS "reduce motion" setting. |
| Landing "Log in" sends people to WhatsApp | The owner login exists now (`/login`). |
| A 14-day Growth trial, with StayZim building every site | No trial. Owners sign up and make their own site as a free 2-day demo on the plan they pick; StayZim still helps on WhatsApp. |
| Payments recorded by hand only | Paynow online (phone prompt or card), invoices and receipts by email, automatic overdue and suspension; `mark-paid` for payments made another way. |
| Custom domains later, plan undecided | Any plan once paid; Growth and Pro include a free .co.zw. Cloudflare for SaaS while it's free, Coolify otherwise. |

## Open questions

- Which lodge gets the first real demo, so the site uses its real photos?
- How should pricing show features that aren't built yet (list only what exists, or mark "Coming soon")? The landing page currently shows a "Coming to Growth" box.
- Is 3 days the right grace period before suspension?
- Offer an annual prepay discount (for example, 10 months' price for 12)?
- English only, or Shona and Ndebele on lodge sites later?
- StayZim's sales WhatsApp number for the landing page buttons (`NEXT_PUBLIC_WHATSAPP_NUMBER`).

## Business context

- **Running costs:** about $5.70 a month with no clients (VPS, the stayzim.co.zw renewal, free tiers, a Spacemail address). Each lodge adds about $0.20–$0.40 a month. Gross margin is close to 98%.
- **Why lodges:** they earn $80–$250 a night, churn less than restaurants, already feel the commission cost, and refer each other. 20 lodges at $40 earn about what 50 restaurants at $15 would, with far less selling.
- **Unit economics (untested guesses):** $10–$15 in ads to win a lodge; lifetime value $400–$600.
- **South Africa later:** rand pricing around R499, R799 and R1,299 a month, positioned against NightsBridge.
