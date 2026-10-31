"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Content } from "@/lib/content";
import { fill } from "@/lib/content";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";
import { Page } from "@/components/site";

type PartKey = keyof Content["report"]["parts"];
type QuestionResult = { q: number; yes: number; answered: number };

type Final = {
  period: { start: string; end: string };
  numbers: {
    answeredDays: number;
    questions: QuestionResult[];
    actions: Array<{ key: PartKey; yes: number; answered: number; pct: number | null }>;
    weeks: { first: QuestionResult[]; last: QuestionResult[] };
  };
  comparison: Array<{ key: PartKey; direction: "testHigher" | "daysHigher" | "same" }>;
  ai: { pattern: string; change: string; compare: string; question: string } | null;
  aiStatus?: "pending" | "generating" | "done" | "failed";
};

/** SPEC 11: below five answered days the picture is called approximate. */
const FEW_DAYS = 5;

export function FinalView({ token, content }: { token: string; content: Content }) {
  const t = content.final;
  const [data, setData] = useState<Final | null>(null);
  const [missing, setMissing] = useState(false);

  // The numbers arrive at once. The three written paragraphs are produced on
  // the first view and take about a minute, so this keeps asking while they
  // are on the way. The report is readable throughout; only the last section
  // is pending.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const startedAt = Date.now();

    const load = async () => {
      try {
        const res = await fetch(functionUrl("get-final-by-token", { token }), {
          headers: functionHeaders(),
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) { setMissing(true); return; }

        const json = (await res.json()) as Final;
        setData(json);

        const waiting = json.aiStatus === "pending" || json.aiStatus === "generating";
        if (waiting && Date.now() - startedAt < 150_000) {
          timer = setTimeout(load, 4000);
        }
      } catch {
        if (!cancelled) setMissing(true);
      }
    };

    load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [token]);

  if (missing) {
    return (
      <Page>
        <section className="mx-auto max-w-3xl px-5 py-24">
          <p className="text-xl">{content.report.notFound}</p>
        </section>
      </Page>
    );
  }
  if (!data) return <Page><div className="min-h-[60vh]" /></Page>;

  const { numbers, comparison, ai } = data;
  const few = numbers.answeredDays < FEW_DAYS;

  return (
    <Page>
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 pb-10 pt-12 md:pt-16">
          <p className="eyebrow mb-6 text-muted-foreground">
            {data.period.start} – {data.period.end}
          </p>
          <h1 className="text-6xl leading-[0.9] md:text-8xl">
            Sinu kolm <span className="marker">nädalat</span>
          </h1>
        </div>
      </section>

      {/* Per question: how often it reached the day */}
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <h2 className="mb-8 text-4xl md:text-5xl">{t.heading}</h2>
          {few && <p className="mb-6 text-muted-foreground">{t.weeksNote}</p>}

          {numbers.questions.map((q) => {
            const text = content.daily.questions[`q${q.q}` as keyof typeof content.daily.questions];
            const pct = q.answered ? (q.yes / q.answered) * 100 : 0;
            return (
              <div key={q.q} className="border-t-2 border-rule py-5 first:border-t-0">
                <p className="text-lg leading-snug">{text}</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="h-2 flex-1 border-2 border-rule bg-background">
                    <div className="h-full bg-signal" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="display shrink-0 text-xl tabular-nums">
                    {fill(t.perQuestion, { yes: q.yes, answered: q.answered })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* First week against last */}
      <section className="grain border-b-2 border-rule bg-bone">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <h2 className="mb-2 text-4xl md:text-5xl">{t.weeksHeading}</h2>
          <p className="mb-8 text-muted-foreground">{t.weeksNote}</p>

          <div className="grid gap-3">
            {numbers.questions.map((q, i) => {
              const first = numbers.weeks.first[i];
              const last = numbers.weeks.last[i];
              const text = content.daily.questions[`q${q.q}` as keyof typeof content.daily.questions];
              return (
                <div key={q.q} className="border-2 border-rule bg-background p-4">
                  <p className="text-sm leading-snug">{text}</p>
                  <div className="mt-2 flex gap-6 text-sm">
                    <span className="display text-lg tabular-nums">
                      {fill(t.perQuestion, { yes: first.yes, answered: first.answered })}
                    </span>
                    <span aria-hidden className="text-muted-foreground">→</span>
                    <span className="display text-lg tabular-nums">
                      {fill(t.perQuestion, { yes: last.yes, answered: last.answered })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Against the test */}
      {comparison.length > 0 && (
        <section className="border-b-2 border-rule">
          <div className="mx-auto max-w-3xl px-5 py-12">
            <h2 className="mb-8 text-4xl md:text-5xl">{t.compareHeading}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {comparison.map((c) => (
                <div key={c.key} className="border-2 border-rule p-5">
                  <p className="eyebrow border-b-2 border-rule pb-2 text-muted-foreground">
                    {content.report.parts[c.key].name}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed">
                    {c.direction === "same" ? content.report.pairs.same : t.compare[c.direction]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* The three paragraphs, when they were written. SPEC 11: the numbers
          above are the report, and this is the part that can be missing. */}
      {!ai && (data.aiStatus === "pending" || data.aiStatus === "generating") && (
        <section className="border-b-2 border-rule">
          <div className="mx-auto max-w-3xl px-5 py-14">
            <p className="border-l-4 border-signal pl-6 text-lg italic text-muted-foreground">
              {content.report.ai.loading}
            </p>
          </div>
        </section>
      )}

      {ai && (
        <section className="border-b-2 border-rule">
          <div className="mx-auto max-w-3xl px-5 py-14">
            {(["pattern", "change", "compare"] as const).map((k) => (
              <div key={k} className="mb-10 last:mb-0">
                <h2 className="mb-4 text-3xl md:text-4xl">{t.aiHeadings[k]}</h2>
                <p className="border-l-4 border-signal pl-6 text-lg leading-relaxed">{ai[k]}</p>
              </div>
            ))}
            <p className="mt-10 border-t-2 border-rule pt-8 text-2xl leading-snug md:text-3xl">
              {ai.question}
            </p>
          </div>
        </section>
      )}

      <section className="bg-signal">
        <div className="mx-auto max-w-3xl px-5 py-16 md:py-20">
          <p className="text-2xl leading-snug md:text-3xl">{t.closing}</p>
          <Link
            href="/test"
            className="mt-8 inline-block border-2 border-rule bg-ink px-10 py-4 text-lg font-semibold text-background shadow-[5px_5px_0_0_var(--background)]"
          >
            {t.retestButton}
          </Link>
          <p className="mt-3 text-sm">{t.retestNote}</p>
          <p className="mt-8 border-t-2 border-rule pt-6 text-sm">{t.contact}</p>
        </div>
      </section>
    </Page>
  );
}
