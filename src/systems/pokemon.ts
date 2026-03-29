/**
 * Pokemon - Data types, helpers, and Pokemon management.
 *
 * Handles Pokemon creation, stat calculation, leveling,
 * evolution checks, and Pokedex tracking.
 *
 * TODO:
 * - Create Pokemon from base data + level
 * - Stat calculation formula (base stat * level modifier)
 * - XP gain and level-up logic
 * - Evolution trigger checks (level-based, item-based)
 * - Move learning on level-up
 * - HP recovery and status management
 * - Pokedex registration (seen/caught)
 * - Load Pokemon data from JSON (fetched from PokeAPI)
 */

import type { Pokemon } from '../types/index.js';
import { getXpToNextLevel } from './encounter.js';

/** Create an empty/default Pokemon (placeholder). */
export function createDefaultPokemon(): Pokemon {
  return {
    id: 0,
    name: 'MissingNo',
    level: 1,
    hp: 10,
    maxHp: 10,
    attack: 5,
    defense: 5,
    specialAttack: 5,
    specialDefense: 5,
    speed: 5,
    types: ['normal'],
    moves: [],
    xp: 0,
    xpToNext: getXpToNextLevel(1),
    isGlitched: false,
    abilityId: null,
    natureId: null,
    heldItemId: null,
  };
}
