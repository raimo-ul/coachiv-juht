"use client";

import { useState } from "react";
import type { Content } from "@/lib/content";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";

/** The cookie PromoCapture wrote when someone arrived on a ?kood= link. */
function promoFromCookie(): string {
  const m = document.cookie.match(/(?:^|;\s*)cj_promo=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : "";
}

/**
 * SPEC 8: the button that starts the programme.
 *
 * The promotion code travels in the request body. It lives in a cookie on this
 * origin and the function is on another, so the browser never sends it there by
 * itself. Stripe is still the one that decides whether the code is real.
 */
export function StartProgramme({ token, content }: { token: string; content: Content }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(functionUrl("create-checkout"), {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({ token, promo: promoFromCookie() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setError(data?.error ?? content.errors.saveFailed);
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(content.errors.saveFailed);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={start}
        disabled={busy}
        className="mt-8 w-full border-2 border-rule bg-ink py-5 text-lg font-semibold text-background shadow-[5px_5px_0_0_var(--background)] disabled:opacity-60 md:w-auto md:px-12"
      >
        {content.report.cta.button}
      </button>
      {error && <p className="mt-3 text-sm font-medium">{error}</p>}
    </>
  );
}
