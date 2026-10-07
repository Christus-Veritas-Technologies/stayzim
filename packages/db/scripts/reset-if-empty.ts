/**
 * For docker/start.sh when `prisma migrate deploy` stops with P3005 (tables made
 * by `prisma db push`, before migrations). If that database holds no accounts
 * and no lodges, its tables are throw-away: drop them, so the migrations can
 * build it again from scratch. With any owner or lodge in it, nothing is
 * touched and it exits 2, and the database needs baselining by hand.
 *
 *   bun scripts/reset-if-empty.ts
 */
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

async function rows(table: string) {
  const exists = await client.query("select to_regclass($1) is not null as found", [`public."${table}"`]);
  if (!exists.rows[0]?.found) return 0;
  const result = await client.query(`select count(*)::int as n from public."${table}"`);
  return result.rows[0]?.n ?? 0;
}

const users = await rows("user");
const lodges = await rows("lodge");
if (users > 0 || lodges > 0) {
  console.log(`[reset-if-empty] Not resetting: the database has ${users} accounts and ${lodges} lodges.`);
  await client.end();
  process.exit(2);
}

console.log("[reset-if-empty] No accounts or lodges: dropping the old tables so the migrations can start fresh.");
await client.query("drop schema public cascade");
await client.query("create schema public");
await client.end();
