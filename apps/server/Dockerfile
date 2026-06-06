# Build from the monorepo root: docker build -f apps/server/Dockerfile .
FROM oven/bun:1
WORKDIR /app

# Copy workspace manifests first for layer caching
COPY pnpm-workspace.yaml .npmrc package.json ./
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/ui/package.json packages/ui/
COPY apps/server/package.json apps/server/

# Placeholder DATABASE_URL so prisma generate (postinstall) succeeds at build time.
# Override DATABASE_URL at runtime via -e or compose.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN DATABASE_URL="${DATABASE_URL}" bun install

# Copy all source after install for better layer caching
COPY packages/ packages/
COPY apps/server/ apps/server/

RUN cd apps/server && bun run build

ENV NODE_ENV=production
ENV PORT=9998
# Override CORS_ORIGIN at runtime with the actual web app URL
ENV CORS_ORIGIN=http://localhost:9999

EXPOSE 9998
CMD ["bun", "run", "apps/server/dist/index.mjs"]
