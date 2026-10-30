"use client";

import { useEffect, useState } from "react";
import type { Content } from "@/lib/content";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";
import { AiParagraph } from "@/components/AiParagraph";

type Level = "low" | "mid" | "high";
type PartKey = keyof Content["report"]["parts"];

type Report = {
  parts: Array<{ key: PartKey; score: number; display: string; level: Level }>;
  pairs: Array<{ belief: PartKey; action: PartKey; direction: "beliefHigher" | "actionHigher" }>;
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

        if (!res.ok) {
          setMissing(true);
          return;
        }
        setReport(await res.json());
      } catch {
        if (!cancelled) setMissing(true);
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  // SPEC 15: a wrong token must not show a report. It shows the one sentence
  // written for it, rather than a blank page or a stack trace.
  if (missing) {
    return (
      <main className="page">
        <div className="wrap grow"><p>{t.notFound}</p></div>
      </main>
    );
  }

  // Nothing is rendered until the numbers are here. A skeleton of six empty
  // cards would be six wrong numbers for a moment.
  if (!report) {
    return <main className="page"><div className="wrap grow" /></main>;
  }

  const byKey = (k: PartKey) => report.parts.find((p) => p.key === k);

  return (
    <main className="page">
      <div className="wrap wrap-wide grow stack-lg">
        <div>
          <h1>{t.title}</h1>
          <p className="dim">{t.intro}</p>
        </div>

        <section className="stack">
          <h2>{t.actionsHeading}</h2>
          {ACTIONS.map((k) => <Part key={k} partKey={k} part={byKey(k)} content={content} />)}
        </section>

        <section className="stack">
          <h2>{t.beliefsHeading}</h2>
          {BELIEFS.map((k) => <Part key={k} partKey={k} part={byKey(k)} content={content} />)}
        </section>

        {report.pairs.length > 0 && (
          <section className="stack">
            <h2>{t.pairs.heading}</h2>
            {report.pairs.map((p) => (
              <div key={p.belief} className="card">
                <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>
                  {t.parts[p.belief].name} · {t.parts[p.action].name}
                </p>
                <p>{t.pairs[p.direction]}</p>
              </div>
            ))}
          </section>
        )}

        {/* Renders its own heading, or nothing at all. See the component. */}
        <AiParagraph
          token={token}
          initialText={report.ai.text}
          initialStatus={report.ai.status}
          heading={t.ai.heading}
          loadingLabel={t.ai.loading}
        />

        <section className="card">
          <h3>{t.notMeaning.heading}</h3>
          <p className="small dim">{t.notMeaning.text}</p>
        </section>

        <hr className="rule" />

        {/* Stage A renders the call to action; the checkout behind it arrives
            in stage B, so the button is not wired up yet. */}
        <section className="stack">
          <h2>{t.cta.heading}</h2>
          {report.hasActiveProgramme ? (
            <p>{t.cta.active}</p>
          ) : (
            <>
              <p className="dim">{t.cta.text}</p>
              <p className="small dim">{t.cta.codeNote}</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Part({
  partKey, part, content,
}: {
  partKey: PartKey;
  part: { display: string; level: Level } | undefined;
  content: Content;
}) {
  if (!part) return null;
  const copy = content.report.parts[partKey];

  return (
    <div className="card part">
      <div className="part-head">
        <h3>{copy.name}</h3>
        {/* SPEC 7: the level name is never shown, only the score and the
            sentence that belongs to that level. */}
        <span className="part-score">{part.display}</span>
      </div>
      <p className="small dim">{copy.explain}</p>
      <p>{copy[part.level]}</p>
    </div>
  );
}
