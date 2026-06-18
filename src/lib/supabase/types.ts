// Generic Supabase client typing. We hand-maintain domain types in
// `src/lib/types.ts` instead of the full generated `Database` type (generating
// it requires either Docker locally — `supabase gen types --db-url` — or a
// Supabase access token — `--project-id`). Swap this for the generated file
// later if either becomes available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
