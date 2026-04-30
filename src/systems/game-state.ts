/**
 * GameState - Shared mutable player data accessible by all scenes.
 *
 * Provides a singleton PlayerData instance that scenes read/write.
 * The save system persists this data to localStorage.
 */

import type { PlayerData } from '../types/index.js';
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
    party: [
      {
        abilityId: 1,
        heldItemId: null,
        isGlitched: false,
        natureId: 1,
        status: null,
        xp: 0,
        xpToNext: 100,
        caughtBall: 'poke-ball',
        evs: { hp: 0, atk: 0, def: 0, spe: 0, spa: 0, spd: 0 },
        id: 151,
        name: 'Mew',
        level: 50,
        hp: 160,
        maxHp: 160,
        attack: 100,
        defense: 100,
        specialAttack: 100,
        specialDefense: 100,
        speed: 100,
        types: ['psychic'],
        moves: [
          {
            id: 82,
            name: 'Dragon Rage',
            type: 'dragon',
            power: 75,
            accuracy: 100,
            pp: 10,
            currentPp: 10,
            mathDifficulty: 3,
          },
          {
            id: 53,
            name: 'Flamethrower',
            type: 'fire',
            power: 90,
            accuracy: 100,
            pp: 15,
            currentPp: 15,
            mathDifficulty: 4,
          },
          {
            id: 75,
            name: 'Razor Leaf',
            type: 'grass',
            power: 55,
            accuracy: 95,
            pp: 25,
            currentPp: 25,
            mathDifficulty: 2,
          },
          {
            id: 55,
            name: 'Water Gun',
            type: 'water',
            power: 40,
            accuracy: 100,
            pp: 25,
            currentPp: 25,
            mathDifficulty: 1,
          },
          {
            id: 94,
            name: 'Psychic',
            type: 'psychic',
            power: 90,
            accuracy: 100,
            pp: 10,
            currentPp: 10,
            mathDifficulty: 4,
          },
          {
            id: 88,
            name: 'Rock Throw',
            type: 'rock',
            power: 50,
            accuracy: 90,
            pp: 15,
            currentPp: 15,
            mathDifficulty: 2,
          },
          {
            id: 157,
            name: 'Rock Slide',
            type: 'rock',
            power: 75,
            accuracy: 90,
            pp: 10,
            currentPp: 10,
            mathDifficulty: 3,
          },
          {
            id: 126,
            name: 'Fire Blast',
            type: 'fire',
            power: 110,
            accuracy: 85,
            pp: 5,
            currentPp: 5,
            mathDifficulty: 5,
          },
          {
            id: 202,
            name: 'Giga Drain',
            type: 'grass',
            power: 75,
            accuracy: 100,
            pp: 10,
            currentPp: 10,
            mathDifficulty: 3,
          },
          {
            id: 85,
            name: 'Thunderbolt',
            type: 'electric',
            power: 90,
            accuracy: 100,
            pp: 15,
            currentPp: 15,
            mathDifficulty: 4,
          },
          {
            id: 87,
            name: 'Thunder',
            type: 'electric',
            power: 110,
            accuracy: 70,
            pp: 10,
            currentPp: 10,
            mathDifficulty: 5,
          },
        ],
      },
    ],
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
export function saveToSlot(slot: number): void {
  if (!currentPlayerData) return;
  currentSlot = slot;
  saveGame(slot, currentPlayerData);
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
export function autoSave(): void {
  if (!currentPlayerData) return;
  if (currentSlot === null) {
    const free = findFreeSlot();
    currentSlot = free !== null ? free : 0;
  }
  saveGame(currentSlot, currentPlayerData);
}
