/**
 * Care rounds — a hurt party Pokémon asks to play its game while the player walks in the wild.
 *
 *   trigger: a party Pokémon under CARE_HP_RATIO of its HP (not fainted), whose evolution line has a game with
 *            `care`, standing on a tile of that game's habitat whose encounter filter allows the Pokémon's
 *            types. CARE_STEP_CHANCE per step, at most once every CARE_COOLDOWN_STEPS steps.
 *   level:   set by the trainer rank (the one on the trainer details screen): Rookie → level 1 … Legendary → last level.
 *   prizes:  clearing the round restores the Pokémon (+ a rare bonus). No level prizes.
 *
 * Pure logic (no React, no audio, no saving) except the cooldown, which lives in memory only.
 */

import { TRAINER_RANKS } from '../data/trainer-ranks.js';
import { getEvolutionChain } from '../services/pokemon-data.js';
import { tileAllowsTypes } from '../systems/encounter.js';
import type { PlayerData, Pokemon } from '../types/index.js';
import { resolvePrize, type AwardedPrize } from './progress.js';
import { MINI_GAME_LIST } from './registry.js';
import type { AnyMiniGameDef, MiniGameCare, Stars } from './types.js';

export const CARE_HP_RATIO = 0.5;
export const CARE_STEP_CHANCE = 0.05;
export const CARE_COOLDOWN_STEPS = 100;

/** The tile the player just stepped on. */
export interface CareTile {
  category: string | undefined;
  /** The tile's encounter filter (null = not an encounter tile). */
  encounterTypes: string[] | null;
}

export interface CareMatch {
  def: AnyMiniGameDef & { care: MiniGameCare };
  pokemon: Pokemon;
}

/** Every species id in the evolution line of `pokemonId` (just itself when it has none). */
export function evolutionLine(pokemonId: number): number[] {
  return getEvolutionChain(pokemonId)?.stages.map((s) => s.id) ?? [pokemonId];
}

export function needsCare(p: Pokemon): boolean {
  return p.hp > 0 && p.hp < p.maxHp * CARE_HP_RATIO;
}

function hasCare(def: AnyMiniGameDef): def is CareMatch['def'] {
  return !!def.care;
}

function careGameOf(pokemon: Pokemon, games: readonly CareMatch['def'][]): CareMatch['def'] | undefined {
  return games.find((d) => evolutionLine(d.care.lineOf).includes(pokemon.id));
}

/** The first hurt party Pokémon whose care game can start on this tile. */
export function findCareGame(
  party: readonly Pokemon[],
  tile: CareTile,
  games: readonly AnyMiniGameDef[] = MINI_GAME_LIST,
): CareMatch | null {
  if (!tile.encounterTypes || !tile.category) return null;
  const careGames = games.filter(hasCare).filter((d) => d.care.habitat.includes(tile.category!));
  for (const pokemon of party) {
    if (!needsCare(pokemon) || !tileAllowsTypes(tile.encounterTypes, pokemon.types)) continue;
    const def = careGameOf(pokemon, careGames);
    if (def) return { def, pokemon };
  }
  return null;
}

/** Admin: the first party Pokémon that has a care game, ignoring HP, tile, chance and cooldown. */
export function forceCareGame(
  party: readonly Pokemon[],
  games: readonly AnyMiniGameDef[] = MINI_GAME_LIST,
): CareMatch | null {
  const careGames = games.filter(hasCare);
  for (const pokemon of party) {
    const def = careGameOf(pokemon, careGames);
    if (def) return { def, pokemon };
  }
  return null;
}

let lastCareStep = -Infinity;

/** Test hook: forget the last trigger. */
export function resetCareCooldown(): void {
  lastCareStep = -Infinity;
}

/** Called once per step on an encounter tile. Returns the care round to offer, or null. */
export function rollCareTrigger(pd: PlayerData, tile: CareTile, rng: () => number = Math.random): CareMatch | null {
  if (pd.totalSteps - lastCareStep < CARE_COOLDOWN_STEPS) return null;
  const match = findCareGame(pd.party, tile);
  if (!match || rng() >= CARE_STEP_CHANCE) return null;
  lastCareStep = pd.totalSteps;
  return match;
}

/**
 * Level of a care round from the trainer rank index (`getTrainerRank(pd).index`), spread evenly over the
 * game's levels: lowest rank → first level, highest rank → last level. Ignores level unlocks.
 */
export function careLevelForRank(rankIndex: number, def: AnyMiniGameDef): number {
  const steps = Math.max(1, TRAINER_RANKS.length - 1);
  const i = Math.round((Math.max(0, Math.min(steps, rankIndex)) * (def.levels.length - 1)) / steps);
  return def.levels[i]?.number ?? 1;
}

/** Prizes of a finished care round: the heal, and sometimes the bonus. Nothing when not cleared. */
export function carePrizes(
  care: MiniGameCare,
  pokemon: Pick<Pokemon, 'uuid'>,
  stars: Stars,
  rng: () => number = Math.random,
): AwardedPrize[] {
  if (stars < 1) return [];
  const prizes: AwardedPrize[] = [
    {
      kind: 'care',
      rarity: 'good',
      reward: { restorePokemon: { uuid: pokemon.uuid, status: care.statusAfter } },
    },
  ];
  if (rng() < care.bonus.chancePerStar * stars) prizes.push({ kind: 'bonus', ...resolvePrize(care.bonus.prize, rng) });
  return prizes;
}
