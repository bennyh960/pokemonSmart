/**
 * HPBar — Showdown-style dark rounded info panel.
 *
 * Layout per reference:
 *   ┌─────────────────────────────┐
 *   │    Name   ♀  L82           │  ← centered name, gender colored, level right
 *   │ 100% [═══════HP BAR══════] │  ← enemy: % left, bar right
 *   │ [═══════HP BAR══════] 45%  │  ← player: bar left, % right
 *   │ 25%  [═══════XP BAR═════]  │  ← player only: % left, bar right (blue)
 *   │ [BRN] [0.4×Def] [2×SpA]   │  ← status + stat changes
 *   └─────────────────────────────┘
 */

import { fillRect, drawText } from '../engine/renderer.js';

// Panel & bar dimensions (logical pixels)
const PANEL_W = 82;
const PAD = 3;
const BAR_W = 54;
const HP_BAR_H = 3;
const XP_BAR_H = 2;
const PCT_W = 18;   // space reserved for percentage text
const PCT_GAP = 2;  // gap between percentage and bar

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  brn: { bg: '#e86830', fg: '#fff' },
  par: { bg: '#e8c830', fg: '#222' },
  psn: { bg: '#a040a0', fg: '#fff' },
  tox: { bg: '#a040a0', fg: '#fff' },
  slp: { bg: '#a8a878', fg: '#fff' },
  frz: { bg: '#80d0d0', fg: '#222' },
};

export interface HPBarState {
  currentHp: number;
  maxHp: number;
  displayHp: number;
  name: string;
  level: number;
  x: number;  // panel top-left X
  y: number;  // panel top-left Y
  /** true = player side (% right for HP, XP bar shown). false = enemy (% left). */
  showNumbers: boolean;
  xp: number;
  xpToNext: number;
  status: string;
  gender: string;
  statChanges: { stat: string; stages: number }[];
}

function getHpColor(ratio: number): string {
  if (ratio > 0.5) return '#20d860';
  if (ratio > 0.25) return '#f8c030';
  return '#f84038';
}

/** Draw a dark rounded panel background (pixel-art approximation). */
function drawRoundedPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.globalAlpha = 0.88;
  const c = '#1a1a1a';
  fillRect(ctx, x + 2, y, w - 4, h, c);
  fillRect(ctx, x + 1, y + 1, w - 2, h - 2, c);
  fillRect(ctx, x, y + 2, w, h - 4, c);
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Draw an HP/XP bar with light track, colored fill, and subtle highlight. */
function drawBar(ctx: CanvasRenderingContext2D, bx: number, by: number, bw: number, bh: number, ratio: number, color: string): void {
  // Outer border
  fillRect(ctx, bx - 1, by - 1, bw + 2, bh + 2, '#282828');
  // Light track
  fillRect(ctx, bx, by, bw, bh, '#c8c8c8');
  // Colored fill
  const fw = Math.floor(bw * Math.max(0, Math.min(1, ratio)));
  if (fw > 0) {
    fillRect(ctx, bx, by, fw, bh, color);
    // Top highlight
    ctx.save();
    ctx.globalAlpha = 0.25;
    fillRect(ctx, bx, by, fw, 1, '#ffffff');
    ctx.restore();
  }
}

/** Get total panel height based on what's visible. */
export function getPanelHeight(bar: HPBarState): number {
  let h = 16; // name row (8px) + HP bar row (8px)
  if (bar.showNumbers && bar.xpToNext > 0) h += 6; // XP bar row
  if (bar.status || bar.statChanges.length > 0) h += 8; // status row
  return h;
}

/** No-op kept for backward compatibility. Panel is drawn by renderHPBar. */
export function drawPanelBackground(
  _ctx: CanvasRenderingContext2D, _x: number, _y: number, _w: number, _h: number,
): void {}

export function createHPBar(
  name: string, level: number, hp: number, maxHp: number,
  x: number, y: number, showNumbers = true, xp = 0, xpToNext = 0,
): HPBarState {
  return {
    currentHp: hp, maxHp, displayHp: hp, name, level,
    x, y, showNumbers, xp, xpToNext, status: '', gender: '', statChanges: [],
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

/** Render the complete info panel: background, name, HP bar, XP bar, status. */
export function renderHPBar(ctx: CanvasRenderingContext2D, bar: HPBarState): void {
  const { x, y, name, level, displayHp, maxHp, showNumbers: isPlayer, xp, xpToNext, status, gender, statChanges } = bar;

  // ── Panel background ──
  const panelH = getPanelHeight(bar);
  drawRoundedPanel(ctx, x, y, PANEL_W, panelH);

  // ── Row 1: Name + Gender + Level ──
  const nameY = y + 2;
  drawText(ctx, name, x + PAD, nameY, { size: 6, color: '#ffffff' });

  // Level on right
  drawText(ctx, `L${level}`, x + PANEL_W - PAD, nameY, { size: 5, color: '#c8c8c8', align: 'right' });

  // Gender icon just before level
  if (gender) {
    const genderColor = gender === '♂' ? '#3890f0' : '#f06080';
    const lvW = (`L${level}`).length * 3 + 1;
    drawText(ctx, gender, x + PANEL_W - PAD - lvW - 1, nameY, { size: 5, color: genderColor, align: 'right' });
  }

  // ── Row 2: HP bar ──
  const hpY = y + 10;
  const hpRatio = maxHp > 0 ? displayHp / maxHp : 0;
  const hpPct = maxHp > 0 ? Math.ceil(hpRatio * 100) : 0;

  if (isPlayer) {
    // Player: [bar] pct%  — bar on left, percentage on right
    const barX = x + PAD;
    drawBar(ctx, barX, hpY, BAR_W, HP_BAR_H, hpRatio, getHpColor(hpRatio));
    drawText(ctx, `${hpPct}%`, x + PAD + BAR_W + PCT_GAP, hpY - 1, { size: 5, color: '#e0e0e0' });
  } else {
    // Enemy: pct% [bar]  — percentage on left, bar on right
    drawText(ctx, `${hpPct}%`, x + PAD + PCT_W - 1, hpY - 1, { size: 5, color: '#e0e0e0', align: 'right' });
    const barX = x + PAD + PCT_W + PCT_GAP;
    drawBar(ctx, barX, hpY, BAR_W, HP_BAR_H, hpRatio, getHpColor(hpRatio));
  }

  let nextY = hpY + HP_BAR_H + 3;

  // ── Row 3: XP bar (player only) — pct% [bar] (percentage on left, opposite from HP) ──
  if (isPlayer && xpToNext > 0) {
    const xpRatio = xpToNext > 0 ? Math.min(xp / xpToNext, 1) : 0;
    const xpPct = Math.floor(xpRatio * 100);
    drawText(ctx, `${xpPct}%`, x + PAD + PCT_W - 1, nextY - 1, { size: 5, color: '#80b0e0', align: 'right' });
    const barX = x + PAD + PCT_W + PCT_GAP;
    drawBar(ctx, barX, nextY, BAR_W, XP_BAR_H, xpRatio, '#48a0f8');
    nextY += XP_BAR_H + 3;
  }

  // ── Row 4: Status badge + Stat changes ──
  let badgeX = x + PAD;

  if (status && STATUS_COLORS[status]) {
    const sc = STATUS_COLORS[status];
    fillRect(ctx, badgeX, nextY, 14, 6, sc.bg);
    drawText(ctx, status.toUpperCase(), badgeX + 1, nextY, { size: 4, color: sc.fg });
    badgeX += 16;
  }

  for (const change of statChanges) {
    const isUp = change.stages > 0;
    const color = isUp ? '#30c030' : '#e04040';
    const bg = isUp ? '#1a3a1a' : '#3a1a1a';
    const mult = Math.abs(change.stages) === 1 ? '' : `${Math.pow(2, Math.abs(change.stages) - 1)}×`;
    const label = `${mult}${change.stat}`;
    const badgeW = label.length * 3 + 4;
    fillRect(ctx, badgeX, nextY, badgeW, 6, bg);
    drawText(ctx, label, badgeX + 2, nextY, { size: 4, color });
    badgeX += badgeW + 2;
  }
}
