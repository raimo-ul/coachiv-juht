/**
 * Which channel brought someone to the test.
 *
 * The Edge Function's half: validation only. The browser's copy of these
 * rules lives in lib/utm.ts and keeps rubbish out of storage. This copy is the
 * one that matters, because anything can POST here and a value that reached
 * the database would be read back onto a page one day.
 *
 * Three values off the link, kept in localStorage until the test is submitted
 * and then written onto the test row. No analytics service, no tracking
 * cookie, nothing that follows anyone anywhere else: this answers one question,
 * which is whether a newsletter or a LinkedIn post is worth writing again.
 *
 * First touch wins. Someone who arrives from LinkedIn, thinks about it, and
 * comes back a week later through the newsletter was brought by LinkedIn; the
 * newsletter only reminded them. Overwriting would credit the last link in the
 * chain and quietly misreport every channel that starts conversations rather
 * than finishing them.
 */

export type Utm = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

type Stored = Utm & { at: number };

/**
 * Lowercase, trimmed, at most 50 characters of [a-z0-9 _-], or nothing.
 *
 * A space is allowed because campaign names are written by a person typing a
 * link, not by a machine, and "sugis kampaania" is what they will type.
 *
 * Shared by the browser and the Edge Function on purpose. The browser's copy
 * keeps rubbish out of storage; the function's copy is the one that matters,
 * because anything can POST to it and a value that reached the database would
 * be read back onto a page one day.
 */
export function cleanUtm(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase();
  if (!v || v.length > 50) return undefined;
  return /^[a-z0-9 _-]+$/.test(v) ? v : undefined;
}

/** The three fields, cleaned. Absent keys are left out rather than set to null. */
export function cleanUtmSet(input: Record<string, unknown>): Utm {
  const out: Utm = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign"] as const) {
    const v = cleanUtm(input[k]);
    if (v) out[k] = v;
  }
  return out;
}
