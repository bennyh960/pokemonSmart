/**
 * Type Badge - Shared UI helper for drawing localized Pokemon type badges.
 *
 * Renders a colored rectangle with a 1px darker border and centered white text.
 * Supports full, short (3-char), and auto (fit-to-width) display modes.
 */

import { fillRect, drawRect, drawText } from '../engine/renderer.js';
import { TYPE_COLORS, getTypeName } from '../data/type-constants.js';
import { getLocale } from '../i18n/i18n.js';
import type { PokemonType } from '../types/index.js';

const BADGE_HEIGHT = 9;
const BADGE_FONT_SIZE = 6;
const BADGE_PAD_X = 3;

/** Max chars for 'short' mode: 3 for English, 4 for Hebrew. */
function shortMaxChars(): number {
  return getLocale() === 'he' ? 4 : 3;
}

/**
 * Draw a type badge with smart sizing.
 * @param ctx - Canvas rendering context
 * @param type - Pokemon type to draw
 * @param x - X position (left edge)
 * @param y - Y position (top edge)
 * @param mode - 'full' = full name, 'short' = locale-aware abbreviation (EN: 3 chars, HE: 4 chars), 'auto' = fit to maxWidth
 * @param maxWidth - Maximum width for 'auto' mode (ignored for other modes)
 * @returns The actual badge width drawn, so the caller can position the next badge.
 */
export function drawTypeBadge(
  ctx: CanvasRenderingContext2D,
  type: PokemonType,
  x: number,
  y: number,
  mode: 'full' | 'short' | 'auto' = 'full',
  maxWidth?: number,
): number {
  const fullName = getTypeName(type);
  let label: string;
  const maxChars = shortMaxChars();

  if (mode === 'short') {
    label = fullName.length > maxChars ? fullName.slice(0, maxChars) : fullName;
  } else if (mode === 'auto' && maxWidth !== undefined) {
    // Measure the full name to see if it fits
    ctx.save();
    ctx.font = `${BADGE_FONT_SIZE}px monospace`;
    const fullW = ctx.measureText(fullName).width + BADGE_PAD_X * 2;
    ctx.restore();
    label = fullW > maxWidth ? fullName.slice(0, maxChars) : fullName;
  } else {
    label = fullName;
  }

  // Measure actual label width
  ctx.save();
  ctx.font = `${BADGE_FONT_SIZE}px monospace`;
  const textW = ctx.measureText(label).width;
  ctx.restore();

  const badgeW = textW + BADGE_PAD_X * 2;
  const bgColor = TYPE_COLORS[type] || '#a8a878';

  // Background fill
  fillRect(ctx, x, y, badgeW, BADGE_HEIGHT, bgColor);
  // 1px darker border for clean pixel-art look
  drawRect(ctx, x, y, badgeW, BADGE_HEIGHT, '#00000044');
  // Centered white text
  drawText(ctx, label, x + BADGE_PAD_X, y + 1, {
    size: BADGE_FONT_SIZE,
    color: '#ffffff',
    font: 'monospace',
  });

  return badgeW;
}
