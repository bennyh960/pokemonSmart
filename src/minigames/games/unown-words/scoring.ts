/**
 * Scoring — pure.
 *   stars: 0–1 mistakes → 3★, 2–3 → 2★, more → 1★ (finishing always clears — kids keep going)
 *   a question adds at most MISTAKE_CAP_PER_QUESTION mistakes (one hard word can't sink the round)
 *   points: 100 for a first-try answer, 50 after a mistake, +10 per combo step (capped)
 */

import type { Stars } from '../../types.js';

export const MISTAKE_CAP_PER_QUESTION = 2;
export const POINTS_FIRST_TRY = 100;
export const POINTS_AFTER_MISTAKE = 50;
export const COMBO_BONUS = 10;
export const COMBO_BONUS_MAX = 100;

export function starsForMistakes(mistakes: number): Stars {
  if (mistakes <= 1) return 3;
  if (mistakes <= 3) return 2;
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
