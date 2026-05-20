/**
 * Tilemap - Load and render tile-based maps from JSON.
 *
 * Supports:
 *   - Legacy numeric tile IDs (0-8, procedurally generated)
 *   - String tile IDs (looked up in tileset spritesheet)
 *   - Variable-size tiles (tileSize per tile, e.g. 32x32 buildings)
 *   - Two layers: ground tiles + above tiles (placed objects)
 */

import { fillRect } from './renderer.js';
import { getTileImage } from './asset-generator.js';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './config.js';
import type { NPCData } from '../systems/npc.js';
import type { Tileset } from './tileset.js';
import type { BattleBackgroundId } from '../data/battle-backgrounds.js';

/** Map transition definition. */
export interface MapTransition {
  fromX: number;
  fromY: number;
  toMapId: string;
  toX?: number;
  toY?: number;
  returnToPrevious?: boolean;
}

import type { InteractArgs } from '../data/interact-types.js';

/** One entry in a map's interactiveItems override list. */
export interface InteractiveItemEntry {
  itemId: string;
  itemQty?: number; // defaults to 1 if omitted
  x?: number;
  y?: number;
}

/** A placed above-layer tile on the map. */
export interface PlacedObject {
  key: string; // references TileDef in tileset
  x: number; // grid column (16px grid)
  y: number; // grid row (16px grid)
  /** Optional render tie-break inside the same render layer. Higher draws above lower/undefined. */
  zOffset?: number;
  /** Optional per-instance overrides for interactive tiles (merges with tile's interactType.args). */
  interactArgs?: InteractArgs;
}

/** Map data as loaded from JSON. */
export interface TileMapData {
  name: string;
  width: number;
  height: number;
  tileSize: number; // base grid size (always 16)
  spawn: { x: number; y: number };
  tiles: (number | string)[][];
  objects?: PlacedObject[];
  objectLayer?: (string | null)[][]; // deprecated
  tileset?: string;
  id?: string;
  transitions?: MapTransition[];
  npcs?: NPCData[];
  music?: string;
  encounterTableId?: string | null;
  /** Optional area/city grouping label for map editor (e.g. "Dividia", "Route 1"). Not used in gameplay. */
  area?: string;
  /** Bilingual display name shown in-game when entering this map. */
  label?: { en: string; he: string };
  /** ID of the template this map is based on (e.g. "house-open"). */
  template?: string;
  /**
   * Map-level item overrides, keyed by tile key → ordered list of assignments.
   * Entries with x+y target an exact position; x-only or y-only do a partial match;
   * entries with neither fill by index over remaining unmatched objects.
   * The list length caps how many objects of that key get overridden.
   */
  interactiveItems?: Record<string, InteractiveItemEntry[]>;
  /** Moveable tile puzzles keyed by puzzle id. */
  movablePuzzle?: Record<
    string,
    {
      successFlag?: string; // better use Flag constant to set it
      refRoom?: { x1: number; y1: number; x2: number; y2: number };
      puzzleRoom: { x1: number; y1: number; x2: number; y2: number };
      movableTileKeys: string[];
      baseTile?: string;
      dialogue?: { en: string; he: string };
    }
  >;
  /**
   * Reactive spawn/despawn rules triggered when story flags are set.
   * spawnAfter: object is hidden until the flag fires, then added.
   * despawnAfter: object starts visible, then removed when the flag fires.
   */
  flagListeners?: Array<{
    key: string;
    x: number;
    y: number;
    spawnAfter?: string;
    despawnAfter?: string;
  }>;
  /** Internal — tracks how many transitions/npcs/objects came from the template so saves strip them. */
  _templateCounts?: { transitions: number; npcs: number; objects: number };
}

/**
 * Merge a template map with an instance map using the canonical rules:
 * - Layout (tiles, objectLayer, tileset, width, height, tileSize) → always from template
 * - Arrays (transitions, npcs, objects)                            → concat [template…, instance…]
 * - Scalar overrides (music, encounterTableId, spawn)              → instance wins, template as default
 * - Identity (id, name, label, area, template)                     → instance only
 * - Stores _templateCounts so exportMapJSON can slice instance-only portions on save
 */
export function mergeMapWithTemplate(
  instance: TileMapData & { template?: string },
  template: TileMapData,
): TileMapData {
  const tc = {
    transitions: template.transitions?.length ?? 0,
    npcs: template.npcs?.length ?? 0,
    objects: template.objects?.length ?? 0,
  };
  return {
    // ── Layout: always from template ──────────────────────────────
    tiles: template.tiles,
    objectLayer: template.objectLayer,
    tileset: template.tileset,
    flagListeners: [...(template.flagListeners ?? []), ...(instance.flagListeners ?? [])], // defensive copy since we mutate this array in-place
    width: template.width,
    height: template.height,
    tileSize: template.tileSize,
    // ── Arrays: concat (template first, instance appended) ────────
    transitions: [...(template.transitions ?? []), ...(instance.transitions ?? [])],
    npcs: [...(template.npcs ?? []), ...(instance.npcs ?? [])],
    objects: [...(template.objects ?? []), ...(instance.objects ?? [])],
    // ── Scalars: instance wins, template as default ────────────────
    music: instance.music ?? template.music,
    encounterTableId: instance.encounterTableId !== undefined ? instance.encounterTableId : template.encounterTableId,
    spawn: instance.spawn ?? template.spawn,
    // ── Identity: instance only ────────────────────────────────────
    id: instance.id,
    name: instance.name ?? template.name,
    label: instance.label,
    area: instance.area,
    template: instance.template,
    // ── Map-level interact overrides: instance wins (shallow merge) ──
    interactiveItems: instance.interactiveItems ?? template.interactiveItems,
    // ── Internal ──────────────────────────────────────────────────
    _templateCounts: tc,
  };
}

/** Tile type constants (legacy). */
export const TILE_EMPTY = 0;
export const TILE_GRASS = 1;
export const TILE_PATH = 2;
export const TILE_WATER = 3;
export const TILE_TREE = 4;
export const TILE_BUILDING = 5;
export const TILE_DOOR = 6;
export const TILE_TALL_GRASS = 7;
export const TILE_ROUTE_EXIT = 8;

const TILE_COLORS: Record<number, string> = {
  [TILE_EMPTY]: '#000000',
  [TILE_GRASS]: '#48A030',
  [TILE_PATH]: '#C8A870',
  [TILE_WATER]: '#3080D0',
  [TILE_TREE]: '#206020',
  [TILE_BUILDING]: '#808080',
  [TILE_DOOR]: '#8B4513',
  [TILE_TALL_GRASS]: '#68C048',
  [TILE_ROUTE_EXIT]: '#D8B870',
};

const BLOCKED_TILES = new Set([TILE_WATER, TILE_TREE, TILE_BUILDING]);

/** Renderable for Y-sorting. */
export interface Renderable {
  y: number;
  render: () => void;
  /** Optional render tie-break inside the same Y/layer. Higher values draw later (on top). */
  zOffset?: number;
  /** Stable fallback to preserve original insertion order. */
  order?: number;
}

/**
 * Pre-compute which PlacedObject gets which item override.
 * Sort priority: both x+y → x-only → y-only → neither (index-based).
 * If a coord-targeted entry finds no unclaimed match it falls back to index order.
 */
function buildInteractOverrides(
  interactiveItems: Record<string, InteractiveItemEntry[]>,
  objects: PlacedObject[],
): Map<PlacedObject, { itemId: string; itemQty: number }> {
  const result = new Map<PlacedObject, { itemId: string; itemQty: number }>();

  for (const [tileKey, entries] of Object.entries(interactiveItems)) {
    const candidates = objects.filter((o) => o.key === tileKey);
    if (!candidates.length) continue;

    const sorted = [...entries].sort((a, b) => {
      const score = (e: InteractiveItemEntry) =>
        e.x !== undefined && e.y !== undefined ? 0 : e.x !== undefined ? 1 : e.y !== undefined ? 2 : 3;
      return score(a) - score(b);
    });

    const claimed = new Set<PlacedObject>();
    const fallbacks: InteractiveItemEntry[] = [];

    for (const entry of sorted) {
      let matched: PlacedObject | undefined;
      if (entry.x !== undefined && entry.y !== undefined) {
        matched = candidates.find((o) => !claimed.has(o) && o.x === entry.x && o.y === entry.y);
      } else if (entry.x !== undefined) {
        matched = candidates.find((o) => !claimed.has(o) && o.x === entry.x);
      } else if (entry.y !== undefined) {
        matched = candidates.find((o) => !claimed.has(o) && o.y === entry.y);
      }

      if (matched) {
        claimed.add(matched);
        result.set(matched, { itemId: entry.itemId, itemQty: entry.itemQty ?? 1 });
      } else {
        fallbacks.push(entry);
      }
    }

    // Assign fallbacks to remaining unclaimed candidates
    const unclaimed = candidates.filter((o) => !claimed.has(o));
    let assignable = fallbacks;
    if (fallbacks.length > unclaimed.length) {
      // y > x: randomly sample unclaimed.length overrides without replacement (Fisher-Yates)
      const pool = [...fallbacks];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      assignable = pool.slice(0, unclaimed.length);
    }
    for (let i = 0; i < assignable.length && i < unclaimed.length; i++) {
      result.set(unclaimed[i], { itemId: assignable[i].itemId, itemQty: assignable[i].itemQty ?? 1 });
    }
  }

  return result;
}

/** Create a tilemap from loaded JSON data. */
export function createTileMap(data: TileMapData, tileset?: Tileset | null) {
  const { width, height, tileSize, tiles, spawn, name } = data;
  const objectLayer = data.objectLayer ?? null;
  const placedObjects = data.objects ?? [];
  const interactOverrides = buildInteractOverrides(data.interactiveItems ?? {}, placedObjects);
  const BASE = 16; // base grid unit
  const flagListenerDefs = data.flagListeners ?? [];

  return {
    name,
    width,
    height,
    tileSize,
    spawn,

    /** Returns the item override for a placed object, or null if none. */
    getInteractOverride(obj: PlacedObject): { itemId: string; itemQty: number } | null {
      return interactOverrides.get(obj) ?? null;
    },

    /**
     * Sync placed objects with current flags — call every frame (or at least after any flag change).
     * Same pattern as isNPCVisible: reads live flags each call, no event system needed.
     * - spawnAfter: object is added when the flag is set, removed when not.
     * - despawnAfter: object is removed when the flag is set, added back when not.
     * Fast no-op when this map has no flagListeners.
     */
    applyFlagListeners(flags: Record<string, boolean>): void {
      if (flagListenerDefs.length === 0) return;
      for (const fl of flagListenerDefs) {
        // All conditions must be satisfied — AND them together so spawnAfter + despawnAfter
        // don't fight each other when both are present on the same entry.
        let shouldExist = true;
        if (fl.spawnAfter !== undefined) shouldExist = shouldExist && !!flags[fl.spawnAfter];
        if (fl.despawnAfter !== undefined) shouldExist = shouldExist && !flags[fl.despawnAfter];
        const idx = placedObjects.findIndex((o) => o.key === fl.key && o.x === fl.x && o.y === fl.y);
        if (shouldExist && idx === -1) placedObjects.push({ key: fl.key, x: fl.x, y: fl.y });
        else if (!shouldExist && idx !== -1) placedObjects.splice(idx, 1);
      }
    },

    getTile(gx: number, gy: number): number | string {
      if (gx < 0 || gx >= width || gy < 0 || gy >= height) return -1;
      return tiles[gy][gx];
    },

    /** Get the interactive placed object at a grid cell, if any. */
    getInteractableAt(gx: number, gy: number): PlacedObject | null {
      if (!tileset) return null;
      for (const obj of placedObjects) {
        const def = tileset.getTile(obj.key);
        if (!def || !def.interactType) continue;
        const gridW = Math.max(1, Math.round(def.w / BASE));
        const gridH = Math.max(1, Math.round(def.h / BASE));
        const lx = gx - obj.x;
        const ly = gy - obj.y;
        if (lx >= 0 && lx < gridW && ly >= 0 && ly < gridH) {
          if (def.cells && !def.cells.some((c) => c.dx === lx && c.dy === ly)) continue;
          return obj;
        }
      }
      return null;
    },

    /** Get the TileDef for a placed object's tile key. */
    getObjectTileDef(obj: PlacedObject): import('./tileset.js').TileDef | null {
      return tileset?.getTile(obj.key) ?? null;
    },

    /** Check if a placed object blocks a grid cell. */
    isObjectBlocking(gx: number, gy: number): boolean {
      if (!tileset) return false;
      for (const obj of placedObjects) {
        const def = tileset.getTile(obj.key);
        if (!def) continue;
        const gridW = Math.max(1, Math.round(def.w / BASE));
        const gridH = Math.max(1, Math.round(def.h / BASE));
        const lx = gx - obj.x;
        const ly = gy - obj.y;
        if (lx >= 0 && lx < gridW && ly >= 0 && ly < gridH) {
          // For grouped tiles with cells, only block if this cell is included
          if (def.cells) {
            if (!def.cells.some((c) => c.dx === lx && c.dy === ly)) continue;
          }
          if (!def.walkable) return true;
        }
      }
      // Also check deprecated objectLayer
      const olTile = objectLayer?.[gy]?.[gx];
      if (olTile) {
        const def = tileset.getTile(olTile);
        if (def && !def.walkable) return true;
      }
      return false;
    },

    isWalkable(gx: number, gy: number): boolean {
      // Object tiles override base tile walkability.
      // `above` is purely a render hint — it has no effect on walkability.
      // Example: bridge (above:true, walkable:true) over water (walkable:false) → CAN walk.
      // Example: tree trunk (above:false, walkable:false) over grass (walkable:true) → CANNOT walk.
      if (tileset) {
        for (const obj of placedObjects) {
          const def = tileset.getTile(obj.key);
          if (!def) continue;
          const gridW = Math.max(1, Math.round(def.w / BASE));
          const gridH = Math.max(1, Math.round(def.h / BASE));
          const lx = gx - obj.x;
          const ly = gy - obj.y;
          if (lx >= 0 && lx < gridW && ly >= 0 && ly < gridH) {
            if (def.cells && !def.cells.some((c) => c.dx === lx && c.dy === ly)) continue;
            return def.walkable; // object tile is present — its walkable is the answer
          }
        }
        // Also check deprecated objectLayer
        const olTile = objectLayer?.[gy]?.[gx];
        if (olTile) {
          const def = tileset.getTile(olTile);
          if (def) return def.walkable;
        }
      }
      // No object tile at this cell — base tile decides
      const tile = this.getTile(gx, gy);
      if (tile === -1) return false;
      if (typeof tile === 'string' && tileset) {
        const def = tileset.getTile(tile);
        return def ? def.walkable : false;
      }
      if (typeof tile === 'number') return !BLOCKED_TILES.has(tile);
      return false;
    },

    isEncounterTile(gx: number, gy: number): boolean {
      return this.getEncounterTypes(gx, gy) !== null;
    },

    /**
     * Get the encounter type filter for a tile.
     * Returns null if not an encounter tile.
     * Returns ['*'] if any type is allowed.
     * Returns ['water','ice',...] for filtered encounters.
     */
    getEncounterTypes(gx: number, gy: number): string[] | null {
      // Check placed objects layer first (above layer takes priority)
      if (tileset) {
        for (const obj of placedObjects) {
          const def = tileset.getTile(obj.key);
          if (!def?.encounterTypes) continue;
          const gridW = Math.max(1, Math.round(def.w / BASE));
          const gridH = Math.max(1, Math.round(def.h / BASE));
          const lx = gx - obj.x;
          const ly = gy - obj.y;
          if (lx >= 0 && lx < gridW && ly >= 0 && ly < gridH) {
            if (def.cells && !def.cells.some((c) => c.dx === lx && c.dy === ly)) continue;
            return def.encounterTypes;
          }
        }
      }
      // Check base tile layer
      const tile = this.getTile(gx, gy);
      if (typeof tile === 'string' && tileset) {
        const def = tileset.getTile(tile);
        if (def?.encounterTypes) return def.encounterTypes;
      } else if (tile === TILE_TALL_GRASS) {
        return ['*']; // legacy tall grass — all types
      }
      return null;
    },

    /** Return the tileset category string for a grid cell ('water', 'grass', 'ground', etc.)
     *  Checks placed objects first, then falls back to the base tile. */
    getTileCategory(gx: number, gy: number): string | undefined {
      if (tileset) {
        for (const obj of placedObjects) {
          const def = tileset.getTile(obj.key);
          if (!def) continue;
          const gridW = Math.max(1, Math.round(def.w / BASE));
          const gridH = Math.max(1, Math.round(def.h / BASE));
          const lx = gx - obj.x;
          const ly = gy - obj.y;
          if (lx >= 0 && lx < gridW && ly >= 0 && ly < gridH) {
            if (def.cells && !def.cells.some((c) => c.dx === lx && c.dy === ly)) continue;
            return def.category;
          }
        }
        const tile = this.getTile(gx, gy);
        if (typeof tile === 'string') return tileset.getTile(tile)?.category;
      }
      return undefined;
    },

    getBattleBackground(gx: number, gy: number): BattleBackgroundId | null {
      if (tileset) {
        for (const obj of placedObjects) {
          const def = tileset.getTile(obj.key);
          if (!def?.battleBackground) continue;
          const gridW = Math.max(1, Math.round(def.w / BASE));
          const gridH = Math.max(1, Math.round(def.h / BASE));
          const lx = gx - obj.x;
          const ly = gy - obj.y;
          if (lx >= 0 && lx < gridW && ly >= 0 && ly < gridH) {
            if (def.cells && !def.cells.some((c) => c.dx === lx && c.dy === ly)) continue;
            return def.battleBackground;
          }
        }
      }
      const tile = this.getTile(gx, gy);
      if (typeof tile === 'string' && tileset) {
        return tileset.getTile(tile)?.battleBackground ?? null;
      }
      return null;
    },

    /** Render ground layer. */
    render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
      const screenW = LOGICAL_WIDTH;
      const screenH = LOGICAL_HEIGHT;
      const startCol = Math.max(0, Math.floor(cameraX / BASE));
      const startRow = Math.max(0, Math.floor(cameraY / BASE));
      const endCol = Math.min(width - 1, Math.floor((cameraX + screenW) / BASE));
      const endRow = Math.min(height - 1, Math.floor((cameraY + screenH) / BASE));

      ctx.imageSmoothingEnabled = false;
      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const tile = tiles[row][col];
          const drawX = Math.floor(col * BASE - cameraX);
          const drawY = Math.floor(row * BASE - cameraY);

          if (typeof tile === 'string' && tileset) {
            const def = tileset.getTile(tile);
            if (def) {
              ctx.drawImage(tileset.image, def.sx, def.sy, def.w, def.h, drawX, drawY, def.w, def.h);
            } else {
              fillRect(ctx, drawX, drawY, BASE, BASE, '#FF00FF');
            }
          } else if (typeof tile === 'number') {
            const tileImg = getTileImage(tile);
            if (tileImg.complete && tileImg.naturalWidth > 0) {
              ctx.drawImage(tileImg, drawX, drawY, BASE, BASE);
            } else {
              fillRect(ctx, drawX, drawY, BASE, BASE, TILE_COLORS[tile] ?? '#FF00FF');
            }
          }
        }
      }
    },

    /** Get renderables for placed objects, split into three render passes:
     *  - ground: flat walkable decorations (carpet, sand edges) — drawn with ground layer
     *  - body: tall objects (trees, buildings) — Y-sorted with player/NPCs
     *  - above: overlay tiles (tall grass) — drawn on top of all sprites
     */
    getObjectRenderables(
      ctx: CanvasRenderingContext2D,
      cameraX: number,
      cameraY: number,
    ): {
      ground: Renderable[];
      body: Renderable[];
      above: Renderable[];
    } {
      const ground: Renderable[] = [];
      const body: Renderable[] = [];
      const above: Renderable[] = [];
      if (!tileset) return { ground, body, above };

      ctx.imageSmoothingEnabled = false;

      for (const [objIndex, obj] of placedObjects.entries()) {
        const def = tileset.getTile(obj.key);
        if (!def) continue;
        const effectiveZOffset = obj.zOffset ?? def.zOffset;
        const pixelX = obj.x * BASE;
        const pixelY = obj.y * BASE;
        const drawX = Math.floor(pixelX - cameraX);
        const drawY = Math.floor(pixelY - cameraY);
        const gridH = Math.max(1, Math.round(def.h / BASE));

        const renderable: Renderable = {
          y: (obj.y + gridH - 1) * BASE,
          zOffset: effectiveZOffset,
          order: objIndex,
          render: () => {
            if (def.cells) {
              // Grouped tile: draw each cell individually
              for (const cell of def.cells) {
                const cellSx = def.sx + cell.dx * BASE;
                const cellSy = def.sy + cell.dy * BASE;
                const cellDrawX = drawX + cell.dx * BASE;
                const cellDrawY = drawY + cell.dy * BASE;
                ctx.drawImage(tileset!.image, cellSx, cellSy, BASE, BASE, cellDrawX, cellDrawY, BASE, BASE);
              }
            } else {
              ctx.drawImage(tileset!.image, def.sx, def.sy, def.w, def.h, drawX, drawY, def.w, def.h);
            }
          },
        };

        if (def.overlay) {
          // Overlay tiles (tall grass): always render on top of sprites
          above.push(renderable);
        } else if (typeof effectiveZOffset === 'number') {
          // zOffset objects must participate in body sorting so they can render above larger neighbors.
          body.push(renderable);
        } else if (def.walkable) {
          // Flat walkable decorations (carpet, sand): render with ground layer
          ground.push(renderable);
        } else {
          // Tall solid objects (trees, buildings): Y-sort with player/NPCs
          body.push(renderable);
        }
      }

      return { ground, body, above };
    },

    /** Render legacy objectLayer (deprecated). */
    renderAbove(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
      if (!objectLayer || !tileset) return;
      const screenW = LOGICAL_WIDTH;
      const screenH = LOGICAL_HEIGHT;
      const startCol = Math.max(0, Math.floor(cameraX / BASE));
      const startRow = Math.max(0, Math.floor(cameraY / BASE));
      const endCol = Math.min(width - 1, Math.floor((cameraX + screenW) / BASE));
      const endRow = Math.min(height - 1, Math.floor((cameraY + screenH) / BASE));

      ctx.imageSmoothingEnabled = false;
      for (let row = startRow; row <= endRow; row++) {
        if (!objectLayer[row]) continue;
        for (let col = startCol; col <= endCol; col++) {
          const tile = objectLayer[row][col];
          if (!tile) continue;
          const def = tileset.getTile(tile);
          if (!def) continue;
          const drawX = Math.floor(col * BASE - cameraX);
          const drawY = Math.floor(row * BASE - cameraY);
          ctx.drawImage(tileset.image, def.sx, def.sy, def.w, def.h, drawX, drawY, def.w, def.h);
        }
      }
    },
  };
}

export type TileMap = ReturnType<typeof createTileMap>;
