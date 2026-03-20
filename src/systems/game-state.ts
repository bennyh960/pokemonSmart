/**
 * GameState - Shared mutable player data accessible by all scenes.
 *
 * Provides a singleton PlayerData instance that scenes read/write.
 * The save system persists this data to localStorage.
 */

import type { PlayerData } from '../types/index.js';
import { saveGame, loadGame, hasSave } from './save.js';

/** Default save slot. */
const SAVE_SLOT = 0;

/** Create fresh PlayerData for a new game (party empty until starter is chosen). */
export function createNewPlayerData(): PlayerData {
  return {
    name: 'Player',
    party: [],
    badges: 0,
    serumParts: 0,
    money: 3000,
    pokedex: {},
    position: { mapId: 'zeroville', x: 15, y: 12 },
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

/** Auto-save the current game state. No-op if no active game. */
export function autoSave(): void {
  if (currentPlayerData) {
    saveGame(SAVE_SLOT, currentPlayerData);
  }
}
