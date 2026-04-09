/**
 * Tile Catalog — Gridded tileset support.
 *
 * Uses tileset-grid.png where every tile is at col*16, row*16.
 * No more pixel hunting — the grid IS the coordinate system.
 */

export type TileCategory =
  | 'grass'
  | 'path'
  | 'water'
  | 'tree'
  | 'building'
  | 'rock'
  | 'door'
  | 'decoration'
  | 'misc'
  | 'interior';

export interface TilesetInfo {
  id: string;
  label: string;
  path: string;
  cols: number;
  rows: number;
}

export interface TileDef {
  id: number;
  tilesetId: string;
  col: number;
  row: number;
  category: TileCategory;
  name: string;
  walkable: boolean;
  encounter: boolean;
}

/** Gridded tileset — tile at (col, row) = pixel (col*16, row*16) */
export const TILESETS: TilesetInfo[] = [
  { id: 'grid', label: 'Tileset', path: '/sprites/overworld/tileset-grid.png', cols: 16, rows: 21 },
];

export const TILE_CATEGORIES: { key: TileCategory; label: string }[] = [
  { key: 'grass', label: 'Grass' },
  { key: 'path', label: 'Paths' },
  { key: 'water', label: 'Water' },
  { key: 'interior', label: 'Interior' },
  { key: 'building', label: 'Buildings' },
  { key: 'tree', label: 'Trees' },
  { key: 'decoration', label: 'Decor' },
  { key: 'misc', label: 'Misc' },
];

// ─── Build catalog ──────────────────────────────────────────────

const catalogEntries: TileDef[] = [];
const idLookup = new Map<number, TileDef>();

function addTile(def: TileDef) {
  catalogEntries.push(def);
  idLookup.set(def.id, def);
}

// Row 0: Outdoor terrain (IDs 0-15)
// Row 1: Interior tiles (IDs 16-31)
// These match tileset-grid.json exactly.
const gameTiles: TileDef[] = [
  // Row 0: Outdoor
  { id: 0,  tilesetId: 'grid', col: 0,  row: 0, category: 'grass',    name: 'Grass',       walkable: true,  encounter: false },
  { id: 1,  tilesetId: 'grid', col: 1,  row: 0, category: 'grass',    name: 'Grass Alt',   walkable: true,  encounter: false },
  { id: 2,  tilesetId: 'grid', col: 2,  row: 0, category: 'grass',    name: 'Tall Grass',  walkable: true,  encounter: true },
  { id: 3,  tilesetId: 'grid', col: 3,  row: 0, category: 'path',     name: 'Sand Path',   walkable: true,  encounter: false },
  { id: 4,  tilesetId: 'grid', col: 4,  row: 0, category: 'path',     name: 'Stone',       walkable: true,  encounter: false },
  { id: 5,  tilesetId: 'grid', col: 5,  row: 0, category: 'path',     name: 'Cobblestone', walkable: true,  encounter: false },
  { id: 6,  tilesetId: 'grid', col: 6,  row: 0, category: 'path',     name: 'Dirt',        walkable: true,  encounter: false },
  { id: 7,  tilesetId: 'grid', col: 7,  row: 0, category: 'path',     name: 'Brick',       walkable: true,  encounter: false },
  { id: 8,  tilesetId: 'grid', col: 8,  row: 0, category: 'building', name: 'Red Tile',    walkable: false, encounter: false },
  { id: 9,  tilesetId: 'grid', col: 9,  row: 0, category: 'path',     name: 'Gray Stone',  walkable: true,  encounter: false },
  { id: 10, tilesetId: 'grid', col: 10, row: 0, category: 'path',     name: 'Marble',      walkable: true,  encounter: false },
  { id: 11, tilesetId: 'grid', col: 11, row: 0, category: 'path',     name: 'Light Floor', walkable: true,  encounter: false },
  { id: 12, tilesetId: 'grid', col: 12, row: 0, category: 'water',    name: 'Water',       walkable: false, encounter: false },
  { id: 13, tilesetId: 'grid', col: 13, row: 0, category: 'water',    name: 'Deep Water',  walkable: false, encounter: false },
  { id: 14, tilesetId: 'grid', col: 14, row: 0, category: 'misc',     name: 'Void',        walkable: false, encounter: false },
  { id: 15, tilesetId: 'grid', col: 15, row: 0, category: 'misc',     name: 'Door Mat',    walkable: true,  encounter: false },

  // Row 1: Interior
  { id: 16, tilesetId: 'grid', col: 0,  row: 1, category: 'interior', name: 'Wall Dark',   walkable: false, encounter: false },
  { id: 17, tilesetId: 'grid', col: 1,  row: 1, category: 'interior', name: 'Wall Brown',  walkable: false, encounter: false },
  { id: 18, tilesetId: 'grid', col: 2,  row: 1, category: 'interior', name: 'Wall Gray',   walkable: false, encounter: false },
  { id: 19, tilesetId: 'grid', col: 3,  row: 1, category: 'interior', name: 'Wall Accent', walkable: false, encounter: false },
  { id: 20, tilesetId: 'grid', col: 4,  row: 1, category: 'interior', name: 'Wall Blue',   walkable: false, encounter: false },
  { id: 21, tilesetId: 'grid', col: 5,  row: 1, category: 'interior', name: 'Counter',     walkable: false, encounter: false },
  { id: 22, tilesetId: 'grid', col: 6,  row: 1, category: 'interior', name: 'Counter Red', walkable: false, encounter: false },
  { id: 23, tilesetId: 'grid', col: 7,  row: 1, category: 'interior', name: 'Shelf',       walkable: false, encounter: false },
  { id: 24, tilesetId: 'grid', col: 8,  row: 1, category: 'interior', name: 'Shelf Dark',  walkable: false, encounter: false },
  { id: 25, tilesetId: 'grid', col: 9,  row: 1, category: 'interior', name: 'PC Floor',    walkable: true,  encounter: false },
  { id: 26, tilesetId: 'grid', col: 10, row: 1, category: 'interior', name: 'Mart Floor',  walkable: true,  encounter: false },
  { id: 27, tilesetId: 'grid', col: 11, row: 1, category: 'interior', name: 'Floor Alt',   walkable: true,  encounter: false },
];
for (const t of gameTiles) addTile(t);

// ─── Exports ────────────────────────────────────────────────────

export const TILE_CATALOG: readonly TileDef[] = catalogEntries;

export function getTileDef(id: number): TileDef | undefined {
  return idLookup.get(id);
}

export function getTilesByCategory(category: TileCategory): TileDef[] {
  return catalogEntries.filter((t) => t.category === category);
}

export function getTilesByTileset(tilesetId: string): TileDef[] {
  return catalogEntries.filter((t) => t.tilesetId === tilesetId);
}

export function getTilesetInfo(id: string): TilesetInfo | undefined {
  return TILESETS.find((ts) => ts.id === id);
}

export const TOTAL_TILES = catalogEntries.length;
