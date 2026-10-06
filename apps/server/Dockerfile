# StayZim API (Hono on Bun)
#
# Build from the monorepo root:
#   docker build -f apps/server/Dockerfile -t stayzim-server .
#
# Runtime env (not baked in): DATABASE_URL, CORS_ORIGIN, BETTER_AUTH_SECRET,
# BETTER_AUTH_URL, WEB_URL, COOKIE_DOMAIN, SMTP_*. See apps/server/.env.example.
# Set SKIP_DB_PUSH=1 to start without applying the Prisma schema.
#
# Node is the base because pnpm and the Prisma CLI run on it; Bun is copied in
# to run the app itself, as in development.

# ---- Base: Node + pnpm + OpenSSL (Prisma's engines need it) ----
FROM node:22-slim AS base
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /app

# ---- Install ----
FROM base AS deps

# Every workspace manifest, so the lockfile matches and --frozen-lockfile works.
# Only the server and its workspace packages are installed (--filter).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/outreach/package.json apps/outreach/
COPY apps/native/package.json apps/native/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/mail/package.json packages/mail/
COPY packages/sites/package.json packages/sites/
COPY packages/ui/package.json packages/ui/

# packages/db's postinstall runs `prisma generate`, which needs the schema and a
# DATABASE_URL to read (a placeholder; nothing connects at build time)
COPY packages/db/prisma.config.ts packages/db/
COPY packages/db/prisma/schema/ packages/db/prisma/schema/
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

RUN pnpm install --frozen-lockfile --filter "server..."

# ---- Runtime ----
FROM base AS runtime

COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

COPY --from=deps /app ./
COPY packages/config/ packages/config/
COPY packages/env/ packages/env/
COPY packages/db/ packages/db/
COPY packages/mail/ packages/mail/
COPY packages/auth/ packages/auth/
COPY packages/sites/ packages/sites/
COPY apps/server/ apps/server/
COPY docker/start.sh /usr/local/bin/stayzim-start
RUN chmod +x /usr/local/bin/stayzim-start

ENV NODE_ENV=production \
    PORT=9998 \
    APP_DIR=/app/apps/server

USER node
EXPOSE 9998

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD bun -e "fetch('http://localhost:' + (process.env.PORT || 9998) + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Applies the Prisma schema, then runs the API with Bun (TypeScript source, as in dev)
CMD ["stayzim-start"]
