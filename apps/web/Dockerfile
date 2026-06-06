# Build from the monorepo root: docker build -f apps/web/Dockerfile .
FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# Copy workspace manifests for layer caching.
# packages/db is intentionally excluded — the web app has no database dependency.
COPY pnpm-workspace.yaml .npmrc package.json ./
COPY packages/config/package.json packages/config/
COPY packages/env/package.json packages/env/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/

# NEXT_PUBLIC_SERVER_URL is baked into the Next.js bundle at build time.
# Override via --build-arg NEXT_PUBLIC_SERVER_URL=https://your-api.example.com
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:9998
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

RUN pnpm install

# Copy source after install for better layer caching
COPY packages/config/ packages/config/
COPY packages/env/ packages/env/
COPY packages/ui/ packages/ui/
COPY apps/web/ apps/web/

RUN pnpm --filter web build

# ---- Runner ----
FROM node:22-slim AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/.npmrc ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
ENV PORT=9999
ENV HOSTNAME=0.0.0.0

WORKDIR /app/apps/web

EXPOSE 9999

CMD ["pnpm", "start"]
