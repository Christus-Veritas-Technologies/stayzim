#!/bin/sh
# Container entrypoint for apps/server and apps/outreach.
#
# 1. Applies any new Prisma migrations (packages/db/prisma/migrations) to
#    $DATABASE_URL. Skip with SKIP_DB_MIGRATE=1 (SKIP_DB_PUSH=1 still works).
#    When both containers start together, Prisma's lock makes one wait.
# 2. Runs the app's TypeScript entry with Bun, replacing this shell so the app
#    receives SIGTERM directly and shuts down cleanly.
set -e

if [ "${SKIP_DB_MIGRATE:-${SKIP_DB_PUSH:-0}}" != "1" ]; then
  echo "[start] applying database migrations"
  cd /app/packages/db
  if ! output=$(./node_modules/.bin/prisma migrate deploy 2>&1); then
    echo "$output"
    case "$output" in
      *P3005*)
        echo "[start] This database was set up with 'prisma db push', before migrations."
        # Nothing in it yet (no accounts, no lodges): start it again from the migrations
        if bun scripts/reset-if-empty.ts && output=$(./node_modules/.bin/prisma migrate deploy 2>&1); then
          echo "$output" | tail -n 1
        else
          echo "$output"
          echo "[start] It has data, so it wasn't reset. Baseline it once, then restart (see docs/deployment.md):"
          echo "[start]   cd /app/packages/db && ./node_modules/.bin/prisma migrate resolve --applied 0_init"
          exit 1
        fi
        ;;
      *)
        exit 1
        ;;
    esac
  else
    echo "$output" | tail -n 1
  fi
fi

cd "${APP_DIR:?APP_DIR must be set}"
exec bun src/index.ts
