/**
 * HPBar - Renders an animated HP bar with color transitions.
 *
 * Green when >50%, yellow when 25-50%, red when <25%.
 * Smooth animation when HP changes. Shows name, level, and HP text.
 * Optionally renders an XP bar (player side) and panel backgrounds.
 */

import { fillRect, drawText, drawRect } from '../engine/renderer.js';
import { t } from '../i18n/i18n.js';

const BAR_WIDTH = 64;
const BAR_HEIGHT = 4;
const XP_BAR_WIDTH = 64;
const XP_BAR_HEIGHT = 2;

interface HPBarState {
  currentHp: number;
  maxHp: number;
  displayHp: number;
  name: string;
  level: number;
  x: number;
  y: number;
  /** If true, shows HP numbers (player side). */
  showNumbers: boolean;
  /** Current XP (player side only). */
  xp: number;
  /** XP needed for next level (player side only). */
  xpToNext: number;
}

/** Get HP bar color based on percentage. */
function getHpColor(ratio: number): string {
  if (ratio > 0.5) return '#20d860'; // green
  if (ratio > 0.25) return '#f8c030'; // yellow
  return '#f84038'; // red
}

/** Draw a panel background (dark box with light border). */
export function drawPanelBackground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  fillRect(ctx, x, y, w, h, '#181820');
  drawRect(ctx, x, y, w, h, '#585858');
  // Inner highlight
  drawRect(ctx, x + 1, y + 1, w - 2, h - 2, '#383840');
}

/** Create an HP bar instance. */
export function createHPBar(
  name: string,
  level: number,
  hp: number,
  maxHp: number,
  x: number,
  y: number,
  showNumbers = true,
  xp = 0,
  xpToNext = 0,
): HPBarState {
  return { currentHp: hp, maxHp, displayHp: hp, name, level, x, y, showNumbers, xp, xpToNext };
}

/** Set HP and animate towards it. */
export function setHP(bar: HPBarState, newHp: number): void {
  bar.currentHp = Math.max(0, Math.min(newHp, bar.maxHp));
}

/** Update XP values on the bar (player side). */
export function setXP(bar: HPBarState, xp: number, xpToNext: number): void {
  bar.xp = xp;
  bar.xpToNext = xpToNext;
}

/** Update the smooth animation. */
export function updateHPBar(bar: HPBarState, dt: number): void {
  if (bar.displayHp !== bar.currentHp) {
    const speed = bar.maxHp * 0.8; // drain speed per second
    const diff = bar.currentHp - bar.displayHp;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
    bar.displayHp += step;
    if (Math.abs(bar.displayHp - bar.currentHp) < 0.5) {
      bar.displayHp = bar.currentHp;
    }
  }
}

/** Check if HP animation is still playing. */
export function isHPAnimating(bar: HPBarState): boolean {
  return Math.abs(bar.displayHp - bar.currentHp) > 0.5;
}

/** Render the HP bar. */
export function renderHPBar(ctx: CanvasRenderingContext2D, bar: HPBarState): void {
  const { x, y, name, level, displayHp, maxHp, showNumbers, xp, xpToNext } = bar;

  // Name and level
  drawText(ctx, name, x, y, { size: 8, color: '#ffffff' });
  drawText(ctx, t('hp.level', { level }), x + BAR_WIDTH + 14, y, {
    size: 8,
    color: '#ffffff',
    align: 'right',
  });

  // HP label
  drawText(ctx, t('hp.label'), x, y + 10, { size: 8, color: '#f8c030' });

  // Bar background
  const barX = x + 14;
  const barY = y + 10;
  fillRect(ctx, barX, barY, BAR_WIDTH, BAR_HEIGHT, '#303030');
  drawRect(ctx, barX - 1, barY - 1, BAR_WIDTH + 2, BAR_HEIGHT + 2, '#484848');

  // Bar fill
  const ratio = maxHp > 0 ? displayHp / maxHp : 0;
  const fillWidth = Math.floor(BAR_WIDTH * Math.max(0, Math.min(1, ratio)));
  if (fillWidth > 0) {
    fillRect(ctx, barX, barY, fillWidth, BAR_HEIGHT, getHpColor(ratio));
  }

  // HP numbers
  if (showNumbers) {
    drawText(
      ctx,
      `${Math.floor(displayHp)}/${maxHp}`,
      x + BAR_WIDTH + 14,
      y + 10,
      { size: 8, color: '#ffffff', align: 'right' },
    );
  }

  // XP bar (player side only)
  if (showNumbers && xpToNext > 0) {
    const xpBarX = barX;
    const xpBarY = barY + BAR_HEIGHT + 4;
    fillRect(ctx, xpBarX, xpBarY, XP_BAR_WIDTH, XP_BAR_HEIGHT, '#303030');
    const xpRatio = xpToNext > 0 ? Math.min(xp / xpToNext, 1) : 0;
    const xpFillWidth = Math.floor(XP_BAR_WIDTH * xpRatio);
    if (xpFillWidth > 0) {
      fillRect(ctx, xpBarX, xpBarY, xpFillWidth, XP_BAR_HEIGHT, '#48a0f8');
    }
  }
}
