/**
 * GameState - Shared mutable player data accessible by all scenes.
 *
 * Provides a singleton PlayerData instance that scenes read/write.
 * The save system persists this data to localStorage.
 */

import type { PlayerData, StolenEntry } from '../types/index.js';
import { getDefaultHeroCharacterId } from '../engine/character-sprites.js';
import { saveGame, loadGame, CURRENT_SAVE_VERSION, getSlotIndex, findFreeSlot } from './save.js';

/** Which slot the current session was loaded from / last saved to. */
let currentSlot: number | null = null;

export function getCurrentSlot(): number | null {
  return currentSlot;
}

/** Create fresh PlayerData for a new game (party empty until starter is chosen). */
export function createNewPlayerData(): PlayerData {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    name: 'Player',
    birthYear: 2018,
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
    items: {
      potion: 5,
      'poke-ball': 10,
    },
    flags: {},
    flagTimestamps: {},
    position: { mapId: 'zeroville/zeroville', x: 15, y: 12 },
    lastPokemonCenter: { mapId: 'zeroville/zeroville', x: 4, y: 5 },
    playtime: 0,
    trainerEncounters: {},
    phoneContacts: [] as import('../types/index.js').PhoneContactInfo[],
    story: { gateUnlocks: {}, mapInfection: {}, activeQuestId: null, completedQuestIds: [] },
    pokedexBatteryCharges: 50,
    battleHelperBattles: 10,
    battleHelperEnabled: true,
    repelStepsRemaining: 0,
    awayPokemon: {},
    totalSteps: 0,
  };
}

/** The current player data — null until a game is started or loaded. */
let currentPlayerData: PlayerData | null = null;

/** Get the current player data. Throws if no game is active. */
export function getPlayerData(): PlayerData {
  if (!currentPlayerData) {
    throw new Error('No active game. Call startNewGame() or loadSavedGame() first.');
  }
  return currentPlayerData;
}

/** Check if a game is currently active. */
export function hasActiveGame(): boolean {
  return currentPlayerData !== null;
}

/** Check if a Pokemon is currently stolen (absent from party, stored in awayPokemon). */
export function isStolenPokemon(pd: PlayerData, pokemon: { uuid: string }): boolean {
  return pd.awayPokemon?.[pokemon.uuid]?.kind === 'stolen';
}

/** Pending notifications for Pokemon that were restored after theft — consumed by the overworld scene. */
export interface RestoreNotification {
  pokemonName: string;
  sentToBox: boolean;
}
const _pendingRestoreNotifications: RestoreNotification[] = [];

export function consumeRestoreNotifications(): RestoreNotification[] {
  return _pendingRestoreNotifications.splice(0);
}

function checkRestoreStolenPokemon(pd: PlayerData, flagKey: string): void {
  if (!pd.awayPokemon || Object.keys(pd.awayPokemon).length === 0) return;
  for (const [uuid, entry] of Object.entries(pd.awayPokemon)) {
    if (entry.kind !== 'stolen') continue;
    const stolenEntry = entry as StolenEntry;
    if (stolenEntry.restoredFlag !== flagKey) continue;

    const pokemon = stolenEntry.pokemon;
    if (pokemon.hp === 0) {
      pokemon.hp = 1;
      pokemon.status = null;
    }
    delete pd.awayPokemon[uuid];

    const sentToBox = pd.party.length >= 6;
    if (sentToBox) {
      outer: for (const box of pd.boxes) {
        for (let s = 0; s < box.pokemon.length; s++) {
          if (!box.pokemon[s]) {
            box.pokemon[s] = pokemon;
            break outer;
          }
        }
      }
    } else {
      pd.party.push(pokemon);
    }
    _pendingRestoreNotifications.push({ pokemonName: pokemon.name, sentToBox });
  }
}

/**
 * Set a story/progression flag on the player data and record its timestamp.
 * Always use this instead of `pd.flags[key] = true` so that flag-based
 * reencounter triggers can measure elapsed time since the flag was set.
 */
export function setFlag(pd: PlayerData, key: string): void {
  if (!pd.flags[key]) {
    pd.flags[key] = true;
    if (!pd.flagTimestamps) pd.flagTimestamps = {};
    pd.flagTimestamps[key] = Date.now();
    checkRestoreStolenPokemon(pd, key);
  }
}

/** Check if any saved slot exists. */
export function hasSavedGame(): boolean {
  return getSlotIndex().length > 0;
}

/** Start a new game with fresh PlayerData. Slot is assigned on first save. */
export function startNewGame(): PlayerData {
  currentPlayerData = createNewPlayerData();
  currentSlot = null;
  return currentPlayerData;
}

/** Load player data from a specific slot and set it as the current slot. */
export function loadGameFromSlot(slot: number): PlayerData | null {
  const data = loadGame(slot);
  if (data) {
    currentPlayerData = data;
    currentSlot = slot;
  }
  return data;
}

/** Save current player data to a specific slot and update the current slot. */
export function saveToSlot(slot: number, force = false): void {
  if (!currentPlayerData) return;
  currentSlot = slot;
  saveGame(slot, currentPlayerData, force);
}

/** Heal all Pokemon in the party: restore HP, PP, and persistent status. Also recharges Pokedex battery. */
export function healParty(): void {
  const pd = getPlayerData();
  for (const pokemon of pd.party) {
    pokemon.hp = pokemon.maxHp;
    pokemon.status = null;
    for (const move of pokemon.moves) {
      move.currentPp = move.pp;
    }
  }
  pd.pokedexBatteryCharges = 50;
}

/** Record the current location as the last Pokemon Center visited. */
export function updateLastPokemonCenter(mapId: string, x: number, y: number): void {
  const pd = getPlayerData();
  pd.lastPokemonCenter = { mapId, x, y };
}

/** Auto-save the current game state to the current slot (or first free slot for new games). */
export function autoSave(syncCloudForce?: boolean): void {
  if (!currentPlayerData) return;
  if (currentSlot === null) {
    const free = findFreeSlot();
    currentSlot = free !== null ? free : 0;
  }
  saveGame(currentSlot, currentPlayerData, syncCloudForce);
}
