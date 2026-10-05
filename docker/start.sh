#!/bin/sh
# Container entrypoint for apps/server and apps/outreach.
#
# 1. Applies the Prisma schema to $DATABASE_URL (skip with SKIP_DB_PUSH=1).
#    Without --accept-data-loss, Prisma refuses any change that would drop data,
#    so a risky schema change stops the container instead of losing rows.
# 2. Runs the app's TypeScript entry with Bun, replacing this shell so the app
#    receives SIGTERM directly and shuts down cleanly.
set -e

if [ "${SKIP_DB_PUSH:-0}" != "1" ]; then
  echo "[start] applying database schema"
  cd /app/packages/db
  ./node_modules/.bin/prisma db push
fi

cd "${APP_DIR:?APP_DIR must be set}"
exec bun src/index.ts
