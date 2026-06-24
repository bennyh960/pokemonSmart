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
  paddingX: 0,
  paddingY: 0,
  bgColor: 'transparent',
  borderColor: 'transparent',
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

  if (!options.font) {
    opts.font = fontFor(text);
  }

  ctx.save();
  ctx.font = `${opts.size}px ${opts.font}`;
  ctx.imageSmoothingEnabled = false;

  // --- Word wrap with punctuation-priority breaks ---
  const lines = opts.maxWidth > 0 ? wrapText(ctx, text, opts.maxWidth) : [text];

  // --- Dynamic rect height ---
  const textBlockHeight = lines.length * opts.lineHeight;
  const rectW = opts.maxWidth > 0 ? opts.maxWidth + opts.paddingX * 2 : 0;
  const rectH = textBlockHeight + opts.paddingY * 2;

  // --- Draw bg/border rect if requested ---
  const hasBg = opts.bgColor !== 'transparent';
  const hasBorder = opts.borderColor !== 'transparent';

  if ((hasBg || hasBorder) && rectW > 0) {
    // x is the text anchor; back-calculate rect origin based on alignment
    let rectX = x - opts.paddingX;
    if (opts.align === 'center') rectX = x - rectW / 2;
    else if (opts.align === 'right') rectX = x - rectW + opts.paddingX;

    const rectY = y - opts.paddingY;

    if (hasBg) {
      fillRect(ctx, rectX, rectY, rectW, rectH, opts.bgColor);
    }
    if (hasBorder) {
      drawRect(ctx, rectX, rectY, rectW, rectH, opts.borderColor);
    }
  }

  // --- Draw text lines ---
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align;
  ctx.textBaseline = opts.baseline;
  ctx.direction = opts.direction;

  let lineY = y;
  for (const line of lines) {
    ctx.fillText(line, x, lineY);
    lineY += opts.lineHeight;
  }

  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];

  // Split on punctuation boundaries first (after . or :), then spaces within
  // e.g. "Hello: world foo. bar baz" → ["Hello:", "world foo.", "bar baz"]
  const chunks = text.split(/(?<=[.:])(?=\s|\S)/);

  let line = '';

  for (const chunk of chunks) {
    // Within each chunk, split on spaces
    const words = chunk.trim().split(' ');

    for (const word of words) {
      const candidate = line + (line ? ' ' : '') + word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }

    // After a punctuation chunk, prefer to break here if it fits on its own line
    // i.e. don't force a break, but the next chunk starts fresh consideration
    // (the inner word-wrap already handles overflow; this is enough)
  }

  if (line) lines.push(line);
  return lines;
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
  x: number,
  y: number,
  w: number,
  h: number,
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
  x: number,
  y: number,
  w: number,
  h: number,
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
// currently for volume in menu
export function slider(ctx: CanvasRenderingContext2D, volume: number, px: number, py: number, pw = 28, ph = 12): void {
  // רקע ריק של האזור
  ctx.fillStyle = '#1a1a2e';
  fillRoundRect(ctx, px, py, pw, ph, 2);

  // קו המסילה של הסליידר
  const lineY = py + ph / 2;
  ctx.fillStyle = '#444466';
  ctx.fillRect(px + 3, lineY - 1, pw - 6, 2);

  // ידית האחיזה (החלק הזז) לפי אחוז הווליום
  const minX = px + 3;
  const maxX = px + pw - 6;
  const handleX = minX + volume * (maxX - minX);

  ctx.fillStyle = '#88ccff';
  ctx.fillRect(handleX - 1, py + 2, 3, ph - 4);
}
