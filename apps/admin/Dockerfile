# StayZim admin (Next.js) with the WhatsApp outreach (whatsapp-web.js + Chromium)
#
# Build from the monorepo root:
#   docker build -f apps/admin/Dockerfile \
#     --build-arg NEXT_PUBLIC_SERVER_URL=https://api.stayzim.co.zw \
#     --build-arg NEXT_PUBLIC_WEB_URL=https://stayzim.co.zw \
#     -t stayzim-admin .
#
# NEXT_PUBLIC_* are baked into the browser bundle: changing them needs a rebuild.
# Runtime env: DATABASE_URL (the main stayzim database), CORS_ORIGIN (its own
# address), SERVER_INTERNAL_URL, ADMIN_API_TOKEN and WHATSAPP_*; see
# apps/admin/.env.example. In the whole stack it's the `admin` service of
# deploy/compose.yaml.
#
# Each WhatsApp number runs its own Chromium: give the container about 300 MB per
# number and a larger /dev/shm (docker run --shm-size=1g). Logins are kept in
# Postgres, so a redeploy needs no new QR scans.

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
# Only the admin app and its workspace packages are installed (--filter).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY apps/native/package.json apps/native/
COPY packages/auth/package.json packages/auth/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/mail/package.json packages/mail/
COPY packages/sites/package.json packages/sites/
COPY packages/ui/package.json packages/ui/

# The Prisma client is generated on install (packages/db postinstall); nothing connects
COPY packages/db/prisma.config.ts packages/db/
COPY packages/db/prisma/schema/ packages/db/prisma/schema/
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

# Chromium comes from apt below; puppeteer must not download its own
ENV PUPPETEER_SKIP_DOWNLOAD=1

RUN pnpm install --frozen-lockfile --filter "admin..."

# ---- Build ----
FROM deps AS builder
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:9998
ARG NEXT_PUBLIC_WEB_URL=http://localhost:9999
ARG NEXT_PUBLIC_SITES_DOMAIN=stayzim.co.zw
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL} \
    NEXT_PUBLIC_WEB_URL=${NEXT_PUBLIC_WEB_URL} \
    NEXT_PUBLIC_SITES_DOMAIN=${NEXT_PUBLIC_SITES_DOMAIN} \
    NEXT_TELEMETRY_DISABLED=1 \
    # Only for the build (the settings are checked when next.config loads); the real ones come at runtime
    CORS_ORIGIN=http://localhost:9996 \
    WHATSAPP_ENABLED=false

COPY packages/config/ packages/config/
COPY packages/env/ packages/env/
COPY packages/ui/ packages/ui/
COPY packages/sites/ packages/sites/
COPY packages/db/ packages/db/
COPY apps/admin/ apps/admin/
RUN pnpm --filter admin build

# ---- Runtime ----
FROM base AS runtime

# Chromium for whatsapp-web.js, plus fonts so emoji and non-Latin names render.
# tini runs as PID 1: it passes SIGTERM on (so sessions are saved and Chromium
# closes) and reaps the processes each Chromium leaves behind.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji tini \
  && rm -rf /var/lib/apt/lists/*

ARG NEXT_PUBLIC_SERVER_URL=http://localhost:9998
ARG NEXT_PUBLIC_WEB_URL=http://localhost:9999
ARG NEXT_PUBLIC_SITES_DOMAIN=stayzim.co.zw
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL} \
    NEXT_PUBLIC_WEB_URL=${NEXT_PUBLIC_WEB_URL} \
    NEXT_PUBLIC_SITES_DOMAIN=${NEXT_PUBLIC_SITES_DOMAIN} \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=9996 \
    HOSTNAME=0.0.0.0 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    WHATSAPP_SESSION_PATH=/app/apps/admin/.wwebjs_auth

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/admin ./apps/admin
COPY docker/admin-start.sh /usr/local/bin/stayzim-admin-start
# whatsapp-web.js writes Chromium profiles and a cached WhatsApp Web build here
RUN chmod +x /usr/local/bin/stayzim-admin-start \
  && mkdir -p apps/admin/.wwebjs_auth apps/admin/.wwebjs_cache \
  && chown -R node:node apps/admin

USER node
WORKDIR /app/apps/admin
EXPOSE 9996

# Waiting for a QR scan is fine; the app answering is what counts
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 9996) + '/login').then(r => process.exit(r.status < 500 ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["stayzim-admin-start"]
