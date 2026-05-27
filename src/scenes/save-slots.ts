/**
 * SaveSlotsScene - Save/Load slot selection screen.
 * Up to MAX_SAVE_SLOTS slots. Each slot can have an optional 4-digit PIN.
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, drawText, fillRect, fillRoundRect, strokeRoundRect } from '../engine/renderer.js';
import { getSlotIndex, deleteSave, MAX_SAVE_SLOTS, setSlotPin, type SaveSlotMeta } from '../systems/save.js';
import { getCurrentSlot, loadGameFromSlot, saveToSlot } from '../systems/game-state.js';
import { signOut } from '../auth/auth-service.js';
import { loadCharacterSprites, getCharacterFrame } from '../engine/character-sprites.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { t, isRTL } from '../i18n/i18n.js';
import { LOGICAL_WIDTH as W, LOGICAL_HEIGHT as H, ADMIN_NAME } from '../engine/config.js';
import { getQuest } from '../data/story/quests.js';
import { fontFor } from '../engine/fonts.js';

const VISIBLE = 5;
const SLOT_H = 26;
const SLOTS_START_Y = 14;
const SLOT_X = 4;
const SLOT_W = W - 8;
const FOOTER_Y = SLOTS_START_Y + VISIBLE * SLOT_H;

const MAX_PIN_ATTEMPTS = 5;
const PIN_FREEZE_MS = 10 * 60 * 1000;
const FREEZE_KEY_PREFIX = 'pokemon-math-pin-freeze-';

type SubState =
  | 'list'
  | 'confirm_overwrite'
  | 'confirm_delete'
  | 'pin_prompt'
  | 'pin_setup'
  | 'pin_setup_confirm';

export type SaveSlotsMode = 'load' | 'save';

let saveSlotsMode: SaveSlotsMode = 'load';
let saveSlotsFromTitle = false;

export function openSaveSlots(mode: SaveSlotsMode, fromTitle = false): void {
  saveSlotsMode = mode;
  saveSlotsFromTitle = fromTitle;
}

// ---------------------------------------------------------------------------
// PIN freeze helpers (localStorage so they survive tab refresh)
// ---------------------------------------------------------------------------

function getFreezeExpiry(slot: number): number {
  const raw = localStorage.getItem(`${FREEZE_KEY_PREFIX}${slot}`);
  return raw ? parseInt(raw, 10) : 0;
}

function setFreeze(slot: number): void {
  localStorage.setItem(`${FREEZE_KEY_PREFIX}${slot}`, String(Date.now() + PIN_FREEZE_MS));
}

function isFrozen(slot: number): boolean {
  return getFreezeExpiry(slot) > Date.now();
}

function freezeMinutesLeft(slot: number): number {
  return Math.ceil((getFreezeExpiry(slot) - Date.now()) / 60000);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatAge(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxPx: number, fontSize: number): string {
  ctx.save();
  ctx.font = `${fontSize}px ${fontFor(text)}`;
  if (ctx.measureText(text).width <= maxPx) { ctx.restore(); return text; }
  let s = text;
  while (s.length > 0 && ctx.measureText(s + '…').width > maxPx) s = s.slice(0, -1);
  ctx.restore();
  return s + '…';
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export function createSaveSlotsScene(input: InputManager, stateMachine: StateMachine): Scene {
  let allSlots: (SaveSlotMeta | null)[] = Array(MAX_SAVE_SLOTS).fill(null);
  let selectedIndex = 0;
  let scrollOffset = 0;
  let subState: SubState = 'list';
  let confirmCursor = 0;
  let savedFlash = 0;
  let isAdminSession = false;

  // PIN state
  let pinBuffer = '';
  let pinSetupFirst = '';
  let pinAttempts = 0;
  let pinSlot = 0;
  let pinOnSuccess: (() => void) | null = null;
  let pinOnSetupDone: ((pin: string | null | undefined) => void) | null = null;
  let pinError = '';
  let pinListener: ((e: KeyboardEvent) => void) | null = null;
  let pinFlash = 0;
  let pinFlashMessage = '';

  function rebuildSlots(): void {
    const occupied = getSlotIndex()
      .filter((m) => m.slot >= 0 && m.slot < MAX_SAVE_SLOTS)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    allSlots = [...occupied, ...Array(MAX_SAVE_SLOTS - occupied.length).fill(null)];
    isAdminSession = occupied.some((m) => m.playerName === ADMIN_NAME);
  }

  function firstFreeSlot(): number {
    const used = new Set(allSlots.filter(Boolean).map((m) => (m as SaveSlotMeta).slot));
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) { if (!used.has(i)) return i; }
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
    if (saveSlotsFromTitle) stateMachine.change('TITLE');
    else stateMachine.pop();
  }

  function doSave(slot: number, newPin?: string | null): void {
    saveToSlot(slot, true); // explicit user save — bypass throttle
    if (newPin !== undefined) setSlotPin(slot, newPin);
    rebuildSlots();
    subState = 'list';
    savedFlash = 1.2;
  }

  // ---------------------------------------------------------------------------
  // PIN helpers
  // ---------------------------------------------------------------------------

  function startPinInput(): void {
    pinBuffer = '';
    stopPinInput();
    pinListener = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key) && pinBuffer.length < 4) {
        pinBuffer += e.key;
        pinError = '';
      } else if (e.key === 'Backspace') {
        pinBuffer = pinBuffer.slice(0, -1);
      }
    };
    window.addEventListener('keydown', pinListener);
  }

  function stopPinInput(): void {
    if (pinListener) { window.removeEventListener('keydown', pinListener); pinListener = null; }
  }

  function enterPinPrompt(meta: SaveSlotMeta, onSuccess: () => void): void {
    pinSlot = meta.slot;
    pinAttempts = 0;
    pinError = '';
    pinOnSuccess = onSuccess;
    if (!isFrozen(meta.slot)) startPinInput();
    subState = 'pin_prompt';
  }

  function enterPinSetup(actualSlot: number, onDone: (pin: string | null | undefined) => void): void {
    pinSlot = actualSlot;
    pinSetupFirst = '';
    pinError = '';
    pinOnSetupDone = onDone;
    startPinInput();
    subState = 'pin_setup';
  }

  function enterPinEdit(meta: SaveSlotMeta): void {
    const doApply = (newPin: string | null | undefined) => {
      if (newPin === undefined) return; // ESC = cancelled
      if (newPin === null && !meta.pin) return; // slot had no PIN and user skipped — no change
      setSlotPin(meta.slot, newPin); // null removes, string sets
      rebuildSlots();
      pinFlashMessage = newPin ? t('saveSlots.pinChanged') : t('saveSlots.pinRemoved');
      pinFlash = 1.5;
    };
    if (meta.pin) {
      enterPinPrompt(meta, () => enterPinSetup(meta.slot, doApply));
    } else {
      enterPinSetup(meta.slot, doApply);
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering helpers
  // ---------------------------------------------------------------------------

  function drawSlotBox(ctx: CanvasRenderingContext2D, vi: number, meta: SaveSlotMeta | null, si: number, isSelected: boolean): void {
    const slotY = SLOTS_START_Y + vi * SLOT_H;
    const isSaveTarget = saveSlotsMode === 'save' && isSelected && !meta;

    const bgColor = meta ? (isSelected ? '#1e2e5a' : '#141e3a') : (isSelected ? '#111e30' : '#0e0e1e');
    ctx.fillStyle = bgColor;
    fillRoundRect(ctx, SLOT_X, slotY + 1, SLOT_W, SLOT_H - 2, 3);

    if (isSelected) {
      ctx.strokeStyle = meta ? '#ffcb05' : (saveSlotsMode === 'save' ? '#44cc88' : '#445577');
      ctx.lineWidth = 1;
      strokeRoundRect(ctx, SLOT_X + 0.5, slotY + 1.5, SLOT_W - 1, SLOT_H - 3, 3);
    }

    if (meta) {
      const frame = getCharacterFrame(meta.heroCharacterId, 'down', 'stand');
      if (frame) ctx.drawImage(frame.image, frame.sx, frame.sy, frame.w, frame.h, SLOT_X + 4, slotY + 6, 14, 14);

      if (meta.firstPokemonId) {
        const icon = getCachedImage(`/sprites/pokemon/icons/${meta.firstPokemonId}.png`);
        if (icon) ctx.drawImage(icon, SLOT_X + 20, slotY + 6, 14, 14);
      }

      const slotLabel = isAdminSession ? `#${si + 1}  ls:${meta.slot}` : `#${si + 1}`;
      drawText(ctx, slotLabel, SLOT_X + 38, slotY + 3, { size: 5, color: '#444466' });

      if (meta.pin) drawText(ctx, t('saveSlots.pinProtected'), SLOT_X + 58, slotY + 3, { size: 5, color: '#44aacc' });

      const badgeLabel = t('saveSlots.badges', { count: meta.badgeCount ?? 0 });
      drawText(ctx, badgeLabel, SLOT_X + SLOT_W - 27, slotY + 3, { size: 5, color: '#556677', align: 'right' });

      const rtl = isRTL();
      drawText(ctx, meta.playerName, SLOT_X + 38, slotY + 11, { size: 7, color: isSelected ? '#ffffff' : '#bbccee', maxWidth: 100, direction: rtl ? 'rtl' : 'ltr' });
      drawText(ctx, formatAge(meta.savedAt), SLOT_X + SLOT_W - 26, slotY + 8, { size: 6, color: '#6688aa' });

      const questDef = meta.activeQuestId ? getQuest(meta.activeQuestId) : null;
      const rawQuest = questDef ? (rtl ? questDef.title.he : questDef.title.en) : t('saveSlots.noQuest');
      const questText = truncateText(ctx, rawQuest, SLOT_W - 38 - 26, 5);
      drawText(ctx, questText, SLOT_X + 38, slotY + 19, { size: 5, color: '#667788' });

      if (isSelected) {
        drawText(ctx, '[E]', SLOT_X + SLOT_W - 35, slotY + 19, { size: 5, color: '#44aacc' });
        drawText(ctx, '[R]', SLOT_X + SLOT_W - 18, slotY + 19, { size: 5, color: '#993333' });
      }
    } else {
      const label = isSaveTarget ? t('saveSlots.saveHere') : `#${si + 1}  ${t('saveSlots.empty')}`;
      drawText(ctx, label, W / 2, slotY + 10, { size: 6, color: isSaveTarget ? '#44cc88' : '#2a3a4a', align: 'center' });
    }
  }

  function drawConfirmDialog(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, W, H);

    const question = subState === 'confirm_overwrite' ? t('saveSlots.confirmOverwrite') : t('saveSlots.confirmDelete');
    const dlgW = 160; const dlgH = 52;
    const dlgX = (W - dlgW) / 2; const dlgY = (H - dlgH) / 2;

    ctx.fillStyle = '#141428';
    fillRoundRect(ctx, dlgX, dlgY, dlgW, dlgH, 5);
    ctx.strokeStyle = '#3355aa'; ctx.lineWidth = 1;
    strokeRoundRect(ctx, dlgX + 0.5, dlgY + 0.5, dlgW - 1, dlgH - 1, 5);

    drawText(ctx, question, W / 2, dlgY + 10, { size: 7, color: '#ffffff', align: 'center' });
    const noCol = confirmCursor === 0 ? '#ffcb05' : '#777799';
    const yesCol = confirmCursor === 1 ? '#ffcb05' : '#777799';
    drawText(ctx, (confirmCursor === 0 ? '▶ ' : '  ') + t('saveSlots.no'), dlgX + 30, dlgY + 30, { size: 8, color: noCol });
    drawText(ctx, (confirmCursor === 1 ? '▶ ' : '  ') + t('saveSlots.yes'), dlgX + 95, dlgY + 30, { size: 8, color: yesCol });
  }

  function drawPinModal(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);

    const isSetup = subState === 'pin_setup' || subState === 'pin_setup_confirm';
    const dlgW = 150;
    const dlgH = isSetup ? 80 : 62;
    const dlgX = (W - dlgW) / 2;
    const dlgY = (H - dlgH) / 2;

    ctx.fillStyle = '#141428';
    fillRoundRect(ctx, dlgX, dlgY, dlgW, dlgH, 5);
    ctx.strokeStyle = '#3355aa'; ctx.lineWidth = 1;
    strokeRoundRect(ctx, dlgX + 0.5, dlgY + 0.5, dlgW - 1, dlgH - 1, 5);

    // Title
    let title = '';
    if (subState === 'pin_prompt') title = t('saveSlots.enterPin');
    else if (subState === 'pin_setup') title = t('saveSlots.createPin');
    else title = t('saveSlots.confirmPin');
    drawText(ctx, title, W / 2, dlgY + 9, { size: 6, color: '#ffffff', align: 'center' });

    // Frozen state
    if (subState === 'pin_prompt' && isFrozen(pinSlot)) {
      drawText(ctx, t('saveSlots.pinFrozen', { min: String(freezeMinutesLeft(pinSlot)) }), W / 2, dlgY + 28, { size: 5, color: '#ff8844', align: 'center' });
      drawText(ctx, t('saveSlots.pinCancel'), W / 2, dlgY + 40, { size: 5, color: '#445566', align: 'center' });
      return;
    }

    // PIN dots (●●●● / ○○○○)
    const dotY = dlgY + 26;
    const spacing = 14;
    const startX = W / 2 - spacing * 1.5;
    for (let i = 0; i < 4; i++) {
      const x = startX + i * spacing;
      ctx.fillStyle = i < pinBuffer.length ? '#ffcb05' : '#223344';
      ctx.beginPath();
      ctx.arc(x, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Error / warning
    if (pinError) {
      drawText(ctx, pinError, W / 2, dlgY + 38, { size: 5, color: '#ff5544', align: 'center' });
    } else if (isSetup) {
      // Bilingual "save your PIN" reminder
      drawText(ctx, 'Save this PIN!', W / 2, dlgY + 38, { size: 5, color: '#ffaa33', align: 'center' });
      drawText(ctx, '!שמור את הקוד', W / 2, dlgY + 47, { size: 5, color: '#ffaa33', align: 'center', direction: 'rtl' });
    }

    if (subState === 'pin_setup') {
      drawText(ctx, t('saveSlots.pinSkip'), W / 2, dlgY + dlgH - 14, { size: 5, color: '#446688', align: 'center' });
    }
    drawText(ctx, t('saveSlots.pinConfirmFooter'), W / 2, dlgY + dlgH - 6, { size: 5, color: '#334455', align: 'center' });
  }

  // ---------------------------------------------------------------------------
  // Scene lifecycle
  // ---------------------------------------------------------------------------

  return {
    enter(): void {
      rebuildSlots();
      subState = 'list';
      confirmCursor = 0;
      savedFlash = 0;
      pinBuffer = '';
      pinError = '';
      pinFlash = 0;
      pinFlashMessage = '';
      stopPinInput();

      const cur = getCurrentSlot();
      if (saveSlotsMode === 'save' && cur !== null) {
        const di = allSlots.findIndex((m) => m?.slot === cur);
        selectedIndex = di >= 0 ? di : 0;
      } else {
        const firstOccupied = allSlots.findIndex((s) => s !== null);
        selectedIndex = firstOccupied >= 0 ? firstOccupied : 0;
      }
      scrollOffset = 0;
      clampScroll();

      for (const meta of getSlotIndex()) {
        if (meta.firstPokemonId) loadImage(`/sprites/pokemon/icons/${meta.firstPokemonId}.png`).catch(() => {});
      }
      loadCharacterSprites().catch(() => {});
    },

    exit(): void {
      stopPinInput();
    },

    update(dt: number): void {
      if (savedFlash > 0) {
        savedFlash -= dt;
        if (savedFlash <= 0) goBack();
        return;
      }
      if (pinFlash > 0) {
        pinFlash -= dt;
        return;
      }

      // ------ PIN PROMPT ------
      if (subState === 'pin_prompt') {
        if (isFrozen(pinSlot)) {
          if (input.isKeyPressed('Escape')) { subState = 'list'; pinOnSuccess = null; }
          return;
        }
        if (input.isKeyPressed('Escape')) {
          stopPinInput(); subState = 'list'; pinOnSuccess = null; pinError = '';
          return;
        }
        if (input.isKeyPressed('Enter')) {
          const meta = allSlots.find((m) => m?.slot === pinSlot);
          if (meta?.pin === pinBuffer) {
            stopPinInput();
            const cb = pinOnSuccess; pinOnSuccess = null;
            subState = 'list';
            cb?.();
          } else {
            pinAttempts++;
            pinBuffer = '';
            if (pinAttempts >= MAX_PIN_ATTEMPTS) {
              setFreeze(pinSlot);
              stopPinInput();
              pinError = '';
              subState = 'list'; pinOnSuccess = null;
            } else {
              pinError = t('saveSlots.pinWrong', { left: String(MAX_PIN_ATTEMPTS - pinAttempts) });
            }
          }
        }
        return;
      }

      // ------ PIN SETUP ------
      if (subState === 'pin_setup') {
        if (input.isKeyPressed('Escape')) {
          stopPinInput();
          const cb = pinOnSetupDone; pinOnSetupDone = null;
          subState = 'list'; cb?.(undefined); // undefined = cancelled (distinct from null = skip/remove)
          return;
        }
        if (input.isKeyPressed('Enter')) {
          if (pinBuffer.length === 0) {
            // Skip — save without PIN
            stopPinInput();
            const cb = pinOnSetupDone; pinOnSetupDone = null;
            subState = 'list'; cb?.(null);
          } else if (pinBuffer.length === 4) {
            pinSetupFirst = pinBuffer;
            startPinInput();
            subState = 'pin_setup_confirm';
          } else {
            pinError = t('saveSlots.createPin');
          }
        }
        return;
      }

      // ------ PIN SETUP CONFIRM ------
      if (subState === 'pin_setup_confirm') {
        if (input.isKeyPressed('Escape')) {
          startPinInput(); pinError = ''; subState = 'pin_setup';
          return;
        }
        if (input.isKeyPressed('Enter')) {
          if (pinBuffer === pinSetupFirst) {
            const pin = pinBuffer;
            stopPinInput();
            const cb = pinOnSetupDone; pinOnSetupDone = null;
            subState = 'list'; cb?.(pin);
          } else {
            pinError = t('saveSlots.pinMismatch');
            startPinInput();
            subState = 'pin_setup';
          }
        }
        return;
      }

      // ------ CONFIRM DIALOGS ------
      if (subState === 'confirm_overwrite' || subState === 'confirm_delete') {
        if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('ArrowRight')) confirmCursor = 1 - confirmCursor;
        if (input.isKeyPressed('Escape') || input.isKeyPressed('Backspace')) { subState = 'list'; return; }
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
        return;
      }

      // ------ LIST ------
      if (input.isKeyPressed('ArrowUp')) { selectedIndex = (selectedIndex - 1 + MAX_SAVE_SLOTS) % MAX_SAVE_SLOTS; clampScroll(); }
      if (input.isKeyPressed('ArrowDown')) { selectedIndex = (selectedIndex + 1) % MAX_SAVE_SLOTS; clampScroll(); }
      if (input.isKeyPressed('Escape') || input.isKeyPressed('Backspace')) { goBack(); return; }
      if (input.isKeyPressed('q') || input.isKeyPressed('Q')) {
        signOut().then(() => window.location.reload()).catch(() => window.location.reload());
        return;
      }

      if (input.isKeyPressed('r') || input.isKeyPressed('R')) {
        if (allSlots[selectedIndex]) { subState = 'confirm_delete'; confirmCursor = 0; }
        return;
      }
      if (input.isKeyPressed('e') || input.isKeyPressed('E')) {
        const meta = allSlots[selectedIndex];
        if (meta) enterPinEdit(meta);
        return;
      }

      if (input.isKeyPressed('Enter')) {
        const meta = allSlots[selectedIndex];

        if (saveSlotsMode === 'load') {
          if (!meta) return;
          if (meta.pin) {
            enterPinPrompt(meta, () => {
              loadGameFromSlot(meta.slot);
              stateMachine.change('OVERWORLD');
            });
          } else {
            loadGameFromSlot(meta.slot);
            stateMachine.change('OVERWORLD');
          }

        } else {
          // save mode
          const currentSlot = getCurrentSlot();

          if (!meta) {
            // Empty slot — PIN setup then save
            const actualSlot = getActualSlot(selectedIndex);
            enterPinSetup(actualSlot, (pin) => { doSave(actualSlot, pin); });

          } else if (meta.slot === currentSlot) {
            // Same slot — no PIN needed
            subState = 'confirm_overwrite'; confirmCursor = 0;

          } else if (meta.pin) {
            // Different occupied slot with PIN
            enterPinPrompt(meta, () => { subState = 'confirm_overwrite'; confirmCursor = 0; });

          } else {
            // Different occupied slot, no PIN
            subState = 'confirm_overwrite'; confirmCursor = 0;
          }
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#0a0a1a');

      fillRect(ctx, 0, 0, W, SLOTS_START_Y, '#12122a');
      const title = saveSlotsMode === 'save' ? t('saveSlots.titleSave') : t('saveSlots.titleLoad');
      drawText(ctx, title, W / 2, 3, { size: 8, color: '#ffcb05', align: 'center' });

      if (scrollOffset > 0) drawText(ctx, '▲', W - 10, SLOTS_START_Y + 1, { size: 6, color: '#666688' });
      if (scrollOffset + VISIBLE < MAX_SAVE_SLOTS) drawText(ctx, '▼', W - 10, FOOTER_Y - 8, { size: 6, color: '#666688' });

      for (let vi = 0; vi < VISIBLE; vi++) {
        const si = scrollOffset + vi;
        drawSlotBox(ctx, vi, allSlots[si], si, si === selectedIndex);
      }

      fillRect(ctx, 0, FOOTER_Y, W, H - FOOTER_Y, '#0a0a18');
      const hint = saveSlotsMode === 'save' ? t('saveSlots.hintSave') : t('saveSlots.hintLoad');
      drawText(ctx, hint, W / 2, FOOTER_Y + 3, { size: 5, color: '#444466', align: 'center' });

      if (subState === 'confirm_overwrite' || subState === 'confirm_delete') drawConfirmDialog(ctx);
      if (subState === 'pin_prompt' || subState === 'pin_setup' || subState === 'pin_setup_confirm') drawPinModal(ctx);

      if (savedFlash > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);
        drawText(ctx, t('saveSlots.saved'), W / 2, H / 2 - 6, { size: 10, color: '#44ff88', align: 'center' });
      }
      if (pinFlash > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, W, H);
        drawText(ctx, pinFlashMessage, W / 2, H / 2 - 6, { size: 9, color: '#44aaff', align: 'center' });
      }
    },
  };
}
