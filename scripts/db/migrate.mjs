// Apply pending migrations in order, each in its own transaction, recording
// them in private.schema_migrations. Safe to re-run.
//
// Usage:
//   node --env-file=.env.local scripts/db/migrate.mjs            # apply pending
//   node --env-file=.env.local scripts/db/migrate.mjs --status   # list only
//   node --env-file=.env.local scripts/db/migrate.mjs --dry-run  # run, then roll back
//
// Databases created before this runner existed already contain 0001/0002:
// if public.products exists and nothing is recorded yet, those two are
// marked as applied (baseline) instead of being re-run.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const dir = path.resolve("supabase/migrations");
const conn = process.env.SUPABASE_DB_URL;
const args = new Set(process.argv.slice(2));
const statusOnly = args.has("--status");
const dryRun = args.has("--dry-run");

if (!conn) {
  console.error("✗ Missing SUPABASE_DB_URL (add it to .env.local).");
  process.exit(1);
}

const files = readdirSync(dir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  // --status and --dry-run never write: the tracking table is only created
  // when actually applying.
  const { rows: reg } = await client.query(
    "select to_regclass('private.schema_migrations') as m, to_regclass('public.products') as p",
  );
  let recorded = [];
  if (reg[0].m) {
    ({ rows: recorded } = await client.query("select name from private.schema_migrations"));
  }
  const applied = new Set(recorded.map((r) => r.name));
  const baseline = applied.size === 0 && Boolean(reg[0].p);
  if (baseline) {
    applied.add("0001_init.sql");
    applied.add("0002_storage.sql");
    console.log("• Existing database detected: 0001/0002 treated as already applied (baseline).");
  }
  if (!statusOnly && !dryRun) {
    await client.query(`
      create schema if not exists private;
      create table if not exists private.schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      );`);
    for (const name of applied) {
      await client.query("insert into private.schema_migrations(name) values ($1) on conflict do nothing", [name]);
    }
  }
  const pending = files.filter((f) => !applied.has(f));

  for (const f of files) console.log(`${applied.has(f) ? "✓" : "…"} ${f}`);
  if (statusOnly || pending.length === 0) {
    console.log(pending.length ? `${pending.length} pending.` : "Up to date.");
    process.exit(0);
  }

  if (dryRun) {
    // Later migrations depend on earlier ones: run them all in ONE
    // transaction and roll everything back at the end.
    await client.query("begin");
    try {
      for (const f of pending) {
        await client.query(readFileSync(path.join(dir, f), "utf8"));
        console.log(`✓ ${f} ok`);
      }
    } catch (err) {
      console.error(`✗ dry run failed:\n  ${err.message}`);
      process.exitCode = 1;
    } finally {
      await client.query("rollback");
      console.log("Dry run finished — nothing was changed.");
    }
  } else {
    for (const f of pending) {
      const sql = readFileSync(path.join(dir, f), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into private.schema_migrations(name) values ($1)", [f]);
        await client.query("commit");
        console.log(`✓ applied ${f}`);
      } catch (err) {
        await client.query("rollback").catch(() => {});
        console.error(`✗ ${f} failed and was rolled back:\n  ${err.message}`);
        process.exitCode = 1;
        break;
      }
    }
  }
} finally {
  await client.end();
}
