/**
 * Which channel brought someone to the test.
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

export const UTM_KEY = "cj_utm";
export const UTM_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 päeva, sama kui cj_promo

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

/**
 * Every storage call is wrapped. Safari in private mode throws on setItem, and
 * a visitor with storage disabled must still be able to take the test; losing
 * the channel is the acceptable loss here, losing the test is not.
 */
export function readStoredUtm(): Utm | null {
  try {
    const raw = window.localStorage.getItem(UTM_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Stored;
    if (!parsed || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > UTM_MAX_AGE_MS) return null;

    return cleanUtmSet(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Writes only when there is nothing fresh already stored. */
export function storeUtmIfFirst(utm: Utm): void {
  if (!utm.utm_source && !utm.utm_medium && !utm.utm_campaign) return;
  try {
    if (readStoredUtm()) return;
    window.localStorage.setItem(UTM_KEY, JSON.stringify({ ...utm, at: Date.now() }));
  } catch {
    // No storage, no channel. The test still works.
  }
}
