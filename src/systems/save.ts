/**
 * SaveSystem - Persistent save/load using localStorage.
 *
 * Serializes game state to JSON and stores it in the browser's
 * localStorage. Supports multiple save slots.
 *
 * TODO:
 * - Save game state to a named slot
 * - Load game state from a named slot
 * - List available save slots
 * - Delete a save slot
 * - Auto-save on key events (gym clear, serum collection)
 * - Save data validation/migration for version changes
 * - Export/import save as JSON string (backup)
 */

import type { PlayerData } from '../types/index.js';

const SAVE_KEY_PREFIX = 'pokemon-math-adventure-save-';

/** Save player data to a slot. */
export function saveGame(slot: number, data: PlayerData): void {
  const key = `${SAVE_KEY_PREFIX}${slot}`;
  localStorage.setItem(key, JSON.stringify(data));
}

/** Load player data from a slot. Returns null if no save exists. */
export function loadGame(slot: number): PlayerData | null {
  const key = `${SAVE_KEY_PREFIX}${slot}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as PlayerData;
    // Migration: add items/flags fields if missing from old saves
    if (!data.items) data.items = {};
    if (!data.flags) data.flags = {};
    return data;
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
