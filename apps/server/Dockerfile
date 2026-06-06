FROM oven/bun:1

WORKDIR /app

COPY . .

ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

RUN bun install

# Generate Prisma client if your project uses Prisma
RUN cd packages/db && bunx prisma generate

RUN cd apps/server && bun run build

ENV NODE_ENV=production
ENV PORT=9998
ENV CORS_ORIGIN=http://localhost:9999

EXPOSE 9998

CMD ["bun", "run", "apps/server/dist/index.mjs"]