/**
 * MapManager - Lazy-loading map registry for dynamic map transitions.
 *
 * Maps are registered upfront with a loader function (dynamic import).
 * When a map is needed, it is loaded on demand and cached.
 */

import type { TileMapData } from '../engine/tilemap.js';
import { loadTileset } from '../engine/tileset.js';

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
registerMap('route-1', () => import('../data/maps/route-1.json').catch(() => import('../data/maps/test-map.json')));
registerMap('sumville', () => import('../data/maps/sumville.json').catch(() => import('../data/maps/test-map.json')));
registerMap('pokecenter-interior', () => import('../data/maps/pokecenter-interior.json').catch(() => import('../data/maps/test-map.json')));
registerMap('mart-interior', () => import('../data/maps/mart-interior.json').catch(() => import('../data/maps/test-map.json')));
