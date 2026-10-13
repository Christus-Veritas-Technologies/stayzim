#!/bin/sh
# Container entrypoint for apps/admin.
#
# The API container (apps/server) applies the database migrations; compose starts
# the admin once it's healthy, so the tables are there.
#
# 1. Once, on the first deploy after the old outreach app: copies its contacts,
#    messages and WhatsApp logins into the main database when
#    OUTREACH_IMPORT_DATABASE_URL is set (it does nothing once there's data).
#    A failed import is logged and the admin starts anyway.
# 2. Runs `next start`, replacing this shell so the app receives SIGTERM
#    directly and saves each WhatsApp session before it stops.
set -e

cd /app/apps/admin

if [ -n "${OUTREACH_IMPORT_DATABASE_URL:-}" ]; then
  node scripts/import-outreach-db.mjs || echo "[start] the outreach import failed; starting anyway"
fi

exec ./node_modules/.bin/next start --port "${PORT:-9996}" --hostname "${HOSTNAME:-0.0.0.0}"
