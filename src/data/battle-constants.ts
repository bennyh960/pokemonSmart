/**
 * Battle Screen V2 Constants — all layout coordinates, colors, and type badge data.
 *
 * Reference: screens_examples_coords/battle_canvas_coordinates_v2.md
 * Logical canvas: 240×160
 */

// Re-export TypeBadgeStyle and TYPE_BADGE from the canonical source
export type { TypeBadgeStyle } from './type-constants.js';
export { TYPE_BADGE } from './type-constants.js';

// ─── Status pill colors ────────────────────────────────────────────
export interface StatusPillStyle {
  label: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export const STATUS_PILL_COLORS: Record<string, StatusPillStyle> = {
  poison:  { label: 'הרעלה',  bgColor: 'rgba(160,64,160,0.15)',  borderColor: 'rgba(160,64,160,0.25)',  textColor: '#c070c0' },
  burn:    { label: 'שריפה',  bgColor: 'rgba(240,128,48,0.15)',  borderColor: 'rgba(240,128,48,0.25)',  textColor: '#f09050' },
  paralyze:{ label: 'שיתוק',  bgColor: 'rgba(248,208,48,0.15)',  borderColor: 'rgba(248,208,48,0.25)',  textColor: '#d8b830' },
  sleep:   { label: 'שינה',   bgColor: 'rgba(100,100,140,0.15)', borderColor: 'rgba(100,100,140,0.25)', textColor: '#8888b0' },
  freeze:  { label: 'קפאון',  bgColor: 'rgba(152,216,216,0.15)', borderColor: 'rgba(152,216,216,0.25)', textColor: '#80c8c8' },
  confuse: { label: 'מבולבל', bgColor: 'rgba(248,88,136,0.15)',  borderColor: 'rgba(248,88,136,0.25)',  textColor: '#f07090' },
  boost:   { label: '',       bgColor: 'rgba(77,255,180,0.1)',   borderColor: 'rgba(77,255,180,0.2)',   textColor: '#4dffb4' },
  debuff:  { label: '',       bgColor: 'rgba(232,88,88,0.1)',    borderColor: 'rgba(232,88,88,0.2)',    textColor: '#e85858' },
};

// ─── Main layout constants ─────────────────────────────────────────
export const BTL = {
  // ===== ZONES =====
  FIELD_H: 84,
  DIVIDER_Y: 84,
  PROMPT_Y: 85,   PROMPT_H: 8,
  TABS_Y: 94,     TABS_H: 8,
  CONTENT_Y: 106,
  BTM_Y: 150,     BTM_H: 10,

  // ===== BACKGROUND =====
  BG: {
    SKY:    { x: 0, y: 0,  w: 240, h: 34, from: '#4a7a5a', mid: '#5a9a6a', to: '#7aaa70' },
    GROUND: { x: 0, y: 34, w: 240, h: 50, from: '#8ab87a', mid1: '#c8d8a0', mid2: '#d8c890', to: '#b8a870' },
    LINES: [
      { y: 52, alpha: 0.12 },
      { y: 60, alpha: 0.08 },
      { y: 68, alpha: 0.06 },
    ],
  },

  // ===== TURN BADGE =====
  TURN: { x: 102, y: 2, w: 36, h: 8, fs: 6,
    bgColor: 'rgba(10,20,14,0.8)', borderColor: 'rgba(77,255,180,0.25)',
    textColor: '#4dffb4', numColor: '#ffffff' },

  // ===== SPRITES =====
  OPP_SPRITE: { x: 150, y: 16, w: 46, h: 46 },
  PLY_SPRITE: { x: 18,  y: 24, w: 56, h: 56 },

  // ===== OPPONENT INFO BAR (fixed h=18) =====
  OPP_BAR:      { x: 136, y: 12, w: 100, h: 18 },
  OPP_NAME:     { dx: 52, dy: 1, w: 46, fs: 6 },   // right-aligned from bar right edge
  OPP_LEVEL:    { dx: 4,  dy: 2, fs: 5 },           // left-aligned from bar left edge
  OPP_HP_LABEL: { dx: 92, dy: 9, fs: 5 },           // right-aligned
  OPP_HP_TRACK: { dx: 4,  dy: 10, w: 42, h: 3 },
  OPP_HP_PCT:   { dx: 60, dy: 9, fs: 5 },

  // ===== PLAYER INFO BAR (dynamic height) =====
  PLY_BAR_X: 4,
  PLY_BAR_W: 114,
  PLY_BAR_BOTTOM: 82,
  PLY_NAME:     { dx: 66, dy: 1, w: 46, fs: 6 },
  PLY_LEVEL:    { dx: 4,  dy: 2, fs: 5 },
  PLY_HP_LABEL: { dx: 104, dy: 8, fs: 5 },
  PLY_HP_TRACK: { dx: 4,  dy: 10, w: 54, h: 3 },
  PLY_HP_VAL:   { dx: 62, dy: 8, fs: 5 },

  // Status pills relative to barY
  STATUS_ROW0_DY: 16,
  STATUS_ROW1_DY: 22,
  STATUS_PILL_H: 6,
  STATUS_PILL_W: 30,
  STATUS_GAP: 4,
  STATUS_X0: 84,  // rightmost pill (barX + barW - 4 - 30)
  STATUS_X1: 52,  // second pill

  // ===== PARTY BALLS =====
  BALL_SIZE: 4,
  BALL_Y: 79,
  BALL_GAP: 6,
  PLY_BALLS_X0: 4,
  OPP_BALLS_X0: 208,
  BALL_ALIVE:   { fill: '#20d860', border: '#2a8a4a' },
  BALL_FAINTED:  { fill: '#d84040', border: '#8a2a2a' },
  BALL_EMPTY:    { fill: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)' },

  // ===== PROMPT BAR =====
  PROMPT_BG:   { x: 0, y: 85, w: 240, h: 8, color: '#0a1a10' },
  PROMPT_TEXT:  { x: 236, y: 86, fs: 6 },    // right anchor
  PROMPT_HP:   { x: 44,  y: 87, fs: 5 },     // left

  // ===== ACTION TABS =====
  TABS_BG: { x: 0, y: 94, w: 240, h: 8, color: '#0d1a14', borderColor: '#1a3a2a' },
  TABS: [
    { id: 'fight'  as const, text: 'התקפה', x: 188, w: 48, color: '#20d860' },
    { id: 'switch' as const, text: 'החלפה', x: 136, w: 48, color: '#5080ff' },
    { id: 'bag'    as const, text: 'תיק',   x: 92,  w: 40, color: '#f8d030' },
    { id: 'run'    as const, text: 'בריחה', x: 48,  w: 40, color: '#e85858' },
  ] as const,
  TAB_TEXT_DY: 1,
  TAB_INACTIVE_C: '#445544',

  // ===== MOVE GRID =====
  MOVE: {
    cells: [
      { col: 1, row: 0, x: 122, y: 106 },  // move 0 top-right
      { col: 0, row: 0, x: 4,   y: 106 },  // move 1 top-left
      { col: 1, row: 1, x: 122, y: 128 },  // move 2 bottom-right
      { col: 0, row: 1, x: 4,   y: 128 },  // move 3 bottom-left
    ],
    W: 114,
    H: 20,
    SEL_BAR_W: 2,

    // Inside cell (relative to cellX, cellY):
    TYPE_DX: 4,     TYPE_DY: 2,     TYPE_W: 22, TYPE_H: 7, TYPE_FS: 5,
    NAME_DX: 30,    NAME_DY: 2,     NAME_W: 80, NAME_FS: 7,
    POWER_DX: 4,    POWER_DY: 12,   POWER_FS: 5,
    PP_DX: 110,     PP_DY: 12,      PP_W: 22, PP_FS: 5,
    PP_BAR_DX: 76,  PP_BAR_DY: 17,  PP_BAR_W: 38, PP_BAR_H: 1,
  },

  // ===== SWITCH GRID =====
  SWITCH: {
    cells: [
      { col: 2, row: 0, x: 160, y: 106 },
      { col: 1, row: 0, x: 82,  y: 106 },
      { col: 0, row: 0, x: 4,   y: 106 },
      { col: 2, row: 1, x: 160, y: 128 },
      { col: 1, row: 1, x: 82,  y: 128 },
      { col: 0, row: 1, x: 4,   y: 128 },
    ],
    W: 76,
    H: 20,
    SPRITE_DX: 56, SPRITE_DY: 2, SPRITE_SZ: 16,
    NAME_DX: 4,    NAME_DY: 3,   NAME_W: 48, NAME_FS: 6,
    HP_DX: 4,      HP_DY: 12,    HP_W: 48,   HP_H: 2,
  },

  // ===== BOTTOM BAR =====
  BTM_BG: { x: 0, y: 150, w: 240, h: 10, color: '#0a1a10' },
  BTM_KEYS: [
    { pillX: 8,   pillW: 18, pillText: 'ESC',   hintX: 28,  hint: 'בריחה' },
    { pillX: 66,  pillW: 24, pillText: 'Enter', hintX: 92,  hint: 'בחירה' },
    { pillX: 132, pillW: 24, pillText: '▲▼◀▶', hintX: 158, hint: 'ניווט' },
  ],

  // ===== PANEL STYLE =====
  PANEL_BG: 'rgba(10,20,14,0.82)',
  PANEL_BORDER: 'rgba(77,255,180,0.15)',
  PANEL_RADIUS: 4,

  // ===== COMMON COLORS =====
  COLORS: {
    bg:         '#0d1a14',
    divider:    '#1a3a2a',
    hpTrack:    '#1a3a2a',
    ppTrack:    '#1a3a2a',
    ppFill:     '#20a0d8',
    selBar:     '#20d860',
    cellBg:     '#0f2a1a',
    cellBgSel:  '#1a3a2a',
    cellBorder: '#1a4a30',
    cellBorderSel: '#2a6a40',
    text:       '#ffffff',
    textDim:    '#aaccaa',
    textMuted:  '#667766',
    textDark:   '#445544',
    pillBg:     '#1a3a2a',
    pillBorder: '#2a5a3a',
    pillText:   '#aaccaa',
    pillHint:   '#667766',
  },
} as const;

// ─── Helpers ───────────────────────────────────────────────────────

/** Calculate player info bar height based on number of status effects. */
export function getPlayerBarHeight(statusCount: number): number {
  if (statusCount === 0) return 18;
  return 18 + Math.ceil(statusCount / 2) * 6;
}

/** Calculate player info bar Y (anchored to bottom of battle field). */
export function getPlayerBarY(statusCount: number): number {
  return BTL.PLY_BAR_BOTTOM - getPlayerBarHeight(statusCount);
}

/** Get HP bar color by ratio. */
export function getHpColor(ratio: number): string {
  if (ratio > 0.5) return '#20d860';
  if (ratio > 0.25) return '#d8a020';
  return '#d84040';
}
