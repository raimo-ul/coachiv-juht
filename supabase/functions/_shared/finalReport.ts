// What three weeks of yes and no add up to.
//
// Built on AttFocus's personal report, which is the right model and which I had
// misread. That report compares nothing with anything. It says how consistently
// someone answered, which questions were most often true, and which was least
// often true, and it says in its own words that none of this is a judgement:
//
//   "See näitab, kui järjepidevalt sa igapäevast kontrolli tegid, mitte seda,
//    kas sul läks hästi."
//   "See kirjeldab, mis oli sinu jaoks kõige sagedamini tõene, mitte hinnang
//    sinu edukusele."
//
// The sprint directs attention. It does not measure development. So there is no
// first-week-against-last-week here and no comparison with the test score,
// though SPEC 11 asks for both: a number that moved would be read as progress
// or as failure, and fifteen days of self-report cannot carry either meaning.
//
// Pure arithmetic, no database and no network, so the tests can walk every
// awkward case.
//
// Unanswered is not no. A null means the question never reached the day, and
// counting it as a no would quietly punish someone for being away.

export type DayRow = {
  day: string;
  day_index: number;
  q1: boolean | null; q2: boolean | null; q3: boolean | null;
  q4: boolean | null; q5: boolean | null; q6: boolean | null;
};

export type QuestionResult = {
  q: number;
  yes: number;
  answered: number;
  /** Share of answered days that were yes, 0..1. Null when nothing was answered. */
  yesRate: number | null;
};

export type FinalNumbers = {
  /** SPEC 11 and AttFocus both lead with this: how many days, out of how many. */
  workdays: number;
  answeredDays: number;
  /** Per day, for the consistency chart: how many of the six were yes. */
  consistency: Array<{ day: string; dayIndex: number; yesCount: number; answered: boolean }>;
  questions: QuestionResult[];
  /** The two most often true. AttFocus shows exactly two. */
  strongest: QuestionResult[];
  /** The one least often true, or null when nothing was answered. */
  weakest: QuestionResult | null;
};

function tally(rows: DayRow[], q: number): QuestionResult {
  let yes = 0, answered = 0;
  for (const r of rows) {
    const v = r[`q${q}` as keyof DayRow] as boolean | null;
    if (v === null || v === undefined) continue;
    answered += 1;
    if (v) yes += 1;
  }
  return { q, yes, answered, yesRate: answered ? yes / answered : null };
}

export function computeFinal(rows: DayRow[], workdays = 15): FinalNumbers {
  const answeredOn = (r: DayRow) =>
    [1, 2, 3, 4, 5, 6].some((q) => (r[`q${q}` as keyof DayRow] as boolean | null) !== null);

  const consistency = rows.map((r) => ({
    day: r.day,
    dayIndex: r.day_index,
    yesCount: [1, 2, 3, 4, 5, 6]
      .filter((q) => (r[`q${q}` as keyof DayRow] as boolean | null) === true).length,
    answered: answeredOn(r),
  }));

  const questions = [1, 2, 3, 4, 5, 6].map((q) => tally(rows, q));
  const withAnswers = questions.filter((q) => q.yesRate !== null);

  // Sorted by how often each was true. Ties keep question order, so the same
  // data always produces the same report.
  const ranked = [...withAnswers].sort((a, b) =>
    (b.yesRate as number) - (a.yesRate as number) || a.q - b.q);

  return {
    workdays,
    answeredDays: consistency.filter((c) => c.answered).length,
    consistency,
    questions,
    strongest: ranked.slice(0, 2),
    weakest: ranked.length ? ranked[ranked.length - 1] : null,
  };
}
