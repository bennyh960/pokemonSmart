import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../auth/supabase-client.js', () => ({ supabase: {} }));

import { startNewGame } from '../game-state.js';
import { findRematchCaller, REMATCH_CALL_ID, startRematchCall } from '../rematch-call.js';
import { consumePendingCutscene } from '../story-engine.js';
import { getCutscene } from '../../data/story/cutscenes.js';
import type { TileMapData } from '../../engine/tilemap.js';
import type { TrainerData } from '../npc.js';

const trainer = {
  id: 'r1-camper',
  type: 'trainer',
  x: 1,
  y: 1,
  spriteType: 'camper',
  name: { en: 'Camper Leo', he: 'החניך ליאו' },
  party: [{ pokemonId: 25, level: 8 }],
  reencounter: { count: 3, lvlStep: 2 },
} as unknown as TrainerData;
const map = { id: 'route-1', npcs: [trainer] } as unknown as TileMapData;

function setup() {
  const pd = startNewGame();
  pd.name = 'Ash';
  pd.phoneContacts = [{ npcId: trainer.id, mapId: 'route-1' }];
  pd.trainerEncounters[trainer.id] = { count: 1, lastDefeatedAt: 0 };
  consumePendingCutscene();
  return pd;
}

describe('rematch call', () => {
  it('a ready contact on the map calls once, by name, saying where they wait', () => {
    const pd = setup();
    expect(startRematchCall(pd, map)).toBe(true);
    expect(consumePendingCutscene()).toBe(REMATCH_CALL_ID);
    const def = getCutscene(REMATCH_CALL_ID)!;
    expect(def.phoneCaller?.en).toBe('Camper Leo');
    const step = def.steps[0];
    if (step.type !== 'dialogue' || typeof step.lines === 'function') throw new Error('expected lines');
    expect(step.lines[0].en).toContain('Ash');
    expect(step.lines.at(-1)!.he.length).toBeGreaterThan(0);

    // already called for this readiness → silent until the next win
    expect(startRematchCall(pd, map)).toBe(false);
    pd.trainerEncounters[trainer.id].count = 2;
    expect(findRematchCaller(pd, map)?.id).toBe(trainer.id);
  });

  it('no call when the trainer is not a contact, on another map, or used up', () => {
    const pd = setup();
    expect(findRematchCaller(pd, { ...map, id: 'route-2' } as TileMapData)).toBeNull();
    pd.trainerEncounters[trainer.id].count = 4; // > reencounter.count
    expect(findRematchCaller(pd, map)).toBeNull();
    pd.trainerEncounters[trainer.id].count = 1;
    pd.phoneContacts = [];
    expect(findRematchCaller(pd, map)).toBeNull();
  });
});
