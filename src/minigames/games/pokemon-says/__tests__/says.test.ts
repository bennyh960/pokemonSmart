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
import { generateSays, SAYS_THEMES } from '../says.js';

describe('Pokémon Says', () => {
  it('every level makes full rounds: distinct options, the answer among them, words in tier', () => {
    for (const lvl of def.levels) {
      for (let seed = 1; seed <= 10; seed++) {
        const qs = generateSays(lvl.config, createRng(seed), {}, 'd1', [25, 4]);
        expect(qs).toHaveLength(lvl.config.questions);
        expect(new Set(qs.map((q) => q.word.id)).size).toBe(qs.length);
        for (const q of qs) {
          expect(q.options).toHaveLength(lvl.config.choices);
          expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
          expect(q.options[q.answer]).toBe(q.word);
          expect([25, 4]).toContain(q.pokemonId);
          for (const o of q.options) {
            expect(o.tier).toBeLessThanOrEqual(lvl.config.maxTier);
            expect(SAYS_THEMES).toContain(o.theme);
          }
        }
      }
    }
  });
});
