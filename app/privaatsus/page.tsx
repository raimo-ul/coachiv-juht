import type { Metadata } from "next";
import { getContent } from "@/lib/content";

const t = getContent();

export const metadata: Metadata = {
  title: `${t.privacy.title} · ${t.meta.siteName}`,
};

export default function PrivacyPage() {
  // privacy.todo and about.raimo.todo are notes to Raimo, not copy. They stay
  // in the JSON where he will see them and are never rendered.
  return (
    <main className="page">
      <div className="wrap wrap-wide grow stack-lg">
        <h1>{t.privacy.title}</h1>

        {t.privacy.sections.map((s) => (
          <section key={s.heading} className="stack">
            <h2>{s.heading}</h2>
            <p className="dim">{s.text}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
