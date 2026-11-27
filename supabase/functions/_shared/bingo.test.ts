import { describe, expect, it } from "vitest";
import { BINGO_TYPES, countMarked, isTicked, scoreBingo, typeFor } from "./bingo.ts";

describe("typeFor", () => {
  it("covers every count from 0 to 9 with no gap", () => {
    const got = Array.from({ length: 10 }, (_, n) => typeFor(n));
    expect(got).toEqual([
      "LUMEHELVES", "LUMEHELVES", "LUMEHELVES", "LUMEHELVES",
      "GLOGIKEETJA", "GLOGIKEETJA",
      "POHJAPODER", "POHJAPODER",
      "PAKAPIKK", "PAKAPIKK",
    ]);
  });

  it("puts each boundary on the side Raimo wrote it", () => {
    // The bands are 0-3, 4-5, 6-7, 8-9, so every change of type is tested from
    // both sides. An off-by-one here sends the wrong summary to a real person.
    expect(typeFor(3)).toBe("LUMEHELVES");
    expect(typeFor(4)).toBe("GLOGIKEETJA");
    expect(typeFor(5)).toBe("GLOGIKEETJA");
    expect(typeFor(6)).toBe("POHJAPODER");
    expect(typeFor(7)).toBe("POHJAPODER");
    expect(typeFor(8)).toBe("PAKAPIKK");
  });

  it("uses all four types and nothing else", () => {
    const used = new Set(Array.from({ length: 10 }, (_, n) => typeFor(n)));
    expect([...used].sort()).toEqual([...BINGO_TYPES].sort());
  });

  it("throws outside the range instead of guessing", () => {
    expect(() => typeFor(-1)).toThrow(RangeError);
    expect(() => typeFor(10)).toThrow(RangeError);
    expect(() => typeFor(2.5)).toThrow(RangeError);
  });
});

describe("countMarked", () => {
  it("treats a missing question as zero", () => {
    // Tally leaves an untouched checkboxes question as null, not [].
    expect(countMarked(null)).toBe(0);
    expect(countMarked(undefined)).toBe(0);
    expect(countMarked([])).toBe(0);
  });

  it("counts the selected option ids", () => {
    expect(countMarked(["a"])).toBe(1);
    expect(countMarked(["a", "b", "c", "d", "e", "f", "g", "h", "i"])).toBe(9);
  });

  it("refuses a tenth square rather than scoring it", () => {
    // A tenth option means the form grew and this file was not told.
    expect(() => countMarked(new Array(10).fill("x"))).toThrow(RangeError);
  });

  it("refuses a value that is not an array", () => {
    expect(() => countMarked("kolm")).toThrow(TypeError);
    expect(() => countMarked(3)).toThrow(TypeError);
  });
});

describe("isTicked", () => {
  it("reads a one-option consent box", () => {
    // Both consents are checkboxes groups in Tally, not booleans.
    expect(isTicked(["id"])).toBe(true);
    expect(isTicked([])).toBe(false);
    expect(isTicked(null)).toBe(false);
    expect(isTicked(undefined)).toBe(false);
  });

  it("does not treat a stray string as consent", () => {
    expect(isTicked("true")).toBe(false);
  });
});

describe("scoreBingo", () => {
  it("returns the count and the type together", () => {
    expect(scoreBingo(["a", "b", "c", "d", "e", "f"])).toEqual({ marked: 6, type: "POHJAPODER" });
    expect(scoreBingo(null)).toEqual({ marked: 0, type: "LUMEHELVES" });
  });
});
