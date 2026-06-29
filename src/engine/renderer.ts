import { FONT_EN, fontFor } from './fonts.js';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './config.js';
/**
 * Renderer - Pure utility functions for Canvas 2D rendering.
 *
 * Stateless helper functions for drawing sprites, text, and primitives.
 * All coordinates are in native resolution (240x160).
 */

export const COLORS = {
  BG: '#0d1a14',
  CARD_BG: '#0f2a1a',
  CARD_SEL: '#1a3a2a',
  BORDER: '#1a4a30',
  BORDER_SEL: '#2a6a40',
  SEP: '#1a3a2a',
  TEXT_PRI: '#ffffff',
  TEXT_SEC: '#aaccaa',
  TEXT_MUT: '#667766',
  TEXT_DIM: '#445544',
  TAB_BG: '#0a2a1a',
  TAB_ACT: '#1a5a35',
  TITLE_BG: '#0a1a10',
  BTM_BG: '#0a1a10',
  KEY_BG: '#1a3a2a',
  KEY_BRD: '#2a5a3a',
  KEY_BG_HOVER: '#1a5a35',
  KEY_BRD_HOVER: '#2a6a40',
  KEY_BG_ACTIVE: '#1a7a55',
  KEY_BRD_ACTIVE: '#2a8a60',
  SEL_BAR: '#20d860',
  BAR_HP: '#20d860',
  USE_BTN_BG: '#1a5a35',
  USE_BTN_BRD: '#2a6a40',
  BAR_TRACK: '#1a3a2a',
  BAR_XP: '#5080ff',
  BAR_PP: '#20a0d8',
  KEY_BG_HOV: '#2a5a3a',
  KEY_BRD_HOV: '#2a6a40',
  // New explicit colors
  ORANGE: '#f8c030',
};

/** Options for text rendering. */
interface RectOptions {
  bgColor?: string;
  borderColor?: string;
  borderStyle?: 'solid' | 'button' | 'none';
  paddingX?: number;
  paddingY?: number;
  isHovered?: boolean;
  isActive?: boolean;
}

interface TextOptions {
  size?: number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  font?: string;
  direction?: 'ltr' | 'rtl';
  maxWidth?: number;
  lineHeight?: number;
  rect?: RectOptions;
}

const DEFAULT_RECT_OPTIONS: Required<RectOptions> = {
  bgColor: 'transparent',
  borderColor: 'transparent',
  borderStyle: 'button',
  paddingX: 0,
  paddingY: 0,
  isHovered: false,
  isActive: false,
};

/** Default text rendering options. */
const DEFAULT_TEXT_OPTIONS: Required<Omit<TextOptions, 'rect'>> = {
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

  if (!options.font) {
    opts.font = fontFor(text);
  }

  ctx.save();
  ctx.font = `${opts.size}px ${opts.font}`;
  ctx.imageSmoothingEnabled = false;

  // --- Word wrap (only if maxWidth set) ---
  const lines = opts.maxWidth > 0 ? wrapText(ctx, text, opts.maxWidth) : [text];
  const textBlockHeight = lines.length * opts.lineHeight;

  // --- Rect path ---
  let textX = x;
  let textY = y;

  if (opts.rect) {
    let { bgColor, borderColor, borderStyle, paddingX, paddingY, isHovered, isActive } = {
      ...DEFAULT_RECT_OPTIONS,
      ...opts.rect,
    };
    // Derive rect width: maxWidth if provided, otherwise measure the text
    const contentW = opts.maxWidth > 0 ? opts.maxWidth : Math.max(...lines.map((l) => ctx.measureText(l).width));

    const rectW = contentW + paddingX * 2;
    const rectH = textBlockHeight + paddingY * 2;

    let hasBg = bgColor !== 'transparent';
    let hasBorder = borderColor !== 'transparent';

    if (!hasBg && (isActive !== undefined || isHovered !== undefined)) {
      bgColor = isActive ? COLORS.KEY_BG_ACTIVE : isHovered ? COLORS.KEY_BG_HOVER : COLORS.KEY_BG;
      hasBg = true;
    }

    if (!hasBorder && (isActive !== undefined || isHovered !== undefined)) {
      borderColor = isActive ? COLORS.KEY_BRD_ACTIVE : isHovered ? COLORS.KEY_BRD_HOVER : COLORS.KEY_BRD;
      hasBorder = true;
    }

    if (hasBg) {
      fillRect(ctx, x, y, rectW, rectH, bgColor);
    }

    if (hasBorder && borderStyle !== 'none') {
      if (borderStyle === 'button') {
        drawButtonBorder(ctx, x, y, rectW, rectH, borderColor);
      } else {
        drawRect(ctx, x, y, rectW, rectH, borderColor);
      }
    }

    // x,y is rect top-left — derive text anchor inside it
    textY = y + paddingY;
    if (opts.align === 'center') {
      textX = x + paddingX + contentW / 2;
    } else if (opts.align === 'right') {
      textX = x + paddingX + contentW;
    } else {
      textX = x + paddingX;
    }
  }

  // --- Draw text ---
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align;
  ctx.textBaseline = opts.baseline;
  ctx.direction = opts.direction;

  let lineY = textY;
  for (const line of lines) {
    ctx.fillText(line, textX, lineY);
    lineY += opts.lineHeight;
  }

  ctx.restore();
}

// Pixel-art style button border: bright top-left, dark bottom-right (inset highlight)
function drawButtonBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  // Outer border
  drawRect(ctx, x, y, w, h, color);

  // Top + left highlight (lighter)
  ctx.save();
  ctx.strokeStyle = lightenColor(color, 0.4);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();

  // Bottom + right shadow (darker)
  ctx.strokeStyle = darkenColor(color, 0.4);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();
}

function lightenColor(hex: string, amount: number): string {
  return shiftColor(hex, amount);
}

function darkenColor(hex: string, amount: number): string {
  return shiftColor(hex, -amount);
}

function shiftColor(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (n >> 16) + Math.round(255 * amount)));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + Math.round(255 * amount)));
  const b = Math.min(255, Math.max(0, (n & 0xff) + Math.round(255 * amount)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
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
