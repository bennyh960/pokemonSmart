/**
 * Repack the irregular atlas.png into a clean 16×16 grid tileset.
 *
 * Output:
 *   public/sprites/overworld/tileset-grid.png  — gridded tileset image
 *   public/sprites/overworld/tileset-grid.json  — manifest with tile/object positions
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'public/sprites/overworld/atlas.png');
const OUT_IMG = path.join(ROOT, 'public/sprites/overworld/tileset-grid.png');
const OUT_JSON = path.join(ROOT, 'public/sprites/overworld/tileset-grid.json');

const GRID = 16;
const COLS = 16;

// ─── Define all sprites to extract ─────────────────────────────

const groundTiles = [
  // Row 0: Outdoor terrain
  { name: 'Grass',       sx: 6,   sy: 92,  cat: 'grass',    walk: true  },
  { name: 'Grass Alt',   sx: 78,  sy: 92,  cat: 'grass',    walk: true  },
  { name: 'Tall Grass',  sx: 78,  sy: 92,  cat: 'grass',    walk: true, encounter: true },
  { name: 'Sand Path',   sx: 136, sy: 92,  cat: 'path',     walk: true  },
  { name: 'Stone',       sx: 210, sy: 92,  cat: 'path',     walk: true  },
  { name: 'Cobblestone', sx: 224, sy: 92,  cat: 'path',     walk: true  },
  { name: 'Dirt',        sx: 266, sy: 92,  cat: 'path',     walk: true  },
  { name: 'Brick',       sx: 294, sy: 93,  cat: 'path',     walk: true  },
  { name: 'Red Tile',    sx: 359, sy: 92,  cat: 'building', walk: false },
  { name: 'Gray Stone',  sx: 395, sy: 106, cat: 'path',     walk: true  },
  { name: 'Marble',      sx: 310, sy: 92,  cat: 'path',     walk: true  },
  { name: 'Light Floor', sx: 338, sy: 92,  cat: 'path',     walk: true  },
  { name: 'Water',       sx: 62,  sy: 153, cat: 'water',    walk: false },
  { name: 'Deep Water',  sx: 241, sy: 155, cat: 'water',    walk: false },
  { name: 'Void',        sx: 0,   sy: 0,   cat: 'misc',     walk: false },
  { name: 'Door Mat',    sx: 136, sy: 92,  cat: 'misc',     walk: true  },

  // Row 1: Interior
  { name: 'Wall Dark',   sx: 136, sy: 198, cat: 'building', walk: false },
  { name: 'Wall Brown',  sx: 7,   sy: 198, cat: 'building', walk: false },
  { name: 'Wall Gray',   sx: 44,  sy: 198, cat: 'building', walk: false },
  { name: 'Wall Accent', sx: 100, sy: 198, cat: 'building', walk: false },
  { name: 'Wall Blue',   sx: 339, sy: 199, cat: 'building', walk: false },
  { name: 'Counter',     sx: 224, sy: 92,  cat: 'building', walk: false },
  { name: 'Counter Red', sx: 359, sy: 92,  cat: 'building', walk: false },
  { name: 'Shelf',       sx: 294, sy: 93,  cat: 'building', walk: false },
  { name: 'Shelf Dark',  sx: 308, sy: 93,  cat: 'building', walk: false },
  { name: 'PC Floor',    sx: 338, sy: 92,  cat: 'building', walk: true  },
  { name: 'Mart Floor',  sx: 210, sy: 92,  cat: 'building', walk: true  },
  { name: 'Floor Alt',   sx: 395, sy: 106, cat: 'building', walk: true  },
  { name: 'Unused',      sx: 0,   sy: 0,   cat: 'misc',     walk: false },
  { name: 'Unused',      sx: 0,   sy: 0,   cat: 'misc',     walk: false },
  { name: 'Unused',      sx: 0,   sy: 0,   cat: 'misc',     walk: false },
  { name: 'Unused',      sx: 0,   sy: 0,   cat: 'misc',     walk: false },
];

const objects = [
  // Small trees (1×1 cells each)
  { name: 'Tree S1',     sx: 8,   sy: 1,   sw: 15, sh: 18 },
  { name: 'Tree S2',     sx: 26,  sy: 1,   sw: 16, sh: 18 },
  { name: 'Tree S3',     sx: 45,  sy: 1,   sw: 15, sh: 18 },
  { name: 'Tree S4',     sx: 63,  sy: 1,   sw: 15, sh: 18 },
  { name: 'Tree Snow',   sx: 82,  sy: 1,   sw: 15, sh: 14 },
  { name: 'Tree R1',     sx: 340, sy: 1,   sw: 17, sh: 19 },
  { name: 'Tree R2',     sx: 358, sy: 1,   sw: 17, sh: 19 },
  { name: 'Tree R3',     sx: 377, sy: 1,   sw: 17, sh: 19 },
  { name: 'Sign',        sx: 254, sy: 25,  sw: 12, sh: 14 },
  { name: 'Bush',        sx: 131, sy: 24,  sw: 21, sh: 12 },
  { name: 'Flower Bush', sx: 552, sy: 25,  sw: 21, sh: 12 },
  { name: 'Tree R4',     sx: 395, sy: 1,   sw: 17, sh: 19 },
  // Small trees row 2
  { name: 'Tree Sn2',    sx: 100, sy: 1,   sw: 15, sh: 15 },
  { name: 'Tree Db1',    sx: 118, sy: 1,   sw: 17, sh: 18 },
  { name: 'Tree Db2',    sx: 137, sy: 1,   sw: 16, sh: 18 },
  { name: 'Tree Db3',    sx: 155, sy: 1,   sw: 17, sh: 18 },

  // Medium trees (2×2 cells each)
  { name: 'Tree M1',     sx: 7,   sy: 24,  sw: 22, sh: 28 },
  { name: 'Tree M2',     sx: 32,  sy: 24,  sw: 22, sh: 28 },
  { name: 'Tree M3',     sx: 57,  sy: 24,  sw: 21, sh: 28 },
  { name: 'Tree M4',     sx: 81,  sy: 24,  sw: 22, sh: 28 },
  { name: 'Tree L1',     sx: 303, sy: 25,  sw: 23, sh: 29 },
  { name: 'Tree L2',     sx: 328, sy: 25,  sw: 23, sh: 29 },
  { name: 'Tree B1',     sx: 624, sy: 0,   sw: 28, sh: 38 },
  { name: 'Tree B2',     sx: 654, sy: 0,   sw: 29, sh: 38 },

  // Buildings (3×3 cells each)
  { name: 'PokeCenter Red',   sx: 215, sy: 424, sw: 36, sh: 40 },
  { name: 'PokeCenter Blue',  sx: 289, sy: 424, sw: 36, sh: 40 },
  { name: 'Mart Red',         sx: 360, sy: 428, sw: 30, sh: 36 },
  { name: 'Mart Blue',        sx: 394, sy: 428, sw: 30, sh: 36 },
  { name: 'Mart Large Red',   sx: 492, sy: 424, sw: 36, sh: 46 },
  { name: 'Mart Large White', sx: 560, sy: 424, sw: 36, sh: 46 },
  { name: 'House Red',        sx: 210, sy: 479, sw: 33, sh: 44 },
  { name: 'House Green',      sx: 247, sy: 479, sw: 42, sh: 42 },
  { name: 'House Green Sm',   sx: 294, sy: 479, sw: 32, sh: 43 },
  { name: 'House Blue',       sx: 331, sy: 479, sw: 38, sh: 42 },
  { name: 'House Brown',      sx: 400, sy: 479, sw: 36, sh: 42 },
  { name: 'House Tall Org',   sx: 443, sy: 473, sw: 29, sh: 52 },
  { name: 'House Tall Brn',   sx: 474, sy: 478, sw: 29, sh: 44 },
  { name: 'House Tall Gry',   sx: 505, sy: 478, sw: 29, sh: 44 },
  { name: 'House Big 1',      sx: 570, sy: 476, sw: 37, sh: 52 },
  { name: 'House Big 2',      sx: 619, sy: 476, sw: 37, sh: 52 },
  { name: 'Mansion',          sx: 664, sy: 473, sw: 38, sh: 57 },
  { name: 'Large Cabin',      sx: 713, sy: 473, sw: 44, sh: 59 },
  { name: 'Villa',            sx: 768, sy: 469, sw: 47, sh: 66 },
];

async function repack() {
  const img = sharp(SRC);
  const { width: srcW, height: srcH } = await img.metadata();
  const raw = await img.ensureAlpha().raw().toBuffer();

  console.log(`Source atlas: ${srcW}×${srcH}`);

  // Calculate ground tile rows
  const groundRows = Math.ceil(groundTiles.length / COLS);

  // Pack objects into rows
  let objRow = groundRows;
  let objCol = 0;
  let maxObjRow = objRow;
  const objPlacements = [];

  for (const obj of objects) {
    const cellsW = Math.ceil(obj.sw / GRID);
    const cellsH = Math.ceil(obj.sh / GRID);
    if (objCol + cellsW > COLS) {
      objRow = maxObjRow;
      objCol = 0;
    }
    objPlacements.push({ ...obj, destCol: objCol, destRow: objRow, cellsW, cellsH });
    objCol += cellsW;
    maxObjRow = Math.max(maxObjRow, objRow + cellsH);
  }

  const totalRows = maxObjRow;
  const outW = COLS * GRID;
  const outH = totalRows * GRID;
  const outBuf = Buffer.alloc(outW * outH * 4);

  console.log(`Output: ${outW}×${outH} (${COLS} cols × ${totalRows} rows)`);

  function copySrc(sx, sy, sw, sh, dx, dy) {
    for (let py = 0; py < sh; py++) {
      for (let px = 0; px < sw; px++) {
        const srcIdx = ((sy + py) * srcW + (sx + px)) * 4;
        const tx = dx + px;
        const ty = dy + py;
        if (tx >= outW || ty >= outH || srcIdx + 3 >= raw.length) continue;
        const di = (ty * outW + tx) * 4;
        outBuf[di]     = raw[srcIdx];
        outBuf[di + 1] = raw[srcIdx + 1];
        outBuf[di + 2] = raw[srcIdx + 2];
        outBuf[di + 3] = raw[srcIdx + 3];
      }
    }
  }

  // Place ground tiles on the grid
  for (let i = 0; i < groundTiles.length; i++) {
    const t = groundTiles[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    copySrc(t.sx, t.sy, 16, 16, col * GRID, row * GRID);
  }

  // Place objects
  for (const op of objPlacements) {
    copySrc(op.sx, op.sy, op.sw, op.sh, op.destCol * GRID, op.destRow * GRID);
  }

  // Write image
  await sharp(outBuf, { raw: { width: outW, height: outH, channels: 4 } })
    .png()
    .toFile(OUT_IMG);

  // Write manifest
  const manifest = {
    tileSize: 16,
    cols: COLS,
    rows: totalRows,
    groundTileCount: groundTiles.length,
    objectStartRow: groundRows,
    groundTiles: groundTiles.map((t, i) => ({
      id: i,
      name: t.name,
      col: i % COLS,
      row: Math.floor(i / COLS),
      walkable: t.walk,
      encounter: t.encounter || false,
      category: t.cat,
    })),
    objects: objPlacements.map((op, i) => ({
      id: op.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''),
      name: op.name,
      col: op.destCol,
      row: op.destRow,
      cellsW: op.cellsW,
      cellsH: op.cellsH,
    })),
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(manifest, null, 2));

  console.log(`\n✓ Wrote ${OUT_IMG}`);
  console.log(`✓ Wrote ${OUT_JSON}`);
  console.log(`\nGround tiles (${groundTiles.length}):`);
  groundTiles.forEach((t, i) => {
    if (t.name !== 'Unused') {
      console.log(`  ${String(i).padStart(2)}: ${t.name} → col ${i % COLS}, row ${Math.floor(i / COLS)}`);
    }
  });
  console.log(`\nObjects (${objPlacements.length}):`);
  objPlacements.forEach(op => {
    console.log(`  ${op.name} → col ${op.destCol}, row ${op.destRow} (${op.cellsW}×${op.cellsH} cells)`);
  });
}

repack().catch(console.error);
