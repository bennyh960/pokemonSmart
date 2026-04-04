/**
 * MapManager - Lazy-loading map registry for dynamic map transitions.
 *
 * Maps are registered upfront with a loader function (dynamic import).
 * When a map is needed, it is loaded on demand and cached.
 */

import type { TileMapData } from '../engine/tilemap.js';
import { loadTileset } from '../engine/tileset.js';
import { normalizeDialogue } from './npc.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapLoader = () => Promise<{ default: any }>;

/** Registry of map loaders keyed by map ID. */
const mapLoaders = new Map<string, MapLoader>();

/** Cache of already-loaded map data. */
const mapCache = new Map<string, TileMapData>();

/** The currently active map ID. */
let currentMapId: string | null = null;

/** Register a map with a lazy loader. */
export function registerMap(id: string, loader: MapLoader): void {
  mapLoaders.set(id, loader);
}

/** Load a map by ID. Returns cached data if already loaded. */
export async function loadMap(id: string): Promise<TileMapData> {
  const cached = mapCache.get(id);
  if (cached) return cached;

  const loader = mapLoaders.get(id);
  if (!loader) {
    throw new Error(`Map "${id}" is not registered. Available: ${[...mapLoaders.keys()].join(', ')}`);
  }

  const module = await loader();
  const data = module.default as TileMapData;
  // Ensure the map has an id field
  if (!data.id) {
    data.id = id;
  }
  // Normalize legacy string[] dialogue to BilingualText[]
  if (data.npcs) {
    for (const npc of data.npcs) {
      if (npc.dialogue) {
        npc.dialogue = normalizeDialogue(npc.dialogue as any);
      }
    }
  }
  // Pre-load tileset if the map declares one
  if (data.tileset) {
    await loadTileset(data.tileset);
  }
  mapCache.set(id, data);
  return data;
}

/** Get the current map ID. */
export function getCurrentMapId(): string | null {
  return currentMapId;
}

/** Set the current map ID (called when transitioning). */
export function setCurrentMapId(id: string): void {
  currentMapId = id;
}

// ─── Register all known maps ────────────────────────────────────

registerMap('zeroville', () => import('../data/maps/zeroville.json').catch(() => import('../data/maps/test-map.json')));
registerMap('zeroville-house-tl', () => import('../data/maps/zeroville-house-tl.json').catch(() => import('../data/maps/test-map.json')));
registerMap('zeroville-house-tr', () => import('../data/maps/zeroville-house-tr.json').catch(() => import('../data/maps/test-map.json')));
registerMap('zeroville-house-br', () => import('../data/maps/zeroville-house-br.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-1', () => import('../data/maps/route-1.json').catch(() => import('../data/maps/test-map.json')));
registerMap('sumville', () => import('../data/maps/sumville.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-2', () => import('../data/maps/route-2.json').catch(() => import('../data/maps/test-map.json')));
registerMap('safari', () => import('../data/maps/safari.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-3', () => import('../data/maps/route-3.json').catch(() => import('../data/maps/test-map.json')));
registerMap('minusburg', () => import('../data/maps/minusburg.json').catch(() => import('../data/maps/test-map.json')));
registerMap('sumville-house-1', () => import('../data/maps/sumville-house-1.json').catch(() => import('../data/maps/test-map.json')));
registerMap('sumville-house-2', () => import('../data/maps/sumville-house-2.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route1-house', () => import('../data/maps/route1-house.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-4', () => import('../data/maps/route-4.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-10', () => import('../data/maps/route-10.json').catch(() => import('../data/maps/test-map.json')));
registerMap('dividia-house-1', () => import('../data/maps/dividia-house-1.json').catch(() => import('../data/maps/test-map.json')));
registerMap('dividia-house-2', () => import('../data/maps/dividia-house-2.json').catch(() => import('../data/maps/test-map.json')));
registerMap('dividia-house-3', () => import('../data/maps/dividia-house-3.json').catch(() => import('../data/maps/test-map.json')));
registerMap('dividia-house-4', () => import('../data/maps/dividia-house-4.json').catch(() => import('../data/maps/test-map.json')));
registerMap('pokecenter-mart-interior', () => import('../data/maps/pokecenter-mart-interior.json').catch(() => import('../data/maps/test-map.json')));
registerMap('pokecenter-2', () => import('../data/maps/pokecenter-2.json').catch(() => import('../data/maps/test-map.json')));
registerMap('mart-interior', () => import('../data/maps/mart-interior.json').catch(() => import('../data/maps/test-map.json')));
registerMap('deep-forest', () => import('../data/maps/deep-forest.json').catch(() => import('../data/maps/test-map.json')));
registerMap('mountain-pass', () => import('../data/maps/mountain-pass.json').catch(() => import('../data/maps/test-map.json')));
registerMap('house-3-i', () => import('../data/maps/house-3-i.json').catch(() => import('../data/maps/test-map.json')));
registerMap('oak lab', () => import('../data/maps/oak lab.json').catch(() => import('../data/maps/test-map.json')));
// Story-canonical IDs — point to renamed/new map files
registerMap('algorithma-lab', () => import('../data/maps/algorithma-lab.json').catch(() => import('../data/maps/test-map.json')));
registerMap('multiplia', () => import('../data/maps/multiplia.json').catch(() => import('../data/maps/test-map.json')));
registerMap('dividia', () => import('../data/maps/dividia.json').catch(() => import('../data/maps/test-map.json')));
registerMap('primore', () => import('../data/maps/primore.json').catch(() => import('../data/maps/test-map.json')));
registerMap('fake-pokecenter', () => import('../data/maps/fake-pokecenter.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-5', () => import('../data/maps/route-5.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-6', () => import('../data/maps/route-6.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-7', () => import('../data/maps/route-7.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-8', () => import('../data/maps/route-8.json').catch(() => import('../data/maps/test-map.json')));
registerMap('symmetrika', () => import('../data/maps/symmetrika.json').catch(() => import('../data/maps/test-map.json')));
registerMap('symmetrika-terminal', () => import('../data/maps/symmetrika-terminal.json').catch(() => import('../data/maps/test-map.json')));
registerMap('integrala', () => import('../data/maps/integrala.json').catch(() => import('../data/maps/test-map.json')));
registerMap('absoluta', () => import('../data/maps/absoluta.json').catch(() => import('../data/maps/test-map.json')));
registerMap('nullx-tower', () => import('../data/maps/nullx-tower.json').catch(() => import('../data/maps/test-map.json')));
registerMap('nullx-floor-6', () => import('../data/maps/nullx-floor-6.json').catch(() => import('../data/maps/test-map.json')));
// Cave maps
registerMap('dividia-cave', () => import('../data/maps/dividia-cave.json').catch(() => import('../data/maps/test-map.json')));
registerMap('symmetrika-cave', () => import('../data/maps/symmetrika-cave.json').catch(() => import('../data/maps/test-map.json')));
registerMap('mountain-cave', () => import('../data/maps/mountain-cave.json').catch(() => import('../data/maps/test-map.json')));
