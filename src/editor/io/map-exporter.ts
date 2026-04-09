/**
 * Map Exporter — Exports editor state to the game's JSON map format.
 * Custom formatter keeps tile rows compact (one row per line).
 */

import { editorState } from '../state/editor-state.js';

export function exportMapData(): object {
  const { map } = editorState;
  const result: any = {
    id: map.id,
    name: map.name,
    width: map.width,
    height: map.height,
    tileSize: 16,
    spawn: map.spawn,
    tiles: map.tiles,
  };
  if (map.warps.length > 0) {
    result.transitions = map.warps.map((w) => ({
      fromX: w.fromX,
      fromY: w.fromY,
      toMapId: w.toMapId,
      toX: w.toX,
      toY: w.toY,
    }));
  }
  if (map.npcs.length > 0) result.npcs = map.npcs;
  if (map.objects && map.objects.length > 0) result.objects = map.objects;
  if (map.music) result.music = map.music;
  if (map.encounterTableId) result.encounterTableId = map.encounterTableId;
  return result;
}

/**
 * Format map JSON with compact tile rows.
 * Each row of the tiles array stays on one line: [4,4,4,4,4,4]
 * Everything else uses normal 2-space indentation.
 */
function formatMapJson(data: any): string {
  // Separate the tiles from the rest
  const { tiles, ...rest } = data;

  // Stringify everything except tiles normally
  let json = JSON.stringify({ ...rest, tiles: '__TILES_PLACEHOLDER__' }, null, 2);

  // Build compact tiles string: each row on one line
  const tilesStr = '[\n' +
    (tiles as number[][])
      .map((row: number[]) => '    ' + JSON.stringify(row))
      .join(',\n') +
    '\n  ]';

  // Replace placeholder
  json = json.replace('"__TILES_PLACEHOLDER__"', tilesStr);

  return json;
}

/** Download the map as a JSON file */
export function exportMap(): void {
  const data = exportMapData();
  const json = formatMapJson(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${editorState.map.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Get formatted JSON string (used by Copy button in toolbar) */
export function exportMapJson(): string {
  return formatMapJson(exportMapData());
}
