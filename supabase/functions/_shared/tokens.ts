// SPEC 6: 32 random bytes, base64url.
//
// These tokens are the only thing between a URL and someone's report, so they
// come from the platform's cryptographic source and never from Math.random.
// 32 bytes is 256 bits; guessing one is not a threat model.
//
// crypto.getRandomValues rather than node:crypto, because this runs in Deno.
// The Web Crypto API is the one both runtimes have.

export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Shape check before a database round trip.
 *
 * base64url of 32 bytes is always 43 characters. Anything else is a mistyped or
 * truncated link, and answering it without a query keeps a wrong token from
 * costing a lookup.
 */
export function looksLikeToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}
