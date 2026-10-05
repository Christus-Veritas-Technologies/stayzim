# StayZim outreach (Hono on Bun + whatsapp-web.js)
#
# Build from the monorepo root:
#   docker build -f apps/outreach/Dockerfile -t stayzim-outreach .
#
# Runtime env (not baked in): DATABASE_URL (the stayzim-outreach database),
# CORS_ORIGIN, OUTREACH_PASSWORD, WHATSAPP_ACCOUNTS, WHATSAPP_DAILY_LIMIT.
# See apps/outreach/.env.example. Set SKIP_DB_PUSH=1 to start without
# applying the Prisma schema.
#
# Each WhatsApp number runs its own Chromium, so give the container memory
# accordingly (roughly 300 MB per number) and a larger /dev/shm, e.g.
#   docker run --shm-size=1g --memory=2g ...
# Sessions are backed up to Postgres (RemoteAuth), so a redeploy doesn't need
# new QR scans; the first backup lands about a minute after a number connects.

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
# Only outreach and its workspace packages are installed (--filter).
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
COPY packages/ui/package.json packages/ui/

COPY packages/db/prisma.config.ts packages/db/
COPY packages/db/prisma/schema/ packages/db/prisma/schema/
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

# Chromium comes from apt below; puppeteer must not download its own
# (pnpm-workspace.yaml also blocks its install script)
ENV PUPPETEER_SKIP_DOWNLOAD=1

RUN pnpm install --frozen-lockfile --filter "outreach..."

# ---- Runtime ----
FROM base AS runtime

# Chromium for whatsapp-web.js, plus fonts so emoji and non-Latin names render
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*

COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun

COPY --from=deps /app ./
COPY packages/config/ packages/config/
COPY packages/env/ packages/env/
COPY packages/db/ packages/db/
COPY apps/outreach/ apps/outreach/
COPY docker/start.sh /usr/local/bin/stayzim-start
# whatsapp-web.js writes Chromium profiles and a cached WhatsApp Web build here
RUN chmod +x /usr/local/bin/stayzim-start \
  && mkdir -p apps/outreach/.wwebjs_auth apps/outreach/.wwebjs_cache \
  && chown -R node:node apps/outreach

ENV NODE_ENV=production \
    PORT=9997 \
    APP_DIR=/app/apps/outreach \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    WHATSAPP_SESSION_PATH=/app/apps/outreach/.wwebjs_auth

USER node
EXPOSE 9997

# Waiting for a QR scan is healthy; only every number having failed is not
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD bun -e "fetch('http://localhost:' + (process.env.PORT || 9997) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Applies the Prisma schema, then runs outreach with Bun (TypeScript source, as in dev)
CMD ["stayzim-start"]
