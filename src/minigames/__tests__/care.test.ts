import { beforeEach, describe, expect, it, vi } from 'vitest';

// game-state touches `window` in dev mode and save.ts creates a Supabase client — stub both for node
vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../auth/supabase-client.js', () => ({ supabase: {} }));

import {
  CARE_COOLDOWN_STEPS,
  carePrizes,
  evolutionLine,
  careLevelForRank,
  findCareGame,
  forceCareGame,
  resetCareCooldown,
  rollCareTrigger,
  type CareTile,
} from '../care.js';
import { MINI_GAME_LIST, getMiniGame } from '../registry.js';
import { getItem } from '../../data/items.js';
import { getPokemon } from '../../services/pokemon-data.js';
import type { PlayerData, Pokemon } from '../../types/index.js';
import { TRAINER_RANKS } from '../../data/trainer-ranks.js';

function mon(id: number, hp: number, maxHp = 100): Pokemon {
  const data = getPokemon(id)!;
  return { uuid: `u${id}-${hp}`, id, name: data.name.en, hp, maxHp, types: data.types } as unknown as Pokemon;
}

const GRASS: CareTile = { category: 'grass', encounterTypes: ['*/water'] };
const WATER: CareTile = { category: 'water', encounterTypes: ['water'] };
const always = () => 0;
const never = () => 0.999;

describe('care games', () => {
  beforeEach(() => resetCareCooldown());

  it('every care game has a real line, a habitat and real bonus items', () => {
    const cares = MINI_GAME_LIST.filter((d) => d.care);
    expect(cares.map((d) => d.id)).toEqual([
      'snorlax-snack',
      'bulbasaur-sun',
      'charmander-flame',
      'squirtle-swim',
      'pikachu-charge',
    ]);
    for (const def of cares) {
      expect(getPokemon(def.care!.lineOf)).toBeDefined();
      expect(def.care!.habitat.length).toBeGreaterThan(0);
      const bonus = def.care!.bonus.prize;
      const rewards = 'oneOf' in bonus ? bonus.oneOf : [bonus.reward];
      expect(rewards.length).toBeGreaterThan(0);
      for (const r of rewards) for (const ri of r.items ?? []) expect(getItem(ri.itemId)).toBeDefined();
    }
  });

  it('starter lines come from the evolution data', () => {
    expect(evolutionLine(1)).toEqual([1, 2, 3]);
    expect(evolutionLine(8)).toEqual([7, 8, 9]);
    expect(evolutionLine(143)).toEqual([143]);
  });

  it('Snorlax under half HP on grass gets the snack game; healthy or fainted does not', () => {
    expect(findCareGame([mon(143, 40)], GRASS)?.def.id).toBe('snorlax-snack');
    expect(findCareGame([mon(143, 50)], GRASS)).toBeNull();
    expect(findCareGame([mon(143, 0)], GRASS)).toBeNull();
    expect(findCareGame([mon(143, 40)], WATER)).toBeNull();
  });

  it('evolved starters match their line; Squirtle line only on water', () => {
    expect(findCareGame([mon(9, 10)], WATER)?.def.id).toBe('squirtle-swim');
    expect(findCareGame([mon(9, 10)], GRASS)).toBeNull();
    expect(findCareGame([mon(2, 10)], GRASS)?.def.id).toBe('bulbasaur-sun');
    expect(findCareGame([mon(6, 10)], { category: 'mountain', encounterTypes: ['*/water'] })?.def.id).toBe(
      'charmander-flame',
    );
  });

  it("respects the tile's encounter filter (no fire on a tile that excludes fire)", () => {
    expect(findCareGame([mon(5, 10)], { category: 'ground', encounterTypes: ['*/fire,ice'] })).toBeNull();
    expect(findCareGame([mon(5, 10)], { category: 'ground', encounterTypes: null })).toBeNull();
  });

  it('rolls with a chance and a step cooldown', () => {
    const pd = { party: [mon(143, 10)], totalSteps: 500 } as unknown as PlayerData;
    expect(rollCareTrigger(pd, GRASS, never)).toBeNull();
    expect(rollCareTrigger(pd, GRASS, always)?.pokemon.id).toBe(143);
    pd.totalSteps += CARE_COOLDOWN_STEPS - 1;
    expect(rollCareTrigger(pd, GRASS, always)).toBeNull();
    pd.totalSteps += 1;
    expect(rollCareTrigger(pd, GRASS, always)).not.toBeNull();
  });

  it('the trainer rank sets the level: lowest rank → level 1, highest → level 5', () => {
    const def = getMiniGame('snorlax-snack');
    const top = TRAINER_RANKS.length - 1;
    expect(careLevelForRank(0, def)).toBe(1);
    expect(careLevelForRank(top, def)).toBe(5);
    const levels = TRAINER_RANKS.map((_, i) => careLevelForRank(i, def));
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    expect(new Set(levels).size).toBe(5);
  });

  it('admin force ignores HP and tile, but needs a Pokémon with a care game', () => {
    expect(forceCareGame([mon(150, 100), mon(9, 100)])?.def.id).toBe('squirtle-swim');
    expect(forceCareGame([mon(150, 100)])).toBeNull();
  });

  it('a clear heals (Snorlax falls asleep); the bonus is rare and scales with stars', () => {
    const snorlax = getMiniGame('snorlax-snack').care!;
    expect(carePrizes(snorlax, { uuid: 'x' }, 0, always)).toEqual([]);
    const [heal] = carePrizes(snorlax, { uuid: 'x' }, 1, never);
    expect(heal.reward.restorePokemon).toEqual({ uuid: 'x', status: 'sleep' });
    expect(carePrizes(snorlax, { uuid: 'x' }, 3, never)).toHaveLength(1);
    const lucky = carePrizes(snorlax, { uuid: 'x' }, 3, () => 0.05);
    expect(lucky).toHaveLength(2);
    expect(getItem(lucky[1].reward.items![0].itemId)?.effect.type).toBe('vitamin');
    expect(lucky[1].reward.items![0].quantity).toBeLessThanOrEqual(3);
    // 3% per star: a 0.05 roll misses at 1★
    expect(carePrizes(snorlax, { uuid: 'x' }, 1, () => 0.05)).toHaveLength(1);

    const squirtle = getMiniGame('squirtle-swim').care!;
    expect(squirtle.statusAfter).toBeNull();
  });
});
