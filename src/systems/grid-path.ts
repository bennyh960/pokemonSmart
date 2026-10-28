/**
 * Shortest walk on the tile grid (breadth-first) — used by cutscenes that walk the player to a spot
 * the map decides (e.g. the library's Word Board), so no hand-written path per map.
 */

export type GridDir = 'up' | 'down' | 'left' | 'right';

export interface GridCell {
  x: number;
  y: number;
}

const STEPS: readonly { dir: GridDir; dx: number; dy: number }[] = [
  { dir: 'up', dx: 0, dy: -1 },
  { dir: 'down', dx: 0, dy: 1 },
  { dir: 'left', dx: -1, dy: 0 },
  { dir: 'right', dx: 1, dy: 0 },
];

/** Safety cap on explored cells (maps are at most a few thousand tiles). */
const MAX_VISITED = 20000;

/**
 * Shortest path from `start` to a cell next to any `target` cell, and the direction to face it.
 * `canStand(x, y)` says if the player may walk onto a cell (targets are never walked onto).
 * Returns null when no target can be reached. Already next to a target → empty path.
 */
export function pathToFace(
  start: GridCell,
  targets: readonly GridCell[],
  canStand: (x: number, y: number) => boolean,
): { path: GridDir[]; face: GridDir } | null {
  const isTarget = new Set(targets.map((c) => `${c.x},${c.y}`));
  const faceFrom = (x: number, y: number): GridDir | null =>
    STEPS.find((s) => isTarget.has(`${x + s.dx},${y + s.dy}`))?.dir ?? null;

  const from = new Map<string, { prev: string; dir: GridDir } | null>([[`${start.x},${start.y}`, null]]);
  const queue: GridCell[] = [start];
  for (let head = 0; head < queue.length && from.size < MAX_VISITED; head++) {
    const cell = queue[head];
    const face = faceFrom(cell.x, cell.y);
    if (face) return { path: walkBack(from, `${cell.x},${cell.y}`), face };
    for (const s of STEPS) {
      const nx = cell.x + s.dx;
      const ny = cell.y + s.dy;
      const key = `${nx},${ny}`;
      if (from.has(key) || isTarget.has(key) || !canStand(nx, ny)) continue;
      from.set(key, { prev: `${cell.x},${cell.y}`, dir: s.dir });
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

function walkBack(from: Map<string, { prev: string; dir: GridDir } | null>, end: string): GridDir[] {
  const path: GridDir[] = [];
  for (let step = from.get(end); step; step = from.get(step.prev)) path.unshift(step.dir);
  return path;
}
