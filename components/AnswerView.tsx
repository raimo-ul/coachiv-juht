"use client";

import { useEffect, useState } from "react";
import type { Content } from "@/lib/content";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";
import { Page } from "@/components/site";

type Question = { q: number; text: string; answer: boolean | null };

/**
 * The page the daily letter's single button opens.
 *
 * Built to match AttFocus's TokenDaily, which is the shape Raimo asked for:
 * mark all six, then press send once. The Jah and Ei buttons set local state
 * and touch the network for nothing; one submit carries the lot.
 *
 * The letter carries one link and no answers, because mail scanners follow
 * every link they are sent. A letter holding twelve yes/no links would let a
 * scanner answer somebody's whole day before they had read it.
 */
export function AnswerView({ signed, content }: { signed: string; content: Content }) {
  const t = content.answer;

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(functionUrl("get-day-by-signed", { signed }), {
          headers: functionHeaders(),
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) { setError(data?.error ?? t.invalid); return; }

        setQuestions(data.questions);

        // A day already answered opens showing what was said, so a second
        // visit can correct it rather than starting from nothing.
        const existing: Record<number, boolean> = {};
        for (const q of data.questions as Question[]) {
          if (q.answer !== null) existing[q.q] = q.answer;
        }
        setAnswers(existing);
      } catch (e) {
        console.error("[paev] laadimine ebaõnnestus:", e);
        if (!cancelled) setError(t.invalid);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signed]);

  const canSubmit = questions !== null && questions.every((q) => answers[q.q] !== undefined);

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(functionUrl("submit-day"), {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({ signed, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data?.error ?? t.invalid); setSubmitting(false); return; }
      setSubmitted(true);
    } catch (e) {
      console.error("[paev] saatmine ebaõnnestus:", e);
      setError(t.invalid);
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <Page minimal>
        <section className="mx-auto max-w-xl px-5 py-24">
          <p className="text-xl">{error}</p>
        </section>
      </Page>
    );
  }

  if (submitted) {
    return (
      <Page minimal>
        <section className="mx-auto max-w-xl px-5 py-24">
          <p className="eyebrow mb-4 text-muted-foreground">{t.saved}</p>
          <h1 className="text-5xl md:text-6xl">{t.done}</h1>
        </section>
      </Page>
    );
  }

  if (!questions) return <Page minimal><div className="min-h-[50vh]" /></Page>;

  return (
    <Page minimal>
      <section className="mx-auto max-w-xl px-5 py-12 md:py-16">
        <h1 className="text-5xl md:text-6xl">{content.daily.intro}</h1>

        <div className="mt-8 space-y-4">
          {questions.map((q) => (
            <div
              key={q.q}
              className={`border-2 border-rule p-4 md:p-5 ${answers[q.q] !== undefined ? "bg-bone" : "bg-background"}`}
            >
              <p className="mb-4 text-lg leading-snug">{q.text}</p>
              <div className="grid grid-cols-2 gap-3">
                {([[true, content.daily.yes], [false, content.daily.no]] as const).map(([value, label]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAnswers((prev) => ({ ...prev, [q.q]: value }))}
                    className={[
                      "display border-2 border-rule py-3 text-2xl transition-colors",
                      answers[q.q] === value ? "bg-signal" : "bg-background hover:bg-signal-soft",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
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
          {submitting ? t.submitting : t.submit}
        </button>

        <p className="mt-6 text-sm text-muted-foreground">{content.daily.footer}</p>
      </section>
    </Page>
  );
}
