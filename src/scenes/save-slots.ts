/**
 * SaveSlotsScene - Save/Load slot selection screen.
 * Up to MAX_SAVE_SLOTS slots in fixed insertion order.
 * Press S in overworld to save; "Load Game" on title screen to load.
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, drawText, fillRect, fillRoundRect, strokeRoundRect } from '../engine/renderer.js';
import { getSlotIndex, deleteSave, MAX_SAVE_SLOTS, type SaveSlotMeta } from '../systems/save.js';
import { getCurrentSlot, loadGameFromSlot, saveToSlot } from '../systems/game-state.js';
import { loadCharacterSprites, getCharacterFrame } from '../engine/character-sprites.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { t, isRTL } from '../i18n/i18n.js';
import { LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H } from '../engine/config.js';

const VISIBLE = 5;
const SLOT_H = 26;
const SLOTS_START_Y = 14;
const SLOT_X = 4;
const SLOT_W = W - 8;
const FOOTER_Y = SLOTS_START_Y + VISIBLE * SLOT_H;

type SubState = 'list' | 'confirm_overwrite' | 'confirm_delete';
export type SaveSlotsMode = 'load' | 'save';

let saveSlotsMode: SaveSlotsMode = 'load';
let saveSlotsFromTitle = false;

export function openSaveSlots(mode: SaveSlotsMode, fromTitle = false): void {
  saveSlotsMode = mode;
  saveSlotsFromTitle = fromTitle;
}

function formatAge(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function createSaveSlotsScene(input: InputManager, stateMachine: StateMachine): Scene {
  let allSlots: (SaveSlotMeta | null)[] = Array(MAX_SAVE_SLOTS).fill(null);
  let selectedIndex = 0;
  let scrollOffset = 0;
  let subState: SubState = 'list';
  let confirmCursor = 0;
  let savedFlash = 0;

  function rebuildSlots(): void {
    const occupied = getSlotIndex()
      .filter(m => m.slot >= 0 && m.slot < MAX_SAVE_SLOTS)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    allSlots = [...occupied, ...Array(MAX_SAVE_SLOTS - occupied.length).fill(null)];
  }

  function firstFreeSlot(): number {
    const used = new Set(allSlots.filter(Boolean).map(m => (m as SaveSlotMeta).slot));
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      if (!used.has(i)) return i;
    }
    return 0;
  }

  function getActualSlot(displayIdx: number): number {
    const m = allSlots[displayIdx];
    return m ? m.slot : firstFreeSlot();
  }

  function clampScroll(): void {
    if (selectedIndex < scrollOffset) scrollOffset = selectedIndex;
    if (selectedIndex >= scrollOffset + VISIBLE) scrollOffset = selectedIndex - VISIBLE + 1;
    scrollOffset = Math.max(0, Math.min(MAX_SAVE_SLOTS - VISIBLE, scrollOffset));
  }

  function goBack(): void {
    if (saveSlotsFromTitle) {
      stateMachine.change('TITLE');
    } else {
      stateMachine.pop();
    }
  }

  function doSave(slot: number): void {
    saveToSlot(slot);
    rebuildSlots();
    subState = 'list';
    savedFlash = 1.2;
  }

  function drawSlotBox(
    ctx: CanvasRenderingContext2D,
    vi: number,
    meta: SaveSlotMeta | null,
    si: number,
    isSelected: boolean,
  ): void {
    const slotY = SLOTS_START_Y + vi * SLOT_H;
    const isSaveTarget = saveSlotsMode === 'save' && isSelected && !meta;

    const bgColor = meta
      ? (isSelected ? '#1e2e5a' : '#141e3a')
      : (isSelected ? '#111e30' : '#0e0e1e');

    ctx.fillStyle = bgColor;
    fillRoundRect(ctx, SLOT_X, slotY + 1, SLOT_W, SLOT_H - 2, 3);

    if (isSelected) {
      ctx.strokeStyle = meta
        ? '#ffcb05'
        : (saveSlotsMode === 'save' ? '#44cc88' : '#445577');
      ctx.lineWidth = 1;
      strokeRoundRect(ctx, SLOT_X + 0.5, slotY + 1.5, SLOT_W - 1, SLOT_H - 3, 3);
    }

    if (meta) {
      // Hero sprite (14×14)
      const frame = getCharacterFrame(meta.heroCharacterId, 'down', 'stand');
      if (frame) {
        ctx.drawImage(frame.image, frame.sx, frame.sy, frame.w, frame.h,
          SLOT_X + 4, slotY + 6, 14, 14);
      }

      // Pokemon icon (14×14)
      if (meta.firstPokemonId) {
        const icon = getCachedImage(`/sprites/pokemon/icons/${meta.firstPokemonId}.png`);
        if (icon) {
          ctx.drawImage(icon, SLOT_X + 20, slotY + 6, 14, 14);
        }
      }

      // Slot number (dim)
      drawText(ctx, `#${si + 1}`, SLOT_X + 38, slotY + 3, { size: 5, color: '#444466' });

      // Player name
      const rtl = isRTL();
      drawText(ctx, meta.playerName, SLOT_X + 38, slotY + 11, {
        size: 7,
        color: isSelected ? '#ffffff' : '#bbccee',
        maxWidth: 100,
        direction: rtl ? 'rtl' : 'ltr',
      });

      // Time ago
      drawText(ctx, formatAge(meta.savedAt), SLOT_X + SLOT_W - 26, slotY + 8, {
        size: 6,
        color: '#6688aa',
      });

      // R=delete hint (only on selected)
      if (isSelected) {
        drawText(ctx, '[R]', SLOT_X + SLOT_W - 18, slotY + 18, {
          size: 5,
          color: '#993333',
        });
      }
    } else {
      const label = isSaveTarget
        ? t('saveSlots.saveHere')
        : `#${si + 1}  ${t('saveSlots.empty')}`;
      drawText(ctx, label, W / 2, slotY + 10, {
        size: 6,
        color: isSaveTarget ? '#44cc88' : '#2a3a4a',
        align: 'center',
      });
    }
  }

  function drawConfirmDialog(ctx: CanvasRenderingContext2D): void {
    // Darken
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, W, H);

    const question = subState === 'confirm_overwrite'
      ? t('saveSlots.confirmOverwrite')
      : t('saveSlots.confirmDelete');

    const dlgW = 160;
    const dlgH = 52;
    const dlgX = (W - dlgW) / 2;
    const dlgY = (H - dlgH) / 2;

    ctx.fillStyle = '#141428';
    fillRoundRect(ctx, dlgX, dlgY, dlgW, dlgH, 5);

    ctx.strokeStyle = '#3355aa';
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, dlgX + 0.5, dlgY + 0.5, dlgW - 1, dlgH - 1, 5);

    drawText(ctx, question, W / 2, dlgY + 10, { size: 7, color: '#ffffff', align: 'center' });

    const noCol = confirmCursor === 0 ? '#ffcb05' : '#777799';
    const yesCol = confirmCursor === 1 ? '#ffcb05' : '#777799';

    drawText(ctx, (confirmCursor === 0 ? '▶ ' : '  ') + t('saveSlots.no'),
      dlgX + 30, dlgY + 30, { size: 8, color: noCol });
    drawText(ctx, (confirmCursor === 1 ? '▶ ' : '  ') + t('saveSlots.yes'),
      dlgX + 95, dlgY + 30, { size: 8, color: yesCol });
  }

  return {
    enter(): void {
      rebuildSlots();
      subState = 'list';
      confirmCursor = 0;
      savedFlash = 0;

      const cur = getCurrentSlot();
      if (saveSlotsMode === 'save' && cur !== null) {
        const di = allSlots.findIndex(m => m?.slot === cur);
        selectedIndex = di >= 0 ? di : 0;
      } else {
        const firstOccupied = allSlots.findIndex(s => s !== null);
        selectedIndex = firstOccupied >= 0 ? firstOccupied : 0;
      }
      scrollOffset = 0;
      clampScroll();

      // Preload sprites
      for (const meta of getSlotIndex()) {
        if (meta.firstPokemonId) {
          loadImage(`/sprites/pokemon/icons/${meta.firstPokemonId}.png`).catch(() => {});
        }
      }
      loadCharacterSprites().catch(() => {});
    },

    exit(): void {},

    update(dt: number): void {
      if (savedFlash > 0) {
        savedFlash -= dt;
        if (savedFlash <= 0) goBack();
        return;
      }

      if (subState === 'list') {
        if (input.isKeyPressed('ArrowUp')) {
          selectedIndex = (selectedIndex - 1 + MAX_SAVE_SLOTS) % MAX_SAVE_SLOTS;
          clampScroll();
        }
        if (input.isKeyPressed('ArrowDown')) {
          selectedIndex = (selectedIndex + 1) % MAX_SAVE_SLOTS;
          clampScroll();
        }
        if (input.isKeyPressed('Escape') || input.isKeyPressed('Backspace')) {
          goBack();
          return;
        }
        if (input.isKeyPressed('Enter')) {
          const slot = allSlots[selectedIndex];
          if (saveSlotsMode === 'load') {
            if (slot) {
              loadGameFromSlot(slot.slot);
              stateMachine.change('OVERWORLD');
            }
          } else {
            if (slot) {
              subState = 'confirm_overwrite';
              confirmCursor = 0;
            } else {
              doSave(getActualSlot(selectedIndex));
            }
          }
          return;
        }
        if (input.isKeyPressed('r') || input.isKeyPressed('R')) {
          if (allSlots[selectedIndex]) {
            subState = 'confirm_delete';
            confirmCursor = 0;
          }
          return;
        }
      } else {
        if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('ArrowRight')) {
          confirmCursor = 1 - confirmCursor;
        }
        if (input.isKeyPressed('Escape') || input.isKeyPressed('Backspace')) {
          subState = 'list';
          return;
        }
        if (input.isKeyPressed('Enter')) {
          if (confirmCursor === 1) {
            if (subState === 'confirm_overwrite') {
              doSave(getActualSlot(selectedIndex));
            } else {
              deleteSave(getActualSlot(selectedIndex));
              rebuildSlots();
              subState = 'list';
            }
          } else {
            subState = 'list';
          }
          confirmCursor = 0;
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#0a0a1a');

      // Header bar
      fillRect(ctx, 0, 0, W, SLOTS_START_Y, '#12122a');
      const title = saveSlotsMode === 'save' ? t('saveSlots.titleSave') : t('saveSlots.titleLoad');
      drawText(ctx, title, W / 2, 3, { size: 8, color: '#ffcb05', align: 'center' });

      // Scroll arrows
      if (scrollOffset > 0) {
        drawText(ctx, '▲', W - 10, SLOTS_START_Y + 1, { size: 6, color: '#666688' });
      }
      if (scrollOffset + VISIBLE < MAX_SAVE_SLOTS) {
        drawText(ctx, '▼', W - 10, FOOTER_Y - 8, { size: 6, color: '#666688' });
      }

      // Slot rows
      for (let vi = 0; vi < VISIBLE; vi++) {
        const si = scrollOffset + vi;
        drawSlotBox(ctx, vi, allSlots[si], si, si === selectedIndex);
      }

      // Footer hint
      fillRect(ctx, 0, FOOTER_Y, W, H - FOOTER_Y, '#0a0a18');
      const hint = saveSlotsMode === 'save' ? t('saveSlots.hintSave') : t('saveSlots.hintLoad');
      drawText(ctx, hint, W / 2, FOOTER_Y + 3, { size: 5, color: '#444466', align: 'center' });

      // Confirmation dialog overlay
      if (subState === 'confirm_overwrite' || subState === 'confirm_delete') {
        drawConfirmDialog(ctx);
      }

      // "Saved!" flash overlay
      if (savedFlash > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);
        drawText(ctx, t('saveSlots.saved'), W / 2, H / 2 - 6, {
          size: 10,
          color: '#44ff88',
          align: 'center',
        });
      }
    },
  };
}
