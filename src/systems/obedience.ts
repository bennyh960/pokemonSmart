/**
 * Obedience — a Pokémon far stronger than the rest of the player's team may ignore orders.
 *
 * - Pokémon at or below the rank's `obeyLevel` perk always obey.
 * - Above it, compare with the strongest OTHER Pokémon the player owns (party + boxes):
 *   gap = (level − otherBest) / otherBest, chance to disobey = min(1, gap / fullDisobeyGap).
 * - Owning `trustedCount` Pokémon at `trustedLevel`+ (ever — flag) ends disobedience for good.
 *
 * Tuning lives in `OBEDIENCE` and the rank perks (`src/data/trainer-ranks.ts`).
 */

import { OBEDIENCE, TRAINER_RANKS, type RankConfig } from '../data/trainer-ranks.js';
import type { PlayerData, Pokemon } from '../types/index.js';
import { setFlag } from './game-state.js';
import { getPerkValue } from './trainer-rank.js';

export const OBEDIENCE_EARNED_FLAG = 'obedience-earned';

function ownedLevels(pd: PlayerData, excludeUuid?: string): number[] {
  const levels: number[] = [];
  const add = (p: Pokemon | null) => {
    if (p && p.uuid !== excludeUuid) levels.push(p.level);
  };
  pd.party.forEach(add);
  for (const box of pd.boxes) box.pokemon.forEach(add);
  return levels;
}

export interface ObedienceCheck {
  /** 0–1 chance the Pokémon ignores the order. */
  disobeyChance: number;
  /** Level another Pokémon must reach for this one to trust the player. */
  trustLevel: number;
  /** Lowest rank at which this Pokémon always obeys. */
  obeyRank: RankConfig | undefined;
}

export function checkObedience(pd: PlayerData, pokemon: Pokemon): ObedienceCheck {
  const none: ObedienceCheck = { disobeyChance: 0, trustLevel: 0, obeyRank: undefined };
  if (pd.flags[OBEDIENCE_EARNED_FLAG]) return none;

  if (ownedLevels(pd).filter((lv) => lv >= OBEDIENCE.trustedLevel).length >= OBEDIENCE.trustedCount) {
    setFlag(pd, OBEDIENCE_EARNED_FLAG);
    return none;
  }
  if (pokemon.level <= (getPerkValue(pd, 'obeyLevel') ?? Infinity)) return none;

  const otherBest = Math.max(1, ...ownedLevels(pd, pokemon.uuid));
  const gap = (pokemon.level - otherBest) / otherBest;
  if (gap <= 0) return none;

  return {
    disobeyChance: Math.min(1, gap / OBEDIENCE.fullDisobeyGap),
    trustLevel: Math.min(pokemon.level, OBEDIENCE.trustedLevel),
    obeyRank: TRAINER_RANKS.find((r) => (r.perks.obeyLevel ?? 0) >= pokemon.level),
  };
}

/** i18n keys for the disobey message — one is picked at random. */
export const DISOBEY_LINE_KEYS = ['battle.disobey.distrust', 'battle.disobey.confident', 'battle.disobey.ignore'];
