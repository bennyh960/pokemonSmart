import { beforeEach, describe, expect, it, vi } from 'vitest';

// game-state touches `window` in dev mode and save.ts creates a Supabase client — stub both for node
vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../auth/supabase-client.js', () => ({ supabase: {} }));

import {
  CARE_COOLDOWN_STEPS,
  careChance,
  carePrizes,
  evolutionLine,
  findCareGame,
  forceCareGame,
  resetCareCooldown,
  rollCareTrigger,
  type CareTile,
} from '../care.js';
import { levelForRank, slotPrizes } from '../progress.js';
import { MINI_GAME_LIST, getMiniGame } from '../registry.js';
import { getPokemon } from '../../services/pokemon-data.js';
import type { PlayerData, Pokemon } from '../../types/index.js';
import type { MiniGamePrizeSlot, Stars } from '../types.js';
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

  it('every care game has a real line and a habitat', () => {
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
    }
  });

  it('starter lines come from the evolution data', () => {
    expect(evolutionLine(1)).toEqual([1, 2, 3]);
    expect(evolutionLine(8)).toEqual([7, 8, 9]);
    expect(evolutionLine(143)).toEqual([143]);
  });

  it('Snorlax at half HP or less on grass gets the snack game; healthy or fainted does not', () => {
    expect(findCareGame([mon(143, 40)], GRASS)?.def.id).toBe('snorlax-snack');
    expect(findCareGame([mon(143, 50)], GRASS)?.def.id).toBe('snorlax-snack');
    expect(findCareGame([mon(143, 51)], GRASS)).toBeNull();
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

  it('the lower the HP, the higher the chance: 10% / 20% / 50%', () => {
    expect(careChance(mon(143, 51))).toBe(0);
    expect(careChance(mon(143, 50))).toBe(0.1);
    expect(careChance(mon(143, 41))).toBe(0.1);
    expect(careChance(mon(143, 40))).toBe(0.2);
    expect(careChance(mon(143, 31))).toBe(0.2);
    expect(careChance(mon(143, 30))).toBe(0.5);
    expect(careChance(mon(143, 1))).toBe(0.5);
    expect(careChance(mon(143, 0))).toBe(0);
  });

  it('picks the most hurt Pokémon when several can ask', () => {
    expect(findCareGame([mon(143, 45), mon(1, 20)], GRASS)?.pokemon.id).toBe(1);
  });

  it('rolls 10% at 45% HP', () => {
    const pd = { party: [mon(143, 45)], totalSteps: 0 } as unknown as PlayerData;
    expect(rollCareTrigger(pd, GRASS, () => 0.11)).toBeNull();
    expect(rollCareTrigger(pd, GRASS, () => 0.09)).not.toBeNull();
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

  it('the trainer rank pre-selects the level: lowest rank → level 1, highest → level 10', () => {
    const def = getMiniGame('snorlax-snack');
    const top = TRAINER_RANKS.length - 1;
    expect(levelForRank(0, def)).toBe(1);
    expect(levelForRank(top, def)).toBe(10);
    const levels = TRAINER_RANKS.map((_, i) => levelForRank(i, def));
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeGreaterThanOrEqual(levels[i - 1]);
    expect(new Set(levels).size).toBe(Math.min(TRAINER_RANKS.length, def.levels.length));
  });

  it('admin force ignores HP and tile, but needs a Pokémon with a care game', () => {
    expect(forceCareGame([mon(150, 100), mon(9, 100)])?.def.id).toBe('squirtle-swim');
    expect(forceCareGame([mon(150, 100)])).toBeNull();
  });

  it('every win heals; ★★ adds the level ★★ prize, ★★★ its ★★★ prize — every time', () => {
    const def = getMiniGame('snorlax-snack');
    const snorlax = def.care!;
    const l1 = def.levels[0];
    const pay = (stars: Stars) => carePrizes(snorlax, l1, { uuid: 'x' }, stars, always);
    expect(pay(0)).toEqual([]);
    const [heal] = pay(1);
    expect(heal.reward.restorePokemon).toEqual({ uuid: 'x', status: 'sleep' });
    expect(pay(1)).toHaveLength(1); // no prize on 1★
    expect(pay(2)).toHaveLength(2);
    expect(pay(2)[1].reward.items![0].quantity).toBe(1);
    expect(pay(3)[1].reward.items![0].quantity).toBe(3); // level 1: ★★★ = the ★★ prizes ×3
  });

  it('the prize table: ★★ keeps every earlier level, ★★★ multiplies (level 3/4 skip the cheap ones)', () => {
    const levels = getMiniGame('snorlax-snack').levels;
    const ids = (slot: MiniGamePrizeSlot) =>
      slotPrizes(slot).flatMap((p) =>
        ('oneOf' in p ? p.oneOf : [p.reward]).flatMap((r) => r.items?.map((i) => i.itemId) ?? ['$']),
      );
    const qty = (slot: MiniGamePrizeSlot) =>
      new Set(
        slotPrizes(slot).flatMap((p) =>
          ('oneOf' in p ? p.oneOf : [p.reward]).map((r) => r.items?.[0].quantity ?? r.money),
        ),
      );
    expect(levels.every((l) => l.prizeStars === 2)).toBe(true);
    expect(ids(levels[0].rewards.firstClear)).toEqual(expect.arrayContaining(['poke-ball', 'potion', 'antidote']));
    expect(ids(levels[1].rewards.firstClear)).toEqual(
      expect.arrayContaining(['poke-ball', 'great-ball', 'super-potion']),
    );
    expect(ids(levels[2].rewards.threeStar)).not.toContain('poke-ball');
    expect(ids(levels[3].rewards.threeStar)).toEqual(expect.arrayContaining(['ultra-ball', 'max-potion']));
    expect(ids(levels[3].rewards.threeStar)).not.toContain('great-ball');
    expect(ids(levels[4].rewards.threeStar)).toContain('poke-ball');
    expect(qty(levels[4].rewards.threeStar)).toEqual(new Set([4, 40000]));
    expect(qty(levels[8].rewards.threeStar)).toContain(5);
    expect(ids(levels[8].rewards.firstClear)).toContain('leftovers');
    expect(ids(levels[9].rewards.firstClear)).toEqual(ids(levels[8].rewards.firstClear));
    expect(ids(levels[9].rewards.threeStar)).toEqual(
      expect.arrayContaining(['leftovers', 'master-ball', 'max-elixir', 'full-restore', '$']),
    );
    const vitamins = slotPrizes(levels[9].rewards.threeStar).find((p) => 'oneOf' in p && p.label?.en === 'Vitamin');
    expect(vitamins && 'oneOf' in vitamins && vitamins.oneOf[0].items![0].quantity).toBe(10);

    const squirtle = getMiniGame('squirtle-swim').care!;
    expect(squirtle.statusAfter).toBeNull();
  });
});
