import { mergeMapWithTemplate } from '../engine/tilemap.js';
import type { TileMapData } from './types.js';
import { hasFSAccess, saveToDirectory } from './fs-save.js';

/** All map IDs — derived from files in src/data/maps/ (not subdirectories). */
export function getKnownMapIds(): string[] {
  return Object.keys(allMapModules)
    .map(path => path.replace(/^.*\/maps\//, '').replace(/\.json$/, ''))
    .sort();
}

// ─── Template registry (auto-discovered via import.meta.glob) ────────────────
// Drop any .json file into src/data/maps/templates/ — no code changes needed.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const templateModules = import.meta.glob<{ default: any }>('../data/maps/templates/*.json');

// Auto-discover map JSONs to compute template consumer relationships
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const allMapModules = import.meta.glob<{ default: any }>('../data/maps/*.json', { eager: true });

function templateIdFromPath(path: string): string {
  return path.replace(/^.*\/templates\//, '').replace(/\.json$/, '');
}

/** All known template IDs (derived from files in templates/ folder). */
export function getKnownTemplateIds(): string[] {
  return Object.keys(templateModules).map(templateIdFromPath).sort();
}

/** Which map IDs use a given template — computed from actual map files. */
export function getTemplateConsumers(templateId: string): string[] {
  return Object.entries(allMapModules)
    .filter(([, mod]) => mod.default?.template === templateId)
    .map(([path]) => path.replace(/^.*\/maps\//, '').replace(/\.json$/, ''));
}

/** Load a raw template JSON (unmerged). Injects id/name so the editor knows what to call the file. */
export async function loadTemplateFromProject(templateId: string): Promise<TileMapData> {
  const path = Object.keys(templateModules).find(k => templateIdFromPath(k) === templateId);
  if (!path) throw new Error(`Template "${templateId}" not found in templates/ folder.`);
  const raw = (await templateModules[path]()).default as Record<string, unknown>;
  return { ...raw, id: (raw.id as string) || templateId, name: (raw.name as string) || templateId } as unknown as TileMapData;
}

/** Load a map JSON without merging its template (returns raw instance data). */
export async function loadMapRaw(mapId: string): Promise<TileMapData & { template?: string }> {
  const module = await import(`../data/maps/${mapId}.json`);
  return module.default as TileMapData & { template?: string };
}

/** Save map data to a specific destination type ('map' or 'map-template'). */
export async function saveMapWithType(data: TileMapData, type: 'map' | 'map-template'): Promise<void> {
  const fileName = `${data.id ?? data.name ?? 'map'}.json`;
  const json = exportMapJSON(data);
  if (hasFSAccess()) {
    await saveToDirectory(type, fileName, json);
    return;
  }
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Save current map data as a new template. */
export async function saveTemplate(name: string, data: TileMapData): Promise<void> {
  const templateData = { ...(data as unknown as Record<string, unknown>), id: name, name, npcs: [] };
  delete (templateData as Record<string, unknown>).template;
  await saveMapWithType(templateData as unknown as TileMapData, 'map-template');
}

// ─────────────────────────────────────────────────────────────────────────────

/** Load a map JSON from the project's data directory. Merges template if present. */
export async function loadMapFromProject(mapId: string): Promise<TileMapData> {
  const module = await import(`../data/maps/${mapId}.json`);
  const raw = module.default as TileMapData & { template?: string };
  if (raw.template) {
    const template = await loadTemplateFromProject(raw.template);
    return mergeMapWithTemplate(raw, template);
  }
  return raw;
}

/** Load a map from a user-picked File. */
export async function loadMapFromFile(file: File): Promise<TileMapData> {
  const text = await file.text();
  return JSON.parse(text) as TileMapData;
}

/** Export map data as formatted JSON string. */
export function exportMapJSON(data: TileMapData): string {
  const raw = data as unknown as Record<string, unknown>;
  const tc = raw._templateCounts as { transitions: number; npcs: number; objects: number } | undefined;
  const hasTemplate = !!raw.template;

  // ── Template-backed map ───────────────────────────────────────────────────
  // Save only instance-specific fields; layout and template-provided array
  // items are omitted — they are injected at load time from the template.
  if (hasTemplate && tc) {
    const clone: Record<string, unknown> = {};
    // Identity
    if (raw.id)       clone.id       = raw.id;
    if (raw.name)     clone.name     = raw.name;
    clone.template = raw.template;
    if (raw.tileset)  clone.tileset  = raw.tileset;   // explicit for readability
    if (raw.label)    clone.label    = raw.label;
    if (raw.area)     clone.area     = raw.area;
    if (raw.music)    clone.music    = raw.music;
    if (raw.encounterTableId !== undefined) clone.encounterTableId = raw.encounterTableId;
    if (raw.spawn)    clone.spawn    = raw.spawn;
    if (raw.music)    clone.music    = raw.music;

    // Slice to instance-only array portions
    const instTransitions = (data.transitions ?? []).slice(tc.transitions);
    const instNpcs        = (data.npcs        ?? []).slice(tc.npcs);
    const instObjects     = (data.objects     ?? []).slice(tc.objects);
    if (instTransitions.length) clone.transitions = instTransitions;
    if (instNpcs.length)        clone.npcs        = instNpcs;
    if (raw.interactiveItems && Object.keys(raw.interactiveItems as object).length > 0)
      clone.interactiveItems = raw.interactiveItems;

    let json = JSON.stringify(clone, null, 2);
    if (instObjects.length) {
      json = json.slice(0, -1) + ',\n  "objects": ' +
        JSON.stringify(instObjects, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n') +
        '\n}';
    }
    return json;
  }

  // ── Normal map (no template) ──────────────────────────────────────────────
  const clone = { ...data } as Record<string, unknown>;
  const tiles  = data.tiles;
  const objects = data.objects;
  const objLayer = data.objectLayer;
  delete clone._templateCounts;
  delete clone.tiles;
  delete clone.objects;
  delete clone.objectLayer;

  let json = JSON.stringify(clone, null, 2);

  const tileRows = tiles.map((row) => '    ' + JSON.stringify(row));
  json = json.slice(0, -1) + ',\n  "tiles": [\n' + tileRows.join(',\n') + '\n  ]';

  if (objects && objects.length > 0) {
    json += ',\n  "objects": ' +
      JSON.stringify(objects, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');
  }

  if (objLayer) {
    const objRows = objLayer.map((row) => '    ' + JSON.stringify(row));
    json += ',\n  "objectLayer": [\n' + objRows.join(',\n') + '\n  ]';
  }

  json += '\n}';
  return json;
}

/**
 * Save map to disk.
 * Uses File System Access API if available (picks folder once, then direct writes with backup).
 * Falls back to browser download otherwise.
 */
/** Save map to disk (always to the maps directory). Use saveMapWithType for templates. */
export async function saveMap(data: TileMapData): Promise<void> {
  await saveMapWithType(data, 'map');
}

/** Copy map JSON to clipboard. */
export async function copyMapToClipboard(data: TileMapData): Promise<void> {
  await navigator.clipboard.writeText(exportMapJSON(data));
}

/** Create a blank map. */
export function createBlankMap(width: number, height: number): TileMapData {
  return {
    id: 'new-map',
    name: 'New Map',
    tileset: 'overworld',
    width,
    height,
    tileSize: 16,
    spawn: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
    transitions: [],
    npcs: [],
    music: 'town',
    encounterTableId: null,
    tiles: Array.from({ length: height }, () => Array(width).fill('g1')),
    objectLayer: Array.from({ length: height }, () => Array(width).fill(null)),
  };
}
