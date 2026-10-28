import { describe, expect, it } from 'vitest';
import def from '../index.js';
import { levelSymbols } from '../config.js';
import {
  EMPTY,
  allUnits,
  candidates,
  completedUnits,
  countGivens,
  countSolutions,
  createRng,
  findHint,
  generatePuzzle,
  generateSolution,
  isValidSolution,
  solvableBySingles,
  starsFor,
  wrongCells,
  type GridSpec,
} from '../sudoku.js';

const SPEC_4: GridSpec = { size: 4, boxRows: 2, boxCols: 2 };
const SPEC_6: GridSpec = { size: 6, boxRows: 2, boxCols: 3 };
const SEEDS = Array.from({ length: 25 }, (_, i) => 1000 + i * 7919);

describe('poke-doku geometry', () => {
  it('has size rows + size cols + size boxes, each with size distinct cells', () => {
    for (const spec of [SPEC_4, SPEC_6]) {
      const units = allUnits(spec);
      expect(units).toHaveLength(spec.size * 3);
      for (const u of units) expect(new Set(u.cells).size).toBe(spec.size);
      // Every cell is in exactly one box.
      const boxes = units.filter((u) => u.kind === 'box').flatMap((u) => u.cells);
      expect(new Set(boxes).size).toBe(spec.size * spec.size);
    }
  });

  it('6×6 boxes are 2 rows tall and 3 columns wide', () => {
    const box0 = allUnits(SPEC_6).find((u) => u.kind === 'box' && u.index === 0)!;
    expect(box0.cells).toEqual([0, 1, 2, 6, 7, 8]);
  });
});

describe('poke-doku generator', () => {
  it('builds valid full solutions', () => {
    for (const spec of [SPEC_4, SPEC_6]) {
      for (const seed of SEEDS) expect(isValidSolution(spec, generateSolution(spec, createRng(seed)))).toBe(true);
    }
  });

  it('is deterministic by seed', () => {
    for (const spec of [SPEC_4, SPEC_6]) {
      const a = generatePuzzle(spec, 12, 42);
      const b = generatePuzzle(spec, 12, 42);
      expect(a).toEqual(b);
      const c = generatePuzzle(spec, 12, 43);
      expect(c.puzzle).not.toEqual(a.puzzle);
    }
  });

  it('every level: exact givens, unique solution, givens match the solution, singles-solvable', () => {
    for (const level of def.levels) {
      const cfg = level.config;
      for (const seed of SEEDS) {
        const { puzzle, solution } = generatePuzzle(cfg, cfg.givens, seed);
        expect(isValidSolution(cfg, solution)).toBe(true);
        expect(countGivens(puzzle)).toBe(cfg.givens);
        expect(countSolutions(cfg, puzzle)).toBe(1);
        expect(solvableBySingles(cfg, puzzle)).toBe(true);
        puzzle.forEach((v, k) => {
          if (v !== EMPTY) expect(v).toBe(solution[k]);
        });
      }
    }
  });

  it('counts multiple solutions on an empty grid (stops at the limit)', () => {
    expect(countSolutions(SPEC_4, new Array(16).fill(EMPTY))).toBe(2);
    expect(countSolutions(SPEC_4, new Array(16).fill(EMPTY), 5)).toBe(5);
  });

  it('counts zero solutions on a contradictory grid', () => {
    const g = new Array(16).fill(EMPTY);
    g[0] = 0;
    g[1] = 0; // same row
    expect(countSolutions(SPEC_4, g)).toBe(0);
  });
});

describe('poke-doku level data', () => {
  it('has one distinct symbol per grid number, and box sizes fit the grid', () => {
    for (const level of def.levels) {
      const cfg = level.config;
      expect(cfg.boxRows * cfg.boxCols).toBe(cfg.size);
      expect(new Set(cfg.pokemon).size).toBe(cfg.size);
      const symbols = levelSymbols(cfg);
      if (cfg.symbols === 'types') {
        expect(new Set(symbols.map((s) => s.type)).size).toBe(cfg.size);
        for (const s of symbols) expect(s.type).toBeDefined();
      }
      for (const s of symbols) expect(s.name.en.startsWith('#')).toBe(false);
    }
  });
});

describe('poke-doku play helpers', () => {
  const { puzzle, solution } = generatePuzzle(SPEC_6, 13, 7);

  it('hints are always true and the cell is empty', () => {
    const grid = [...puzzle];
    for (let step = 0; step < 50; step++) {
      const h = findHint(SPEC_6, grid, solution);
      if (!h) break;
      expect(grid[h.cell]).toBe(EMPTY);
      expect(h.value).toBe(solution[h.cell]);
      expect(h.kind).not.toBe('reveal'); // singles-solvable puzzle → always a real deduction
      if (h.kind === 'single') expect(candidates(SPEC_6, grid, h.cell)).toEqual([h.value]);
      grid[h.cell] = h.value;
    }
    expect(grid).toEqual(solution);
  });

  it('hints ignore wrong entries and point at them when the board is full', () => {
    const full = [...solution];
    const k = puzzle.indexOf(EMPTY);
    full[k] = (solution[k] + 1) % 6;
    expect(findHint(SPEC_6, full, solution)).toEqual({ cell: k, value: solution[k], kind: 'fix' });
    expect(findHint(SPEC_6, solution, solution)).toBeNull();
  });

  it('wrongCells lists only player mistakes', () => {
    const grid = [...puzzle];
    const empties = puzzle.map((v, i) => (v === EMPTY ? i : -1)).filter((i) => i >= 0);
    grid[empties[0]] = solution[empties[0]];
    grid[empties[1]] = (solution[empties[1]] + 1) % 6;
    expect(wrongCells(grid, solution, puzzle)).toEqual([empties[1]]);
  });

  it('completedUnits finds the rows/cols/boxes that are fully right', () => {
    expect(completedUnits(SPEC_6, solution, solution, 0).map((u) => u.kind)).toEqual(['row', 'col', 'box']);
    const g = [...solution];
    g[1] = EMPTY;
    expect(completedUnits(SPEC_6, g, solution, 0).map((u) => u.kind)).toEqual(['col']);
  });

  it('stars: 0 → 3★, ≤2 → 2★, else 1★ (mistakes + hints)', () => {
    expect(starsFor(0, 0)).toBe(3);
    expect(starsFor(1, 0)).toBe(2);
    expect(starsFor(1, 1)).toBe(2);
    expect(starsFor(0, 3)).toBe(1);
    expect(starsFor(2, 1)).toBe(1);
  });
});
