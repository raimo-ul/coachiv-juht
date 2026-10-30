import type { Metadata } from "next";
import { getContent } from "@/lib/content";

const t = getContent();

export const metadata: Metadata = {
  title: `${t.about.title} · ${t.meta.siteName}`,
  description: t.about.model.intro,
};

export default function AboutPage() {
  const a = t.about;

  return (
    <main className="page">
      <div className="wrap wrap-wide grow stack-lg">
        <h1>{a.title}</h1>

        <section className="stack">
          <h2>{a.why.heading}</h2>
          {a.why.paragraphs.map((p) => <p key={p} className="dim">{p}</p>)}
        </section>

        <section className="stack">
          <h2>{a.model.heading}</h2>
          <p className="dim">{a.model.intro}</p>

          {/* A four-column table of sources will not fit a phone. It scrolls
              inside its own box rather than making the page scroll sideways. */}
          <div className="scroll-x">
            <table className="sources">
              <thead>
                <tr>{a.model.columns.map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {a.model.rows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) => <td key={i}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="stack">
          <h2>{a.limits.heading}</h2>
          {a.limits.paragraphs.map((p) => <p key={p} className="dim">{p}</p>)}
        </section>

        <section className="stack">
          <h2>{a.development.heading}</h2>
          <p className="dim">{a.development.text}</p>
        </section>

        <section className="stack">
          <h2>{a.raimo.heading}</h2>
          {a.raimo.paragraphs.map((p) => <p key={p} className="dim">{p}</p>)}
          <p>
            <a href={`https://${a.raimo.link}`} target="_blank" rel="noopener noreferrer">
              {a.raimo.link}
            </a>
          </p>
        </section>

        <section className="stack">
          <h2>{a.companies.heading}</h2>
          <p className="dim">{a.companies.text}</p>
          <p><a href={`mailto:${a.companies.contact}`}>{a.companies.contact}</a></p>
        </section>
      </div>
    </main>
  );
}
