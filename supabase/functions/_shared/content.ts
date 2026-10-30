// The content file, as the Edge Functions see it.
//
// et.json is copied here by scripts/sync-content.mjs; content/et.json is the
// source and this is the copy that gets bundled into a function. Editing this
// file directly would be undone by the next sync.
//
// Deno needs the extension and the import attribute. Node 22 and vitest accept
// the same syntax, which is why the tests can import this module unchanged.

import et from "./et.json" with { type: "json" };

export const DEFAULT_LOCALE = "et";

const CONTENT: Record<string, typeof et> = { et };

export type Content = typeof et;

/** The six part names, taken from the content rather than written out again. */
export type PartKey = keyof Content["test"]["scoring"]["parts"];

/** SPEC 9: an unknown or not-yet-written locale falls back to Estonian. */
export function getContent(locale?: string | null): Content {
  return CONTENT[locale ?? ""] ?? CONTENT[DEFAULT_LOCALE];
}

/**
 * Fill {placeholders} in a content string.
 *
 * A name with no matching value is left exactly as it was: a visible
 * "{startDate}" in a test run is a bug worth seeing, and silently blanking it
 * would hide which key was missing.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}
