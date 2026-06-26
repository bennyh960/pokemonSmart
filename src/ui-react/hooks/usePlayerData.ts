import { useSyncExternalStore } from 'react';
import { getPlayerData } from '../../systems/game-state.js';
import type { PlayerData } from '../../types/index.js';
import { editPlayerData, getPlayerDataVersion, subscribePlayerData } from '../../systems/player-store/player-store.js';
//

type MutatePlayerData = (recipe: (draft: PlayerData) => void) => void;

/**
 * The only React entry point to player data.
 *   pd      — live, read-only snapshot. Reads are fresh every render.
 *   mutate  — the write funnel: mutate(pd => { pd.x = y }). Mutate IN PLACE, no spread, no return.
 *   version — bumps on every mutate; use in deps arrays to react to in-place changes.
 */
export function usePlayerData(): readonly [PlayerData, MutatePlayerData, number] {
  const version = useSyncExternalStore(subscribePlayerData, getPlayerDataVersion);
  return [getPlayerData(), editPlayerData, version] as const;
}
