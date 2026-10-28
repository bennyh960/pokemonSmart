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
import { mergeSeen, readSeen } from '../seen.js';

describe('unown-words scoring', () => {
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

describe('unown-words seen data', () => {
  it('reads safely and merges without duplicates', () => {
    expect(readSeen(undefined)).toEqual({ letters: [], words: [] });
    expect(readSeen({ seen: { letters: ['a', 3], words: 'x' } })).toEqual({ letters: ['a'], words: [] });
    const merged = mergeSeen({ letters: ['b'], words: ['fire'] }, [{ letters: ['A', 'b'], words: ['Fire', 'water'] }]);
    expect(merged).toEqual({ letters: ['a', 'b'], words: ['fire', 'water'] });
  });
});
