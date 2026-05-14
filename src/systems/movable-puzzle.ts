import type { TileMapData, PlacedObject } from '../engine/tilemap.js';
import type { Tileset } from '../engine/tileset.js';
import type { PlayerData } from '../types/index.js';
import { setFlag } from './game-state.js';

const BASE = 16;
const SLIDE_DURATION = 0.2; // seconds — matches MOVE_DURATION in overworld

interface Renderable {
  y: number;
  render: () => void;
  zOffset?: number;
  order?: number;
}

interface MovableTile {
  key: string;
  x: number;
  y: number;
  readonly initX: number;
  readonly initY: number;
  animFromX: number;
  animFromY: number;
  animProgress: number; // 0 → 1; 1 = no animation in progress
}

interface ActivePuzzle {
  readonly id: string;
  readonly config: NonNullable<TileMapData['movablePuzzle']>[string];
  tiles: MovableTile[];
  solved: boolean;
  /** "key,x,y" for every moveable-key tile in the ref room */
  readonly refTileSet: ReadonlySet<string>;
  /** refRoom.x2 + puzzleRoom.x1 — used in the mirror formula */
  readonly axisSum: number;
}

let puzzles: ActivePuzzle[] = [];
let activeTileset: Tileset | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/** Call after loadMap, before createTileMap. Captures moveable tile state from map objects. */
export function init(data: TileMapData, tileset: Tileset | null | undefined): void {
  puzzles = [];
  activeTileset = tileset ?? null;

  const configs = data.movablePuzzle;
  if (!configs || !data.objects) return;

  for (const [id, config] of Object.entries(configs)) {
    const { puzzleRoom, movableTileKeys } = config;
    const refRoom = config.refRoom;
    const keySet = new Set(movableTileKeys);

    const tiles: MovableTile[] = data.objects
      .filter(o =>
        keySet.has(o.key) &&
        o.x >= puzzleRoom.x1 && o.x <= puzzleRoom.x2 &&
        o.y >= puzzleRoom.y1 && o.y <= puzzleRoom.y2,
      )
      .map(o => ({ key: o.key, x: o.x, y: o.y, initX: o.x, initY: o.y, animFromX: o.x, animFromY: o.y, animProgress: 1 }));

    const refTileSet = new Set(
      refRoom
        ? data.objects
          .filter(o =>
            keySet.has(o.key) &&
            o.x >= refRoom.x1 && o.x <= refRoom.x2 &&
            o.y >= refRoom.y1 && o.y <= refRoom.y2,
          )
          .map(o => `${o.key},${o.x},${o.y}`)
        : [],
    );

    puzzles.push({ id, config, tiles, solved: false, refTileSet, axisSum: refRoom ? refRoom.x2 + puzzleRoom.x1 : 0 });
  }
}

/** Remove puzzle-room moveable tiles from the static placed objects so tilemap doesn't own them. */
export function filterObjects(objects: PlacedObject[]): PlacedObject[] {
  if (puzzles.length === 0) return objects;
  return objects.filter(obj =>
    !puzzles.some(p => {
      const { puzzleRoom, movableTileKeys } = p.config;
      return movableTileKeys.includes(obj.key) &&
        obj.x >= puzzleRoom.x1 && obj.x <= puzzleRoom.x2 &&
        obj.y >= puzzleRoom.y1 && obj.y <= puzzleRoom.y2;
    }),
  );
}

/** Returns the moveable tile at grid position (gx, gy), or null. */
export function getTileAt(gx: number, gy: number): MovableTile | null {
  for (const p of puzzles) {
    for (const t of p.tiles) {
      if (t.x === gx && t.y === gy) return t;
    }
  }
  return null;
}

/**
 * Try to push the moveable tile at (tx, ty) in direction (dx, dy).
 * Returns true if the push succeeded — caller should then allow the player to step forward.
 */
export function tryPush(
  tx: number, ty: number,
  dx: number, dy: number,
  isWalkableFn: (x: number, y: number) => boolean,
): boolean {
  let ownerPuzzle: ActivePuzzle | null = null;
  let tile: MovableTile | null = null;

  outer: for (const p of puzzles) {
    for (const t of p.tiles) {
      if (t.x === tx && t.y === ty) { tile = t; ownerPuzzle = p; break outer; }
    }
  }
  if (!tile || !ownerPuzzle) return false;

  const nx = tile.x + dx;
  const ny = tile.y + dy;
  const { x1, y1, x2, y2 } = ownerPuzzle.config.puzzleRoom;

  if (nx < x1 || nx > x2 || ny < y1 || ny > y2) return false;
  if (!isWalkableFn(nx, ny)) return false;
  if (getTileAt(nx, ny)) return false;

  // Record animation start position before updating grid coords
  tile.animFromX = tile.x;
  tile.animFromY = tile.y;
  tile.animProgress = 0;

  tile.x = nx;
  tile.y = ny;

  checkStuck(tile, ownerPuzzle, isWalkableFn);
  return true;
}

/**
 * Check symmetry for all active puzzles; sets successFlag on pd when solved.
 * Returns true if any puzzle was newly solved this call.
 */
export function checkSymmetry(pd: PlayerData): boolean {
  let anySolved = false;
  for (const p of puzzles) {
    if (p.solved) continue;
    if (!p.config.successFlag || !p.config.refRoom) continue;

    const allMatch = p.tiles.every(tile => {
      const gridW = tileGridW(tile.key);
      const refX = p.axisSum - tile.x - (gridW - 1);
      return p.refTileSet.has(`${tile.key},${refX},${tile.y}`);
    });

    if (allMatch) {
      p.solved = true;
      setFlag(pd, p.config.successFlag);
      anySolved = true;
    }
  }
  return anySolved;
}

/** Advance slide animations. Call every frame from the overworld update loop. */
export function update(dt: number): void {
  for (const p of puzzles) {
    for (const tile of p.tiles) {
      if (tile.animProgress < 1) {
        tile.animProgress = Math.min(1, tile.animProgress + dt / SLIDE_DURATION);
      }
    }
  }
}

/** Returns body-layer renderables for all moveable tiles (call each render frame). */
export function getRenderables(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
): Renderable[] {
  if (!activeTileset || puzzles.length === 0) return [];

  ctx.imageSmoothingEnabled = false;
  const result: Renderable[] = [];

  for (const p of puzzles) {
    for (const tile of p.tiles) {
      const def = activeTileset.getTile(tile.key);
      if (!def) continue;

      const gridH = Math.max(1, Math.round(def.h / BASE));
      const ts = activeTileset;
      // Capture tile reference for closure — progress and position are read at render time
      const t = tile;

      result.push({
        y: (t.y + gridH - 1) * BASE,
        render: () => {
          // Interpolate pixel position between animFrom and target
          const progress = t.animProgress;
          const px = progress < 1
            ? t.animFromX * BASE + (t.x * BASE - t.animFromX * BASE) * progress
            : t.x * BASE;
          const py = progress < 1
            ? t.animFromY * BASE + (t.y * BASE - t.animFromY * BASE) * progress
            : t.y * BASE;
          const drawX = Math.floor(px - cameraX);
          const drawY = Math.floor(py - cameraY);

          if (def.cells) {
            for (const cell of def.cells) {
              ctx.drawImage(ts.image, def.sx + cell.dx * BASE, def.sy + cell.dy * BASE, BASE, BASE,
                drawX + cell.dx * BASE, drawY + cell.dy * BASE, BASE, BASE);
            }
          } else {
            ctx.drawImage(ts.image, def.sx, def.sy, def.w, def.h, drawX, drawY, def.w, def.h);
          }
        },
      });
    }
  }

  return result;
}

/** Reset all puzzle state — call on map change. */
export function reset(): void {
  puzzles = [];
  activeTileset = null;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function tileGridW(key: string): number {
  if (!activeTileset) return 1;
  const def = activeTileset.getTile(key);
  return def ? Math.max(1, Math.round(def.w / BASE)) : 1;
}

function checkStuck(
  tile: MovableTile,
  puzzle: ActivePuzzle,
  isWalkableFn: (x: number, y: number) => boolean,
): void {
  const { x1, y1, x2, y2 } = puzzle.config.puzzleRoom;
  const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];

  const canMove = dirs.some(d => {
    const nx = tile.x + d.dx;
    const ny = tile.y + d.dy;
    return nx >= x1 && nx <= x2 && ny >= y1 && ny <= y2 &&
      isWalkableFn(nx, ny) && !getTileAt(nx, ny);
  });

  if (!canMove) teleport(tile, puzzle, isWalkableFn);
}

function teleport(
  tile: MovableTile,
  puzzle: ActivePuzzle,
  isWalkableFn: (x: number, y: number) => boolean,
): void {
  const { x1, y1, x2, y2 } = puzzle.config.puzzleRoom;
  const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
  const candidates: { x: number; y: number }[] = [];

  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (x === tile.x && y === tile.y) continue;
      if (!isWalkableFn(x, y)) continue;
      if (getTileAt(x, y)) continue;
      const notStuck = dirs.some(d => {
        const nx = x + d.dx;
        const ny = y + d.dy;
        return nx >= x1 && nx <= x2 && ny >= y1 && ny <= y2 &&
          isWalkableFn(nx, ny) && !getTileAt(nx, ny);
      });
      if (notStuck) candidates.push({ x, y });
    }
  }

  if (candidates.length > 0) {
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    tile.animFromX = tile.x;
    tile.animFromY = tile.y;
    tile.animProgress = 0;
    tile.x = pick.x;
    tile.y = pick.y;
  }
}
