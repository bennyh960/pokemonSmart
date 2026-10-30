import { describe, expect, it } from 'vitest';
import {
  MISTAKE_CAP_PER_QUESTION,
  POINTS_AFTER_MISTAKE,
  POINTS_FIRST_TRY,
  newTally,
  starLimits,
  starsForMistakes,
  tallyQuestionDone,
  tallyWrong,
} from '../scoring.js';

describe('English round scoring', () => {
  it('stars by mistakes', () => {
    expect([0, 1, 2, 3, 4, 9].map((m) => starsForMistakes(m))).toEqual([3, 3, 2, 2, 1, 1]);
  });

  it('allows more mistakes in long rounds and for younger kids', () => {
    // a 30-question round at age 9: 3× the 10-question limits
    expect(starLimits(30, 9)).toEqual({ three: 3, two: 9 });
    // shorter rounds keep the 10-question limits
    expect(starLimits(6, 9)).toEqual(starLimits(10, 9));
    // younger → more room, older → less
    expect(starLimits(10, 6).three).toBeGreaterThan(starLimits(10, 8).three);
    expect(starLimits(10, 8).three).toBeGreaterThan(starLimits(10, 10).three);
    expect(starLimits(10, 12).two).toBeLessThan(starLimits(10, 10).two);
    expect(starsForMistakes(3, 24, 7)).toBe(3);
    expect(starsForMistakes(3, 10, 11)).toBe(1);
  });

  it('combo grows on clean answers and resets on a mistake', () => {
    let t = newTally();
    t = tallyQuestionDone(t).tally;
    const second = tallyQuestionDone(t);
    expect(second.tally.combo).toBe(2);
    expect(second.points).toBe(POINTS_FIRST_TRY + 10);
    t = tallyWrong(second.tally);
    expect(t.combo).toBe(0);
    const after = tallyQuestionDone(t);
    expect(after.tally.combo).toBe(1);
    expect(after.points).toBe(POINTS_AFTER_MISTAKE);
    expect(after.tally.done).toBe(3);
  });

  it('caps mistakes per question', () => {
    let t = newTally();
    for (let i = 0; i < 5; i++) t = tallyWrong(t);
    expect(t.mistakes).toBe(MISTAKE_CAP_PER_QUESTION);
    t = tallyQuestionDone(t).tally;
    t = tallyWrong(t);
    expect(t.mistakes).toBe(MISTAKE_CAP_PER_QUESTION + 1);
  });
});
