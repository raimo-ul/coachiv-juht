import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { looksLikeToken } from "@/lib/tokens";
import { getContent } from "@/lib/content";
import { forDisplay, scoreTest, type Level } from "@/lib/scoring";
import { AiParagraph } from "@/components/AiParagraph";

// SPEC 14: the report and final pages must not be indexed. They are a person's
// own answers behind a guessable-looking URL, and a crawler that found one
// would put it in a search result.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ token: string }> };

export default async function ReportPage({ params }: PageProps) {
  const { token } = await params;
  const t = getContent();

  // SPEC 15: a wrong token is a 404, not a page saying the report is missing.
  if (!looksLikeToken(token)) notFound();

  const { data, error } = await db()
    .from("tests")
    .select("id, answers, scores, ai_paragraph, ai_status, participant_id, created_at")
    .eq("report_token", token)
    .maybeSingle();

  if (error) {
    console.error("[raport] lookup:", error.message);
    notFound();
  }
  if (!data) notFound();

  const answers = data.answers as Record<string, number>;

  // Recomputed rather than read from the stored scores. The two must agree, and
  // deriving the levels and pairs here keeps one implementation of the rules
  // instead of a second copy written for the page.
  const { scores, levels, pairs } = scoreTest(answers, t.locale);

  const actionParts = ["juhendamine", "voimestamine", "inspireerimine"] as const;
  const beliefParts = ["inimene", "suhe", "autonoomia"] as const;

  // Stage B puts a live programme in the way of the CTA. Until enrollments
  // exist this is always false, and the check is here so the report shows the
  // right thing the day stage B lands.
  const active = await db()
    .from("enrollments")
    .select("id")
    .eq("participant_id", data.participant_id)
    .eq("status", "active")
    .maybeSingle();

  const hasActiveProgramme = Boolean(active.data?.id);

  return (
    <main className="page">
      <div className="wrap wrap-wide grow stack-lg">
        <div>
          <h1>{t.report.title}</h1>
          <p className="dim">{t.report.intro}</p>
        </div>

        <section className="stack">
          <h2>{t.report.actionsHeading}</h2>
          {actionParts.map((key) => (
            <Part key={key} partKey={key} score={scores[key]} level={levels[key]} content={t} />
          ))}
        </section>

        <section className="stack">
          <h2>{t.report.beliefsHeading}</h2>
          {beliefParts.map((key) => (
            <Part key={key} partKey={key} score={scores[key]} level={levels[key]} content={t} />
          ))}
        </section>

        {pairs.length > 0 && (
          <section className="stack">
            <h2>{t.report.pairs.heading}</h2>
            {pairs.map((p) => (
              <div key={p.belief} className="card">
                <p className="eyebrow" style={{ marginBottom: "0.5rem" }}>
                  {t.report.parts[p.belief].name} · {t.report.parts[p.action].name}
                </p>
                <p>{t.report.pairs[p.direction]}</p>
              </div>
            ))}
          </section>
        )}

        {/* Renders its own heading, or nothing at all. See the component. */}
        <AiParagraph
          token={token}
          initialText={data.ai_paragraph as string | null}
          initialStatus={data.ai_status as string}
          heading={t.report.ai.heading}
          loadingLabel={t.report.ai.loading}
        />

        <section className="card">
          <h3>{t.report.notMeaning.heading}</h3>
          <p className="small dim">{t.report.notMeaning.text}</p>
        </section>

        <hr className="rule" />

        {/* The programme CTA. Stage A renders it; the checkout behind it arrives
            in stage B, so the button is not wired up yet. */}
        <section className="stack">
          <h2>{t.report.cta.heading}</h2>
          {hasActiveProgramme ? (
            <p>{t.report.cta.active}</p>
          ) : (
            <>
              <p className="dim">{t.report.cta.text}</p>
              <p className="small dim">{t.report.cta.codeNote}</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Part({
  partKey, score, level, content,
}: {
  partKey: keyof ReturnType<typeof getContent>["report"]["parts"];
  score: number;
  level: Level;
  content: ReturnType<typeof getContent>;
}) {
  const part = content.report.parts[partKey];
  return (
    <div className="card part">
      <div className="part-head">
        <h3>{part.name}</h3>
        {/* SPEC 7: the level name is never shown, only the score and the
            sentence that belongs to that level. */}
        <span className="part-score">{forDisplay(score)}</span>
      </div>
      <p className="small dim">{part.explain}</p>
      <p>{part[level]}</p>
    </div>
  );
}
