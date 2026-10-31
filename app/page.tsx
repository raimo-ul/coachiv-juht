import Link from "next/link";
import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { Page } from "@/components/site";
import { ResultRow } from "@/components/ResultRow";
import { PromoCapture } from "@/components/PromoCapture";
import { LinkedText } from "@/components/LinkedText";

const t = getContent();

export const metadata: Metadata = {
  title: t.meta.siteName,
  description: t.meta.description,
};

/**
 * The example report shown in the hero and the preview panel.
 *
 * Example numbers, not anyone's. They are here rather than in et.json because
 * they are not copy: they exist to show the shape of a result, and the
 * sentences beside them are the real level sentences from the content file.
 */
const SAMPLE: Array<{ key: "juhendamine" | "voimestamine" | "inspireerimine"; score: number; level: "low" | "mid" | "high" }> = [
  { key: "juhendamine", score: 4.7, level: "high" },
  { key: "voimestamine", score: 3.3, level: "mid" },
  { key: "inspireerimine", score: 2.4, level: "low" },
];

const sample = SAMPLE.map((s) => ({
  name: t.report.parts[s.key].name,
  score: s.score,
  display: s.score.toFixed(1).replace(".", ","),
  explain: t.report.parts[s.key].explain,
  landed: t.report.parts[s.key][s.level],
}));

function StartButton({ big = false }: { big?: boolean }) {
  return (
    <Link
      href="/test"
      className={`group inline-flex items-center gap-4 border-2 border-rule bg-signal font-semibold shadow-[5px_5px_0_0_var(--rule)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_var(--rule)] ${big ? "px-7 py-5 text-lg" : "px-6 py-4"}`}
    >
      {t.home.button}
      <span className="transition-transform group-hover:translate-x-1" aria-hidden>→</span>
    </Link>
  );
}

export default function Home() {
  const beliefs = ["inimene", "suhe", "autonoomia"] as const;
  const actions = ["juhendamine", "voimestamine", "inspireerimine"] as const;

  // One source for the six meanings: about.model.rows, which is also what the
  // basis-page table prints. They were briefly held in two places, and the
  // table kept showing the older wording after Raimo had rewritten them.
  const meaningOf = (key: string) => {
    const name = t.about.model.keys[key as keyof typeof t.about.model.keys];
    return t.about.model.rows.find((r) => r[0] === name)?.[1] ?? "";
  };
  const groups = [
    { label: t.home.model.beliefs, hint: t.home.model.beliefsHint, keys: beliefs, tone: "bg-bone" },
    { label: t.home.model.actions, hint: t.home.model.actionsHint, keys: actions, tone: "bg-background" },
  ];

  return (
    <Page>
      {/* SPEC 5.1 step 1: ?kood=XXXX goes into a cookie and leaves the URL. */}
      <PromoCapture />

      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-rule">
        <div className="grain absolute inset-y-0 right-0 hidden w-1/3 border-l-2 border-rule bg-bone md:block" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-14 pt-12 md:grid-cols-[1.4fr_1fr] md:pb-24 md:pt-20">
          <div className="rise">
            <p className="eyebrow mb-6 text-muted-foreground">{t.home.eyebrow}</p>
            <h1 className="text-[22vw] leading-[0.82] md:text-[10.5rem]">
              Coachiva<br />juhi <span className="marker">test</span>
            </h1>
            <p className="mt-8 max-w-lg text-lg leading-relaxed md:text-xl">{t.home.subtitle}</p>
            <div className="mt-9"><StartButton big /></div>
            <p className="mt-5 text-sm text-muted-foreground">{t.home.smallLine}</p>
          </div>
          <div className="rise relative self-end [animation-delay:200ms]">
            <div className="border-2 border-rule bg-background p-5 shadow-[8px_8px_0_0_var(--rule)] md:rotate-[1.5deg]">
              <div className="flex items-center justify-between border-b-2 border-rule pb-3">
                <span className="eyebrow">{t.home.heroCardLabel}</span>
                <span className="h-3 w-3 bg-signal ring-2 ring-rule" />
              </div>
              <ResultRow r={sample[0]} compact track={t.report.track} />
            </div>
          </div>
        </div>
      </section>

      {/* The tension */}
      <section className="bg-ink text-background">
        <div className="mx-auto max-w-4xl px-5 py-20 md:py-28">
          <p className="text-2xl leading-snug md:text-4xl md:leading-tight">{t.home.tension.lead}</p>
          <div className="mt-12 grid gap-px border-2 border-background/30 bg-background/30 md:grid-cols-3">
            {t.home.tension.questions.map((q) => (
              <p key={q} className="display bg-ink p-6 text-3xl leading-none text-signal">{q}</p>
            ))}
          </div>
        </div>
      </section>

      {/* The model */}
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <h2 className="mb-12 text-6xl md:text-8xl">{t.home.model.heading}</h2>
          <div className="grid border-2 border-rule md:grid-cols-2">
            {groups.map((g, gi) => (
              <div key={g.label} className={`${g.tone} ${gi === 0 ? "border-b-2 md:border-b-0 md:border-r-2" : ""} border-rule`}>
                <div className="flex items-center justify-between border-b-2 border-rule px-5 py-3">
                  <span className="eyebrow">{g.label}</span>
                  <span className="eyebrow text-muted-foreground">{g.hint}</span>
                </div>
                {g.keys.map((key, i) => (
                  <div key={key} className="group border-b-2 border-rule px-5 py-6 transition-colors last:border-b-0 hover:bg-signal-soft">
                    <div className="flex items-start gap-4">
                      <span className="display mt-1 text-xl text-muted-foreground">0{gi * 3 + i + 1}</span>
                      <div className="flex-1">
                        <h3 className="text-4xl md:text-5xl">{t.report.parts[key].name}</h3>
                        <p className="mt-2 text-base">{meaningOf(key)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="grain border-b-2 border-rule bg-bone">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-[1fr_1.2fr] md:py-28">
          <div>
            <p className="eyebrow mb-4">{t.home.whatYouGet.eyebrow}</p>
            <h2 className="text-6xl md:text-7xl">{t.home.whatYouGet.heading}</h2>
            <p className="mt-6 max-w-md text-lg">{t.home.whatYouGet.body}</p>
            <p className="mt-4 text-sm text-muted-foreground">{t.home.whatYouGet.note}</p>
          </div>
          <div className="border-2 border-rule bg-background p-6 shadow-[8px_8px_0_0_var(--rule)]">
            <p className="eyebrow border-b-2 border-rule pb-3">{t.home.whatYouGet.previewHeading}</p>
            {sample.map((r) => <ResultRow key={r.name} r={r} compact track={t.report.track} />)}
            <div className="mt-2 border-t-2 border-rule pt-5">
              <p className="eyebrow mb-3">{t.home.whatYouGet.analysisLabel}</p>
              <p className="border-l-4 border-signal pl-4 italic leading-relaxed">
                {t.home.whatYouGet.sampleAnalysis}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <h2 className="mb-12 text-6xl md:text-7xl">{t.home.how.heading}</h2>
          <ol className="grid gap-0 border-2 border-rule md:grid-cols-3">
            {t.home.how.steps.map(([title, body], i) => (
              <li key={title} className={`p-6 md:p-8 ${i < 2 ? "border-b-2 md:border-b-0 md:border-r-2" : ""} border-rule`}>
                <span className="display flex h-12 w-12 items-center justify-center border-2 border-rule bg-signal text-3xl">{i + 1}</span>
                <h3 className="mt-6 text-4xl">{title}</h3>
                <p className="mt-2 text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The programme */}
      <section className="border-b-2 border-rule bg-signal">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[1.3fr_1fr] md:py-24">
          <div>
            <p className="eyebrow mb-4">{t.programme.eyebrow}</p>
            <h2 className="text-6xl md:text-8xl">{t.programme.title}</h2>
          </div>
          <div className="self-end">
            <p className="text-lg leading-relaxed">{t.programme.body}</p>
            <p className="display mt-6 text-4xl">{t.programme.price}</p>
            <p className="mt-2 text-sm">{t.programme.note}</p>
            <p className="mt-6 border-t-2 border-rule pt-4 text-sm">
              <LinkedText
                text={t.programme.groupNote}
                label={t.about.companies.contact}
                href={`mailto:${t.about.companies.contact}`}
                className="font-semibold underline underline-offset-4"
              />
            </p>
          </div>
        </div>
      </section>

      {/* Close */}
      <section>
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-5 py-20 md:flex-row md:items-end md:justify-between md:py-28">
          <h2 className="text-6xl md:text-8xl">{t.home.close.heading}</h2>
          <div className="flex flex-col items-start gap-5">
            <StartButton big />
            <Link href="/alus" className="font-medium underline decoration-signal decoration-[3px] underline-offset-4">
              {t.home.close.link}
            </Link>
          </div>
        </div>
      </section>
    </Page>
  );
}
