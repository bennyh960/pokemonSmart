/**
 * Map loader — a small spinning Poké Ball + "Loading…" on the black screen while a map loads.
 * Hidden for the first LOADER_DELAY_MS so quick (cached) loads look exactly like before.
 */

import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../engine/config.js';
import { drawText } from '../engine/renderer.js';
import { t, isRTL } from '../i18n/i18n.js';

const LOADER_DELAY_MS = 400;
const FADE_IN_MS = 250;

let loadingSince: number | null = null;

/** Call every frame while the map is loading (after the black clear). */
export function renderMapLoader(ctx: CanvasRenderingContext2D): void {
  const now = performance.now();
  if (loadingSince === null) loadingSince = now;
  const elapsed = now - loadingSince - LOADER_DELAY_MS;
  if (elapsed < 0) return;

  const cx = LOGICAL_WIDTH / 2;
  const cy = LOGICAL_HEIGHT / 2 - 6;
  const r = 7;
  const angle = (now / 1000) * Math.PI * 2;

  ctx.save();
  ctx.globalAlpha = Math.min(elapsed / FADE_IN_MS, 1);
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#111111';
  ctx.fillStyle = '#e83030';
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();
  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = Math.min(elapsed / FADE_IN_MS, 1);
  drawText(ctx, t('overworld.loading'), cx, cy + r + 10, {
    align: 'center',
    color: '#d8d8d8',
    direction: isRTL() ? 'rtl' : 'ltr',
  });
  ctx.restore();
}

/** Call once the map is ready, so the next load waits the delay again. */
export function resetMapLoader(): void {
  loadingSince = null;
}
