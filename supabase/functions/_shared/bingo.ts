// Scoring for the year-end bingo campaign.
//
// Nine squares, each ticked or not. The count decides one of four types. That
// is the whole model: no weighting, no AI, no hidden rules. It lives in its own
// module rather than inside the function so the bands can be tested without
// Deno, the same reason scoring.ts and pattern.ts sit here.
//
// The bands are Raimo's, from bingo-sisu.md, and they are deliberately uneven:
// 0-3, 4-5, 6-7, 8-9. He expects to move them after the first hundred answers,
// so they are written once, here, and read from nowhere else.

export const BINGO_TYPES = ["LUMEHELVES", "GLOGIKEETJA", "POHJAPODER", "PAKAPIKK"] as const;

export type BingoType = (typeof BINGO_TYPES)[number];

/** How many of the nine squares are ticked. */
export const SQUARE_COUNT = 9;

/**
 * Upper bound of each band, in order. A count belongs to the first band it does
 * not exceed, so the table reads the same way Raimo wrote it.
 */
const BANDS: ReadonlyArray<{ upTo: number; type: BingoType }> = [
  { upTo: 3, type: "LUMEHELVES" },
  { upTo: 5, type: "GLOGIKEETJA" },
  { upTo: 7, type: "POHJAPODER" },
  { upTo: 9, type: "PAKAPIKK" },
];

/**
 * The type for a number of ticked squares.
 *
 * Throws outside 0 to 9 rather than guessing. A count that is out of range
 * means the form changed or the payload was misread, and a cheerful
 * LUMEHELVES would hide that from everyone.
 */
export function typeFor(marked: number): BingoType {
  if (!Number.isInteger(marked) || marked < 0 || marked > SQUARE_COUNT) {
    throw new RangeError(`bingo: märgitud ruute ${marked}, oodatud 0 kuni ${SQUARE_COUNT}`);
  }
  return BANDS.find((b) => marked <= b.upTo)!.type;
}

/**
 * Count the ticked squares from what Tally sends.
 *
 * A checkboxes question arrives as an array of the selected options' ids, and
 * an untouched question arrives as null rather than an empty array. Both mean
 * zero. Anything longer than nine is a form that has grown a tenth square
 * without this file being told.
 */
export function countMarked(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (!Array.isArray(value)) {
    throw new TypeError(`bingo: ruudustiku väärtus ei ole massiiv (${typeof value})`);
  }
  if (value.length > SQUARE_COUNT) {
    throw new RangeError(`bingo: ruudustikus ${value.length} valikut, oodatud kuni ${SQUARE_COUNT}`);
  }
  return value.length;
}

/** True when a single-option consent checkbox was ticked. */
export function isTicked(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

export type Scored = { marked: number; type: BingoType };

export function scoreBingo(value: unknown): Scored {
  const marked = countMarked(value);
  return { marked, type: typeFor(marked) };
}
