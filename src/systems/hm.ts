/**
 * HM System — Overworld Hidden Machine move usage.
 *
 * Provides HM configuration and helpers for checking if a party Pokemon
 * can use a given HM in the overworld.
 */

import type { Pokemon } from '../types/index.js';
import { getPokemon } from '../services/pokemon-data.js';

/** Requirements a Pokemon must meet to use an HM in the overworld. */
export interface HMRequirement {
  moveId: number;
  minLevel: number;
  minWeight: number | null;  // hectograms, null = no restriction
  minHeight: number | null;  // decimeters, null = no restriction
}

/** HM configuration table. */
export const HM_CONFIG: Record<string, HMRequirement> = {
  cut:      { moveId: 15, minLevel: 20, minWeight: null, minHeight: null },
  strength: { moveId: 70, minLevel: 30, minWeight: null, minHeight: null },
  fly:      { moveId: 19, minLevel: 50, minWeight: 350, minHeight: 14 },
  surf:     { moveId: 57, minLevel: 60, minWeight: 200, minHeight: 8 },
};

/** Get the HM config for a given HM name (e.g. 'cut'). */
export function getHMConfig(hmName: string): HMRequirement | undefined {
  return HM_CONFIG[hmName];
}

/**
 * Find the first party Pokemon that can use the given HM.
 * A Pokemon can use the HM if it:
 *   - knows the required move
 *   - meets the minimum level requirement
 *   - meets optional weight/height requirements (from PokeAPI species data)
 */
export function findHMUser(hmName: string, party: Pokemon[]): Pokemon | null {
  const req = HM_CONFIG[hmName];
  if (!req) return null;

  for (const pokemon of party) {
    // Must know the HM move
    if (!pokemon.moves.some(m => m.id === req.moveId)) continue;

    // Must meet minimum level
    if (pokemon.level < req.minLevel) continue;

    // Optional weight restriction (PokeAPI weight is in hectograms)
    if (req.minWeight !== null) {
      const speciesData = getPokemon(pokemon.id);
      const weight = speciesData?.weight ?? 0;
      if (weight < req.minWeight) continue;
    }

    // Optional height restriction (PokeAPI height is in decimeters)
    if (req.minHeight !== null) {
      const speciesData = getPokemon(pokemon.id);
      const height = speciesData?.height ?? 0;
      if (height < req.minHeight) continue;
    }

    return pokemon;
  }

  return null;
}

/** Return true if any party Pokemon can use the given HM. */
export function canUseHM(hmName: string, party: Pokemon[]): boolean {
  return findHMUser(hmName, party) !== null;
}
