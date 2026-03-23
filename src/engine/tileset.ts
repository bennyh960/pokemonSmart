/**
 * Tileset - Loads tileset manifests and provides tile lookups.
 *
 * Supports two manifest formats:
 *   1. New (tileset editor output): { image, tiles: [{key, sx, sy, w, h, walkable, encounter, destroy, above, category?}] }
 *   2. Legacy: { image, tileSize, tiles: { "id": {sx, sy, walkable, encounter} } }
 */

/** Definition of a single tile within a tileset. */
export interface TileDef {
  sx: number;
  sy: number;
  w: number;       // pixel width
  h: number;       // pixel height
  walkable: boolean;
  encounter: boolean;
  above: boolean;
  overlay: boolean; // true = renders on top of player (e.g. tall grass); false = flat ground decoration
  destroy: null | 'cut' | 'strength';
  category?: string;
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
  encounter: boolean;
  destroy: null | 'cut' | 'strength';
  above: boolean;
  overlay?: boolean;
  category?: string;
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
    img.src = src;
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
      tiles.set(raw.key, {
        sx: raw.sx,
        sy: raw.sy,
        w: raw.w ?? size,
        h: raw.h ?? size,
        walkable: raw.walkable ?? true,
        encounter: raw.encounter ?? false,
        above: raw.above ?? false,
        overlay: raw.overlay ?? false,
        destroy: raw.destroy ?? null,
        category: raw.category,
      });
    }
  }
  // Legacy format: tiles is a Record
  else if (typeof manifest.tiles === 'object' && manifest.tiles !== null) {
    const base = (manifest.tileSize as number) ?? 16;
    for (const [id, raw] of Object.entries(manifest.tiles as Record<string, Record<string, unknown>>)) {
      tiles.set(id, {
        sx: raw.sx as number,
        sy: raw.sy as number,
        w: (raw.w as number) ?? (raw.tileSize as number) ?? base,
        h: (raw.h as number) ?? (raw.tileSize as number) ?? base,
        walkable: (raw.walkable as boolean) ?? true,
        encounter: (raw.encounter as boolean) ?? false,
        above: (raw.above as boolean) ?? (raw.renderAbove as boolean) ?? false,
        overlay: (raw.overlay as boolean) ?? false,
        destroy: (raw.destroy as TileDef['destroy']) ?? null,
        category: raw.category as string | undefined,
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
