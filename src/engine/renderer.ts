/**
 * Renderer - Pure utility functions for Canvas 2D rendering.
 *
 * Stateless helper functions for drawing sprites, text, and primitives.
 * All coordinates are in native resolution (240x160).
 */

import type { TextOptions } from '../types/index.js';
import { FONT_EN, fontFor } from './fonts.js';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './config.js';

/** Default text rendering options. */
const DEFAULT_TEXT_OPTIONS: Required<TextOptions> = {
  size: 8,
  color: '#ffffff',
  align: 'left',
  baseline: 'top',
  font: FONT_EN,
  direction: 'ltr',
  maxWidth: 0,
  lineHeight: 10,
};

/** Clear the entire canvas with a solid color. */
export function clearScreen(ctx: CanvasRenderingContext2D, color = '#000000'): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

/** Draw a sub-region of a sprite sheet to the canvas. */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}

/** Draw text with pixel-art-friendly settings. Supports RTL direction for Hebrew. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: TextOptions = {},
): void {
  const opts = { ...DEFAULT_TEXT_OPTIONS, ...options };

  // Auto-detect Hebrew text and switch font
  if (!options.font) {
    opts.font = fontFor(text);
  }

  ctx.save();
  ctx.font = `${opts.size}px ${opts.font}`;
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align;
  ctx.textBaseline = opts.baseline;
  ctx.direction = opts.direction;
  ctx.imageSmoothingEnabled = false;

  if (opts.maxWidth > 0) {
    const words = text.split(' ');
    let line = '';
    let lineY = y;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > opts.maxWidth && line) {
        ctx.fillText(line, x, lineY);
        line = word;
        lineY += opts.lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, lineY);
  } else {
    ctx.fillText(text, x, y);
  }

  ctx.restore();
}

/** Draw a stroked rectangle outline. */
export function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color = 'red',
  lineWidth = 1,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x, y, w, h);
}

/** Draw a filled rectangle. */
export function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color = 'red',
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Draw a filled rounded rectangle. Radius can be a single number or [TL, TR, BR, BL]. */
export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number | number[],
): void {
  const radii = typeof r === 'number' ? [r, r, r, r] : r;
  ctx.beginPath();
  ctx.moveTo(x + radii[0], y);
  ctx.lineTo(x + w - radii[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radii[1]);
  ctx.lineTo(x + w, y + h - radii[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h);
  ctx.lineTo(x + radii[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radii[3]);
  ctx.lineTo(x, y + radii[0]);
  ctx.quadraticCurveTo(x, y, x + radii[0], y);
  ctx.closePath();
  ctx.fill();
}

/** Stroke a rounded rectangle. Radius can be a single number or [TL, TR, BR, BL]. */
export function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number | number[],
): void {
  const radii = typeof r === 'number' ? [r, r, r, r] : r;
  ctx.beginPath();
  ctx.moveTo(x + radii[0], y);
  ctx.lineTo(x + w - radii[1], y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radii[1]);
  ctx.lineTo(x + w, y + h - radii[2]);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h);
  ctx.lineTo(x + radii[3], y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radii[3]);
  ctx.lineTo(x, y + radii[0]);
  ctx.quadraticCurveTo(x, y, x + radii[0], y);
  ctx.closePath();
  ctx.stroke();
}
