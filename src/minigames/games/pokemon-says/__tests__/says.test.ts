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
import { generateSays, repeatOrder, SAYS_THEMES } from '../says.js';

describe('Pokémon Says', () => {
  it('every level asks each round word `repeats` times, never twice in a row, with distinct options', () => {
    for (const lvl of def.levels) {
      const cfg = lvl.config;
      for (let seed = 1; seed <= 10; seed++) {
        const qs = generateSays(cfg, createRng(seed), {}, 'd1', [25, 4]);
        expect(qs).toHaveLength(cfg.words * cfg.repeats);
        const words = new Set(qs.map((q) => q.word.id));
        expect(words.size).toBe(cfg.words);
        for (const id of words) expect(qs.filter((q) => q.word.id === id)).toHaveLength(cfg.repeats);
        qs.forEach((q, i) => {
          if (i > 0) expect(q.word.id).not.toBe(qs[i - 1].word.id);
          expect(q.options).toHaveLength(cfg.choices);
          expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
          expect(q.options[q.answer]).toBe(q.word);
          expect([25, 4]).toContain(q.pokemonId);
          // wrong options are the round's own words while there are enough of them
          const fromRound = q.options.filter((o) => words.has(o.id)).length;
          expect(fromRound).toBe(Math.min(cfg.choices, cfg.words));
          for (const o of q.options) {
            expect(o.tier).toBeLessThanOrEqual(cfg.maxTier);
            expect(SAYS_THEMES).toContain(o.theme);
          }
        });
      }
    }
  });

  it('repeatOrder never puts the same item twice in a row', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const order = repeatOrder(createRng(seed), ['a', 'b', 'c'], 5);
      expect(order).toHaveLength(15);
      order.forEach((x, i) => i > 0 && expect(x).not.toBe(order[i - 1]));
    }
  });
});
