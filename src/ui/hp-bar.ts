/**
 * HPBar V2 — Dark translucent info panels with green accents.
 *
 * Opponent: fixed h=18, positioned top-right.
 * Player:   dynamic height (18-30px) anchored to bottom of battle field, with status pills.
 *
 * Reference: screens_examples_coords/battle_canvas_coordinates_v2.md
 */

import { drawText, fillRoundRect, strokeRoundRect } from '../engine/renderer.js';
import { getPokemonDisplayName } from '../services/pokemon-data.js';
import { BTL, getPlayerBarHeight, getPlayerBarY, getHpColor, STATUS_PILL_COLORS } from '../data/battle-constants.js';

export interface HPBarState {
  currentHp: number;
  maxHp: number;
  displayHp: number;
  pokemonId: number;
  level: number;
  x: number;
  y: number;
  /** true = player side (dynamic bar, shows HP numbers). false = enemy (fixed bar, shows %). */
  isPlayer: boolean;
  xp: number;
  xpToNext: number;
  status: string;
  gender: string;
  statChanges: { stat: string; stages: number }[];
}

export function createHPBar(
  pokemonId: number, level: number, hp: number, maxHp: number,
  x: number, y: number, isPlayer = true, xp = 0, xpToNext = 0,
): HPBarState {
  return {
    currentHp: hp, maxHp, displayHp: hp, pokemonId, level,
    x, y, isPlayer, xp, xpToNext, status: '', gender: '', statChanges: [],
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

export function getPanelHeight(bar: HPBarState): number {
  if (!bar.isPlayer) return BTL.OPP_BAR.h;
  const statusCount = countStatuses(bar);
  return getPlayerBarHeight(statusCount);
}

/** No-op kept for backward compatibility. */
export function drawPanelBackground(
  _ctx: CanvasRenderingContext2D, _x: number, _y: number, _w: number, _h: number,
): void {}

// ─── Internals ─────────────────────────────────────────────────────

function countStatuses(bar: HPBarState): number {
  let count = bar.statChanges.length;
  if (bar.status) count++;
  return count;
}

function drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = BTL.PANEL_BG;
  fillRoundRect(ctx, x, y, w, h, BTL.PANEL_RADIUS);
  ctx.strokeStyle = BTL.PANEL_BORDER;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, w, h, BTL.PANEL_RADIUS);
}

function drawHpTrack(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ratio: number): void {
  // Track
  ctx.fillStyle = BTL.COLORS.hpTrack;
  fillRoundRect(ctx, x, y, w, h, 1);
  // Fill
  const fw = Math.round(ratio * w);
  if (fw > 0) {
    ctx.fillStyle = getHpColor(ratio);
    fillRoundRect(ctx, x, y, fw, h, 1);
  }
}

// ─── Render ────────────────────────────────────────────────────────

export function renderHPBar(ctx: CanvasRenderingContext2D, bar: HPBarState): void {
  if (bar.isPlayer) {
    renderPlayerBar(ctx, bar);
  } else {
    renderOpponentBar(ctx, bar);
  }
}

function renderOpponentBar(ctx: CanvasRenderingContext2D, bar: HPBarState): void {
  const B = BTL.OPP_BAR;
  drawPanel(ctx, B.x, B.y, B.w, B.h);

  const ratio = bar.maxHp > 0 ? bar.displayHp / bar.maxHp : 0;
  const hpPct = bar.maxHp > 0 ? Math.ceil(ratio * 100) : 0;

  // Name (right-aligned inside panel)
  const name = getPokemonDisplayName(bar.pokemonId);
  drawText(ctx, name, B.x + B.w - BTL.OPP_NAME.dx, B.y + BTL.OPP_NAME.dy, {
    size: BTL.OPP_NAME.fs, color: BTL.COLORS.text, align: 'right', direction: 'rtl',
  });

  // Level (left-aligned)
  drawText(ctx, `Lv.${bar.level}`, B.x + BTL.OPP_LEVEL.dx, B.y + BTL.OPP_LEVEL.dy, {
    size: BTL.OPP_LEVEL.fs, color: BTL.COLORS.textMuted,
  });

  // HP label (right side)
  drawText(ctx, 'HP', B.x + BTL.OPP_HP_LABEL.dx, B.y + BTL.OPP_HP_LABEL.dy, {
    size: BTL.OPP_HP_LABEL.fs, color: BTL.COLORS.textDark, align: 'right',
  });

  // HP bar
  const track = BTL.OPP_HP_TRACK;
  drawHpTrack(ctx, B.x + track.dx, B.y + track.dy, track.w, track.h, ratio);

  // HP percentage
  drawText(ctx, `${hpPct}%`, B.x + BTL.OPP_HP_PCT.dx, B.y + BTL.OPP_HP_PCT.dy, {
    size: BTL.OPP_HP_PCT.fs, color: BTL.COLORS.textMuted,
  });
}

function renderPlayerBar(ctx: CanvasRenderingContext2D, bar: HPBarState): void {
  const statusCount = countStatuses(bar);
  const barH = getPlayerBarHeight(statusCount);
  const barY = getPlayerBarY(statusCount);
  const barX = BTL.PLY_BAR_X;
  const barW = BTL.PLY_BAR_W;

  drawPanel(ctx, barX, barY, barW, barH);

  const ratio = bar.maxHp > 0 ? bar.displayHp / bar.maxHp : 0;
  const hpCur = Math.ceil(bar.displayHp);
  const hpMax = bar.maxHp;

  // Name (right-aligned)
  const name = getPokemonDisplayName(bar.pokemonId);
  drawText(ctx, name, barX + BTL.PLY_NAME.dx, barY + BTL.PLY_NAME.dy, {
    size: BTL.PLY_NAME.fs, color: BTL.COLORS.text, align: 'right', direction: 'rtl',
  });

  // Level (left-aligned)
  drawText(ctx, `Lv.${bar.level}`, barX + BTL.PLY_LEVEL.dx, barY + BTL.PLY_LEVEL.dy, {
    size: BTL.PLY_LEVEL.fs, color: BTL.COLORS.textMuted,
  });

  // HP label
  drawText(ctx, 'HP', barX + BTL.PLY_HP_LABEL.dx, barY + BTL.PLY_HP_LABEL.dy, {
    size: BTL.PLY_HP_LABEL.fs, color: BTL.COLORS.textDark, align: 'right',
  });

  // HP bar track
  const track = BTL.PLY_HP_TRACK;
  drawHpTrack(ctx, barX + track.dx, barY + track.dy, track.w, track.h, ratio);

  // HP numeric value
  drawText(ctx, `${hpCur}/${hpMax}`, barX + BTL.PLY_HP_VAL.dx, barY + BTL.PLY_HP_VAL.dy, {
    size: BTL.PLY_HP_VAL.fs, color: BTL.COLORS.textDim,
  });

  // ── Status pills ──
  if (statusCount > 0) {
    renderStatusPills(ctx, bar, barY);
  }
}

function renderStatusPills(ctx: CanvasRenderingContext2D, bar: HPBarState, barY: number): void {
  const pills: { label: string; bgColor: string; borderColor: string; textColor: string }[] = [];

  // Primary status
  if (bar.status && STATUS_PILL_COLORS[bar.status]) {
    const s = STATUS_PILL_COLORS[bar.status];
    pills.push({ label: s.label, bgColor: s.bgColor, borderColor: s.borderColor, textColor: s.textColor });
  }

  // Stat changes as boost/debuff pills
  for (const change of bar.statChanges) {
    const isUp = change.stages > 0;
    const style = isUp ? STATUS_PILL_COLORS.boost : STATUS_PILL_COLORS.debuff;
    const mult = Math.abs(change.stages) === 1 ? '' : `×${Math.pow(2, Math.abs(change.stages) - 1)}`;
    const label = `${change.stat}${mult ? ' ' + mult : ''}`;
    pills.push({ label, bgColor: style.bgColor, borderColor: style.borderColor, textColor: style.textColor });
  }

  for (let i = 0; i < Math.min(pills.length, 4); i++) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const py = barY + (row === 0 ? BTL.STATUS_ROW0_DY : BTL.STATUS_ROW1_DY);
    const px = col === 0 ? BTL.STATUS_X0 : BTL.STATUS_X1;
    const pill = pills[i];
    const pw = col === 0 ? BTL.STATUS_PILL_W : BTL.STATUS_PILL_W - 2;

    ctx.fillStyle = pill.bgColor;
    fillRoundRect(ctx, px, py, pw, BTL.STATUS_PILL_H, 2);
    ctx.strokeStyle = pill.borderColor;
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, px, py, pw, BTL.STATUS_PILL_H, 2);
    drawText(ctx, pill.label, px + pw / 2, py, {
      size: 4, color: pill.textColor, align: 'center',
    });
  }
}
