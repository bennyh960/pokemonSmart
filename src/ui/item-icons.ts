/**
 * Item Icons - Programmatic pixel art icons for bag items.
 *
 * Draws simple shapes representing each item type using Canvas 2D primitives.
 * All drawing is done within a `size x size` region at the given (x, y).
 */

/** Draw a bottle shape (used for potions and drinks). */
function drawBottle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  bodyColor: string,
  capColor = '#cccccc',
): void {
  const s = size / 16; // scale factor
  // Cap
  ctx.fillStyle = capColor;
  ctx.fillRect(x + 5 * s, y + 1 * s, 6 * s, 3 * s);
  // Neck
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 6 * s, y + 3 * s, 4 * s, 2 * s);
  // Body
  ctx.fillRect(x + 4 * s, y + 5 * s, 8 * s, 9 * s);
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x + 5 * s, y + 6 * s, 2 * s, 6 * s);
}

/** Draw a small pill/spray shape (used for status cures). */
function drawSpray(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  bodyColor: string,
): void {
  const s = size / 16;
  // Nozzle
  ctx.fillStyle = '#888888';
  ctx.fillRect(x + 6 * s, y + 1 * s, 4 * s, 2 * s);
  ctx.fillRect(x + 4 * s, y + 2 * s, 2 * s, 2 * s);
  // Body
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 5 * s, y + 3 * s, 6 * s, 10 * s);
  // Label stripe
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x + 5 * s, y + 7 * s, 6 * s, 2 * s);
}

/** Draw a diamond shape (used for revives). */
function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.4;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(cx, cy - r + 1);
  ctx.lineTo(cx - 1, cy);
  ctx.lineTo(cx, cy - 1);
  ctx.lineTo(cx + 1, cy);
  ctx.closePath();
  ctx.fill();
}

/** Draw a pokeball shape. */
function drawPokeball(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  topColor: string,
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.42;

  // Full circle - bottom white
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Top half - colored
  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.fill();

  // Divider line
  ctx.fillStyle = '#333333';
  ctx.fillRect(x + size * 0.08, cy - 1, size * 0.84, 2);

  // Center button
  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

/** Draw an arrow-up icon (used for X-items / stat boosts). */
function drawArrowUp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const s = size / 16;
  // Background square
  ctx.fillStyle = '#333344';
  ctx.fillRect(x + 2 * s, y + 2 * s, 12 * s, 12 * s);
  // Arrow
  ctx.fillStyle = color;
  const cx = x + 8 * s;
  ctx.beginPath();
  ctx.moveTo(cx, y + 3 * s);
  ctx.lineTo(cx + 4 * s, y + 8 * s);
  ctx.lineTo(cx + 2 * s, y + 8 * s);
  ctx.lineTo(cx + 2 * s, y + 13 * s);
  ctx.lineTo(cx - 2 * s, y + 13 * s);
  ctx.lineTo(cx - 2 * s, y + 8 * s);
  ctx.lineTo(cx - 4 * s, y + 8 * s);
  ctx.closePath();
  ctx.fill();
}

/** Draw a candy shape. */
function drawCandy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const s = size / 16;
  // Wrapper ends
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(x + 1 * s, y + 6 * s, 3 * s, 4 * s);
  ctx.fillRect(x + 12 * s, y + 6 * s, 3 * s, 4 * s);
  // Candy body
  ctx.fillStyle = color;
  ctx.fillRect(x + 4 * s, y + 4 * s, 8 * s, 8 * s);
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(x + 5 * s, y + 5 * s, 2 * s, 3 * s);
}

/** Draw a small vial shape (used for ether/elixir). */
function drawVial(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const s = size / 16;
  // Cork
  ctx.fillStyle = '#aa8866';
  ctx.fillRect(x + 6 * s, y + 1 * s, 4 * s, 2 * s);
  // Neck
  ctx.fillStyle = '#aabbcc';
  ctx.fillRect(x + 6 * s, y + 3 * s, 4 * s, 2 * s);
  // Body (round bottom)
  ctx.fillStyle = color;
  ctx.fillRect(x + 4 * s, y + 5 * s, 8 * s, 7 * s);
  ctx.fillRect(x + 5 * s, y + 12 * s, 6 * s, 2 * s);
  // Liquid highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x + 5 * s, y + 6 * s, 2 * s, 4 * s);
}

/** Icon color/shape config for each item. */
const ITEM_ICONS: Record<string, (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void> = {
  // Potions (bottles)
  'potion':       (ctx, x, y, s) => drawBottle(ctx, x, y, s, '#e03030'),
  'super-potion': (ctx, x, y, s) => drawBottle(ctx, x, y, s, '#e08020'),
  'hyper-potion': (ctx, x, y, s) => drawBottle(ctx, x, y, s, '#e060a0'),
  'max-potion':   (ctx, x, y, s) => drawBottle(ctx, x, y, s, '#8040c0'),
  'full-restore': (ctx, x, y, s) => drawBottle(ctx, x, y, s, '#d0a020'),

  // Drinks (bottles)
  'fresh-water':  (ctx, x, y, s) => drawBottle(ctx, x, y, s, '#3090e0'),
  'soda-pop':     (ctx, x, y, s) => drawBottle(ctx, x, y, s, '#40b060'),
  'lemonade':     (ctx, x, y, s) => drawBottle(ctx, x, y, s, '#e0d040'),
  'moomoo-milk':  (ctx, x, y, s) => drawBottle(ctx, x, y, s, '#f0f0f0', '#aaaaaa'),

  // Status cures (sprays)
  'antidote':      (ctx, x, y, s) => drawSpray(ctx, x, y, s, '#e0e040'),
  'burn-heal':     (ctx, x, y, s) => drawSpray(ctx, x, y, s, '#e06040'),
  'ice-heal':      (ctx, x, y, s) => drawSpray(ctx, x, y, s, '#60c0e0'),
  'awakening':     (ctx, x, y, s) => drawSpray(ctx, x, y, s, '#40c040'),
  'paralyze-heal': (ctx, x, y, s) => drawSpray(ctx, x, y, s, '#e0c040'),
  'full-heal':     (ctx, x, y, s) => drawSpray(ctx, x, y, s, '#e0e0e0'),

  // Revives (diamonds)
  'revive':     (ctx, x, y, s) => drawDiamond(ctx, x, y, s, '#e0d040'),
  'max-revive': (ctx, x, y, s) => drawDiamond(ctx, x, y, s, '#a050e0'),

  // Pokeballs
  'poke-ball':  (ctx, x, y, s) => drawPokeball(ctx, x, y, s, '#e03030'),
  'great-ball': (ctx, x, y, s) => drawPokeball(ctx, x, y, s, '#3060e0'),
  'ultra-ball': (ctx, x, y, s) => drawPokeball(ctx, x, y, s, '#e0c020'),

  // Stat boosts (arrows)
  'x-attack':  (ctx, x, y, s) => drawArrowUp(ctx, x, y, s, '#e04040'),
  'x-defense': (ctx, x, y, s) => drawArrowUp(ctx, x, y, s, '#4060e0'),
  'x-speed':   (ctx, x, y, s) => drawArrowUp(ctx, x, y, s, '#40c040'),
  'x-special': (ctx, x, y, s) => drawArrowUp(ctx, x, y, s, '#a040e0'),

  // Vitamins
  'rare-candy': (ctx, x, y, s) => drawCandy(ctx, x, y, s, '#e070b0'),

  // PP recovery (vials)
  'ether':  (ctx, x, y, s) => drawVial(ctx, x, y, s, '#4080e0'),
  'elixir': (ctx, x, y, s) => drawVial(ctx, x, y, s, '#40c060'),
};

/**
 * Draw a programmatic icon for the given item at (x, y) with the given size.
 * Falls back to a generic colored square if the item has no specific icon.
 */
export function drawItemIcon(
  ctx: CanvasRenderingContext2D,
  itemId: string,
  x: number,
  y: number,
  size = 16,
): void {
  const drawFn = ITEM_ICONS[itemId];
  if (drawFn) {
    drawFn(ctx, x, y, size);
  } else {
    // Fallback: simple colored square
    ctx.fillStyle = '#666688';
    ctx.fillRect(x + size * 0.15, y + size * 0.15, size * 0.7, size * 0.7);
  }
}
