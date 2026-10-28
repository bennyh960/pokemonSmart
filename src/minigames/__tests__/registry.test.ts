import { describe, expect, it, vi } from 'vitest';

// game-state touches `window` in dev mode and save.ts creates a Supabase client — stub both for node
vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../auth/supabase-client.js', () => ({ supabase: {} }));

import { MINI_GAME_LIST, getMiniGame } from '../registry.js';
import { MINI_GAME_IDS, type DialogueReward, type MiniGamePrizeDef } from '../types.js';
import { getItem } from '../../data/items.js';
import { getPokemon } from '../../services/pokemon-data.js';

function rewardsOf(def: MiniGamePrizeDef): DialogueReward[] {
  return 'oneOf' in def ? def.oneOf : [def.reward];
}

describe('mini-game registry', () => {
  it('registers every id once, in order', () => {
    expect(MINI_GAME_LIST.map((g) => g.id)).toEqual([...MINI_GAME_IDS]);
    for (const id of MINI_GAME_IDS) expect(getMiniGame(id).id).toBe(id);
  });

  it.each(MINI_GAME_IDS)('%s: levels are numbered 1..N and bilingual', (id) => {
    const def = getMiniGame(id);
    expect(def.levels.length).toBeGreaterThan(0);
    def.levels.forEach((lvl, i) => {
      expect(lvl.number).toBe(i + 1);
      expect(lvl.name.en).toBeTruthy();
      expect(lvl.name.he).toBeTruthy();
    });
    expect(def.name.he).toBeTruthy();
    expect(def.tagline.he).toBeTruthy();
    expect(getPokemon(def.mascotPokemonId)).toBeDefined();
  });

  it.each(MINI_GAME_IDS)('%s: every prize is a real, non-empty reward', (id) => {
    for (const lvl of getMiniGame(id).levels) {
      for (const prize of Object.values(lvl.rewards)) {
        const rewards = rewardsOf(prize);
        expect(rewards.length).toBeGreaterThan(0);
        for (const r of rewards) {
          expect(r.items?.length || r.money || r.pokemon, `${id} L${lvl.number} has an empty reward`).toBeTruthy();
          for (const ri of r.items ?? []) {
            expect(getItem(ri.itemId), `${id} L${lvl.number}: unknown item "${ri.itemId}"`).toBeDefined();
            expect(ri.quantity).toBeGreaterThan(0);
          }
          if (r.pokemon) expect(getPokemon(r.pokemon.id)).toBeDefined();
        }
      }
    }
  });
});
