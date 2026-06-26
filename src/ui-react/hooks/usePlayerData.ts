/**
 * usePlayerData — the ONLY React entry point to player data.
 *
 * Returns [pd, editPlayerData]:
 *   - pd   : the live PlayerData, read fresh each render. READ ONLY in render.
 *            Never mutate pd directly in a component — that won't notify or save.
 *   - edit : the funnel. All writes go through it: edit(pd => { pd.money -= 100 }).
 *
 * editPlayerData is a stable module-level function, so returning it never
 * causes extra renders and it's safe in deps arrays without useCallback.
 *
 * Why the hook discards useSyncExternalStore's return value: the snapshot is
 * just a version number used to trigger re-renders. The data itself comes from
 * getPlayerData() so every render — including the first — reads live state.
 */
import { useSyncExternalStore } from 'react';
import type { PlayerData } from '../../types';
import { getPlayerData } from '../../systems/game-state';
import { editPlayerData, getPlayerDataVersion, subscribePlayerData } from '../../systems/player-store/player-store';

// 1. Read side is deeply read-only — direct writes are COMPILE errors.
type DeepReadonly<T> = { readonly [K in keyof T]: DeepReadonly<T[K]> };
type MutatePlayerData = (recipe: (draft: PlayerData) => void) => void;

export function usePlayerData(): readonly [DeepReadonly<PlayerData>, MutatePlayerData] {
  useSyncExternalStore(subscribePlayerData, getPlayerDataVersion);
  return [getPlayerData() as DeepReadonly<PlayerData>, editPlayerData] as const;
}
