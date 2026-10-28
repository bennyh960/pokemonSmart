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
import { DECOYS, generateBattle } from '../battle.js';

describe('Unown Battle', () => {
  it('every level makes full rounds of spellable words with the right tiles', () => {
    for (const lvl of def.levels) {
      for (let seed = 1; seed <= 10; seed++) {
        const words = generateBattle(lvl.config, createRng(seed), {}, 'd1');
        expect(words).toHaveLength(lvl.config.words);
        for (const b of words) {
          expect(b.letters.join('')).toBe(b.word.en.toUpperCase());
          expect(b.letters.length).toBeLessThanOrEqual(lvl.config.maxLength);
          expect(b.word.tier).toBeLessThanOrEqual(lvl.config.maxTier);
          if (lvl.config.input === 'keyboard') {
            expect(b.tiles).toBeUndefined();
            continue;
          }
          // The tiles hold exactly the word's letters (+ decoys that are not in the word)
          const extra = lvl.config.input === 'decoys' ? DECOYS : 0;
          expect(b.tiles).toHaveLength(b.letters.length + extra);
          expect([...b.tiles!].sort().filter((l) => b.letters.includes(l))).toEqual([...b.letters].sort());
        }
      }
    }
  });
});
