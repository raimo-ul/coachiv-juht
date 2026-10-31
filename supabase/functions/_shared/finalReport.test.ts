// The final report is the last thing a person sees and the one place where a
// quiet arithmetic error would be invisible: nobody can check a percentage of
// fifteen days in their head. So the cases are written out, with the numbers
// worked by hand in the comments.

import { describe, expect, it } from "vitest";
import { compareWithTest, computeFinal, levelFromPct, type DayRow } from "./finalReport.ts";

/** A day where every question got the same answer. */
function day(index: number, value: boolean | null): DayRow {
  return {
    day: `2026-11-${String(index).padStart(2, "0")}`,
    day_index: index,
    q1: value, q2: value, q3: value, q4: value, q5: value, q6: value,
  };
}

describe("levelFromPct", () => {
  it("uses the boundaries SPEC 11 names", () => {
    expect(levelFromPct(0)).toBe("low");
    expect(levelFromPct(29.9)).toBe("low");
    expect(levelFromPct(30)).toBe("mid");
    expect(levelFromPct(59.9)).toBe("mid");
    expect(levelFromPct(60)).toBe("high");
    expect(levelFromPct(100)).toBe("high");
  });

  it("has no level when nothing was answered", () => {
    expect(levelFromPct(null)).toBeNull();
  });
});

describe("computeFinal", () => {
  it("counts fifteen days of yes", () => {
    const rows = Array.from({ length: 15 }, (_, i) => day(i + 1, true));
    const f = computeFinal(rows);

    expect(f.answeredDays).toBe(15);
    expect(f.questions.every((q) => q.yes === 15 && q.answered === 15)).toBe(true);
    // Each action is two questions: 30 of 30.
    expect(f.actions.every((a) => a.yes === 30 && a.answered === 30 && a.pct === 100)).toBe(true);
    expect(f.levels.juhendamine).toBe("high");
  });

  it("does not count an unanswered day as a no", () => {
    // Ten answered yes, five never opened. 100% of what was answered, not 67%.
    const rows = [
      ...Array.from({ length: 10 }, (_, i) => day(i + 1, true)),
      ...Array.from({ length: 5 }, (_, i) => day(i + 11, null)),
    ];
    const f = computeFinal(rows);

    expect(f.answeredDays).toBe(10);
    expect(f.actions[0].answered).toBe(20);   // 10 days x 2 questions
    expect(f.actions[0].pct).toBe(100);
    expect(f.levels.juhendamine).toBe("high");
  });

  it("handles a question answered on only some days", () => {
    // q1 answered on three days, yes twice. q2 never answered.
    const rows: DayRow[] = [
      { day: "2026-11-02", day_index: 1, q1: true,  q2: null, q3: null, q4: null, q5: null, q6: null },
      { day: "2026-11-03", day_index: 2, q1: false, q2: null, q3: null, q4: null, q5: null, q6: null },
      { day: "2026-11-04", day_index: 3, q1: true,  q2: null, q3: null, q4: null, q5: null, q6: null },
    ];
    const f = computeFinal(rows);

    expect(f.questions[0]).toEqual({ q: 1, yes: 2, answered: 3 });
    expect(f.questions[1]).toEqual({ q: 2, yes: 0, answered: 0 });

    // juhendamine is q1 and q2 together: 2 of 3, because q2 contributes nothing.
    expect(f.actions[0]).toMatchObject({ key: "juhendamine", yes: 2, answered: 3 });
    expect(f.actions[0].pct).toBeCloseTo(66.67, 1);
    expect(f.levels.juhendamine).toBe("high");
  });

  it("leaves a part without a level when none of its days were answered", () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      ...day(i + 1, null), q1: true, q2: true,   // only juhendamine answered
    }));
    const f = computeFinal(rows);

    expect(f.levels.juhendamine).toBe("high");
    expect(f.levels.voimestamine).toBeNull();
    expect(f.actions[1].pct).toBeNull();
  });

  it("splits the first and last week by day index, not by date", () => {
    // Days 1-5 all yes, 6-10 all no, 11-15 all yes.
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => day(i + 1, true)),
      ...Array.from({ length: 5 }, (_, i) => day(i + 6, false)),
      ...Array.from({ length: 5 }, (_, i) => day(i + 11, true)),
    ];
    const f = computeFinal(rows);

    expect(f.weeks.first[0]).toEqual({ q: 1, yes: 5, answered: 5 });
    expect(f.weeks.last[0]).toEqual({ q: 1, yes: 5, answered: 5 });
    // The middle week is in the totals but in neither comparison window.
    expect(f.questions[0]).toEqual({ q: 1, yes: 10, answered: 15 });
  });

  it("survives a programme with nothing in it", () => {
    const f = computeFinal([]);
    expect(f.answeredDays).toBe(0);
    expect(f.actions.every((a) => a.pct === null)).toBe(true);
    expect(Object.values(f.levels).every((l) => l === null)).toBe(true);
  });
});

describe("compareWithTest", () => {
  const test = { juhendamine: "high", voimestamine: "mid", inspireerimine: "low" } as const;

  it("reports which side sits higher, by level", () => {
    // juhendamine 20%  → low   against test high → the test said more
    // voimestamine 50% → mid   against test mid  → the same
    // inspireerimine 80% → high against test low → the days said more
    const rows: DayRow[] = Array.from({ length: 10 }, (_, i) => ({
      day: `2026-11-${String(i + 2).padStart(2, "0")}`,
      day_index: i + 1,
      q1: i < 2, q2: i < 2,      // 2 of 10 → 20%
      q3: i < 5, q4: i < 5,      // 5 of 10 → 50%
      q5: i < 8, q6: i < 8,      // 8 of 10 → 80%
    }));

    const f = computeFinal(rows);
    expect(f.levels).toEqual({ juhendamine: "low", voimestamine: "mid", inspireerimine: "high" });

    expect(compareWithTest(f, { ...test })).toEqual([
      { key: "juhendamine", direction: "testHigher" },
      { key: "voimestamine", direction: "same" },
      { key: "inspireerimine", direction: "daysHigher" },
    ]);
  });

  it("says nothing about a part with no answered days", () => {
    const f = computeFinal([]);
    expect(compareWithTest(f, { ...test })).toEqual([]);
  });
});
