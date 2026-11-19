/**
 * Shared battle XP — EXP for Pokémon that helped but did not land the final blow.
 *
 * Two sources, both paid each time an enemy Pokémon is defeated:
 *  1. Participation — a party member that fought this enemy for ≥1 turn, was switched
 *     out and is still standing gets a share scaled by the turns it fought.
 *  2. Watching — a party member holding an Exp Share that sat on the bench gets a flat
 *     share. Only Pokémon that can still evolve may watch, and watching XP stops at a
 *     level cap below the weakest Pokémon in the fight, so it can't power-level a
 *     Pokémon past the battles it is watching.
 *
 * A Pokémon that both fought and holds an Exp Share gets the larger of the two shares.
 * Pure logic — the battle scene decides when to pay out and shows the messages.
 */

import { getRegularNextEvolution } from '../services/pokemon-data.js';
import type { Pokemon } from '../types/index.js';
import { getXpToNextLevel } from './encounter.js';

export const EXP_SHARE_ITEM_ID = 'exp-share';

export const SHARED_XP_CONFIG = {
  /** Participation share earned per turn fought, as a fraction of the winner's XP. */
  participationPerTurn: 0.1,
  participationMin: 0.2,
  participationMax: 0.5,
  /** Watcher (Exp Share holder) share, as a fraction of the winner's XP. */
  watcherShare: 0.3,
  /** Watching stops once the watcher reaches (weakest Pokémon in the fight) − this many levels. */
  watcherLevelGap: 10,
} as const;

export type SharedXpReason = 'participant' | 'watcher';

export interface SharedXpAward {
  partyIndex: number;
  xp: number;
  reason: SharedXpReason;
}

export interface SharedXpInput {
  party: readonly Pokemon[];
  /** Party slot that defeated the enemy — it already gets the full XP. */
  activePartyIndex: number;
  /** Full XP the winner earned for this enemy. */
  winnerXp: number;
  /** Turns each party slot fought against this enemy. */
  turnsVsEnemy: ReadonlyMap<number, number>;
  enemyLevel: number;
}

/** Fraction of the winner's XP a switched-out participant earns for `turns` turns of fighting. */
export function getParticipationShare(turns: number): number {
  if (turns <= 0) return 0;
  const { participationPerTurn, participationMin, participationMax } = SHARED_XP_CONFIG;
  return Math.min(participationMax, Math.max(participationMin, participationPerTurn * turns));
}

/** Can this Pokémon still evolve? Only those may watch with an Exp Share. */
export function canStillEvolve(pokemon: Pokemon): boolean {
  return getRegularNextEvolution(pokemon.id).length > 0;
}

/** Highest level a watcher may reach in a fight whose weakest Pokémon is `weakestLevel`. */
export function getWatcherLevelCap(weakestLevel: number): number {
  return weakestLevel - SHARED_XP_CONFIG.watcherLevelGap;
}

/** XP needed to go from the Pokémon's current XP to exactly `targetLevel` (0 if already there). */
export function getXpToReachLevel(pokemon: Pokemon, targetLevel: number): number {
  if (pokemon.level >= targetLevel) return 0;
  let total = Math.max(0, pokemon.xpToNext - pokemon.xp);
  for (let level = pokemon.level + 1; level < targetLevel; level++) total += getXpToNextLevel(level);
  return total;
}

/** XP a benched Exp Share holder earns, clipped so it never passes the watcher level cap. */
export function getWatcherXp(watcher: Pokemon, winnerXp: number, weakestLevel: number): number {
  if (watcher.heldItemId !== EXP_SHARE_ITEM_ID || watcher.hp <= 0 || !canStillEvolve(watcher)) return 0;
  const room = getXpToReachLevel(watcher, getWatcherLevelCap(weakestLevel));
  return Math.min(room, Math.max(1, Math.floor(winnerXp * SHARED_XP_CONFIG.watcherShare)));
}

/** Shared XP for every benched party member after an enemy is defeated, in party order. */
export function computeSharedXpAwards(input: SharedXpInput): SharedXpAward[] {
  const { party, activePartyIndex, winnerXp, turnsVsEnemy, enemyLevel } = input;
  if (winnerXp <= 0) return [];

  // Weakest Pokémon in this fight: the enemy or anyone on our side who fought it.
  let weakestLevel = enemyLevel;
  for (const [index, turns] of turnsVsEnemy) {
    const fighter = party[index];
    if (fighter && (turns > 0 || index === activePartyIndex)) weakestLevel = Math.min(weakestLevel, fighter.level);
  }

  const awards: SharedXpAward[] = [];
  party.forEach((pokemon, partyIndex) => {
    if (partyIndex === activePartyIndex || pokemon.hp <= 0) return;
    const participantXp = Math.floor(winnerXp * getParticipationShare(turnsVsEnemy.get(partyIndex) ?? 0));
    const watcherXp = getWatcherXp(pokemon, winnerXp, weakestLevel);
    if (participantXp <= 0 && watcherXp <= 0) return;
    awards.push(
      participantXp >= watcherXp
        ? { partyIndex, xp: participantXp, reason: 'participant' }
        : { partyIndex, xp: watcherXp, reason: 'watcher' },
    );
  });
  return awards;
}
