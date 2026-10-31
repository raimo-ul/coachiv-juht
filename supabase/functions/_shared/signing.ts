// The signed part of an answer link.
//
// SPEC 10: each daily email carries twelve links, two per question. Storing a
// row per link would be 12 x 15 days x every participant, all of it write-once
// and read-once, so the link carries its own meaning instead and a signature
// proves nobody edited it. AttFocus solves the same problem with random tokens
// in a table; that is the right shape when a link is long-lived and revocable,
// and the wrong shape when there are a hundred and eighty of them per person.
//
// The payload is deliberately small and not secret: which enrolment, which day,
// which question, and yes or no. Anyone can read it. The signature is what
// stops them changing it.
//
// Web Crypto rather than node:crypto, because this runs in Deno.

import { env } from "./env.ts";

export type AnswerPayload = {
  e: string;   // enrollment id
  d: string;   // the day, YYYY-MM-DD in the participant's own time zone
  q: number;   // 1..6
  v: 0 | 1;
};

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(value: string): Uint8Array {
  const pad = value.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function key(): Promise<CryptoKey> {
  const secret = env("LINK_SIGNING_SECRET");
  if (!secret) throw new Error("LINK_SIGNING_SECRET puudub");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** `<payload>.<signature>`, both base64url. */
export async function sign(payload: AnswerPayload): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const mac = await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(body));
  return `${body}.${b64url(new Uint8Array(mac))}`;
}

/**
 * Returns the payload, or null for anything that is not exactly right.
 *
 * crypto.subtle.verify compares in constant time, which matters here: a
 * byte-by-byte comparison that returns early would let someone discover a valid
 * signature one character at a time.
 */
export async function verify(signed: string): Promise<AnswerPayload | null> {
  const dot = signed.lastIndexOf(".");
  if (dot < 1) return null;

  const body = signed.slice(0, dot);
  const mac = signed.slice(dot + 1);

  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await key(),
      unb64url(mac),
      new TextEncoder().encode(body),
    );
    if (!ok) return null;

    const parsed = JSON.parse(new TextDecoder().decode(unb64url(body))) as AnswerPayload;

    // A valid signature over a malformed payload should still be refused: the
    // signature proves the sender, not that the contents make sense.
    if (typeof parsed?.e !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed?.d ?? "")) return null;
    if (!Number.isInteger(parsed.q) || parsed.q < 1 || parsed.q > 6) return null;
    if (parsed.v !== 0 && parsed.v !== 1) return null;

    return parsed;
  } catch {
    return null;
  }
}
