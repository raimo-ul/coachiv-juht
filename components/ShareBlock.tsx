"use client";

import { useEffect, useState } from "react";

/**
 * Pass the test on to a colleague.
 *
 * Sits last on the report, after the paid offer and after the newsletter. It is
 * the lightest of the three asks and the only one that costs the reader nothing,
 * so it goes where it cannot stand between the report and the thing that would
 * actually help them.
 *
 * The link is the test's own address, never the report's. A report URL carries
 * the token that opens one person's answers, and a forwarded one would hand
 * them to a colleague.
 *
 * `?utm_source=soovitus` tags the visit, so a recommendation is countable next
 * to the newsletter and Facebook on the same dashboard. UtmCapture already
 * stores it at the other end.
 *
 * Hidden in print, like the newsletter block: a saved PDF carrying a copy
 * button is a dead rectangle.
 */
export function ShareBlock({
  text,
  button,
  copied: copiedLabel,
}: {
  text: string;
  button: string;
  copied: string;
}) {
  // Built in the browser rather than from a configured domain, so the preview
  // deploys hand out preview links and production hands out production ones.
  // Set after mount because the server has no location to render from.
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/?utm_source=soovitus`);
    // Shown without the tag. The address is the thing a person reads and
    // retypes; the tag is bookkeeping and belongs in what gets copied.
    setLabel(window.location.host);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // No clipboard: an http preview, an old Safari, a locked-down browser.
      // Nothing to handle. The address is on the page as a link either way, so
      // the block still does its job without the button confirming anything.
    }
  }

  if (!url) return null;

  return (
    <section className="border-b-2 border-rule print:hidden">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="flex flex-col gap-5 border-2 border-rule bg-background p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-md">
            <p className="text-lg leading-snug">{text}</p>
            {/* The address itself, visible and clickable. A copy button alone
                asks the reader to trust what landed on the clipboard. */}
            <a
              href={url}
              className="mt-2 inline-block break-all font-semibold underline underline-offset-4"
            >
              {label}
            </a>
          </div>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 border-2 border-rule bg-background px-6 py-3 text-center font-semibold transition-colors hover:bg-signal-soft"
          >
            {copied ? copiedLabel : button}
          </button>
        </div>
      </div>
    </section>
  );
}
