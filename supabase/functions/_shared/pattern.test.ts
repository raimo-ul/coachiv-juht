import { describe, expect, it } from "vitest";
import { readPattern, strongestAction, weakestAction } from "./pattern.ts";
import { scoreTest } from "./scoring.ts";
import type { PartKey } from "./content.ts";

/** Six part scores, written out so each test says what it is testing. */
function s(parts: Partial<Record<PartKey, number>>): Record<PartKey, number> {
  return {
    juhendamine: 4, voimestamine: 4, inspireerimine: 4,
    inimene: 4, suhe: 4, autonoomia: 4,
    ...parts,
  } as Record<PartKey, number>;
}

describe("weakestAction", () => {
  it("picks the lowest of the three actions", () => {
    expect(weakestAction(s({ juhendamine: 5, voimestamine: 4, inspireerimine: 2 }))).toBe("inspireerimine");
    expect(weakestAction(s({ juhendamine: 2, voimestamine: 4, inspireerimine: 5 }))).toBe("juhendamine");
    expect(weakestAction(s({ juhendamine: 5, voimestamine: 2, inspireerimine: 4 }))).toBe("voimestamine");
  });

  it("ignores the beliefs even when they are lower", () => {
    // The two halves use different scales, so a belief can never be the answer.
    expect(weakestAction(s({ inimene: 1, suhe: 1, autonoomia: 1, inspireerimine: 3 }))).toBe("inspireerimine");
  });

  it("breaks a tie as inspireerimine, then juhendamine, then voimestamine", () => {
    expect(weakestAction(s({ juhendamine: 3, voimestamine: 3, inspireerimine: 3 }))).toBe("inspireerimine");
    expect(weakestAction(s({ juhendamine: 3, voimestamine: 3, inspireerimine: 5 }))).toBe("juhendamine");
  });
});

describe("strongestAction", () => {
  it("picks the highest of the three", () => {
    expect(strongestAction(s({ juhendamine: 2, voimestamine: 5, inspireerimine: 3 }))).toBe("voimestamine");
  });

  it("breaks a tie as juhendamine, then voimestamine, then inspireerimine", () => {
    expect(strongestAction(s({ juhendamine: 4, voimestamine: 4, inspireerimine: 4 }))).toBe("juhendamine");
    expect(strongestAction(s({ juhendamine: 2, voimestamine: 4, inspireerimine: 4 }))).toBe("voimestamine");
  });
});

describe("readPattern", () => {
  const sheet = (base: number, over: Record<string, number> = {}) => {
    const a: Record<string, number> = {};
    for (const p of ["T", "U"]) for (let i = 1; i <= 9; i++) a[`${p}${i}`] = base;
    return { ...a, ...over };
  };

  it("pairs the weakest action with its own belief", () => {
    const scored = scoreTest(sheet(3, { T7: 1, T8: 1, T9: 1 }));
    const p = readPattern(scored);
    expect(p.weakest).toBe("inspireerimine");
    expect(p.belief).toBe("inimene");
  });

  it("says beliefHigher only when the belief sits a level above the action", () => {
    // inspireerimine 1,0 low. inimene: U1=6 U2=6 U3=1 → reversed U3 becomes 6
    // → 6,0 high. The belief is two levels up, so the second sentence applies.
    const high = readPattern(scoreTest(sheet(3, { T7: 1, T8: 1, T9: 1, U1: 6, U2: 6, U3: 1 })));
    expect(high.beliefHigher).toBe(true);

    // Both at the same level: nothing to add.
    const same = readPattern(scoreTest(sheet(1)));
    expect(same.beliefHigher).toBe(false);
  });

  it("flags the case where all three actions are equal", () => {
    expect(readPattern(scoreTest(sheet(4))).allEqual).toBe(true);
    expect(readPattern(scoreTest(sheet(4, { T1: 6 }))).allEqual).toBe(false);
  });

  it("gives the same answer whichever bands the test was scored against", () => {
    // The weakest action is a comparison between actions, so moving the bands
    // must not move the name. Only beliefHigher may differ, and only because
    // levels are what it compares.
    const answers = sheet(3, { T1: 5, T2: 5, T3: 5, T7: 2, T8: 2, T9: 2 });
    expect(readPattern(scoreTest(answers, "et", "v1")).weakest)
      .toBe(readPattern(scoreTest(answers, "et", "v2")).weakest);
  });
});
