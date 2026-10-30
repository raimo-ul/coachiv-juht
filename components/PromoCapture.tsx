"use client";

import { useEffect } from "react";

/**
 * SPEC 5.1 step 1: ?kood=XXXX is stored in the cj_promo cookie for 60 days and
 * removed from the URL.
 *
 * Taking it out of the address bar matters for a reason beyond tidiness: the
 * link a company sends goes round an office by forwarding, and a code left in
 * the URL travels with every screenshot and paste. The cookie keeps it with the
 * browser that opened the link.
 *
 * SameSite=Lax so the cookie survives arriving from the company's own email,
 * and no Secure flag decision is needed here because Vercel serves HTTPS only.
 *
 * This is not a tracking cookie under SPEC 2. It holds a discount code the
 * visitor was handed, for as long as they might use it, and nothing else.
 */
const COOKIE = "cj_promo";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export function PromoCapture() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("kood");
    if (!code) return;

    // Stripe promotion codes are short and alphanumeric. Anything else is
    // someone else's query string, and writing it to a cookie would be writing
    // a stranger's text into this browser.
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(clean)) return;

    document.cookie = `${COOKIE}=${encodeURIComponent(clean)}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax`;

    url.searchParams.delete("kood");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, []);

  return null;
}
