/**
 * Tileset - Loads tileset manifests and provides tile lookups.
 *
 * Supports two manifest formats:
 *   1. New (tileset editor output): { image, tiles: [{key, sx, sy, w, h, walkable, encounter, destroy, above, category?}] }
 *   2. Legacy: { image, tileSize, tiles: { "id": {sx, sy, walkable, encounter} } }
 */

import type { InteractTypeRef } from '../data/interact-types.js';
import { normalizeBattleBackgroundId, type BattleBackgroundId } from '../data/battle-backgrounds.js';
import { toAssetUrl } from './asset-path.js';

/** Definition of a single tile within a tileset. */
export interface TileDef {
  sx: number;
  sy: number;
  w: number;       // pixel width
  h: number;       // pixel height
  walkable: boolean;
  /**
   * Encounter types filter for this tile.
   *   undefined/null = not an encounter tile
   *   ['*']          = any Pokemon type from the map's encounter table
   *   ['water','ice']= only Pokemon with at least one matching type
   */
  encounterTypes?: string[] | null;
  above: boolean;
  overlay: boolean; // true = renders on top of player (e.g. tall grass); false = flat ground decoration
  category?: string;
  battleBackground?: BattleBackgroundId;
  /**
   * Interactive type reference — only meaningful when category is 'interactive'.
   * Contains an id (foreign key to INTERACT_TYPES) and optional args to override defaults.
   */
  interactType?: InteractTypeRef | null;
  /** For grouped non-adjacent tiles: list of included 16x16 cells as grid offsets from (sx,sy).
   *  When absent, the entire sx/sy/w/h rectangle is the tile.
   *  When present, only these cells are rendered/collidable. */
  cells?: Array<{ dx: number; dy: number }>;
}

/** A loaded tileset ready for rendering. */
export interface Tileset {
  image: HTMLImageElement;
  tiles: Map<string, TileDef>;
  getTile(id: string): TileDef | undefined;
}

/** New manifest format entry. */
interface TileEntryRaw {
  key: string;
  sx: number;
  sy: number;
  w?: number;
  h?: number;
  tileSize?: number;  // legacy compat: square tile
  walkable: boolean;
  encounter?: boolean;              // legacy: true/false
  encounterTypes?: string[] | null; // new: type filter array
  above: boolean;
  overlay?: boolean;
  category?: string;
  battleBackground?: string | null;
  interactType?: unknown;  // string (legacy) or { id, args } (new) or null
  destroy?: string;        // legacy — migrated to interactType on load
  cells?: Array<{ dx: number; dy: number }>;
}

/** Normalize interactType from JSON: handles legacy string, new object, and destroy migration. */
function normalizeInteractRef(raw: unknown, legacyDestroy?: string | null): InteractTypeRef | null {
  // New format: { id: "pc", args: {...} }
  if (raw && typeof raw === 'object' && 'id' in (raw as Record<string, unknown>)) {
    return raw as InteractTypeRef;
  }
  // Legacy string format: "pc" → { id: "pc" }
  if (typeof raw === 'string' && raw) {
    return { id: raw };
  }
  // Legacy destroy field migration
  if (typeof legacyDestroy === 'string' && legacyDestroy) {
    return { id: legacyDestroy };
  }
  return null;
}

/** Cache of loaded tilesets by name. */
const tilesetCache = new Map<string, Tileset>();

async function importManifest(name: string): Promise<unknown> {
  const module = await import(`../data/tilesets/${name}.json`);
  return module.default;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load tileset image: ${src}`));
    img.src = toAssetUrl(src);
  });
}

/** Load a tileset by name. Supports both array and Record manifest formats. */
export async function loadTileset(name: string): Promise<Tileset> {
  const cached = tilesetCache.get(name);
  if (cached) return cached;

  const manifest = await importManifest(name) as Record<string, unknown>;
  const image = await loadImage(manifest.image as string);

  const tiles = new Map<string, TileDef>();

  // New format: tiles is an array
  if (Array.isArray(manifest.tiles)) {
    for (const raw of manifest.tiles as TileEntryRaw[]) {
      const size = raw.tileSize ?? 16;
      const iRef = normalizeInteractRef(raw.interactType, raw.destroy);
      // Migrate legacy encounter:boolean → encounterTypes
      const encTypes = raw.encounterTypes ?? (raw.encounter ? ['*'] : undefined);
      tiles.set(raw.key, {
        sx: raw.sx,
        sy: raw.sy,
        w: raw.w ?? size,
        h: raw.h ?? size,
        walkable: raw.walkable ?? true,
        encounterTypes: encTypes,
        above: raw.above ?? false,
        overlay: raw.overlay ?? false,
        category: raw.category ?? (iRef ? 'interactive' : undefined),
        battleBackground: normalizeBattleBackgroundId(raw.battleBackground) ?? undefined,
        interactType: iRef,
        cells: raw.cells,
      });
    }
  }
  // Legacy format: tiles is a Record
  else if (typeof manifest.tiles === 'object' && manifest.tiles !== null) {
    const base = (manifest.tileSize as number) ?? 16;
    for (const [id, raw] of Object.entries(manifest.tiles as Record<string, Record<string, unknown>>)) {
      const iRef2 = normalizeInteractRef(raw.interactType, raw.destroy as string | null);
      const encTypes2 = (raw.encounterTypes as string[] | undefined) ?? ((raw.encounter as boolean) ? ['*'] : undefined);
      tiles.set(id, {
        sx: raw.sx as number,
        sy: raw.sy as number,
        w: (raw.w as number) ?? (raw.tileSize as number) ?? base,
        h: (raw.h as number) ?? (raw.tileSize as number) ?? base,
        walkable: (raw.walkable as boolean) ?? true,
        encounterTypes: encTypes2,
        above: (raw.above as boolean) ?? (raw.renderAbove as boolean) ?? false,
        overlay: (raw.overlay as boolean) ?? false,
        category: (raw.category as string) ?? (iRef2 ? 'interactive' : undefined),
        battleBackground: normalizeBattleBackgroundId(raw.battleBackground as string | null | undefined) ?? undefined,
        interactType: iRef2,
      });
    }
  }

  const tileset: Tileset = {
    image,
    tiles,
    getTile(id: string): TileDef | undefined { return tiles.get(id); },
  };

  tilesetCache.set(name, tileset);
  return tileset;
}

export function getTileset(name: string): Tileset | undefined {
  return tilesetCache.get(name);
}
