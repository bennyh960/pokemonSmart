/**
 * PartyScene - Pokemon party management screen.
 *
 * Shows up to 6 Pokemon in a vertical list with sprites, names, levels, HP bars, and type badges.
 * Enter opens detail view with STATS and MOVES sub-screens.
 * Moves sub-screen has a proper table with columns, move swap, and delete.
 * Swap mode lets reorder party. P key from overworld pushes this scene; Escape pops back.
 */

import type { Scene, Pokemon, PokemonType } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawText, drawRect } from '../engine/renderer.js';
import { t } from '../i18n/i18n.js';
import { getPokemonDisplayName, getMoveDisplayName, getMove, getPokemonHeight, getPokemonWeight } from '../services/pokemon-data.js';
import { getDamageClassLabel } from '../data/type-constants.js';
import { getPlayerData } from '../systems/game-state.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';

const MAX_PARTY = 6;
const SLOT_HEIGHT = 22;
const SLOT_START_Y = 16;
const SLOT_X = 4;
const SLOT_W = SCREEN_W - 8;

/** Type badge color palette. */
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
  glitch: '#ff00ff',
};

/** 3-letter English abbreviation for each type (always English, not localized). */
const TYPE_ABBREV: Record<string, string> = {
  normal: 'NRM', fire: 'FIR', water: 'WTR', grass: 'GRS',
  electric: 'ELC', ice: 'ICE', fighting: 'FGT', poison: 'PSN',
  ground: 'GND', flying: 'FLY', psychic: 'PSY', bug: 'BUG',
  rock: 'RCK', ghost: 'GHO', dragon: 'DRG', dark: 'DRK',
  steel: 'STL', glitch: 'GLT',
};

type ViewMode = 'list' | 'detail' | 'swap';
type DetailTab = 'stats' | 'moves';
type MoveAction = 'swap' | 'delete' | 'cancel';
type PartyMode = 'overworld' | 'battle' | 'select-target';

const MOVE_ACTIONS: MoveAction[] = ['swap', 'delete', 'cancel'];

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

export function createPartyScene(input: InputManager, stateMachine: StateMachine): Scene {
  let cursor = 0;
  let viewMode: ViewMode = 'list';
  let swapFrom = -1;

  // Detail sub-screen state
  let detailTab: DetailTab = 'stats';
  let moveCursor = 0;
  let moveActionMenuOpen = false;
  let moveActionCursor = 0;
  let moveSwapFrom = -1;
  let moveMessage = '';
  let moveMessageTimer = 0;

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

  function renderSlot(ctx: CanvasRenderingContext2D, pokemon: Pokemon | null, index: number, isSelected: boolean, isSwapSource: boolean): void {
    const y = SLOT_START_Y + index * SLOT_HEIGHT;
    const bgColor = isSelected ? '#303060' : '#202040';

    fillRect(ctx, SLOT_X, y, SLOT_W, SLOT_HEIGHT - 2, bgColor);

    if (isSwapSource) {
      drawRect(ctx, SLOT_X, y, SLOT_W, SLOT_HEIGHT - 2, '#f8c030', 1);
    }

    if (!pokemon) {
      drawText(ctx, t('party.empty'), SLOT_X + 28, y + 7, { size: 8, color: '#666688' });
      return;
    }

    // Sprite (front sprite scaled for party list)
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
    drawText(ctx, nameText, SLOT_X + 24, y + 1, { size: 8, color: '#ffffff' });

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

    // Type badges
    let typeX = SLOT_X + 160;
    for (const pType of pokemon.types) {
      const color = TYPE_COLORS[pType] || '#888888';
      const badgeW = 30;
      fillRect(ctx, typeX, y + 2, badgeW, 8, color);
      drawText(ctx, pType.toUpperCase().slice(0, 4), typeX + 1, y + 2, { size: 7, color: '#ffffff' });
      typeX += badgeW + 2;
    }
  }

  function renderListView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();

    // Title
    const title = viewMode === 'swap' ? t('party.swap') : t('party.title');
    drawText(ctx, title, SCREEN_W / 2, 3, { size: 8, color: '#ffffff', align: 'center' });

    // Slots
    for (let i = 0; i < MAX_PARTY; i++) {
      const pokemon = i < party.length ? party[i] : null;
      renderSlot(ctx, pokemon, i, i === cursor, viewMode === 'swap' && i === swapFrom);
    }

    // Controls hint
    drawText(ctx, 'ESC:Back  ENTER:Detail/Swap', SLOT_X, SCREEN_H - 10, { size: 7, color: '#666688' });
  }

  function renderDetailStatsTab(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    // Sprite (larger)
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, 0, 0, 64, 64);
    } else {
      fillRect(ctx, 8, 8, 48, 48, '#445566');
    }

    // Name + Level
    drawText(ctx, `${getPokemonDisplayName(pokemon.id)}  Lv.${pokemon.level}`, 62, 8, { size: 8, color: '#ffffff' });

    // Types
    let typeX = 62;
    for (const pType of pokemon.types) {
      const color = TYPE_COLORS[pType] || '#888888';
      fillRect(ctx, typeX, 19, 34, 9, color);
      drawText(ctx, pType.toUpperCase(), typeX + 2, 20, { size: 7, color: '#ffffff' });
      typeX += 36;
    }

    // Height / Weight (after type badges)
    const height = getPokemonHeight(pokemon.id);
    const weight = getPokemonWeight(pokemon.id);
    if (height !== '?' || weight !== '?') {
      let hwY = 30;
      if (height !== '?') {
        drawText(ctx, t('party.height', { value: height }), 62, hwY, { size: 7, color: '#aaccdd' });
        hwY += 9;
      }
      if (weight !== '?') {
        drawText(ctx, t('party.weight', { value: weight }), 62, hwY, { size: 7, color: '#aaccdd' });
        hwY += 9;
      }
    }

    // Stats
    const statsX = 62;
    let statsY = 50;
    const statLabels: [string, number][] = [
      [t('party.stats.hp'), pokemon.maxHp],
      [t('party.stats.attack'), pokemon.attack],
      [t('party.stats.defense'), pokemon.defense],
      [t('party.stats.spAtk'), pokemon.specialAttack],
      [t('party.stats.spDef'), pokemon.specialDefense],
      [t('party.stats.speed'), pokemon.speed],
    ];
    for (const [label, value] of statLabels) {
      drawText(ctx, `${label}: ${value}`, statsX, statsY, { size: 7, color: '#ccccee' });
      statsY += 10;
    }

    // HP bar
    drawText(ctx, `${t('party.stats.hp')}: ${pokemon.hp}/${pokemon.maxHp}`, 8, 68, { size: 7, color: '#aaccff' });
    const hpBarX = 8;
    const hpBarY = 78;
    const hpBarW = 50;
    fillRect(ctx, hpBarX, hpBarY, hpBarW, 3, '#303030');
    const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
    const hpFillW = Math.floor(hpBarW * Math.max(0, Math.min(1, hpRatio)));
    if (hpFillW > 0) {
      fillRect(ctx, hpBarX, hpBarY, hpFillW, 3, getHpColor(hpRatio));
    }

    // XP bar
    const xpText = t('party.xp', { current: pokemon.xp, next: pokemon.xpToNext });
    drawText(ctx, xpText, 8, 86, { size: 7, color: '#88aaff' });
    const xpBarX = 8;
    const xpBarY = 96;
    const xpBarW = 50;
    fillRect(ctx, xpBarX, xpBarY, xpBarW, 3, '#303030');
    const xpRatio = pokemon.xpToNext > 0 ? pokemon.xp / pokemon.xpToNext : 0;
    const xpFillW = Math.floor(xpBarW * Math.max(0, Math.min(1, xpRatio)));
    if (xpFillW > 0) {
      fillRect(ctx, xpBarX, xpBarY, xpFillW, 3, '#5080ff');
    }
  }

  function renderDetailMovesTab(ctx: CanvasRenderingContext2D, pokemon: Pokemon): void {
    // Column layout constants
    const tableX = 4;
    const tableY = 18;
    const rowH = 10;
    const colNum = tableX;
    const colName = tableX + 12;
    const colClass = tableX + 92;
    const colType = tableX + 108;
    const colAcc = tableX + 132;
    const colPow = tableX + 156;
    const colPP = tableX + 180;

    // Sticky header row
    fillRect(ctx, tableX, tableY, SCREEN_W - 8, rowH, '#2a2a50');
    const headerColor = '#88aaff';
    drawText(ctx, t('party.moves.header.num'), colNum, tableY + 2, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('party.moves.header.move'), colName, tableY + 2, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('party.moves.header.class'), colClass, tableY + 2, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('party.moves.header.type'), colType, tableY + 2, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('party.moves.header.acc'), colAcc, tableY + 2, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('party.moves.header.pow'), colPow, tableY + 2, { size: 6, color: headerColor, font: 'monospace' });
    drawText(ctx, t('party.moves.header.pp'), colPP, tableY + 2, { size: 6, color: headerColor, font: 'monospace' });

    // Move rows
    for (let i = 0; i < pokemon.moves.length; i++) {
      const move = pokemon.moves[i];
      const rowY = tableY + rowH + i * rowH;
      const isSelected = i === moveCursor;
      const isSwapSource = i === moveSwapFrom;

      // Row background
      if (isSelected) {
        fillRect(ctx, tableX, rowY, SCREEN_W - 8, rowH, '#303060');
      }
      if (isSwapSource) {
        drawRect(ctx, tableX, rowY, SCREEN_W - 8, rowH, '#f8c030', 1);
      }

      const rowColor = isSelected ? '#ffffff' : '#ddddff';

      // Slot number
      drawText(ctx, `${i + 1}`, colNum, rowY + 2, { size: 6, color: '#888899', font: 'monospace' });

      // Move name (localized)
      drawText(ctx, getMoveDisplayName(move.id), colName, rowY + 2, { size: 6, color: rowColor, font: 'monospace' });

      // Damage class symbol
      const moveData = getMove(move.id);
      const dc = moveData?.damageClass || (move.power > 0 ? 'physical' : 'status');
      const dcInfo = getDamageClassLabel(dc);
      drawText(ctx, dcInfo.symbol, colClass + 4, rowY + 2, { size: 6, color: '#ccccee', font: 'monospace' });

      // Type abbreviation (always English)
      const typeAbbr = TYPE_ABBREV[move.type] || move.type.slice(0, 3).toUpperCase();
      const typeColor = TYPE_COLORS[move.type] || '#888888';
      drawText(ctx, typeAbbr, colType, rowY + 2, { size: 6, color: typeColor, font: 'monospace' });

      // Accuracy
      const acc = move.accuracy > 0 ? `${move.accuracy}` : '\u2014';
      drawText(ctx, acc, colAcc, rowY + 2, { size: 6, color: rowColor, font: 'monospace' });

      // Power
      const pow = move.power > 0 ? `${move.power}` : '\u2014';
      drawText(ctx, pow, colPow, rowY + 2, { size: 6, color: rowColor, font: 'monospace' });

      // PP
      drawText(ctx, `${move.currentPp}/${move.pp}`, colPP, rowY + 2, { size: 6, color: '#aaaacc', font: 'monospace' });
    }

    // Action menu overlay
    if (moveActionMenuOpen) {
      const menuW = 60;
      const menuH = MOVE_ACTIONS.length * 12 + 4;
      const menuX = SCREEN_W / 2 - menuW / 2;
      const menuY = SCREEN_H / 2 - menuH / 2;

      fillRect(ctx, menuX, menuY, menuW, menuH, '#1a1a30');
      drawRect(ctx, menuX, menuY, menuW, menuH, '#8888cc', 1);

      for (let i = 0; i < MOVE_ACTIONS.length; i++) {
        const action = MOVE_ACTIONS[i];
        const isSel = i === moveActionCursor;
        const ay = menuY + 4 + i * 12;

        if (isSel) {
          fillRect(ctx, menuX + 2, ay - 1, menuW - 4, 11, '#303060');
        }

        let label: string;
        if (action === 'swap') label = t('party.moves.swap');
        else if (action === 'delete') label = t('party.moves.delete');
        else label = t('party.moves.cancel');

        drawText(ctx, label, menuX + 6, ay + 1, { size: 7, color: isSel ? '#ffffff' : '#aaaacc' });
      }
    }

    // Temporary message (e.g. "Can't delete last move!")
    if (moveMessage && moveMessageTimer > 0) {
      drawText(ctx, moveMessage, SCREEN_W / 2, SCREEN_H - 22, { size: 7, color: '#ff6666', align: 'center' });
    }
  }

  function renderDetailView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();
    const pokemon = party[cursor];
    if (!pokemon) return;

    // Tab bar at top
    const tabW = SCREEN_W / 2;
    const tabs: { key: DetailTab; label: string }[] = [
      { key: 'stats', label: 'STATS' },
      { key: 'moves', label: t('party.moves.title') },
    ];
    for (let i = 0; i < tabs.length; i++) {
      const tx = i * tabW;
      const isActive = tabs[i].key === detailTab;
      fillRect(ctx, tx, 0, tabW, 12, isActive ? '#303060' : '#1a1a30');
      drawText(ctx, tabs[i].label, tx + tabW / 2, 2, {
        size: 7,
        color: isActive ? '#ffffff' : '#666688',
        align: 'center',
      });
    }

    // Tab content
    if (detailTab === 'stats') {
      renderDetailStatsTab(ctx, pokemon);
    } else {
      renderDetailMovesTab(ctx, pokemon);
    }

    // Controls hint
    const hint = detailTab === 'moves'
      ? 'ESC:Back  \u2190\u2192:Tab  ENTER:Action  D:Delete'
      : 'ESC:Back  \u2190\u2192:Tab';
    drawText(ctx, hint, SLOT_X, SCREEN_H - 10, { size: 7, color: '#666688' });
  }

  function updateDetailView(dt: number): void {
    const party = getParty();
    const pokemon = party[cursor];
    if (!pokemon) return;

    // Decrement message timer
    if (moveMessageTimer > 0) {
      moveMessageTimer -= dt;
      if (moveMessageTimer <= 0) {
        moveMessage = '';
        moveMessageTimer = 0;
      }
    }

    // Handle action menu if open
    if (moveActionMenuOpen) {
      if (input.isKeyPressed('Escape')) {
        moveActionMenuOpen = false;
        return;
      }
      if (input.isKeyPressed('ArrowUp')) {
        moveActionCursor = moveActionCursor > 0 ? moveActionCursor - 1 : MOVE_ACTIONS.length - 1;
        return;
      }
      if (input.isKeyPressed('ArrowDown')) {
        moveActionCursor = moveActionCursor < MOVE_ACTIONS.length - 1 ? moveActionCursor + 1 : 0;
        return;
      }
      if (input.isKeyPressed('Enter')) {
        const action = MOVE_ACTIONS[moveActionCursor];
        if (action === 'swap') {
          moveSwapFrom = moveCursor;
          moveActionMenuOpen = false;
        } else if (action === 'delete') {
          if (pokemon.moves.length <= 1) {
            moveMessage = t('party.moves.cantDeleteLast');
            moveMessageTimer = 2;
            moveActionMenuOpen = false;
          } else {
            pokemon.moves.splice(moveCursor, 1);
            if (moveCursor >= pokemon.moves.length) {
              moveCursor = pokemon.moves.length - 1;
            }
            moveActionMenuOpen = false;
          }
        } else {
          // cancel
          moveActionMenuOpen = false;
        }
        return;
      }
      return;
    }

    // Escape: back to list (or cancel move swap)
    if (input.isKeyPressed('Escape')) {
      if (moveSwapFrom >= 0) {
        moveSwapFrom = -1;
      } else {
        viewMode = 'list';
        detailTab = 'stats';
        moveCursor = 0;
      }
      return;
    }

    // Tab switching with left/right
    if (input.isKeyPressed('ArrowLeft')) {
      if (detailTab === 'moves') {
        detailTab = 'stats';
        moveCursor = 0;
        moveSwapFrom = -1;
      }
      return;
    }
    if (input.isKeyPressed('ArrowRight')) {
      if (detailTab === 'stats') {
        detailTab = 'moves';
        moveCursor = 0;
      }
      return;
    }

    // Moves tab navigation
    if (detailTab === 'moves') {
      const moveCount = pokemon.moves.length;

      if (input.isKeyPressed('ArrowUp')) {
        moveCursor = moveCursor > 0 ? moveCursor - 1 : moveCount - 1;
      }
      if (input.isKeyPressed('ArrowDown')) {
        moveCursor = moveCursor < moveCount - 1 ? moveCursor + 1 : 0;
      }

      // Enter: open action menu or complete swap
      if (input.isKeyPressed('Enter')) {
        if (moveSwapFrom >= 0) {
          // Complete move swap
          if (moveSwapFrom !== moveCursor && moveSwapFrom < moveCount) {
            const temp = pokemon.moves[moveSwapFrom];
            pokemon.moves[moveSwapFrom] = pokemon.moves[moveCursor];
            pokemon.moves[moveCursor] = temp;
          }
          moveSwapFrom = -1;
        } else {
          // Open action menu
          moveActionMenuOpen = true;
          moveActionCursor = 0;
        }
      }

      // D key shortcut for delete
      if (input.isKeyPressed('d') || input.isKeyPressed('D')) {
        if (pokemon.moves.length <= 1) {
          moveMessage = t('party.moves.cantDeleteLast');
          moveMessageTimer = 2;
        } else {
          pokemon.moves.splice(moveCursor, 1);
          if (moveCursor >= pokemon.moves.length) {
            moveCursor = pokemon.moves.length - 1;
          }
        }
      }
    }
  }

  return {
    enter(): void {
      cursor = 0;
      viewMode = 'list';
      swapFrom = -1;
      detailTab = 'stats';
      moveCursor = 0;
      moveActionMenuOpen = false;
      moveSwapFrom = -1;
      moveMessage = '';
      moveMessageTimer = 0;
      selectedPartyIndex = -1;
      loadPartySprites();
    },

    exit(): void {},

    update(dt: number): void {
      const party = getParty();
      const partyLen = party.length;

      if (viewMode === 'detail') {
        updateDetailView(dt);
        return;
      }

      // List or swap mode
      if (input.isKeyPressed('Escape')) {
        if (viewMode === 'swap') {
          viewMode = 'list';
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
        if (partyLen === 0) return;
        if (cursor >= partyLen) return;

        if (viewMode === 'swap') {
          // Complete the swap
          if (swapFrom !== cursor && swapFrom >= 0 && swapFrom < partyLen) {
            const temp = party[swapFrom];
            party[swapFrom] = party[cursor];
            party[cursor] = temp;
          }
          viewMode = 'list';
          swapFrom = -1;
        } else if (partyMode === 'battle') {
          selectedPartyIndex = cursor;
          stateMachine.pop();
        } else if (partyMode === 'select-target') {
          if (onSelectCallback) onSelectCallback(cursor);
          stateMachine.pop();
        } else {
          // Overworld: open detail
          viewMode = 'detail';
          detailTab = 'stats';
          moveCursor = 0;
          moveSwapFrom = -1;
          moveActionMenuOpen = false;
        }
      }

      // S key to start swap mode
      if (input.isKeyPressed('s') || input.isKeyPressed('S')) {
        if (partyLen > 1 && cursor < partyLen) {
          if (viewMode === 'list') {
            viewMode = 'swap';
            swapFrom = cursor;
          }
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#181830');

      if (viewMode === 'detail') {
        renderDetailView(ctx);
      } else {
        renderListView(ctx);
      }
    },
  };
}
