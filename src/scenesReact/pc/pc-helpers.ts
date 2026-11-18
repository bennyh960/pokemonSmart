// src/scenesReact/pc/pc-helpers.ts
import type { Pokemon, PokemonType } from '../../types/index.js';
import { getPokemon } from '../../services/pokemon-data.js';

export type Zone = 'party' | 'box';
export interface Spot {
  zone: Zone;
  idx: number;
}

export const GRID_COLS = 6;

/** Search + type filter shared by the box grid, the box tabs and the team column. */
export interface PCFilter {
  query: string;
  type: PokemonType | null;
}

export const isFiltering = (f: PCFilter): boolean => f.query.trim() !== '' || f.type !== null;

/** Matches the typed text against both the English and Hebrew species name, and the chosen type. */
export function matchesFilter(p: Pokemon, f: PCFilter): boolean {
  if (f.type && !p.types.includes(f.type)) return false;
  const q = f.query.trim().toLowerCase();
  if (!q) return true;
  const name = getPokemon(p.id)?.name;
  return !!name && (name.en.toLowerCase().includes(q) || name.he.includes(q));
}

/** Types the player actually owns, so the filter only offers useful choices. */
export function ownedTypes(all: (Pokemon | null)[]): PokemonType[] {
  const set = new Set<PokemonType>();
  for (const p of all) p?.types.forEach((t) => set.add(t));
  return [...set].sort();
}

/** Arrow-key step inside the 6×5 box grid; in RTL the grid starts on the right, so left/right flip. */
export function stepInGrid(idx: number, key: string, rtl: boolean, size: number): number {
  const col = idx % GRID_COLS;
  const row = Math.floor(idx / GRID_COLS);
  const rows = Math.ceil(size / GRID_COLS);
  const dx = key === 'right' ? (rtl ? -1 : 1) : key === 'left' ? (rtl ? 1 : -1) : 0;
  const dy = key === 'down' ? 1 : key === 'up' ? -1 : 0;
  const c = Math.max(0, Math.min(GRID_COLS - 1, col + dx));
  const r = Math.max(0, Math.min(rows - 1, row + dy));
  return r * GRID_COLS + c;
}
