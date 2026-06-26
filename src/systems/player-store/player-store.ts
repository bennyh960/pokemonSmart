// Motivation for player store is just for react component but in the player-actions we will use also actions that serve canvas
// src/systems/player-data/
//   player-store.ts     ← funnel (editPlayerData) + subscription (version, listeners). No React import.
//   player-actions.ts   ← pure mutators (pd, ...args) => void. No React, no store import.

// src/ui-react/hooks/
//   usePlayerData.ts    ← the ONLY React file. Subscribes + returns [pd, editPlayerData].

/**
 * player-store — observability layer over the PlayerData singleton.
 *
 * GameState owns the data; this file owns "tell subscribers it changed."
 * Framework-agnostic on purpose: exposes a subscribe/getSnapshot pair that
 * React's useSyncExternalStore consumes, but imports no React. Canvas code
 * may also call editPlayerData — it is the only write path that guarantees
 * both a re-render notification AND a save.
 *
 * THE RULE: version drives re-renders of ALREADY-subscribed components.
 * It has nothing to do with a component's first read — the hook reads
 * getPlayerData() live on every render, so a fresh mount is never stale,
 * even if the singleton was mutated outside this funnel beforehand.
 */
import type { PlayerData } from '../../types';
import { autoSave, getPlayerData } from '../game-state';

const listeners = new Set<() => void>();
let version = 0;

/** useSyncExternalStore subscribe arg. Returns an unsubscribe fn. */
export function subscribePlayerData(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** useSyncExternalStore getSnapshot arg. A primitive — compared by Object.is. */
export function getPlayerDataVersion(): number {
  return version;
}

/**
 * The single safe write path for React (and the recommended one for canvas):
 * mutate the singleton in place → bump version → notify React → persist.
 *
 * `mutate` runs synchronously and receives the live singleton. Do all your
 * field writes inside it; do NOT hold the reference past the call.
 *
 * NOTE: persists on every call (autoSave stringifies the whole save). Fine for
 * discrete user actions. For hot paths (per-frame, drag), see editPlayerDataNoSave.
 */
export function editPlayerData(mutate: (pd: PlayerData) => void): void {
  mutate(getPlayerData());
  version++;
  for (const fn of listeners) fn();
  autoSave();
}

/** Same as editPlayerData but skips the save — caller MUST save later (e.g. on scene exit). */
export function editPlayerDataNoSave(mutate: (pd: PlayerData) => void): void {
  mutate(getPlayerData());
  version++;
  for (const fn of listeners) fn();
}

/**
 * Call after the singleton is REPLACED wholesale (new game / load slot),
 * since the reference changes but no mutate() ran through this funnel.
 * Without this, components mounted across a load won't repaint.
 */
export function notifyPlayerDataReplaced(): void {
  version++;
  for (const fn of listeners) fn();
}
