/**
 * BattleMenu - 2x2 action menu and move selection.
 *
 * Main menu: FIGHT / BAG / POKEMON / RUN in a 2x2 grid.
 * Move menu: Shows 4 moves with name, type, PP. Arrow navigation + ENTER.
 */

import type { InputManager } from '../engine/input.js';
import type { Move, PokemonType } from '../types/index.js';
import { fillRect, drawText, drawRect } from '../engine/renderer.js';
import { t, isRTL } from '../i18n/i18n.js';

const SCREEN_W = 240;
const SCREEN_H = 160;
const MENU_Y = SCREEN_H - 40;
const MENU_H = 40;

/** Type color map for move display. */
const TYPE_COLORS: Record<PokemonType, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  glitch: '#00ff88',
};

export type MainMenuChoice = 'FIGHT' | 'BAG' | 'POKEMON' | 'RUN';

interface BattleMenuState {
  mode: 'main' | 'moves';
  cursorIndex: number;
  moves: Move[];
}

const MAIN_LABELS: MainMenuChoice[] = ['FIGHT', 'BAG', 'POKEMON', 'RUN'];

export function createBattleMenu(moves: Move[]): BattleMenuState {
  return { mode: 'main', cursorIndex: 0, moves };
}

/** Show main action menu. */
export function showMainMenu(menu: BattleMenuState): void {
  menu.mode = 'main';
  menu.cursorIndex = 0;
}

/** Show move selection menu. */
export function showMoveMenu(menu: BattleMenuState): void {
  menu.mode = 'moves';
  menu.cursorIndex = 0;
}

/**
 * Update menu navigation. Returns the selection or null.
 * For main: returns MainMenuChoice.
 * For moves: returns the Move index (0-3) or -1 for back.
 */
export function updateBattleMenu(
  menu: BattleMenuState,
  input: InputManager,
): { type: 'main'; choice: MainMenuChoice } | { type: 'move'; index: number } | null {
  const maxIndex = menu.mode === 'main' ? 4 : menu.moves.length;

  // Arrow navigation (2x2 grid)
  if (input.isKeyPressed('ArrowRight')) {
    if (menu.cursorIndex % 2 === 0 && menu.cursorIndex + 1 < maxIndex) menu.cursorIndex++;
  }
  if (input.isKeyPressed('ArrowLeft')) {
    if (menu.cursorIndex % 2 === 1) menu.cursorIndex--;
  }
  if (input.isKeyPressed('ArrowDown')) {
    if (menu.cursorIndex + 2 < maxIndex) menu.cursorIndex += 2;
  }
  if (input.isKeyPressed('ArrowUp')) {
    if (menu.cursorIndex - 2 >= 0) menu.cursorIndex -= 2;
  }

  // Select
  if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
    if (menu.mode === 'main') {
      return { type: 'main', choice: MAIN_LABELS[menu.cursorIndex] };
    } else {
      return { type: 'move', index: menu.cursorIndex };
    }
  }

  // Back from moves
  if (menu.mode === 'moves' && (input.isKeyPressed('Escape') || input.isKeyPressed('Backspace'))) {
    return { type: 'move', index: -1 };
  }

  return null;
}

/** Render the battle menu. */
export function renderBattleMenu(ctx: CanvasRenderingContext2D, menu: BattleMenuState): void {
  // Background
  fillRect(ctx, 0, MENU_Y, SCREEN_W, MENU_H, '#181820');
  drawRect(ctx, 0, MENU_Y, SCREEN_W, MENU_H, '#585858');

  if (menu.mode === 'main') {
    renderMainMenu(ctx, menu.cursorIndex);
  } else {
    renderMoveMenu(ctx, menu);
  }
}

/** Translation keys for main menu labels. */
const MAIN_LABEL_KEYS: Record<MainMenuChoice, string> = {
  FIGHT: 'battle.menu.fight',
  BAG: 'battle.menu.bag',
  POKEMON: 'battle.menu.pokemon',
  RUN: 'battle.menu.run',
};

function renderMainMenu(ctx: CanvasRenderingContext2D, cursor: number): void {
  const rtl = isRTL();
  const startX = SCREEN_W - 110;
  const colW = 52;
  const rowH = 16;

  // "What will you do?" prompt
  const promptX = rtl ? SCREEN_W - 8 : 8;
  const promptAlign = rtl ? 'right' as const : 'left' as const;
  const promptDir = rtl ? 'rtl' as const : 'ltr' as const;
  drawText(ctx, t('battle.menu.whatWillYouDo1'), promptX, MENU_Y + 8, { size: 8, color: '#ffffff', align: promptAlign, direction: promptDir });
  drawText(ctx, t('battle.menu.whatWillYouDo2'), promptX, MENU_Y + 20, { size: 8, color: '#ffffff', align: promptAlign, direction: promptDir });

  // Menu box on right
  fillRect(ctx, startX - 4, MENU_Y + 2, 114, 36, '#202030');
  drawRect(ctx, startX - 4, MENU_Y + 2, 114, 36, '#585858');

  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + col * colW;
    const y = MENU_Y + 6 + row * rowH;

    const selected = i === cursor;
    if (selected) {
      drawText(ctx, '\u25b6', x, y, { size: 8, color: '#ffffff' });
    }
    drawText(ctx, t(MAIN_LABEL_KEYS[MAIN_LABELS[i]]), x + 10, y, {
      size: 8,
      color: selected ? '#f8f8f8' : '#a0a0a0',
    });
  }
}

function renderMoveMenu(ctx: CanvasRenderingContext2D, menu: BattleMenuState): void {
  const colW = 118;
  const rowH = 10;
  const maxVisible = 8; // Show up to 8 moves in 2 columns × 4 rows

  // Scroll offset: keep cursor visible within the grid
  const visibleCount = Math.min(menu.moves.length, maxVisible);

  for (let i = 0; i < visibleCount; i++) {
    const move = menu.moves[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 4 + col * colW;
    const y = MENU_Y + 2 + row * rowH;

    const selected = i === menu.cursorIndex;

    if (selected) {
      drawText(ctx, '\u25b6', x, y, { size: 8, color: '#ffffff' });
    }

    // Move name + type color dot
    const typeColor = TYPE_COLORS[move.type] || '#a8a878';
    fillRect(ctx, x + 10, y + 2, 4, 4, typeColor);
    drawText(ctx, move.name.toUpperCase(), x + 16, y, {
      size: 8,
      color: selected ? '#f8f8f8' : '#a0a0a0',
    });

    // PP on the right
    drawText(ctx, `${move.currentPp}/${move.pp}`, x + colW - 8, y, {
      size: 8,
      color: '#c0c0c0',
      align: 'right',
    });
  }
}
