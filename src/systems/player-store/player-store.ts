import { getPlayerData, autoSave } from '../game-state.js';
import type { PlayerData } from '../../types/index.js';

const listeners = new Set<() => void>();
let version = 0;

export function subscribePlayerData(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getPlayerDataVersion(): number {
  return version;
}

/** Mutate the singleton in place → bump version → notify React → persist. The one write path. */
export function editPlayerData(mutate: (pd: PlayerData) => void): void {
  mutate(getPlayerData());
  version++;
  for (const fn of listeners) fn();
  autoSave();
}

/** Call after the singleton is REPLACED wholesale (new game / load slot). */
export function notifyPlayerDataReplaced(): void {
  version++;
  for (const fn of listeners) fn();
}
