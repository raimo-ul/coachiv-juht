// Dates are where this product is most likely to be quietly wrong, so the
// awkward cases are written down: a programme starting on a Friday, the weeks
// either side of a clock change, and a participant on the other side of the
// Atlantic.

import { describe, expect, it } from "vitest";
import { addDays, dayIndex, isWorkday, localDate, localHour, nextWorkday, nthWorkdayFrom } from "./workdays.ts";

describe("localDate and localHour", () => {
  it("reads the wall clock where the participant is", () => {
    // 2026-03-02 22:30 UTC is still the 2nd in Tallinn and in New York.
    const at = new Date("2026-03-02T22:30:00Z");
    expect(localDate(at, "Europe/Tallinn")).toBe("2026-03-03");  // 00:30 next day
    expect(localDate(at, "America/New_York")).toBe("2026-03-02"); // 17:30 same day
  });

  it("gives each zone its own hour at the same instant", () => {
    // SPEC 15: a New York participant is mailed at 16:00 New York time, which
    // is a different instant from 16:00 in Tallinn.
    const at = new Date("2026-06-10T20:00:00Z");
    expect(localHour(at, "Europe/Tallinn")).toBe(23);
    expect(localHour(at, "America/New_York")).toBe(16);
  });

  it("follows each zone through its own clock change", () => {
    // Estonia and the US change clocks on different weekends. An offset worked
    // out once and reused would be an hour wrong for part of March.
    const march = new Date("2026-03-20T20:00:00Z");  // US already on DST
    expect(localHour(march, "America/New_York")).toBe(16);
    expect(localHour(march, "Europe/Tallinn")).toBe(22);

    const april = new Date("2026-04-10T20:00:00Z");  // both on DST
    expect(localHour(april, "America/New_York")).toBe(16);
    expect(localHour(april, "Europe/Tallinn")).toBe(23);
  });
});

describe("isWorkday", () => {
  it("is Monday to Friday", () => {
    expect(isWorkday("2026-11-02")).toBe(true);   // Monday
    expect(isWorkday("2026-11-06")).toBe(true);   // Friday
    expect(isWorkday("2026-11-07")).toBe(false);  // Saturday
    expect(isWorkday("2026-11-08")).toBe(false);  // Sunday
  });
});

describe("nextWorkday", () => {
  it("steps over the weekend", () => {
    expect(nextWorkday("2026-11-06")).toBe("2026-11-09"); // Fri -> Mon
    expect(nextWorkday("2026-11-07")).toBe("2026-11-09"); // Sat -> Mon
    expect(nextWorkday("2026-11-02")).toBe("2026-11-03"); // Mon -> Tue
  });
});

describe("nthWorkdayFrom", () => {
  it("counts the start day as the first", () => {
    expect(nthWorkdayFrom("2026-11-02", 1)).toBe("2026-11-02");
    expect(nthWorkdayFrom("2026-11-02", 5)).toBe("2026-11-06");
  });

  it("gives fifteen workdays, not fifteen days", () => {
    // Monday start: three full working weeks, ending on the third Friday.
    expect(nthWorkdayFrom("2026-11-02", 15)).toBe("2026-11-20");
  });

  it("handles a Friday start, where the weekends fall differently", () => {
    // Friday + 14 more workdays lands on a Thursday three weeks later.
    expect(nthWorkdayFrom("2026-11-06", 15)).toBe("2026-11-26");
    expect(isWorkday(nthWorkdayFrom("2026-11-06", 15))).toBe(true);
  });
});

describe("dayIndex", () => {
  const start = "2026-11-02"; // Monday

  it("numbers the workdays and ignores the weekend between them", () => {
    expect(dayIndex(start, "2026-11-02")).toBe(1);
    expect(dayIndex(start, "2026-11-06")).toBe(5);
    expect(dayIndex(start, "2026-11-09")).toBe(6);  // the Monday after
    expect(dayIndex(start, "2026-11-20")).toBe(15);
  });

  it("is null outside the programme", () => {
    expect(dayIndex(start, "2026-10-30")).toBeNull();  // before it begins
    expect(dayIndex(start, "2026-11-07")).toBeNull();  // a Saturday
    expect(dayIndex(start, "2026-11-23")).toBeNull();  // past the fifteenth
  });
});

describe("addDays", () => {
  it("crosses a month and a year", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});
