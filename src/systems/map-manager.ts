/**
 * MapManager — auto-discovers all maps from src/data/maps/*.json via import.meta.glob.
 * Drop a new JSON file in that folder and it is immediately available. No code changes needed.
 */

import { mergeMapWithTemplate } from '../engine/tilemap.js';
import type { TileMapData } from '../engine/tilemap.js';
import { loadTileset } from '../engine/tileset.js';
import { normalizeDialogue } from './npc.js';

// ─── Auto-discover all maps (recursive, excludes templates/ and backup/) ─────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapModules = import.meta.glob<{ default: any }>([
  '../data/maps/**/*.json',
  '!../data/maps/templates/**',
  '!../data/maps/backup/**',
]);

// ─── Auto-discover templates ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const templateModules = import.meta.glob<{ default: any }>('../data/maps/templates/*.json');

function mapIdFromPath(path: string): string {
  return path.replace(/^.*\/maps\//, '').replace(/\.json$/, '');
}
function templateIdFromPath(path: string): string {
  return path.replace(/^.*\/templates\//, '').replace(/\.json$/, '');
}

// Fast id → module-path lookup built once at module init
const mapPathById: Record<string, string> = Object.fromEntries(
  Object.keys(mapModules).map((k) => [mapIdFromPath(k), k]),
);

/** Return bilingual display name for a map ID.
 *  Reads `label` from the map's JSON (once cached). Falls back to `name` then raw ID.
 *  To set a display name: add `"label": { "en": "...", "he": "..." }` to the map JSON. */
export function getMapDisplayName(mapId: string): { en: string; he: string } {
  const cached = mapCache.get(mapId);
  if (cached?.label?.en || cached?.label?.he) {
    return { en: cached.label.en ?? mapId, he: cached.label.he ?? mapId };
  }
  if (cached?.name) return { en: cached.name, he: cached.name }; // TODO: remove once all maps use label
  return { en: mapId, he: mapId };
}

/** Search cached (already-loaded) maps to find which map contains a trainer with the given ID. */
export function findMapForTrainer(trainerId: string): string | null {
  for (const [mapId, mapData] of mapCache) {
    if (mapData.npcs?.some((npc) => npc.id === trainerId)) return mapId;
  }
  return null;
}

/** Cache of already-loaded map data. */
const mapCache = new Map<string, TileMapData>();

/** The currently active map ID. */
let currentMapId: string | null = null;

/** Load a map by ID. Returns cached data if already loaded. */
export async function loadMap(id: string): Promise<TileMapData> {
  const cached = mapCache.get(id);
  // Return a fresh copy each time so runtime mutations (npc.hidden, npc.x/y, etc.)
  // from the previous session don't leak into the next map load.
  if (cached) return { ...cached, npcs: cached.npcs?.map((npc) => ({ ...npc })) ?? [] };

  const loader = mapModules[mapPathById[id]];
  if (!loader) {
    throw new Error(`Map "${id}" not found in maps/ folder. Available: ${Object.keys(mapPathById).sort().join(', ')}`);
  }

  const module = await loader();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data = module.default as TileMapData & { template?: string };

  if (data.template) {
    const templatePath = Object.keys(templateModules).find((k) => templateIdFromPath(k) === data.template);
    if (!templatePath) throw new Error(`Map template "${data.template}" not found in templates/ folder.`);
    const templateModule = await templateModules[templatePath]();
    data = mergeMapWithTemplate(data, templateModule.default);
  }

  data.id = id;

  if (data.npcs) {
    for (const npc of data.npcs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (npc.dialogue) npc.dialogue = normalizeDialogue(npc.dialogue as any);
    }
  }

  if (data.tileset) await loadTileset(data.tileset);
  mapCache.set(id, data);
  // Return a clone so the caller's runtime mutations (npc.x/y, hidden, facing)
  // don't pollute the cache — every load starts from clean JSON-original values.
  return { ...data, npcs: data.npcs?.map((npc) => ({ ...npc })) ?? [] };
}

/** Get all available map IDs (excludes templates and backups). */
export function getAllMapIds(): string[] {
  return Object.keys(mapPathById).sort();
}

/** Get the current map ID. */
export function getCurrentMapId(): string | null {
  return currentMapId;
}

/** Get cached map data by ID. Returns undefined if the map hasn't been loaded yet. */
export function getCachedMap(mapId: string): TileMapData | undefined {
  return mapCache.get(mapId);
}

/** Set the current map ID (called when transitioning). */
export function setCurrentMapId(id: string): void {
  currentMapId = id;
}
