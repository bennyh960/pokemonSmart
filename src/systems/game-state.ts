/**
 * GameState - Shared mutable player data accessible by all scenes.
 *
 * Provides a singleton PlayerData instance that scenes read/write.
 * The save system persists this data to localStorage.
 */

import type { PlayerData } from '../types/index.js';
import { getDefaultHeroCharacterId } from '../engine/character-sprites.js';
import { saveGame, loadGame, hasSave, CURRENT_SAVE_VERSION } from './save.js';

/** Default save slot. */
const SAVE_SLOT = 0;

/** Create fresh PlayerData for a new game (party empty until starter is chosen). */
export function createNewPlayerData(): PlayerData {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    name: 'Player',
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
      'potion': 5,
      'super-potion': 3,
      'antidote': 2,
      'poke-ball': 10,
      'great-ball': 5,
      'revive': 2,
      'full-heal': 1,
      'x-attack': 2,
      'x-speed': 2,
      'rare-candy': 20,
    },
    flags: {},
    position: { mapId: 'zeroville', x: 15, y: 12 },
    lastPokemonCenter: { mapId: 'zeroville', x: 4, y: 5 },
    playtime: 0,
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

/** Check if a saved game exists. */
export function hasSavedGame(): boolean {
  return hasSave(SAVE_SLOT);
}

/** Start a new game with fresh PlayerData. */
export function startNewGame(): PlayerData {
  currentPlayerData = createNewPlayerData();
  return currentPlayerData;
}

/** Load saved game from localStorage. Returns null if no save exists. */
export function loadSavedGame(): PlayerData | null {
  const data = loadGame(SAVE_SLOT);
  if (data) {
    currentPlayerData = data;
  }
  return data;
}

/** Heal all Pokemon in the party: restore HP and PP. */
export function healParty(): void {
  const pd = getPlayerData();
  for (const pokemon of pd.party) {
    pokemon.hp = pokemon.maxHp;
    for (const move of pokemon.moves) {
      move.currentPp = move.pp;
    }
  }
}

/** Record the current location as the last Pokemon Center visited. */
export function updateLastPokemonCenter(mapId: string, x: number, y: number): void {
  const pd = getPlayerData();
  pd.lastPokemonCenter = { mapId, x, y };
}

/** Auto-save the current game state. No-op if no active game. */
export function autoSave(): void {
  if (currentPlayerData) {
    saveGame(SAVE_SLOT, currentPlayerData);
  }
}
