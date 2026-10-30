// SPEC 7 asks for at least five hand-calculated sets, including all 1s, all 6s
// and a check on the reversed items. Every expected number below is worked out
// by hand in the comment above it, so a failure says which arithmetic changed
// rather than only that something did.
//
// The parts, from content/et.json:
//   juhendamine    T1 T2 T3
//   voimestamine   T4 T5 T6
//   inspireerimine T7 T8 T9
//   inimene        U1 U2 U3   (U3 reversed)
//   suhe           U4 U5 U6   (U6 reversed)
//   autonoomia     U7 U8 U9   (U9 reversed)

import { describe, expect, it } from "vitest";
import { applyReverse, forDisplay, isComplete, levelFor, scoreTest, type Answers } from "@/lib/scoring";
import { getContent } from "@/lib/content";

const LEVELS = getContent("et").test.scoring.levels;

const T = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9"];
const U = ["U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8", "U9"];

/** Every item the same value. */
function uniform(value: number): Answers {
  return Object.fromEntries([...T, ...U].map((k) => [k, value]));
}

/** Start from a uniform sheet and override named items. */
function sheet(base: number, overrides: Answers): Answers {
  return { ...uniform(base), ...overrides };
}

describe("applyReverse", () => {
  it("turns a reversed item around on the 1-6 scale", () => {
    expect(applyReverse("U3", 1, ["U3"])).toBe(6);
    expect(applyReverse("U3", 6, ["U3"])).toBe(1);
    expect(applyReverse("U3", 4, ["U3"])).toBe(3);
  });

  it("leaves everything else alone", () => {
    expect(applyReverse("U1", 1, ["U3"])).toBe(1);
    expect(applyReverse("T1", 6, ["U3"])).toBe(6);
  });
});

describe("levelFor", () => {
  // SPEC 7 bands: low 1,0-2,9 · mid 3,0-4,4 · high 4,5-6,0.
  it("places the stated band edges", () => {
    expect(levelFor(1.0, LEVELS)).toBe("low");
    expect(levelFor(2.9, LEVELS)).toBe("low");
    expect(levelFor(3.0, LEVELS)).toBe("mid");
    expect(levelFor(4.4, LEVELS)).toBe("mid");
    expect(levelFor(4.5, LEVELS)).toBe("high");
    expect(levelFor(6.0, LEVELS)).toBe("high");
  });

  it("gives the gaps between the written bands a level too", () => {
    // 2,95 and 4,45 fall between the bands as SPEC writes them.
    expect(levelFor(2.95, LEVELS)).toBe("low");
    expect(levelFor(4.45, LEVELS)).toBe("mid");
  });
});

describe("scoreTest", () => {
  it("set 1: every answer 1", () => {
    const { scores, levels, pairs } = scoreTest(uniform(1));

    // Actions carry no reversed item: (1+1+1)/3 = 1
    expect(scores.juhendamine).toBe(1);
    expect(scores.voimestamine).toBe(1);
    expect(scores.inspireerimine).toBe(1);

    // Beliefs each hold one reversed item: (1 + 1 + (7-1)) / 3 = 8/3
    expect(scores.inimene).toBeCloseTo(8 / 3, 10);
    expect(scores.suhe).toBeCloseTo(8 / 3, 10);
    expect(scores.autonoomia).toBeCloseTo(8 / 3, 10);

    // 8/3 = 2,67, still under 3,0
    expect(levels.inimene).toBe("low");
    expect(levels.juhendamine).toBe("low");

    // Everything low, so no pair differs.
    expect(pairs).toEqual([]);
  });

  it("set 2: every answer 6", () => {
    const { scores, levels, pairs } = scoreTest(uniform(6));

    expect(scores.juhendamine).toBe(6);
    expect(levels.juhendamine).toBe("high");

    // (6 + 6 + (7-6)) / 3 = 13/3 = 4,33 — mid, not high, because answering 6 to
    // a reversed statement is the opposite of agreeing with the part.
    expect(scores.inimene).toBeCloseTo(13 / 3, 10);
    expect(levels.inimene).toBe("mid");

    // Belief mid, action high, in all three pairs.
    expect(pairs).toHaveLength(3);
    expect(pairs.every((p) => p.direction === "actionHigher")).toBe(true);
  });

  it("set 3: the reversed item decides the part", () => {
    // U1=5 U2=5 U3=1 → (5 + 5 + 6) / 3 = 16/3 = 5,33
    const low3 = scoreTest(sheet(3, { U1: 5, U2: 5, U3: 1 }));
    expect(low3.scores.inimene).toBeCloseTo(16 / 3, 10);
    expect(low3.levels.inimene).toBe("high");

    // Same two answers, U3 flipped: (5 + 5 + 1) / 3 = 11/3 = 3,67
    const high3 = scoreTest(sheet(3, { U1: 5, U2: 5, U3: 6 }));
    expect(high3.scores.inimene).toBeCloseTo(11 / 3, 10);
    expect(high3.levels.inimene).toBe("mid");
  });

  it("set 4: belief above action", () => {
    // inimene:        U1=6 U2=6 U3=1 → (6 + 6 + 6) / 3 = 6,0  high
    // inspireerimine: T7=1 T8=1 T9=1 → 1,0                     low
    const { scores, levels, pairs } = scoreTest(sheet(3, {
      U1: 6, U2: 6, U3: 1,
      T7: 1, T8: 1, T9: 1,
    }));

    expect(scores.inimene).toBe(6);
    expect(scores.inspireerimine).toBe(1);
    expect(levels.inimene).toBe("high");
    expect(levels.inspireerimine).toBe("low");

    const pair = pairs.find((p) => p.belief === "inimene");
    expect(pair).toEqual({ belief: "inimene", action: "inspireerimine", direction: "beliefHigher" });
  });

  it("set 5: equal levels produce no pair sentence", () => {
    // inimene:        U1=3 U2=3 U3=4 → (3 + 3 + 3) / 3 = 3,0  mid
    // inspireerimine: T7=3 T8=3 T9=3 → 3,0                     mid
    const { levels, pairs } = scoreTest(sheet(3, {
      U1: 3, U2: 3, U3: 4,
      T7: 3, T8: 3, T9: 3,
    }));

    expect(levels.inimene).toBe("mid");
    expect(levels.inspireerimine).toBe("mid");
    expect(pairs.find((p) => p.belief === "inimene")).toBeUndefined();
  });

  it("set 6: a mixed sheet, part by part", () => {
    // juhendamine    T1=6 T2=5 T3=4 → 15/3 = 5,0            high
    // voimestamine   T4=2 T5=2 T6=2 → 6/3  = 2,0            low
    // inspireerimine T7=4 T8=4 T9=4 → 12/3 = 4,0            mid
    // inimene        U1=2 U2=2 U3=5 → (2+2+2)/3 = 2,0       low
    // suhe           U4=5 U5=5 U6=2 → (5+5+5)/3 = 5,0       high
    // autonoomia     U7=4 U8=4 U9=3 → (4+4+4)/3 = 4,0       mid
    const { scores, levels, pairs } = scoreTest({
      T1: 6, T2: 5, T3: 4,
      T4: 2, T5: 2, T6: 2,
      T7: 4, T8: 4, T9: 4,
      U1: 2, U2: 2, U3: 5,
      U4: 5, U5: 5, U6: 2,
      U7: 4, U8: 4, U9: 3,
    });

    expect(scores).toEqual({
      juhendamine: 5, voimestamine: 2, inspireerimine: 4,
      inimene: 2, suhe: 5, autonoomia: 4,
    });
    expect(levels).toEqual({
      juhendamine: "high", voimestamine: "low", inspireerimine: "mid",
      inimene: "low", suhe: "high", autonoomia: "mid",
    });

    // inimene low vs inspireerimine mid → action one step up
    // suhe high vs juhendamine high     → equal, no sentence
    // autonoomia mid vs voimestamine low → belief one step up
    expect(pairs).toEqual([
      { belief: "inimene", action: "inspireerimine", direction: "actionHigher" },
      { belief: "autonoomia", action: "voimestamine", direction: "beliefHigher" },
    ]);
  });

  it("refuses an answer outside the scale or missing", () => {
    expect(() => scoreTest(sheet(3, { T1: 0 }))).toThrow(/skaalat/);
    expect(() => scoreTest(sheet(3, { T1: 7 }))).toThrow(/skaalat/);

    const missing = uniform(3);
    delete missing.U9;
    expect(() => scoreTest(missing)).toThrow(/U9/);
  });
});

describe("forDisplay", () => {
  it("shows one decimal with an Estonian comma", () => {
    expect(forDisplay(13 / 3)).toBe("4,3");
    expect(forDisplay(6)).toBe("6,0");
    expect(forDisplay(2.95)).toBe("3,0"); // rounding is for the screen only
  });
});

describe("isComplete", () => {
  it("wants all 18, each a whole number on the scale", () => {
    expect(isComplete(uniform(3))).toBe(true);

    const missing = uniform(3);
    delete missing.T5;
    expect(isComplete(missing)).toBe(false);

    expect(isComplete(sheet(3, { T5: 0 }))).toBe(false);
    expect(isComplete(sheet(3, { T5: 3.5 }))).toBe(false);
  });
});
