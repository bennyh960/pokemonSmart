/**
 * Rematch call — a phone-contact trainer who is ready for a rematch calls the player
 * when they walk onto that trainer's map: "I'm here, waiting for you!"
 *
 * One call per readiness: the defeat count it was made for is kept on the trainer's
 * encounter state (`rematchCalledAt`), so the next call comes only after the next win.
 */

import { registerCutscene, type CutsceneDef } from '../data/story/cutscenes.js';
import { getCharacterInfo } from '../engine/character-sprites.js';
import { tBoth } from '../i18n/i18n.js';
import { getPokemonDisplayName } from '../services/pokemon-data.js';
import type { PlayerData } from '../types/index.js';
import type { TileMapData } from '../engine/tilemap.js';
import { isNPCVisible, type BilingualText, type TrainerData } from './npc.js';
import { getReencounterStatus } from './reencounter.js';
import { getMapDisplayName } from './map-manager.js';
import { queueCutscene } from './story-engine.js';

export const REMATCH_CALL_ID = 'rematch-call';

const CALL_LINE_KEYS = ['rematch.call.waiting1', 'rematch.call.waiting2', 'rematch.call.waiting3'];

const callStep = {
  type: 'dialogue' as const,
  speakerId: undefined as string | undefined,
  speakerName: undefined as BilingualText | undefined,
  lines: [] as BilingualText[],
};
const callDef: CutsceneDef = { id: REMATCH_CALL_ID, phoneCaller: { en: '', he: '' }, steps: [callStep] };
registerCutscene(callDef);

function trainerName(trainer: TrainerData): BilingualText {
  return trainer.name ?? getCharacterInfo(trainer.spriteType)?.name ?? { en: trainer.id, he: trainer.id };
}

/** A phone-contact trainer on this map that is ready for a rematch and hasn't called about it yet. */
export function findRematchCaller(pd: PlayerData, map: TileMapData): TrainerData | null {
  if (!map.id) return null;
  const contactIds = new Set(pd.phoneContacts.filter((c) => c.mapId === map.id).map((c) => c.npcId));
  if (contactIds.size === 0) return null;
  const trainers = (map.npcs ?? []).filter(
    (npc): npc is TrainerData => npc.type === 'trainer' && contactIds.has(npc.id),
  );
  return (
    trainers.find((trainer) => {
      const state = pd.trainerEncounters[trainer.id];
      return (
        state &&
        state.rematchCalledAt !== state.count &&
        isNPCVisible(trainer, pd.flags, pd.party) &&
        getReencounterStatus(trainer).eligible
      );
    }) ?? null
  );
}

/** Queue the call from a ready trainer on this map. Returns true when a call was queued. */
export function startRematchCall(pd: PlayerData, map: TileMapData): boolean {
  const trainer = findRematchCaller(pd, map);
  if (!trainer) return false;

  const name = trainerName(trainer);
  const strongest = trainer.party.reduce((a, b) => (b.level > a.level ? b : a), trainer.party[0]);
  const pokemon = strongest ? getPokemonDisplayName(strongest.pokemonId) : '';
  const place = getMapDisplayName(map.id ?? '');

  callDef.phoneCaller = name;
  callStep.speakerId = trainer.id;
  callStep.speakerName = name;
  callStep.lines = [
    tBoth('rematch.call.greeting', { player: pd.name, trainer: name }),
    tBoth(CALL_LINE_KEYS[Math.floor(Math.random() * CALL_LINE_KEYS.length)], { pokemon }),
    tBoth('rematch.call.where', { place }),
  ];
  if (!queueCutscene(REMATCH_CALL_ID)) return false;

  const state = pd.trainerEncounters[trainer.id];
  state.rematchCalledAt = state.count;
  return true;
}
