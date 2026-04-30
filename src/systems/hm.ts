/**
 * HM System — Overworld Hidden Machine move usage.
 *
 * Provides HM configuration and helpers for checking if a party Pokemon
 * can use a given HM in the overworld.
 */

import type { Pokemon } from '../types/index.js';
import { computePokemonSize } from '../services/pokemon-data.js';

/** Requirements a Pokemon must meet to use an HM in the overworld. */
export interface HMRequirement {
  moveId: number;
  minLevel: number;
  minWeight: number | null; // kg, null = no restriction
  minHeight: number | null; // meters, null = no restriction
}

/** HM configuration table. */
export const HM_CONFIG: Record<string, HMRequirement> = {
  cut: { moveId: 15, minLevel: 20, minWeight: null, minHeight: null },
  strength: { moveId: 70, minLevel: 40, minWeight: 20, minHeight: null },
  surf: { moveId: 57, minLevel: 45, minWeight: 25, minHeight: 0.85 },
  fly: { moveId: 19, minLevel: 60, minWeight: 35, minHeight: 1.4 },
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
    if (!pokemon.moves.some((m) => m.id === req.moveId)) continue;

    // Must meet minimum level
    if (pokemon.level < req.minLevel) continue;

    if (req.minWeight !== null || req.minHeight !== null) {
      const size = computePokemonSize(pokemon);
      if (req.minWeight !== null && size.weightKg < req.minWeight) continue;
      if (req.minHeight !== null && size.heightM < req.minHeight) continue;
    }

    return pokemon;
  }

  return null;
}

/** Return true if any party Pokemon can use the given HM. */
export function canUseHM(hmName: string, party: Pokemon[]): boolean {
  return findHMUser(hmName, party) !== null;
}

/** Find ALL party Pokemon that can use the given HM. */
export function findAllHMUsers(hmName: string, party: Pokemon[]): Pokemon[] {
  const req = HM_CONFIG[hmName];
  if (!req) return [];
  return party.filter((pokemon) => {
    if (!pokemon.moves.some((m) => m.id === req.moveId)) return false;
    if (pokemon.level < req.minLevel) return false;

    const pokemonSize = computePokemonSize(pokemon);
    if (req.minWeight !== null && (pokemonSize.weightKg ?? 0) < req.minWeight) return false;
    if (req.minHeight !== null && (pokemonSize.heightM ?? 0) < req.minHeight) return false;
    return true;
  });
}

/** Result of the stepped Surf eligibility check. */
export interface SurfCheckResult {
  eligible: Pokemon[];
  /** Why surf failed — 'none' means success. */
  failReason: 'none' | 'no-surf-move' | 'level' | 'height' | 'weight';
  /** Pokemon that triggered this failure (those that know Surf but fail this step). */
  failPokemon: Pokemon[];
  minLevel: number;
  minHeight: number | null; // decimeters
  minWeight: number | null; // hectograms
}

/**
 * Cascade Surf eligibility check.
 * Order: no-move → level → height → weight.
 * Each step only considers Pokemon that passed the previous step.
 */
export function checkSurfEligibility(party: Pokemon[]): SurfCheckResult {
  const req = HM_CONFIG['surf'];
  const limits = {
    minLevel: req?.minLevel ?? 0,
    minHeight: req?.minHeight ?? null,
    minWeight: req?.minWeight ?? null,
  };

  if (!req) return { eligible: [], failReason: 'no-surf-move', failPokemon: [], ...limits };

  const knowsSurf = party.filter((p) => p.moves.some((m) => m.id === req.moveId));
  if (!knowsSurf.length) return { eligible: [], failReason: 'no-surf-move', failPokemon: [], ...limits };

  const passLevel = knowsSurf.filter((p) => p.level >= req.minLevel);
  if (!passLevel.length) return { eligible: [], failReason: 'level', failPokemon: knowsSurf, ...limits };

  const passHeight =
    req.minHeight !== null
      ? passLevel.filter((p) => (computePokemonSize(p).heightM ?? 0) >= req.minHeight!)
      : passLevel;
  if (!passHeight.length) return { eligible: [], failReason: 'height', failPokemon: passLevel, ...limits };

  const passWeight =
    req.minWeight !== null
      ? passHeight.filter((p) => (computePokemonSize(p).weightKg ?? 0) >= req.minWeight!)
      : passHeight;
  if (!passWeight.length) return { eligible: [], failReason: 'weight', failPokemon: passHeight, ...limits };

  return { eligible: passWeight, failReason: 'none', failPokemon: [], ...limits };
}
