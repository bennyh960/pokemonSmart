/**
 * BattleMenu V2 — Tabbed action menu with move grid, switch grid, and bottom bar.
 *
 * Tabs: fight / switch / bag / run (rendered at y=94)
 * Content area (y=106): 2×2 move grid (paginated for 8 moves) or 3×2 party switch grid
 * Prompt bar (y=85): "?מה יעשה [name]" + HP
 * Bottom bar (y=150): keyboard hints
 *
 * Reference: screens_examples_coords/battle_canvas_coordinates_v2.md
 */

import type { InputManager } from '../engine/input.js';
import type { Move, Pokemon, PokemonType } from '../types/index.js';
import { fillRect, drawText, fillRoundRect, strokeRoundRect } from '../engine/renderer.js';
import { fontFor } from '../engine/fonts.js';
import {
  getMoveDisplayName,
  getPokemonDisplayName,
  getCombinedTypeEffectiveness,
  getMove,
} from '../services/pokemon-data.js';
import { LOGICAL_WIDTH as SCREEN_W } from '../engine/config.js';
import { BTL, TYPE_BADGE, getHpColor } from '../data/battle-constants.js';
import { getTypeName } from '../data/type-constants.js';
import { getCachedImage } from '../engine/sprite-loader.js';
import { t, isRTL } from '../i18n/i18n.js';
import { isMoveHackerOpen, openMoveHacker } from './admin-moves-hack.js';

export type MainMenuChoice = 'FIGHT' | 'BAG' | 'POKEMON' | 'RUN' | 'POKEDEX';

export interface BattleMenuState {
  mode: 'main' | 'moves';
  cursorIndex: number;
  moves: Move[];
  /** For 8-move pagination: 0 = moves 0-3, 1 = moves 4-7 */
  movePage: number;
  /** Active tab index for rendering (0=fight,1=switch,2=bag,3=pokedex) */
  activeTab: number;
  /** Turn counter for display */
  turnNumber: number;
  /** Player's current pokemon for prompt rendering */
  playerPokemon: Pokemon | null;
  /** Player party for switch grid rendering */
  party: Pokemon[];
  /** Enemy types — used for type effectiveness display when battleHelperActive */
  enemyTypes: PokemonType[];
  /** When true, show type effectiveness multipliers on each move cell */
  battleHelperActive: boolean;
  /** Active weather type (null if none) — used to show weather power/accuracy indicators */
  activeWeather: string | null;
  /** Move IDs currently disabled (player's Pokémon) — shown grayed in the move grid */
  disabledMoveIds: number[];
  /** SturggleMode*/
  isStruggleMode?: boolean;
}

const TAB_TO_CHOICE: MainMenuChoice[] = ['FIGHT', 'POKEMON', 'BAG', 'POKEDEX'];

export function createBattleMenu(moves: Move[]): BattleMenuState {
  return {
    mode: 'moves',
    cursorIndex: 0,
    moves,
    movePage: 0,
    activeTab: 0,
    turnNumber: 1,
    playerPokemon: null,
    party: [],
    enemyTypes: [],
    battleHelperActive: false,
    activeWeather: null,
    disabledMoveIds: [],
    isStruggleMode: false,
  };
}

/** Show main action menu (tabs mode). */
export function showMainMenu(menu: BattleMenuState): void {
  menu.mode = 'main';
  menu.cursorIndex = 0;
  menu.activeTab = 0;
}

/** Show move selection menu (fight tab active). */
export function showMoveMenu(menu: BattleMenuState): void {
  menu.mode = 'moves';
  // Keep cursorIndex so focus stays on last selected move
  menu.activeTab = 0;
}

/**
 * Update menu navigation. Returns the selection or null.
 * For main: returns MainMenuChoice.
 * For moves: returns the Move index (0-7) or -1 for back.
 */
export function updateBattleMenu(
  menu: BattleMenuState,
  input: InputManager,
): { type: 'main'; choice: MainMenuChoice } | { type: 'move'; index: number } | null {
  if (menu.mode === 'main') {
    return updateTabMode(menu, input);
  } else {
    return updateMoveMode(menu, input);
  }
}

function updateTabMode(menu: BattleMenuState, input: InputManager): { type: 'main'; choice: MainMenuChoice } | null {
  // Number shortcuts: 1=fight, 2=switch, 3=bag, 4=pokedex
  if (input.isKeyPressed('Digit1')) return { type: 'main', choice: 'FIGHT' };
  if (input.isKeyPressed('Digit2')) return { type: 'main', choice: 'POKEMON' };
  if (input.isKeyPressed('Digit3')) return { type: 'main', choice: 'BAG' };
  if (input.isKeyPressed('Digit4')) return { type: 'main', choice: 'POKEDEX' };

  // Left/Right navigate tabs (RTL: reversed direction)
  if (input.isKeyPressed('ArrowRight')) {
    // Visual right = lower tab index (tabs laid out right-to-left in Hebrew)
    if (menu.activeTab > 0) menu.activeTab--;
  }
  if (input.isKeyPressed('ArrowLeft')) {
    if (menu.activeTab < 3) menu.activeTab++;
  }

  // Select tab
  if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
    return { type: 'main', choice: TAB_TO_CHOICE[menu.activeTab] };
  }

  // Escape = run
  if (input.isKeyPressed('Escape')) {
    return { type: 'main', choice: 'RUN' };
  }

  return null;
}

function updateMoveMode(
  menu: BattleMenuState,
  input: InputManager,
): { type: 'main'; choice: MainMenuChoice } | { type: 'move'; index: number } | null {
  // Admin move hacker — must be first
  if (import.meta.env.DEV && input.isKeyPressed('Digit9')) {
    const actualIndex = menu.movePage * 4 + menu.cursorIndex;
    openMoveHacker(actualIndex);
    return null;
  }

  // Block all input while hacker modal is open
  if (isMoveHackerOpen()) return null;

  // Number shortcuts from move mode: 2=switch, 3=bag, 4=pokedex (1=already in moves)
  if (input.isKeyPressed('Digit2')) return { type: 'main', choice: 'POKEMON' };
  if (input.isKeyPressed('Digit3')) return { type: 'main', choice: 'BAG' };
  if (input.isKeyPressed('Digit4')) return { type: 'main', choice: 'POKEDEX' };

  const totalMoves = menu.moves.length;
  const totalPages = Math.ceil(totalMoves / 4);
  const pageStart = menu.movePage * 4;
  const pageEnd = Math.min(pageStart + 4, totalMoves);
  const pageCount = pageEnd - pageStart;

  // Grid layout: move 0=top-right(col1,row0), move 1=top-left(col0,row0),
  //              move 2=bottom-right(col1,row1), move 3=bottom-left(col0,row1)
  // Navigation mirrors this: left/right swap columns, up/down swap rows

  if (input.isKeyPressed('ArrowRight')) {
    // Move to right column (col 1 = even indices in our grid mapping)
    const col = menu.cursorIndex % 2;
    if (col === 1) {
      // Currently left column, move to right
      const target = menu.cursorIndex - 1;
      if (target >= 0 && target < pageCount) menu.cursorIndex = target;
    }
  }
  if (input.isKeyPressed('ArrowLeft')) {
    const col = menu.cursorIndex % 2;
    if (col === 0) {
      // Currently right column, move to left
      const target = menu.cursorIndex + 1;
      if (target < pageCount) menu.cursorIndex = target;
    }
  }
  if (input.isKeyPressed('ArrowDown')) {
    if (menu.cursorIndex + 2 < pageCount) {
      menu.cursorIndex += 2;
    } else if (totalPages > 1) {
      // Page down
      const nextPage = (menu.movePage + 1) % totalPages;
      menu.movePage = nextPage;
      menu.cursorIndex = 0;
    }
  }
  if (input.isKeyPressed('ArrowUp')) {
    if (menu.cursorIndex - 2 >= 0) {
      menu.cursorIndex -= 2;
    } else if (totalPages > 1) {
      // Page up
      const prevPage = (menu.movePage - 1 + totalPages) % totalPages;
      menu.movePage = prevPage;
      menu.cursorIndex = 0;
    }
  }

  // Select move
  if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
    const actualIndex = menu.movePage * 4 + menu.cursorIndex;
    if (actualIndex < totalMoves) {
      return { type: 'move', index: actualIndex };
    }
  }

  // Back to main
  if (input.isKeyPressed('Escape') || input.isKeyPressed('Backspace')) {
    return { type: 'move', index: -1 };
  }

  return null;
}

// ─── Render ────────────────────────────────────────────────────────

/** Render the full battle menu area (prompt bar + tabs + content + bottom bar). */
export function renderBattleMenu(ctx: CanvasRenderingContext2D, menu: BattleMenuState): void {
  // Background fill for the entire lower area
  fillRect(ctx, 0, BTL.DIVIDER_Y, SCREEN_W, 160 - BTL.DIVIDER_Y, BTL.COLORS.bg);

  // Divider line
  fillRect(ctx, 0, BTL.DIVIDER_Y, SCREEN_W, 1, BTL.COLORS.divider);

  // Prompt bar
  renderPromptBar(ctx, menu);

  // Action tabs
  renderTabs(ctx, menu);

  // Content area — always show move grid
  renderMoveGrid(ctx, menu);

  // Dim overlay on move grid when in tab-select mode
  if (menu.mode === 'main') {
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, BTL.CONTENT_Y, SCREEN_W, 160 - BTL.CONTENT_Y);
    ctx.restore();
  }

  // Bottom help bar
  // renderBottomBar(ctx);
}

// ─── Prompt Bar (y=85) ────────────────────────────────────────────

function truncateToFit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number): string {
  ctx.save();
  ctx.font = `${fontSize}px ${fontFor(text)}`;
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.restore();
    return text;
  }
  const ellipsis = '…';
  let end = text.length;
  while (end > 0 && ctx.measureText(text.slice(0, end) + ellipsis).width > maxWidth) {
    end--;
  }
  ctx.restore();
  return text.slice(0, end) + ellipsis;
}

function renderPromptBar(ctx: CanvasRenderingContext2D, menu: BattleMenuState): void {
  const P = BTL.PROMPT_BG;
  fillRect(ctx, P.x, P.y, P.w, P.h, P.color);

  // ESC → run button legend (left side)
  const E = BTL.PROMPT_ESC;
  ctx.fillStyle = BTL.COLORS.pillBg;
  fillRoundRect(ctx, E.pillX, E.pillY, E.pillW, E.pillH, 2);
  ctx.strokeStyle = '#e85858';
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, E.pillX, E.pillY, E.pillW, E.pillH, 2);
  drawText(ctx, 'ESC', E.pillX + E.pillW / 2, E.pillY + 1, {
    size: E.fs,
    color: '#e85858',
    align: 'center',
  });
  drawText(ctx, menu.mode === 'moves' ? t('battle.menu.changeSel') : t('battle.menu.run'), E.labelX, E.labelY, {
    size: E.fs,
    color: BTL.COLORS.textDim,
    direction: 'rtl',
  });

  // Selected move description — right of ESC area, truncated to fit one line
  if (menu.mode === 'moves') {
    const moveIdx = menu.movePage * 4 + menu.cursorIndex;
    const move = menu.moves[moveIdx];
    if (move) {
      const rtl = isRTL();
      const moveData = getMove(menu.isStruggleMode ? -1 : move.id);
      const rawDesc = rtl ? moveData?.description?.he : moveData?.description?.en;
      if (rawDesc) {
        const DESC_START = 60; // safe gap after ESC pill + label
        const DESC_END = 236; // 4px from right edge
        const MAX_W = DESC_END - DESC_START;
        const desc = truncateToFit(ctx, rawDesc, MAX_W, E.fs);
        drawText(ctx, desc, rtl ? DESC_END : DESC_START, E.labelY, {
          size: E.fs,
          color: BTL.COLORS.textMuted,
          align: rtl ? 'right' : 'left',
          direction: rtl ? 'rtl' : 'ltr',
        });
      }
    }
  }
}

// ─── Action Tabs (y=94) ───────────────────────────────────────────

function renderTabs(ctx: CanvasRenderingContext2D, menu: BattleMenuState): void {
  const TB = BTL.TABS_BG;
  fillRect(ctx, TB.x, TB.y, TB.w, TB.h, TB.color);
  // Bottom border
  fillRect(ctx, TB.x, TB.y + TB.h - 1, TB.w, 1, TB.borderColor);

  for (let i = 0; i < BTL.TABS.length; i++) {
    const tab = BTL.TABS[i];
    const isActive = i === menu.activeTab;

    if (isActive) {
      // Active tab underline
      fillRect(ctx, tab.x, TB.y + TB.h - 2, tab.w, 2, tab.color);
    }

    drawText(ctx, tab.text, tab.x + tab.w / 2, TB.y + BTL.TAB_TEXT_DY, {
      size: 6,
      color: isActive ? tab.color : BTL.TAB_INACTIVE_C,
      align: 'center',
    });

    // Number hint [1/2/3] — tight right of the label
    const hint = `[${i + 1}]`;
    drawText(ctx, hint, tab.x + tab.w / 2 + 10, TB.y + BTL.TAB_TEXT_DY, {
      size: 4,
      color: isActive ? tab.color + 'bb' : '#334433',
      align: 'left',
    });
  }
}

// ─── Move Grid (y=106, 2×2 paginated) ────────────────────────────

function renderMoveGrid(ctx: CanvasRenderingContext2D, menu: BattleMenuState): void {
  const pageStart = menu.movePage * 4;
  const totalMoves = menu.moves.length;
  const totalPages = Math.ceil(totalMoves / 4);

  for (let slotIdx = 0; slotIdx < 4; slotIdx++) {
    const moveIdx = pageStart + slotIdx;
    if (moveIdx >= totalMoves) {
      // Empty cell
      renderEmptyMoveCell(ctx, slotIdx);
      continue;
    }
    const move = menu.moves[moveIdx];
    const isSelected = slotIdx === menu.cursorIndex;
    const isDisabled = menu.disabledMoveIds.includes(move.id);
    renderMoveCell(
      ctx,
      slotIdx,
      move,
      isSelected,
      menu.battleHelperActive,
      menu.enemyTypes,
      menu.activeWeather,
      isDisabled,
      menu.isStruggleMode,
    );
  }

  // Page indicator (if more than 4 moves)
  if (totalPages > 1) {
    renderPageIndicator(ctx, menu.movePage, totalPages);
  }
}

function getEffectivenessLabel(mult: number, rtl: boolean): { text: string; color: string } {
  if (mult === 0) return { text: rtl ? 'x0 חסין' : 'x0 immune', color: '#888888' };
  if (mult <= 0.25) return { text: 'x0.25', color: '#d84040' };
  if (mult < 1) return { text: rtl ? 'לא יעיל' : 'x0.5 weak', color: '#f08030' };
  if (mult === 1) return { text: '', color: '' }; // neutral = no label
  if (mult < 4) return { text: rtl ? 'יעיל מאוד' : 'x2 super!', color: '#20d860' };
  return { text: rtl ? 'יעיל מאוד!' : 'x4 super!!', color: '#ffff40' };
}

function getWeatherColor(weather: string): string {
  if (weather === 'rain') return '#50a0e8';
  if (weather === 'sun') return '#f0a020';
  if (weather === 'sandstorm') return '#c09828';
  if (weather === 'hail') return '#70c8f0';
  return '#ffffff';
}

function getWeatherPowerMult(moveType: string, weather: string): number {
  if (weather === 'rain') {
    if (moveType === 'water' || moveType === 'electric') return 1.25;
    if (moveType === 'fire') return 0.75;
  } else if (weather === 'sun') {
    if (moveType === 'fire' || moveType === 'grass') return 1.25;
    if (moveType === 'water' || moveType === 'steel' || moveType === 'ice') return 0.75;
  } else if (weather === 'sandstorm') {
    if (moveType === 'water' || moveType === 'fire') return 0.75;
  } else if (weather === 'hail') {
    if (moveType === 'ice') return 1.25;
  }
  return 1;
}

function getWeatherAccPerfect(moveId: number, weather: string): boolean {
  if (weather === 'rain' && (moveId === 87 || moveId === 542)) return true; // Thunder, Hurricane
  if (weather === 'hail' && moveId === 59) return true; // Blizzard
  return false;
}

function renderMoveCell(
  ctx: CanvasRenderingContext2D,
  slotIdx: number,
  move: Move,
  isSelected: boolean,
  helperActive = false,
  enemyTypes: PokemonType[] = [],
  activeWeather: string | null = null,
  isDisabled = false,
  isStruggleMode = false,
): void {
  const M = BTL.MOVE;
  const cell = M.cells[slotIdx];
  const cx = cell.x,
    cy = cell.y;
  const cw = M.W,
    ch = M.H;

  // Cell background
  ctx.fillStyle = isSelected ? BTL.COLORS.cellBgSel : BTL.COLORS.cellBg;
  fillRoundRect(ctx, cx, cy, cw, ch, 2);
  ctx.strokeStyle = isSelected ? BTL.COLORS.cellBorderSel : BTL.COLORS.cellBorder;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, cx, cy, cw, ch, 2);

  // Selection bar (left edge)
  if (isSelected) {
    ctx.fillStyle = BTL.COLORS.selBar;
    fillRoundRect(ctx, cx, cy, M.SEL_BAR_W, ch, [1, 0, 0, 1]);
  }

  // Type badge (TOP-LEFT)
  const badge = TYPE_BADGE[move.type];
  if (badge) {
    ctx.fillStyle = badge.bg;
    fillRoundRect(ctx, cx + M.TYPE_DX, cy + M.TYPE_DY, M.TYPE_W, M.TYPE_H, 2);
    ctx.strokeStyle = badge.border;
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, cx + M.TYPE_DX, cy + M.TYPE_DY, M.TYPE_W, M.TYPE_H, 2);
    drawText(ctx, getTypeName(move.type), cx + M.TYPE_DX - 1 + M.TYPE_W / 2, cy + M.TYPE_DY + 1, {
      size: M.TYPE_FS,
      color: badge.color,
      align: 'center',
    });
  }

  // Fetch full move data once for class symbol + accuracy + helper
  const moveFullData = getMove(move.id);

  // Damage class symbol inside type rect (right-aligned): ⚔ physical, ◆ special, ☆ status
  if (badge) {
    const classSymbol =
      moveFullData?.damageClass === 'physical' ? '⚔' : moveFullData?.damageClass === 'special' ? '◆' : '☆';
    drawText(ctx, classSymbol, cx + M.TYPE_DX + M.TYPE_W - 1, cy + M.TYPE_DY + 1, {
      size: M.CLASS_FS,
      color: badge.color,
      align: 'right',
    });
  }

  // Move name (TOP-RIGHT)
  const moveName = getMoveDisplayName(isStruggleMode ? -1 : move.id);
  drawText(ctx, moveName, cx + cw - 4, cy + M.NAME_DY, {
    size: M.NAME_FS,
    color: isStruggleMode ? 'red' : BTL.COLORS.text,
    align: 'right',
    direction: 'rtl',
  });

  // Power (BOTTOM-LEFT) — always shown
  const rtl = isRTL();
  // Compute weather effects on this move
  const weatherMult = activeWeather && move.type ? getWeatherPowerMult(move.type, activeWeather) : 1;
  const weatherAccPerfect = activeWeather ? getWeatherAccPerfect(move.id, activeWeather) : false;
  const weatherColor = activeWeather ? getWeatherColor(activeWeather) : '#ffffff';

  const powerStr = move.power ? (rtl ? `כוח: ${move.power}` : `Pow: ${move.power}`) : rtl ? 'כוח: —' : 'Pow: —';
  drawText(ctx, powerStr, cx + M.POWER_DX, cy + M.POWER_DY, {
    size: M.POWER_FS,
    color: BTL.COLORS.textDark,
  });
  // Weather power multiplier badge (between power and accuracy)
  if (move.power && weatherMult !== 1) {
    const multStr = weatherMult > 1 ? `×${weatherMult}` : `×${weatherMult}`;
    drawText(ctx, multStr, cx + M.ACC_DX - 3, cy + M.POWER_DY, {
      size: 4,
      color: weatherColor,
      align: 'right',
    });
  }

  // Accuracy (BOTTOM, after power)
  const accVal = moveFullData?.accuracy;
  if (weatherAccPerfect) {
    const accStr = rtl ? 'דיוק: 100%★' : 'Acc:100%★';
    drawText(ctx, accStr, cx + M.ACC_DX, cy + M.ACC_DY, {
      size: M.ACC_FS,
      color: weatherColor,
    });
  } else {
    const accStr = accVal != null ? (rtl ? `דיוק: ${accVal}%` : `Acc: ${accVal}%`) : rtl ? 'דיוק: —' : 'Acc: —';
    drawText(ctx, accStr, cx + M.ACC_DX, cy + M.ACC_DY, {
      size: M.ACC_FS,
      color: BTL.COLORS.textDark,
    });
  }

  // Effectiveness label (below power, size 4) — only when helper active and not a status move
  if (helperActive && enemyTypes.length > 0 && move.type && moveFullData?.damageClass !== 'status') {
    const mult = getCombinedTypeEffectiveness(move.type as PokemonType, enemyTypes);
    const { text, color } = getEffectivenessLabel(mult, rtl);
    if (text) {
      drawText(ctx, text, cx + M.POWER_DX, cy + M.POWER_DY + 6, {
        size: 4,
        color,
      });
    }
  }

  // PP (BOTTOM-RIGHT)
  drawText(ctx, `${move.currentPp}/${move.pp}`, cx + cw - 4, cy + M.PP_DY, {
    size: M.PP_FS,
    color: BTL.COLORS.textMuted,
    align: 'right',
  });

  // 1px PP bar at bottom
  const ppBarX = cx + M.PP_BAR_DX;
  const ppBarY = cy + M.PP_BAR_DY;
  fillRect(ctx, ppBarX, ppBarY, M.PP_BAR_W, M.PP_BAR_H, BTL.COLORS.ppTrack);
  const ppRatio = move.pp > 0 ? move.currentPp / move.pp : 0;
  const ppFillW = Math.round(ppRatio * M.PP_BAR_W);
  if (ppFillW > 0) {
    fillRect(ctx, ppBarX, ppBarY, ppFillW, M.PP_BAR_H, BTL.COLORS.ppFill);
  }

  // Disabled overlay
  if (isDisabled) {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#000000';
    fillRoundRect(ctx, cx, cy, cw, ch, 2);
    ctx.restore();
    drawText(ctx, isRTL() ? 'מושבת' : 'DISABLED', cx + cw / 2, cy + ch / 2 - 1, {
      size: 5,
      color: '#ff4444',
      align: 'center',
    });
  }
}

function renderEmptyMoveCell(ctx: CanvasRenderingContext2D, slotIdx: number): void {
  const M = BTL.MOVE;
  const cell = M.cells[slotIdx];
  ctx.fillStyle = BTL.COLORS.cellBg;
  fillRoundRect(ctx, cell.x, cell.y, M.W, M.H, 2);
  ctx.strokeStyle = BTL.COLORS.cellBorder;
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, cell.x, cell.y, M.W, M.H, 2);

  drawText(ctx, '—', cell.x + M.W / 2, cell.y + 6, {
    size: 7,
    color: BTL.COLORS.textDark,
    align: 'center',
  });
}

function renderPageIndicator(ctx: CanvasRenderingContext2D, currentPage: number, totalPages: number): void {
  // Small dots at bottom-center of the grid area
  const dotSize = 2;
  const dotGap = 4;
  const totalW = totalPages * dotSize + (totalPages - 1) * dotGap;
  const startX = (SCREEN_W - totalW) / 2;
  const y = 159; // Bottom of screen (no bottom bar)

  for (let i = 0; i < totalPages; i++) {
    const dx = startX + i * (dotSize + dotGap);
    ctx.fillStyle = i === currentPage ? BTL.COLORS.selBar : BTL.COLORS.textDark;
    ctx.fillRect(dx, y, dotSize, dotSize);
  }
}

// ─── Switch Grid (3×2, y=106) ────────────────────────────────────

export function renderSwitchGrid(ctx: CanvasRenderingContext2D, party: Pokemon[], cursorIndex: number): void {
  const S = BTL.SWITCH;

  for (let i = 0; i < 6; i++) {
    const cell = S.cells[i];
    const pokemon = i < party.length ? party[i] : null;
    const isSelected = i === cursorIndex;

    // Slot background
    ctx.fillStyle = isSelected ? BTL.COLORS.cellBgSel : BTL.COLORS.cellBg;
    fillRoundRect(ctx, cell.x, cell.y, S.W, S.H, 2);
    ctx.strokeStyle = isSelected ? BTL.COLORS.cellBorderSel : BTL.COLORS.cellBorder;
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, cell.x, cell.y, S.W, S.H, 2);

    if (!pokemon) {
      // Empty slot
      drawText(ctx, '—', cell.x + S.W / 2, cell.y + 6, {
        size: 6,
        color: BTL.COLORS.textDark,
        align: 'center',
      });
      continue;
    }

    // Selection bar
    if (isSelected) {
      ctx.fillStyle = BTL.COLORS.selBar;
      fillRoundRect(ctx, cell.x, cell.y, 2, S.H, [1, 0, 0, 1]);
    }

    // Mini sprite
    const icon = getCachedImage(`/sprites/pokemon/icons/${pokemon.id}.png`);
    if (icon) {
      ctx.drawImage(icon, cell.x + S.SPRITE_DX, cell.y + S.SPRITE_DY, S.SPRITE_SZ, S.SPRITE_SZ);
    }

    // Name (right-aligned for RTL)
    const name = getPokemonDisplayName(pokemon.id);
    drawText(ctx, name, cell.x + S.NAME_DX, cell.y + S.NAME_DY, {
      size: S.NAME_FS,
      color: BTL.COLORS.text,
      align: 'right',
      direction: 'rtl',
    });

    // Fainted overlay
    if (pokemon.hp <= 0) {
      drawText(ctx, 'מתעלף', cell.x + S.W / 2, cell.y + 8, {
        size: 6,
        color: '#d84040',
        align: 'center',
        direction: 'rtl',
      });
    } else {
      // HP bar
      const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
      fillRect(ctx, cell.x + S.HP_DX, cell.y + S.HP_DY, S.HP_W, S.HP_H, BTL.COLORS.hpTrack);
      const fillW = Math.round(hpRatio * S.HP_W);
      if (fillW > 0) {
        fillRect(ctx, cell.x + S.HP_DX, cell.y + S.HP_DY, fillW, S.HP_H, getHpColor(hpRatio));
      }
    }
  }
}

// ─── Party Ball Indicators ───────────────────────────────────────

export function renderPartyBalls(
  ctx: CanvasRenderingContext2D,
  side: 'player' | 'opponent',
  party: { hp: number }[],
  totalSlots: number,
  revealedCount?: number,
  layout?: { x: number; y: number; align?: 'left' | 'right' },
): void {
  const count = Math.min(totalSlots, 6);
  const size = BTL.BALL_SIZE;
  const rowWidth = count > 0 ? size + (count - 1) * BTL.BALL_GAP : 0;
  const startX = layout
    ? layout.align === 'right'
      ? layout.x - rowWidth
      : layout.x
    : side === 'player'
      ? BTL.PLY_BALLS_X0
      : BTL.OPP_BALLS_X0;
  const y = layout?.y ?? BTL.BALL_Y;

  for (let i = 0; i < count; i++) {
    const x = startX + i * BTL.BALL_GAP;
    let fillColor: string, borderColor: string;

    if (i >= party.length) {
      fillColor = BTL.BALL_EMPTY.fill;
      borderColor = BTL.BALL_EMPTY.border;
    } else if (side === 'opponent' && revealedCount !== undefined && i >= revealedCount) {
      fillColor = BTL.BALL_EMPTY.fill;
      borderColor = BTL.BALL_EMPTY.border;
    } else if (party[i].hp > 0) {
      fillColor = BTL.BALL_ALIVE.fill;
      borderColor = BTL.BALL_ALIVE.border;
    } else {
      fillColor = BTL.BALL_FAINTED.fill;
      borderColor = BTL.BALL_FAINTED.border;
    }

    // Draw as small rounded rect (pixel-art ball)
    ctx.fillStyle = fillColor;
    fillRoundRect(ctx, x, y, size, size, 2);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, x, y, size, size, 2);
  }
}
