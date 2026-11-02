// Supabase settings with an actionable error when one is missing — e.g. a
// Vercel environment (Preview) that was never given the variables.
// NEXT_PUBLIC_* are referenced literally so Next.js inlines them for the browser.

export function requiredEnv(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) {
    throw new Error(
      `Missing environment variable ${name}. Set it in .env.local (local) or in Vercel → Settings → Environment Variables for this environment (Production / Preview).`,
    );
  }
  return v;
}

export const supabaseUrl = () => requiredEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = () =>
  requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
