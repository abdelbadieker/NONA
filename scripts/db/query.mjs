// Run an ad-hoc SQL query and print rows as JSON (for verification).
// Usage: node --env-file=.env.local scripts/db/query.mjs "select count(*) from public.products"
import pg from "pg";

const sql = process.argv.slice(2).join(" ");
const conn = process.env.SUPABASE_DB_URL;

if (!conn) {
  console.error("✗ Missing SUPABASE_DB_URL (add it to .env.local).");
  process.exit(1);
}
if (!sql) {
  console.error('Usage: node --env-file=.env.local scripts/db/query.mjs "<sql>"');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: conn,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const res = await client.query(sql);
  console.log(JSON.stringify(res.rows, null, 2));
} catch (err) {
  console.error(`✗ Query failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
