import { describe, it, expect } from 'vitest';
import { buildClockQuestion, formatClock, parseClock, sameClock } from '../clock-question.js';

const at = (h: number, m: number) => new Date(2026, 9, 28, h, m, 30);
const MIN = 60_000;

describe('buildClockQuestion', () => {
  it('adds the minutes left to the time now', () => {
    const q = buildClockQuestion(at(20, 5), 20 * MIN + 10_000, 'grade4');
    expect(q.minutesLeft).toBe(20);
    expect(formatClock(q.answer)).toBe('20:25');
    expect(q.choices).toBeNull();
  });

  it('wraps past midnight', () => {
    const q = buildClockQuestion(at(23, 50), 30 * MIN, 'grade5');
    expect(formatClock(q.answer)).toBe('00:20');
  });

  it('young grades get 4 distinct choices with minutes in steps of 5', () => {
    for (let i = 0; i < 50; i++) {
      const q = buildClockQuestion(at(9, 58), 23 * MIN, 'grade1');
      expect(q.minutesLeft).toBe(20);
      expect(q.choices).toHaveLength(4);
      expect(q.choices!.filter((c) => sameClock(c, q.answer))).toHaveLength(1);
      const keys = new Set(q.choices!.map(formatClock));
      expect(keys.size).toBe(4);
    }
  });

  it('never asks about 0 minutes', () => {
    expect(buildClockQuestion(at(10, 0), 20_000, 'grade2').minutesLeft).toBe(1);
    expect(buildClockQuestion(at(10, 0), 3 * MIN, 'grade2').minutesLeft).toBe(3);
  });
});

describe('parseClock', () => {
  it.each([
    ['20:25', '20:25'],
    ['20.25', '20:25'],
    ['20 25', '20:25'],
    ['2025', '20:25'],
    ['8:05', '08:05'],
    [' 0:20 ', '00:20'],
  ])('%s → %s', (raw, want) => {
    expect(formatClock(parseClock(raw)!)).toBe(want);
  });

  it.each(['', 'abc', '24:00', '12:60', '5', '12:5'])('rejects %s', (raw) => {
    expect(parseClock(raw)).toBeNull();
  });
});
