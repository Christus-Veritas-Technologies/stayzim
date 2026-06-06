# Build from the monorepo root: docker build -f apps/web/Dockerfile .
FROM node:20-alpine
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml .npmrc package.json ./
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/

# Placeholder DATABASE_URL so prisma generate (postinstall) succeeds at build time.
# NEXT_PUBLIC_SERVER_URL is baked into the Next.js bundle at build time — override
# via --build-arg NEXT_PUBLIC_SERVER_URL=https://your-api.example.com if needed.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:9998
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}

RUN DATABASE_URL="${DATABASE_URL}" pnpm install

# Copy all source after install for better layer caching
COPY packages/ packages/
COPY apps/web/ apps/web/

RUN pnpm --filter web build

ENV NODE_ENV=production
ENV PORT=9999
ENV HOSTNAME=0.0.0.0

COPY apps/web/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 9999
ENTRYPOINT ["/docker-entrypoint.sh"]
