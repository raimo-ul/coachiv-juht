import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { Page } from "@/components/site";

const t = getContent();

export const metadata: Metadata = {
  title: `${t.privacy.title} · ${t.meta.siteName}`,
};

export default function PrivacyPage() {
  // The draft note is gone: the page was written on 01.11 against what the
  // product actually collects, rather than what it was expected to.
  return (
    <Page>
      <article className="mx-auto max-w-2xl px-5 py-16 md:py-24">
        <p className="eyebrow mb-6 text-muted-foreground">{t.privacy.eyebrow}</p>
        <h1 className="text-7xl md:text-8xl">{t.privacy.title}</h1>
        <p className="mt-6 text-sm text-muted-foreground">{t.privacy.updated}</p>
        <div className="prose-read mt-10">
          {t.privacy.sections.map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              <p>{s.text}</p>
            </section>
          ))}
        </div>
      </article>
    </Page>
  );
}
