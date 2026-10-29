// PGlite (in-process Postgres 17) harness: builds a throwaway database with a
// Supabase stub, then applies every migration in supabase/migrations in order,
// plus the seed. Lets us test triggers, RPCs and RLS without a real project.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = path.resolve(__dirname, "../..");
const migrationsDir = path.join(root, "supabase/migrations");

export function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(migrationsDir, f));
}

export async function createTestDb({ seed = true } = {}): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(readFileSync(path.join(__dirname, "supabase-stub.sql"), "utf8"));
  for (const file of migrationFiles()) {
    try {
      await db.exec(readFileSync(file, "utf8"));
    } catch (err) {
      throw new Error(`Migration ${path.basename(file)} failed: ${(err as Error).message}`);
    }
  }
  if (seed) await db.exec(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
  return db;
}

/** Run `fn` as a Supabase API role (anon/authenticated) with an optional JWT subject. */
export async function asRole<T>(
  db: PGlite,
  role: "anon" | "authenticated" | "service_role",
  sub: string | null,
  fn: () => Promise<T>,
): Promise<T> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [sub ?? ""]);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

/** Create an auth user + (optionally) an admin row with the given role key. */
export async function createUser(
  db: PGlite,
  email: string,
  roleKey?: string,
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "insert into auth.users (email) values ($1) returning id",
    [email],
  );
  const id = rows[0].id;
  if (roleKey) {
    await db.query(
      "insert into public.admins (id, email, role_key) values ($1, $2, $3)",
      [id, email, roleKey],
    );
  }
  return id;
}

export async function one<T>(db: PGlite, sql: string, params: unknown[] = []): Promise<T> {
  const { rows } = await db.query<T>(sql, params);
  return rows[0];
}
