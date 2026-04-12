/**
 * Re-encounter system — handles trainer rematches over time.
 *
 * Trainers with a `reencounter` config can be fought multiple times.
 * Each subsequent fight uses levelled-up Pokemon (evolution resolved) and
 * optionally adds extra party members. Money is rewarded each time;
 * items only on the first encounter.
 *
 * After first defeat, trainers with `addToPhone !== false` are added to the
 * player's phone list so they can be called to check readiness and location.
 */

import type { TrainerData } from './npc.js';
import type { TrainerEncounterState } from '../types/index.js';
import { getPlayerData, hasActiveGame } from './game-state.js';
import { getPokemon } from '../services/pokemon-data.js';
import { getEvolutionChain } from '../services/pokemon-data.js';
import { createPokemonFromData } from './encounter.js';
import { getCurrentMapId, getMapDisplayName } from './map-manager.js';
import type { Pokemon } from '../types/index.js';

const MS_PER_HOUR = 3_600_000;

/** Check if a trainer is eligible for a re-encounter right now. */
export type ReencounterStatus =
  | { eligible: true; encounterIndex: number }
  | { eligible: false; reason: 'no-config' | 'max-reached' | 'cooldown'; hoursLeft?: number; minutesLeft?: number };

function cooldownStatus(msRemaining: number): ReencounterStatus {
  const minutesLeft = Math.ceil(msRemaining / 60_000);
  if (minutesLeft < 60) return { eligible: false, reason: 'cooldown', minutesLeft };
  return { eligible: false, reason: 'cooldown', hoursLeft: Math.ceil(msRemaining / MS_PER_HOUR) };
}

export function getReencounterStatus(trainer: TrainerData): ReencounterStatus {
  if (!trainer.reencounter) return { eligible: false, reason: 'no-config' };
  if (!hasActiveGame()) return { eligible: false, reason: 'no-config' };

  const pd = getPlayerData();
  const state: TrainerEncounterState | undefined = pd.trainerEncounters[trainer.id];

  // Never beaten yet — the initial encounter is handled by the normal defeated-flag check
  if (!state) return { eligible: false, reason: 'no-config' };

  const rc = trainer.reencounter;
  // count tracks total defeats; re-encounter count = total allowed additional fights
  if (state.count > rc.count) return { eligible: false, reason: 'max-reached' };

  // ── Trigger mode resolution ────────────────────────────────────────────────
  if (rc.triggerFlag && rc.triggerFlag.trim()) {
    // Flag-based trigger: reencounter unlocks when a story flag is set (+ optional delay)
    if (!pd.flags[rc.triggerFlag]) {
      return { eligible: false, reason: 'cooldown' };
    }
    if (rc.triggerFlagDelayHours && rc.triggerFlagDelayHours > 0) {
      const timestamps = pd.flagTimestamps ?? {};
      const flagSetAt = timestamps[rc.triggerFlag] ?? 0;
      const elapsed = Date.now() - flagSetAt;
      const required = rc.triggerFlagDelayHours * MS_PER_HOUR;
      if (elapsed < required) {
        return cooldownStatus(required - elapsed);
      }
    }
    return { eligible: true, encounterIndex: state.count };
  }

  // Classic time-after-defeat mode
  if (rc.timeInterval && rc.timeInterval > 0) {
    const elapsed = Date.now() - state.lastDefeatedAt;
    const required = rc.timeInterval * MS_PER_HOUR;
    if (elapsed < required) {
      return cooldownStatus(required - elapsed);
    }
  }

  return { eligible: true, encounterIndex: state.count };
}

/**
 * Resolve which Pokemon species a base species becomes at a given level,
 * following level-up evolution chains (e.g. Charmander→Charmeleon at 16).
 * Returns the evolved species ID.
 */
export function resolveSpeciesAtLevel(basePokemonId: number, level: number): number {
  const chain = getEvolutionChain(basePokemonId);
  if (!chain) return basePokemonId;

  // Walk the chain stages in order — last stage with minLevel <= target level wins
  let resolved = basePokemonId;
  for (const stage of chain.stages) {
    if (stage.trigger === 'level-up' && stage.minLevel !== null && level >= stage.minLevel) {
      resolved = stage.id;
    }
  }
  return resolved;
}

/**
 * Build the scaled party for a re-encounter.
 * - Original party members get `lvlStep * encounterIndex` added to their base level.
 * - Evolution is resolved for the boosted level.
 * - partyExtra members are added (also at boosted level) from encounterIndex >= 1.
 */
export function buildReencounterParty(trainer: TrainerData, encounterIndex: number): Pokemon[] {
  const rc = trainer.reencounter!;
  const boost = rc.lvlStep * encounterIndex;

  const party: Pokemon[] = [];

  for (const slot of trainer.party) {
    const boostedLevel = slot.level + boost;
    const speciesId = resolveSpeciesAtLevel(slot.pokemonId, boostedLevel);
    const data = getPokemon(speciesId);
    if (data) party.push(createPokemonFromData(data, boostedLevel));
  }

  if (rc.partyExtra && encounterIndex >= 1) {
    for (const extra of rc.partyExtra) {
      const boostedLevel = extra.level + boost;
      const speciesId = resolveSpeciesAtLevel(extra.pokemonId, boostedLevel);
      const data = getPokemon(speciesId);
      if (data) party.push(createPokemonFromData(data, boostedLevel));
    }
  }

  return party;
}

/** Record a trainer defeat. Call this after the player wins a re-encounter battle. */
export function recordTrainerDefeat(trainerId: string): void {
  if (!hasActiveGame()) return;
  const pd = getPlayerData();
  const prev = pd.trainerEncounters[trainerId];
  pd.trainerEncounters[trainerId] = {
    count: (prev?.count ?? 0) + 1,
    lastDefeatedAt: Date.now(),
  };
}

/**
 * Register the trainer in the player's phone contacts (if `addToPhone !== false`).
 * Stores name + location for display in the phone scene.
 * Safe to call multiple times — deduplicates automatically.
 */
export function addTrainerToPhone(trainer: TrainerData): void {
  if (!hasActiveGame()) return;
  if (trainer.reencounter?.addToPhone === false) return;
  const pd = getPlayerData();
  if (pd.phoneContacts.some(c => c.trainerId === trainer.id)) return;

  const mapId = getCurrentMapId() ?? undefined;
  const trainerName = trainer.name ?? { en: trainer.id, he: trainer.id };
  const rc = trainer.reencounter;
  pd.phoneContacts.push({
    trainerId: trainer.id,
    trainerName,
    mapId,
    locationEn: trainer.location?.en ?? '',
    locationHe: trainer.location?.he ?? '',
    reencounterConfig: rc ? {
      count: rc.count,
      lvlStep: rc.lvlStep,
      timeInterval: rc.timeInterval,
      triggerFlag: rc.triggerFlag,
      triggerFlagDelayHours: rc.triggerFlagDelayHours,
    } : undefined,
  });
}
