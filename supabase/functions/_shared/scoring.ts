// Turning 18 answers into six part scores, three levels and a pair sentence.
//
// The configuration (which items make up a part, which are reversed, where the
// level bands sit, which belief pairs with which action) lives in
// content/et.json under test.scoring, not here. SPEC 7 states the same values,
// and keeping one copy means a later change to the bands moves the report and
// the maths together instead of drifting apart.

import { getContent, type Content, type PartKey } from "./content.ts";

export type { PartKey };
export type ItemKey = string;
export type Answers = Record<ItemKey, number>;
export type Level = "low" | "mid" | "high";

export type Scored = {
  /** Exact means. SPEC 6: the database keeps full precision. */
  scores: Record<PartKey, number>;
  levels: Record<PartKey, Level>;
  /**
   * All three belief-action pairs, always, each with a verdict.
   *
   * Only the differing ones used to be returned. That left the report showing
   * one lonely card in a three-column row, with nothing to say why the other
   * two pairs were absent, and it hid the oddity below: because the comparison
   * is between levels, suhe 2,7 against juhendamine 3,0 counts as different
   * while autonoomia 3,0 against voimestamine 4,0 counts as the same. Showing
   * every pair makes that visible instead of silent.
   */
  pairs: Array<{ belief: PartKey; action: PartKey; direction: "beliefHigher" | "actionHigher" | "same" }>;
};

const LEVEL_ORDER: Level[] = ["low", "mid", "high"];

/** Which three parts are actions. The other three are beliefs. */
const ACTION_PARTS: PartKey[] = ["juhendamine", "voimestamine", "inspireerimine"];

export type ScoringVersion = "v1" | "v2";

/**
 * The bands the actions are read against.
 *
 * v1 put "high" at 4,5 and 102 of the first 122 tests reached it. The word on
 * the report has to mean what the sprint means by it — on most working days —
 * so v2 moves the line to 5,0. Beliefs keep one set of bands in both versions:
 * nothing about holding a belief changed.
 *
 * Which bands a report uses is written on the test row, not decided at read
 * time. Someone who took the test in November opens their report in March and
 * sees the same words they saw the first time.
 */
export const DEFAULT_SCORING_VERSION: ScoringVersion = "v2";

/** SPEC 7: reversed items are scored as 7 - answer. */
export function applyReverse(key: ItemKey, value: number, reversed: readonly string[]): number {
  return reversed.includes(key) ? 7 - value : value;
}

/**
 * SPEC 7 writes the bands as low 1,0-2,9 · mid 3,0-4,4 · high 4,5-6,0.
 *
 * Written that way they have gaps: 2,95 and 4,45 belong to no band, and a mean
 * of three integers lands on thirds, so 2,67 and 4,33 are ordinary results
 * while 2,95 is not reachable. The gaps are an artefact of writing bands to one
 * decimal, not a decision. Treated as cut points (below 3,0 low, below 4,5 mid,
 * otherwise high) every possible score has exactly one level and the stated
 * bands are unchanged. Recorded in DECISIONS.md.
 */
/** One set of band edges: the shape under beliefs, v1 and v2 alike. */
export type Bands = Content["test"]["scoring"]["levels"]["beliefs"];

export function levelFor(score: number, levels: Bands): Level {
  if (score < levels.mid[0]) return "low";
  if (score < levels.high[0]) return "mid";
  return "high";
}

/** How many steps b sits above a. Negative when b is lower. */
function levelDistance(a: Level, b: Level): number {
  return LEVEL_ORDER.indexOf(b) - LEVEL_ORDER.indexOf(a);
}

export function scoreTest(
  answers: Answers,
  locale?: string,
  version: ScoringVersion = DEFAULT_SCORING_VERSION,
): Scored {
  const { scoring } = getContent(locale).test;
  const { parts, reversed, levels, pairs } = scoring;
  const actionBands = version === "v1" ? levels.v1 : levels.v2;
  const beliefBands = levels.beliefs;

  const scores = {} as Record<PartKey, number>;
  const partLevels = {} as Record<PartKey, Level>;

  for (const [part, keys] of Object.entries(parts) as Array<[PartKey, readonly string[]]>) {
    let sum = 0;
    for (const key of keys) {
      const raw = answers[key];
      if (typeof raw !== "number" || !Number.isFinite(raw)) {
        throw new Error(`Vastus puudub või ei ole arv: ${key}`);
      }
      if (raw < 1 || raw > 6) {
        throw new Error(`Vastus väljaspool skaalat 1-6: ${key} = ${raw}`);
      }
      sum += applyReverse(key, raw, reversed);
    }
    const mean = sum / keys.length;
    scores[part] = mean;
    partLevels[part] = levelFor(mean, ACTION_PARTS.includes(part) ? actionBands : beliefBands);
  }

  // SPEC 7: scores themselves are never compared, because the two screens use
  // different scales. Only the levels are, and only within a pair.
  const pairResults: Scored["pairs"] = [];
  for (const [belief, action] of Object.entries(pairs) as Array<[PartKey, PartKey]>) {
    const distance = levelDistance(partLevels[action], partLevels[belief]);
    const direction = distance >= 1 ? "beliefHigher" : distance <= -1 ? "actionHigher" : "same";
    pairResults.push({ belief, action, direction });
  }

  return { scores, levels: partLevels, pairs: pairResults };
}

/** SPEC 7: one decimal, and only on the way to the screen. */
export function forDisplay(score: number): string {
  return score.toFixed(1).replace(".", ",");
}

/** The 18 keys the test must deliver, in screen order. */
export function allItemKeys(locale?: string): ItemKey[] {
  const { screens } = getContent(locale).test;
  return [...screens.actions.order, ...screens.beliefs.order];
}

/** True when every item has an answer on the 1-6 scale. */
export function isComplete(answers: Answers, locale?: string): boolean {
  return allItemKeys(locale).every((k) => {
    const v = answers[k];
    return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 6;
  });
}
