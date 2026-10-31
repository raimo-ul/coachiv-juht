// SPEC 11: turning fifteen days of yes and no into a final report.
//
// Pure arithmetic, no database and no network, so the tests can walk every
// awkward case: a day nobody answered, a question answered on some days and
// not others, a programme with almost nothing in it.
//
// Unanswered is not no. A null means the question never reached the day, and
// counting it as a no would quietly punish someone for being on holiday. Every
// percentage below is out of the days that were actually answered.

import type { PartKey } from "./content.ts";

export type DayRow = {
  day: string;
  day_index: number;
  q1: boolean | null; q2: boolean | null; q3: boolean | null;
  q4: boolean | null; q5: boolean | null; q6: boolean | null;
};

export type QuestionResult = { q: number; yes: number; answered: number };

/** SPEC 11: q1+q2 juhendamine, q3+q4 voimestamine, q5+q6 inspireerimine. */
export const ACTION_OF_QUESTION: Record<number, PartKey> = {
  1: "juhendamine", 2: "juhendamine",
  3: "voimestamine", 4: "voimestamine",
  5: "inspireerimine", 6: "inspireerimine",
};

export type FinalNumbers = {
  answeredDays: number;
  questions: QuestionResult[];
  actions: Array<{ key: PartKey; yes: number; answered: number; pct: number | null }>;
  weeks: { first: QuestionResult[]; last: QuestionResult[] };
  /** Null when a part has no answered days at all. */
  levels: Record<PartKey, "low" | "mid" | "high" | null>;
};

function tally(rows: DayRow[], q: number): QuestionResult {
  let yes = 0, answered = 0;
  for (const r of rows) {
    const v = r[`q${q}` as keyof DayRow] as boolean | null;
    if (v === null || v === undefined) continue;
    answered += 1;
    if (v) yes += 1;
  }
  return { q, yes, answered };
}

/**
 * SPEC 11: under 30% is low, 30 to 59 is mid, 60 and over is high.
 *
 * This is the mapping that lets three weeks of behaviour be set beside a test
 * taken before them. SPEC calls it provisional and it is recorded in
 * DECISIONS.md as such: the boundaries are a reasonable first guess, not a
 * measured threshold, and they should move once there are real distributions
 * to look at.
 */
export function levelFromPct(pct: number | null): "low" | "mid" | "high" | null {
  if (pct === null) return null;
  if (pct < 30) return "low";
  if (pct < 60) return "mid";
  return "high";
}

export function computeFinal(rows: DayRow[]): FinalNumbers {
  const answeredDays = rows.filter((r) =>
    [1, 2, 3, 4, 5, 6].some((q) => (r[`q${q}` as keyof DayRow] as boolean | null) !== null)
  ).length;

  const questions = [1, 2, 3, 4, 5, 6].map((q) => tally(rows, q));

  const actions = (["juhendamine", "voimestamine", "inspireerimine"] as PartKey[]).map((key) => {
    const qs = questions.filter((r) => ACTION_OF_QUESTION[r.q] === key);
    const yes = qs.reduce((a, r) => a + r.yes, 0);
    const answered = qs.reduce((a, r) => a + r.answered, 0);
    return { key, yes, answered, pct: answered ? (yes / answered) * 100 : null };
  });

  // SPEC 11: days 1 to 5 against days 11 to 15.
  const first = rows.filter((r) => r.day_index >= 1 && r.day_index <= 5);
  const last = rows.filter((r) => r.day_index >= 11 && r.day_index <= 15);

  const levels = {} as Record<PartKey, "low" | "mid" | "high" | null>;
  for (const a of actions) levels[a.key] = levelFromPct(a.pct);

  return {
    answeredDays,
    questions,
    actions,
    weeks: {
      first: [1, 2, 3, 4, 5, 6].map((q) => tally(first, q)),
      last: [1, 2, 3, 4, 5, 6].map((q) => tally(last, q)),
    },
    levels,
  };
}

/**
 * How the three weeks sit against the test, per action.
 *
 * Levels are compared, never the numbers: the test is a 1 to 6 self-rating and
 * this is a percentage of days, so the two have nothing in common except the
 * three bands they both fall into. Subtracting one from the other would be the
 * kind of comparison that looks precise and means nothing.
 */
export function compareWithTest(
  final: FinalNumbers,
  testLevels: Record<PartKey, "low" | "mid" | "high">,
): Array<{ key: PartKey; direction: "testHigher" | "daysHigher" | "same" }> {
  const order = { low: 0, mid: 1, high: 2 } as const;
  const out: Array<{ key: PartKey; direction: "testHigher" | "daysHigher" | "same" }> = [];

  for (const { key } of final.actions) {
    const days = final.levels[key];
    if (!days) continue;   // nothing answered for this one
    const diff = order[testLevels[key]] - order[days];
    out.push({ key, direction: diff > 0 ? "testHigher" : diff < 0 ? "daysHigher" : "same" });
  }
  return out;
}
