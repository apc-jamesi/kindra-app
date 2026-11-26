// Read-only PostgreSQL MCP server for Kindra's local database (DATABASE_URL in .env).
// Every query runs in a READ ONLY transaction over the extended protocol (one statement only),
// on a session that defaults to read-only, with a statement timeout.
import pg from "pg";
import { loadProjectEnv, serve, text } from "./lib.mjs";

loadProjectEnv();
if (!process.env.DATABASE_URL) {
  process.stderr.write("[kindra-postgres] DATABASE_URL is not set in .env / .env.local\n");
  process.exit(1);
}

const MAX_ROWS = 200;
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  options: "-c default_transaction_read_only=on -c statement_timeout=15000",
});

async function readOnly(sql, values) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    return await client.query({ text: sql, values, queryMode: "extended" });
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
}

serve({
  name: "kindra-postgres",
  version: "1.0.0",
  tools: [
    {
      name: "list_tables",
      description: "List tables and views in the Kindra database (excluding system schemas).",
      inputSchema: { type: "object", properties: {} },
      handler: async () => {
        const { rows } = await readOnly(
          `SELECT table_schema, table_name, table_type FROM information_schema.tables
           WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
           ORDER BY table_schema, table_name`,
        );
        return text(rows);
      },
    },
    {
      name: "describe_table",
      description: "Show the columns, types, nullability and defaults of a table.",
      inputSchema: {
        type: "object",
        properties: {
          table: { type: "string", description: "Table name" },
          schema: { type: "string", description: "Schema name (default: public)" },
        },
        required: ["table"],
      },
      handler: async ({ table, schema = "public" }) => {
        const { rows } = await readOnly(
          `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
           WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position`,
          [schema, table],
        );
        return rows.length ? text(rows) : { ...text(`No table ${schema}.${table}`), isError: true };
      },
    },
    {
      name: "query",
      description: `Run a single read-only SQL statement (SELECT / WITH / EXPLAIN). Writes are rejected. Returns at most ${MAX_ROWS} rows.`,
      inputSchema: {
        type: "object",
        properties: { sql: { type: "string", description: "One SQL statement" } },
        required: ["sql"],
      },
      handler: async ({ sql }) => {
        const res = await readOnly(sql);
        const rows = res.rows ?? [];
        return text({
          rowCount: res.rowCount,
          truncated: rows.length > MAX_ROWS,
          rows: rows.slice(0, MAX_ROWS),
        });
      },
    },
  ],
});
