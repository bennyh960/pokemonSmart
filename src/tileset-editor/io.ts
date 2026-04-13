import type { TilesetEditorState } from './editor-state.js';
import type { TileEntry, TileManifest } from './types.js';
import { hasFSAccess, saveToDirectory, saveBlobToDirectory } from '../editor/fs-save.js';
import { normalizeBattleBackgroundId } from '../data/battle-backgrounds.js';

/** Normalize interactType from JSON: handles legacy string, new object, and destroy migration. */
function normalizeEditorInteractType(raw: unknown, legacyDestroy?: string | null): TileEntry['interactType'] {
  if (raw && typeof raw === 'object' && 'id' in (raw as Record<string, unknown>)) {
    return raw as { id: string; args?: Record<string, unknown> };
  }
  if (typeof raw === 'string' && raw) return { id: raw };
  if (typeof legacyDestroy === 'string' && legacyDestroy) return { id: legacyDestroy };
  return null;
}

/** Export tiles as the manifest JSON. */
export function exportManifest(state: TilesetEditorState): string {
  const manifest: TileManifest = {
    image: state.imageSrc,
    tiles: state.tiles.map((t) => ({ ...t })),
  };
  return JSON.stringify(manifest, null, 2);
}

/**
 * Save tileset manifest.
 * Uses File System Access API if available, falls back to browser download.
 */
export async function saveManifest(state: TilesetEditorState, fileName = 'overworld.json'): Promise<void> {
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
        encounterTypes: t.encounterTypes ?? ((t as any).encounter ? ['*'] : undefined),
        battleBackground:
          normalizeBattleBackgroundId((t as { battleBackground?: string | null }).battleBackground) ?? undefined,
        above: t.above ?? false,
        overlay: t.overlay ?? undefined,
        category: t.category ?? ((t as any).destroy ? 'interactive' : undefined),
        interactType: normalizeEditorInteractType(t.interactType, (t as any).destroy),
        description: t.description,
        cells: t.cells,
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
        encounterTypes:
          (raw.encounterTypes as string[] | undefined) ?? ((raw.encounter as boolean) ? ['*'] : undefined),
        battleBackground: normalizeBattleBackgroundId(raw.battleBackground as string | null | undefined) ?? undefined,
        above: (raw.renderAbove as boolean) ?? false,
      });
    }
  }

  state.selectedIndex = -1;
  state.emit('items-changed');
}

/**
 * Apply a crop (scale-in-place) to a region of the tileset image.
 * Scales the source region (sx, sy, sw, sh) into the target size (tw, th)
 * at the target position (targetSx, targetSy).
 * Clears the original source area, then draws the scaled content.
 * Rest of the image is completely untouched.
 * Returns a PNG blob of the modified image.
 */
export async function applyCrop(
  image: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  tw: number,
  th: number,
  targetSx: number,
  targetSy: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Draw the full original image
  ctx.drawImage(image, 0, 0);

  // Clear the source region (make it transparent)
  ctx.clearRect(sx, sy, sw, sh);

  // Draw the source region scaled to target size at target position
  ctx.drawImage(image, sx, sy, sw, sh, targetSx, targetSy, tw, th);

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });

  return blob;
}

/**
 * Save the modified tileset image to disk.
 */
export async function saveTilesetImage(blob: Blob, fileName: string): Promise<void> {
  if (hasFSAccess()) {
    await saveBlobToDirectory('tileset-image', fileName, blob);
    return;
  }

  // Fallback: browser download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Load manifest from a File. */
export async function loadManifestFromFile(state: TilesetEditorState, file: File): Promise<void> {
  const text = await file.text();
  loadManifest(state, text);
}
