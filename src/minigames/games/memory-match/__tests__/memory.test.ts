import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../../auth/supabase-client.js', () => ({ supabase: {} }));
vi.mock('../../../../services/pokemon-data.js', async (orig) =>
  (await import('../../../english/__tests__/moves-mock.js')).withMoves(orig),
);

import { createRng } from '../../../english/random.js';
import def from '../index.js';
import { closeOpen, flip, generateMemory, isDone, memoryAnswers, memoryStars, NEW_MEMORY } from '../memory.js';

describe('Memory Match', () => {
  it('every level deals an English card + a Hebrew card per word, all of the level theme', () => {
    for (const lvl of def.levels) {
      const cards = generateMemory(lvl.config, createRng(5), {}, 'd1');
      expect(cards).toHaveLength(lvl.config.pairs * 2);
      for (const c of cards) expect(c.word.theme).toBe(lvl.config.theme);
      for (const id of new Set(cards.map((c) => c.word.id))) {
        const faces = cards.filter((c) => c.word.id === id).map((c) => c.face);
        expect(faces.sort()).toEqual(['en', 'he']);
      }
    }
  });

  it('matches stay up, wrong pairs count a mistake and turn back, words remember misses', () => {
    const cards = generateMemory({ theme: 'animals', pairs: 3, maxTier: 1 }, createRng(9), {}, 'd1');
    const pairOf = (i: number) => cards.findIndex((c, j) => j !== i && c.word.id === cards[i].word.id);
    const otherThan = (i: number) => cards.findIndex((c) => c.word.id !== cards[i].word.id);

    // A wrong pair first
    let s = flip(cards, NEW_MEMORY, 0).state;
    const wrong = flip(cards, s, otherThan(0));
    expect(wrong.result).toBe('mismatch');
    expect(flip(cards, wrong.state, pairOf(0)).result).toBe('ignored'); // two cards already open
    s = closeOpen(wrong.state);
    expect(s.mistakes).toBe(1);

    // Then match everything
    for (let i = 0; i < cards.length; i++) {
      if (s.matched.includes(i)) continue;
      s = flip(cards, s, i).state;
      const r = flip(cards, s, pairOf(i));
      expect(r.result).toBe('match');
      s = r.state;
    }
    expect(isDone(cards, s)).toBe(true);
    const answers = memoryAnswers(cards, s);
    expect(answers).toHaveLength(3);
    expect(
      answers
        .filter((a) => !a.right)
        .map((a) => a.wordId)
        .sort(),
    ).toEqual([cards[0].word.id, cards[otherThan(0)].word.id].sort());
  });

  it('stars: ≤ half the pairs in mistakes is 3★, ≤ pairs is 2★', () => {
    expect(memoryStars(2, 4)).toBe(3);
    expect(memoryStars(3, 4)).toBe(2);
    expect(memoryStars(5, 4)).toBe(1);
  });
});
