"use client";

import { useEffect, useState } from "react";
import type { Content } from "@/lib/content";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";
import { Page } from "@/components/site";

/**
 * The self-assessment, opened from the last day's letter.
 *
 * Lifted from AttFocus: two 1-5 scales and one open question, all three
 * required, one submit. AttFocus's own component is the same three fields with
 * the same `canSubmit` rule; what changed on the way over is the house style,
 * which here is the daily page's (hairline rules, green as fill, the shadow on
 * the live button).
 *
 * The two numbers go into the report. The open text goes into the report and
 * into the AI paragraph, where it is the only thing written in the person's own
 * words.
 */
export function SelfAssessmentView({ token, content }: { token: string; content: Content }) {
  const t = content.selfAssessment;

  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);
  const [attention, setAttention] = useState<number | null>(null);
  const [behaviour, setBehaviour] = useState<number | null>(null);
  const [openText, setOpenText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(functionUrl("get-self-assessment-by-token", { token }), {
          headers: functionHeaders(),
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) { setMissing(true); return; }

        const data = await res.json();
        // Already filled in: show the thank-you rather than an empty form, so a
        // second visit does not look like the first one failed.
        if (data?.submitted) setSubmitted(true);
        setLoaded(true);
      } catch {
        if (!cancelled) setMissing(true);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const canSubmit = attention !== null && behaviour !== null && openText.trim().length > 0;

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(functionUrl("submit-self-assessment"), {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({
          token,
          attention_change: attention,
          behaviour_change: behaviour,
          open_text: openText.trim(),
        }),
      });
      // 409 means someone already submitted this one, which from here is the
      // same outcome as success. AttFocus treats it the same way.
      if (res.ok || res.status === 409) { setSubmitted(true); return; }
      setMissing(res.status === 404);
      setSubmitting(false);
    } catch {
      setSubmitting(false);
    }
  }

  if (missing) {
    return (
      <Page minimal>
        <section className="mx-auto max-w-xl px-5 py-24">
          <p className="text-xl">{t.notFound}</p>
        </section>
      </Page>
    );
  }

  if (submitted) {
    return (
      <Page minimal>
        <section className="mx-auto max-w-xl px-5 py-24">
          <p className="eyebrow mb-4 text-muted-foreground">{t.doneTitle}</p>
          <h1 className="text-5xl md:text-6xl">{t.title}</h1>
          <p className="mt-6 text-lg text-muted-foreground">{t.doneBody}</p>
        </section>
      </Page>
    );
  }

  if (!loaded) return <Page minimal><div className="min-h-[50vh]" /></Page>;

  return (
    <Page minimal>
      <section className="mx-auto max-w-xl px-5 py-12 md:py-16">
        <h1 className="text-5xl md:text-6xl">{t.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t.subtitle}</p>

        <p className="mt-8 border-2 border-rule bg-bone p-3 text-center text-sm text-muted-foreground">
          {t.scaleHelp}
        </p>

        <Scale label={t.attention} value={attention} onChange={setAttention} />
        <Scale label={t.behaviour} value={behaviour} onChange={setBehaviour} />

        <div className="mt-6 border-2 border-rule bg-background p-4 md:p-5">
          <label htmlFor="sa-open" className="block text-lg leading-snug">
            {t.openQuestion}
          </label>
          <textarea
            id="sa-open"
            value={openText}
            onChange={(e) => setOpenText(e.target.value)}
            placeholder={t.openPlaceholder}
            rows={5}
            className="mt-4 w-full resize-none border-2 border-rule bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-signal placeholder:text-muted-foreground"
          />
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className={[
            "mt-8 w-full border-2 border-rule py-4 text-lg font-semibold transition-colors",
            canSubmit && !submitting
              ? "bg-signal shadow-[5px_5px_0_0_var(--rule)]"
              : "cursor-not-allowed bg-bone text-muted-foreground",
          ].join(" ")}
        >
          {submitting ? t.saving : t.submit}
        </button>
      </section>
    </Page>
  );
}

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <div className={`mt-6 border-2 border-rule p-4 md:p-5 ${value !== null ? "bg-bone" : "bg-background"}`}>
      <p className="mb-4 text-lg leading-snug">{label}</p>
      <div className="grid grid-cols-5 gap-2 md:gap-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={[
              "display border-2 border-rule py-3 text-2xl transition-colors",
              value === n ? "bg-signal" : "bg-background hover:bg-signal-soft",
            ].join(" ")}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
