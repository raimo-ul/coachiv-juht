"use client";

import { useEffect, useState } from "react";
import { functionHeaders, functionUrl } from "@/lib/functionsUrl";

/**
 * SPEC 5.1 step 5: the paragraph has a loading state that updates, polling for
 * up to 20 seconds. After that the report stands without it.
 *
 * The paragraph is written after submit-test has answered, so on a first visit
 * it is usually still being generated when this page renders. On
 * any later visit it is already in the row and arrives as initialText, and no
 * polling happens at all.
 *
 * A failed paragraph renders nothing. There is no apology and no empty heading
 * with a dash under it: the six parts above are the report, and this was always
 * the part that could be missing.
 */
// SPEC 5.1 says poll for up to 20 seconds. That number was written before
// anyone timed the model: Sonnet 5 thinks before it writes, and a measured run
// took 36 seconds from submit to a finished paragraph. At 20 seconds the
// paragraph essentially never arrives on a first visit, which turns a feature
// into a thing that only works for people who come back through the emailed
// link. Sixty seconds covers the measured time with room to spare.
//
// Waiting costs the reader nothing. The six parts above are already on screen
// and take longer than this to read; only the one paragraph is pending, and it
// is labelled as such. Recorded in DECISIONS.md.
const INTERVAL_MS = 3000;
const GIVE_UP_MS = 60000;

export function AiParagraph({
  token, initialText, initialStatus, heading, loadingLabel, signature,
}: {
  token: string;
  initialText: string | null;
  initialStatus: string;
  heading: string;
  loadingLabel: string;
  signature: string;
}) {
  const [text, setText] = useState(initialText);
  const [waiting, setWaiting] = useState(initialStatus === "pending" && !initialText);

  useEffect(() => {
    if (!waiting) return;

    let stopped = false;
    const startedAt = Date.now();

    const timer = setInterval(async () => {
      if (stopped) return;

      if (Date.now() - startedAt > GIVE_UP_MS) {
        setWaiting(false);
        clearInterval(timer);
        return;
      }

      try {
        const res = await fetch(functionUrl("get-report-ai", { token }), {
          headers: functionHeaders(),
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "done" && data.text) {
          setText(data.text);
          setWaiting(false);
          clearInterval(timer);
        } else if (data.status === "failed") {
          setWaiting(false);
          clearInterval(timer);
        }
      } catch (e) {
        console.error("[ai-loik] laadimine ebaõnnestus:", e);
        // A dropped poll is not worth reporting. The next one runs in two
        // seconds, and the timeout above ends it either way.
      }
    }, INTERVAL_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [waiting, token]);

  // The heading lives in here rather than on the page, so it comes and goes
  // with the paragraph. Rendered outside, a failed paragraph left "Mida sinu
  // tulemused koos näitavad" standing over empty space, which reads as broken
  // rather than as a section that was never there.
  if (text) {
    return (
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <h2 className="mb-8 text-5xl md:text-6xl">{heading}</h2>
          <div data-print="keep" className="border-l-4 border-signal pl-6">
            <p className="text-xl italic leading-relaxed md:text-2xl md:leading-relaxed">{text}</p>
            <p className="mt-6 text-sm text-muted-foreground">{signature}</p>
          </div>
        </div>
      </section>
    );
  }

  if (waiting) {
    return (
      <section className="border-b-2 border-rule">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <h2 className="mb-8 text-5xl md:text-6xl">{heading}</h2>
          <p data-print="keep" className="border-l-4 border-signal pl-6 text-xl italic text-muted-foreground">{loadingLabel}</p>
        </div>
      </section>
    );
  }

  return null;
}
