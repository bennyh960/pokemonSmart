/**
 * PC Storage Scene — Deposit, withdraw, and release Pokemon between party and PC boxes.
 *
 * Layout from screens_examples_coords/pc_canvas_coordinates.md:
 * - Title bar with mode pills (withdraw/deposit/release)
 * - Box header with arrows + box name
 * - Party sidebar (left, 6 slots)
 * - Box grid (right, 6×5 = 30 cells)
 * - Detail strip (selected Pokemon info)
 * - Bottom bar (key hints)
 */

import type { Scene, Pokemon, PokemonType } from '../types/index.js';
import type { InputManager } from '../engine/input';
import type { StateMachine } from '../engine/state-machine.js';
import { fillRect, drawRect, drawText } from '../engine/renderer.js';
import { t } from '../i18n/i18n.js';
import { getPlayerData, hasActiveGame, autoSave } from '../systems/game-state.js';
import { getPokemonDisplayName } from '../services/pokemon-data.js';
import {
  depositPokemon,
  withdrawPokemon,
  releaseFromBox,
  releaseFromParty,
  getBoxCount,
  findEmptySlot,
} from '../systems/pc-storage.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { TYPE_BADGE } from '../data/type-constants.js';
import { LOGICAL_WIDTH as SW, LOGICAL_HEIGHT as SH } from '../engine/config.js';

type PCMode = 'withdraw' | 'deposit' | 'release';
type CursorZone = 'grid' | 'party';

const MODES: PCMode[] = ['withdraw', 'deposit', 'release'];
const BOX_COUNT = 10;
const BOX_SIZE = 30;
const GRID_COLS = 6;
const GRID_ROWS = 5;
const MAX_PARTY = 6;

// Layout constants from design doc
const C = {
  // Colors
  BG: '#0a1a10',
  CARD: '#0f2a1a',
  CARD_BORDER: '#1a4a30',
  CARD_SEL: '#1a3a2a',
  CARD_SEL_BORDER: '#2a6a40',
  TEXT: '#ffffff',
  TEXT_DIM: '#667766',
  TEXT_MUTED: '#445544',
  GREEN: '#20d860',
  EMPTY_BG: '#0a1a10',
  EMPTY_BORDER: '#1a3a2a',
  CURSOR: '#20d860',

  // Grid
  GRID_X: 64,
  GRID_Y: 22,
  CELL_W: 28,
  CELL_H: 19,
  COL_STRIDE: 29,
  ROW_STRIDE: 20,

  // Party sidebar
  PARTY_X: 4,
  PARTY_W: 56,
  PARTY_Y0: 30,
  PARTY_STRIDE: 18,
  PARTY_SLOT_H: 16,

  // Detail strip
  DETAIL_Y: 124,
  DETAIL_H: 22,
};

const MODE_COLORS: Record<PCMode, { active: string; bg: string; text: string }> = {
  withdraw: { active: '#1a5a35', bg: '#1a5a35', text: '#20d860' },
  deposit: { active: '#1a3a5a', bg: '#1a3a5a', text: '#5080ff' },
  release: { active: '#3a1a1a', bg: '#3a1a1a', text: '#d84040' },
};

export function createPCScene(input: InputManager, stateMachine: StateMachine): Scene {
  let mode: PCMode = 'withdraw';
  let currentBox = 0;
  let cursorZone: CursorZone = 'grid';
  let gridCol = 0;
  let gridRow = 0;
  let partyIndex = 0;
  let confirmRelease: {
    pokemon: Pokemon;
    zone: 'grid' | 'party';
    boxIdx: number;
    slotIdx: number;
    partyIdx: number;
  } | null = null;
  let message = '';
  let messageTimer = 0;

  function getSelectedPokemon(): Pokemon | null {
    if (!hasActiveGame()) return null;
    const pd = getPlayerData();
    if (cursorZone === 'party') {
      return pd.party[partyIndex] ?? null;
    } else {
      return pd.boxes[currentBox]?.pokemon[gridRow * GRID_COLS + gridCol] ?? null;
    }
  }

  function loadSprites(): void {
    if (!hasActiveGame()) return;
    const pd = getPlayerData();
    for (const p of pd.party) {
      loadImage(`/sprites/pokemon/icons/${p.id}.png`).catch(() => {});
    }
    for (const slot of pd.boxes[currentBox]?.pokemon ?? []) {
      if (slot) loadImage(`/sprites/pokemon/icons/${slot.id}.png`).catch(() => {});
    }
  }

  function showMessage(msg: string): void {
    message = msg;
    messageTimer = 1.5;
  }

  function performAction(): void {
    if (!hasActiveGame()) return;
    const pd = getPlayerData();
    const slotIdx = gridRow * GRID_COLS + gridCol;

    if (mode === 'withdraw') {
      if (cursorZone === 'grid') {
        if (withdrawPokemon(currentBox, slotIdx)) {
          autoSave();
          loadSprites();
        } else {
          if (pd.party.length >= MAX_PARTY) showMessage(t('pc.partyFull'));
          else showMessage(t('pc.empty'));
        }
      }
    } else if (mode === 'deposit') {
      if (cursorZone === 'party') {
        const emptySlot = findEmptySlot(currentBox);
        if (emptySlot === -1) {
          showMessage(t('pc.boxFull'));
          return;
        }
        if (depositPokemon(partyIndex, currentBox, emptySlot)) {
          if (partyIndex >= pd.party.length) partyIndex = Math.max(0, pd.party.length - 1);
          autoSave();
          loadSprites();
        } else {
          if (pd.party.length <= 1) showMessage(t('pc.partyMin'));
        }
      }
    } else if (mode === 'release') {
      const pokemon = getSelectedPokemon();
      if (pokemon) {
        confirmRelease = {
          pokemon,
          zone: cursorZone,
          boxIdx: currentBox,
          slotIdx,
          partyIdx: partyIndex,
        };
      }
    }
  }

  function confirmReleaseAction(yes: boolean): void {
    if (!confirmRelease) return;
    if (yes) {
      if (confirmRelease.zone === 'grid') {
        releaseFromBox(confirmRelease.boxIdx, confirmRelease.slotIdx);
      } else {
        const released = releaseFromParty(confirmRelease.partyIdx);
        if (!released) {
          showMessage(t('pc.partyMin'));
          confirmRelease = null;
          return;
        }
        const pd = getPlayerData();
        if (partyIndex >= pd.party.length) partyIndex = Math.max(0, pd.party.length - 1);
      }
      autoSave();
      loadSprites();
    }
    confirmRelease = null;
  }

  return {
    enter(): void {
      mode = 'withdraw';
      currentBox = 0;
      cursorZone = 'grid';
      gridCol = 0;
      gridRow = 0;
      partyIndex = 0;
      confirmRelease = null;
      message = '';
      messageTimer = 0;
      loadSprites();
    },

    exit(): void {},

    update(dt: number): void {
      if (messageTimer > 0) {
        messageTimer -= dt;
        if (messageTimer <= 0) {
          message = '';
          messageTimer = 0;
        }
      }

      // Release confirmation dialog
      if (confirmRelease) {
        if (input.isKeyPressed('Escape')) {
          confirmReleaseAction(false);
          return;
        }
        if (input.isKeyPressed('ArrowLeft')) return; // stay on current selection
        if (input.isKeyPressed('ArrowRight')) return;
        if (input.isKeyPressed('Enter')) {
          confirmReleaseAction(true);
          return;
        }
        return;
      }

      // Escape → exit PC
      if (input.isKeyPressed('Escape')) {
        stateMachine.pop();
        return;
      }

      // Tab → cycle mode
      if (input.isKeyPressed('Tab') || input.isKeyPressed('1') || input.isKeyPressed('2') || input.isKeyPressed('3')) {
        if (input.isKeyPressed('1')) mode = 'withdraw';
        else if (input.isKeyPressed('2')) mode = 'deposit';
        else if (input.isKeyPressed('3')) mode = 'release';
        else {
          const idx = MODES.indexOf(mode);
          mode = MODES[(idx + 1) % MODES.length];
        }
        return;
      }

      // Enter → perform action
      if (input.isKeyPressed('Enter')) {
        performAction();
        return;
      }

      // Navigation
      if (cursorZone === 'grid') {
        if (input.isKeyPressed('ArrowRight')) {
          if (gridCol < GRID_COLS - 1) gridCol++;
        }
        if (input.isKeyPressed('ArrowLeft')) {
          if (gridCol > 0) gridCol--;
          else {
            cursorZone = 'party';
            partyIndex = 0;
          } // Move to party
        }
        if (input.isKeyPressed('ArrowDown')) {
          if (gridRow < GRID_ROWS - 1) gridRow++;
        }
        if (input.isKeyPressed('ArrowUp')) {
          if (gridRow > 0) gridRow--;
        }
        // Q/E or dedicated keys to change box
        if (input.isKeyPressed('q') || input.isKeyPressed('Q')) {
          currentBox = (currentBox - 1 + BOX_COUNT) % BOX_COUNT;
          loadSprites();
        }
        if (input.isKeyPressed('e') || input.isKeyPressed('E')) {
          currentBox = (currentBox + 1) % BOX_COUNT;
          loadSprites();
        }
      } else {
        // Party zone
        if (input.isKeyPressed('ArrowDown')) {
          if (partyIndex < MAX_PARTY - 1) partyIndex++;
        }
        if (input.isKeyPressed('ArrowUp')) {
          if (partyIndex > 0) partyIndex--;
        }
        if (input.isKeyPressed('ArrowRight')) {
          cursorZone = 'grid';
          gridCol = 0;
        }
        // Q/E for box change even from party
        if (input.isKeyPressed('q') || input.isKeyPressed('Q')) {
          currentBox = (currentBox - 1 + BOX_COUNT) % BOX_COUNT;
          loadSprites();
        }
        if (input.isKeyPressed('e') || input.isKeyPressed('E')) {
          currentBox = (currentBox + 1) % BOX_COUNT;
          loadSprites();
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      if (!hasActiveGame()) return;
      const pd = getPlayerData();
      const box = pd.boxes[currentBox];
      const modeColor = MODE_COLORS[mode];

      // Background
      fillRect(ctx, 0, 0, SW, SH, C.BG);

      // ── TITLE BAR ──
      fillRect(ctx, 0, 0, SW, 10, '#0a1a10');
      drawText(ctx, t('pc.title'), 236, 1, { size: 8, color: C.TEXT, font: 'monospace', align: 'right' });

      // Mode pills
      fillRect(ctx, 4, 1, 120, 8, '#0a2a1a');
      drawRect(ctx, 4, 1, 120, 8, '#1a4a30');
      const modePositions = [
        { x: 84, w: 38, key: 'withdraw' as PCMode },
        { x: 44, w: 38, key: 'deposit' as PCMode },
        { x: 6, w: 36, key: 'release' as PCMode },
      ];
      for (const mp of modePositions) {
        const isActive = mode === mp.key;
        const mc = MODE_COLORS[mp.key];
        if (isActive) {
          fillRect(ctx, mp.x, 1, mp.w, 8, mc.bg);
          drawRect(ctx, mp.x, 1, mp.w, 8, '#1a4a30');
        }
        drawText(ctx, t(`pc.mode.${mp.key}`), mp.x + mp.w / 2, 2, {
          size: 6,
          color: isActive ? mc.text : C.TEXT_MUTED,
          font: 'monospace',
          align: 'center',
        });
      }

      // ── BOX HEADER ──
      fillRect(ctx, 0, 10, SW, 10, '#0a1a10');
      // Left arrow
      fillRect(ctx, 64, 11, 10, 8, '#0f2a1a');
      drawRect(ctx, 64, 11, 10, 8, '#1a4a30');
      drawText(ctx, '\u25c0', 69, 12, { size: 6, color: C.TEXT_DIM, font: 'monospace', align: 'center' });
      // Box name
      drawText(ctx, box.name, 118, 11, { size: 7, color: C.TEXT, font: 'monospace', align: 'center' });
      // Count
      const boxCount = getBoxCount(currentBox);
      drawText(ctx, `${boxCount}/${BOX_SIZE}`, 160, 12, { size: 5, color: C.TEXT_MUTED, font: 'monospace' });
      // Right arrow
      fillRect(ctx, 176, 11, 10, 8, '#0f2a1a');
      drawRect(ctx, 176, 11, 10, 8, '#1a4a30');
      drawText(ctx, '\u25b6', 181, 12, { size: 6, color: C.TEXT_DIM, font: 'monospace', align: 'center' });

      // ── PARTY SIDEBAR ──
      drawText(ctx, t('pc.party'), 58, 22, { size: 6, color: C.TEXT_MUTED, font: 'monospace', align: 'right' });
      drawText(ctx, `${pd.party.length}/${MAX_PARTY}`, 4, 22, { size: 5, color: C.TEXT_MUTED, font: 'monospace' });

      for (let i = 0; i < MAX_PARTY; i++) {
        const sy = C.PARTY_Y0 + i * C.PARTY_STRIDE;
        const pokemon = pd.party[i] ?? null;
        const isSelected = cursorZone === 'party' && partyIndex === i;
        const bg = isSelected ? C.CARD_SEL : C.CARD;
        const border = isSelected ? C.CARD_SEL_BORDER : C.CARD_BORDER;

        fillRect(ctx, C.PARTY_X, sy, C.PARTY_W, C.PARTY_SLOT_H, bg);
        drawRect(ctx, C.PARTY_X, sy, C.PARTY_W, C.PARTY_SLOT_H, border);

        if (pokemon) {
          // Mini sprite
          const spriteUrl = `/sprites/pokemon/icons/${pokemon.id}.png`;
          const spriteImg = getCachedImage(spriteUrl);
          if (spriteImg) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(spriteImg, C.PARTY_X + 42, sy + 3, 10, 10);
          }
          // Name
          drawText(ctx, getPokemonDisplayName(pokemon.id), C.PARTY_X + 38, sy + 2, {
            size: 5,
            color: C.TEXT,
            font: 'monospace',
            align: 'right',
          });
          // HP bar
          const hpRatio = pokemon.hp / pokemon.maxHp;
          fillRect(ctx, C.PARTY_X + 2, sy + 10, 34, 2, '#1a3a2a');
          const hpW = Math.round(34 * hpRatio);
          if (hpW > 0) {
            const hpColor = hpRatio > 0.5 ? C.GREEN : hpRatio > 0.2 ? '#f8d030' : '#f03030';
            fillRect(ctx, C.PARTY_X + 2, sy + 10, hpW, 2, hpColor);
          }
        } else {
          drawText(ctx, '\u2014', C.PARTY_X + C.PARTY_W / 2, sy + 5, {
            size: 5,
            color: '#1a2a1a',
            font: 'monospace',
            align: 'center',
          });
        }
      }

      // ── BOX GRID ──
      for (let row = 0; row < GRID_ROWS; row++) {
        for (let col = 0; col < GRID_COLS; col++) {
          const cx = C.GRID_X + col * C.COL_STRIDE;
          const cy = C.GRID_Y + row * C.ROW_STRIDE;
          const slotIdx = row * GRID_COLS + col;
          const pokemon = box.pokemon[slotIdx];
          const isSelected = cursorZone === 'grid' && gridCol === col && gridRow === row;

          if (pokemon) {
            fillRect(ctx, cx, cy, C.CELL_W, C.CELL_H, isSelected ? C.CARD_SEL : C.CARD);
            drawRect(ctx, cx, cy, C.CELL_W, C.CELL_H, isSelected ? C.CARD_SEL_BORDER : C.CARD_BORDER);
            // Sprite
            const spriteUrl = `/sprites/pokemon/icons/${pokemon.id}.png`;
            const spriteImg = getCachedImage(spriteUrl);
            if (spriteImg) {
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(spriteImg, cx + 8, cy + 2, 12, 12);
            }
          } else {
            fillRect(ctx, cx, cy, C.CELL_W, C.CELL_H, C.EMPTY_BG);
            drawRect(ctx, cx, cy, C.CELL_W, C.CELL_H, C.EMPTY_BORDER);
            // Center dot
            ctx.fillStyle = '#0f2a1a';
            ctx.fillRect(cx + 12, cy + 7, 4, 4);
          }

          // Selection cursor corner marks
          if (isSelected) {
            ctx.fillStyle = C.CURSOR;
            const w = C.CELL_W,
              h = C.CELL_H;
            // Top-left
            ctx.fillRect(cx + 1, cy + 1, 3, 1);
            ctx.fillRect(cx + 1, cy + 1, 1, 3);
            // Top-right
            ctx.fillRect(cx + w - 4, cy + 1, 3, 1);
            ctx.fillRect(cx + w - 2, cy + 1, 1, 3);
            // Bottom-left
            ctx.fillRect(cx + 1, cy + h - 2, 3, 1);
            ctx.fillRect(cx + 1, cy + h - 4, 1, 3);
            // Bottom-right
            ctx.fillRect(cx + w - 4, cy + h - 2, 3, 1);
            ctx.fillRect(cx + w - 2, cy + h - 4, 1, 3);
          }
        }
      }

      // ── DETAIL STRIP ──
      fillRect(ctx, 4, C.DETAIL_Y, 232, C.DETAIL_H, '#0a2a1a');
      drawRect(ctx, 4, C.DETAIL_Y, 232, C.DETAIL_H, C.CARD_BORDER);

      const selected = getSelectedPokemon();
      if (selected) {
        // Sprite
        const spriteUrl = `/sprites/pokemon/icons/${selected.id}.png`;
        const spriteImg = getCachedImage(spriteUrl);
        if (spriteImg) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(spriteImg, 218, 128, 14, 14);
        }
        fillRect(ctx, 216, 126, 18, 18, C.CARD);
        drawRect(ctx, 216, 126, 18, 18, C.CARD_BORDER);
        if (spriteImg) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(spriteImg, 218, 128, 14, 14);
        }

        // Name
        drawText(ctx, getPokemonDisplayName(selected.id), 212, 126, {
          size: 7,
          color: modeColor.text,
          font: 'monospace',
          align: 'right',
        });
        // Level
        drawText(ctx, `Lv.${selected.level}`, 126, 126, {
          size: 5,
          color: C.TEXT_DIM,
          font: 'monospace',
        });
        // Type badge
        if (selected.types.length > 0) {
          const typeColor = TYPE_BADGE[selected.types[0] as PokemonType]?.color || '#888';
          fillRect(ctx, 182, 134, 16, 6, typeColor);
          drawText(ctx, selected.types[0].slice(0, 3).toUpperCase(), 190, 134, {
            size: 5,
            color: C.TEXT,
            font: 'monospace',
            align: 'center',
          });
        }
        // HP
        drawText(ctx, 'HP', 100, 135, { size: 5, color: C.TEXT_DIM, font: 'monospace' });
        fillRect(ctx, 44, 137, 52, 2, '#1a3a2a');
        const hpRatio = selected.hp / selected.maxHp;
        const hpW = Math.round(52 * hpRatio);
        if (hpW > 0) {
          fillRect(ctx, 44, 137, hpW, 2, C.GREEN);
        }
        drawText(ctx, `${selected.hp}/${selected.maxHp}`, 10, 135, {
          size: 5,
          color: '#aaccaa',
          font: 'monospace',
        });
        // Action button
        const btnColors = MODE_COLORS[mode];
        fillRect(ctx, 116, 134, 28, 8, btnColors.bg);
        drawRect(ctx, 116, 134, 28, 8, C.CARD_SEL_BORDER);
        drawText(ctx, t(`pc.mode.${mode}`), 130, 135, {
          size: 5,
          color: btnColors.text,
          font: 'monospace',
          align: 'center',
        });
      }

      // ── BOTTOM BAR ──
      fillRect(ctx, 0, 150, SW, 10, '#0a1a10');
      const keys = [
        { pillX: 4, pillW: 18, text: 'ESC', hintKey: 'pc.hint.back' },
        { pillX: 52, pillW: 24, text: 'Enter', hintKey: 'pc.hint.select' },
        { pillX: 108, pillW: 14, text: 'Q/E', hintKey: 'pc.hint.box' },
        { pillX: 152, pillW: 18, text: '1-3', hintKey: 'pc.hint.mode' },
      ];
      for (const k of keys) {
        fillRect(ctx, k.pillX, 151, k.pillW, 8, '#1a3a2a');
        drawRect(ctx, k.pillX, 151, k.pillW, 8, '#2a5a3a');
        drawText(ctx, k.text, k.pillX + k.pillW / 2, 152, {
          size: 5,
          color: '#aaccaa',
          font: 'monospace',
          align: 'center',
        });
        drawText(ctx, t(k.hintKey), k.pillX + k.pillW + 2, 153, {
          size: 5,
          color: C.TEXT_DIM,
          font: 'monospace',
        });
      }

      // ── MESSAGE OVERLAY ──
      if (message && messageTimer > 0) {
        fillRect(ctx, 40, 70, 160, 20, '#1a1a1a');
        drawRect(ctx, 40, 70, 160, 20, '#444444');
        drawText(ctx, message, 120, 75, {
          size: 7,
          color: '#ff8888',
          font: 'monospace',
          align: 'center',
        });
      }

      // ── RELEASE CONFIRMATION ──
      if (confirmRelease) {
        fillRect(ctx, 0, 0, SW, SH, '#000000aa');
        fillRect(ctx, 30, 50, 180, 50, C.BG);
        drawRect(ctx, 30, 50, 180, 50, '#cc4444');
        const name = getPokemonDisplayName(confirmRelease.pokemon.id);
        drawText(ctx, t('pc.confirmRelease', { name }), 120, 58, {
          size: 7,
          color: C.TEXT,
          font: 'monospace',
          align: 'center',
        });
        drawText(ctx, t('pc.releaseWarning'), 120, 70, {
          size: 6,
          color: '#ff8888',
          font: 'monospace',
          align: 'center',
        });
        // Enter = yes, Escape = no
        fillRect(ctx, 55, 82, 50, 12, '#cc4444');
        drawText(ctx, 'Enter: ' + t('pc.yes'), 80, 84, {
          size: 6,
          color: C.TEXT,
          font: 'monospace',
          align: 'center',
        });
        fillRect(ctx, 135, 82, 50, 12, '#2a6a40');
        drawText(ctx, 'ESC: ' + t('pc.no'), 160, 84, {
          size: 6,
          color: C.TEXT,
          font: 'monospace',
          align: 'center',
        });
      }
    },
  };
}
