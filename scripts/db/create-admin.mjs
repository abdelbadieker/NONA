// Create (or update) an admin account: auth user + public.admins row.
// Usage: node --env-file=.env.local scripts/db/create-admin.mjs <email> <password>
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const password = process.argv[3];

if (!url || !key) {
  console.error("✗ Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}
if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/db/create-admin.mjs <email> <password>");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId;
const { data: created, error: createErr } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (created?.user) {
  userId = created.user.id;
} else {
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    userId = existing.id;
    await supabase.auth.admin.updateUserById(userId, { password });
  } else {
    console.error("✗ Could not create or find the user:", createErr?.message);
    process.exit(1);
  }
}

const { error: adminErr } = await supabase.from("admins").upsert({
  id: userId,
  role: "admin",
  email,
  full_name: "NONA Admin",
  is_active: true,
});
if (adminErr) {
  console.error("✗ admins upsert failed:", adminErr.message);
  process.exit(1);
}

console.log(`✓ Admin ready: ${email} (${userId})`);
