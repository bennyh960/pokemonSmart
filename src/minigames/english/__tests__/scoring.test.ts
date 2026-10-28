import { describe, expect, it } from 'vitest';
import {
  MISTAKE_CAP_PER_QUESTION,
  POINTS_AFTER_MISTAKE,
  POINTS_FIRST_TRY,
  newTally,
  starsForMistakes,
  tallyQuestionDone,
  tallyWrong,
} from '../scoring.js';

describe('English round scoring', () => {
  it('stars by mistakes', () => {
    expect([0, 1, 2, 3, 4, 9].map(starsForMistakes)).toEqual([3, 3, 2, 2, 1, 1]);
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
