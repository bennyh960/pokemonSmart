import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../../auth/supabase-client.js', () => ({ supabase: {} }));
vi.mock('../../../../services/pokemon-data.js', async (orig) =>
  (await import('../../../english/__tests__/moves-mock.js')).withMoves(orig),
);

import { getAllPokemon } from '../../../../services/pokemon-data.js';
import { createRng } from '../../../english/random.js';
import def from '../index.js';
import { generateColors, type ColorPokemon } from '../colors.js';

const POKEMON: ColorPokemon[] = getAllPokemon().flatMap((p) => (p.color ? [{ id: p.id, color: p.color }] : []));
const colorOf = new Map(POKEMON.map((p) => [p.id, p.color]));

describe('Pokémon Colours', () => {
  it('every level asks real Pokémon colours, the answer among distinct options', () => {
    for (const lvl of def.levels) {
      for (let seed = 1; seed <= 10; seed++) {
        const qs = generateColors(lvl.config, createRng(seed), POKEMON, {}, 'd1');
        expect(qs).toHaveLength(lvl.config.questions);
        expect(new Set(qs.map((q) => q.pokemonId)).size).toBe(qs.length);
        for (const q of qs) {
          expect(q.options).toHaveLength(lvl.config.choices);
          expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
          expect(q.options[q.answer].id).toBe(colorOf.get(q.pokemonId));
          for (const o of q.options) expect(lvl.config.colors).toContain(o.id);
        }
      }
    }
  });
});
