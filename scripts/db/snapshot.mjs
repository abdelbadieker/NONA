// Read-only logical snapshot of the database (data + security definitions)
// as JSON, for recovery and diffing before schema changes.
// Contains customer personal data: keep it private and out of git.
//
// Usage: node --env-file=.env.local scripts/db/snapshot.mjs <output-dir>
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const out = process.argv[2];
if (!out || !process.env.SUPABASE_DB_URL) {
  console.error("Usage: node --env-file=.env.local scripts/db/snapshot.mjs <output-dir>  (needs SUPABASE_DB_URL)");
  process.exit(1);
}
mkdirSync(out, { recursive: true });

const client = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query("begin transaction isolation level repeatable read read only");
const save = (name, data) => writeFileSync(path.join(out, name), JSON.stringify(data, null, 1));

try {
  const { rows: tables } = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1",
  );
  const counts = {};
  for (const { table_name } of tables) {
    const { rows } = await client.query(`select * from public."${table_name}"`);
    save(`public.${table_name}.json`, rows);
    counts[table_name] = rows.length;
  }

  const meta = {
    taken_at: new Date().toISOString(),
    server: (await client.query("select version()")).rows[0].version,
    counts,
    columns: (
      await client.query(
        "select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position",
      )
    ).rows,
    policies: (
      await client.query(
        "select schemaname, tablename, policyname, cmd, roles, qual, with_check from pg_policies where schemaname in ('public','storage') order by 1,2,3",
      )
    ).rows,
    functions: (
      await client.query(
        "select n.nspname as schema, p.proname as name, pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public','private') and p.prokind = 'f' order by 1,2",
      )
    ).rows,
    triggers: (
      await client.query(
        "select event_object_schema as schema, event_object_table as table, trigger_name, action_timing, event_manipulation, action_statement from information_schema.triggers where event_object_schema in ('public','auth') order by 2,3",
      )
    ).rows,
    buckets: (await client.query("select * from storage.buckets")).rows,
    enums: (
      await client.query(
        "select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as labels from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' group by 1",
      )
    ).rows,
  };
  save("_meta.json", meta);
  console.log(`✓ Snapshot written to ${out}`);
  console.log(JSON.stringify(counts));
  console.log(`policies: ${meta.policies.length}, functions: ${meta.functions.length}, triggers: ${meta.triggers.length}`);
} finally {
  await client.query("rollback");
  await client.end();
}
