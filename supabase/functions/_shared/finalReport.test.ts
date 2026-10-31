// The final report is the last thing a person sees and the one place where a
// quiet arithmetic error would be invisible: nobody checks a count of fifteen
// days in their head. The numbers below are worked out in the comments.
//
// Note what is not tested, because it is no longer computed: there is no
// before-and-after and no comparison with the test. The sprint directs
// attention; it does not measure development.

import { describe, expect, it } from "vitest";
import { computeFinal, type DayRow } from "./finalReport.ts";

/** A day where every question got the same answer. */
function day(index: number, value: boolean | null): DayRow {
  return {
    day: `2026-11-${String(index).padStart(2, "0")}`,
    day_index: index,
    q1: value, q2: value, q3: value, q4: value, q5: value, q6: value,
  };
}

describe("computeFinal", () => {
  it("counts fifteen days of yes", () => {
    const f = computeFinal(Array.from({ length: 15 }, (_, i) => day(i + 1, true)));

    expect(f.answeredDays).toBe(15);
    expect(f.workdays).toBe(15);
    expect(f.questions.every((q) => q.yes === 15 && q.answered === 15 && q.yesRate === 1)).toBe(true);
    expect(f.consistency.every((c) => c.yesCount === 6 && c.answered)).toBe(true);
  });

  it("does not count an unanswered day as a no", () => {
    // Ten answered yes, five never opened. Every question is 10 of 10, not
    // 10 of 15: a day away is not a day of noes.
    const f = computeFinal([
      ...Array.from({ length: 10 }, (_, i) => day(i + 1, true)),
      ...Array.from({ length: 5 }, (_, i) => day(i + 11, null)),
    ]);

    expect(f.answeredDays).toBe(10);
    expect(f.questions[0]).toMatchObject({ yes: 10, answered: 10, yesRate: 1 });
    expect(f.consistency[14]).toMatchObject({ answered: false, yesCount: 0 });
  });

  it("ranks the two most often true and the one least often true", () => {
    // Over ten days:
    //   q1 yes  9  → 0,9   q2 yes 8 → 0,8   q3 yes 5 → 0,5
    //   q4 yes  2  → 0,2   q5 yes 7 → 0,7   q6 yes 1 → 0,1
    const rows: DayRow[] = Array.from({ length: 10 }, (_, i) => ({
      day: `2026-11-${String(i + 2).padStart(2, "0")}`,
      day_index: i + 1,
      q1: i < 9, q2: i < 8, q3: i < 5, q4: i < 2, q5: i < 7, q6: i < 1,
    }));

    const f = computeFinal(rows);
    expect(f.strongest.map((q) => q.q)).toEqual([1, 2]);
    expect(f.weakest?.q).toBe(6);
    expect(f.weakest?.yes).toBe(1);
  });

  it("breaks a tie by question order, so the same data gives the same report", () => {
    const rows: DayRow[] = Array.from({ length: 4 }, (_, i) => ({
      day: `2026-11-0${i + 2}`,
      day_index: i + 1,
      q1: true, q2: true, q3: true, q4: false, q5: false, q6: false,
    }));

    const f = computeFinal(rows);
    expect(f.strongest.map((q) => q.q)).toEqual([1, 2]);
    expect(f.weakest?.q).toBe(6);
  });

  it("leaves a question out of the ranking when it was never answered", () => {
    // q1 and q2 answered, the rest never. Only those two can be ranked, so the
    // same question is both the most and the least often true.
    const rows: DayRow[] = Array.from({ length: 5 }, (_, i) => ({
      day: `2026-11-0${i + 2}`,
      day_index: i + 1,
      q1: true, q2: i < 2, q3: null, q4: null, q5: null, q6: null,
    }));

    const f = computeFinal(rows);
    expect(f.strongest.map((q) => q.q)).toEqual([1, 2]);
    expect(f.weakest?.q).toBe(2);
    expect(f.questions[2].yesRate).toBeNull();
  });

  it("survives a programme with nothing in it", () => {
    const f = computeFinal([]);
    expect(f.answeredDays).toBe(0);
    expect(f.strongest).toEqual([]);
    expect(f.weakest).toBeNull();
    expect(f.questions.every((q) => q.yesRate === null)).toBe(true);
  });
});
