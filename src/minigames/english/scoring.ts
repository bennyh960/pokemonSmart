/**
 * Scoring — pure.
 *   stars: by mistakes, allowed in proportion to the round's length and more for younger kids (STAR_MISTAKES_PER_10;
 *          a 10-question round at age 9–10: 0–1 → 3★, 2–3 → 2★, more → 1★). Finishing always clears — kids keep going
 *   a question adds at most MISTAKE_CAP_PER_QUESTION mistakes (one hard word can't sink the round)
 *   points: 100 for a first-try answer, 50 after a mistake, +10 per combo step (capped)
 */

import type { Stars } from '../types.js';

export const MISTAKE_CAP_PER_QUESTION = 2;
export const POINTS_FIRST_TRY = 100;
export const POINTS_AFTER_MISTAKE = 50;
export const COMBO_BONUS = 10;
export const COMBO_BONUS_MAX = 100;

/** Questions the mistake limits are given for; shorter rounds keep these limits. */
export const STAR_ROUND_BASE = 10;

/** Mistakes allowed per STAR_ROUND_BASE questions for 3★ / 2★, by the child's age (first band the age fits). */
export const STAR_MISTAKES_PER_10: readonly { maxAge: number; three: number; two: number }[] = [
  { maxAge: 6, three: 3, two: 6 },
  { maxAge: 8, three: 2, two: 4 },
  { maxAge: 10, three: 1, two: 3 },
  { maxAge: Infinity, three: 1, two: 2 },
];

/** Age assumed when unknown (the old fixed rule). */
export const DEFAULT_STAR_AGE = 9;

/** Mistakes a round may have and still earn 3★ / 2★. */
export function starLimits(questions: number, age = DEFAULT_STAR_AGE): { three: number; two: number } {
  const band = STAR_MISTAKES_PER_10.find((b) => age <= b.maxAge)!;
  const scale = Math.max(questions, STAR_ROUND_BASE) / STAR_ROUND_BASE;
  return { three: Math.round(band.three * scale), two: Math.round(band.two * scale) };
}

export function starsForMistakes(mistakes: number, questions = STAR_ROUND_BASE, age = DEFAULT_STAR_AGE): Stars {
  const limit = starLimits(questions, age);
  if (mistakes <= limit.three) return 3;
  if (mistakes <= limit.two) return 2;
  return 1;
}

/** Points for finishing a question. `combo` = the combo after this answer (1 = first in a row). */
export function pointsFor(mistakesInQuestion: number, combo: number): number {
  const base = mistakesInQuestion === 0 ? POINTS_FIRST_TRY : POINTS_AFTER_MISTAKE;
  return base + Math.min(COMBO_BONUS_MAX, Math.max(0, combo - 1) * COMBO_BONUS);
}

export interface Tally {
  score: number;
  combo: number;
  bestCombo: number;
  /** Counted mistakes (capped per question). */
  mistakes: number;
  /** Raw wrong taps in the current question. */
  questionMistakes: number;
  done: number;
}

export function newTally(): Tally {
  return { score: 0, combo: 0, bestCombo: 0, mistakes: 0, questionMistakes: 0, done: 0 };
}

export function tallyWrong(t: Tally): Tally {
  const counts = t.questionMistakes < MISTAKE_CAP_PER_QUESTION;
  return { ...t, combo: 0, questionMistakes: t.questionMistakes + 1, mistakes: t.mistakes + (counts ? 1 : 0) };
}

/** A question was finished. A clean answer grows the combo; any mistake already reset it. */
export function tallyQuestionDone(t: Tally): { tally: Tally; points: number } {
  const combo = t.questionMistakes === 0 ? t.combo + 1 : 1;
  const points = pointsFor(t.questionMistakes, combo);
  return {
    points,
    tally: {
      ...t,
      combo,
      bestCombo: Math.max(t.bestCombo, combo),
      score: t.score + points,
      questionMistakes: 0,
      done: t.done + 1,
    },
  };
}
