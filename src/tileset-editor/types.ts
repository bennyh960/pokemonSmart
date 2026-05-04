import type { BattleBackgroundId } from '../data/battle-backgrounds.js';

/** A single tile definition in the manifest output. */
export interface TileEntry {
  key: string;
  sx: number;
  sy: number;
  w: number; // pixel width
  h: number; // pixel height
  /** Optional render priority override. Higher values draw above lower/undefined. */
  zOffset?: number;
  walkable: boolean;
  /** Encounter type filter: undefined = not encounterable, ['*'] = all, ['water'] = water only */
  encounterTypes?: string[];
  battleBackground?: BattleBackgroundId;
  above: boolean;
  overlay?: boolean; // true = renders on top of player (tall grass); false/absent = flat ground
  category?: string;
  /** Interactive type ref — only meaningful when category is 'interactive'. */
  interactType?: { id: string; args?: Record<string, unknown> } | null;
  description?: string;
  /** For grouped non-adjacent tiles: list of included 16x16 cells as grid offsets from (sx,sy).
   *  When absent, the entire sx/sy/w/h rectangle is the tile.
   *  When present, only these cells are rendered/collidable. */
  cells?: Array<{ dx: number; dy: number }>;
}

/** The final manifest JSON output. */
export interface TileManifest {
  image: string;
  tiles: TileEntry[];
}

export type TsEditorEvent =
  | 'selection-changed'
  | 'multi-selection-changed'
  | 'item-selected'
  | 'items-changed'
  | 'viewport-changed'
  | 'crop-mode-changed'
  | 'crop-target-changed';

/** Preset categories for the dropdown. */
export const TILE_CATEGORIES = [
  'grass',
  'ground',
  'road',
  'floor',
  'wall',
  'building',
  'tree',
  'water',
  'decoration',
  'interior',
  'interactive',
  'other',
] as const;
