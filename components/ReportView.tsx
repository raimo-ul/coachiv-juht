"use client";

import { useEffect, useState } from "react";
import type { Content } from "@/lib/content";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";
import { Page } from "@/components/site";
import { PrintButton } from "@/components/PrintButton";
import { ResultRow } from "@/components/ResultRow";
import { AiParagraph } from "@/components/AiParagraph";
import { LinkedText } from "@/components/LinkedText";
import { StartProgramme } from "@/components/StartProgramme";
import { NewsletterBlock } from "@/components/NewsletterBlock";

type Level = "low" | "mid" | "high";
type PartKey = keyof Content["report"]["parts"];

type Report = {
  parts: Array<{ key: PartKey; score: number; display: string; level: Level }>;
  pairs: Array<{ belief: PartKey; action: PartKey; direction: "beliefHigher" | "actionHigher" | "same" }>;
  /** Which action reaches the day least often, and whether its belief is ahead. */
  pattern?: {
    weakest: "juhendamine" | "voimestamine" | "inspireerimine";
    strongest: "juhendamine" | "voimestamine" | "inspireerimine";
    belief: PartKey;
    beliefHigher: boolean;
    allEqual: boolean;
  };
  ai: { status: string; text: string | null };
  hasActiveProgramme: boolean;
};

const ACTIONS: PartKey[] = ["juhendamine", "voimestamine", "inspireerimine"];
const BELIEFS: PartKey[] = ["inimene", "suhe", "autonoomia"];

export function ReportView({ token, content }: { token: string; content: Content }) {
  const t = content.report;
  const [report, setReport] = useState<Report | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(functionUrl("get-report-by-token", { token }), {
          headers: functionHeaders(),
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) { setMissing(true); return; }
        setReport(await res.json());
      } catch (e) {
        console.error("[raport] laadimine ebaõnnestus:", e);
        if (!cancelled) setMissing(true);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // SPEC 15: a wrong token must not show a report.
  if (missing) {
    return (
      <Page>
        <section className="mx-auto max-w-3xl px-5 py-24">
          <p className="text-xl">{t.notFound}</p>
        </section>
      </Page>
    );
  }

  // Nothing renders until the numbers are here. Six empty cards would be six
  // wrong numbers for a moment.
  if (!report) return <Page><div className="min-h-[60vh]" /></Page>;

  const row = (k: PartKey) => {
    const p = report.parts.find((x) => x.key === k);
    if (!p) return null;
    const copy = content.report.parts[k];
    return {
      name: copy.name,
      score: p.score,
      display: p.display,
      explain: copy.explain,
      landed: copy[p.level],
    };
  };

  const group = (keys: PartKey[], label: string, hint: string, low: string, high: string) => (
    <section className="border-b-2 border-rule">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <div className="flex items-baseline justify-between border-b-2 border-rule pb-3">
          <span className="eyebrow">{label}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
        {keys.map((k) => {
          const r = row(k);
          return r ? <ResultRow key={k} r={r} low={low} high={high} /> : null;
        })}
      </div>
    </section>
  );

  return (
    <Page printable>
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 pb-10 pt-12 md:pt-16">
          <div className="mb-6 flex items-start justify-between gap-4">
            <p className="eyebrow text-muted-foreground">{t.eyebrow}</p>
            <PrintButton label={t.print} />
          </div>
          <h1 className="text-6xl leading-[0.9] md:text-8xl">
            Sinu coachiv juhtimine <span className="marker">praegu</span>
          </h1>
          <p className="mt-8 text-lg leading-relaxed">{t.intro}</p>
        </div>
      </section>

      {/* The one thing worth reading first. It sits above the six rows because
          a page that opens with six numbers asks the reader to work out what
          they mean; this says it in a sentence. The second sentence appears
          only when the belief under that action is held at a higher level than
          the action is done — "the ground is there" is not worth saying when
          it is not.

          Hidden when all three actions scored the same: there is no weakest
          one to name, and inventing a winner out of a tie would be a claim the
          answers do not support. */}
      {report.pattern && !report.pattern.allEqual && (
        <section className="border-b-2 border-rule bg-bone">
          <div data-print="keep" className="mx-auto max-w-3xl px-5 py-12">
            <p className="eyebrow mb-4 text-muted-foreground">{t.pattern.heading}</p>
            <p className="text-2xl leading-snug md:text-3xl">
              {t.pattern.weakest[report.pattern.weakest]}
            </p>
            {report.pattern.beliefHigher && (
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                {t.pattern.beliefHigher[report.pattern.weakest]}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Moved up from just above the offer on 15.11: a reader who has not yet
          seen their numbers is more likely to take the caveat as a caveat,
          rather than as the small print on something being sold. */}
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <div data-print="keep" className="bg-bone p-6 text-muted-foreground">
            <p className="eyebrow mb-3 text-foreground">{t.notMeaning.heading}</p>
            <p>{t.notMeaning.text}</p>
          </div>
        </div>
      </section>

      {group(ACTIONS, t.actionsHeading, t.groupHints.actions, t.track.low, t.track.high)}
      {group(BELIEFS, t.beliefsHeading, t.groupHints.beliefs, t.track.beliefLow, t.track.beliefHigh)}

      {report.pairs.length > 0 && (
        <section className="grain border-b-2 border-rule bg-bone">
          <div className="mx-auto max-w-3xl px-5 py-14">
            <h2 className="text-5xl md:text-6xl">{t.pairs.heading}</h2>
            <p className="mb-8 mt-4 max-w-xl text-muted-foreground">{t.pairs.intro}</p>
            <div data-print="three-up" className="grid gap-4 md:grid-cols-3">
              {report.pairs.map((p) => (
                <div key={p.belief} className="border-2 border-rule bg-background p-5">
                  <p className="eyebrow border-b-2 border-rule pb-2 text-muted-foreground">
                    {t.parts[p.belief].name} · {t.parts[p.action].name}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed">{t.pairs[p.direction]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Renders its own heading, or nothing at all. See the component. */}
      <AiParagraph
        token={token}
        initialText={report.ai.text}
        initialStatus={report.ai.status}
        heading={t.ai.heading}
        loadingLabel={t.ai.loading}
        signature={t.ai.signature}
      />

      {/* The offer belongs on screen, not in a saved file: a PDF read in
          six months would carry a price and a button that do nothing. */}
      <section id="programm" className="bg-signal print:hidden">
        <div className="mx-auto max-w-3xl px-5 py-16 md:py-20">
          {report.hasActiveProgramme ? (
            <p className="text-xl">{t.cta.active}</p>
          ) : (
            <>
              {/* The block used to open cold on the programme's name, with
                  nothing joining it to the report above. A person who has just
                  read their own numbers needs a sentence that turns the page
                  rather than a headline that starts a new one.

                  Since 15.11 that sentence is their own result, and the two
                  questions under it are the two they would actually be asked
                  about the action they do least. The offer stops being a
                  product described in general and becomes the thing the report
                  just pointed at. Falls back to the old line when the pattern
                  is missing or all three actions tied, because then there is
                  no "your least frequent" to name. */}
              {report.pattern && !report.pattern.allEqual ? (
                <>
                  <p className="mb-6 text-xl leading-relaxed md:text-2xl">
                    {t.cta.personal.replace("{action}", t.parts[report.pattern.weakest].name.toLowerCase())}
                  </p>
                  <ul className="mb-8 space-y-3 border-l-2 border-ink pl-5">
                    {content.daily.mapping[report.pattern.weakest].map((q) => (
                      <li key={q} className="text-lg leading-snug">
                        {content.daily.questions[q as keyof typeof content.daily.questions]}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="eyebrow mb-4">{t.cta.transition}</p>
              )}
              <h2 className="text-6xl md:text-8xl">{content.programme.title}</h2>
              <p className="mt-6 text-lg leading-relaxed">{content.programme.body}</p>
              <p className="display mt-6 text-4xl">{content.programme.price}</p>
              <StartProgramme token={token} content={content} />
              <p className="mt-4 text-sm">
                <LinkedText
                  text={content.programme.groupNote}
                  label={content.about.companies.contact}
                  href={`mailto:${content.about.companies.contact}`}
                  className="font-semibold underline underline-offset-4"
                />
              </p>
            </>
          )}
        </div>
      </section>

      <NewsletterBlock
        text={t.newsletter.text}
        button={t.newsletter.button}
        url={t.newsletter.url}
        tone="bone"
      />
    </Page>
  );
}
