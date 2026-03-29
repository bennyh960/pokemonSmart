/**
 * Player - Player state management.
 *
 * Tracks the player's party, badges, inventory, position,
 * and all persistent progress data.
 *
 * TODO:
 * - Initialize new player with starter Pokemon
 * - Party management (add, remove, reorder, max 6)
 * - Badge collection tracking (8 badges + Elite Four)
 * - Serum parts collection (8 pieces for the cure)
 * - Money/currency system
 * - Position tracking (map ID + grid coordinates)
 * - Playtime counter
 * - Inventory/bag system
 */

import type { PlayerData } from '../types/index.js';
import { getDefaultHeroCharacterId } from '../engine/character-sprites.js';

/** Create a fresh player save with default values. */
export function createNewPlayer(name: string): PlayerData {
  return {
    saveVersion: 4,
    name,
    heroCharacterId: getDefaultHeroCharacterId(),
    party: [],
    boxes: Array.from({ length: 10 }, (_, i) => ({
      name: `BOX ${i + 1}`,
      pokemon: Array(30).fill(null),
    })),
    badges: 0,
    serumParts: 0,
    money: 3000,
    pokedex: {},
    items: {},
    flags: {},
    position: { mapId: 'lab', x: 5, y: 5 },
    lastPokemonCenter: { mapId: 'zeroville', x: 4, y: 5 },
    playtime: 0,
  };
}
