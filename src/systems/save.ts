/**
 * SaveSystem - Persistent save/load using localStorage.
 *
 * Serializes game state to JSON and stores it in the browser's
 * localStorage. Supports versioned schema migration: old saves are
 * upgraded step-by-step through migration functions.
 */

import type { PlayerData } from '../types/index.js';
import { getDefaultHeroCharacterId, hasCharacter } from '../engine/character-sprites.js';

const SAVE_KEY_PREFIX = 'pokemon-math-adventure-save-';

/** Current schema version — bump this when PlayerData shape changes. */
export const CURRENT_SAVE_VERSION = 4;

/**
 * Migration functions keyed by TARGET version.
 * Each function receives a save at version (N-1) and returns version N.
 * Migrations run in order: 0→1, 1→2, etc.
 */
const migrations: Record<number, (data: Record<string, any>) => void> = {
  // Version 0 → 1: add fields introduced before versioning was added
  1: (data) => {
    if (!data.items) data.items = {};
    if (!data.flags) data.flags = {};
    if (!data.lastPokemonCenter) data.lastPokemonCenter = { mapId: 'zeroville', x: 4, y: 5 };
    if (data.playtime === undefined) data.playtime = 0;
    if (data.serumParts === undefined) data.serumParts = 0;
    data.saveVersion = 1;
  },
  // Version 1 → 2: add PC storage boxes
  2: (data) => {
    if (!data.boxes) {
      data.boxes = Array.from({ length: 10 }, (_, i) => ({
        name: `BOX ${i + 1}`,
        pokemon: Array(30).fill(null),
      }));
    }
    data.saveVersion = 2;
  },
  // Version 2 → 3: add abilityId, natureId, heldItemId to all Pokemon
  3: (data) => {
    const addFields = (pokemon: any) => {
      if (!pokemon) return;
      if (pokemon.abilityId === undefined) pokemon.abilityId = null;
      if (pokemon.natureId === undefined) pokemon.natureId = null;
      if (pokemon.heldItemId === undefined) pokemon.heldItemId = null;
    };
    if (data.party) {
      for (const p of data.party) addFields(p);
    }
    if (data.boxes) {
      for (const box of data.boxes) {
        if (box?.pokemon) {
          for (const p of box.pokemon) addFields(p);
        }
      }
    }
    data.saveVersion = 3;
  },
  // Version 3 → 4: add selected hero sprite id for player rendering
  4: (data) => {
    if (typeof data.heroCharacterId !== 'string' || !data.heroCharacterId.trim() || !hasCharacter(data.heroCharacterId)) {
      data.heroCharacterId = getDefaultHeroCharacterId();
    }
    data.saveVersion = 4;
  },
};

/** Apply all needed migrations to bring a save up to CURRENT_SAVE_VERSION. */
function migrateSave(data: Record<string, any>): PlayerData {
  let version = typeof data.saveVersion === 'number' ? data.saveVersion : 0;

  while (version < CURRENT_SAVE_VERSION) {
    const nextVersion = version + 1;
    const migrate = migrations[nextVersion];
    if (migrate) {
      migrate(data);
      console.log(`Save migrated: v${version} → v${nextVersion}`);
    } else {
      console.warn(`No migration for v${version} → v${nextVersion}, setting version directly`);
      data.saveVersion = nextVersion;
    }
    version = nextVersion;
  }

  return data as PlayerData;
}

/** Save player data to a slot. */
export function saveGame(slot: number, data: PlayerData): void {
  const key = `${SAVE_KEY_PREFIX}${slot}`;
  localStorage.setItem(key, JSON.stringify(data));
}

/** Load player data from a slot. Migrates old saves automatically. Returns null if no save exists. */
export function loadGame(slot: number): PlayerData | null {
  const key = `${SAVE_KEY_PREFIX}${slot}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    const migrated = migrateSave(data);

    // Re-save if migration was applied so we don't re-migrate every load
    if ((data.saveVersion ?? 0) < CURRENT_SAVE_VERSION) {
      localStorage.setItem(key, JSON.stringify(migrated));
    }

    return migrated;
  } catch {
    console.warn(`Failed to parse save data for slot ${slot}.`);
    return null;
  }
}

/** Check if a save slot has data. */
export function hasSave(slot: number): boolean {
  return localStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`) !== null;
}

/** Delete a save slot. */
export function deleteSave(slot: number): void {
  localStorage.removeItem(`${SAVE_KEY_PREFIX}${slot}`);
}
