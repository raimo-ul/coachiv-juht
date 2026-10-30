"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Content } from "@/lib/content";
import { fill } from "@/lib/content";
import { LinkedText } from "@/components/LinkedText";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";

type Answers = Record<string, number>;
type Step = "intro" | "actions" | "beliefs" | "email";

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
    return { answers: parsed.answers as Answers, step: (parsed.step as Step) ?? "actions" };
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

export function TestFlow({ content }: { content: Content }) {
  const t = content.test;
  const router = useRouter();

  const [step, setStep] = useState<Step>("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [restored, setRestored] = useState(false);
  const [showMissing, setShowMissing] = useState(false);

  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const topRef = useRef<HTMLDivElement>(null);

  // Restore once, on mount. Until this has run the component renders the intro,
  // which is also what a first-time visitor sees, so there is no flash of the
  // wrong screen.
  useEffect(() => {
    const saved = loadSaved();
    if (saved && Object.keys(saved.answers).length > 0) {
      setAnswers(saved.answers);
      setStep(saved.step === "intro" ? "actions" : saved.step);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored && step !== "intro") save(answers, step);
  }, [answers, step, restored]);

  const actionKeys = t.screens.actions.order;
  const beliefKeys = t.screens.beliefs.order;
  const answeredCount = [...actionKeys, ...beliefKeys].filter((k) => answers[k]).length;

  const setAnswer = useCallback((key: string, value: number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  function goTo(next: Step) {
    setShowMissing(false);
    setStep(next);
    // A new screen starts at its own beginning, not at the scroll position of
    // the last question on the previous one.
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start" }));
  }

  function advanceFrom(keys: readonly string[], next: Step) {
    const missing = keys.filter((k) => !answers[k]);
    if (missing.length > 0) {
      setShowMissing(true);
      document.getElementById(`item-${missing[0]}`)?.scrollIntoView({ block: "center" });
      return;
    }
    goTo(next);
  }

  async function submit() {
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
        body: JSON.stringify({ answers, email: trimmed, newsletter, timezone }),
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
    <main className="page">
      <div className="wrap grow" ref={topRef}>
        {step !== "intro" && (
          <Progress done={answeredCount} total={18} label={fill(t.progress, { done: answeredCount })} />
        )}

        {step === "intro" && (
          <div className="stack-lg">
            <h1>{content.home.title}</h1>
            <div className="stack">
              {t.intro.map((line) => <p key={line} className="dim">{line}</p>)}
            </div>
            <button className="btn" onClick={() => goTo("actions")}>{t.startButton}</button>
          </div>
        )}

        {step === "actions" && (
          <Screen
            instruction={t.screens.actions.instruction}
            keys={actionKeys}
            items={t.items}
            scale={t.screens.actions.scale}
            answers={answers}
            onAnswer={setAnswer}
            showMissing={showMissing}
            buttonLabel={t.nextButton}
            onNext={() => advanceFrom(actionKeys, "beliefs")}
          />
        )}

        {step === "beliefs" && (
          <Screen
            instruction={t.screens.beliefs.instruction}
            keys={beliefKeys}
            items={t.items}
            // Only the ends of this scale are labelled. SPEC 7: the numbers in
            // between carry no words.
            scale={{ 1: t.screens.beliefs.scale["1"], 6: t.screens.beliefs.scale["6"] }}
            answers={answers}
            onAnswer={setAnswer}
            showMissing={showMissing}
            buttonLabel={t.nextButton}
            onNext={() => advanceFrom(beliefKeys, "email")}
          />
        )}

        {step === "email" && (
          <div className="stack-lg">
            <h2>{t.emailScreen.title}</h2>

            <div className="stack">
              <label htmlFor="email" className="eyebrow" style={{ display: "block", marginBottom: 0 }}>
                {t.emailScreen.emailLabel}
              </label>
              <input
                id="email"
                className="field"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "email-error" : undefined}
              />
              {emailError && <p id="email-error" className="small err">{emailError}</p>}
            </div>

            <div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={newsletter}
                  onChange={(e) => setNewsletter(e.target.checked)}
                />
                <span>{t.emailScreen.newsletterLabel}</span>
              </label>
              <p className="small dim" style={{ marginTop: "0.5rem" }}>{t.emailScreen.newsletterNote}</p>
            </div>

            <div className="stack">
              <button className="btn" onClick={submit} disabled={submitting}>
                {t.emailScreen.button}
              </button>
              {submitError && <p className="small err">{submitError}</p>}
              <p className="small dim">
                <LinkedText
                  text={t.emailScreen.privacyNote}
                  label={content.footer.privacy}
                  href="/privaatsus"
                />
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <div className="progress" aria-hidden={false}>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={label}
      >
        <div className="progress-fill" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <p className="tiny dim">{label}</p>
    </div>
  );
}

function Screen({
  instruction, keys, items, scale, answers, onAnswer, showMissing, buttonLabel, onNext,
}: {
  instruction: string;
  keys: readonly string[];
  items: Record<string, string>;
  scale: Record<string | number, string>;
  answers: Answers;
  onAnswer: (key: string, value: number) => void;
  showMissing: boolean;
  buttonLabel: string;
  onNext: () => void;
}) {
  return (
    <div className="stack-lg">
      <p className="instruction">{instruction}</p>

      <ol className="plain items">
        {keys.map((key) => {
          const missing = showMissing && !answers[key];
          return (
            <li key={key} id={`item-${key}`} className={`item${missing ? " item-missing" : ""}`}>
              <fieldset>
                <legend>{items[key]}</legend>
                <div className="choices">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <label key={n} className={`choice${answers[key] === n ? " choice-on" : ""}`}>
                      <input
                        type="radio"
                        name={key}
                        value={n}
                        checked={answers[key] === n}
                        onChange={() => onAnswer(key, n)}
                      />
                      <span className="choice-num">{n}</span>
                      {scale[n] && <span className="choice-word">{scale[n]}</span>}
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      <button className="btn" onClick={onNext}>{buttonLabel}</button>
    </div>
  );
}
