# Deploying StayZim

StayZim runs on one VPS with [Coolify](https://coolify.io), behind Cloudflare. Coolify builds the Docker images straight from this repository and keeps them running.

[`deploy/compose.yaml`](../deploy/compose.yaml) is the whole stack:

| Service | What | Address |
| --- | --- | --- |
| `web` | Landing page, login and dashboard, and every lodge site | `stayzim.co.zw` (`www.` and `app.` redirect there), `*.stayzim.co.zw` |
| `server` | The API (Hono on Bun). Applies new database migrations each time it starts | `api.stayzim.co.zw` |
| `db` | Postgres 16, data in the `postgres` volume | internal only |

Lodge photos live in Cloudflare R2, served from `cdn.stayzim.co.zw`, so the server needs no volume.

The outreach tool (`apps/outreach`) isn't in this stack. Deploy it as its own resource with `apps/outreach/Dockerfile` when it's needed.

**Tested here:**

- Both images built.
- The stack ran with `docker compose` against a test S3 server, standing in for R2. On start it:
  - applied the migrations;
  - passed `/health`;
  - created an owner and lodge with the scripts inside the container;
  - served the lodge site through its host name;
  - stored an upload in the S3 server;
  - passed every browser test (sign-in across subdomains, and 360px phones).

**Not tested here:** Coolify itself, Cloudflare and real R2.

## 1. Cloudflare

Add `stayzim.co.zw` to Cloudflare and point the registrar's nameservers at it.

**DNS** (all proxied, orange cloud, pointing at the VPS IP):

| Type | Name | Content |
| --- | --- | --- |
| A | `stayzim.co.zw` (`@`) | VPS IP |
| A | `www` | VPS IP (redirects to the bare domain) |
| A | `api` | VPS IP |
| A | `*` | VPS IP (every lodge site) |

The `cdn` record comes from R2 (step 2), not from you.

**SSL/TLS:**

1. Set the mode to **Full (strict)**.
2. Go to Origin Server → Create Certificate. Make one for `stayzim.co.zw` and `*.stayzim.co.zw` (RSA, 15 years). Keep the certificate and private key for step 3.
3. Turn on Always Use HTTPS.

Cloudflare's free Universal SSL covers the apex and one level of wildcard, so visitors get a valid certificate for `mistvalley.stayzim.co.zw` without any per-lodge work. The origin certificate covers the hop from Cloudflare to the VPS, so you don't need a Let's Encrypt wildcard (which would need a DNS-01 challenge).

Cloudflare also sends:

- `CF-Connecting-IP`, the visitor's real IP, used for rate limits. Keep `CLIENT_IP_HEADER=cf-connecting-ip`.
- `CF-IPCountry`, which gives owners visitor countries.

> Alternative without Cloudflare's proxy: grey-cloud the records and let Coolify's Traefik get a Let's Encrypt wildcard with a DNS-01 challenge (Coolify → Servers → Proxy). Then set `CLIENT_IP_HEADER=x-forwarded-for`, and owners won't see countries.

## 2. Cloudflare R2 (lodge photos)

1. Go to R2 → Create bucket `stayzim-media`.
2. Under Settings → Custom Domains, add `cdn.stayzim.co.zw`. Cloudflare creates the DNS record, and the bucket is public on that domain only (leave the r2.dev URL off).
3. Add a Cache Rule for `cdn.stayzim.co.zw`: cache everything, Edge TTL 1 year, Browser TTL 1 year. Every photo has a new file name, so nothing ever needs purging. (Uploads carry no Cache-Control header of their own: Bun's S3 client can't set one, so this rule is what makes photos cache.)
4. Go to R2 → Manage API Tokens → Create a token with **Object Read & Write**, limited to this bucket.
5. Note:
   - the Account ID → `R2_ACCOUNT_ID`;
   - the Access Key ID and Secret → `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`;
   - `R2_BUCKET=stayzim-media`;
   - `R2_PUBLIC_URL=https://cdn.stayzim.co.zw`.

The pages show photos with plain `<img>` tags, so neither Next.js nor CORS needs anything for them. `next.config.ts` allows `cdn.stayzim.co.zw` for `next/image` in case it's used later; change it there if the domain changes.

The API refuses to start in production without R2.

### Paynow (online payments)

Owners pay from Billing through Paynow:

- EcoCash or OneMoney: a prompt on their phone;
- InnBucks: a code for the app;
- cards and the rest: Paynow's own page.

Without Paynow set up, Billing shows only the merchant codes and "I have paid", and you record payments with `mark-paid`.

1. In the Paynow merchant account, go to Receive Payments → New integration → "3rd party shopping cart or link". Note the **Integration ID** and **Integration Key**, which become `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY`.
2. A new integration starts in **test mode**:
   - Payments must use the merchant account's own email, so set `PAYNOW_AUTH_EMAIL` to it. `deploy/compose.yaml` doesn't pass it on (production runs live): add `PAYNOW_AUTH_EMAIL: ${PAYNOW_AUTH_EMAIL:-}` to the server's environment there while testing.
   - Paynow's test phone numbers simulate success and failure.
   - When Paynow approves the integration for live payments, empty `PAYNOW_AUTH_EMAIL`, so the owner's email is sent.
3. Paynow calls back to `https://api.stayzim.co.zw/api/paynow/result`. The server sends this address with each payment, so there's nothing to enter in Paynow.
4. **Check:** pay $1-worth in test mode from a demo lodge's Billing screen. The receipt email arrives, and the lodge becomes Active.

**Invoices and receipts:**

- Invoices, receipts and their emails carry the issuer details hard-coded in `apps/server/src/lib/business.ts`: StayZim Platform Inc, stayzim.co.zw, hello@stayzim.co.zw, +263 77 510 1506. Add a street address or tax number there when there is one.
- `ECOCASH_MERCHANT_CODE` and `INNBUCKS_MERCHANT_CODE` add the pay-by-merchant-code cards on Billing; without them, owners see "Message us". They aren't in `deploy/compose.yaml` today: to use them, add `ECOCASH_MERCHANT_CODE: ${ECOCASH_MERCHANT_CODE:-}` (and the InnBucks one) to the server's environment there, then set them in Coolify.
- These are server settings: change them and restart the server, with no rebuild.
- The billing job runs inside the server container every hour, so there's nothing to schedule.

## 3. Coolify

Install Coolify on the VPS (Ubuntu 24.04, 2 vCPU, 4 GB RAM is plenty to start). Then:

1. **Origin certificate:** in Servers → your server → Proxy → Dynamic Configurations, add the Cloudflare origin certificate as Traefik's default certificate:

   ```yaml
   tls:
     stores:
       default:
         defaultCertificate:
           certFile: /traefik/certs/stayzim.pem
           keyFile: /traefik/certs/stayzim.key
   ```

   Save the certificate and key on the server at `/data/coolify/proxy/certs/stayzim.pem` and `stayzim.key`, then restart the proxy.

2. **New resource:**
   - Go to Project → New Resource → your GitHub repository.
   - Build pack: **Docker Compose**.
   - Compose file: `/deploy/compose.yaml`.
   - Branch: `main`.

3. **Domains:**
   - service `web`: `https://stayzim.co.zw:9999,https://www.stayzim.co.zw:9999`;
   - service `server`: `https://api.stayzim.co.zw:9998`;
   - `db`: none.

   The `:9999` and `:9998` tell Coolify which port inside the container to send traffic to. Visitors still use plain `https://stayzim.co.zw`.

   **Moving from two Dockerfile applications to this one compose resource** (the compose file carries the lodge-site route; separate applications don't):

   1. Stop the old `web` and `server` applications and remove their domains, so the compose resource can take the domains.
   2. Create the compose resource as above, with the same values for `BETTER_AUTH_SECRET`, R2, SMTP, Paynow and Google as the old server app (so nobody is signed out), and a new `POSTGRES_PASSWORD`. Don't set `DATABASE_URL`: the compose file points the server at its own `db`.
   3. Deploy. The bundled database starts empty and is migrated on start; make the owner and demo accounts again as in [First run](#4-first-run). A Coolify-managed Postgres used before can be deleted once you're happy.
   4. Check `https://api.stayzim.co.zw/health`, the landing page and a lodge site, and run `deploy/check-routing.sh`. Then delete the old applications.

   Lodge sites need no domain here: the `web` service's Traefik labels in the compose file send every other host to it (`PathPrefix(`/`)` at priority 1, the same in Traefik v2 and v3), with lower priority than the named domains. Don't add `*.stayzim.co.zw` as a domain. If Coolify adds Let's Encrypt to these routes, switch that off: Cloudflare and the origin certificate handle TLS.

4. **Environment variables:**
   - Paste [`deploy/.env.example`](../deploy/.env.example) and fill it in.
   - Required: `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), the `R2_*` settings, and `NEXT_PUBLIC_WHATSAPP_NUMBER`.
   - For online payments: `PAYNOW_INTEGRATION_ID` and `PAYNOW_INTEGRATION_KEY` (above). SMTP matters more now: welcome emails, invoices and receipts go through it.
   - SMTP and Google are needed for reset emails and Google sign-in.
   - **Email senders** (Spacemail, `mail.spacemail.com`, port 465):
     - `SMTP_*` is `no-reply@stayzim.co.zw`: password resets, welcome emails, booking notices.
     - `BILLING_SMTP_USER`, `BILLING_SMTP_PASS` and `BILLING_SMTP_FROM` are `billing@stayzim.co.zw`: invoices, payment reminders, receipts, "demo ended" and "site offline". Host and port default to `SMTP_HOST` and `SMTP_PORT`. Without them, these go from no-reply too.
     - Replies to every StayZim email go to `hello@stayzim.co.zw` (hard-coded `REPLY_TO` in `packages/mail`); booking emails to guests reply to the lodge.
     - The server log says `SMTP connection OK (no-reply)` and `Billing SMTP connection OK` at boot.
   - The Meta Pixel for the Facebook ads is built in (its ID is in `apps/web/src/lib/meta-pixel.ts`) and reports sign-ups, demos and payments. Nothing to set.
   - `NEXT_PUBLIC_*` values are baked in when the web image builds, so mark them as build variables, and redeploy after changing them.

5. **Deploy.** The server waits for Postgres, applies the migrations, then starts. Web waits for the server's health check (`/health`, which also checks the database).

## 4. First run

Open a terminal on the `server` container (Coolify → the resource → Terminal → `server`):

```bash
# StayZim's own login, for the team screen (/admin/requests)
cd /app/packages/auth && bun scripts/create-owner.ts --email you@stayzim.co.zw --name "Your Name" --admin

# The landing page's demo lodges, with the sales number
bun scripts/seed-demos.ts --whatsapp 2637XXXXXXXX
```

The scripts print temporary passwords.

- Sign in at `https://stayzim.co.zw/login`, choose a password, and add photos to each demo lodge as its demo owner.
- New lodges mostly sign up themselves at `https://stayzim.co.zw/signup`. For one you set up yourself: `create-owner`, then `cd /app/packages/db && bun scripts/create-lodge.ts …` (see the [README](../README.md)).
- **Payments made outside Paynow:** `cd /app/apps/server && bun scripts/mark-paid.ts --slug mistvalley --months 1 --channel ecocash` records one and emails the receipt. Use `--list` to see every lodge and what it owes. `bun scripts/run-billing.ts` runs the hourly billing job straight away.
- With the wildcard in place, a new lodge's site is live straight away. Nothing changes in DNS or Coolify.

**Check after deploying:**

- `https://api.stayzim.co.zw/health` → `{"status":"ok"}`.
- `https://stayzim.co.zw` shows the landing page, and `https://mistvalley.stayzim.co.zw` shows a demo lodge.
- Signing in on `stayzim.co.zw` reaches the dashboard. If it bounces back to the login page, check `COOKIE_DOMAIN=.stayzim.co.zw` and `CORS_ORIGIN`.
- Five wrong passwords in a row give "Too many attempts". If one person's mistakes lock everyone out, `CLIENT_IP_HEADER` doesn't match the proxy.

## Updates and rollbacks

**Updating:**

- Pushing to `main` and pressing Redeploy (or turning on auto-deploy) rebuilds both images.
- New migrations in `packages/db/prisma/migrations` apply when the server starts.
- Migrations only ever apply what a reviewed SQL file says. A failed migration stops the server container before the app starts, and the log names the migration. Fix it, then redeploy.

**Rolling back:** redeploy the previous commit from Coolify's Deployments tab. Migrations don't roll back by themselves, so a rollback across a migration that removed something needs a restore (below).

**A database made before migrations** (with `prisma db push`) gives error P3005. If it has no accounts and no lodges, the server's start script drops its tables and applies the migrations from scratch (`packages/db/scripts/reset-if-empty.ts`), so a first deploy onto a used-but-empty database just works. With any account or lodge in it, nothing is dropped and the server stops; baseline it once in the server container:

```bash
cd /app/packages/db && ./node_modules/.bin/prisma migrate resolve --applied 0_init
```

Then restart. See [Database changes](../README.md#database-changes).

## Backups

**Coolify:**

1. Add R2 (or any S3 storage) under Storages: endpoint `https://<account id>.r2.cloudflarestorage.com`, with its own bucket (for example `stayzim-backups`) and a token.
2. In the `db` service's Backups tab, schedule a daily backup to it, and keep at least 14.

Coolify's backups need the database as a Coolify-managed Postgres. With the bundled `db` service, use the script instead, from cron on the VPS:

```bash
# /etc/cron.d/stayzim-backup: 02:30 every night
30 2 * * * root docker exec $(docker ps -qf name=db- | head -n 1) pg_dump -U stayzim -Fc stayzim > /var/backups/stayzim-$(date +\%F).dump && find /var/backups -name 'stayzim-*.dump' -mtime +14 -delete
```

[`docker/backup.sh`](../docker/backup.sh) does the same from any machine with `pg_dump` and `DATABASE_URL`, and keeps the newest 14. Copy the files off the VPS (for example `rclone copy /var/backups r2:stayzim-backups`): a backup on the same disk dies with it.

**Restore** into an empty database:

```bash
pg_restore --no-owner --no-privileges --dbname="$DATABASE_URL" stayzim-2026-10-06.dump
```

Try a restore now and then. One was tested here on the dev database, and the row counts matched.

## Custom domains

**Who gets one:**

- A lodge can have its own domain, like `mistvalleylodge.co.zw`, on any plan, once it has paid. Demos can't: `set-domain` refuses them, and a demo's domain is never served.
- Growth and Pro include a free `.co.zw`. On Starter, the owner brings a domain they already have.
- Owners ask from the Lodge info screen ("Ask for it" or "Ask us"), which opens a change request.

**What it changes:** the site answers on the domain and on `{slug}.stayzim.co.zw`. Its pages tell search engines the domain is the main address, and the dashboard shows the domain as the lodge's address.

1. **The domain:** StayZim registers it by hand, for `.co.zw` through a ZISPA-accredited registrar, and adds the DNS records. An owner who has a domain already adds the records themselves.
2. **Point it at us.** Use Cloudflare for SaaS while it's free; Coolify is the fallback.
   - **Cloudflare for SaaS** (Custom Hostnames, on the `stayzim.co.zw` zone). The first 100 hostnames are free; check Cloudflare's current pricing before you pass 100.
     - **One-off setup:** SSL/TLS → Custom Hostnames, with the fallback origin `sites.stayzim.co.zw` (covered by the `*` record).
     - **Per lodge:** add the domain as a Custom Hostname.
     - **At the domain's DNS:** `CNAME @ → sites.stayzim.co.zw` (or ALIAS or flattening for the apex) and `CNAME www → sites.stayzim.co.zw`, plus the TXT record Cloudflare shows to prove ownership.

     Cloudflare issues and renews the certificate. Visitors' countries and real IPs keep working. Traefik sends these hosts to `web` through the catch-all route in `deploy/compose.yaml` (`stayzim-sites`).

     **Check on the first one:** Cloudflare connects to the server with the lodge's domain as the hostname, and the origin certificate only covers `stayzim.co.zw`. If the site shows a 526 error, set that Custom Hostname's SSL to Full (not strict), or issue an origin certificate that covers the domain.
   - **Coolify (fallback):** point `A @` and `A www` at the VPS IP, then add `https://mistvalleylodge.co.zw,https://www.mistvalleylodge.co.zw` to the `web` service's domains, so Traefik gets a Let's Encrypt certificate. With no Cloudflare in front, that domain shows no visitor countries.
3. **Tell StayZim which lodge it is** (in the server container, or locally with the production `DATABASE_URL`):

   ```bash
   cd /app/packages/db && bun scripts/set-domain.ts --slug mistvalley --domain mistvalleylodge.co.zw
   bun scripts/set-domain.ts --list
   bun scripts/set-domain.ts --slug mistvalley --remove
   ```

   It stores the bare domain (lowercase, no `www.`); `www.` works too. Within about a minute (the lookup is cached), the domain shows the lodge's site. It also says whether the plan includes the free `.co.zw`.

How it works:

- The web app's proxy sees a host that isn't StayZim's and asks the API, `GET /api/sites/domain/:host`, which lodge it belongs to. Answers are cached for 5 minutes, and unknown domains for 1 minute. An unknown domain gets the "Lodge not found" page.
- The API accepts visit reports from those domains (CORS).
- **Owner visits:** the session cookie belongs to `stayzim.co.zw` and isn't sent from another site, so on a custom domain the owner's visits are skipped by the owner key their dashboard's View site link carries (`apps/server/src/lib/owner-key.ts`).

## Troubleshooting

### A lodge site shows "no available server", or a 404

Run the check script on the VPS (Coolify → Servers → your server → Terminal):

```bash
bash check-routing.sh mistvalley stayzim.co.zw   # deploy/check-routing.sh from the repo
```

It only reads. It lists what's wrong and how to fix it.

What Traefik's answers mean (tested on v2.11 and v3.6):

- **`no available server` (503):** a route matched, but Traefik's own health check (a `loadbalancer.healthcheck` label, or a `healthCheck` in Coolify's dynamic configuration) marked web down. Remove that check: the image's Docker `HEALTHCHECK` is all that's needed.
- **`404 page not found`:** no route matched. Causes, by how often they come up:
  - **An old deploy.** Before 7 October the compose file used a `HostRegexp` rule that Traefik v2 never matches. Redeploy from `main`.
  - **Web not healthy yet.** `docker ps` must show `(healthy)`.
  - **Missing labels.** Web runs as a separate Coolify application without the compose file's labels. Copy the `traefik.*` labels of the `web` service into its Container Labels, or deploy from `deploy/compose.yaml`.
  - **An old Traefik on a new Docker.** Traefik older than v3.6 can't read containers from Docker 29 or newer: update the proxy.
- **`Gateway Timeout` (504):** Traefik picked a network it can't reach web on. Add `traefik.docker.network=coolify`, or whichever network the proxy shares with web.
- **Only one web:** only one running container may carry the `stayzim-sites` labels. Stop older copies.

The tests behind this are in [create-redesign.md](create-redesign.md#the-production-bug-no-available-server).
