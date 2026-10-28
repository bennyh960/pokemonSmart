import { describe, expect, it } from 'vitest';
import {
  KNOWN_BOX,
  knownCount,
  markShown,
  MAX_NEW_PER_ROUND,
  strongCount,
  pickWords,
  readWordStats,
  recordAnswers,
  wordOfTheDay,
  wordWeight,
} from '../learning.js';
import { createRng } from '../random.js';
import type { Word } from '../words.js';

const word = (id: string, tier: 1 | 2 | 3 = 1): Word => ({
  id,
  en: id,
  he: 'מילה',
  say: 'וֶרְד',
  theme: 'actions',
  tier,
  picture: { kind: 'emoji', emoji: id },
});

describe('word learning', () => {
  it('a right answer moves a word up once per day; a wrong one drops it to box 0', () => {
    let s = recordAnswers({}, [{ wordId: 'jump', right: true }], 'd1');
    expect(s.jump).toMatchObject({ box: 1, seen: 1, right: 1 });
    s = recordAnswers(s, [{ wordId: 'jump', right: true }], 'd1');
    expect(s.jump.box).toBe(1); // same day — no climb
    s = recordAnswers(s, [{ wordId: 'jump', right: true }], 'd2');
    expect(s.jump.box).toBe(2);
    s = recordAnswers(s, [{ wordId: 'jump', right: false }], 'd2');
    expect(s.jump.box).toBe(0);
  });

  it('a word becomes known on box KNOWN_BOX and stays known after a miss', () => {
    let s = {};
    for (let d = 1; d <= KNOWN_BOX; d++) s = recordAnswers(s, [{ wordId: 'swim', right: true }], `d${d}`);
    expect(knownCount(s)).toBe(1);
    s = recordAnswers(s, [{ wordId: 'swim', right: false }], 'd9');
    expect(knownCount(s)).toBe(1);
  });

  it('only the first answer of a word in a round counts', () => {
    const s = recordAnswers(
      {},
      [
        { wordId: 'run', right: false },
        { wordId: 'run', right: true },
      ],
      'd1',
    );
    expect(s.run).toMatchObject({ box: 0, seen: 1, right: 0 });
  });

  it('missed words weigh more than new ones, known ones the least', () => {
    const missed = wordWeight({ box: 0, seen: 2, right: 0 }, 'd2');
    const fresh = wordWeight(undefined, 'd2');
    const known = wordWeight({ box: KNOWN_BOX, seen: 5, right: 5, known: true, day: 'd1' }, 'd2');
    expect(missed).toBeGreaterThan(fresh);
    expect(fresh).toBeGreaterThan(known);
  });

  it('picks distinct words and tolerates bad saved data', () => {
    const pool = ['a', 'b', 'c', 'd', 'e'].map((x) => word(x));
    const picked = pickWords(createRng(7), pool, {}, 4, 'd1');
    expect(new Set(picked.map((w) => w.id)).size).toBe(4);
    expect(pickWords(createRng(7), pool, {}, 9, 'd1')).toHaveLength(5);
    expect(readWordStats({ x: 'oops', y: { box: 99 } })).toEqual({ y: { box: KNOWN_BOX, seen: 0, right: 0 } });
    expect(readWordStats(null)).toEqual({});
  });

  it('a round brings at most MAX_NEW_PER_ROUND new words, unless it needs more to be full', () => {
    const pool = 'abcdefghij'.split('').map((x) => word(x));
    const met = {
      a: { box: 1, seen: 1, right: 1 },
      b: { box: 1, seen: 1, right: 1 },
      c: { box: 0, seen: 1, right: 0 },
    };
    const picked = pickWords(createRng(3), pool, met, 6, 'd1');
    expect(picked).toHaveLength(6);
    expect(picked.filter((w) => !(w.id in met)).length).toBeLessThanOrEqual(Math.max(MAX_NEW_PER_ROUND, 6 - 3));
    expect(pickWords(createRng(3), pool, met, 5, 'd1', 2).filter((w) => !(w.id in met))).toHaveLength(2);
    expect(pickWords(createRng(3), pool, {}, 8, 'd1')).toHaveLength(8); // all new: still a full round
  });

  it('shown words get a record; strong words have 2+ first-try rights', () => {
    const s = markShown({ a: { box: 2, seen: 4, right: 3 } }, ['a', 'b'], 'd1');
    expect(s.a.box).toBe(2);
    expect(s.b).toMatchObject({ box: 0, seen: 0, right: 0 });
    expect(strongCount(s)).toBe(1);
    expect(strongCount(s, ['b'])).toBe(0);
  });

  it('word of the day is stable for a date and only tier 1–2', () => {
    const pool = [word('a', 1), word('b', 2), word('c', 3)];
    expect(wordOfTheDay(pool, '2026-10-28').id).toBe(wordOfTheDay(pool, '2026-10-28').id);
    for (let d = 1; d <= 28; d++) expect(wordOfTheDay(pool, `2026-02-${d}`).tier).toBeLessThanOrEqual(2);
  });
});
