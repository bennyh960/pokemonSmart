import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../../auth/supabase-client.js', () => ({ supabase: {} }));
vi.mock('../../../../services/pokemon-data.js', async (orig) =>
  (await import('../../../english/__tests__/moves-mock.js')).withMoves(orig),
);

import { createRng } from '../../../english/random.js';
import { getWord } from '../../../english/words.js';
import def from '../index.js';
import { findPool, generateFind, TRAITS } from '../find.js';

const POKEMON = findPool();

describe('Find the Pokémon', () => {
  it('every trait clue is a word in the bank', () => {
    for (const t of TRAITS) expect(getWord(t.wordId), t.wordId).toBeDefined();
  });

  it('every level makes full rounds where exactly one option fits all clues', () => {
    for (const lvl of def.levels) {
      for (let seed = 1; seed <= 20; seed++) {
        const qs = generateFind(lvl.config, createRng(seed), POKEMON, {}, '2026-01-01');
        expect(qs, `L${lvl.number} seed ${seed}`).toHaveLength(lvl.config.questions);
        for (const q of qs) {
          expect(q.clues).toHaveLength(lvl.config.clues.length);
          expect(q.options).toHaveLength(lvl.config.options);
          const fitting = q.options.filter((p) => q.clues.every((c) => c.test(p)));
          expect(fitting).toEqual([q.options[q.answer]]);
          for (const c of q.clues) expect(c.word.tier).toBeLessThanOrEqual(lvl.config.maxTier);
        }
      }
    }
  });
});
