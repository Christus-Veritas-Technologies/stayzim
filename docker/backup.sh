#!/bin/sh
# Backs up a StayZim database to a compressed pg_dump file and keeps the newest few.
#
#   DATABASE_URL=postgresql://… docker/backup.sh [folder]
#
# - folder: where backups go (default ./backups). Copy it off the server too,
#   e.g. to R2 with `rclone copy`; a backup on the same disk dies with the disk.
# - KEEP: how many backups to keep in the folder (default 14).
#
# In production, prefer Coolify's scheduled backups of the Postgres resource to
# R2 (docs/deployment.md); this script is for manual copies, or a cron job on a
# server without them. Needs pg_dump from the same major version as the database
# or newer (run it in a postgres image if needed).
set -eu

: "${DATABASE_URL:?Set DATABASE_URL to the database to back up}"
folder="${1:-./backups}"
keep="${KEEP:-14}"

mkdir -p "$folder"
# Prisma's ?schema=… is not a libpq option
url=$(printf '%s' "$DATABASE_URL" | sed -E 's/[?&]schema=[^&]*//')
name=$(printf '%s' "$url" | sed -E 's|.*/([^/?]+).*|\1|')
file="$folder/$name-$(date -u +%Y%m%d-%H%M%S).dump"

# Custom format: compressed, and pg_restore can restore all of it or single tables
pg_dump --format=custom --no-owner --no-privileges --file="$file.partial" "$url"
mv "$file.partial" "$file"
echo "[backup] wrote $file ($(du -h "$file" | cut -f1))"

# Keep the newest $keep backups of this database
ls -1t "$folder/$name"-*.dump 2>/dev/null | tail -n +"$((keep + 1))" | while read -r old; do
  rm -f "$old"
  echo "[backup] removed $old"
done

echo "[backup] restore into an empty database with:"
echo "  pg_restore --no-owner --no-privileges --dbname=\"\$DATABASE_URL\" \"$file\""
