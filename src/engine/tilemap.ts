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
  toX: number;
  toY: number;
  returnToPrevious?: boolean;
}

import type { InteractArgs } from '../data/interact-types.js';

/** A placed above-layer tile on the map. */
export interface PlacedObject {
  key: string;   // references TileDef in tileset
  x: number;     // grid column (16px grid)
  y: number;     // grid row (16px grid)
  /** Optional per-instance overrides for interactive tiles (merges with tile's interactType.args). */
  interactArgs?: InteractArgs;
}

/** Map data as loaded from JSON. */
export interface TileMapData {
  name: string;
  width: number;
  height: number;
  tileSize: number;         // base grid size (always 16)
  spawn: { x: number; y: number };
  tiles: (number | string)[][];
  objects?: PlacedObject[];
  objectLayer?: (string | null)[][];  // deprecated
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
    npcs:        template.npcs?.length        ?? 0,
    objects:     template.objects?.length     ?? 0,
  };
  return {
    // ── Layout: always from template ──────────────────────────────
    tiles:       template.tiles,
    objectLayer: template.objectLayer,
    tileset:     template.tileset,
    width:       template.width,
    height:      template.height,
    tileSize:    template.tileSize,
    // ── Arrays: concat (template first, instance appended) ────────
    transitions: [...(template.transitions ?? []), ...(instance.transitions ?? [])],
    npcs:        [...(template.npcs        ?? []), ...(instance.npcs        ?? [])],
    objects:     [...(template.objects     ?? []), ...(instance.objects     ?? [])],
    // ── Scalars: instance wins, template as default ────────────────
    music:            instance.music            ?? template.music,
    encounterTableId: instance.encounterTableId !== undefined
                        ? instance.encounterTableId
                        : template.encounterTableId,
    spawn: instance.spawn ?? template.spawn,
    // ── Identity: instance only ────────────────────────────────────
    id:       instance.id,
    name:     instance.name   ?? template.name,
    label:    instance.label,
    area:     instance.area,
    template: instance.template,
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
  [TILE_EMPTY]: '#000000', [TILE_GRASS]: '#48A030', [TILE_PATH]: '#C8A870',
  [TILE_WATER]: '#3080D0', [TILE_TREE]: '#206020', [TILE_BUILDING]: '#808080',
  [TILE_DOOR]: '#8B4513', [TILE_TALL_GRASS]: '#68C048', [TILE_ROUTE_EXIT]: '#D8B870',
};

const BLOCKED_TILES = new Set([TILE_WATER, TILE_TREE, TILE_BUILDING]);

/** Renderable for Y-sorting. */
export interface Renderable { y: number; render: () => void; }

/** Create a tilemap from loaded JSON data. */
export function createTileMap(data: TileMapData, tileset?: Tileset | null) {
  const { width, height, tileSize, tiles, spawn, name } = data;
  const objectLayer = data.objectLayer ?? null;
  const placedObjects = data.objects ?? [];
  const BASE = 16; // base grid unit

  return {
    name, width, height, tileSize, spawn,

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
          if (def.cells && !def.cells.some(c => c.dx === lx && c.dy === ly)) continue;
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
            if (!def.cells.some(c => c.dx === lx && c.dy === ly)) continue;
          }
          if (!def.walkable) return true;
        }
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
            if (def.cells && !def.cells.some(c => c.dx === lx && c.dy === ly)) continue;
            return def.walkable; // object tile is present — its walkable is the answer
          }
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
            if (def.cells && !def.cells.some(c => c.dx === lx && c.dy === ly)) continue;
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
            if (def.cells && !def.cells.some(c => c.dx === lx && c.dy === ly)) continue;
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
    getObjectRenderables(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): {
      ground: Renderable[];
      body: Renderable[];
      above: Renderable[];
    } {
      const ground: Renderable[] = [];
      const body: Renderable[] = [];
      const above: Renderable[] = [];
      if (!tileset) return { ground, body, above };

      ctx.imageSmoothingEnabled = false;

      for (const obj of placedObjects) {
        const def = tileset.getTile(obj.key);
        if (!def) continue;
        const pixelX = obj.x * BASE;
        const pixelY = obj.y * BASE;
        const drawX = Math.floor(pixelX - cameraX);
        const drawY = Math.floor(pixelY - cameraY);
        const gridH = Math.max(1, Math.round(def.h / BASE));

        const renderable: Renderable = {
          y: (obj.y + gridH - 1) * BASE,
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
          ctx.drawImage(tileset.image, def.sx, def.sy, def.w, def.h, drawX, drawY, BASE, BASE);
        }
      }
    },
  };
}

export type TileMap = ReturnType<typeof createTileMap>;
