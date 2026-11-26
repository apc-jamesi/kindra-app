// Creates the Kindra database (if missing) and applies db/schema.sql.
//   npm run db:setup   -> create database + tables (safe to re-run)
//   npm run db:reset   -> drop Kindra's tables, recreate them; the app reseeds demo data on next load
// Reads DATABASE_URL from the environment, .env.local or .env (same files Next.js reads).
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readEnv(name) {
  if (process.env[name]) return process.env[name];
  for (const file of [".env.local", ".env"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)\\s*$`));
      if (m && m[1]) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

const url = readEnv("DATABASE_URL");
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local, for example:\n  DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/kindra");
  process.exit(1);
}
const reset = process.argv.includes("--reset");
const target = new URL(url);
const dbName = decodeURIComponent(target.pathname.slice(1));
if (!/^[A-Za-z0-9_-]+$/.test(dbName)) {
  console.error(`Unexpected database name "${dbName}" in DATABASE_URL.`);
  process.exit(1);
}

try {
  // 1) Create the database if it does not exist (connect to the default "postgres" database for this).
  const admin = new URL(url);
  admin.pathname = "/postgres";
  const a = new pg.Client({ connectionString: admin.toString() });
  await a.connect();
  const exists = await a.query("select 1 from pg_database where datname = $1", [dbName]);
  if (!exists.rowCount) {
    await a.query(`create database "${dbName}"`);
    console.log(`Created database ${dbName}`);
  }
  await a.end();

  // 2) Apply the schema.
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  if (reset) {
    await db.query("drop table if exists alert_messages, urgent_alerts, audit_log, contact_changes, action_items, cases, students cascade");
    console.log("Dropped Kindra tables");
  }
  await db.query(readFileSync(join(root, "db", "schema.sql"), "utf8"));
  const { rows } = await db.query("select count(*)::int as n from students");
  console.log(`Schema ready in "${dbName}". Students: ${rows[0].n}${rows[0].n ? "" : " (demo data loads the first time you open the app)"}`);
  await db.end();
} catch (err) {
  console.error(`Database setup failed: ${err.message}`);
  if (/password authentication failed/i.test(err.message)) console.error("Check the user name and password in DATABASE_URL.");
  if (/ECONNREFUSED/.test(err.message)) console.error("Is PostgreSQL running? Check the host and port in DATABASE_URL.");
  process.exit(1);
}
