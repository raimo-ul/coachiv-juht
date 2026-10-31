"use client";

import { useEffect, useState } from "react";
import type { Content } from "@/lib/content";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";
import { Page } from "@/components/site";
import { ResultRow } from "@/components/ResultRow";
import { AiParagraph } from "@/components/AiParagraph";
import { ContactOptIn } from "@/components/ContactOptIn";

type Level = "low" | "mid" | "high";
type PartKey = keyof Content["report"]["parts"];

type Report = {
  parts: Array<{ key: PartKey; score: number; display: string; level: Level }>;
  pairs: Array<{ belief: PartKey; action: PartKey; direction: "beliefHigher" | "actionHigher" | "same" }>;
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
      } catch {
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

  const group = (keys: PartKey[], label: string, hint: string) => (
    <section className="border-b-2 border-rule">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <div className="flex items-baseline justify-between border-b-2 border-rule pb-3">
          <span className="eyebrow">{label}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
        {keys.map((k) => {
          const r = row(k);
          return r ? <ResultRow key={k} r={r} track={t.track} /> : null;
        })}
      </div>
    </section>
  );

  return (
    <Page>
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 pb-10 pt-12 md:pt-16">
          <p className="eyebrow mb-6 text-muted-foreground">{t.eyebrow}</p>
          <h1 className="text-6xl leading-[0.9] md:text-8xl">
            Sinu coachiv juhtimine <span className="marker">praegu</span>
          </h1>
          <p className="mt-8 text-lg leading-relaxed">{t.intro}</p>
        </div>
      </section>

      {group(ACTIONS, t.actionsHeading, t.groupHints.actions)}
      {group(BELIEFS, t.beliefsHeading, t.groupHints.beliefs)}

      {report.pairs.length > 0 && (
        <section className="grain border-b-2 border-rule bg-bone">
          <div className="mx-auto max-w-3xl px-5 py-14">
            <h2 className="text-5xl md:text-6xl">{t.pairs.heading}</h2>
            <p className="mb-8 mt-4 max-w-xl text-muted-foreground">{t.pairs.intro}</p>
            <div className="grid gap-4 md:grid-cols-3">
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

      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 py-12">
          <div className="bg-bone p-6 text-muted-foreground">
            <p className="eyebrow mb-3 text-foreground">{t.notMeaning.heading}</p>
            <p>{t.notMeaning.text}</p>
          </div>
        </div>
      </section>

      <section className="bg-signal">
        <div className="mx-auto max-w-3xl px-5 py-16 md:py-20">
          {report.hasActiveProgramme ? (
            <p className="text-xl">{t.cta.active}</p>
          ) : (
            <>
              <h2 className="text-6xl md:text-8xl">{content.programme.title}</h2>
              <p className="mt-6 text-lg leading-relaxed">{content.programme.body}</p>
              <p className="display mt-6 text-4xl">{content.programme.price}</p>
              <button className="mt-8 w-full border-2 border-rule bg-ink py-5 text-lg font-semibold text-background shadow-[5px_5px_0_0_var(--background)] md:w-auto md:px-12">
                {t.cta.button}
              </button>
              <p className="mt-4 text-sm">{t.cta.codeNote}</p>
            </>
          )}
          <ContactOptIn token={token} content={content} />
        </div>
      </section>
    </Page>
  );
}
