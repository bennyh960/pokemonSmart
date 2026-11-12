/**
 * Pokédex ownership queries shared by the Pokédex screen and battle UI.
 */

import { getEvolutionChain } from '../services/pokemon-data.js';
import type { CaughtStatus, PlayerData } from '../types/index.js';

/** A species counts as owned once caught — releasing it later doesn't undo that. */
export function isCaughtStatus(status: CaughtStatus | undefined): boolean {
  return status === 'caught' || status === 'release';
}

/** Each stage's parent in its chain (falls back to the previous stage for linear chains). */
function parentOf(stages: { id: number; evolvesFromId?: number | null }[], index: number): number | null {
  const s = stages[index];
  if (s.evolvesFromId !== undefined) return s.evolvesFromId ?? null;
  return index > 0 ? stages[index - 1].id : null;
}

/**
 * True when the player has caught this species or any species in its own
 * evolution line (ancestors + descendants). Sibling branches don't count —
 * catching Vaporeon marks Eevee, not Jolteon.
 */
export function hasCaughtEvolutionLine(pd: PlayerData, pokemonId: number): boolean {
  const owned = (id: number) => isCaughtStatus(pd.pokedex?.[id]);
  if (owned(pokemonId)) return true;

  const chain = getEvolutionChain(pokemonId);
  if (!chain) return false;
  const stages = chain.stages as { id: number; evolvesFromId?: number | null }[];
  const parent = new Map(stages.map((s, i) => [s.id, parentOf(stages, i)]));

  // Ancestors
  for (let p = parent.get(pokemonId); p != null; p = parent.get(p)) {
    if (owned(p)) return true;
  }
  // Descendants
  const isDescendant = (id: number): boolean => {
    for (let p = parent.get(id); p != null; p = parent.get(p)) if (p === pokemonId) return true;
    return false;
  };
  return stages.some((s) => s.id !== pokemonId && owned(s.id) && isDescendant(s.id));
}
