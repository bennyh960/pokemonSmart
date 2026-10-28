/**
 * Poké-Doku — pure Sudoku logic (no React, no game data).
 *
 * A grid is a flat array of `size * size` cells, row-major. A cell holds a symbol index
 * `0 … size-1`, or `EMPTY`. Boxes are `boxRows` tall and `boxCols` wide (4×4 → 2×2, 6×6 → 2×3).
 *
 * `generatePuzzle(spec, givens, seed)` is deterministic per seed and always returns a puzzle with
 * exactly one solution: it builds a random full solution, then removes givens one by one in a random
 * order, keeping a removal only while the solver still counts exactly one solution.
 */

export const EMPTY = -1;

export interface GridSpec {
  size: number;
  boxRows: number;
  boxCols: number;
}

export type Grid = number[];

export interface Puzzle {
  /** Givens only (EMPTY elsewhere). */
  puzzle: Grid;
  solution: Grid;
  seed: number;
}

export type UnitKind = 'row' | 'col' | 'box';

export interface Unit {
  kind: UnitKind;
  /** Row / column / box number. */
  index: number;
  cells: number[];
}

// ── Random ──────────────────────────────────────────────────────────────────

/** Small seeded PRNG (mulberry32). Returns floats in [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Geometry ────────────────────────────────────────────────────────────────

export function boxOf(spec: GridSpec, cell: number): number {
  const r = Math.floor(cell / spec.size);
  const c = cell % spec.size;
  const boxesAcross = spec.size / spec.boxCols;
  return Math.floor(r / spec.boxRows) * boxesAcross + Math.floor(c / spec.boxCols);
}

const unitCache = new Map<string, Unit[]>();

/** All rows, columns and boxes of a grid shape (cached). */
export function allUnits(spec: GridSpec): Unit[] {
  const key = `${spec.size}:${spec.boxRows}:${spec.boxCols}`;
  const cached = unitCache.get(key);
  if (cached) return cached;
  const { size } = spec;
  const units: Unit[] = [];
  for (let i = 0; i < size; i++) {
    units.push({ kind: 'row', index: i, cells: Array.from({ length: size }, (_, k) => i * size + k) });
  }
  for (let i = 0; i < size; i++) {
    units.push({ kind: 'col', index: i, cells: Array.from({ length: size }, (_, k) => k * size + i) });
  }
  for (let i = 0; i < size; i++) {
    const cells: number[] = [];
    for (let cell = 0; cell < size * size; cell++) if (boxOf(spec, cell) === i) cells.push(cell);
    units.push({ kind: 'box', index: i, cells });
  }
  unitCache.set(key, units);
  return units;
}

/** The row, column and box that contain `cell`. */
export function unitsOf(spec: GridSpec, cell: number): Unit[] {
  const r = Math.floor(cell / spec.size);
  const c = cell % spec.size;
  const b = boxOf(spec, cell);
  return allUnits(spec).filter(
    (u) =>
      (u.kind === 'row' && u.index === r) || (u.kind === 'col' && u.index === c) || (u.kind === 'box' && u.index === b),
  );
}

export function unitKey(u: Unit): string {
  return `${u.kind}${u.index}`;
}

// ── Rules ───────────────────────────────────────────────────────────────────

/** Symbols that can go in `cell` given the other filled cells (the cell's own value is ignored). */
export function candidates(spec: GridSpec, grid: Grid, cell: number): number[] {
  const used = new Set<number>();
  for (const u of unitsOf(spec, cell)) for (const k of u.cells) if (k !== cell && grid[k] !== EMPTY) used.add(grid[k]);
  const out: number[] = [];
  for (let v = 0; v < spec.size; v++) if (!used.has(v)) out.push(v);
  return out;
}

/** True when the grid is full and every unit holds each symbol once. */
export function isValidSolution(spec: GridSpec, grid: Grid): boolean {
  if (grid.length !== spec.size * spec.size) return false;
  return allUnits(spec).every((u) => {
    const seen = new Set(u.cells.map((k) => grid[k]));
    return seen.size === spec.size && !seen.has(EMPTY);
  });
}

/**
 * Counts solutions by backtracking (most-constrained cell first), stopping at `limit`.
 * `countSolutions(...) === 1` ⇔ the puzzle is unique.
 */
export function countSolutions(spec: GridSpec, grid: Grid, limit = 2): number {
  const g = [...grid];
  let count = 0;
  const search = (): void => {
    if (count >= limit) return;
    let best = -1;
    let bestCands: number[] | null = null;
    for (let cell = 0; cell < g.length; cell++) {
      if (g[cell] !== EMPTY) continue;
      const cands = candidates(spec, g, cell);
      if (cands.length === 0) return; // dead end
      if (!bestCands || cands.length < bestCands.length) {
        best = cell;
        bestCands = cands;
        if (cands.length === 1) break;
      }
    }
    if (best === -1) {
      count++;
      return;
    }
    for (const v of bestCands!) {
      g[best] = v;
      search();
      if (count >= limit) break;
    }
    g[best] = EMPTY;
  };
  search();
  return count;
}

// ── Generation ──────────────────────────────────────────────────────────────

/** A random full valid grid. */
export function generateSolution(spec: GridSpec, rng: () => number): Grid {
  const g: Grid = new Array(spec.size * spec.size).fill(EMPTY);
  const fill = (cell: number): boolean => {
    if (cell === g.length) return true;
    for (const v of shuffle(candidates(spec, g, cell), rng)) {
      g[cell] = v;
      if (fill(cell + 1)) return true;
    }
    g[cell] = EMPTY;
    return false;
  };
  fill(0);
  return g;
}

/**
 * True when the grid can be finished using only the two "single" deductions Psyduck's hint
 * teaches (one symbol left for a cell / one place left for a symbol in a unit). Keeps puzzles
 * kid-sized: never a guess needed.
 */
export function solvableBySingles(spec: GridSpec, grid: Grid): boolean {
  const g = [...grid];
  for (;;) {
    const hint = nextSingle(
      spec,
      g,
      g.map((v, k) => (v === EMPTY ? k : -1)).filter((k) => k >= 0),
    );
    if (!hint) return g.every((v) => v !== EMPTY);
    g[hint.cell] = hint.value;
  }
}

const MAX_ATTEMPTS = 40;

/**
 * A unique-solution puzzle with exactly `givens` givens (or as few as reachable, if the target is
 * below what this seed can do in `MAX_ATTEMPTS` tries). Same seed → same puzzle.
 */
export function generatePuzzle(spec: GridSpec, givens: number, seed: number): Puzzle {
  const rng = createRng(seed);
  const total = spec.size * spec.size;
  let best: Puzzle | null = null;
  let bestGivens = Infinity;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const solution = generateSolution(spec, rng);
    const puzzle = [...solution];
    let left = total;
    for (const cell of shuffle(
      Array.from({ length: total }, (_, i) => i),
      rng,
    )) {
      if (left <= givens) break;
      const keep = puzzle[cell];
      puzzle[cell] = EMPTY;
      if (countSolutions(spec, puzzle) === 1 && solvableBySingles(spec, puzzle)) left--;
      else puzzle[cell] = keep;
    }
    if (left < bestGivens) {
      best = { puzzle, solution, seed };
      bestGivens = left;
    }
    if (left <= givens) break;
  }
  return best!;
}

export function countGivens(grid: Grid): number {
  return grid.filter((v) => v !== EMPTY).length;
}

// ── Play helpers ────────────────────────────────────────────────────────────

/** Units through `cell` that are completely filled with the right answers. */
export function completedUnits(spec: GridSpec, grid: Grid, solution: Grid, cell: number): Unit[] {
  return unitsOf(spec, cell).filter((u) => u.cells.every((k) => grid[k] === solution[k]));
}

/** Player-filled cells whose value is not the solution's. */
export function wrongCells(grid: Grid, solution: Grid, puzzle: Grid): number[] {
  const out: number[] = [];
  for (let k = 0; k < grid.length; k++) {
    if (puzzle[k] === EMPTY && grid[k] !== EMPTY && grid[k] !== solution[k]) out.push(k);
  }
  return out;
}

export function isSolved(grid: Grid, solution: Grid): boolean {
  return grid.every((v, k) => v === solution[k]);
}

export type HintKind = 'single' | UnitKind | 'reveal' | 'fix';

export interface Hint {
  cell: number;
  value: number;
  /**
   * single = the only symbol left for this cell · row/col/box = the only place for this symbol in
   * that unit · reveal = no simple deduction found, just tell · fix = the cell holds a wrong symbol.
   */
  kind: HintKind;
}

/**
 * A cell the player can fill by pure reasoning, from what is right on the board so far
 * (wrong entries are ignored so the hint is always true). Prefers empty cells; if the board has
 * none, points at a wrong one.
 */
export function findHint(spec: GridSpec, grid: Grid, solution: Grid): Hint | null {
  const known = grid.map((v, k) => (v === solution[k] ? v : EMPTY));
  const empties = grid.map((v, k) => (v === EMPTY ? k : -1)).filter((k) => k >= 0);
  if (empties.length === 0) {
    const wrong = grid.findIndex((v, k) => v !== solution[k]);
    return wrong < 0 ? null : { cell: wrong, value: solution[wrong], kind: 'fix' };
  }
  const single = nextSingle(spec, known, empties);
  if (single) return single;
  // Fallback: the most constrained empty cell, answer told.
  let cell = empties[0];
  let fewest = Infinity;
  for (const k of empties) {
    const n = candidates(spec, known, k).length;
    if (n < fewest) {
      fewest = n;
      cell = k;
    }
  }
  return { cell, value: solution[cell], kind: 'reveal' };
}

/** First naked single (cell with one candidate), else hidden single (symbol with one spot in a unit), among `targets`. */
function nextSingle(spec: GridSpec, grid: Grid, targets: number[]): Hint | null {
  for (const cell of targets) {
    const c = candidates(spec, grid, cell);
    if (c.length === 1) return { cell, value: c[0], kind: 'single' };
  }
  const targetSet = new Set(targets);
  for (const u of allUnits(spec)) {
    const present = new Set(u.cells.map((k) => grid[k]));
    for (let v = 0; v < spec.size; v++) {
      if (present.has(v)) continue;
      const spots = u.cells.filter((k) => grid[k] === EMPTY && candidates(spec, grid, k).includes(v));
      if (spots.length === 1 && targetSet.has(spots[0])) return { cell: spots[0], value: v, kind: u.kind };
    }
  }
  return null;
}

/** Stars from mistakes + hints combined: 0 → 3★, ≤2 → 2★, else 1★. */
export function starsFor(mistakes: number, hints: number): 1 | 2 | 3 {
  const n = mistakes + hints;
  return n === 0 ? 3 : n <= 2 ? 2 : 1;
}
