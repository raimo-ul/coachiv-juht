"use client";

/**
 * The PDF, without a PDF library.
 *
 * Lifted from AttFocus, where the same question came up and the answer was the
 * browser: window.print() plus a print stylesheet gives a real A4 PDF through
 * "Save as PDF", in every browser, with no server, no fonts to embed and no
 * second rendering of the report that could drift from the one on screen.
 * Anything else here would be a lot of work to arrive back at the same file.
 *
 * The button hides itself in the output, because a button in a PDF is a
 * rectangle that does nothing.
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="eyebrow border-2 border-rule bg-background px-4 py-2 transition-colors hover:bg-signal-soft print:hidden"
    >
      {label}
    </button>
  );
}
