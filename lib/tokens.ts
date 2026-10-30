// SPEC 6: 32 random bytes, base64url.
//
// These tokens are the only thing standing between a URL and someone's report,
// so they come from the platform's cryptographic source and never from
// Math.random. 32 bytes is 256 bits; guessing one is not a threat model.

import "server-only";
import { randomBytes } from "node:crypto";

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Shape check before a database round trip.
 *
 * A base64url-encoded 32 bytes is always 43 characters. Anything else is a
 * mistyped or truncated link, and answering it without a query keeps a wrong
 * token from costing a lookup.
 */
export function looksLikeToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}
