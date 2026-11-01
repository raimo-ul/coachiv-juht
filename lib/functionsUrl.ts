// Calling the Edge Functions from the browser.
//
// After 30.10 the Next.js app holds no secrets and talks to no database. It
// renders content and calls these functions. The two values below are both
// public: the project URL, and the anon key, which is designed to be shipped in
// a browser bundle. Every table in this project denies anon outright, so the
// key opens nothing on its own.
//
// Modelled on attfocus-v2/src/lib/functionsUrl.ts, which solves the same
// problem for the same reason.

/**
 * Whitespace is stripped from both, not trimmed.
 *
 * On 01.11 the anon key in Vercel was 215 characters where the real one is
 * 208: it had been copied out of a terminal that wrapped it, so a newline and
 * six spaces came along in the middle. A header value may not contain a
 * newline, so fetch threw before making any request, every caller's catch
 * swallowed it, and every token page on the deployed site said "report not
 * found" while the functions behind them answered 200. Nothing appeared in the
 * network tab or the console, because nothing was ever sent.
 *
 * A URL and a JWT contain no whitespace at any position, so removing it is
 * safe and a trim would not have caught this one.
 */
const clean = (v: string | undefined) => (v ?? "").replace(/\s+/g, "");

const BASE = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "");
const ANON = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function functionUrl(name: string, params?: Record<string, string>): string {
  if (!BASE) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL puudub");
  }
  const url = new URL(`${BASE}/functions/v1/${name}`);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
  return url.toString();
}

/**
 * Supabase rejects a request with no apikey before the function runs, even when
 * verify_jwt is off, so the anon key goes on every call.
 */
export function functionHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    apikey: ANON,
    Authorization: `Bearer ${ANON}`,
  };
}
