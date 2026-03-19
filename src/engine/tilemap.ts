/**
 * Tilemap - Load and render tile-based maps from JSON.
 *
 * Tile types:
 *   0 = empty (black)
 *   1 = grass (#48A030, walkable)
 *   2 = path (#C8A870, walkable)
 *   3 = water (#3080D0, blocked)
 *   4 = tree (#206020, blocked)
 *   5 = building (#808080, blocked)
 *   6 = door (#8B4513, walkable)
 *   7 = tall grass (#68C048, walkable + encounters)
 */

import { fillRect } from './renderer.js';

/** Map data as loaded from JSON. */
export interface TileMapData {
  name: string;
  width: number;
  height: number;
  tileSize: number;
  spawn: { x: number; y: number };
  tiles: number[][];
}

/** Tile type constants. */
export const TILE_EMPTY = 0;
export const TILE_GRASS = 1;
export const TILE_PATH = 2;
export const TILE_WATER = 3;
export const TILE_TREE = 4;
export const TILE_BUILDING = 5;
export const TILE_DOOR = 6;
export const TILE_TALL_GRASS = 7;

/** Colors for each tile type (indexed by tile ID). */
const TILE_COLORS: Record<number, string> = {
  [TILE_EMPTY]: '#000000',
  [TILE_GRASS]: '#48A030',
  [TILE_PATH]: '#C8A870',
  [TILE_WATER]: '#3080D0',
  [TILE_TREE]: '#206020',
  [TILE_BUILDING]: '#808080',
  [TILE_DOOR]: '#8B4513',
  [TILE_TALL_GRASS]: '#68C048',
};

/** Blocked tiles that the player cannot walk on. */
const BLOCKED_TILES = new Set([TILE_WATER, TILE_TREE, TILE_BUILDING]);

/** Create a tilemap from loaded JSON data. */
export function createTileMap(data: TileMapData) {
  const { width, height, tileSize, tiles, spawn, name } = data;

  return {
    name,
    width,
    height,
    tileSize,
    spawn,

    /** Get the tile type at grid position (gx, gy). Returns -1 if out of bounds. */
    getTile(gx: number, gy: number): number {
      if (gx < 0 || gx >= width || gy < 0 || gy >= height) return -1;
      return tiles[gy][gx];
    },

    /** Check if a grid position is walkable. */
    isWalkable(gx: number, gy: number): boolean {
      const tile = this.getTile(gx, gy);
      if (tile === -1) return false;
      return !BLOCKED_TILES.has(tile);
    },

    /** Check if a grid position is tall grass (triggers encounters). */
    isTallGrass(gx: number, gy: number): boolean {
      return this.getTile(gx, gy) === TILE_TALL_GRASS;
    },

    /** Render visible tiles to the canvas, offset by camera. */
    render(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
      const screenW = ctx.canvas.width;
      const screenH = ctx.canvas.height;

      // Calculate visible tile range
      const startCol = Math.max(0, Math.floor(cameraX / tileSize));
      const startRow = Math.max(0, Math.floor(cameraY / tileSize));
      const endCol = Math.min(width - 1, Math.floor((cameraX + screenW) / tileSize));
      const endRow = Math.min(height - 1, Math.floor((cameraY + screenH) / tileSize));

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const tile = tiles[row][col];
          const color = TILE_COLORS[tile] ?? '#FF00FF';
          const drawX = col * tileSize - cameraX;
          const drawY = row * tileSize - cameraY;
          fillRect(ctx, Math.floor(drawX), Math.floor(drawY), tileSize, tileSize, color);
        }
      }
    },
  };
}

/** The return type of createTileMap, for use in type annotations. */
export type TileMap = ReturnType<typeof createTileMap>;
