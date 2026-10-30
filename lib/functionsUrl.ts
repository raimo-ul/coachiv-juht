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

const BASE = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
