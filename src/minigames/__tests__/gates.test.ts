import { describe, expect, it, vi } from 'vitest';

// game-state touches `window` in dev mode and save.ts creates a Supabase client — stub both for node
vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../auth/supabase-client.js', () => ({ supabase: {} }));

import '../../data/story/global-gate-config.js';
import { getGate } from '../../data/story/gates.js';
import { MapId } from '../../data/maps/map-ids.js';
import { getMiniGame, resolveMiniGames } from '../registry.js';

describe('library + lab gates', () => {
  const libraries = [MapId.SUMVILLE_LIBRARY, MapId.MINUSBURG_LIBRARY, MapId.MULTIPLIA_LIBRARY, MapId.PERCENTILE_LIBRARY];
  const labs = [MapId.SUMVILLE_LAB, MapId.PERCENTILE_LAB, MapId.ZEROVILLE_ALGORITHMA_LAB];

  it('each building has its own gate that plays a registered mini-game', () => {
    for (const [service, maps] of [
      ['library', libraries],
      ['lab', labs],
    ] as const) {
      for (const mapId of maps) {
        const gate = getGate(`auto-${service}-${mapId}`);
        expect(gate?.id, mapId).toBe(`auto-${service}-${mapId}`);
        const ids = resolveMiniGames(gate!.miniGame!);
        expect(ids.length, mapId).toBeGreaterThan(0);
        for (const id of ids) expect(getMiniGame(id).category, id).toBe(service === 'library' ? 'english' : 'logic');
      }
    }
  });

  it('question gates stay question gates', () => {
    expect(getGate('auto-pokecenter')?.miniGame).toBeUndefined();
    expect(getGate(`auto-gym-${MapId.SUMVILLE_GYM}`)?.miniGame).toBeUndefined();
  });
});
