"use client";

import { useEffect, useState } from "react";
import type { Content } from "@/lib/content";
import { fill } from "@/lib/content";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";
import { Page } from "@/components/site";
import { LinkedText } from "@/components/LinkedText";

type QuestionResult = { q: number; yes: number; answered: number; yesRate: number | null };

type Final = {
  period: { start: string; end: string };
  numbers: {
    workdays: number;
    answeredDays: number;
    consistency: Array<{ day: string; dayIndex: number; yesCount: number; answered: boolean }>;
    questions: QuestionResult[];
    strongest: QuestionResult[];
    weakest: QuestionResult | null;
  };
  /** The last day's self-assessment. Null when it was not filled in. */
  change: {
    attention: number | null;
    behaviour: number | null;
    openText: string | null;
  } | null;
  /**
   * Two paragraphs and a question since 01.11, or one paragraph and the
   * question when the self-assessment was skipped. Reports written before that
   * hold a plain string and are still rendered, because a link someone already
   * has must keep working.
   */
  ai: string | {
    pattern: string;
    ownWords: string | null;
    question: string;
  } | null;
  aiStatus?: "pending" | "generating" | "done" | "failed";
};

/** SPEC 11: below five answered days the picture is called approximate. */
const FEW_DAYS = 5;

/**
 * The final report, built on AttFocus's personal report.
 *
 * Three blocks and no comparison: how consistently they came back, which
 * questions reached the day most often, and which reached it least. Each one
 * says in its own words that it is not a judgement, because the obvious
 * reading of a number like 9 of 15 is "I failed", and that is not what it
 * means. The sprint directed attention for three weeks; this shows where the
 * attention went.
 */
export function FinalView({ token, content }: { token: string; content: Content }) {
  const t = content.final;
  const [data, setData] = useState<Final | null>(null);
  const [missing, setMissing] = useState(false);

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
        if (waiting && Date.now() - startedAt < 150_000) timer = setTimeout(load, 4000);
      } catch (e) {
        // Logitud, sest 01.11 jõudis vigane anon-võti Vercelisse ja
        // `fetch` viskas enne ühtegi päringut. Vaikiv catch näitas kasutajale
        // „raportit ei leitud" ja ei jätnud kuhugi ühtegi jälge.
        console.error("[lopp] laadimine ebaõnnestus:", e);
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

  const { numbers, ai } = data;
  const few = numbers.answeredDays < FEW_DAYS;

  // An older report is one string; a current one is two paragraphs of which the
  // second may be absent, plus the question. Both end up as a list of
  // paragraphs and an optional question, so the markup below handles one case.
  const reflection =
    typeof ai === "string"
      ? [ai]
      : ai
        ? [ai.pattern, ai.ownWords].filter((x): x is string => Boolean(x?.trim()))
        : [];
  const question = typeof ai === "string" ? null : ai?.question?.trim() || null;
  const questionText = (q: number) =>
    content.daily.questions[`q${q}` as keyof typeof content.daily.questions];
  const pct = (r: QuestionResult) => (r.yesRate ?? 0) * 100;

  return (
    <Page>
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 pb-10 pt-12 md:pt-16">
          <p className="eyebrow mb-6 text-muted-foreground">
            {t.eyebrow} · {data.period.start} – {data.period.end}
          </p>
          <h1 className="text-6xl leading-[0.9] md:text-8xl">
            Sinu kolm <span className="marker">nädalat</span>
          </h1>
        </div>
      </section>

      {/* Consistency. AttFocus leads with this and says outright that it is not
          about doing well, because 9 of 15 reads as a failing mark otherwise. */}
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <h2 className="mb-6 text-4xl md:text-5xl">{t.consistency.heading}</h2>
          <p className="text-lg">
            {fill(t.consistency.intro, {
              answered: numbers.answeredDays,
              workdays: numbers.workdays,
            })}
          </p>
          <p className="mt-3 text-muted-foreground">{t.consistency.meaning}</p>

          <div className="mt-8 border-2 border-rule p-5">
            <p className="eyebrow mb-5 text-muted-foreground">{t.consistency.chart}</p>
            <div className="flex items-end gap-1" style={{ height: "9rem" }}>
              {numbers.consistency.map((d) => (
                <div
                  key={d.dayIndex}
                  className="flex h-full flex-1 flex-col justify-end"
                  title={`${d.day}: ${d.yesCount}/6`}
                >
                  <div
                    className={d.answered ? "bg-signal" : "bg-bone"}
                    style={{ height: d.answered ? `${Math.max(4, (d.yesCount / 6) * 100)}%` : "4%" }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[0.68rem] text-muted-foreground">
              <span>1</span>
              <span>{numbers.workdays}</span>
            </div>
          </div>
        </div>
      </section>

      {/* What reached the day most often */}
      {numbers.strongest.length > 0 && (
        <section className="grain border-b-2 border-rule bg-bone">
          <div className="mx-auto max-w-3xl px-5 py-12">
            <h2 className="text-4xl md:text-5xl">{t.strongest.heading}</h2>
            <p className="mb-8 mt-3 text-muted-foreground">{t.strongest.framing}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {numbers.strongest.map((r) => (
                <div key={r.q} className="border-2 border-rule bg-background p-5">
                  <p className="leading-snug">{questionText(r.q)}</p>
                  <p className="display mt-4 text-4xl">{Math.round(pct(r))}%</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fill(t.perQuestion, { yes: r.yes, answered: r.answered })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* What reached it least, with the note that this is not a problem */}
      {numbers.weakest && (
        <section className="border-b-2 border-rule">
          <div className="mx-auto max-w-3xl px-5 py-12">
            <h2 className="mb-6 text-4xl md:text-5xl">{t.weakest.heading}</h2>
            <div className="border-l-4 border-signal pl-6">
              <p className="text-lg leading-snug">{questionText(numbers.weakest.q)}</p>
              <p className="display mt-4 text-4xl">{Math.round(pct(numbers.weakest))}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {fill(t.perQuestion, { yes: numbers.weakest.yes, answered: numbers.weakest.answered })}
              </p>
              <p className="mt-5 text-muted-foreground">{t.weakest.note}</p>
            </div>
          </div>
        </section>
      )}

      {/* The self-assessment from the last day, in the shape AttFocus's
          personal report uses: the two ratings on a five-step scale with the
          step named, then the person's own words set apart. It sits after the
          counts and before the written paragraph, because the paragraph was
          written with it. */}
      {data.change && (
        <section className="grain border-b-2 border-rule bg-bone">
          <div className="mx-auto max-w-3xl px-5 py-12">
            <h2 className="mb-8 text-4xl md:text-5xl">{t.change.heading}</h2>

            <div className="grid gap-4 md:grid-cols-2">
              {([
                [t.change.attentionQuestion, data.change.attention],
                [t.change.behaviourQuestion, data.change.behaviour],
              ] as const).map(([label, value]) =>
                value == null ? null : (
                  <div key={label} className="border-2 border-rule bg-background p-5">
                    <p className="leading-snug">{label}</p>
                    <p className="display mt-4 text-4xl">{value}/5</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t.change.scaleLabels[value - 1]}
                    </p>
                  </div>
                ),
              )}
            </div>

            {data.change.openText?.trim() && (
              <div className="mt-8">
                <p className="eyebrow mb-4 text-muted-foreground">{t.change.yourThoughts}</p>
                <blockquote className="border-l-4 border-signal pl-6 text-lg italic leading-relaxed">
                  {data.change.openText.trim()}
                </blockquote>
              </div>
            )}
          </div>
        </section>
      )}

      {/* All six, for someone who wants the whole picture */}
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 py-12">
          {few && <p className="mb-6 text-muted-foreground">{t.consistency.meaning}</p>}
          {numbers.questions.map((r) => (
            <div key={r.q} className="border-t-2 border-rule py-5 first:border-t-0">
              <p className="leading-snug">{questionText(r.q)}</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="h-2 flex-1 border-2 border-rule bg-background">
                  <div className="h-full bg-signal" style={{ width: `${pct(r)}%` }} />
                </div>
                <span className="display shrink-0 text-lg tabular-nums">
                  {fill(t.perQuestion, { yes: r.yes, answered: r.answered })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The caveat sits before the reflection rather than after it. It used
          to be the last thing on the page, which meant a personal report ended
          on a disclaimer. Read first it does its job better anyway: the person
          learns what the numbers are not before reading what someone made of
          them, and the page can end on the question, which is the one thing
          asked of them. */}
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <div className="bg-bone p-6 text-muted-foreground">
            <p className="eyebrow mb-3 text-foreground">{t.notMeaning.heading}</p>
            <p>{t.notMeaning.text}</p>
          </div>
          {/* The only way to reach a person from the end of a paid product.
              It lived in the closing block until that was removed. */}
          <p className="mt-6 text-sm">
            <LinkedText
              text={t.contact}
              label={content.about.companies.contact}
              href={`mailto:${content.about.companies.contact}`}
              className="border-b-2 border-rule hover:bg-signal-soft"
            />
          </p>
        </div>
      </section>

      {ai ? (
        <section>
          <div className="mx-auto max-w-3xl px-5 py-14 md:py-20">
            <h2 className="mb-8 text-4xl md:text-5xl">{t.ai.heading}</h2>
            <div className="border-l-4 border-signal pl-6">
              {/* The paragraphs run together as one piece of writing, without
                  headings over them: they are a reflection, not a set of
                  findings, and three labelled boxes would read as a verdict.
                  The question sits apart because it is the one thing asked of
                  the reader rather than told to them. */}
              {reflection.map((text, i) => (
                <p
                  key={i}
                  className="text-xl italic leading-relaxed md:text-2xl md:leading-relaxed [&+p]:mt-6"
                >
                  {text}
                </p>
              ))}
              {question && (
                <p className="mt-8 border-t-2 border-rule pt-6 text-xl leading-relaxed md:text-2xl md:leading-relaxed">
                  {question}
                </p>
              )}
              <p className="mt-6 text-sm text-muted-foreground">{t.ai.signature}</p>
            </div>
          </div>
        </section>
      ) : (data.aiStatus === "pending" || data.aiStatus === "generating") ? (
        <section className="border-b-2 border-rule">
          <div className="mx-auto max-w-3xl px-5 py-14">
            <h2 className="mb-8 text-4xl md:text-5xl">{t.ai.heading}</h2>
            <p className="border-l-4 border-signal pl-6 text-lg italic text-muted-foreground">
              {t.ai.loading}
            </p>
          </div>
        </section>
      ) : null}

      {/* The report used to end on a full-bleed green block carrying a closing
          line and a question. Both were written before the reflection had a
          question of its own, and once it did the block said two things that
          were said better immediately above it: that the report shows where
          attention went, which "Mida see ei tähenda" already says, and a
          generic "which of the six do you want to keep", which the reflection
          now asks from the person's own data. A generic question at the foot
          of a personal report reads as filler, so the report ends on the
          reflection. Removed 01.11 on Raimo's call. */}
    </Page>
  );
}
