import type { TilesetEditorState } from './editor-state.js';
import type { TileEntry, TileManifest } from './types.js';
import { hasFSAccess, saveToDirectory } from '../editor/fs-save.js';

/** Export tiles as the manifest JSON. */
export function exportManifest(state: TilesetEditorState): string {
  const manifest: TileManifest = {
    image: state.imageSrc,
    tiles: state.tiles.map(t => ({ ...t })),
  };
  return JSON.stringify(manifest, null, 2);
}

/**
 * Save tileset manifest.
 * Uses File System Access API if available, falls back to browser download.
 */
export async function saveManifest(state: TilesetEditorState, fileName = 'dpp.json'): Promise<void> {
  const json = exportManifest(state);

  if (hasFSAccess()) {
    await saveToDirectory('tileset', fileName, json);
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

/** Copy manifest JSON to clipboard. */
export async function copyManifest(state: TilesetEditorState): Promise<void> {
  await navigator.clipboard.writeText(exportManifest(state));
}

/** Load a manifest from JSON string into state. */
export function loadManifest(state: TilesetEditorState, json: string): void {
  const data = JSON.parse(json);

  state.tiles = [];

  if (data.image) state.imageSrc = data.image;

  // Support the new flat array format
  if (Array.isArray(data.tiles)) {
    for (const t of data.tiles as TileEntry[]) {
      state.tiles.push({
        key: t.key,
        sx: t.sx,
        sy: t.sy,
        w: t.w ?? (t as unknown as Record<string, number>).tileSize ?? 16,
        h: t.h ?? (t as unknown as Record<string, number>).tileSize ?? 16,
        walkable: t.walkable ?? true,
        encounter: t.encounter ?? false,
        destroy: t.destroy ?? null,
        above: t.above ?? false,
        overlay: t.overlay ?? undefined,
        category: t.category,
        description: t.description,
      });
    }
  }
  // Also support loading the old Record<string, TileDef> format for migration
  else if (typeof data.tiles === 'object') {
    const baseTileSize = data.tileSize ?? 16;
    for (const [key, raw] of Object.entries(data.tiles) as [string, Record<string, unknown>][]) {
      state.tiles.push({
        key,
        sx: raw.sx as number,
        sy: raw.sy as number,
        w: (raw.w as number) ?? baseTileSize,
        h: (raw.h as number) ?? baseTileSize,
        walkable: (raw.walkable as boolean) ?? true,
        encounter: (raw.encounter as boolean) ?? false,
        destroy: null,
        above: (raw.renderAbove as boolean) ?? false,
      });
    }
  }

  state.selectedIndex = -1;
  state.emit('items-changed');
}

/** Load manifest from a File. */
export async function loadManifestFromFile(state: TilesetEditorState, file: File): Promise<void> {
  const text = await file.text();
  loadManifest(state, text);
}
