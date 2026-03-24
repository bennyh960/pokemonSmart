/**
 * PartyScene - Pokemon party management screen with tabbed detail view.
 *
 * Main list: 6 slots with sprites, names, levels, HP bars, type badges.
 * Detail view has 3 tabs: STATS, MOVES, INFO (navigated with Left/Right).
 * Supports overworld, battle, and select-target modes.
 */

import type { Scene, Pokemon } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawText, drawRect } from '../engine/renderer.js';
import { t } from '../i18n/i18n.js';
import { getPokemonDisplayName, getMoveDisplayName, getMove } from '../services/pokemon-data.js';
import { getPlayerData } from '../systems/game-state.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
import { TYPE_COLORS } from '../data/type-constants.js';
import { drawTypeBadge } from '../ui/type-badge.js';

/* ── Constants ─────────────────────────────────────────────────────── */

const MAX_PARTY = 6;
const SLOT_HEIGHT = 22;
const SLOT_START_Y = 16;
const SLOT_X = 4;
const SLOT_W = SCREEN_W - 8;

/** Stat bar max value (used to scale bars). */
const STAT_BAR_MAX = 200;

/* ── Color palette ─────────────────────────────────────────────────── */

const COL_BG = '#181830';
const COL_PANEL = '#202040';
const COL_SELECTED = '#303060';
const COL_ACCENT = '#f8d030';
const COL_TEXT = '#ffffff';
const COL_TEXT_DIM = '#666688';
const COL_TEXT_LIGHT = '#ccccee';
const COL_TEXT_BLUE = '#aaccff';
const COL_TAB_INACTIVE = '#404060';
const COL_TAB_ACTIVE = '#505080';

/* ── Mode system ───────────────────────────────────────────────────── */

type PartyMode = 'overworld' | 'battle' | 'select-target';
let partyMode: PartyMode = 'overworld';
let onSelectCallback: ((index: number) => void) | null = null;

/** Index of the Pokemon selected in battle/select-target mode (-1 = none). */
export let selectedPartyIndex: number = -1;

export function setPartyMode(mode: PartyMode, callback?: (index: number) => void): void {
  partyMode = mode;
  onSelectCallback = callback ?? null;
  selectedPartyIndex = -1;
}

export function clearSelectedPartyIndex(): void {
  selectedPartyIndex = -1;
}

/* ── Scene state types ─────────────────────────────────────────────── */

type ListMode = 'list' | 'swap';
type DetailTab = 0 | 1 | 2; // 0=STATS, 1=MOVES, 2=INFO
type MoveAction = 'none' | 'menu' | 'swap-select' | 'delete-confirm';

const TAB_LABELS = ['STATS', 'MOVES', 'INFO'];

/* ── Scene factory ─────────────────────────────────────────────────── */

export function createPartyScene(input: InputManager, stateMachine: StateMachine): Scene {
  /* List state */
  let cursor = 0;
  let listMode: ListMode = 'list';
  let swapFrom = -1;

  /* Detail state */
  let inDetail = false;
  let detailTab: DetailTab = 0;

  /* Moves sub-screen state */
  let moveCursor = 0;
  let moveAction: MoveAction = 'none';
  let moveActionCursor = 0; // 0=SWAP, 1=DELETE, 2=CANCEL
  let moveSwapFrom = -1;

  function getParty(): Pokemon[] {
    return getPlayerData().party;
  }

  function loadPartySprites(): void {
    const party = getParty();
    for (const pokemon of party) {
      const frontUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
      const iconUrl = `/sprites/pokemon/icons/${pokemon.id}.png`;
      if (!getCachedImage(frontUrl)) loadImage(frontUrl).catch(() => {});
      if (!getCachedImage(iconUrl)) loadImage(iconUrl).catch(() => {});
    }
  }

  function getHpColor(ratio: number): string {
    if (ratio > 0.5) return '#20d860';
    if (ratio > 0.2) return '#f8c030';
    return '#f84038';
  }

  function getStatColor(value: number): string {
    if (value >= 150) return '#f84038';
    if (value >= 120) return '#f8a030';
    if (value >= 90) return COL_ACCENT;
    if (value >= 60) return '#20d860';
    if (value >= 30) return '#6890f0';
    return '#a8a8c0';
  }

  /* ── Render: list slot ───────────────────────────────────────────── */

  function renderSlot(ctx: CanvasRenderingContext2D, pokemon: Pokemon | null, index: number, isSelected: boolean, isSwapSource: boolean): void {
    const y = SLOT_START_Y + index * SLOT_HEIGHT;
    const bgColor = isSelected ? COL_SELECTED : COL_PANEL;

    fillRect(ctx, SLOT_X, y, SLOT_W, SLOT_HEIGHT - 2, bgColor);

    if (isSelected) {
      drawRect(ctx, SLOT_X, y, SLOT_W, SLOT_HEIGHT - 2, COL_ACCENT, 1);
    }
    if (isSwapSource) {
      drawRect(ctx, SLOT_X, y, SLOT_W, SLOT_HEIGHT - 2, '#f8c030', 1);
    }

    if (!pokemon) {
      drawText(ctx, t('party.empty'), SLOT_X + 28, y + 7, { size: 8, color: COL_TEXT_DIM });
      return;
    }

    // Sprite
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sprite, SLOT_X - 8, y - 10, 40, 40);
      ctx.imageSmoothingEnabled = false;
    } else {
      fillRect(ctx, SLOT_X + 2, y + 1, 18, 18, '#445566');
    }

    // Name + Level
    const nameText = `${getPokemonDisplayName(pokemon.id)} Lv.${pokemon.level}`;
    drawText(ctx, nameText, SLOT_X + 24, y + 1, { size: 8, color: COL_TEXT });

    // HP bar
    const hpBarX = SLOT_X + 24;
    const hpBarY = y + 11;
    const hpBarW = 60;
    const hpBarH = 3;
    fillRect(ctx, hpBarX, hpBarY, hpBarW, hpBarH, '#303030');
    const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
    const hpFillW = Math.floor(hpBarW * Math.max(0, Math.min(1, hpRatio)));
    if (hpFillW > 0) {
      fillRect(ctx, hpBarX, hpBarY, hpFillW, hpBarH, getHpColor(hpRatio));
    }

    // HP numbers
    drawText(ctx, `${pokemon.hp}/${pokemon.maxHp}`, hpBarX + hpBarW + 2, hpBarY - 2, { size: 7, color: '#aaaacc' });

    // Type badges (localized, short mode for list)
    let typeX = SLOT_X + 160;
    for (const pType of pokemon.types) {
      const badgeW = drawTypeBadge(ctx, pType, typeX, y + 2, 'short');
      typeX += badgeW + 2;
    }
  }

  /* ── Render: list view ───────────────────────────────────────────── */

  function renderListView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();

    // Title
    const title = listMode === 'swap' ? t('party.swap') : t('party.title');
    drawText(ctx, title, SCREEN_W / 2, 3, { size: 8, color: COL_TEXT, align: 'center' });

    // Slots
    for (let i = 0; i < MAX_PARTY; i++) {
      const pokemon = i < party.length ? party[i] : null;
      renderSlot(ctx, pokemon, i, i === cursor, listMode === 'swap' && i === swapFrom);
    }

    // Bottom hint bar
    let hint = '';
    if (listMode === 'swap') {
      hint = t('party.hint.swapMode');
    } else if (partyMode === 'battle') {
      hint = t('party.hint.battle');
    } else if (partyMode === 'select-target') {
      hint = t('party.hint.selectTarget');
    } else {
      hint = t('party.hint.overworld');
    }
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, COL_PANEL);
    drawText(ctx, hint, SLOT_X, SCREEN_H - 12, { size: 7, color: COL_TEXT_DIM });
  }

  /* ── Render: tab bar ─────────────────────────────────────────────── */

  function renderTabBar(ctx: CanvasRenderingContext2D): void {
    const tabW = Math.floor(SCREEN_W / 3);
    for (let i = 0; i < 3; i++) {
      const x = i * tabW;
      const isActive = i === detailTab;
      fillRect(ctx, x, 0, tabW, 12, isActive ? COL_TAB_ACTIVE : COL_TAB_INACTIVE);
      if (isActive) {
        fillRect(ctx, x, 10, tabW, 2, COL_ACCENT);
      }
      drawText(ctx, TAB_LABELS[i], x + tabW / 2, 2, {
        size: 7,
        color: isActive ? COL_ACCENT : COL_TEXT_DIM,
        align: 'center',
      });
    }
  }

  /* ── Render: STATS tab ───────────────────────────────────────────── */

  function renderStatsTab(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    const topY = 14;

    // Large sprite
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, 4, topY, 64, 64);
    } else {
      fillRect(ctx, 4, topY, 64, 64, '#445566');
    }

    // Name + Level
    drawText(ctx, `${getPokemonDisplayName(pokemon.id)}  Lv.${pokemon.level}`, 72, topY + 2, { size: 8, color: COL_TEXT });

    // Types (localized, full mode for detail)
    let typeX = 72;
    for (const pType of pokemon.types) {
      const badgeW = drawTypeBadge(ctx, pType, typeX, topY + 14, 'full');
      typeX += badgeW + 2;
    }

    // Stats with colored bars
    const statsX = 72;
    let statsY = topY + 28;
    const barMaxW = 80;
    const statEntries: [string, number][] = [
      [t('party.stats.hp'), pokemon.maxHp],
      [t('party.stats.attack'), pokemon.attack],
      [t('party.stats.defense'), pokemon.defense],
      [t('party.stats.spAtk'), pokemon.specialAttack],
      [t('party.stats.spDef'), pokemon.specialDefense],
      [t('party.stats.speed'), pokemon.speed],
    ];

    for (const [label, value] of statEntries) {
      drawText(ctx, `${label}`, statsX, statsY, { size: 7, color: COL_TEXT_LIGHT });
      drawText(ctx, `${value}`, statsX + 50, statsY, { size: 7, color: COL_TEXT });

      // Stat bar
      const barY = statsY + 8;
      const barW = Math.floor(barMaxW * Math.min(1, value / STAT_BAR_MAX));
      fillRect(ctx, statsX, barY, barMaxW, 2, '#303030');
      if (barW > 0) {
        fillRect(ctx, statsX, barY, barW, 2, getStatColor(value));
      }
      statsY += 14;
    }

    // HP bar (bottom left)
    const hpY = topY + 68;
    drawText(ctx, `${t('party.stats.hp')}: ${pokemon.hp}/${pokemon.maxHp}`, 4, hpY, { size: 7, color: COL_TEXT_BLUE });
    fillRect(ctx, 4, hpY + 10, 60, 3, '#303030');
    const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
    const hpFillW = Math.floor(60 * Math.max(0, Math.min(1, hpRatio)));
    if (hpFillW > 0) {
      fillRect(ctx, 4, hpY + 10, hpFillW, 3, getHpColor(hpRatio));
    }

    // XP bar
    const xpY = hpY + 18;
    const xpText = t('party.xp', { current: pokemon.xp, next: pokemon.xpToNext });
    drawText(ctx, xpText, 4, xpY, { size: 7, color: '#88aaff' });
    fillRect(ctx, 4, xpY + 10, 60, 3, '#303030');
    const xpRatio = pokemon.xpToNext > 0 ? pokemon.xp / pokemon.xpToNext : 0;
    const xpFillW = Math.floor(60 * Math.max(0, Math.min(1, xpRatio)));
    if (xpFillW > 0) {
      fillRect(ctx, 4, xpY + 10, xpFillW, 3, '#5080ff');
    }

    // Hint
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, COL_PANEL);
    drawText(ctx, t('party.hint.detailNav'), SLOT_X, SCREEN_H - 12, { size: 7, color: COL_TEXT_DIM });
  }

  /* ── Render: MOVES tab ───────────────────────────────────────────── */

  function renderMovesTab(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    const topY = 14;
    const moves = pokemon.moves;

    drawText(ctx, t('party.moves.battleMoves'), 4, topY + 2, { size: 8, color: COL_TEXT });

    // Move list
    const listY = topY + 14;
    const rowH = 14;
    const maxVisible = 8;

    for (let i = 0; i < Math.min(moves.length, maxVisible); i++) {
      const move = moves[i];
      const y = listY + i * rowH;
      const isSelected = i === moveCursor;

      // Background
      if (isSelected) {
        fillRect(ctx, 2, y, SCREEN_W - 4, rowH - 1, COL_SELECTED);
        drawRect(ctx, 2, y, SCREEN_W - 4, rowH - 1, COL_ACCENT, 1);
      }

      // Swap-from highlight
      if (moveAction === 'swap-select' && i === moveSwapFrom) {
        drawRect(ctx, 2, y, SCREEN_W - 4, rowH - 1, '#f8c030', 1);
      }

      // Type color bar
      const moveColor = TYPE_COLORS[move.type] || '#888888';
      fillRect(ctx, 4, y + 2, 4, rowH - 5, moveColor);

      // Move name
      drawText(ctx, getMoveDisplayName(move.id), 12, y + 1, { size: 7, color: '#ddddff' });

      // Power
      const moveData = getMove(move.id);
      const power = moveData?.power ?? move.power;
      const powerText = power && power > 0 ? `${power}` : '\u2014';
      drawText(ctx, `POW:${powerText}`, 120, y + 1, { size: 7, color: '#aaaacc' });

      // PP
      drawText(ctx, `PP ${move.currentPp}/${move.pp}`, 170, y + 1, { size: 7, color: '#aaaacc' });

      // Type badge (small)
      const badgeX = 210;
      fillRect(ctx, badgeX, y + 2, 22, 8, moveColor);
      drawText(ctx, move.type.toUpperCase().slice(0, 4), badgeX + 1, y + 2, { size: 6, color: COL_TEXT });
    }

    if (moves.length === 0) {
      drawText(ctx, t('party.moves.noMoves'), 4, listY + 4, { size: 7, color: COL_TEXT_DIM });
    }

    // Bottom area: description or action menu
    const bottomY = SCREEN_H - 30;
    fillRect(ctx, 0, bottomY, SCREEN_W, 30, COL_PANEL);

    if (moveAction === 'menu') {
      // Action menu: SWAP / DELETE / CANCEL
      const opts = [t('party.moves.swap'), t('party.moves.delete'), t('party.moves.cancel')];
      for (let i = 0; i < opts.length; i++) {
        const x = 8 + i * 70;
        const isActive = i === moveActionCursor;
        if (isActive) {
          fillRect(ctx, x - 2, bottomY + 2, 64, 12, COL_SELECTED);
          drawRect(ctx, x - 2, bottomY + 2, 64, 12, COL_ACCENT, 1);
        }
        drawText(ctx, opts[i], x, bottomY + 4, { size: 7, color: isActive ? COL_ACCENT : COL_TEXT_LIGHT });
      }
    } else if (moveAction === 'delete-confirm') {
      // Delete confirmation
      const moveName = getMoveDisplayName(moves[moveCursor].id);
      drawText(ctx, t('party.moves.forgetConfirm', { move: moveName }), 4, bottomY + 2, { size: 7, color: COL_TEXT });
      const yesNo = [t('npc.choice.yes'), t('npc.choice.no')];
      for (let i = 0; i < 2; i++) {
        const x = 8 + i * 50;
        const isActive = i === moveActionCursor;
        if (isActive) {
          fillRect(ctx, x - 2, bottomY + 14, 40, 12, COL_SELECTED);
          drawRect(ctx, x - 2, bottomY + 14, 40, 12, COL_ACCENT, 1);
        }
        drawText(ctx, yesNo[i], x, bottomY + 16, { size: 7, color: isActive ? COL_ACCENT : COL_TEXT_LIGHT });
      }
    } else if (moveAction === 'swap-select') {
      drawText(ctx, t('party.moves.swapSelect'), 4, bottomY + 4, { size: 7, color: COL_ACCENT });
    } else {
      // Show move description / hint
      if (moves.length > 0 && moveCursor < moves.length) {
        const selMove = moves[moveCursor];
        const moveData = getMove(selMove.id);
        const typeLabel = selMove.type.charAt(0).toUpperCase() + selMove.type.slice(1);
        const acc = moveData?.accuracy ?? selMove.accuracy;
        const accText = acc ? `${acc}%` : '\u2014';
        drawText(ctx, `${typeLabel} | Acc: ${accText}`, 4, bottomY + 2, { size: 7, color: COL_TEXT_LIGHT });
      }
      drawText(ctx, t('party.hint.moves'), 4, bottomY + 14, { size: 7, color: COL_TEXT_DIM });
    }
  }

  /* ── Render: INFO tab ────────────────────────────────────────────── */

  function renderInfoTab(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    const topY = 14;

    // Large sprite
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, SCREEN_W / 2 - 32, topY + 4, 64, 64);
    } else {
      fillRect(ctx, SCREEN_W / 2 - 32, topY + 4, 64, 64, '#445566');
    }

    // Name centered
    drawText(ctx, getPokemonDisplayName(pokemon.id), SCREEN_W / 2, topY + 72, { size: 8, color: COL_TEXT, align: 'center' });

    // Types
    const typesStr = pokemon.types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' / ');
    drawText(ctx, typesStr, SCREEN_W / 2, topY + 84, { size: 7, color: COL_TEXT_LIGHT, align: 'center' });

    // Number
    drawText(ctx, `#${String(pokemon.id).padStart(3, '0')}`, SCREEN_W / 2, topY + 96, { size: 7, color: COL_TEXT_DIM, align: 'center' });

    // Level + HP summary
    drawText(ctx, `Lv.${pokemon.level}  HP: ${pokemon.hp}/${pokemon.maxHp}`, SCREEN_W / 2, topY + 108, { size: 7, color: COL_TEXT_BLUE, align: 'center' });

    // Pokedex prompt
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, COL_PANEL);
    drawText(ctx, t('party.info.pokedexHint'), SLOT_X, SCREEN_H - 12, { size: 7, color: COL_ACCENT });
  }

  /* ── Render: detail view ─────────────────────────────────────────── */

  function renderDetailView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();
    const pokemon = party[cursor];
    if (!pokemon) return;

    renderTabBar(ctx);

    if (detailTab === 0) {
      renderStatsTab(ctx, pokemon);
    } else if (detailTab === 1) {
      renderMovesTab(ctx, pokemon);
    } else {
      renderInfoTab(ctx, pokemon);
    }
  }

  /* ── Update: moves sub-screen ────────────────────────────────────── */

  function updateMovesTab(): void {
    const party = getParty();
    const pokemon = party[cursor];
    if (!pokemon) return;
    const moves = pokemon.moves;

    if (moveAction === 'menu') {
      // Action menu navigation
      if (input.isKeyPressed('ArrowLeft')) {
        moveActionCursor = moveActionCursor > 0 ? moveActionCursor - 1 : 2;
      }
      if (input.isKeyPressed('ArrowRight')) {
        moveActionCursor = moveActionCursor < 2 ? moveActionCursor + 1 : 0;
      }
      if (input.isKeyPressed('Escape')) {
        moveAction = 'none';
      }
      if (input.isKeyPressed('Enter')) {
        if (moveActionCursor === 0) {
          // SWAP
          moveAction = 'swap-select';
          moveSwapFrom = moveCursor;
        } else if (moveActionCursor === 1) {
          // DELETE
          if (moves.length <= 1) {
            // Can't delete last move
            moveAction = 'none';
          } else {
            moveAction = 'delete-confirm';
            moveActionCursor = 1; // default to No
          }
        } else {
          // CANCEL
          moveAction = 'none';
        }
      }
      return;
    }

    if (moveAction === 'delete-confirm') {
      if (input.isKeyPressed('ArrowLeft')) {
        moveActionCursor = 0;
      }
      if (input.isKeyPressed('ArrowRight')) {
        moveActionCursor = 1;
      }
      if (input.isKeyPressed('Escape')) {
        moveAction = 'none';
      }
      if (input.isKeyPressed('Enter')) {
        if (moveActionCursor === 0) {
          // Yes — delete
          moves.splice(moveCursor, 1);
          if (moveCursor >= moves.length) moveCursor = Math.max(0, moves.length - 1);
        }
        moveAction = 'none';
      }
      return;
    }

    if (moveAction === 'swap-select') {
      if (input.isKeyPressed('ArrowUp')) {
        moveCursor = moveCursor > 0 ? moveCursor - 1 : moves.length - 1;
      }
      if (input.isKeyPressed('ArrowDown')) {
        moveCursor = moveCursor < moves.length - 1 ? moveCursor + 1 : 0;
      }
      if (input.isKeyPressed('Escape')) {
        moveAction = 'none';
        moveSwapFrom = -1;
      }
      if (input.isKeyPressed('Enter')) {
        // Complete swap
        if (moveSwapFrom >= 0 && moveSwapFrom < moves.length && moveCursor !== moveSwapFrom) {
          const temp = moves[moveSwapFrom];
          moves[moveSwapFrom] = moves[moveCursor];
          moves[moveCursor] = temp;
        }
        moveAction = 'none';
        moveSwapFrom = -1;
      }
      return;
    }

    // Normal move browsing
    if (input.isKeyPressed('ArrowUp')) {
      moveCursor = moveCursor > 0 ? moveCursor - 1 : Math.max(0, moves.length - 1);
    }
    if (input.isKeyPressed('ArrowDown')) {
      moveCursor = moveCursor < moves.length - 1 ? moveCursor + 1 : 0;
    }
    if (input.isKeyPressed('Enter') && moves.length > 0) {
      moveAction = 'menu';
      moveActionCursor = 0;
    }
    // D shortcut for delete
    if ((input.isKeyPressed('d') || input.isKeyPressed('D')) && moves.length > 1) {
      moveAction = 'delete-confirm';
      moveActionCursor = 1; // default No
    }
  }

  /* ── Update: detail view ─────────────────────────────────────────── */

  function updateDetailView(): void {
    // Only handle tab switching when not in a move action sub-menu
    if (detailTab !== 1 || moveAction === 'none') {
      if (input.isKeyPressed('ArrowLeft')) {
        if (detailTab === 1) {
          // Reset moves state when leaving tab
          moveCursor = 0;
          moveAction = 'none';
          moveSwapFrom = -1;
        }
        detailTab = (detailTab > 0 ? detailTab - 1 : 2) as DetailTab;
        if (detailTab === 1) moveCursor = 0;
      }
      if (input.isKeyPressed('ArrowRight')) {
        if (detailTab === 1) {
          moveCursor = 0;
          moveAction = 'none';
          moveSwapFrom = -1;
        }
        detailTab = (detailTab < 2 ? detailTab + 1 : 0) as DetailTab;
        if (detailTab === 1) moveCursor = 0;
      }
    }

    if (input.isKeyPressed('Escape')) {
      if (detailTab === 1 && moveAction !== 'none') {
        // Escape from move sub-action goes back to move list
        moveAction = 'none';
        moveSwapFrom = -1;
        return;
      }
      // Back to list
      inDetail = false;
      detailTab = 0;
      moveCursor = 0;
      moveAction = 'none';
      moveSwapFrom = -1;
      return;
    }

    if (detailTab === 1) {
      updateMovesTab();
      return;
    }

    if (detailTab === 2) {
      // INFO tab: Enter opens Pokedex
      if (input.isKeyPressed('Enter')) {
        stateMachine.push('POKEDEX');
      }
      return;
    }

    // STATS tab has no interactive elements beyond tab switching
  }

  /* ── Scene object ────────────────────────────────────────────────── */

  return {
    enter(): void {
      cursor = 0;
      listMode = 'list';
      swapFrom = -1;
      inDetail = false;
      detailTab = 0;
      moveCursor = 0;
      moveAction = 'none';
      moveSwapFrom = -1;
      loadPartySprites();
    },

    exit(): void {},

    update(_dt: number): void {
      const party = getParty();
      const partyLen = party.length;

      /* Detail view input */
      if (inDetail) {
        updateDetailView();
        return;
      }

      /* List / swap mode input */

      if (input.isKeyPressed('Escape')) {
        if (listMode === 'swap') {
          listMode = 'list';
          swapFrom = -1;
        } else {
          stateMachine.pop();
        }
        return;
      }

      if (input.isKeyPressed('ArrowUp')) {
        cursor = cursor > 0 ? cursor - 1 : Math.max(0, partyLen - 1);
      }
      if (input.isKeyPressed('ArrowDown')) {
        cursor = cursor < partyLen - 1 ? cursor + 1 : 0;
      }

      if (input.isKeyPressed('Enter')) {
        if (partyLen === 0 || cursor >= partyLen) return;

        if (listMode === 'swap') {
          // Complete party swap
          if (swapFrom !== cursor && swapFrom >= 0 && swapFrom < partyLen) {
            const temp = party[swapFrom];
            party[swapFrom] = party[cursor];
            party[cursor] = temp;
          }
          listMode = 'list';
          swapFrom = -1;
        } else if (partyMode === 'overworld') {
          // Open detail sub-screen
          inDetail = true;
          detailTab = 0;
          moveCursor = 0;
          moveAction = 'none';
        } else if (partyMode === 'battle') {
          // Select Pokemon for battle switch
          selectedPartyIndex = cursor;
          stateMachine.pop();
        } else if (partyMode === 'select-target') {
          // Select Pokemon for item use
          if (onSelectCallback) {
            onSelectCallback(cursor);
          }
          stateMachine.pop();
        }
      }

      // S key to start swap mode
      if (input.isKeyPressed('s') || input.isKeyPressed('S')) {
        if (partyLen > 1 && cursor < partyLen) {
          if (listMode === 'list') {
            listMode = 'swap';
            swapFrom = cursor;
          }
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, COL_BG);

      if (inDetail) {
        renderDetailView(ctx);
      } else {
        renderListView(ctx);
      }
    },
  };
}
