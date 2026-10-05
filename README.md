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
│   ├── web/        Next.js: marketing site (stayzim.co.zw) and owner login + dashboard
│   ├── server/     Hono on Bun: API, auth, landing page analytics
│   ├── outreach/   Hono on Bun: WhatsApp outreach to leads from 3 numbers (internal tool)
│   └── native/     Expo app (scaffold only, not started)
├── packages/
│   ├── db/         Prisma schema (one file per area) and client
│   ├── auth/       better-auth setup and the create-owner script
│   ├── mail/       Nodemailer SMTP sending and email templates
│   ├── env/        Validated environment variables per app
│   ├── ui/         Shared shadcn/ui primitives and Tailwind base styles
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
   - `apps/web/.env` with `NEXT_PUBLIC_SERVER_URL=http://localhost:9998` and, optionally, `NEXT_PUBLIC_WHATSAPP_NUMBER`
   - `apps/outreach/.env` from [apps/outreach/.env.example](apps/outreach/.env.example) (only if you run outreach)

3. Create the database tables. `db:push` uses `DATABASE_URL` from `apps/server/.env`:

   ```bash
   pnpm db:push
   ```

   The outreach app has its own database. Push the same schema to it by overriding the URL:

   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stayzim-outreach pnpm db:push
   ```

4. Create your first login (there is no public sign-up):

   ```bash
   pnpm --filter @stayzim/auth create-owner --email you@example.com --name "Your Name" --admin
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

Without SMTP settings, emails (password resets) are printed in the server's console, so you can still use the links locally.

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

## Working on the code

- Work happens on `main`, with one commit per task.
- The Prisma schema is split by area in `packages/db/prisma/schema/` (`auth.prisma`, `landing.prisma`, `outreach.prisma`).
- Shared UI primitives live in `packages/ui`. Landing page styles and tokens live in `apps/web/src/index.css`.
- Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack).
