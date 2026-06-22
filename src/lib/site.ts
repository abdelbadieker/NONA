/** The public site origin, trimmed (guards against stray whitespace in env). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).trim();

/** A valid URL for `metadataBase`; never throws on a malformed env value. */
export function siteUrl(): URL {
  try {
    return new URL(SITE_URL);
  } catch {
    return new URL("http://localhost:3000");
  }
}
