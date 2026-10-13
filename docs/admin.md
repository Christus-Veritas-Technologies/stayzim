# The admin app (admin.stayzim.co.zw)

_Planned with the user on 13 October 2026. One app for the StayZim team: everyone who signed up, every site, billing, leads and the WhatsApp outreach. It replaces the team screens in the web app (`/admin`) and the outreach app (`apps/outreach`), which is deleted._

## Decisions

| Question | Decision |
| --- | --- |
| Where | `apps/admin`, Next.js, at `admin.stayzim.co.zw` (port 9996 locally). Same design system as the owner dashboard: `@stayzim/ui`, its tokens and fonts, the same page, card and sidebar patterns. |
| Who | Team accounts only (`role` `ADMIN`, made with `create-owner --admin`). The API checks the role on every admin route. |
| Sign-in | The same StayZim session as the web app (the cookie is shared on `.stayzim.co.zw`). The admin has its own login screen. |
| Lodges, users, billing, leads | API routes in `apps/server` under `/api/admin/*`, so the rules (prices, founding, billing dates, slugs) stay in one place. The admin calls them from the browser like the dashboard does. |
| WhatsApp outreach | The engine (one Chromium per number, sessions in Postgres) moves into the admin app's server, so Chromium never runs in the customer-facing API. Its routes are the admin's own `/api/outreach/*`: the admin's screens use them with the session; scripts and Claude use them with `Authorization: Bearer <ADMIN_API_TOKEN>`. |
| Outreach data | In the main `stayzim` database (the tables were already in the shared schema). The first admin deploy copies contacts, messages, replies and WhatsApp logins from the old `stayzim-outreach` database (`OUTREACH_IMPORT_DATABASE_URL`), so no QR codes need scanning again. |
| Leads | The outreach contacts are the leads: a Facebook form lead, a lodge from a scraped list and someone typed in by hand are all one `Contact`, with a source, the lodge's name, an email and notes. |
| Sites for a lead | A lead can have several sites (one at $15, one at $30, …). Each is a normal lodge owned by a placeholder guest account (the same kind `/create` makes before "Claim my site"), tied to the lead. They stay live with the Free preview marks, with no timer, until handed over or deleted. |
| Handover | "Give to lead" makes a one-time claim link (7 days). The lead opens it, is signed in to that site, and adds their email and password (the existing Claim my site). Opening it starts the 2-day free preview, makes the first invoice, and deletes the lead's other sites. |
| Facebook leads | Upload the CSV from Leads Center; new numbers are added, known ones are updated. Automatic import (Meta's Lead Ads webhook) can come later. |
| Not in the first version | Signing in as an owner, roles below Admin, automatic Meta import, editing a lead's rooms in the admin (the owner does it after claiming, or the team does it from a team account's own dashboard). |

## Screens

### Overview
- Sign-ups today, this week and this month; owners who claimed their site; guests who haven't.
- Sites by status: free preview live, preview ended, active, payment due, offline; founding lodges.
- Money: monthly recurring revenue (each active lodge's own monthly price), paid in the last 30 days, payments waiting.
- Where sign-ups came from (utm_source), and the `/create` funnel by step.
- The latest sign-ups and payments.

### Users
- Everyone with an account: owners, guests from `/create` who haven't claimed, and the team. Search by name or email; filter by kind.
- A user: their lodge, when they joined and how, and Send a password reset email.

### Sites
- Every lodge with its plan, status, founding price, when it was made, where it came from, its address and its lead. Filter by status, plan and source; search by name or address.
- A site:
  - Open the site; its owner (or its lead).
  - Billing: what it pays (founding or not), paid until, invoices and payments, and **Record a payment** (what `mark-paid` did: months, plan, channel, receipt by email).
  - Status: **Extend the free preview** (+2 or +7 days), **Set the status** (active, payment due, offline), **Founding price** on or off.
  - Address: **Set or remove its own domain** (what `set-domain` did).
  - Content: reviews and journal posts (the old `/admin/lodges` screen).
  - **Delete** (unpaid sites only, with their photos and placeholder account).

### Leads
- Every lead with its source, city, outreach status, sites made for it and last message or reply. Filter by status and source; search.
- **Add a lead** by hand, or **Upload Facebook leads** (the Leads Center CSV).
- A lead:
  - Details: name, number, city, lodge name, email, notes; Do not contact.
  - The WhatsApp conversation: what we sent (from which number) and their replies, and **Send a message** (from the next number in turn, within the daily limits).
  - Sites made for them, each with its plan, price, design and link; **Make a site** (the `/create` steps on their behalf: design, their place, lodge name, town and WhatsApp, photos); **Give to lead** (copy the claim link, or send it on WhatsApp in one tap).

### WhatsApp
- Each number: connected or not, its QR code to pair, its number, today's sends against its limit, its last session backup.
- **Campaigns**: one message to many leads (filters by city and status, or a list of numbers), paced and rotated across the numbers, with progress and Stop.
- **Messages** sent and **Replies** received, newest first.

### Billing
- Invoices (open, paid, void) and payments (pending, paid, failed), newest first, each linking to its site.

### Requests
- Owners' change requests (the old `/admin/requests` screen): answer, set status.

### Domains
- Free `.co.zw` domains claimed and not set up yet, with the name asked for; **Set up** sets the lodge's domain (the job then emails the owner).

## Build order

1. The plan (this file).
2. Database: lead fields on contacts, `lodge.lead_id`, claim tokens.
3. API: overview, users, sites and their actions, billing, domains.
4. API: leads, sites for a lead, photos, claim links; the claim page in the web app.
5. `apps/admin`: the app, its login and shell, Overview, Users, Sites, Billing, Requests, Domains.
6. The outreach engine and its routes in the admin, the WhatsApp screens, Leads (with Make a site and Give to lead), the CSV upload.
7. Deployment: the admin image (Chromium), the compose service and route, copying the outreach database; the web app's `/admin` redirects to the admin; `apps/outreach` deleted.
8. Docs.
