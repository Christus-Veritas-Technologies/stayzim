# StayZim web (Next.js): landing page and owner login/dashboard
#
# Build from the monorepo root:
#   docker build -f apps/web/Dockerfile \
#     --build-arg NEXT_PUBLIC_SERVER_URL=https://api.stayzim.co.zw \
#     --build-arg NEXT_PUBLIC_WHATSAPP_NUMBER=263771234567 \
#     -t stayzim-web .
#
# NEXT_PUBLIC_* values are baked into the bundle at build time; changing them
# needs a rebuild, not just a restart.

FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /app

# ---- Install ----
FROM base AS deps

# Every workspace manifest, so the lockfile matches and --frozen-lockfile works.
# Only web and its workspace packages are installed (--filter); the web app has
# no database dependency.
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

RUN pnpm install --frozen-lockfile --filter "web..."

# ---- Build ----
FROM deps AS builder

ARG NEXT_PUBLIC_SERVER_URL=http://localhost:9998
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
# StayZim's sales WhatsApp number, digits only with country code. Without it
# the landing page buttons open WhatsApp with no chat chosen.
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=${NEXT_PUBLIC_WHATSAPP_NUMBER}
# Lodge sites are {slug}.NEXT_PUBLIC_SITES_DOMAIN
ARG NEXT_PUBLIC_SITES_DOMAIN=stayzim.co.zw
ENV NEXT_PUBLIC_SITES_DOMAIN=${NEXT_PUBLIC_SITES_DOMAIN}
ENV NEXT_TELEMETRY_DISABLED=1

COPY packages/config/ packages/config/
COPY packages/env/ packages/env/
COPY packages/ui/ packages/ui/
COPY packages/sites/ packages/sites/
COPY apps/web/ apps/web/

RUN pnpm --filter web build

# ---- Runtime ----
FROM base AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=9999 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
# Owned by node so Next can write its cache under .next/
COPY --from=builder --chown=node:node /app/apps/web ./apps/web

USER node
WORKDIR /app/apps/web
EXPOSE 9999

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 9999) + '/').then(r => process.exit(r.status < 500 ? 0 : 1)).catch(() => process.exit(1))"

# Next's own binary rather than `pnpm start`: no pnpm/corepack download at
# start-up as the node user, and Next receives SIGTERM directly
CMD ["sh", "-c", "exec ./node_modules/.bin/next start --port ${PORT}"]
