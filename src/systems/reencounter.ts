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

import type { TrainerData, ReencounterConfig } from './npc.js';
import type { TrainerEncounterState } from '../types/index.js';
import { getPlayerData, hasActiveGame } from './game-state.js';
import { getPokemon } from '../services/pokemon-data.js';
import { getEvolutionChain } from '../services/pokemon-data.js';
import { createPokemonFromData } from './encounter.js';
import { getCurrentMapId } from './map-manager.js';
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
  // count tracks total defeats; re-encounter count = how many level-boost steps apply
  // infinite overrides the max-reached cap — battles continue at the capped level
  if (state.count > rc.count && !rc.infinite) return { eligible: false, reason: 'max-reached' };

  // All enabled conditions are checked independently — ALL must pass (AND logic).

  // ── Condition 1: Party level gate ─────────────────────────────────────────
  // Player must have ≥1 Pokémon at or above (trainerBaseMaxLevel + lvlStep*i - minPartyLevelBoost)
  if (rc.minPartyLevelBoost != null && rc.minPartyLevelBoost >= 0) {
    // Resolve the trainer's max base party level.
    // trainer.party may be absent when called from the phone scene (fake trainer),
    // in which case a stored maxBasePartyLevel on rc is used as fallback.
    const rcAny = rc as ReencounterConfig & { maxBasePartyLevel?: number };
    let trainerBaseMax = 0;
    if (trainer.party && trainer.party.length > 0) {
      trainerBaseMax = Math.max(...trainer.party.map((p) => p.level));
    } else if (rcAny.maxBasePartyLevel != null) {
      trainerBaseMax = rcAny.maxBasePartyLevel;
    }
    const threshold = trainerBaseMax + rc.lvlStep * state.count - rc.minPartyLevelBoost;
    const playerMaxLevel = pd.party.length > 0 ? Math.max(...pd.party.map((p) => p.level)) : 0;
    if (playerMaxLevel < threshold) return { eligible: false, reason: 'cooldown' };
  }

  // ── Condition 2: Story flag ───────────────────────────────────────────────
  if (rc.triggerFlag && rc.triggerFlag.trim()) {
    if (!pd.flags[rc.triggerFlag]) return { eligible: false, reason: 'cooldown' };
    if (rc.triggerFlagDelayHours && rc.triggerFlagDelayHours > 0) {
      const timestamps = pd.flagTimestamps ?? {};
      const flagSetAt = timestamps[rc.triggerFlag] ?? 0;
      const elapsed = Date.now() - flagSetAt;
      const required = rc.triggerFlagDelayHours * MS_PER_HOUR;
      if (elapsed < required) return cooldownStatus(required - elapsed);
    }
  }

  // ── Condition 3: Time cooldown ────────────────────────────────────────────
  if (rc.timeInterval && rc.timeInterval > 0) {
    const elapsed = Date.now() - state.lastDefeatedAt;
    const required = rc.timeInterval * MS_PER_HOUR;
    if (elapsed < required) return cooldownStatus(required - elapsed);
  }

  // Cap encounterIndex at rc.count so infinite battles stay at max boosted level
  const encounterIndex = rc.infinite ? Math.min(state.count, rc.count) : state.count;
  return { eligible: true, encounterIndex };
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

const getRandomParty = (trainer: TrainerData) => {
  if (trainer.party.length <= 6) return trainer.party;
  const selected: any[] = [];

  const pokemonTypes: Record<string, any[]> = {};
  for (const slot of trainer.party) {
    if (slot.mustInclude) selected.push(slot);

    const data = getPokemon(slot.pokemonId);
    if (data) {
      for (const type of data.types) {
        if (!pokemonTypes[type]) pokemonTypes[type] = [];
        pokemonTypes[type].push(slot);
      }
    }
  }

  // shuffle randomly each type
  for (const type in pokemonTypes) {
    pokemonTypes[type] = pokemonTypes[type].sort(() => Math.random() - 0.5);
  }

  // select randomly from each type until we have 6 pokemon and filter duplicates
  while (selected.length < 6) {
    const types = Object.keys(pokemonTypes).filter((type) => pokemonTypes[type].length > 0);
    if (types.length === 0) break;
    const randomType = types[Math.floor(Math.random() * types.length)];
    const pokemon = pokemonTypes[randomType].shift();
    if (!selected.some((p) => p.pokemonId === pokemon.pokemonId)) {
      selected.push(pokemon);
    }
  }
  // keep must include at the index (must include is index in party )
  return selected.sort((a, b) => {
    if (a.mustInclude && b.mustInclude) {
      return (
        trainer.party.findIndex((p) => p.pokemonId === a.pokemonId) -
        trainer.party.findIndex((p) => p.pokemonId === b.pokemonId)
      );
    }
    if (a.mustInclude) return -1;
    if (b.mustInclude) return 1;
    return 0;
  });
};

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

  if (trainer.party.length > 6) {
    trainer.party = getRandomParty(trainer);
  }

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
  if (trainer.reencounter?.infinite) return; // infinite trainers are never in phone
  if (trainer.reencounter?.addToPhone === false) return;
  const pd = getPlayerData();
  if (pd.phoneContacts.some((c) => c.trainerId === trainer.id)) return;

  const mapId = getCurrentMapId() ?? undefined;
  const trainerName = trainer.name ?? { en: trainer.id, he: trainer.id };
  const rc = trainer.reencounter;
  pd.phoneContacts.push({
    trainerId: trainer.id,
    trainerName,
    mapId,
    locationEn: trainer.location?.en ?? '',
    locationHe: trainer.location?.he ?? '',
    reencounterConfig: rc
      ? {
          count: rc.count,
          lvlStep: rc.lvlStep,
          infinite: rc.infinite,
          timeInterval: rc.timeInterval,
          triggerFlag: rc.triggerFlag,
          triggerFlagDelayHours: rc.triggerFlagDelayHours,
          minPartyLevelBoost: rc.minPartyLevelBoost,
          // Store max base party level so the phone scene can compute level-gate checks
          // without having access to the full trainer data.
          maxBasePartyLevel:
            trainer.party && trainer.party.length > 0 ? Math.max(...trainer.party.map((p) => p.level)) : undefined,
        }
      : undefined,
  });
}
