// Run a .sql file against the Supabase Postgres connection.
// Usage: node --env-file=.env.local scripts/db/run-sql.mjs <file.sql>
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
const conn = process.env.SUPABASE_DB_URL;

if (!conn) {
  console.error("✗ Missing SUPABASE_DB_URL (add it to .env.local).");
  process.exit(1);
}
if (!file) {
  console.error("Usage: node --env-file=.env.local scripts/db/run-sql.mjs <file.sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = new pg.Client({
  connectionString: conn,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log(`✓ Executed ${file}`);
} catch (err) {
  try {
    await client.query("ROLLBACK");
  } catch {}
  console.error(`✗ Failed running ${file}:\n  ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
