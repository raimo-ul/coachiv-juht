// The validation is the whole security of this feature: anything can POST to
// submit-test, and a value that reached the database would be read back onto
// a page. Every case below is one that would otherwise get there.

import { describe, expect, it } from "vitest";
import { cleanUtm, cleanUtmSet } from "./utm.ts";

describe("cleanUtm", () => {
  it("accepts what a real link carries", () => {
    expect(cleanUtm("linkedin")).toBe("linkedin");
    expect(cleanUtm("email_newsletter")).toBe("email_newsletter");
    expect(cleanUtm("meta-boost-2026")).toBe("meta-boost-2026");
  });

  it("lowercases and trims", () => {
    expect(cleanUtm("  LinkedIn  ")).toBe("linkedin");
    expect(cleanUtm("META")).toBe("meta");
  });

  it("refuses markup rather than escaping it", () => {
    // The case Raimo asked for by name. Nothing here tries to make the value
    // safe; it is thrown away, because no real campaign is called this.
    expect(cleanUtm("<script>alert(1)</script>")).toBeUndefined();
    expect(cleanUtm("linkedin<script>")).toBeUndefined();
    expect(cleanUtm("'; drop table tests; --")).toBeUndefined();
  });

  it("allows a space, because a person types the campaign name", () => {
    expect(cleanUtm("sugis kampaania")).toBe("sugis kampaania");
    expect(cleanUtm("  Sugis  ")).toBe("sugis");
  });

  it("refuses anything outside a-z 0-9 space _ -", () => {
    expect(cleanUtm("päevaleht")).toBeUndefined();    // täpitäht
    expect(cleanUtm("a/b")).toBeUndefined();
    expect(cleanUtm("a.b")).toBeUndefined();
  });

  it("refuses an empty or oversized value", () => {
    expect(cleanUtm("")).toBeUndefined();
    expect(cleanUtm("   ")).toBeUndefined();
    expect(cleanUtm("a".repeat(50))).toBe("a".repeat(50));
    expect(cleanUtm("a".repeat(51))).toBeUndefined();
  });

  it("refuses anything that is not a string", () => {
    expect(cleanUtm(null)).toBeUndefined();
    expect(cleanUtm(undefined)).toBeUndefined();
    expect(cleanUtm(42)).toBeUndefined();
    expect(cleanUtm(["linkedin"])).toBeUndefined();
    expect(cleanUtm({ utm_source: "linkedin" })).toBeUndefined();
  });
});

describe("cleanUtmSet", () => {
  it("keeps the three it knows and ignores the rest", () => {
    expect(cleanUtmSet({
      utm_source: "LinkedIn", utm_medium: "organic", utm_campaign: "sügis",
      utm_term: "juht", email: "keegi@näide.ee",
    })).toEqual({ utm_source: "linkedin", utm_medium: "organic" });
  });

  it("leaves a bad field out rather than nulling it", () => {
    // Absent means the column stays null, which reads as "direct visit". An
    // empty string would read as a channel whose name is blank.
    const out = cleanUtmSet({ utm_source: "linkedin", utm_medium: "<b>x</b>" });
    expect(out).toEqual({ utm_source: "linkedin" });
    expect("utm_medium" in out).toBe(false);
  });

  it("returns an empty object when nothing is usable", () => {
    expect(cleanUtmSet({})).toEqual({});
    expect(cleanUtmSet({ utm_source: "   " })).toEqual({});
  });
});
