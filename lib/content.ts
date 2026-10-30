// Every sentence a visitor reads comes from content/<locale>.json.
//
// SPEC 5: "Koodi ei kirjutata ühtegi kasutajale nähtavat lauset." So this module
// is the only way text enters a page, and the types below exist to make a
// missing key a build error rather than the word "undefined" on a live page.
//
// The files are imported statically, not read at request time: they ship in the
// bundle, there is no filesystem on the edge, and a typo in a locale name should
// fail at build.

import et from "@/content/et.json";

export const LOCALES_ENABLED = ["et"] as const;
export type Locale = (typeof LOCALES_ENABLED)[number];

export const DEFAULT_LOCALE: Locale = "et";

const CONTENT = { et } as const;

export type Content = typeof et;

/**
 * The six part names, taken from the content rather than written out again.
 *
 * Deriving them means renaming a part in et.json turns every place that reads
 * it into a type error, instead of leaving a page silently rendering
 * "undefined" for a key that no longer exists.
 */
export type PartKey = keyof Content["test"]["scoring"]["parts"];

/** SPEC 9: an unknown or not-yet-written locale falls back to Estonian. */
export function getContent(locale?: string | null): Content {
  const key = (locale ?? "") as Locale;
  return (CONTENT as Record<string, Content>)[key] ?? CONTENT[DEFAULT_LOCALE];
}

export function isEnabledLocale(value?: string | null): value is Locale {
  return LOCALES_ENABLED.includes((value ?? "") as Locale);
}

/**
 * Fill {placeholders} in a content string.
 *
 * Placeholders are written as {startDate}, {dayIndex}, {done} and so on in the
 * JSON. A name with no matching value is left exactly as it was: a visible
 * "{startDate}" in a test run is a bug worth seeing, and silently blanking it
 * would hide which key was missing.
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}
