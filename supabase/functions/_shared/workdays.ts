// Dates in the participant's own time zone.
//
// SPEC 10: the daily letter goes out at 16:00 local, on workdays, and the day
// it is about is the participant's local date. SPEC 15 asks for a participant
// in America/New_York to be mailed at 16:00 New York time.
//
// So every date in this file is a wall-clock date somewhere, not an instant.
// Doing this with UTC offsets would be wrong twice a year: Estonia and New York
// change clocks on different weekends, so an offset computed in January is the
// wrong offset in April. Intl is asked for the local parts at each instant
// instead, which is the only way to get this right without a timezone library.

/** The local calendar date in `tz`, as YYYY-MM-DD. */
export function localDate(at: Date, tz: string): string {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  });
  return f.format(at);
}

/** The local hour in `tz`, 0 to 23. */
export function localHour(at: Date, tz: string): number {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false });
  return Number(f.format(at));
}

/** Monday to Friday. SPEC 10: public holidays are not considered. */
export function isWorkday(ymd: string): boolean {
  const dow = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return dow >= 1 && dow <= 5;
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The next Monday-to-Friday day strictly after `ymd`. */
export function nextWorkday(ymd: string): string {
  let d = addDays(ymd, 1);
  while (!isWorkday(d)) d = addDays(d, 1);
  return d;
}

/**
 * SPEC 8: end_date is the fifteenth workday, counting start_date as the first.
 *
 * Fifteen workdays is three weeks of them, which is what the product promises.
 * Counting calendar days instead would land on a Saturday for anyone starting
 * mid-week and silently shorten the programme.
 */
export function nthWorkdayFrom(startYmd: string, n: number): string {
  let d = startYmd;
  let count = 1;
  while (count < n) {
    d = nextWorkday(d);
    count += 1;
  }
  return d;
}

/**
 * Which day of the programme `ymd` is, 1 to 15, or null if it is not one.
 *
 * Counts workdays rather than subtracting dates, so a weekend in the middle
 * does not push the numbering out.
 */
export function dayIndex(startYmd: string, ymd: string): number | null {
  if (ymd < startYmd || !isWorkday(ymd)) return null;
  let d = startYmd;
  let i = 1;
  while (d < ymd && i <= 15) {
    d = nextWorkday(d);
    i += 1;
  }
  return d === ymd && i <= 15 ? i : null;
}
