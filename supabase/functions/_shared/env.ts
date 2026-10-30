// Reading configuration, from Deno in production and from Node under vitest.
//
// The shared modules are deployed into Supabase Edge Functions, where settings
// arrive as Deno.env, and they are unit tested under vitest, where there is no
// Deno at all. Without this, every test of a module that reads a setting would
// die on a missing global for a reason that has nothing to do with the test.
//
// Secrets live in the Supabase project's function secrets and nowhere else:
// not in this repo, not in Vercel, not in the database. Supabase stores them
// hashed, so a value that goes in cannot be read back out, only replaced.

declare const Deno: { env: { get(key: string): string | undefined } } | undefined;

export function env(key: string): string | undefined {
  if (typeof Deno !== "undefined" && Deno?.env) return Deno.env.get(key);
  // deno-lint-ignore no-explicit-any
  const proc = (globalThis as any).process;
  return proc?.env?.[key];
}

/**
 * The kill switch for outgoing mail.
 *
 * Not in SPEC. Carried over from AttFocus, where its absence meant the only way
 * to stop mail was revoking the Brevo key, which takes every other notification
 * down with it.
 */
export function emailDisabled(): boolean {
  const raw = (env("EMAIL_DISABLED") ?? "").toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
