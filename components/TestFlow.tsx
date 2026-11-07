"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Content } from "@/lib/content";
import { fill } from "@/lib/content";
import { LinkedText } from "@/components/LinkedText";
import { Header, Footer } from "@/components/site";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";
import { readStoredUtm } from "@/lib/utm";

type Answers = Record<string, number>;
type Step = "intro" | 1 | 2 | "email";

const STORAGE_KEY = "cj_test_v1";

/**
 * SPEC 5.1 step 2: answers survive a reload.
 *
 * Wrapped in try/catch as the spec asks, because sessionStorage throws rather
 * than returning null in private mode on some browsers and in an iframe with
 * third-party storage blocked. A test that cannot be saved is still a test that
 * can be taken, so every failure here is swallowed and the flow carries on in
 * memory.
 */
function loadSaved(): { answers: Answers; step: Step } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.answers !== "object") return null;
    return { answers: parsed.answers as Answers, step: (parsed.step as Step) ?? 1 };
  } catch {
    return null;
  }
}

function save(answers: Answers, step: Step) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, step }));
  } catch {
    // Not being able to remember is not a reason to stop.
  }
}

function clearSaved() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * The 1 to 6 scale, from the Lovable design.
 *
 * Six numbers in a row at any width, with the chosen answer's word appearing
 * underneath as a caption and the two ends labelled until something is picked.
 * That is what makes six long Estonian words fit a phone: only one of them is
 * ever on screen. My earlier attempt stacked six full-width rows per statement,
 * which was readable and made eighteen statements feel endless.
 */
function Scale({
  value, onChange, labels, ends,
}: {
  value?: number;
  onChange: (v: number) => void;
  labels?: readonly string[];
  ends: [string, string];
}) {
  const caption = value && labels ? labels[value - 1] : null;
  return (
    <div>
      <div role="radiogroup" className="grid grid-cols-6 border-2 border-rule">
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const on = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={labels ? `${n} ${labels[n - 1]}` : String(n)}
              onClick={() => onChange(n)}
              className={[
                "display h-14 border-r-2 border-rule text-3xl transition-colors last:border-r-0",
                "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-signal md:h-16",
                on ? "bg-signal" : value ? "bg-background text-muted-foreground hover:bg-signal-soft" : "bg-background hover:bg-signal-soft",
              ].join(" ")}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex min-h-5 items-start justify-between gap-3 text-xs text-muted-foreground">
        {caption ? (
          <span className="w-full text-center text-sm font-semibold text-foreground">{caption}</span>
        ) : (
          <>
            <span>1 · {ends[0]}</span>
            <span className="text-right">{ends[1]} · 6</span>
          </>
        )}
      </div>
    </div>
  );
}

export function TestFlow({ content }: { content: Content }) {
  const t = content.test;
  const router = useRouter();

  const [step, setStep] = useState<Step>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [restored, setRestored] = useState(false);

  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const saved = loadSaved();
    if (saved && Object.keys(saved.answers).length > 0) {
      setAnswers(saved.answers);
      setStep(saved.step === "intro" ? 1 : saved.step);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored && step !== "intro") save(answers, step);
  }, [answers, step, restored]);

  const actionKeys = t.screens.actions.order;
  const beliefKeys = t.screens.beliefs.order;
  const answeredCount = [...actionKeys, ...beliefKeys].filter((k) => answers[k]).length;

  const keys = step === 1 ? actionKeys : beliefKeys;
  const screen = step === 1 ? t.screens.actions : t.screens.beliefs;
  const freqLabels = [1, 2, 3, 4, 5, 6].map(
    (n) => t.screens.actions.scale[String(n) as keyof typeof t.screens.actions.scale],
  );

  const answer = useCallback((key: string, index: number, v: number) => {
    const first = answers[key] === undefined;
    setAnswers((prev) => ({ ...prev, [key]: v }));
    // Carry the reader to the next statement once they have answered this one,
    // but only the first time: a correction should leave the page where it is.
    if (first) {
      setTimeout(() => refs.current[index + 1]?.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
    }
  }, [answers]);

  function go(s: Step) {
    setStep(s);
    window.scrollTo({ top: 0 });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    // Deliberately loose. The authority on whether an address works is whether
    // the report arrives, and a stricter pattern mostly rejects real addresses.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setEmailError(t.emailScreen.emailError);
      return;
    }
    setEmailError(null);
    setSubmitError(null);
    setSubmitting(true);

    let timezone = "Europe/Tallinn";
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
    } catch {
      /* keep the default */
    }

    try {
      const res = await fetch(functionUrl("submit-test"), {
        method: "POST",
        headers: functionHeaders(),
        body: JSON.stringify({ answers, email: trimmed, newsletter, timezone, ...readStoredUtm() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.reportPath) {
        setSubmitError(data?.error ?? content.report.notFound);
        setSubmitting(false);
        return;
      }

      clearSaved();
      router.push(data.reportPath);
    } catch {
      setSubmitError(content.report.notFound);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header minimal />

      {step !== "intro" && (
        <div className="sticky top-0 z-10 border-b-2 border-rule bg-background">
          <div className="mx-auto flex max-w-2xl items-center gap-4 px-5 py-3">
            <span className="display w-16 text-2xl tabular-nums">
              {fill(t.progress, { done: answeredCount })}
            </span>
            <div className="h-2 flex-1 bg-bone">
              <div
                className="h-full bg-signal transition-all duration-500"
                style={{ width: `${(answeredCount / 18) * 100}%` }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={18}
                aria-valuenow={answeredCount}
              />
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        {step === "intro" && (
          <section className="rise mx-auto max-w-2xl px-5 py-16 md:py-24">
            <p className="eyebrow mb-6 text-muted-foreground">{t.eyebrow}</p>
            <h1 className="text-7xl md:text-8xl">{t.heading}</h1>
            <p className="mt-8 text-xl leading-relaxed">{t.intro[0]}</p>
            <p className="mt-4 border-l-4 border-signal pl-4 text-xl font-medium">{t.intro[1]}</p>
            <button
              onClick={() => go(1)}
              className="mt-10 border-2 border-rule bg-signal px-8 py-4 text-lg font-semibold shadow-[5px_5px_0_0_var(--rule)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_var(--rule)]"
            >
              {t.startButton} →
            </button>
          </section>
        )}

        {(step === 1 || step === 2) && (
          <section className="mx-auto max-w-2xl px-5 pb-20 pt-10">
            <p className="eyebrow text-muted-foreground">{fill(t.partLabel, { n: step })}</p>
            <h1 className="mt-3 text-4xl leading-[0.95] md:text-5xl">{screen.instruction}</h1>

            <div className="mt-8 space-y-4">
              {keys.map((key, i) => (
                <div
                  key={key}
                  ref={(el) => { refs.current[i] = el; }}
                  className={`border-2 border-rule p-4 transition-colors md:p-5 ${answers[key] ? "bg-bone" : "bg-background"}`}
                >
                  <p className="mb-4 flex gap-3 text-lg leading-snug">
                    <span className="display pt-0.5 text-xl text-muted-foreground">
                      {(step === 1 ? 0 : 9) + i + 1}
                    </span>
                    <span>{t.items[key as keyof typeof t.items]}</span>
                  </p>
                  <Scale
                    value={answers[key]}
                    onChange={(v) => answer(key, i, v)}
                    labels={step === 1 ? freqLabels : undefined}
                    ends={
                      step === 1
                        ? [freqLabels[0], freqLabels[5]]
                        : [t.screens.beliefs.scale["1"], t.screens.beliefs.scale["6"]]
                    }
                  />
                </div>
              ))}
            </div>

            <div ref={(el) => { refs.current[9] = el; }} className="mt-10 flex items-center justify-between">
              {step === 2 ? (
                <button onClick={() => go(1)} className="font-medium underline underline-offset-4">
                  ← {t.backButton}
                </button>
              ) : <span />}
              <button
                disabled={keys.some((k) => !answers[k])}
                onClick={() => go(step === 1 ? 2 : "email")}
                className="border-2 border-rule bg-signal px-8 py-4 font-semibold transition-opacity disabled:cursor-not-allowed disabled:bg-bone disabled:text-muted-foreground"
              >
                {t.nextButton} →
              </button>
            </div>
          </section>
        )}

        {step === "email" && (
          <section className="rise mx-auto max-w-xl px-5 py-16">
            <h1 className="text-6xl md:text-7xl">{t.emailScreen.title}</h1>
            <form className="mt-10" onSubmit={submit}>
              <label htmlFor="email" className="eyebrow">{t.emailScreen.emailLabel}</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "email-error" : undefined}
                className="mt-2 h-14 w-full border-2 border-rule bg-background px-4 text-lg outline-none focus:ring-4 focus:ring-signal"
              />
              {emailError && <p id="email-error" className="mt-2 text-sm text-destructive">{emailError}</p>}

              {/* Third shape for this box. A server-side post to Smaily's
                  public form subscribed nobody; a link from the report was
                  honest but almost nobody followed it. Now it is a checkbox
                  again, behind Smaily's authenticated API, and the note says
                  plainly that a confirmation mail decides it rather than this
                  tick. */}
              <label className="mt-6 flex cursor-pointer gap-3">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[var(--ink)]"
                />
                <span>
                  <span className="font-medium">{t.emailScreen.newsletterLabel}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{t.emailScreen.newsletterNote}</span>
                </span>
              </label>


              <button
                type="submit"
                disabled={submitting}
                className="mt-8 w-full border-2 border-rule bg-signal py-4 text-lg font-semibold shadow-[5px_5px_0_0_var(--rule)] disabled:opacity-50"
              >
                {t.emailScreen.button}
              </button>
              {submitError && <p className="mt-3 text-sm text-destructive">{submitError}</p>}

              <p className="mt-4 text-sm text-muted-foreground">
                <LinkedText
                  text={t.emailScreen.privacyNote}
                  label={content.footer.privacy}
                  href="/privaatsus"
                />
              </p>
            </form>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
