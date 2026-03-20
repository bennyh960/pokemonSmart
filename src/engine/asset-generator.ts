/**
 * AssetGenerator - Programmatically generates pixel art assets at runtime.
 *
 * Creates GBC-style sprites using Canvas API for:
 * - Player overworld sprite (4 directions × 3 frames)
 * - Tileset (grass, path, trees, water, tall grass, etc.)
 * - Battle backgrounds (grass field)
 *
 * All assets are generated once and cached as HTMLImageElement.
 */

const generatedCache = new Map<string, HTMLImageElement>();

/** Helper: create a canvas, draw on it, return as HTMLImageElement. */
function canvasToImage(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLImageElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
}

/** Helper: set a single pixel. */
function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

/** Helper: fill a rect of pixels. */
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ─── Player Overworld Sprite Sheet ───────────────────────────────
// 16x16 per frame, 3 frames per direction, 4 directions
// Layout: 48x64 (3 cols × 4 rows)
// Row 0: Down, Row 1: Up, Row 2: Left, Row 3: Right

const SKIN = '#f8d0a0';
const HAIR = '#181818';
const HAT = '#d83020';
const HAT_DARK = '#a82018';
const SHIRT = '#d83020';
const SHIRT_DARK = '#a82018';
const PANTS = '#3058a8';
const SHOES = '#785020';
const OUTLINE = '#282828';

function drawPlayerFrame(ctx: CanvasRenderingContext2D, dir: number, frame: number, ox: number, oy: number): void {
  const walkOffset = frame === 1 ? -1 : frame === 2 ? 1 : 0;

  if (dir === 0) {
    // Facing down - Gold/Silver style player
    rect(ctx, ox + 5, oy + 0, 6, 2, HAT);
    rect(ctx, ox + 4, oy + 2, 8, 2, HAT);
    rect(ctx, ox + 3, oy + 3, 10, 1, HAT_DARK);
    rect(ctx, ox + 5, oy + 4, 6, 4, SKIN);
    px(ctx, ox + 6, oy + 5, OUTLINE);
    px(ctx, ox + 9, oy + 5, OUTLINE);
    px(ctx, ox + 7, oy + 7, OUTLINE);
    px(ctx, ox + 8, oy + 7, OUTLINE);
    rect(ctx, ox + 4, oy + 8, 8, 4, SHIRT);
    rect(ctx, ox + 5, oy + 8, 6, 1, SHIRT_DARK);
    rect(ctx, ox + 3, oy + 9, 1, 3, SKIN);
    rect(ctx, ox + 12, oy + 9, 1, 3, SKIN);
    rect(ctx, ox + 5, oy + 12, 3, 2, PANTS);
    rect(ctx, ox + 8, oy + 12, 3, 2, PANTS);
    rect(ctx, ox + 5, oy + 14 + walkOffset, 3, 2, SHOES);
    rect(ctx, ox + 8, oy + 14 - walkOffset, 3, 2, SHOES);
  } else if (dir === 1) {
    // Facing up
    rect(ctx, ox + 5, oy + 0, 6, 2, HAT);
    rect(ctx, ox + 4, oy + 2, 8, 3, HAT);
    rect(ctx, ox + 5, oy + 4, 6, 4, HAIR);
    rect(ctx, ox + 4, oy + 8, 8, 4, SHIRT);
    rect(ctx, ox + 3, oy + 9, 1, 3, SKIN);
    rect(ctx, ox + 12, oy + 9, 1, 3, SKIN);
    rect(ctx, ox + 5, oy + 12, 3, 2, PANTS);
    rect(ctx, ox + 8, oy + 12, 3, 2, PANTS);
    rect(ctx, ox + 5, oy + 14 + walkOffset, 3, 2, SHOES);
    rect(ctx, ox + 8, oy + 14 - walkOffset, 3, 2, SHOES);
  } else if (dir === 2) {
    // Facing left
    rect(ctx, ox + 4, oy + 0, 6, 2, HAT);
    rect(ctx, ox + 3, oy + 2, 7, 2, HAT);
    rect(ctx, ox + 2, oy + 3, 8, 1, HAT_DARK);
    rect(ctx, ox + 4, oy + 4, 5, 4, SKIN);
    px(ctx, ox + 4, oy + 5, OUTLINE);
    rect(ctx, ox + 4, oy + 8, 6, 4, SHIRT);
    rect(ctx, ox + 3, oy + 9, 1, 3, SKIN);
    rect(ctx, ox + 5, oy + 12, 4, 2, PANTS);
    rect(ctx, ox + 4 + walkOffset, oy + 14, 3, 2, SHOES);
    rect(ctx, ox + 7 - walkOffset, oy + 14, 2, 2, SHOES);
  } else {
    // Facing right (mirror of left)
    rect(ctx, ox + 6, oy + 0, 6, 2, HAT);
    rect(ctx, ox + 6, oy + 2, 7, 2, HAT);
    rect(ctx, ox + 6, oy + 3, 8, 1, HAT_DARK);
    rect(ctx, ox + 7, oy + 4, 5, 4, SKIN);
    px(ctx, ox + 11, oy + 5, OUTLINE);
    rect(ctx, ox + 6, oy + 8, 6, 4, SHIRT);
    rect(ctx, ox + 12, oy + 9, 1, 3, SKIN);
    rect(ctx, ox + 7, oy + 12, 4, 2, PANTS);
    rect(ctx, ox + 6 + walkOffset, oy + 14, 2, 2, SHOES);
    rect(ctx, ox + 9 - walkOffset, oy + 14, 3, 2, SHOES);
  }
}

/** Generate the player overworld sprite sheet (48×64). */
export function getPlayerSpriteSheet(): HTMLImageElement {
  const key = 'player-overworld';
  const cached = generatedCache.get(key);
  if (cached) return cached;

  const img = canvasToImage(48, 64, (ctx) => {
    for (let dir = 0; dir < 4; dir++) {
      for (let frame = 0; frame < 3; frame++) {
        drawPlayerFrame(ctx, dir, frame, frame * 16, dir * 16);
      }
    }
  });
  generatedCache.set(key, img);
  return img;
}

// ─── Tile Sprites ─────────────────────────────────────────────────

function drawGrassTile(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 0, 0, 16, 16, '#48A030');
  const blades = [[2, 3], [7, 1], [12, 4], [4, 10], [10, 8], [1, 13], [9, 14], [14, 11]];
  for (const [bx, by] of blades) {
    px(ctx, bx, by, '#58B838');
    px(ctx, bx, by - 1, '#58B838');
  }
  px(ctx, 5, 7, '#408828');
  px(ctx, 11, 2, '#408828');
  px(ctx, 3, 14, '#408828');
}

function drawPathTile(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 0, 0, 16, 16, '#C8A870');
  const spots = [[3, 2], [8, 5], [13, 3], [2, 10], [7, 13], [12, 11], [5, 8]];
  for (const [sx, sy] of spots) { px(ctx, sx, sy, '#B89860'); }
  px(ctx, 1, 5, '#D8B880');
  px(ctx, 10, 9, '#D8B880');
  px(ctx, 6, 1, '#D8B880');
}

function drawWaterTile(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 0, 0, 16, 16, '#3080D0');
  for (let i = 0; i < 16; i += 4) {
    rect(ctx, i, 4, 2, 1, '#48A0E8');
    rect(ctx, i + 2, 12, 2, 1, '#48A0E8');
  }
  px(ctx, 3, 8, '#2060A0');
  px(ctx, 11, 6, '#2060A0');
  px(ctx, 7, 14, '#2060A0');
}

function drawTreeTile(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 6, 10, 4, 6, '#785020');
  rect(ctx, 7, 10, 2, 6, '#906830');
  rect(ctx, 2, 1, 12, 10, '#206820');
  rect(ctx, 1, 3, 14, 6, '#206820');
  rect(ctx, 4, 2, 4, 3, '#308830');
  rect(ctx, 3, 4, 3, 2, '#308830');
  rect(ctx, 8, 6, 5, 4, '#185818');
}

function drawBuildingTile(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 0, 0, 16, 16, '#808890');
  for (let y = 0; y < 16; y += 4) {
    rect(ctx, 0, y, 16, 1, '#707878');
    const offset = (y % 8 === 0) ? 0 : 4;
    for (let x = offset; x < 16; x += 8) {
      rect(ctx, x, y, 1, 4, '#707878');
    }
  }
}

function drawDoorTile(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 0, 0, 16, 16, '#C8A870');
  rect(ctx, 3, 0, 10, 16, '#8B4513');
  rect(ctx, 4, 1, 8, 14, '#A05820');
  px(ctx, 10, 8, '#D8B040');
  px(ctx, 10, 9, '#D8B040');
  rect(ctx, 3, 0, 10, 2, '#604010');
}

function drawTallGrassTile(ctx: CanvasRenderingContext2D): void {
  rect(ctx, 0, 0, 16, 16, '#48A030');
  const grassColor = '#68C048';
  const darkGrass = '#58A838';
  for (let x = 1; x < 15; x += 3) {
    px(ctx, x, 4, grassColor);
    px(ctx, x + 2, 4, grassColor);
    px(ctx, x, 3, grassColor);
    px(ctx, x + 2, 3, grassColor);
    px(ctx, x + 1, 2, darkGrass);
    px(ctx, x + 1, 11, grassColor);
    px(ctx, x + 3 > 15 ? x - 1 : x - 1, 11, grassColor);
    px(ctx, x, 10, grassColor);
    px(ctx, x + 1, 9, darkGrass);
  }
  for (let x = 0; x < 16; x += 2) {
    px(ctx, x, 6, grassColor);
    px(ctx, x + 1, 13, grassColor);
  }
}

function drawRouteExitTile(ctx: CanvasRenderingContext2D): void {
  // Path-colored tile with arrow to indicate exit
  rect(ctx, 0, 0, 16, 16, '#D8B870');
  const spots = [[3, 2], [8, 5], [13, 3], [2, 10], [7, 13], [12, 11]];
  for (const [sx, sy] of spots) { px(ctx, sx, sy, '#C8A860'); }
  // Arrow pointing right (generic direction indicator)
  const arrowColor = '#806030';
  rect(ctx, 4, 7, 6, 2, arrowColor);  // shaft
  px(ctx, 10, 6, arrowColor);
  px(ctx, 10, 9, arrowColor);
  px(ctx, 11, 7, arrowColor);
  px(ctx, 11, 8, arrowColor);
}

/** Generate a single 16×16 tile image by tile type ID. */
export function getTileImage(tileType: number): HTMLImageElement {
  const key = `tile-${tileType}`;
  const cached = generatedCache.get(key);
  if (cached) return cached;

  const drawFns: Record<number, (ctx: CanvasRenderingContext2D) => void> = {
    0: (ctx) => rect(ctx, 0, 0, 16, 16, '#000000'),
    1: drawGrassTile,
    2: drawPathTile,
    3: drawWaterTile,
    4: drawTreeTile,
    5: drawBuildingTile,
    6: drawDoorTile,
    7: drawTallGrassTile,
    8: drawRouteExitTile,
  };

  const drawFn = drawFns[tileType] ?? ((ctx: CanvasRenderingContext2D) => rect(ctx, 0, 0, 16, 16, '#FF00FF'));
  const img = canvasToImage(16, 16, drawFn);
  generatedCache.set(key, img);
  return img;
}

// ─── NPC Sprites ─────────────────────────────────────────────────

function drawNPCMale(ctx: CanvasRenderingContext2D): void {
  // Brown hair
  rect(ctx, 5, 0, 6, 3, '#6B4226');
  // Face
  rect(ctx, 5, 3, 6, 4, SKIN);
  px(ctx, 6, 4, OUTLINE); px(ctx, 9, 4, OUTLINE); // eyes
  px(ctx, 7, 6, OUTLINE); px(ctx, 8, 6, OUTLINE); // mouth
  // Blue shirt
  rect(ctx, 4, 7, 8, 4, '#3058a8');
  rect(ctx, 3, 8, 1, 3, SKIN); rect(ctx, 12, 8, 1, 3, SKIN); // arms
  // Pants & shoes
  rect(ctx, 5, 11, 3, 3, '#404060');
  rect(ctx, 8, 11, 3, 3, '#404060');
  rect(ctx, 5, 14, 3, 2, SHOES);
  rect(ctx, 8, 14, 3, 2, SHOES);
}

function drawNPCFemale(ctx: CanvasRenderingContext2D): void {
  // Long brown hair
  rect(ctx, 4, 0, 8, 3, '#8B5E3C');
  rect(ctx, 3, 2, 2, 5, '#8B5E3C'); rect(ctx, 11, 2, 2, 5, '#8B5E3C'); // side hair
  // Face
  rect(ctx, 5, 3, 6, 4, SKIN);
  px(ctx, 6, 4, OUTLINE); px(ctx, 9, 4, OUTLINE);
  px(ctx, 7, 6, OUTLINE); px(ctx, 8, 6, OUTLINE);
  // Pink top
  rect(ctx, 4, 7, 8, 4, '#E87088');
  rect(ctx, 3, 8, 1, 3, SKIN); rect(ctx, 12, 8, 1, 3, SKIN);
  // Skirt & shoes
  rect(ctx, 4, 11, 8, 2, '#E87088');
  rect(ctx, 5, 13, 3, 1, SKIN); rect(ctx, 8, 13, 3, 1, SKIN);
  rect(ctx, 5, 14, 3, 2, '#C04060');
  rect(ctx, 8, 14, 3, 2, '#C04060');
}

function drawNurse(ctx: CanvasRenderingContext2D): void {
  // Pink hair with nurse cap
  rect(ctx, 5, 0, 6, 2, '#F08090');
  rect(ctx, 6, 0, 4, 1, '#F8F8F8'); // white cap
  px(ctx, 7, 0, '#E04060'); px(ctx, 8, 0, '#E04060'); // red cross
  rect(ctx, 4, 2, 8, 1, '#F08090');
  // Face
  rect(ctx, 5, 3, 6, 4, SKIN);
  px(ctx, 6, 4, OUTLINE); px(ctx, 9, 4, OUTLINE);
  px(ctx, 7, 6, OUTLINE); px(ctx, 8, 6, OUTLINE);
  // White outfit
  rect(ctx, 4, 7, 8, 5, '#F8F8F8');
  rect(ctx, 5, 7, 6, 1, '#E0E0E0');
  rect(ctx, 3, 8, 1, 3, SKIN); rect(ctx, 12, 8, 1, 3, SKIN);
  // Shoes
  rect(ctx, 5, 14, 3, 2, '#F8F8F8');
  rect(ctx, 8, 14, 3, 2, '#F8F8F8');
  rect(ctx, 5, 12, 3, 2, '#E0E0E0');
  rect(ctx, 8, 12, 3, 2, '#E0E0E0');
}

function drawShopkeeper(ctx: CanvasRenderingContext2D): void {
  // Short hair / bald
  rect(ctx, 5, 0, 6, 3, '#A08060');
  // Face
  rect(ctx, 5, 3, 6, 4, SKIN);
  px(ctx, 6, 4, OUTLINE); px(ctx, 9, 4, OUTLINE);
  px(ctx, 7, 6, OUTLINE); px(ctx, 8, 6, OUTLINE);
  // Green apron over shirt
  rect(ctx, 4, 7, 8, 4, '#40A040');
  rect(ctx, 5, 7, 6, 1, '#308030');
  rect(ctx, 3, 8, 1, 3, SKIN); rect(ctx, 12, 8, 1, 3, SKIN);
  // Pants & shoes
  rect(ctx, 5, 11, 3, 3, '#404040');
  rect(ctx, 8, 11, 3, 3, '#404040');
  rect(ctx, 5, 14, 3, 2, '#603020');
  rect(ctx, 8, 14, 3, 2, '#603020');
}

function drawTrainerM(ctx: CanvasRenderingContext2D): void {
  // Red cap
  rect(ctx, 5, 0, 6, 2, HAT);
  rect(ctx, 4, 2, 8, 1, HAT_DARK);
  // Face
  rect(ctx, 5, 3, 6, 4, SKIN);
  px(ctx, 6, 4, OUTLINE); px(ctx, 9, 4, OUTLINE);
  px(ctx, 7, 6, OUTLINE); px(ctx, 8, 6, OUTLINE);
  // Red jacket
  rect(ctx, 4, 7, 8, 4, '#C03030');
  rect(ctx, 5, 7, 6, 1, '#A02020');
  rect(ctx, 3, 8, 1, 3, SKIN); rect(ctx, 12, 8, 1, 3, SKIN);
  // Pants & shoes
  rect(ctx, 5, 11, 3, 3, PANTS);
  rect(ctx, 8, 11, 3, 3, PANTS);
  rect(ctx, 5, 14, 3, 2, SHOES);
  rect(ctx, 8, 14, 3, 2, SHOES);
}

function drawTrainerF(ctx: CanvasRenderingContext2D): void {
  // Blue headband + ponytail
  rect(ctx, 5, 0, 6, 1, '#6B4226');
  rect(ctx, 4, 1, 8, 1, '#3060C0'); // headband
  rect(ctx, 11, 0, 2, 4, '#6B4226'); // ponytail
  rect(ctx, 5, 2, 6, 1, '#6B4226');
  // Face
  rect(ctx, 5, 3, 6, 4, SKIN);
  px(ctx, 6, 4, OUTLINE); px(ctx, 9, 4, OUTLINE);
  px(ctx, 7, 6, OUTLINE); px(ctx, 8, 6, OUTLINE);
  // Blue outfit
  rect(ctx, 4, 7, 8, 4, '#3060C0');
  rect(ctx, 5, 7, 6, 1, '#2050A0');
  rect(ctx, 3, 8, 1, 3, SKIN); rect(ctx, 12, 8, 1, 3, SKIN);
  // Skirt & shoes
  rect(ctx, 4, 11, 8, 2, '#3060C0');
  rect(ctx, 5, 13, 3, 1, SKIN); rect(ctx, 8, 13, 3, 1, SKIN);
  rect(ctx, 5, 14, 3, 2, '#2050A0');
  rect(ctx, 8, 14, 3, 2, '#2050A0');
}

const NPC_DRAW_FNS: Record<string, (ctx: CanvasRenderingContext2D) => void> = {
  'npc-male': drawNPCMale,
  'npc-female': drawNPCFemale,
  'nurse': drawNurse,
  'shopkeeper': drawShopkeeper,
  'trainer-m': drawTrainerM,
  'trainer-f': drawTrainerF,
};

/** Generate a 16x16 NPC sprite by sprite type. */
export function getNPCSpriteImage(spriteType: string): HTMLImageElement {
  const key = `npc-${spriteType}`;
  const cached = generatedCache.get(key);
  if (cached) return cached;

  const drawFn = NPC_DRAW_FNS[spriteType] ?? drawNPCMale;
  const img = canvasToImage(16, 16, drawFn);
  generatedCache.set(key, img);
  return img;
}

// ─── Battle Background ──────────────────────────────────────────

/** Generate a grass battle background (240×120). */
export function getBattleBackground(): HTMLImageElement {
  const key = 'battle-bg-grass';
  const cached = generatedCache.get(key);
  if (cached) return cached;

  const W = 240;
  const H = 120;
  const img = canvasToImage(W, H, (ctx) => {
    // Sky gradient (top half)
    const skyColors = ['#88c8f8', '#90d0f8', '#98d8f8', '#a0e0f8', '#a8e8f8'];
    for (let y = 0; y < 50; y++) {
      const ci = Math.min(Math.floor(y / 10), skyColors.length - 1);
      rect(ctx, 0, y, W, 1, skyColors[ci]);
    }

    // Hills in background
    ctx.fillStyle = '#68b048';
    ctx.beginPath();
    ctx.moveTo(0, 50);
    for (let x = 0; x <= W; x++) {
      const y = 50 - Math.sin(x * 0.03) * 8 - Math.sin(x * 0.015 + 1) * 5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, 60);
    ctx.lineTo(0, 60);
    ctx.fill();

    // Main grass field
    rect(ctx, 0, 55, W, H - 55, '#58a838');

    // Grass texture
    for (let y = 55; y < H; y += 2) {
      for (let x = 0; x < W; x += 4) {
        const shade = ((x + y) % 7 < 3) ? '#60b040' : '#50a030';
        px(ctx, x + (y % 4), y, shade);
      }
    }

    // Darker grass near bottom
    for (let y = 90; y < H; y++) {
      for (let x = 0; x < W; x += 3) {
        if ((x * 7 + y * 13) % 10 < 3) {
          px(ctx, x, y, '#489828');
        }
      }
    }

    // Enemy platform area (lighter patch)
    rect(ctx, 130, 55, 90, 10, '#78b858');
    // Player platform area
    rect(ctx, 10, 90, 100, 12, '#78b858');
  });
  generatedCache.set(key, img);
  return img;
}
