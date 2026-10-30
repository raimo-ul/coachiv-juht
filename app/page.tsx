import Link from "next/link";
import { getContent } from "@/lib/content";
import { PromoCapture } from "@/components/PromoCapture";

export default function Home() {
  const t = getContent();
  const { model } = t.home;

  return (
    <main className="page">
      {/* SPEC 5.1 step 1: ?kood=XXXX goes into a cookie and leaves the URL. */}
      <PromoCapture />

      <div className="wrap grow stack-lg">
        <div>
          <h1>{t.home.title}</h1>
          <p className="dim">{t.home.subtitle}</p>
        </div>

        <div>
          <Link href="/test" className="btn">{t.home.button}</Link>
          <p className="small dim" style={{ marginTop: "0.9rem" }}>{t.home.smallLine}</p>
        </div>

        {/* The model in one glance: three beliefs, three actions. */}
        <div className="model">
          <div>
            <p className="eyebrow">{model.beliefs}</p>
            <ul className="plain">
              {model.beliefNames.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>
          <div>
            <p className="eyebrow">{model.actions}</p>
            <ul className="plain">
              {model.actionNames.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>
        </div>

        <p className="small">
          <Link href="/alus">{t.home.aboutLink}</Link>
        </p>
      </div>
    </main>
  );
}
