/**
 * Phone contacts — the one place that decides who is on the player's phone.
 *
 * A trainer joins after the first defeat when it has a `reencounter` config that isn't
 * `infinite` and doesn't say `addToPhone: false` (default = added). A day-care NPC joins
 * while it holds a deposited Pokémon.
 *
 * `findMissingPhoneContacts` re-derives the list from the save (defeat flags + day-care entries),
 * so contacts lost to the v19 reset — or to the old `addToPhone === true` check — come back.
 */

import type { PlayerData, PhoneContactInfo } from '../types/index.js';
import type { NPCData, ReencounterConfig } from './npc.js';
import { findNpcsInAllMaps } from './map-manager.js';

/** Whether a trainer with this re-encounter config belongs on the phone after its first defeat. */
export function isPhoneTrainer(rc: ReencounterConfig | undefined): boolean {
  return !!rc && !rc.infinite && rc.addToPhone !== false;
}

/** Add a contact unless it's already there. Returns true when it was added. */
export function addPhoneContact(pd: PlayerData, npcId: string, mapId: string): boolean {
  if (!pd.phoneContacts) pd.phoneContacts = [];
  if (pd.phoneContacts.some((c) => c.npcId === npcId)) return false;
  pd.phoneContacts.push({ npcId, mapId });
  return true;
}

function wasDefeated(pd: PlayerData, trainerId: string): boolean {
  return !!pd.flags?.[`trainer-${trainerId}-defeated`] || !!pd.trainerEncounters?.[trainerId];
}

/**
 * Every contact the save has earned but the phone is missing (read-only — apply with `addPhoneContact`).
 * Defeated phone trainers anywhere in the world, plus day-care NPCs holding a Pokémon.
 */
export async function findMissingPhoneContacts(pd: PlayerData): Promise<PhoneContactInfo[]> {
  const { hits } = await findNpcsInAllMaps(
    (npc: NPCData) =>
      npc.type === 'trainer' &&
      isPhoneTrainer((npc as { reencounter?: ReencounterConfig }).reencounter) &&
      wasDefeated(pd, npc.id),
  );
  const earned: PhoneContactInfo[] = hits.map(({ npc, mapId }) => ({ npcId: npc.id, mapId }));
  for (const entry of Object.values(pd.awayPokemon ?? {})) {
    if (entry.kind === 'day-care') earned.push({ npcId: entry.npcId, mapId: entry.mapId });
  }
  const have = new Set((pd.phoneContacts ?? []).map((c) => c.npcId));
  return earned.filter((c) => !have.has(c.npcId));
}
