/**
 * Cinematic Styles Render Pipelines
 * Isolated execution hooks managing environment themes and visual canvas matrices.
 */

import type { CinematicState } from './state';

const W = 240;
const H = 83; // BTL.FIELD_H context matching bounds

function drawVSText(
  ctx: CanvasRenderingContext2D,
  scale: number,
  angle: number,
  c1: string,
  c2: string,
  alpha = 1,
  glitch = false,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, H / 2 - 8);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (glitch && Math.random() < 0.3) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#ff00ff';
    ctx.fillText('VS', (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4);
    ctx.restore();
  }

  const g = ctx.createLinearGradient(-30, -20, 30, 20);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillText('VS', 0, 0);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeText('VS', 0, 0);

  ctx.restore();
}

function drawBG0(ctx: CanvasRenderingContext2D, t: number) {
  const cx = W / 2,
    cy = H / 2;
  const hue = (t * 80) % 360;

  ctx.fillStyle = '#04040f';
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const len = 40 + Math.sin(t * 3 + i) * 10 + 80;
    const grd = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    grd.addColorStop(0, `hsla(${hue}, 100%, 65%, 0.5)`);
    grd.addColorStop(1, `hsla(${(hue + 40) % 360}, 100%, 65%, 0)`);
    ctx.strokeStyle = grd;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    ctx.stroke();
  }
}

export function renderStyle0(ctx: CanvasRenderingContext2D, state: CinematicState, progress: number) {
  drawBG0(ctx, state.vsTimer);
  drawVSText(ctx, state.vsScale, state.vsAngle, '#ffdd00', '#ff8800');
}

function drawBG1(ctx: CanvasRenderingContext2D, t: number) {
  const gL = ctx.createLinearGradient(0, 0, W / 2, H);
  gL.addColorStop(0, '#5a0000');
  gL.addColorStop(1, '#cc4400');
  ctx.fillStyle = gL;
  ctx.fillRect(0, 0, W / 2, H);

  const gR = ctx.createLinearGradient(W / 2, 0, W, H);
  gR.addColorStop(0, '#001166');
  gR.addColorStop(1, '#0088cc');
  ctx.fillStyle = gR;
  ctx.fillRect(W / 2, 0, W / 2, H);

  ctx.save();
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 8; i++) {
    const y = (((i / 8) * H + t * 40) % (H * 1.1)) - H * 0.05;
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W / 2 - 12, y + 3);
    ctx.stroke();
    ctx.strokeStyle = '#00aaff';
    ctx.beginPath();
    ctx.moveTo(W, y);
    ctx.lineTo(W / 2 + 12, y + 3);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 12, 0);
  ctx.lineTo(W / 2 + 12, H);
  ctx.stroke();
  ctx.restore();
}

export function renderStyle1(ctx: CanvasRenderingContext2D, state: CinematicState, progress: number) {
  drawBG1(ctx, state.vsTimer);

  ctx.save();
  ctx.translate(W / 2, H / 2 - 8);
  ctx.scale(state.vsScale, state.vsScale);
  ctx.font = 'bold 38px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#ff0000';
  ctx.fillText('VS', -2, 2);
  ctx.fillStyle = '#0000ff';
  ctx.fillText('VS', 2, -2);

  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(-30, -20, 30, 20);
  g.addColorStop(0, '#ff8800');
  g.addColorStop(1, '#00aaff');
  ctx.fillStyle = g;
  ctx.fillText('VS', 0, 0);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeText('VS', 0, 0);
  ctx.restore();
}

function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    i === 0
      ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
      : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
  ctx.stroke();
}

function drawLightning(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.save();
  ctx.strokeStyle = '#ffffaa';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= 8; i++) {
    const cx = x1 + ((x2 - x1) * i) / 8 + (Math.random() - 0.5) * 20;
    const cy = y1 + ((y2 - y1) * i) / 8;
    ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();
}

function drawBG2(ctx: CanvasRenderingContext2D, t: number) {
  const flicker = Math.sin(t * 18) > 0.75 ? 0.25 : 0.06;
  ctx.fillStyle = '#03030a';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = flicker;
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W + 16; x += 16) {
    for (let y = -8; y <= H + 8; y += 14) {
      drawHex(ctx, x + (y % 2 === 0 ? 8 : 0), y, 7);
    }
  }
  ctx.restore();

  if (Math.random() < 0.04) {
    drawLightning(ctx, Math.random() * W, 0, Math.random() * W, H);
  }
}

export function renderStyle2(ctx: CanvasRenderingContext2D, state: CinematicState, progress: number) {
  drawBG2(ctx, state.vsTimer);
  drawVSText(ctx, state.vsScale, state.vsAngle, '#ffff00', '#00ffff', 1, true);
}

export const INTRO_STYLE_RENDERERS = [renderStyle0, renderStyle1, renderStyle2] as const;
