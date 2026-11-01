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
 * SPEC 8: the button that starts the programme, and the field for a company
 * code.
 *
 * The field exists because the link is not enough. Someone who arrived on a
 * ?kood= link carries the code in a cookie and never sees it; someone who took
 * the test on their own weeks earlier, and whose employer bought seats
 * afterwards, opens their report from an old email with no cookie at all. The
 * copy used to tell them to enter the code on the payment page, which stopped
 * being true the moment a 100% code began bypassing Stripe.
 *
 * Three endings, all from the same call:
 *
 *   url       → Stripe, for a payment or a partial discount
 *   enrolled  → a seat the company already paid for; no payment page exists
 *               for a zero total, so the programme simply starts
 *   codeError → the code is unknown or its seats are gone; the pay button
 *               stays, so nobody is left in a dead end
 */
export function StartProgramme({ token, content }: { token: string; content: Content }) {
  const t = content.report.cta;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function start(promo: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(functionUrl("create-checkout"), {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({ token, promo }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? content.errors.saveFailed);
        setBusy(false);
        return;
      }
      if (data?.codeError) {
        setError(data.codeError === "full" ? t.codeFull : t.codeInvalid);
        setBusy(false);
        return;
      }
      if (data?.enrolled) {
        setStarted(String(data.startDate ?? ""));
        setBusy(false);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setError(content.errors.saveFailed);
      setBusy(false);
    } catch (e) {
      console.error("[makse] ebaõnnestus:", e);
      setError(content.errors.saveFailed);
      setBusy(false);
    }
  }

  // The programme has begun. Nothing else on this block applies any more.
  if (started) {
    return (
      <p className="mt-8 border-2 border-rule bg-background p-5 text-lg">
        {t.started.replace("{startDate}", started)}
      </p>
    );
  }

  return (
    <>
      <button
        onClick={() => start(promoFromCookie())}
        disabled={busy}
        className="mt-8 w-full border-2 border-rule bg-ink py-5 text-lg font-semibold text-background shadow-[5px_5px_0_0_var(--background)] disabled:opacity-60 md:w-auto md:px-12"
      >
        {t.button}
      </button>

      <div className="mt-6 border-t-2 border-rule pt-5">
        <p className="text-sm font-semibold">{t.codeNote}</p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) start(code.trim());
          }}
        >
          <label htmlFor="cj-code" className="sr-only">{t.codeLabel}</label>
          <input
            id="cj-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t.codeLabel}
            autoComplete="off"
            spellCheck={false}
            className="w-full border-2 border-rule bg-background px-4 py-3 uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-rule sm:max-w-xs"
          />
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="border-2 border-rule bg-background px-6 py-3 font-semibold transition-colors hover:bg-signal-soft disabled:opacity-50"
          >
            {busy ? t.codeChecking : t.codeButton}
          </button>
        </form>
      </div>

      {error && <p className="mt-3 text-sm font-medium">{error}</p>}
    </>
  );
}
