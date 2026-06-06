#!/bin/sh
set -e

cd /app/packages/db
pnpm dlx prisma migrate deploy
pnpm dlx prisma generate

cd /app/apps/web
exec pnpm start
