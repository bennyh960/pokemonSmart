/**
 * Gate light sprite — the red/green light post drawn by the game (systems/gate-lights.ts)
 * and by the map editor. Pure canvas drawing in 16px tile units.
 */

export type GateLightLamps = 'red' | 'green' | 'both' | 'none';

/** Draw a light post on the 16×16 tile whose top-left corner is (sx, sy). The housing pokes ~5px above the tile. */
export function drawGateLightSprite(ctx: CanvasRenderingContext2D, sx: number, sy: number, lit: GateLightLamps): void {
  ctx.save();
  // Base + pole
  ctx.fillStyle = '#2a2a33';
  ctx.fillRect(sx + 5, sy + 14, 6, 2);
  ctx.fillStyle = '#4a4a55';
  ctx.fillRect(sx + 7, sy + 8, 2, 6);
  // Housing
  ctx.fillStyle = '#1c1c24';
  ctx.fillRect(sx + 3, sy - 5, 10, 14);
  ctx.fillStyle = '#33333f';
  ctx.fillRect(sx + 4, sy - 4, 8, 12);

  lamp(ctx, sx + 8, sy - 1, lit === 'red' || lit === 'both', '#ff3b3b', '#5a1515');
  lamp(ctx, sx + 8, sy + 5, lit === 'green' || lit === 'both', '#3bff6a', '#15501f');
  ctx.restore();
}

function lamp(ctx: CanvasRenderingContext2D, cx: number, cy: number, lit: boolean, on: string, off: string): void {
  if (lit) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = on;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = lit ? on : off;
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();
}
