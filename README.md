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
│   ├── web/        Next.js: marketing site (stayzim.co.zw), owner login and dashboard
│   ├── server/     Hono on Bun: API, auth, landing page analytics
│   ├── outreach/   Hono on Bun: WhatsApp outreach to leads from 3 numbers (internal tool)
│   └── native/     Expo app (scaffold only, not started)
├── packages/
│   ├── db/         Prisma schema (one file per area), client and create-lodge script
│   ├── auth/       better-auth setup and the create-owner script
│   ├── mail/       Nodemailer SMTP sending and email templates
│   ├── env/        Validated environment variables per app
│   ├── ui/         Design tokens and shared components (shadcn style, on Base UI)
│   └── config/     Shared TypeScript config
└── designs/        Design exports (landing page, app screens, logo)
```

| App | Local URL | Database |
| --- | --- | --- |
| web | http://localhost:9999 | (uses server) |
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

3. Create the database tables. `db:push` uses `DATABASE_URL` from `apps/server/.env`:

   ```bash
   pnpm db:push
   ```

   The outreach app has its own database. Push the same schema to it by overriding the URL:

   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stayzim-outreach pnpm db:push
   ```

4. Create your first login (there is no public sign-up), and a lodge for it so the dashboard has something to show:

   ```bash
   pnpm --filter @stayzim/auth create-owner --email you@example.com --name "Your Name" --admin
   ```

   ```bash
   pnpm --filter @stayzim/db create-lodge --owner you@example.com --name "Mist Valley Lodge" --slug mistvalley --demo
   ```

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

Without SMTP settings, emails (password resets) are printed in the server's console, so you can still use the links locally. Without the `R2_*` settings, lodge photos are saved in `apps/server/uploads` instead of Cloudflare R2.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start every app |
| `pnpm dev:web` / `dev:server` / `dev:outreach` / `dev:native` | Start one app |
| `pnpm build` | Build every app |
| `pnpm check-types` | Type-check every package |
| `pnpm db:push` | Apply the Prisma schema to the database in `apps/server/.env` |
| `pnpm db:generate` | Regenerate the Prisma client |
| `pnpm db:studio` | Browse the database |
| `pnpm --filter @stayzim/auth create-owner …` | Create an owner login or give one a new temporary password ([docs/auth.md](docs/auth.md)) |
| `pnpm --filter @stayzim/db create-lodge …` | Create the lodge for an owner login, on a 14-day Growth trial |

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
- `server` and `outreach` apply the Prisma schema on start (`docker/start.sh`), then run with Bun. Set `SKIP_DB_PUSH=1` to skip that.
- `outreach` includes Chromium. Run it with `--shm-size=1g` and about 300 MB of memory per WhatsApp number.

Details: [docs/architecture.md](docs/architecture.md#docker).

## Working on the code

- Work happens on `main`, with one commit per task.
- The Prisma schema is split by area in `packages/db/prisma/schema/` (`auth.prisma`, `landing.prisma`, `outreach.prisma`).
- Build screens from the shared components in `packages/ui` (`@stayzim/ui/components/*`); add new ones there. Colours, shadows and fonts are tokens in `packages/ui/src/styles/globals.css`.
- Animations use framer-motion helpers in `apps/web/src/components/motion.tsx`; they switch off with the OS "reduce motion" setting.
- Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).
