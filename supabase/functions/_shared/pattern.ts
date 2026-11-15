// The one sentence a report leads with: which of the three actions reaches the
// person's day least often, and whether the belief under it is already there.
//
// Lives here rather than in the report component because three places need the
// same answer and they must not disagree: the report block, the green offer
// beneath it, and the trial-day email. A reader who is told inspireerimine on
// the page and juhendamine in the letter has been told the test is guesswork.

import type { PartKey } from "./content.ts";
import type { Level, Scored } from "./scoring.ts";

export type ActionKey = "juhendamine" | "voimestamine" | "inspireerimine";
export type BeliefKey = "inimene" | "suhe" | "autonoomia";

/**
 * Ties are broken in this order, not by chance.
 *
 * Three equal scores have to produce one name, and the same name every time
 * the report is opened. The order is Raimo's: inspireerimine first, because an
 * action that never gets said out loud is the one worth naming.
 */
const WEAKEST_ORDER: ActionKey[] = ["inspireerimine", "juhendamine", "voimestamine"];

/** Highest-scoring action. Ties here run the other way, strongest first. */
const STRONGEST_ORDER: ActionKey[] = ["juhendamine", "voimestamine", "inspireerimine"];

/** Which belief sits under which action. */
export const BELIEF_OF: Record<ActionKey, BeliefKey> = {
  inspireerimine: "inimene",
  juhendamine: "suhe",
  voimestamine: "autonoomia",
};

const LEVEL_RANK: Record<Level, number> = { low: 0, mid: 1, high: 2 };

function pick(scores: Record<PartKey, number>, order: ActionKey[], wantLowest: boolean): ActionKey {
  let best = order[0];
  for (const key of order) {
    const better = wantLowest ? scores[key] < scores[best] : scores[key] > scores[best];
    if (better) best = key;
  }
  return best;
}

/** The action that reaches the day least often. */
export function weakestAction(scores: Record<PartKey, number>): ActionKey {
  return pick(scores, WEAKEST_ORDER, true);
}

/** The action that reaches the day most often. */
export function strongestAction(scores: Record<PartKey, number>): ActionKey {
  return pick(scores, STRONGEST_ORDER, false);
}

export type Pattern = {
  weakest: ActionKey;
  strongest: ActionKey;
  /** The belief under the weakest action. */
  belief: BeliefKey;
  /**
   * True when the belief is held at a higher level than the action is done.
   *
   * Levels, not scores: the two halves of the test use different scales, so
   * comparing 4,3 against 4,7 would be comparing nothing. This is what decides
   * whether the report adds its second sentence — "the ground is there, it
   * reaches people less often" is only worth saying when the ground is there.
   */
  beliefHigher: boolean;
  /** True when all three actions scored the same, so there is no contrast. */
  allEqual: boolean;
};

export function readPattern(scored: Pick<Scored, "scores" | "levels">): Pattern {
  const weakest = weakestAction(scored.scores);
  const strongest = strongestAction(scored.scores);
  const belief = BELIEF_OF[weakest];
  const values = (["juhendamine", "voimestamine", "inspireerimine"] as ActionKey[])
    .map((k) => scored.scores[k]);

  return {
    weakest,
    strongest,
    belief,
    beliefHigher: LEVEL_RANK[scored.levels[belief]] > LEVEL_RANK[scored.levels[weakest]],
    allEqual: values.every((v) => v === values[0]),
  };
}
