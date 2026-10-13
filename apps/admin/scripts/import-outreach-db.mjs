/**
 * Copies the old outreach app's data (its own database, stayzim-outreach) into
 * the main database, which the admin now uses: leads, every message sent and
 * received, and the WhatsApp logins, so no number needs a new QR scan.
 *
 *   OUTREACH_IMPORT_DATABASE_URL=postgresql://…/stayzim-outreach  (the old one)
 *   DATABASE_URL=postgresql://…/stayzim                          (the main one)
 *
 * Runs at every container start while OUTREACH_IMPORT_DATABASE_URL is set, but
 * only copies when the main database has no leads and no WhatsApp logins yet,
 * so leads deleted later never come back. Rows keep their ids; columns the old
 * database doesn't have (a lead's source, lodge name, notes) get their defaults.
 *
 * By hand: pnpm --filter admin import-outreach
 */
import pg from "pg";

const sourceUrl = process.env.OUTREACH_IMPORT_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;

// In the order foreign keys need: messages point at contacts
const TABLES = ["contact", "outreach_message", "inbound_message", "whatsapp_session"];

function log(message) {
  console.log(`[import-outreach] ${message}`);
}

async function columns(client, table) {
  const { rows } = await client.query(
    "select column_name from information_schema.columns where table_schema = current_schema() and table_name = $1",
    [table],
  );
  return new Set(rows.map((row) => row.column_name));
}

async function main() {
  if (!sourceUrl) {
    log("OUTREACH_IMPORT_DATABASE_URL isn't set: nothing to do");
    return;
  }
  if (!targetUrl) throw new Error("DATABASE_URL isn't set");
  if (sourceUrl === targetUrl) throw new Error("OUTREACH_IMPORT_DATABASE_URL is the main database");

  // Every value as Postgres's own text (dates, enums, bytea as \x…), written back
  // as text so each column parses it: nothing changes on the way through
  const source = new pg.Client({ connectionString: sourceUrl, types: { getTypeParser: () => (value) => value } });
  const target = new pg.Client({ connectionString: targetUrl });

  try {
    await source.connect();
  } catch (error) {
    log(`can't open the old outreach database (${error.message}): nothing to import`);
    return;
  }
  await target.connect();

  try {
    const { rows } = await target.query(
      "select (select count(*) from contact)::int as contacts, (select count(*) from whatsapp_session)::int as sessions",
    );
    if (rows[0].contacts > 0 || rows[0].sessions > 0) {
      log(`the main database already has ${rows[0].contacts} leads and ${rows[0].sessions} WhatsApp logins: skipped`);
      return;
    }

    await target.query("begin");
    for (const table of TABLES) {
      const from = await columns(source, table);
      if (from.size === 0) {
        log(`${table}: not in the old database`);
        continue;
      }
      const into = await columns(target, table);
      const shared = [...from].filter((name) => into.has(name));
      const list = shared.map((name) => `"${name}"`).join(", ");
      const placeholders = shared.map((_, index) => `$${index + 1}`).join(", ");
      const insert = `insert into "${table}" (${list}) values (${placeholders}) on conflict do nothing`;

      const { rows: data } = await source.query(`select ${list} from "${table}"`);
      let copied = 0;
      for (const row of data) {
        const result = await target.query(insert, shared.map((name) => row[name]));
        copied += result.rowCount ?? 0;
      }
      log(`${table}: ${copied} of ${data.length} copied`);
    }
    await target.query("commit");
    log("done");
  } catch (error) {
    await target.query("rollback").catch(() => {});
    throw error;
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((error) => {
  console.error("[import-outreach] failed:", error);
  process.exit(1);
});
