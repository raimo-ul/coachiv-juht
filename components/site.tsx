import Link from "next/link";
import type { ReactNode } from "react";
import { getContent } from "@/lib/content";

/**
 * The frame every page sits in, carried over from the Lovable build.
 *
 * `minimal` drops the start-the-test button from the header, which is what the
 * test itself uses: offering someone a link to the thing they are already doing
 * is one more way to lose their answers.
 */
export function Header({ minimal = false }: { minimal?: boolean }) {
  const t = getContent();
  return (
    <header className="border-b-2 border-rule bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="block h-4 w-4 bg-signal ring-2 ring-rule" />
          <span className="display pt-1 text-2xl leading-none">{t.meta.siteName}</span>
        </Link>
        {!minimal && (
          <Link
            href="/test"
            className="eyebrow border-2 border-rule bg-signal px-3 py-2 transition-transform hover:-translate-y-0.5"
          >
            {t.home.button.split("·")[0].trim()}
          </Link>
        )}
      </div>
    </header>
  );
}

export function Footer() {
  const t = getContent();
  const [, brandRest] = t.footer.brand.split("radicalsimplicity.eu");
  return (
    <footer className="mt-auto border-t-2 border-rule bg-bone">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm md:flex-row md:items-end md:justify-between">
        <div className="flex gap-3">
          <Link href="/alus" className="underline decoration-2 underline-offset-4 hover:decoration-signal">
            {t.footer.about}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/privaatsus" className="underline decoration-2 underline-offset-4 hover:decoration-signal">
            {t.footer.privacy}
          </Link>
        </div>
        <p className="text-muted-foreground">
          {t.footer.brand.replace("radicalsimplicity.eu", "")}
          <a
            href="https://radicalsimplicity.eu"
            className="text-foreground underline decoration-2 underline-offset-4"
          >
            radicalsimplicity.eu
          </a>
          {brandRest ?? ""}
        </p>
      </div>
    </footer>
  );
}

export function Page({ children, minimal }: { children: ReactNode; minimal?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header minimal={minimal} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

/**
 * The line a score sits on, between harva and sageli.
 *
 * Deliberately not a progress bar: it marks a position on a 1 to 6 range rather
 * than filling toward a target, because the product does not grade anyone. The
 * ticks are the whole numbers.
 */
export function Track({ value }: { value: number }) {
  const pct = ((Math.max(1, Math.min(6, value)) - 1) / 5) * 100;
  return (
    <div className="relative h-2 border-2 border-rule bg-background">
      <div className="absolute inset-y-0 left-0 bg-signal" style={{ width: `${pct}%` }} />
      <div className="absolute inset-0 flex justify-between px-[1px]">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="h-full w-[2px] bg-rule/30 first:bg-transparent last:bg-transparent" />
        ))}
      </div>
      <span
        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 border-2 border-rule bg-background"
        style={{ left: `${pct}%` }}
        aria-hidden
      />
    </div>
  );
}
