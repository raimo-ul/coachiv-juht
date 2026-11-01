// Stripe over plain fetch, and webhook signatures over Web Crypto.
//
// No SDK. Two reasons, both learned rather than assumed: the Node SDK's
// constructEvent is synchronous and cannot work in Deno, where every crypto
// primitive returns a promise, and the whole of what this product needs from
// Stripe is one session create, one promotion-code lookup and one signature
// check. That is less code than wiring the SDK in.

import { env } from "./env.ts";

const API = "https://api.stripe.com/v1";

function secret(): string {
  const key = env("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY puudub");
  return key;
}

/**
 * Stripe takes form encoding, including for nested fields, which it spells
 * line_items[0][price]. Flattening here keeps that shape out of the callers.
 */
function form(obj: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object") out.push(...form(item as Record<string, unknown>, `${key}[${i}]`));
        else out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
      });
    } else if (typeof v === "object") {
      out.push(...form(v as Record<string, unknown>, key));
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
    }
  }
  return out;
}

async function call(path: string, body?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${secret()}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body ? form(body).join("&") : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    const message = (json as { error?: { message?: string } })?.error?.message ?? res.status;
    throw new Error(`Stripe ${path}: ${message}`);
  }
  return json as Record<string, unknown>;
}

export type PromoDetails = {
  id: string;
  code: string;
  /** 100 for a seat a company has already paid for. Null for amount-off. */
  percentOff: number | null;
  /** Seats the company bought, or null when Raimo set no limit. */
  maxRedemptions: number | null;
};

/**
 * The promotion code, or null when it is unknown, inactive or spent.
 *
 * Returns the discount size as well as the id, because a code worth 100% can
 * never travel through Checkout: Stripe refuses a session whose total is zero
 * in payment mode. Those seats are granted directly instead, which means this
 * lookup has to be able to tell the two kinds apart.
 *
 * `expand[]=coupon` is what carries percent_off. Reading it needs the
 * restricted key to hold Coupons: read alongside Promotion Codes: read.
 */
export async function findPromotionCode(code: string): Promise<PromoDetails | null> {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(clean)) return null;

  const res = await fetch(
    `${API}/promotion_codes?code=${encodeURIComponent(clean)}&active=true&limit=1` +
      `&expand[]=data.coupon`,
    { headers: { authorization: `Bearer ${secret()}` } },
  );

  // A failed lookup used to return null silently, which is indistinguishable
  // from "no such code" and hid a missing key permission for an afternoon.
  if (!res.ok) {
    console.error(`[stripe] promotion_codes ${res.status}:`, (await res.text()).slice(0, 200));
    return null;
  }

  const data = (await res.json()) as {
    data?: Array<{
      id?: string;
      code?: string;
      max_redemptions?: number | null;
      coupon?: { percent_off?: number | null; valid?: boolean };
    }>;
  };

  const hit = data.data?.[0];
  if (!hit?.id || hit.coupon?.valid === false) return null;

  return {
    id: hit.id,
    code: hit.code ?? clean,
    percentOff: hit.coupon?.percent_off ?? null,
    maxRedemptions: hit.max_redemptions ?? null,
  };
}

export async function createCheckoutSession(opts: {
  priceId: string;
  participantId: string;
  testId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
  promotionCodeId: string | null;
}): Promise<{ id: string; url: string }> {
  const body: Record<string, unknown> = {
    mode: "payment",
    line_items: [{ price: opts.priceId, quantity: 1 }],
    client_reference_id: opts.participantId,
    metadata: { participant_id: opts.participantId, test_id: opts.testId },
    customer_email: opts.email,
    locale: "et",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  };

  // SPEC 8: a code carried in on the link is applied for the person. Without
  // one, Stripe's own field lets them type a code they were given elsewhere.
  // The two cannot both be set.
  if (opts.promotionCodeId) body.discounts = [{ promotion_code: opts.promotionCodeId }];
  else body.allow_promotion_codes = true;

  const session = await call("/checkout/sessions", body);
  return { id: String(session.id), url: String(session.url) };
}

/**
 * Stripe's webhook signature, checked by hand.
 *
 * The header is `t=<unix>,v1=<hex>`, and what is signed is `<t>.<raw body>`.
 * The raw body matters: re-serialising the JSON changes a byte somewhere and
 * the signature stops matching, which is why the caller must pass the text it
 * received rather than an object.
 *
 * The timestamp is checked too. Without it a captured request stays valid for
 * ever, and replaying a paid checkout is exactly the thing worth replaying.
 */
export async function verifyWebhook(
  rawBody: string,
  header: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  const secretKey = env("STRIPE_WEBHOOK_SECRET");
  if (!secretKey) throw new Error("STRIPE_WEBHOOK_SECRET puudub");

  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  const given = parts.v1;
  if (!t || !given) return false;

  if (Math.abs(Date.now() / 1000 - t) > toleranceSeconds) {
    console.warn(`[stripe] allkiri on ${Math.round(Date.now() / 1000 - t)} s vana, lükatakse tagasi`);
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${rawBody}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

  // Length-independent, early-exit-free comparison.
  if (expected.length !== given.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
