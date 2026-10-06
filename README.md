# StayZim

Websites for Zimbabwean lodges, guesthouses and Airbnbs, where guests book directly on WhatsApp instead of through Booking.com. Made in Mutare.

- **What the project is and where it's going:** [docs/project.md](docs/project.md)
- **What's built and what's next:** [docs/progress.md](docs/progress.md)
- **How the code fits together:** [docs/architecture.md](docs/architecture.md)
- **Sign-in and email:** [docs/auth.md](docs/auth.md)
- **Outreach tool API:** [apps/outreach/API.md](apps/outreach/API.md)

## What's in the repo

```
stayzim/
├── apps/
│   ├── web/        Next.js: marketing site (stayzim.co.zw), owner login and dashboard,
│   │               lodge sites ({slug}.stayzim.co.zw) and the team screen (/admin)
│   ├── server/     Hono on Bun: API, auth, lodge site content and visit tracking
│   ├── outreach/   Hono on Bun: WhatsApp outreach to leads from 3 numbers (internal tool)
│   └── native/     Expo app (scaffold only, not started)
├── packages/
│   ├── db/         Prisma schema (one file per area), client, create-lodge and resolve-request scripts
│   ├── auth/       better-auth setup (email and password, Google) and the create-owner script
│   ├── sites/      Lodge site template catalog and plan rules, shared by web and server
│   ├── mail/       Nodemailer SMTP sending and email templates
│   ├── env/        Validated environment variables per app
│   ├── ui/         Design tokens and shared components (shadcn style, on Base UI)
│   └── config/     Shared TypeScript config
└── designs/        Design exports (landing page, app screens, logo)
```

| App | Local URL | Database |
| --- | --- | --- |
| web | http://localhost:9999 | (uses server) |
| lodge sites | http://{slug}.localhost:9999, e.g. http://mistvalley.localhost:9999 | (uses server) |
| server | http://localhost:9998 | `stayzim` |
| outreach | http://localhost:9997 | `stayzim-outreach` |

## Getting started

You need Node 22+, [Bun](https://bun.sh), pnpm 11 and PostgreSQL.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create the env files from the examples and fill them in:
   - `apps/server/.env` from [apps/server/.env.example](apps/server/.env.example)
   - `apps/web/.env` from [apps/web/.env.example](apps/web/.env.example)
   - `apps/outreach/.env` from [apps/outreach/.env.example](apps/outreach/.env.example) (only if you run outreach)

3. Create the database tables by applying the migrations. `db:deploy` uses `DATABASE_URL` from `apps/server/.env`:

   ```bash
   pnpm db:deploy
   ```

   The outreach app has its own database. Apply the same migrations to it by overriding the URL:

   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stayzim-outreach pnpm db:deploy
   ```

   A database set up earlier with `db:push` needs baselining once (see [Database changes](#database-changes)).

4. Create an owner login (there is no public sign-up) and a lodge for it, so the dashboard and a lodge site have something to show:

   ```bash
   pnpm --filter @stayzim/auth create-owner --email owner@example.com --name "Rudo Moyo"
   ```

   ```bash
   pnpm --filter @stayzim/db create-lodge --owner owner@example.com --name "Mist Valley Lodge" --slug mistvalley --demo
   ```

   For yourself, a team account opens the change requests screen (`/admin/requests`) after login:

   ```bash
   pnpm --filter @stayzim/auth create-owner --email you@example.com --name "Your Name" --admin
   ```

   Each command prints a temporary password; the first login asks for a new one.

5. Run everything, or one app at a time:

   ```bash
   pnpm dev
   ```

   ```bash
   pnpm dev:web
   ```

   ```bash
   pnpm dev:server
   ```

   ```bash
   pnpm dev:outreach
   ```

Without SMTP settings, emails (password resets) are printed in the server's console, so you can still use the links locally. Without the `R2_*` settings, lodge photos are saved in `apps/server/uploads` instead of Cloudflare R2. Without the `GOOGLE_*` settings, the login screen hides "Continue with Google".

Lodge sites open at `http://{slug}.localhost:9999` (Chrome and Firefox resolve `*.localhost`), as long as `SITES_DOMAIN` (server) and `NEXT_PUBLIC_SITES_DOMAIN` (web) are both `localhost:9999`.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start every app |
| `pnpm dev:web` / `dev:server` / `dev:outreach` / `dev:native` | Start one app |
| `pnpm build` | Build every app |
| `pnpm check-types` | Type-check every package |
| `pnpm test` | Unit tests in every package (`bun test`) |
| `pnpm --filter web e2e` | Browser tests against the running apps ([apps/web/e2e](apps/web/e2e/README.md)) |
| `pnpm db:deploy` | Apply new migrations to the database in `apps/server/.env` |
| `pnpm db:migrate` | After editing the schema: create a migration and apply it locally |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:studio` | Browse the database |
| `pnpm --filter @stayzim/auth create-owner …` | Create an owner login or give one a new temporary password ([docs/auth.md](docs/auth.md)) |
| `pnpm --filter @stayzim/db create-lodge …` | Create the lodge for an owner login, on a 14-day Growth trial |
| `pnpm --filter @stayzim/auth seed-demos --whatsapp 2637…` | Create the landing page's demo lodges (mistvalley, msasaridge, lakeview) with rooms and copy, each with a demo owner login; skips any that exist. Sign in as the demo owner to add photos |
| `pnpm --filter @stayzim/db resolve-request …` | List open change requests (`--list`) or answer one (`--ref R-XXXX --status done --reply "…"`); the team screen does the same |

## Testing

- **Unit tests** (`pnpm test`) run with `bun test`. They cover:
  - template rules (`packages/sites`);
  - SMTP settings and emails (`packages/mail`);
  - visit chaining, lodge origins, devices and photo `srcset`s (`apps/server`, `src/lib/*.test.ts`);
  - dates, periods, site addresses and WhatsApp links (`apps/web`, `src/lib/*.test.ts`).

  Each app's `test/setup.ts` sets fixed settings and Zimbabwe time, so a local `.env` doesn't change the results.
- **Browser tests** (`pnpm --filter web e2e`) are Playwright smoke tests: the landing page, an owner signing in, and a lodge site's Book on WhatsApp links. See [apps/web/e2e/README.md](apps/web/e2e/README.md).
- **CI** (`.github/workflows/ci.yml`) runs on every push to `main` and on pull requests. It has two jobs:
  - type-check, unit tests, and builds of web and server;
  - browser tests: a fresh Postgres with the migrations, an owner and lodge made with the scripts, and the production builds of both apps.

## Database changes

The schema lives in `packages/db/prisma/schema/*.prisma` and changes through migrations in `packages/db/prisma/migrations`:

1. Edit the schema.
2. `pnpm db:migrate --name what_changed` creates the migration from the difference and applies it to your local database. Read the SQL before committing it.
3. `pnpm db:generate` regenerates the Prisma client (Prisma 7's `migrate dev` no longer does), then restart the API: a running `--hot` server keeps the old client.
4. Commit the schema and the migration together. Containers apply it on their next start (`prisma migrate deploy`).

A database created with `db:push` before migrations existed has the tables but no migration history, so `migrate deploy` stops with error P3005. Baseline it once: mark the migrations it already has as applied, then deploy the rest.

```bash
cd packages/db
npx prisma migrate resolve --applied 0_init   # the tables db:push made
npx prisma migrate deploy                     # anything newer
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema   # expect "No difference detected."
```

If the last command lists differences, the database was pushed from a schema newer than `0_init`: mark each migration whose changes it already has as applied too.

## Docker

Each deployable app has a Dockerfile. Build from the repo root:

```bash
docker build -f apps/server/Dockerfile -t stayzim-server .
```

```bash
docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_SERVER_URL=https://api.stayzim.co.zw --build-arg NEXT_PUBLIC_WHATSAPP_NUMBER=263771234567 -t stayzim-web .
```

```bash
docker build -f apps/outreach/Dockerfile -t stayzim-outreach .
```

- Images install from the committed `pnpm-lock.yaml` (`--frozen-lockfile`), so keep it committed and up to date.
- `server` and `outreach` apply new Prisma migrations on start (`docker/start.sh`), then run with Bun. Set `SKIP_DB_MIGRATE=1` to skip that.
- `outreach` includes Chromium. Run it with `--shm-size=1g` and about 300 MB of memory per WhatsApp number.

Details: [docs/architecture.md](docs/architecture.md#docker).

## Working on the code

- Work happens on `main`, with one commit per task.
- The Prisma schema is split by area in `packages/db/prisma/schema/` (`auth.prisma`, `landing.prisma`, `lodge.prisma`, `site.prisma`, `outreach.prisma`).
- Lodge site templates: the catalog and plan rules are in `packages/sites`, the designs in `apps/web/src/components/site/templates/` ([docs/architecture.md](docs/architecture.md#templates)).
- Build screens from the shared components in `packages/ui` (`@stayzim/ui/components/*`); add new ones there. Colours, shadows and fonts are tokens in `packages/ui/src/styles/globals.css`.
- Animations use framer-motion helpers in `apps/web/src/components/motion.tsx`; they switch off with the OS "reduce motion" setting.
- Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).
