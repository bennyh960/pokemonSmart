import { describe, expect, it, vi } from 'vitest';

// game-state touches `window` in dev mode and save.ts creates a Supabase client — stub both for node
vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../auth/supabase-client.js', () => ({ supabase: {} }));

import '../../data/story/global-gate-config.js';
import { getGate } from '../../data/story/gates.js';
import { MapId } from '../../data/maps/map-ids.js';
import { getAutoGateIdForMap } from '../../systems/story-engine.js';
import { getMiniGame, resolveMiniGames } from '../registry.js';

describe('lab gates', () => {
  const labs = [
    MapId.SUMVILLE_LAB,
    MapId.PERCENTILE_LAB,
    MapId.ZEROVILLE_ALGORITHMA_LAB,
    MapId.MINUSBURG_LAB,
    MapId.MULTIPLIA_LAB,
    MapId.DIVIDIA_LAB,
    MapId.FRACTALIS_LAB,
    MapId.SYMMETRIKA_LAB,
  ];

  it('each lab has its own gate that plays a registered logic mini-game', () => {
    for (const mapId of labs) {
      const gate = getGate(`auto-lab-${mapId}`);
      expect(gate?.id, mapId).toBe(`auto-lab-${mapId}`);
      const ids = resolveMiniGames(gate!.miniGame!);
      expect(ids.length, mapId).toBeGreaterThan(0);
      const allowed = mapId === MapId.ZEROVILLE_ALGORITHMA_LAB ? ['logic', 'english'] : ['logic'];
      for (const id of ids) expect(allowed, id).toContain(getMiniGame(id).category);
      expect(ids.some((id) => getMiniGame(id).category === 'logic'), mapId).toBe(true);
    }
  });

  it('the Zeroville lab (where players heal all game) also plays every English game', () => {
    const ids = resolveMiniGames(getGate(`auto-lab-${MapId.ZEROVILLE_ALGORITHMA_LAB}`)!.miniGame!);
    expect(ids).toEqual(resolveMiniGames({ category: 'logic', extraCategories: ['english'] }));
    expect(ids.filter((id) => getMiniGame(id).category === 'english').length).toBeGreaterThan(1);
  });

  it('libraries have no entry gate — English is played at the Word Board by choice', () => {
    const libraries = (Object.values(MapId) as string[]).filter((id) => id.endsWith('/library'));
    expect(libraries.length).toBeGreaterThan(0);
    for (const mapId of libraries) {
      expect(getAutoGateIdForMap(mapId), mapId).toBeUndefined();
    }
  });

  it('question gates stay question gates', () => {
    expect(getGate('auto-pokecenter')?.miniGame).toBeUndefined();
    expect(getGate(`auto-gym-${MapId.SUMVILLE_GYM}`)?.miniGame).toBeUndefined();
  });
});
