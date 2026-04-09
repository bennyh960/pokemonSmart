/**
 * ObjectCatalog — Types and loader for the 2-layer map system.
 *
 * Uses the gridded tileset where tile at (col, row) = pixel (col*16, row*16).
 * Ground tiles are 1×1 cells (16×16px).
 * Objects span multiple cells (e.g. a building is 3×3 = 48×48px).
 */

const T = 16;

/** Definition of a placeable map object. */
export interface ObjectDef {
  id: string;
  name: string;
  col: number;              // source column in tileset grid
  row: number;              // source row in tileset grid
  cellsW: number;           // width in grid cells
  cellsH: number;           // height in grid cells
  // Computed from grid position:
  sx: number;               // col * 16
  sy: number;               // row * 16
  sw: number;               // cellsW * 16
  sh: number;               // cellsH * 16
  gridW: number;            // same as cellsW (for compat)
  gridH: number;            // same as cellsH (for compat)
  collision: boolean[][];   // gridH rows × gridW cols
  anchorY: number;          // Y-sort anchor (usually gridH - 1)
  category: string;
}

/** A placed object instance on a map. */
export interface MapObject {
  id: string;
  x: number;
  y: number;
}

/** Ground tile definition. */
export interface GroundTileDef {
  id: number;
  name: string;
  col: number;
  row: number;
  sx: number;    // col * 16
  sy: number;    // row * 16
  walkable: boolean;
  encounter: boolean;
  category: string;
}

/** Loaded catalog. */
export interface AtlasCatalog {
  atlasPath: string;
  groundTiles: Map<number, GroundTileDef>;
  objects: Map<string, ObjectDef>;
}

/** Raw manifest JSON from tileset-grid.json. */
interface GridManifestJSON {
  tileSize: number;
  cols: number;
  rows: number;
  groundTiles: {
    id: number; name: string; col: number; row: number;
    walkable: boolean; encounter: boolean; category: string;
  }[];
  objects: {
    id: string; name: string; col: number; row: number;
    cellsW: number; cellsH: number;
  }[];
  // Legacy fields (atlas-manifest.json format)
  atlas?: string;
}

/** Legacy manifest format (atlas-manifest.json). */
interface LegacyManifestJSON {
  atlas: string;
  groundTiles: {
    id: number; name: string; sx: number; sy: number;
    walkable: boolean; encounter: boolean; category: string;
  }[];
  objects: ObjectDef[];
}

/** Default collision: all cells blocked except bottom-center for buildings. */
function defaultCollision(w: number, h: number, category?: string): boolean[][] {
  const grid: boolean[][] = [];
  for (let r = 0; r < h; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < w; c++) {
      // For buildings 3+ wide, leave center-bottom as door
      if (category === 'building' && r === h - 1 && w >= 3 && c === Math.floor(w / 2)) {
        row.push(false);
      } else {
        row.push(true);
      }
    }
    grid.push(row);
  }
  return grid;
}

/** Guess category from object name. */
function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('tree') || n.includes('bush') || n.includes('flower')) return 'tree';
  if (n.includes('sign')) return 'decoration';
  return 'building';
}

/** Parse a gridded tileset manifest (tileset-grid.json). */
export function parseManifest(json: GridManifestJSON | LegacyManifestJSON): AtlasCatalog {
  const groundTiles = new Map<number, GroundTileDef>();
  const objects = new Map<string, ObjectDef>();

  // Detect format
  if ('atlas' in json && !('cols' in json)) {
    // Legacy atlas-manifest.json format
    const legacy = json as LegacyManifestJSON;
    for (const gt of legacy.groundTiles) {
      groundTiles.set(gt.id, { ...gt, col: 0, row: 0 });
    }
    for (const obj of legacy.objects) {
      objects.set(obj.id, obj);
    }
    return { atlasPath: legacy.atlas, groundTiles, objects };
  }

  // New gridded format
  const grid = json as GridManifestJSON;
  for (const gt of grid.groundTiles) {
    groundTiles.set(gt.id, {
      ...gt,
      sx: gt.col * T,
      sy: gt.row * T,
    });
  }

  for (const obj of grid.objects) {
    const cat = guessCategory(obj.name);
    const def: ObjectDef = {
      id: obj.id,
      name: obj.name,
      col: obj.col,
      row: obj.row,
      cellsW: obj.cellsW,
      cellsH: obj.cellsH,
      sx: obj.col * T,
      sy: obj.row * T,
      sw: obj.cellsW * T,
      sh: obj.cellsH * T,
      gridW: obj.cellsW,
      gridH: obj.cellsH,
      collision: defaultCollision(obj.cellsW, obj.cellsH, cat),
      anchorY: obj.cellsH - 1,
      category: cat,
    };
    objects.set(obj.id, def);
  }

  return { atlasPath: '/sprites/overworld/tileset-grid.png', groundTiles, objects };
}

export function getObjectDef(catalog: AtlasCatalog, id: string): ObjectDef | undefined {
  return catalog.objects.get(id);
}

export function getAllObjects(catalog: AtlasCatalog): ObjectDef[] {
  return [...catalog.objects.values()];
}

export function getObjectsByCategory(catalog: AtlasCatalog, category: string): ObjectDef[] {
  return [...catalog.objects.values()].filter(o => o.category === category);
}
