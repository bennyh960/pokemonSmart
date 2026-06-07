/**
 * SaveSystem - Persistent save/load using sessionStorage (runtime) + Supabase (cloud).
 *
 * sessionStorage holds the active game data for the current session.
 * On login, data is seeded from Supabase (or migrated from legacy localStorage).
 * On each major save, a fire-and-forget upsert syncs to Supabase.
 */

import type { PlayerData, Pokemon } from '../types/index.js';
import { getDefaultHeroCharacterId, hasCharacter } from '../engine/character-sprites.js';
import { ensurePersistentBattleFields } from './battle-state.js';
import { supabase } from '../auth/supabase-client.js';

const SAVE_KEY_PREFIX = 'pokemon-math-adventure-save-';
const SLOT_INDEX_KEY = 'pokemon-math-adventure-slots-index';

export const MAX_SAVE_SLOTS = 5;

export interface SaveSlotMeta {
  slot: number;
  playerName: string;
  heroCharacterId: string;
  firstPokemonId: number | null;
  savedAt: string;
  badgeCount?: number;
  activeQuestId?: string | null;
  pin?: string | null;
}

export interface CloudSlot {
  slot: number;
  meta: SaveSlotMeta;
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Cloud sync
// ---------------------------------------------------------------------------

/** Read all occupied slots from sessionStorage, formatted for Supabase upsert. */
export function getAllSlotsForCloud(): CloudSlot[] {
  return getSlotIndex().map((meta) => ({
    slot: meta.slot,
    meta,
    data: JSON.parse(sessionStorage.getItem(`${SAVE_KEY_PREFIX}${meta.slot}`) ?? '{}') as Record<string, unknown>,
  }));
}

/** Seed sessionStorage from cloud data returned by Supabase. */
export function populateSessionFromCloud(slots: CloudSlot[]): void {
  const index: SaveSlotMeta[] = [];
  for (const s of slots) {
    sessionStorage.setItem(`${SAVE_KEY_PREFIX}${s.slot}`, JSON.stringify(s.data));
    index.push(s.meta);
  }
  sessionStorage.setItem(SLOT_INDEX_KEY, JSON.stringify(index));
}

/** One-time migration: copy legacy localStorage saves into sessionStorage. */
export function migrateFromLocalStorage(): void {
  const raw = localStorage.getItem(SLOT_INDEX_KEY);
  if (!raw) return;

  try {
    const index = JSON.parse(raw) as SaveSlotMeta[];
    // Only migrate first MAX_SAVE_SLOTS entries
    const toMigrate = index.slice(0, MAX_SAVE_SLOTS);
    sessionStorage.setItem(SLOT_INDEX_KEY, JSON.stringify(toMigrate));

    for (const meta of toMigrate) {
      const data = localStorage.getItem(`${SAVE_KEY_PREFIX}${meta.slot}`);
      if (data) sessionStorage.setItem(`${SAVE_KEY_PREFIX}${meta.slot}`, data);
    }
  } catch {
    // Corrupt legacy data — start fresh
  }
}

const CLOUD_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let lastCloudSyncAt = 0;

export function syncToCloud(force = false): void {
  const now = Date.now();
  if (!force && now - lastCloudSyncAt < CLOUD_SYNC_INTERVAL_MS) return;
  lastCloudSyncAt = now;

  (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').upsert({
      user_id: user.id,
      slots: getAllSlotsForCloud(),
      updated_at: new Date().toISOString(),
    });
  })().catch(() => {});
}

// ---------------------------------------------------------------------------
// Slot index (stored in sessionStorage)
// ---------------------------------------------------------------------------

export function getSlotIndex(): SaveSlotMeta[] {
  const raw = sessionStorage.getItem(SLOT_INDEX_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as SaveSlotMeta[];
    } catch {
      return [];
    }
  }
  return [];
}

function persistSlotIndex(index: SaveSlotMeta[]): void {
  sessionStorage.setItem(SLOT_INDEX_KEY, JSON.stringify(index));
}

function upsertSlotMeta(slot: number, data: PlayerData): void {
  const index = getSlotIndex();
  const existing = index.find((m) => m.slot === slot);
  let b = data.badges >>> 0;
  let badgeCount = 0;
  while (b) {
    badgeCount += b & 1;
    b >>>= 1;
  }
  const meta: SaveSlotMeta = {
    slot,
    playerName: data.name,
    heroCharacterId: data.heroCharacterId,
    firstPokemonId: data.party[0]?.id ?? null,
    savedAt: new Date().toISOString(),
    badgeCount,
    activeQuestId: data.story?.activeQuestId ?? null,
    pin: existing?.pin ?? null, // preserve existing PIN
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

/** Update the PIN for an existing slot. Pass null to remove. */
export function setSlotPin(slot: number, pin: string | null): void {
  const index = getSlotIndex();
  const i = index.findIndex((m) => m.slot === slot);
  if (i >= 0) {
    index[i].pin = pin;
    persistSlotIndex(index);
    syncToCloud(true); // PIN change is explicit — always sync immediately
  }
}

// ---------------------------------------------------------------------------
// Schema version + migrations
// ---------------------------------------------------------------------------

export const CURRENT_SAVE_VERSION = 16;

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
  if (data.awayPokemon) {
    for (const entry of Object.values(data.awayPokemon) as Record<string, any>[]) {
      if (entry?.pokemon) callback(entry.pokemon);
    }
  }
}

const migrations: Record<number, (data: Record<string, any>) => void> = {
  1: (data) => {
    if (!data.items) data.items = {};
    if (!data.flags) data.flags = {};
    if (!data.lastPokemonCenter) data.lastPokemonCenter = { mapId: 'zeroville/zeroville', x: 4, y: 5 };
    if (data.playtime === undefined) data.playtime = 0;
    if (data.serumParts === undefined) data.serumParts = 0;
    data.saveVersion = 1;
  },
  2: (data) => {
    if (!data.boxes) {
      data.boxes = Array.from({ length: 10 }, (_, i) => ({ name: `BOX ${i + 1}`, pokemon: Array(30).fill(null) }));
    }
    data.saveVersion = 2;
  },
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
  5: (data) => {
    forEachStoredPokemon(data, ensurePersistentBattleFields);
    data.saveVersion = 5;
  },
  6: (data) => {
    if (!data.trainerEncounters) data.trainerEncounters = {};
    if (!data.phoneContacts) data.phoneContacts = [];
    data.saveVersion = 6;
  },
  7: (data) => {
    if (!data.story) {
      data.story = { gateUnlocks: {}, mapInfection: {}, activeQuestId: null, completedQuestIds: [] };
    }
    data.saveVersion = 7;
  },
  8: (data) => {
    if (data.pokedexBatteryCharges === undefined) data.pokedexBatteryCharges = 50;
    if (data.battleHelperBattles === undefined) data.battleHelperBattles = 0;
    if (data.battleHelperEnabled === undefined) data.battleHelperEnabled = false;
    data.saveVersion = 8;
  },
  9: (data) => {
    if (!data.flagTimestamps) data.flagTimestamps = {};
    data.saveVersion = 9;
  },
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
  11: (data) => {
    if (data.birthYear === undefined) data.birthYear = 2018;
    data.saveVersion = 11;
  },
  12: (data) => {
    if (data.repelStepsRemaining === undefined) data.repelStepsRemaining = 0;
    data.saveVersion = 12;
  },
  13: (data) => {
    if (data.story?.cityInfection !== undefined) {
      data.story.mapInfection = data.story.cityInfection;
      delete data.story.cityInfection;
    }
    data.saveVersion = 13;
  },
  14: (data) => {
    forEachStoredPokemon(data, (pokemon) => {
      if (pokemon.wPercent === undefined) pokemon.wPercent = gaussianSizePercent();
      if (pokemon.hPercent === undefined) pokemon.hPercent = gaussianSizePercent();
    });
    data.saveVersion = 14;
  },
  15: (data) => {
    if (data.surfing === undefined) data.surfing = false;
    if (data.surfingPokemonId === undefined) data.surfingPokemonId = null;
    data.saveVersion = 15;
  },
  16: (data) => {
    forEachStoredPokemon(data, (pokemon) => {
      if (!pokemon.uuid) pokemon.uuid = crypto.randomUUID();
    });
    if (!data.awayPokemon) data.awayPokemon = {};
    if (data.totalSteps === undefined) data.totalSteps = 0;
    data.saveVersion = 16;
  },
};

function migrateSave(data: Record<string, any>): PlayerData {
  let version = typeof data.saveVersion === 'number' ? data.saveVersion : 0;
  while (version < CURRENT_SAVE_VERSION) {
    const nextVersion = version + 1;
    const migrate = migrations[nextVersion];
    if (migrate) {
      migrate(data);
      console.log(`Save migrated: v${version} → v${nextVersion}`);
    } else {
      console.warn(`No migration for v${version} → v${nextVersion}`);
      data.saveVersion = nextVersion;
    }
    version = nextVersion;
  }
  return data as PlayerData;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function saveGame(slot: number, data: PlayerData, force = false): void {
  sessionStorage.setItem(`${SAVE_KEY_PREFIX}${slot}`, JSON.stringify(data));
  upsertSlotMeta(slot, data);
  syncToCloud(force);
}

export function loadGame(slot: number): PlayerData | null {
  const key = `${SAVE_KEY_PREFIX}${slot}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    const migrated = migrateSave(data);
    if ((data.saveVersion ?? 0) < CURRENT_SAVE_VERSION) {
      sessionStorage.setItem(key, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    console.warn(`Failed to parse save data for slot ${slot}.`);
    return null;
  }
}

export function hasSave(slot: number): boolean {
  return sessionStorage.getItem(`${SAVE_KEY_PREFIX}${slot}`) !== null;
}

export function deleteSave(slot: number): void {
  sessionStorage.removeItem(`${SAVE_KEY_PREFIX}${slot}`);
  removeSlotMeta(slot);
  syncToCloud();
}

// ---------------------------------------------------------------------------
// Event checkpoints — kept in localStorage so they survive tab refresh
// ---------------------------------------------------------------------------

const CHECKPOINT_KEY_PREFIX = 'pokemon-math-adventure-event-checkpoint-';

export interface EventCheckpoint {
  slot: number;
  eventId: string;
  cutsceneId: string;
  flagsSnapshot: Record<string, boolean>;
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
