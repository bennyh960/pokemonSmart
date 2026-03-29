/**
 * HPBar V2 — Dark translucent info panels with green accents.
 *
 * Opponent: fixed h=18, positioned top-right.
 * Player:   dynamic height (18-30px) anchored to bottom of battle field, with status pills.
 *
 * Reference: screens_examples_coords/battle_canvas_coordinates_v2.md
 */

import { drawText, fillRoundRect, strokeRoundRect } from '../engine/renderer.js';
import { fontFor } from '../engine/fonts.js';
import { getPokemonDisplayName } from '../services/pokemon-data.js';
import { BTL, getPlayerBarHeight, getPlayerBarY, getHpColor, STATUS_PILL_COLORS } from '../data/battle-constants.js';
import { isRTL } from '../i18n/i18n.js';
import { renderPartyBalls } from './battle-menu.js';

export interface HPBarState {
  currentHp: number;
  maxHp: number;
  displayHp: number;
  displayXp: number;
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

export interface PartyBallState {
  party: { hp: number }[];
  totalSlots: number;
  revealedCount?: number;
}

export function createHPBar(
  pokemonId: number, level: number, hp: number, maxHp: number,
  x: number, y: number, isPlayer = true, xp = 0, xpToNext = 0,
): HPBarState {
  return {
    currentHp: hp, maxHp, displayHp: hp, pokemonId, level,
    displayXp: xp,
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

export function setDisplayedXP(bar: HPBarState, xp: number): void {
  bar.displayXp = Math.max(0, xp);
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

  if (Math.abs(bar.displayXp - bar.xp) > 0.5) {
    const speed = Math.max(80, bar.xpToNext * 2.5);
    const diff = bar.xp - bar.displayXp;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
    bar.displayXp += step;
    if (Math.abs(bar.displayXp - bar.xp) < 0.5) {
      bar.displayXp = bar.xp;
    }
  }
}

export function isHPAnimating(bar: HPBarState): boolean {
  return Math.abs(bar.displayHp - bar.currentHp) > 0.5;
}

export function isXPAnimating(bar: HPBarState): boolean {
  return Math.abs(bar.displayXp - bar.xp) > 0.5;
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
  return bar.statChanges.length;
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

export function renderHPBar(ctx: CanvasRenderingContext2D, bar: HPBarState, partyBalls?: PartyBallState): void {
  if (bar.isPlayer) {
    renderPlayerBar(ctx, bar, partyBalls);
  } else {
    renderOpponentBar(ctx, bar, partyBalls);
  }
}

function measureTextWidth(ctx: CanvasRenderingContext2D, text: string, size: number): number {
  ctx.save();
  ctx.font = `${size}px ${fontFor(text)}`;
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

function renderPanelHeader(
  ctx: CanvasRenderingContext2D,
  panelX: number,
  panelY: number,
  panelW: number,
  name: string,
  level: number,
  status: string,
  nameStyle: { dy: number; fs: number },
  levelStyle: { dy: number; fs: number },
): void {
  const rtl = isRTL();
  const levelText = `Lv.${level}`;
  const levelWidth = measureTextWidth(ctx, levelText, levelStyle.fs);
  const statusStyle = status ? STATUS_PILL_COLORS[status] : undefined;
  const badgeLabel = statusStyle?.shortLabel ?? '';
  const badgeTextWidth = badgeLabel ? measureTextWidth(ctx, badgeLabel, 4) : 0;
  const badgeW = badgeLabel
    ? Math.max(16, badgeTextWidth + (BTL.STATUS_BADGE_PAD_X * 2))
    : 0;
  const padding = BTL.HEADER_PAD_X;
  const gap = BTL.HEADER_GAP;
  const badgeGap = badgeW > 0 ? BTL.STATUS_BADGE_GAP : 0;
  const contentWidth = panelW - padding * 2;
  const reservedWidth = levelWidth + badgeGap + badgeW;
  const nameClipW = Math.max(0, contentWidth - reservedWidth - gap);
  const nameClipX = rtl
    ? panelX + padding + reservedWidth + gap
    : panelX + padding;
  const nameAnchorX = rtl
    ? panelX + panelW - padding
    : panelX + padding;
  const levelX = rtl
    ? panelX + padding
    : panelX + panelW - padding;
  const badgeX = rtl
    ? panelX + padding + levelWidth + badgeGap
    : panelX + panelW - padding - levelWidth - badgeGap - badgeW;

  drawText(ctx, levelText, levelX, panelY + levelStyle.dy, {
    size: levelStyle.fs,
    color: BTL.COLORS.textMuted,
    align: rtl ? 'left' : 'right',
    direction: 'ltr',
  });

  if (statusStyle && badgeLabel) {
    renderStatusBadge(ctx, badgeX, panelY + 1, badgeW, badgeLabel, statusStyle);
  }

  if (nameClipW <= 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(nameClipX, panelY, nameClipW, Math.max(nameStyle.fs, levelStyle.fs) + 4);
  ctx.clip();
  drawText(ctx, name, nameAnchorX, panelY + nameStyle.dy, {
    size: nameStyle.fs,
    color: BTL.COLORS.text,
    align: rtl ? 'right' : 'left',
    direction: rtl ? 'rtl' : 'ltr',
  });
  ctx.restore();
}

function renderOpponentBar(ctx: CanvasRenderingContext2D, bar: HPBarState, partyBalls?: PartyBallState): void {
  const B = BTL.OPP_BAR;
  drawPanel(ctx, B.x, B.y, B.w, B.h);

  const ratio = bar.maxHp > 0 ? bar.displayHp / bar.maxHp : 0;
  const hpPct = bar.maxHp > 0 ? Math.ceil(ratio * 100) : 0;

  const name = getPokemonDisplayName(bar.pokemonId);
  renderPanelHeader(ctx, B.x, B.y, B.w, name, bar.level, bar.status, BTL.OPP_NAME, BTL.OPP_LEVEL);

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

  if (partyBalls) {
    renderPartyBalls(ctx, 'opponent', partyBalls.party, partyBalls.totalSlots, partyBalls.revealedCount, {
      x: B.x + B.w - BTL.PANEL_BALL_PAD_X,
      y: B.y + B.h - BTL.BALL_SIZE - BTL.PANEL_BALL_PAD_BOTTOM,
      align: 'right',
    });
  }
}

function renderPlayerBar(ctx: CanvasRenderingContext2D, bar: HPBarState, partyBalls?: PartyBallState): void {
  const statusCount = countStatuses(bar);
  const barH = getPlayerBarHeight(statusCount);
  const barY = getPlayerBarY(statusCount);
  const barX = BTL.PLY_BAR_X;
  const barW = BTL.PLY_BAR_W;

  drawPanel(ctx, barX, barY, barW, barH);

  const ratio = bar.maxHp > 0 ? bar.displayHp / bar.maxHp : 0;
  const hpCur = Math.ceil(bar.displayHp);
  const hpMax = bar.maxHp;

  const name = getPokemonDisplayName(bar.pokemonId);
  renderPanelHeader(ctx, barX, barY, barW, name, bar.level, bar.status, BTL.PLY_NAME, BTL.PLY_LEVEL);

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

  // XP bar
  const xpTrack = BTL.PLY_XP_TRACK;
  const xpRatio = bar.xpToNext > 0 ? Math.max(0, Math.min(1, bar.displayXp / bar.xpToNext)) : 0;
  ctx.fillStyle = BTL.COLORS.xpTrack;
  fillRoundRect(ctx, barX + xpTrack.dx, barY + xpTrack.dy, xpTrack.w, xpTrack.h, 1);
  const xpFillW = Math.round(xpTrack.w * xpRatio);
  if (xpFillW > 0) {
    ctx.fillStyle = BTL.COLORS.xpFill;
    fillRoundRect(ctx, barX + xpTrack.dx, barY + xpTrack.dy, xpFillW, xpTrack.h, 1);
  }

  if (partyBalls) {
    renderPartyBalls(ctx, 'player', partyBalls.party, partyBalls.totalSlots, partyBalls.revealedCount, {
      x: barX + BTL.PANEL_BALL_PAD_X,
      y: barY + barH - BTL.BALL_SIZE - BTL.PANEL_BALL_PAD_BOTTOM,
      align: 'left',
    });
  }

  // ── Status pills ──
  if (statusCount > 0) {
    renderStatusPills(ctx, bar, barY);
  }
}

function renderStatusPills(ctx: CanvasRenderingContext2D, bar: HPBarState, barY: number): void {
  const pills: { label: string; bgColor: string; borderColor: string; textColor: string }[] = [];

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

function renderStatusBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  label: string,
  style: { bgColor: string; borderColor: string; textColor: string },
): void {
  ctx.fillStyle = style.bgColor;
  fillRoundRect(ctx, x, y, w, BTL.STATUS_BADGE_H, 2);
  ctx.strokeStyle = style.borderColor;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, x, y, w, BTL.STATUS_BADGE_H, 2);
  drawText(ctx, label, x + w / 2, y + 1, {
    size: 4,
    color: style.textColor,
    align: 'center',
    direction: 'ltr',
  });
}
