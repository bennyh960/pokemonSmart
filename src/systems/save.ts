/**
 * SaveSystem - Persistent save/load using localStorage.
 *
 * Serializes game state to JSON and stores it in the browser's
 * localStorage. Supports versioned schema migration: old saves are
 * upgraded step-by-step through migration functions.
 */

import type { PlayerData } from '../types/index.js';
import { getDefaultHeroCharacterId, hasCharacter } from '../engine/character-sprites.js';
import { ensurePersistentBattleFields } from './battle-state.js';

const SAVE_KEY_PREFIX = 'pokemon-math-adventure-save-';
const SLOT_INDEX_KEY = 'pokemon-math-adventure-slots-index';

export const MAX_SAVE_SLOTS = 10;

export interface SaveSlotMeta {
  slot: number;
  playerName: string;
  heroCharacterId: string;
  firstPokemonId: number | null;
  savedAt: string;
}

export function getSlotIndex(): SaveSlotMeta[] {
  const raw = localStorage.getItem(SLOT_INDEX_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as SaveSlotMeta[];
    } catch {
      return [];
    }
  }
  // Migrate pre-index saves: if slot 0 exists, seed the index from it
  const slot0Raw = localStorage.getItem(`${SAVE_KEY_PREFIX}0`);
  if (slot0Raw) {
    try {
      const data = JSON.parse(slot0Raw);
      const meta: SaveSlotMeta = {
        slot: 0,
        playerName: data.name ?? 'Player',
        heroCharacterId: data.heroCharacterId ?? 'dani',
        firstPokemonId: data.party?.[0]?.id ?? null,
        savedAt: new Date().toISOString(),
      };
      const index = [meta];
      localStorage.setItem(SLOT_INDEX_KEY, JSON.stringify(index));
      return index;
    } catch {
      return [];
    }
  }
  return [];
}

function persistSlotIndex(index: SaveSlotMeta[]): void {
  localStorage.setItem(SLOT_INDEX_KEY, JSON.stringify(index));
}

function upsertSlotMeta(slot: number, data: PlayerData): void {
  const index = getSlotIndex();
  const meta: SaveSlotMeta = {
    slot,
    playerName: data.name,
    heroCharacterId: data.heroCharacterId,
    firstPokemonId: data.party[0]?.id ?? null,
    savedAt: new Date().toISOString(),
  };
  const i = index.findIndex((m) => m.slot === slot);
  if (i >= 0) index[i] = meta;
  else index.push(meta);
  persistSlotIndex(index);
}

function removeSlotMeta(slot: number): void {
  persistSlotIndex(getSlotIndex().filter((m) => m.slot !== slot));
}

export function findFreeSlot(): number | null {
  const used = new Set(getSlotIndex().map((m) => m.slot));
  for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
    if (!used.has(i)) return i;
  }
  return null;
}

/** Current schema version — bump this when PlayerData shape changes. */
export const CURRENT_SAVE_VERSION = 15;

function gaussianSizePercent(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(-10, Math.min(10, z * 3.33));
}

function forEachStoredPokemon(data: Record<string, any>, callback: (pokemon: Record<string, any>) => void): void {
  if (data.party) {
    for (const pokemon of data.party) {
      if (pokemon) callback(pokemon);
    }
  }
  if (data.boxes) {
    for (const box of data.boxes) {
      if (!box?.pokemon) continue;
      for (const pokemon of box.pokemon) {
        if (pokemon) callback(pokemon);
      }
    }
  }
}

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
    if (!data.lastPokemonCenter) data.lastPokemonCenter = { mapId: 'zeroville/zeroville', x: 4, y: 5 };
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
    const addFields = (pokemon: Record<string, any>) => {
      if (!pokemon) return;
      if (pokemon.abilityId === undefined) pokemon.abilityId = null;
      if (pokemon.natureId === undefined) pokemon.natureId = null;
      if (pokemon.heldItemId === undefined) pokemon.heldItemId = null;
    };
    forEachStoredPokemon(data, addFields);
    data.saveVersion = 3;
  },
  // Version 3 → 4: add selected hero sprite id for player rendering
  4: (data) => {
    if (
      typeof data.heroCharacterId !== 'string' ||
      !data.heroCharacterId.trim() ||
      !hasCharacter(data.heroCharacterId)
    ) {
      data.heroCharacterId = getDefaultHeroCharacterId();
    }
    data.saveVersion = 4;
  },
  // Version 4 → 5: add persistent Pokemon major status field
  5: (data) => {
    forEachStoredPokemon(data, ensurePersistentBattleFields);
    data.saveVersion = 5;
  },
  // Version 5 → 6: add trainer re-encounter state and phone contacts
  6: (data) => {
    if (!data.trainerEncounters) data.trainerEncounters = {};
    if (!data.phoneContacts) data.phoneContacts = [];
    data.saveVersion = 6;
  },
  // Version 6 → 7: add story mode state
  7: (data) => {
    if (!data.story) {
      data.story = {
        gateUnlocks: {},
        mapInfection: {},
        activeQuestId: null,
        completedQuestIds: [],
      };
    }
    data.saveVersion = 7;
  },
  // Version 7 → 8: add Pokedex battery and Battle Helper fields
  8: (data) => {
    if (data.pokedexBatteryCharges === undefined) data.pokedexBatteryCharges = 50;
    if (data.battleHelperBattles === undefined) data.battleHelperBattles = 0;
    if (data.battleHelperEnabled === undefined) data.battleHelperEnabled = false;
    data.saveVersion = 8;
  },
  // Version 8 → 9: add flagTimestamps for flag-based reencounter triggers
  9: (data) => {
    if (!data.flagTimestamps) data.flagTimestamps = {};
    data.saveVersion = 9;
  },
  // Version 9 → 10: migrate phoneContacts.trainerName from string to BilingualText
  10: (data) => {
    if (Array.isArray(data.phoneContacts)) {
      for (const contact of data.phoneContacts) {
        if (typeof contact.trainerName === 'string') {
          contact.trainerName = { en: contact.trainerName, he: contact.trainerName };
        }
      }
    }
    data.saveVersion = 10;
  },
  // Version 10 → 11: add birthYear field (default 2018)
  11: (data) => {
    if (data.birthYear === undefined) data.birthYear = 2018;
    data.saveVersion = 11;
  },
  // Version 11 → 12: add repelStepsRemaining field
  12: (data) => {
    if (data.repelStepsRemaining === undefined) data.repelStepsRemaining = 0;
    data.saveVersion = 12;
  },
  // Version 12 → 13: rename cityInfection → mapInfection
  13: (data) => {
    if (data.story?.cityInfection !== undefined) {
      data.story.mapInfection = data.story.cityInfection;
      delete data.story.cityInfection;
    }
    data.saveVersion = 13;
  },
  // Version 13 → 14: assign size genetics (wPercent, hPercent) to all existing Pokemon
  14: (data) => {
    forEachStoredPokemon(data, (pokemon) => {
      if (pokemon.wPercent === undefined) pokemon.wPercent = gaussianSizePercent();
      if (pokemon.hPercent === undefined) pokemon.hPercent = gaussianSizePercent();
    });
    data.saveVersion = 14;
  },
  // Version 14 → 15: add optional surfing persistence fields
  15: (data) => {
    if (data.surfing === undefined) data.surfing = false;
    if (data.surfingPokemonId === undefined) data.surfingPokemonId = null;
    data.saveVersion = 15;
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

/** Save player data to a slot and update the slot index. */
export function saveGame(slot: number, data: PlayerData): void {
  localStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, JSON.stringify(data));
  upsertSlotMeta(slot, data);
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

/** Delete a save slot and remove it from the index. */
export function deleteSave(slot: number): void {
  localStorage.removeItem(`${SAVE_KEY_PREFIX}${slot}`);
  removeSlotMeta(slot);
}

// ---------------------------------------------------------------------------
// Event checkpoint — survives page refresh; cleared on cutscene completion.
// If present on load it means the player refreshed mid-cutscene event, so the
// game can roll back flags and re-run the event cleanly from the beginning.
// ---------------------------------------------------------------------------

const CHECKPOINT_KEY_PREFIX = 'pokemon-math-adventure-event-checkpoint-';

export interface EventCheckpoint {
  /** Save slot this checkpoint belongs to. */
  slot: number;
  /** ID of the story event that was interrupted. */
  eventId: string;
  /** ID of the cutscene that was running inside that event. */
  cutsceneId: string;
  /** Full copy of pd.flags taken before any of the event's actions ran. */
  flagsSnapshot: Record<string, boolean>;
  /** Player position at the moment the checkpoint was created, so recovery can restore them to the right spot. */
  playerPosition: { mapId: string; x: number; y: number };
}

function getCheckpointKey(slot: number): string {
  return `${CHECKPOINT_KEY_PREFIX}${slot}`;
}

export function saveEventCheckpoint(slot: number, checkpoint: Omit<EventCheckpoint, 'slot'>): void {
  localStorage.setItem(getCheckpointKey(slot), JSON.stringify({ ...checkpoint, slot }));
}

export function loadEventCheckpoint(slot: number): EventCheckpoint | null {
  const raw = localStorage.getItem(getCheckpointKey(slot));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EventCheckpoint;
  } catch {
    return null;
  }
}

export function clearEventCheckpoint(slot: number): void {
  localStorage.removeItem(getCheckpointKey(slot));
}
