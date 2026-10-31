"use client";

import { useEffect, useState } from "react";
import type { Content } from "@/lib/content";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";
import { Page } from "@/components/site";

type Question = { q: number; text: string; answer: boolean | null; yes: string; no: string };

/**
 * SPEC 10: the page behind a yes/no link.
 *
 * The click in the email is a GET and changes nothing, because mail scanners
 * open every link they are sent and would otherwise answer the whole day on
 * someone's behalf. This page loads, then posts the answer the link carried.
 *
 * It shows all six questions rather than only the one clicked, so the rest of
 * the day can be finished here instead of going back to the email.
 */
export function AnswerView({ signed, content }: { signed: string; content: Content }) {
  const t = content.answer;
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const res = await fetch(functionUrl("get-day-by-signed", { signed }), {
      headers: functionHeaders(),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data?.error ?? t.invalid); return null; }
    setQuestions(data.questions);
    return data.questions as Question[];
  }

  async function answer(link: string, q: number) {
    setBusy(q);
    try {
      const res = await fetch(functionUrl("submit-answer"), {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({ signed: link }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data?.error ?? t.invalid);
      else await load();
    } catch {
      setError(t.invalid);
    } finally {
      setBusy(null);
    }
  }

  // On arrival: read the day, then post the answer the link was carrying. The
  // order matters only for the error message, so a dead link says so before
  // anything is written.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await load();
      if (cancelled || !loaded) return;
      await fetch(functionUrl("submit-answer"), {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({ signed }),
      }).then(() => { if (!cancelled) load(); }).catch(() => {});
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signed]);

  if (error) {
    return (
      <Page minimal>
        <section className="mx-auto max-w-xl px-5 py-24">
          <p className="text-xl">{error}</p>
        </section>
      </Page>
    );
  }

  if (!questions) return <Page minimal><div className="min-h-[50vh]" /></Page>;

  const answered = questions.filter((q) => q.answer !== null).length;
  const allDone = answered === 6;

  return (
    <Page minimal>
      <section className="mx-auto max-w-xl px-5 py-12 md:py-16">
        <p className="eyebrow mb-4 text-muted-foreground">
          {allDone ? t.done : t.saved}
        </p>
        <h1 className="text-5xl md:text-6xl">{content.daily.intro}</h1>

        {!allDone && <p className="mt-6 text-lg">{t.rest}</p>}

        <div className="mt-8 space-y-4">
          {questions.map((q) => (
            <div
              key={q.q}
              className={`border-2 border-rule p-4 md:p-5 ${q.answer !== null ? "bg-bone" : "bg-background"}`}
            >
              <p className="mb-4 text-lg leading-snug">{q.text}</p>
              <div className="grid grid-cols-2 gap-3">
                {([["yes", true, content.daily.yes], ["no", false, content.daily.no]] as const).map(
                  ([which, value, label]) => {
                    const on = q.answer === value;
                    return (
                      <button
                        key={which}
                        disabled={busy === q.q}
                        onClick={() => answer(which === "yes" ? q.yes : q.no, q.q)}
                        className={[
                          "display border-2 border-rule py-3 text-2xl transition-colors disabled:opacity-50",
                          on ? "bg-signal" : "bg-background hover:bg-signal-soft",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    );
                  },
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">{content.daily.footer}</p>
      </section>
    </Page>
  );
}
