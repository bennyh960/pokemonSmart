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
 * Icon box style per item — background tint and stroke color for bag card icons.
 * Reusable anywhere an item needs a colored icon indicator.
 */
export const ITEM_ICON_STYLE: Record<string, { bg: string; stroke: string }> = {
  // Healing
  'potion':       { bg: 'rgba(224,48,48,0.15)',    stroke: '#e03030' },
  'super-potion': { bg: 'rgba(224,128,32,0.15)',   stroke: '#e08020' },
  'hyper-potion': { bg: 'rgba(224,96,160,0.15)',   stroke: '#e060a0' },
  'max-potion':   { bg: 'rgba(128,64,192,0.15)',   stroke: '#8040c0' },
  'full-restore': { bg: 'rgba(208,160,32,0.15)',   stroke: '#d0a020' },
  'fresh-water':  { bg: 'rgba(48,144,224,0.15)',   stroke: '#3090e0' },
  'soda-pop':     { bg: 'rgba(64,176,96,0.15)',    stroke: '#40b060' },
  'lemonade':     { bg: 'rgba(224,208,64,0.15)',   stroke: '#e0d040' },
  'moomoo-milk':  { bg: 'rgba(240,240,240,0.1)',   stroke: '#cccccc' },
  // Status cures
  'antidote':      { bg: 'rgba(248,208,48,0.15)',  stroke: '#f8d030' },
  'burn-heal':     { bg: 'rgba(224,96,64,0.15)',   stroke: '#e06040' },
  'ice-heal':      { bg: 'rgba(96,192,224,0.15)',  stroke: '#60c0e0' },
  'awakening':     { bg: 'rgba(64,192,64,0.15)',   stroke: '#40c040' },
  'paralyze-heal': { bg: 'rgba(224,192,64,0.15)',  stroke: '#e0c040' },
  'full-heal':     { bg: 'rgba(32,216,96,0.15)',   stroke: '#20d860' },
  // Revival
  'revive':     { bg: 'rgba(240,128,48,0.15)',     stroke: '#f08030' },
  'max-revive': { bg: 'rgba(160,80,224,0.15)',     stroke: '#a050e0' },
  // Pokeballs
  'poke-ball':  { bg: 'rgba(224,48,48,0.15)',      stroke: '#e03030' },
  'great-ball': { bg: 'rgba(48,96,224,0.15)',      stroke: '#3060e0' },
  'ultra-ball': { bg: 'rgba(224,192,32,0.15)',     stroke: '#e0c020' },
  // Battle boosts
  'x-attack':  { bg: 'rgba(224,64,64,0.15)',       stroke: '#e04040' },
  'x-defense': { bg: 'rgba(64,96,224,0.15)',       stroke: '#4060e0' },
  'x-speed':   { bg: 'rgba(64,192,64,0.15)',       stroke: '#40c040' },
  'x-special': { bg: 'rgba(160,64,224,0.15)',      stroke: '#a040e0' },
  // Vitamins
  'rare-candy': { bg: 'rgba(224,112,176,0.15)',    stroke: '#e070b0' },
  // PP recovery
  'ether':  { bg: 'rgba(64,128,224,0.15)',         stroke: '#4080e0' },
  'elixir': { bg: 'rgba(64,192,96,0.15)',          stroke: '#40c060' },
};

/** Get icon style for an item. Falls back to gray. */
export function getItemIconStyle(itemId: string): { bg: string; stroke: string } {
  return ITEM_ICON_STYLE[itemId] || { bg: 'rgba(102,102,136,0.15)', stroke: '#666688' };
}

/**
 * Draw a pokeball icon by ball ID (e.g. 'poke-ball', 'great-ball').
 * Uses the pokeball registry for the top color, falls back to red.
 */
export function drawPokeballIcon(
  ctx: CanvasRenderingContext2D,
  ballId: string | undefined,
  x: number,
  y: number,
  size: number,
): void {
  const BALL_COLORS: Record<string, string> = {
    'poke-ball': '#e03030',
    'great-ball': '#3060e0',
    'ultra-ball': '#e0c020',
    'master-ball': '#8040c0',
  };
  const topColor = BALL_COLORS[ballId || 'poke-ball'] || '#e03030';
  drawPokeball(ctx, x, y, size, topColor);
}

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
