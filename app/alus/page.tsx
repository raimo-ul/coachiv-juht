import Link from "next/link";
import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { Page } from "@/components/site";

const t = getContent();

export const metadata: Metadata = {
  title: `${t.about.title} · ${t.meta.siteName}`,
  description: t.about.model.intro,
};

/**
 * The sources table keeps the four columns from et.json, including the
 * strength-of-evidence column the Lovable build dropped. That column is a
 * selling point rather than fine print: it is the page saying out loud which
 * parts of the model rest on strong research and which are contested.
 */
export default function AboutPage() {
  const a = t.about;
  const groupOf = (name: string) =>
    ["Inimene", "Suhe", "Autonoomia"].includes(name) ? t.home.model.beliefs : t.home.model.actions;

  return (
    <Page>
      <article className="mx-auto max-w-2xl px-5 py-16 md:py-24">
        <p className="eyebrow mb-6 text-muted-foreground">{a.eyebrow}</p>
        <h1 className="text-7xl md:text-8xl">{a.title}</h1>
        <div className="prose-read mt-10">
          <h2>{a.why.heading}</h2>
          {a.why.paragraphs.map((p) => <p key={p}>{p}</p>)}
        </div>
      </article>

      <section className="border-y-2 border-rule">
        <div className="mx-auto max-w-5xl px-5 py-12">
          <p className="mb-8 max-w-2xl text-muted-foreground">{a.model.intro}</p>

          <div className="hidden grid-cols-[1fr_1.6fr_1.6fr_0.7fr] gap-6 border-b-4 border-rule pb-3 md:grid">
            {a.model.columns.map((h) => <span key={h} className="eyebrow">{h}</span>)}
          </div>

          {a.model.rows.map(([name, meaning, sources, strength]) => (
            <div
              key={name}
              className="grid gap-2 border-b-2 border-rule py-6 last:border-b-0 md:grid-cols-[1fr_1.6fr_1.6fr_0.7fr] md:gap-6"
            >
              <div>
                <span className="eyebrow text-muted-foreground">{groupOf(name)}</span>
                <h3 className="text-4xl">{name}</h3>
              </div>
              <p>
                <span className="eyebrow mb-1 block text-muted-foreground md:hidden">{a.model.columns[1]}</span>
                {meaning}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="eyebrow mb-1 block md:hidden">{a.model.columns[2]}</span>
                {sources}
              </p>
              <p className="text-sm">
                <span className="eyebrow mb-1 block text-muted-foreground md:hidden">{a.model.columns[3]}</span>
                <span className="border-2 border-rule bg-bone px-2 py-1 text-xs font-semibold">{strength}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <article className="mx-auto max-w-2xl px-5 py-16">
        <div className="prose-read">
          <h2>{a.limits.heading}</h2>
          <ul>
            {a.limits.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
          {a.limits.paragraphs.map((p) => <p key={p}>{p}</p>)}

          <h2>{a.development.heading}</h2>
          <p>{a.development.text}</p>

          <h2>{a.raimo.heading}</h2>
          {a.raimo.paragraphs.map((p) => <p key={p}>{p}</p>)}
          <p>
            <a href={`https://${a.raimo.link}`} target="_blank" rel="noopener noreferrer">{a.raimo.link}</a>
          </p>

          <h2>{a.companies.heading}</h2>
          <p>{a.companies.text}</p>
          <p><a href={`mailto:${a.companies.contact}`}>{a.companies.contact}</a></p>

          <p><Link href="/test">{t.home.button} →</Link></p>
        </div>
      </article>
    </Page>
  );
}
