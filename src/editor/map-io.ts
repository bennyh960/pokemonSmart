import type { TileMapData } from './types.js';
import { hasFSAccess, saveToDirectory } from './fs-save.js';

/** Known map IDs available in the project. */
export function getKnownMapIds(): string[] {
  return [
    // Zeroville area
    'zeroville', 'zeroville-house-tl', 'zeroville-house-tr', 'zeroville-house-br',
    // Act 0 — lab
    'algorithma-lab', 'oak lab',
    // Act 1 — Route 1 → Sumville → Route 2 → Minusburg
    'route-1', 'route1-house', 'sumville', 'sumville-house-1', 'sumville-house-2',
    'sumville-gym', 'sumville-remainder-house',
    'route-2', 'minusburg',
    // Act 2 — Route 3 → Multiplia → Route 4 → Dividia
    'route-3', 'multiplia', 'fake-pokecenter',
    'route-4', 'dividia', 'dividia-house-1', 'dividia-house-2', 'dividia-house-3', 'dividia-house-4',
    // Act 3 — Route 5 → Primore → Route 6 → Symmetrika
    'route-5', 'primore',
    'route-6', 'symmetrika', 'symmetrika-terminal',
    // Act 4 — Route 7 → Integrala → Route 8 → Absoluta
    'route-7', 'integrala',
    'route-8', 'absoluta',
    // Act 5 — NULL-X Tower
    'nullx-tower', 'nullx-floor-6',
    // Caves
    'dividia-cave', 'symmetrika-cave', 'mountain-cave',
    // Interiors / shared
    'mart-interior', 'pokecenter-2', 'pokecenter-mart-interior', 'house-3-i',
    // Side areas
    'safari', 'deep-forest', 'mountain-pass', 'route-10',
    // Legacy / scratch
    'algebria', 'divideburg', 'multitown', 'prime-city',
    'fractalis', 'infinity-plateau', 'logica-heights',
    'test-map',
  ].sort();
}

/** Load a map JSON from the project's data directory. */
export async function loadMapFromProject(mapId: string): Promise<TileMapData> {
  const module = await import(`../data/maps/${mapId}.json`);
  return module.default as TileMapData;
}

/** Load a map from a user-picked File. */
export async function loadMapFromFile(file: File): Promise<TileMapData> {
  const text = await file.text();
  return JSON.parse(text) as TileMapData;
}

/** Export map data as formatted JSON string. */
export function exportMapJSON(data: TileMapData): string {
  // Custom serializer: put tile rows on single lines for compact output
  const clone = { ...data };
  const tiles = clone.tiles;
  const objects = clone.objects;
  const objLayer = clone.objectLayer;

  // Temporarily remove arrays for base serialization
  delete (clone as Record<string, unknown>).tiles;
  delete (clone as Record<string, unknown>).objects;
  delete (clone as Record<string, unknown>).objectLayer;

  // Serialize metadata
  let json = JSON.stringify(clone, null, 2);

  // Insert tiles array with compact rows
  const tileRows = tiles.map(row => '    ' + JSON.stringify(row));
  const tilesStr = '  "tiles": [\n' + tileRows.join(',\n') + '\n  ]';
  json = json.slice(0, -1) + ',\n' + tilesStr;

  // Insert placed objects
  if (objects && objects.length > 0) {
    json += ',\n  "objects": ' + JSON.stringify(objects, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');
  }

  // Legacy objectLayer (deprecated)
  if (objLayer) {
    const objRows = objLayer.map(row => '    ' + JSON.stringify(row));
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
export async function saveMap(data: TileMapData): Promise<void> {
  const fileName = `${data.id ?? data.name ?? 'map'}.json`;
  const json = exportMapJSON(data);

  if (hasFSAccess()) {
    await saveToDirectory('map', fileName, json);
    return;
  }

  // Fallback: browser download
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
