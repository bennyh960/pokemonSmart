/**
 * HPBar — Showdown-style floating info: name, level, HP bar, XP bar.
 * No panel backgrounds — text floats directly over the battle scene.
 */

import { fillRect, drawText } from '../engine/renderer.js';

const HP_BAR_W = 50;
const HP_BAR_H = 2;
const HP_OFFSET = 12; // space for "HP" label before bar
const XP_BAR_W = 50;
const XP_BAR_H = 1;

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  brn: { bg: '#f08030', fg: '#fff' },
  par: { bg: '#f8d030', fg: '#222' },
  psn: { bg: '#a040a0', fg: '#fff' },
  tox: { bg: '#a040a0', fg: '#fff' },
  slp: { bg: '#a8a878', fg: '#fff' },
  frz: { bg: '#98d8d8', fg: '#222' },
};

export interface HPBarState {
  currentHp: number;
  maxHp: number;
  displayHp: number;
  name: string;
  level: number;
  x: number;
  y: number;
  showNumbers: boolean;
  xp: number;
  xpToNext: number;
  status: string;
  gender: string;
}

function getHpColor(ratio: number): string {
  if (ratio > 0.5) return '#20d860';
  if (ratio > 0.25) return '#f8c030';
  return '#f84038';
}

/** Keep export for compatibility — now a no-op since we removed panel backgrounds. */
export function drawPanelBackground(
  _ctx: CanvasRenderingContext2D,
  _x: number, _y: number, _w: number, _h: number,
): void {
  // No-op: Showdown style has no panel backgrounds
}

export function createHPBar(
  name: string, level: number, hp: number, maxHp: number,
  x: number, y: number, showNumbers = true, xp = 0, xpToNext = 0,
): HPBarState {
  return {
    currentHp: hp, maxHp, displayHp: hp, name, level,
    x, y, showNumbers, xp, xpToNext, status: '', gender: '',
  };
}

export function setHP(bar: HPBarState, newHp: number): void {
  bar.currentHp = Math.max(0, Math.min(newHp, bar.maxHp));
}

export function setXP(bar: HPBarState, xp: number, xpToNext: number): void {
  bar.xp = xp;
  bar.xpToNext = xpToNext;
}

export function setStatus(bar: HPBarState, status: string): void {
  bar.status = status;
}

export function setGender(bar: HPBarState, gender: string): void {
  bar.gender = gender;
}

export function updateHPBar(bar: HPBarState, dt: number): void {
  if (bar.displayHp !== bar.currentHp) {
    const speed = bar.maxHp * 0.8;
    const diff = bar.currentHp - bar.displayHp;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
    bar.displayHp += step;
    if (Math.abs(bar.displayHp - bar.currentHp) < 0.5) {
      bar.displayHp = bar.currentHp;
    }
  }
}

export function isHPAnimating(bar: HPBarState): boolean {
  return Math.abs(bar.displayHp - bar.currentHp) > 0.5;
}

/** Render floating info: name + level, HP bar, XP bar (player). */
export function renderHPBar(ctx: CanvasRenderingContext2D, bar: HPBarState): void {
  const { x, y, name, level, displayHp, maxHp, showNumbers, xp, xpToNext, status, gender } = bar;
  const rightEdge = x + HP_OFFSET + HP_BAR_W;

  // ── Line 1: Name + gender + Level ──
  let displayName = name;
  if (gender) displayName += ` ${gender}`;
  drawText(ctx, displayName, x, y, { size: 7, color: '#ffffff' });
  drawText(ctx, `Lv${level}`, rightEdge, y, { size: 6, color: '#d0d0d0', align: 'right' });

  // Status badge next to level
  if (status && STATUS_COLORS[status]) {
    const sc = STATUS_COLORS[status];
    fillRect(ctx, rightEdge + 2, y + 1, 12, 6, sc.bg);
    drawText(ctx, status.toUpperCase(), rightEdge + 3, y + 1, { size: 5, color: sc.fg });
  }

  // ── Line 2: HP bar (y+9) ──
  const barY = y + 9;
  drawText(ctx, 'HP', x, barY, { size: 6, color: '#f8c030' });

  // Bar track
  fillRect(ctx, x + HP_OFFSET, barY, HP_BAR_W, HP_BAR_H, '#404040');

  // Bar fill
  const ratio = maxHp > 0 ? displayHp / maxHp : 0;
  const fillW = Math.floor(HP_BAR_W * Math.max(0, Math.min(1, ratio)));
  if (fillW > 0) {
    fillRect(ctx, x + HP_OFFSET, barY, fillW, HP_BAR_H, getHpColor(ratio));
  }

  // HP text — numbers for player, percentage for enemy
  if (showNumbers) {
    drawText(ctx, `${Math.floor(displayHp)}/${maxHp}`, rightEdge, barY, {
      size: 6, color: '#ffffff', align: 'right',
    });
  } else {
    const pct = maxHp > 0 ? Math.ceil(ratio * 100) : 0;
    drawText(ctx, `${pct}%`, rightEdge, barY, {
      size: 6, color: '#c0c0c0', align: 'right',
    });
  }

  // ── Line 3: XP bar (player only, y+14) ──
  if (showNumbers && xpToNext > 0) {
    const xpY = barY + HP_BAR_H + 2;
    drawText(ctx, 'EXP', x, xpY, { size: 5, color: '#58b0f8' });
    fillRect(ctx, x + HP_OFFSET, xpY, XP_BAR_W, XP_BAR_H, '#303050');
    const xpRatio = xpToNext > 0 ? Math.min(xp / xpToNext, 1) : 0;
    const xpFillW = Math.floor(XP_BAR_W * xpRatio);
    if (xpFillW > 0) {
      fillRect(ctx, x + HP_OFFSET, xpY, xpFillW, XP_BAR_H, '#48a0f8');
    }
  }
}
