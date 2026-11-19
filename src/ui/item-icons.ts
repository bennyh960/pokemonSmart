/**
 * Pokéball icon drawn with Canvas 2D (battle HP bar, caught marker).
 * Item pictures elsewhere are the PokeAPI sprites (`ItemDef.sprite`).
 */

/** Draw a pokeball shape. */
function drawPokeball(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, topColor: string): void {
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

  // Divider line (thinner on tiny icons so the colours stay visible)
  const lineH = size >= 12 ? 2 : 1;
  ctx.fillStyle = '#333333';
  ctx.fillRect(x + size * 0.08, cy - lineH / 2, size * 0.84, lineH);

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
