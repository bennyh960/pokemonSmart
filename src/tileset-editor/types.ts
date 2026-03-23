/** A single tile definition in the manifest output. */
export interface TileEntry {
  key: string;
  sx: number;
  sy: number;
  w: number;       // pixel width
  h: number;       // pixel height
  walkable: boolean;
  encounter: boolean;
  destroy: null | 'cut' | 'strength';
  above: boolean;
  category?: string;
}

/** The final manifest JSON output. */
export interface TileManifest {
  image: string;
  tiles: TileEntry[];
}

export type TsEditorEvent =
  | 'selection-changed'
  | 'item-selected'
  | 'items-changed'
  | 'viewport-changed';

/** Preset categories for the dropdown. */
export const TILE_CATEGORIES = [
  'grass', 'ground', 'road','floor', 'wall', 'building',
  'tree', 'water', 'decoration', 'interior', 'other',
] as const;
