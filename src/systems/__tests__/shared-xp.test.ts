import { describe, expect, it } from 'vitest';
import { getItem } from '../../data/items.js';
import { getPokemon } from '../../services/pokemon-data.js';
import type { Pokemon } from '../../types/index.js';
import { checkAndApplyLevelUp, createPokemonFromData } from '../encounter.js';
import {
  EXP_SHARE_ITEM_ID,
  SHARED_XP_CONFIG,
  canStillEvolve,
  computeSharedXpAwards,
  getParticipationShare,
  getWatchers,
  getWatcherXp,
  getXpToReachLevel,
} from '../shared-xp.js';

function mon(id: number, level: number, heldItemId: string | null = null): Pokemon {
  const pokemon = createPokemonFromData(getPokemon(id)!, level);
  pokemon.heldItemId = heldItemId;
  return pokemon;
}

const MAGIKARP = 129;
const GYARADOS = 130;
const CHARMANDER = 4;
const PIDGEY = 16;

describe('participation share', () => {
  it('scales with turns between the min and max', () => {
    expect(getParticipationShare(0)).toBe(0);
    expect(getParticipationShare(1)).toBe(SHARED_XP_CONFIG.participationMin);
    expect(getParticipationShare(3)).toBeCloseTo(0.3);
    expect(getParticipationShare(50)).toBe(SHARED_XP_CONFIG.participationMax);
  });
});

describe('watcher (Exp Share)', () => {
  it('is an equippable held item', () => {
    expect(getItem(EXP_SHARE_ITEM_ID)?.category).toBe('held');
  });

  it('only lets Pokémon that can still evolve watch', () => {
    expect(canStillEvolve(mon(MAGIKARP, 5))).toBe(true);
    expect(canStillEvolve(mon(GYARADOS, 20))).toBe(false);
    expect(getWatcherXp(mon(GYARADOS, 5, EXP_SHARE_ITEM_ID), 1000, 40)).toBe(0);
  });

  it('needs the Exp Share and must not be fainted', () => {
    expect(getWatcherXp(mon(MAGIKARP, 5), 1000, 40)).toBe(0);
    const fainted = mon(MAGIKARP, 5, EXP_SHARE_ITEM_ID);
    fainted.hp = 0;
    expect(getWatcherXp(fainted, 1000, 40)).toBe(0);
  });

  it('gets the watcher share when far below the cap', () => {
    expect(getWatcherXp(mon(MAGIKARP, 5, EXP_SHARE_ITEM_ID), 100, 40)).toBe(30);
  });

  it('never passes the level cap, however much XP is on offer', () => {
    const karp = mon(MAGIKARP, 5, EXP_SHARE_ITEM_ID);
    const cap = 25 - SHARED_XP_CONFIG.watcherLevelGap; // weakest fighter L25 → cap L15
    const xp = getWatcherXp(karp, 1_000_000, 25);
    expect(xp).toBe(getXpToReachLevel(karp, cap));
    karp.xp += xp;
    while (checkAndApplyLevelUp(karp).leveledUp);
    expect(karp.level).toBe(cap);
    expect(getWatcherXp(karp, 1_000_000, 25)).toBe(0);
  });
});

describe('computeSharedXpAwards', () => {
  it('pays switched-out fighters and the watcher, never the winner or the fainted', () => {
    const winner = mon(CHARMANDER, 30);
    const switchedOut = mon(PIDGEY, 28);
    const fainted = mon(PIDGEY, 28);
    fainted.hp = 0;
    const watcher = mon(MAGIKARP, 5, EXP_SHARE_ITEM_ID);
    const bystander = mon(PIDGEY, 10);

    const awards = computeSharedXpAwards({
      party: [winner, switchedOut, fainted, watcher, bystander],
      activePartyIndex: 0,
      winnerXp: 100,
      turnsVsEnemy: new Map([
        [0, 2],
        [1, 3],
        [2, 4],
      ]),
      enemyLevel: 30,
    });

    expect(awards).toEqual([
      { partyIndex: 1, xp: 30, reason: 'participant' },
      { partyIndex: 3, xp: 30, reason: 'watcher' },
    ]);
  });

  it('caps the watcher by the weakest fighter on either side', () => {
    const watcher = mon(MAGIKARP, 14, EXP_SHARE_ITEM_ID);
    const awards = computeSharedXpAwards({
      party: [mon(CHARMANDER, 50), watcher],
      activePartyIndex: 0,
      winnerXp: 10_000,
      turnsVsEnemy: new Map([[0, 1]]),
      enemyLevel: 24, // cap = 14 → no room
    });
    expect(awards).toEqual([]);
  });
});

describe('getWatchers (battle badge)', () => {
  const fight = (party: Pokemon[], enemyLevel: number) => ({
    party,
    activePartyIndex: 0,
    turnsVsEnemy: new Map([[0, 1]]),
    enemyLevel,
  });

  it('lists benched Exp Share holders that can still evolve, not the active one', () => {
    const active = mon(CHARMANDER, 30, EXP_SHARE_ITEM_ID);
    const karp = mon(MAGIKARP, 5, EXP_SHARE_ITEM_ID);
    const gyarados = mon(GYARADOS, 5, EXP_SHARE_ITEM_ID);
    const plain = mon(PIDGEY, 5);
    expect(getWatchers(fight([active, karp, gyarados, plain], 30))).toEqual([{ partyIndex: 1, capped: false }]);
  });

  it('marks a watcher as capped when the fight is too weak for it', () => {
    const karp = mon(MAGIKARP, 15, EXP_SHARE_ITEM_ID);
    expect(getWatchers(fight([mon(CHARMANDER, 30), karp], 25))).toEqual([{ partyIndex: 1, capped: true }]);
    expect(getWatchers(fight([mon(CHARMANDER, 30), karp], 26))).toEqual([{ partyIndex: 1, capped: false }]);
  });
});
