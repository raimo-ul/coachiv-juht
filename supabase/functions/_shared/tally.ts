// Tally webhook signatures.
//
// Separate from stripe.ts on purpose. The two look alike for about three lines
// and then diverge: Stripe sends `t=...,v1=...` with a hex digest over
// `${timestamp}.${body}` and tolerates 300 seconds of clock drift. Tally sends
// one bare value, base64, over the body alone.
//
// What that costs us: with no timestamp there is no replay window, so a
// captured valid request stays valid forever. The signature proves the body
// came from Tally and nothing more. The only thing standing between a replay
// and a second summary in someone's inbox is the primary key on
// bingo_submissions, which is why bingo-submit inserts before it sends.
//
// Lifted from ~/coachiv-juht/supabase/functions/_shared/stripe.ts: the
// crypto.subtle HMAC import and the constant-time compare are the same shape
// there. Everything above and below them is Tally's own.
//
// Documented at https://tally.so/help/webhooks, read 27.11.2026.

import { env } from "./env.ts";

/** Base64 of the HMAC-SHA256 of the raw body. */
async function sign(secret: string, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return btoa(String.fromCharCode(...new Uint8Array(mac)));
}

/** Length-independent, early-exit-free comparison. */
function sameSignature(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * True when the header matches the body.
 *
 * `rawBody` must be the exact text that arrived (`await req.text()`). Parsing
 * and re-serialising JSON reorders nothing in practice but changes whitespace,
 * and the signature is over bytes.
 *
 * The secret is read here rather than passed in so a call site cannot forget
 * it. Missing secret throws: a webhook endpoint that cannot check its
 * signature must fail loudly, never accept.
 */
export async function verifyTallySignature(
  rawBody: string,
  header: string | null,
  secret = env("TALLY_SIGNING_SECRET"),
): Promise<boolean> {
  if (!secret) throw new Error("TALLY_SIGNING_SECRET puudub");
  if (!header) return false;
  return sameSignature(await sign(secret, rawBody), header.trim());
}

/** Exported for the tests, which need to produce a valid header. */
export const signForTest = sign;
