/**
 * BagScene — Full-screen item inventory with category tabs.
 * Pixel-perfect layout from screens_figma/bag_coordinated.md (240×160).
 *
 * Controls: Up/Down navigate items, Left/Right switch categories, Enter use, Esc back.
 */

import type { Scene, Pokemon } from '../types/index.js';
import type { InputManager } from '../engine/input';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawText, drawRect } from '../engine/renderer.js';
import { t, getLocale, isRTL } from '../i18n/i18n.js';
import { getPlayerData, autoSave } from '../systems/game-state.js';
import { ITEMS, getItem, type ItemDef, type ItemCategory } from '../data/items.js';
import { drawItemIcon, getItemIconStyle } from '../ui/item-icons.js';
import {
  applyItemEffect,
  applyDirectItemEffect,
  consumeItem,
  isItemConsumable,
  itemTargetsPokemon,
  isDirectUseItem,
} from '../systems/item-effects.js';
import { setPartyMode, selectedPartyIndex, clearSelectedPartyIndex } from './party';
import {
  getPokemonDisplayName,
  getLocalizedName,
  getMoveDisplayName,
  getMove,
  canLearnViaTM,
  getLearnLevelForMove,
} from '../services/pokemon-data.js';
import { getDamageClassLabel } from '../data/type-constants.js';
import { getGlobalAudio } from '../audio/audio-manager.js';
import { setEvolutionData } from './evolution.js';
import { getTMEffect } from '../data/item-defs.js';
import {
  createMoveLearningQueueState,
  initializeMoveLearningQueue,
  nextMoveLearningQueueStep,
  resetMoveLearningQueueState,
  setMoveLearningSession,
} from '../systems/move-learning.js';
import { uiRegistry } from '../engine/input/uiRegistry.js';
import { CANVAS_WIDTH, LOGICAL_WIDTH } from '../engine/config.js';
import { createPartyReactScene } from '../scenesReact/party/index.js';
// Screen is 240×160 — all coordinates hardcoded from bag_coordinated.md

/* ── Battle integration exports ────────────────────────────────────── */

type BagMode = 'overworld' | 'battle';
let bagMode: BagMode = 'overworld';

export let pendingItem: { itemId: string; def: ItemDef } | null = null;

export function setBagMode(mode: BagMode): void {
  bagMode = mode;
}
export function clearPendingItem(): void {
  pendingItem = null;
}

/* ── Colors (from canvas_coordinates.md) ──────────────────────────── */

const C = {
  BG: '#0d1a14',
  CARD_BG: '#0f2a1a',
  CARD_SEL: '#1a3a2a',
  BORDER: '#1a4a30',
  BORDER_SEL: '#2a6a40',
  SEP: '#1a3a2a',
  TEXT_PRI: '#ffffff',
  TEXT_SEC: '#aaccaa',
  TEXT_MUT: '#667766',
  TEXT_DIM: '#445544',
  TAB_BG: '#0a2a1a',
  TAB_ACT: '#1a5a35',
  TITLE_BG: '#0a1a10',
  BTM_BG: '#0a1a10',
  KEY_BG: '#1a3a2a',
  KEY_BRD: '#2a5a3a',
  KEY_BG_HOVER: '#1a5a35',
  KEY_BRD_HOVER: '#2a6a40',
  KEY_BG_ACTIVE: '#1a7a55',
  KEY_BRD_ACTIVE: '#2a8a60',
  SEL_BAR: '#20d860',
  USE_BTN_BG: '#1a5a35',
  USE_BTN_BRD: '#2a6a40',
};

/* ── Category tabs ────────────────────────────────────────────────── */

interface BagTab {
  labelKey: string;
  categories: ItemCategory[];
  x: number;
  w: number; // from coordinate table
}

const BAG_TABS: BagTab[] = [
  { labelKey: 'bag.category.medicine', categories: ['healing', 'status-cure', 'revival', 'pp-restore'], x: 188, w: 46 },
  { labelKey: 'bag.category.balls', categories: ['pokeball'], x: 155, w: 30 },
  { labelKey: 'bag.category.general', categories: ['battle', 'evolution', 'held'], x: 122, w: 30 },
  { labelKey: 'bag.category.vitamins', categories: ['vitamin'], x: 82, w: 38 },
  { labelKey: 'bag.category.moves', categories: ['machine'], x: 44, w: 36 },
  { labelKey: 'bag.category.key', categories: ['key'], x: 6, w: 36 },
];

/* ── Layout constants (from bag_coordinated.md) ───────────────────── */

const ITEM_Y0 = 28; // first card Y
const ITEM_H = 16; // card height
const ITEM_STRIDE = 17; // card + 1px gap
const MAX_VISIBLE = 5; // cards visible before separator

export function createBagScene(input: InputManager, stateMachine: StateMachine): Scene {
  let tabIndex = 0;
  let itemIndex = 0;
  let message = '';
  let messageTimer = 0;
  let waitingForPartyTarget = false;
  let pendingOverworldItemId: string | null = null;
  const pendingMoveLearning = createMoveLearningQueueState();

  // TM natural-level warning state (yes/no confirmation)
  interface TMWarningState {
    itemId: string;
    tmEffect: { moveId: number; isHM: boolean };
    pokemon: Pokemon;
    partyIndex: number;
    choiceIndex: number; // 0 = Yes (save TM), 1 = No (teach anyway)
  }
  let tmWarning: TMWarningState | null = null;

  function getTabItems(): { id: string; def: ItemDef; qty: number }[] {
    const player = getPlayerData();
    const tab = BAG_TABS[tabIndex];
    const result: { id: string; def: ItemDef; qty: number }[] = [];
    for (const [id, qty] of Object.entries(player.items)) {
      if (qty <= 0) continue;
      const def = ITEMS[id] ?? getItem(id);
      if (!def) continue;
      if (!tab.categories.includes(def.category)) continue;
      if (bagMode === 'battle' && !def.usableInBattle) continue;
      result.push({ id, def, qty });
    }
    // Moves tab: HMs first (isHM=true), then TMs; each group sorted by item id
    if (tab.categories.includes('machine')) {
      result.sort((a, b) => {
        const aHM = getTMEffect(a.id)?.isHM ?? false;
        const bHM = getTMEffect(b.id)?.isHM ?? false;
        if (aHM !== bHM) return aHM ? -1 : 1;
        return a.id.localeCompare(b.id);
      });
    }
    return result;
  }

  // ── TM Teaching helpers ──────────────────────────────────────────────

  function handleTMTeaching(
    itemId: string,
    tmEffect: { moveId: number; isHM: boolean },
    pokemon: Pokemon,
    partyIndex: number,
  ): void {
    const moveName = getMoveDisplayName(tmEffect.moveId);
    const pokemonName = getPokemonDisplayName(pokemon.id);

    if (!canLearnViaTM(pokemon.id, tmEffect.moveId)) {
      message = t('bag.tm.cantLearn', { name: pokemonName, move: moveName });
      messageTimer = 1.0;
      return;
    }

    if (pokemon.moves.some((m) => m.id === tmEffect.moveId)) {
      message = t('bag.tm.alreadyKnows', { name: pokemonName, move: moveName });
      messageTimer = 1.0;
      return;
    }

    if (pokemon.moves.length >= 8) {
      // Full moveset — open the move-replacement screen so the player can swap one out
      initializeMoveLearningQueue(
        pendingMoveLearning,
        partyIndex,
        pokemon.id,
        [{ moveId: tmEffect.moveId, learned: false }],
        null,
      );
      return;
    }

    const naturalLevel = getLearnLevelForMove(pokemon.id, tmEffect.moveId);
    if (naturalLevel !== null && naturalLevel > pokemon.level) {
      tmWarning = { itemId, tmEffect, pokemon, partyIndex, choiceIndex: 0 };
      return;
    }

    teachTMNow(itemId, tmEffect, pokemon);
  }

  function teachTMNow(itemId: string, tmEffect: { moveId: number; isHM: boolean }, pokemon: Pokemon): void {
    const pd = getPlayerData();
    const result = applyItemEffect(itemId, pokemon);
    // TMs and HMs are NOT consumed — skip consumeItem
    if (result.success) {
      autoSave();
      const moveName = getMoveDisplayName(tmEffect.moveId);
      const pokeName = getPokemonDisplayName(pokemon.id);
      message = t('bag.tm.learned', { name: pokeName, move: moveName });
      messageTimer = 1.5;
    } else if (result.message === 'no-space') {
      const pokeName = getPokemonDisplayName(pokemon.id);
      const moveName = getMoveDisplayName(tmEffect.moveId);
      message = t('bag.tm.noSpace', { name: pokeName, move: moveName });
      messageTimer = 1.5;
    } else {
      message = result.message;
      messageTimer = 1.5;
    }
    // Suppress unused var warning
    void pd;
  }

  function render(ctx: CanvasRenderingContext2D): void {
    clearScreen(ctx, C.BG);
    const items = getTabItems();

    // ── Title bar (y=0, h=12) ──
    fillRect(ctx, 0, 0, 240, 12, C.TITLE_BG);
    // Bag icon box
    fillRect(ctx, 196, 2, 8, 8, C.CARD_BG);
    drawRect(ctx, 196, 2, 8, 8, C.BORDER);
    fillRect(ctx, 198, 4, 4, 4, C.BORDER);
    // Title text (right-aligned)
    drawText(ctx, t('bag.title'), 192, 2, { size: 10, color: C.TEXT_PRI, font: 'monospace', align: 'right' });

    // ── Category tabs (y=14, h=10) ──
    fillRect(ctx, 4, 14, 232, 10, C.TAB_BG);
    drawRect(ctx, 4, 14, 232, 10, C.BORDER);
    for (let i = 0; i < BAG_TABS.length; i++) {
      const tab = BAG_TABS[i];
      const isActive = i === tabIndex;
      if (isActive) {
        fillRect(ctx, tab.x, 14, tab.w, 10, C.TAB_ACT);
      }
      drawText(ctx, t(tab.labelKey), tab.x + tab.w / 2, 15, {
        size: 6,
        color: isActive ? C.TEXT_PRI : C.TEXT_MUT,
        font: 'monospace',
        align: 'center',
      });
    }

    // ── Item cards ──
    if (items.length === 0) {
      drawText(ctx, t('bag.noItems'), 120, 60, { size: 7, color: C.TEXT_MUT, font: 'monospace', align: 'center' });
    } else {
      const scrollOffset = Math.max(0, itemIndex - MAX_VISIBLE + 1);
      const visible = Math.min(items.length - scrollOffset, MAX_VISIBLE);

      for (let vi = 0; vi < visible; vi++) {
        const i = scrollOffset + vi;
        const item = items[i];
        const cy = ITEM_Y0 + vi * ITEM_STRIDE;
        const isSel = i === itemIndex;
        const style = getItemIconStyle(item.id);

        // Card bg + border
        fillRect(ctx, 4, cy, 232, ITEM_H, isSel ? C.CARD_SEL : C.CARD_BG);
        drawRect(ctx, 4, cy, 232, ITEM_H, isSel ? C.BORDER_SEL : C.BORDER);

        // Selection indicator (green bar on left)
        if (isSel) {
          fillRect(ctx, 4, cy, 2, ITEM_H, C.SEL_BAR);
        }

        // Icon box (at x=210, cy+3, 10×10)
        fillRect(ctx, 210, cy + 3, 10, 10, style.bg);
        drawRect(ctx, 210, cy + 3, 10, 10, style.stroke);
        // Draw mini icon inside the box
        drawItemIcon(ctx, item.id, 210, cy + 3, 10);

        // Item name — for TM/HM prepend move name: "TM06 Toxic"
        const rowTmEffect = getTMEffect(item.id);
        let itemDisplayName = getLocalizedName(item.def.name);
        if (rowTmEffect) {
          itemDisplayName = `${itemDisplayName} ${getMoveDisplayName(rowTmEffect.moveId)}`;
        }
        drawText(ctx, itemDisplayName, 206, cy + 2, {
          size: 7,
          color: C.TEXT_PRI,
          font: 'monospace',
          align: 'right',
        });

        // Item description — for TM/HM use move description; align to locale direction
        let rowSecondaryText = getLocalizedName(item.def.description);
        if (rowTmEffect) {
          const rowMoveData = getMove(rowTmEffect.moveId);
          if (rowMoveData?.description) {
            const raw = getLocalizedName(rowMoveData.description);
            rowSecondaryText = raw.length > 40 ? raw.slice(0, 37) + '\u2026' : raw;
          }
        }
        const rtl = isRTL();
        drawText(ctx, rowSecondaryText, rtl ? 206 : 28, cy + 10, {
          size: 5,
          color: isSel ? C.TEXT_MUT : C.TEXT_DIM,
          font: 'monospace',
          align: rtl ? 'right' : 'left',
        });

        // Key items: show ✓ (used) or □ (pending) instead of quantity
        if (item.def.category === 'key') {
          const kPd = getPlayerData();
          const kUsed = !!(item.def.usedFlag && kPd.flags[item.def.usedFlag]);
          drawText(ctx, kUsed ? '\u2713' : '\u25a1', 8, cy + 1, {
            size: 9,
            color: kUsed ? '#44cc88' : C.TEXT_MUT,
            font: 'monospace',
          });
        } else {
          // Qty × symbol + number (left side)
          drawText(ctx, '\u00d7', 8, cy + 2, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
          drawText(ctx, `${item.qty}`, 14, cy + 1, {
            size: 8,
            color: isSel ? C.SEL_BAR : C.TEXT_SEC,
            font: 'monospace',
          });
        }
      }

      // Scroll indicators
      if (scrollOffset > 0) {
        drawText(ctx, '\u25b2', 228, 26, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
      }
      if (scrollOffset + visible < items.length) {
        drawText(ctx, '\u25bc', 228, ITEM_Y0 + visible * ITEM_STRIDE - 4, {
          size: 6,
          color: C.TEXT_MUT,
          font: 'monospace',
        });
      }
    }

    // ── Separator ──
    fillRect(ctx, 8, 115, 224, 1, C.SEP);

    // ── Detail panel (y=118, h=28) — shows selected item info ──
    fillRect(ctx, 4, 118, 232, 28, C.TAB_BG);
    drawRect(ctx, 4, 118, 232, 28, C.BORDER);

    if (items.length > 0 && itemIndex < items.length) {
      const selItem = items[itemIndex];
      const selStyle = getItemIconStyle(selItem.id);

      // Detail icon (larger, at x=210, y=121, 14×14)
      fillRect(ctx, 210, 121, 14, 14, selStyle.bg);
      drawRect(ctx, 210, 121, 14, 14, selStyle.stroke);
      drawItemIcon(ctx, selItem.id, 211, 122, 12);

      // Selected item name (green, large, right-aligned)
      drawText(ctx, getLocalizedName(selItem.def.name), 206, 121, {
        size: 8,
        color: C.SEL_BAR,
        font: 'monospace',
        align: 'right',
      });

      // Full description (right-aligned) — key items show used state when their usedFlag is set
      const pd = getPlayerData();
      const isKeyUsed = !!(selItem.def.usedFlag && pd.flags[selItem.def.usedFlag]);
      const detailTmEffect = getTMEffect(selItem.id);
      const detailRtl = isRTL();
      if (detailTmEffect) {
        // TM/HM: show move stats + description
        const detailMoveData = getMove(detailTmEffect.moveId);
        if (detailMoveData) {
          const dcInfo = getDamageClassLabel(detailMoveData.damageClass);
          const pow =
            detailMoveData.power !== null && detailMoveData.power > 0 ? String(detailMoveData.power) : '\u2014';
          const acc = detailMoveData.accuracy !== null ? detailMoveData.accuracy + '%' : '\u2014';
          const statsText = `PWR:${pow}  ACC:${acc}  ${dcInfo.label}`;
          drawText(ctx, statsText, detailRtl ? 206 : 44, 127, {
            size: 5,
            color: dcInfo.color,
            font: 'monospace',
            align: detailRtl ? 'right' : 'left',
          });
          const rawDesc = getLocalizedName(detailMoveData.description);
          const desc = rawDesc.length > 46 ? rawDesc.slice(0, 43) + '\u2026' : rawDesc;
          drawText(ctx, desc, detailRtl ? 206 : 44, 136, {
            size: 5,
            color: C.TEXT_SEC,
            font: 'monospace',
            align: detailRtl ? 'right' : 'left',
          });
        }
      } else {
        let detailDesc = selItem.def.description;
        drawText(ctx, getLocalizedName(detailDesc), 206, 131, {
          size: 6,
          color: C.TEXT_SEC,
          font: 'monospace',
          align: 'right',
        });
        if (isKeyUsed) {
          drawText(ctx, getLocale() === 'he' ? '✓ נמסר' : '✓ Used', 8, 131, {
            size: 6,
            color: '#44cc88',
            font: 'monospace',
          });
        }
      }

      // Use button — hidden for key items (they can't be manually used)
      if (selItem.def.category !== 'key') {
        fillRect(ctx, 8, 122, 34, 12, C.USE_BTN_BG);
        drawRect(ctx, 8, 122, 34, 12, C.USE_BTN_BRD);
        drawText(ctx, t('bag.hint.use') || 'Use', 25, 124, {
          size: 7,
          color: C.SEL_BAR,
          font: 'monospace',
          align: 'center',
        });
      }
    }

    // ── Bottom bar (y=150, h=10) ──
    fillRect(ctx, 0, 150, 240, 10, C.BTM_BG);
    // ESC pill
    uiRegistry
      .registerRegion({
        id: 'esc-pill-bag',
        x: 9,
        y: 150,
        width: 20,
        height: 8,
        onSelect() {
          input.pressVirtualKey('Escape');
        },
      })
      .render(({ isHovered, isActive, x, y, width }) => {
        const bgColor = isActive ? C.KEY_BG_ACTIVE : isHovered ? C.KEY_BG_HOVER : C.KEY_BG;
        const borderColor = isActive ? C.KEY_BRD_ACTIVE : isHovered ? C.KEY_BRD_HOVER : C.KEY_BRD;
        drawText(ctx, 'ESC', x, y, {
          size: 6,
          color: C.TEXT_SEC,
          font: 'monospace',
          align: 'center',
          maxWidth: width,
          lineHeight: 5,
          rect: {
            paddingY: 1,
            bgColor: bgColor,
            borderColor: borderColor,
          },
        });
        drawText(ctx, t('party.hint.back'), x + width + 1, y + 1, {
          size: 6,
          color: C.TEXT_MUT,
          font: 'monospace',
        });
      });
    // Enter Button pill (use item) — hidden for key items
    uiRegistry
      .registerRegion({
        id: 'enter-pill-bag',
        x: 75,
        y: 150,
        width: 26,
        height: 8,
        onSelect() {
          input.pressVirtualKey('Enter');
        },
      })
      .render(({ isHovered, isActive, x, y, width }) => {
        const bgColor = isActive ? C.KEY_BG_ACTIVE : isHovered ? C.KEY_BG_HOVER : C.KEY_BG;
        const borderColor = isActive ? C.KEY_BRD_ACTIVE : isHovered ? C.KEY_BRD_HOVER : C.KEY_BRD;
        drawText(ctx, 'Enter', x, y, {
          size: 6,
          color: C.TEXT_SEC,
          font: 'monospace',
          align: 'center',
          rect: { bgColor: bgColor, borderColor: borderColor, paddingY: 1 },
          maxWidth: width,
          lineHeight: 5,
        });
        drawText(ctx, t('bag.hint.use'), x + width + 1, y + 1, {
          size: 6,
          color: C.TEXT_MUT,
          font: 'monospace',
        });
      });

    // Arrows pill button
    uiRegistry
      .registerRegion({
        id: 'arrows-pill-bag',
        x: 135,
        y: 150,
        width: 18,
        height: 8,
        onSelect({ gamePos, x, width }) {
          if (gamePos.x < x + width / 2) {
            input.pressVirtualKey('ArrowLeft');
          } else {
            input.pressVirtualKey('ArrowRight');
          }
        },
      })
      .render(({ isHovered, x, y, width, isActive }) => {
        const bgColor = isActive ? C.KEY_BG_ACTIVE : isHovered ? C.KEY_BG_HOVER : C.KEY_BG;
        const borderColor = isActive ? C.KEY_BRD_ACTIVE : isHovered ? C.KEY_BRD_HOVER : C.KEY_BRD;

        drawText(ctx, '\u25c0\u25b6', x, y, {
          size: 6,
          color: C.TEXT_SEC,
          font: 'monospace',
          align: 'center',
          maxWidth: width,
          lineHeight: 5,
          rect: { bgColor: bgColor, borderColor: borderColor, paddingY: 1 },
        });
        drawText(ctx, t('bag.hint.navigate'), x + width + 1, y + 1, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
      });

    // ── Message overlay ──
    if (messageTimer > 0) {
      drawText(ctx, message, LOGICAL_WIDTH / 2 - 200 / 2, 75, {
        maxWidth: 190,
        size: 7,
        color: C.TEXT_PRI,
        font: 'monospace',

        align: 'center',
        rect: {
          borderStyle: 'solid',
          bgColor: C.BG,
          borderColor: C.BORDER_SEL,
          paddingX: 5,
          paddingY: 5,
        },
      });
    }

    // ── TM natural-level warning overlay ──
    if (tmWarning) {
      const w = tmWarning;
      const pokeName = getPokemonDisplayName(w.pokemon.id);
      const moveName = getMoveDisplayName(w.tmEffect.moveId);
      const naturalLevel = getLearnLevelForMove(w.pokemon.id, w.tmEffect.moveId) ?? 0;
      const warnText = t('bag.tm.naturalWarn', { name: pokeName, move: moveName, level: naturalLevel });

      // Dialog box
      fillRect(ctx, 10, 40, 220, 80, C.CARD_BG);
      drawRect(ctx, 10, 40, 220, 80, C.BORDER_SEL);
      drawText(ctx, warnText, 120, 48, {
        size: 6,
        color: C.TEXT_PRI,
        font: 'monospace',
        align: 'center',
        maxWidth: 200,
      });

      // Yes / No buttons
      const yesColor = w.choiceIndex === 0 ? C.SEL_BAR : C.TEXT_MUT;
      const noColor = w.choiceIndex === 1 ? C.SEL_BAR : C.TEXT_MUT;
      fillRect(ctx, 40, 98, 60, 12, w.choiceIndex === 0 ? C.TAB_ACT : C.CARD_BG);
      drawRect(ctx, 40, 98, 60, 12, C.BORDER);
      drawText(ctx, t('npc.choice.yes'), 70, 101, { size: 7, color: yesColor, font: 'monospace', align: 'center' });
      fillRect(ctx, 140, 98, 60, 12, w.choiceIndex === 1 ? C.TAB_ACT : C.CARD_BG);
      drawRect(ctx, 140, 98, 60, 12, C.BORDER);
      drawText(ctx, t('npc.choice.no'), 170, 101, { size: 7, color: noColor, font: 'monospace', align: 'center' });
    }
  }

  function update(dt: number): void {
    // Handle TM natural-level warning (yes/no choice)
    if (tmWarning) {
      if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('ArrowRight')) {
        tmWarning.choiceIndex = tmWarning.choiceIndex === 0 ? 1 : 0;
      }
      if (input.isKeyPressed('Enter')) {
        const w = tmWarning;
        tmWarning = null;
        if (w.choiceIndex === 1) {
          // No — teach anyway
          teachTMNow(w.itemId, w.tmEffect, w.pokemon);
        }
        // Yes — save TM, do nothing
      }
      if (input.isKeyPressed('Escape')) {
        tmWarning = null;
      }
      return;
    }

    if (pendingMoveLearning.partyIndex !== null) {
      const pd = getPlayerData();
      const target = pd.party[pendingMoveLearning.partyIndex];

      if (messageTimer > 0) {
        messageTimer -= dt;
        if (messageTimer <= 0) message = '';
        return;
      }

      if (!target) {
        resetMoveLearningQueueState(pendingMoveLearning);
        return;
      }

      const moveLearningStep = nextMoveLearningQueueStep(pendingMoveLearning, () => {
        autoSave();
      });
      if (moveLearningStep.kind === 'show-message') {
        message = moveLearningStep.message;
        // todo: when wire mouse click set timer to 0.5
        messageTimer = 1.5;
        return;
      }
      if (moveLearningStep.kind === 'open-session') {
        // !CANVAS DEPERCATED : TODO : DELETE WHEN REACT END
        setPartyMode('move-learning');
        // !REACT NEW REFACTOR: DIDNT TESTED YET
        setMoveLearningSession(moveLearningStep.session);
        const partyScene = createPartyReactScene(stateMachine, {
          kind: 'move-learning',
          session: moveLearningStep.session,
        });
        stateMachine.register('PARTY', partyScene);
        stateMachine.push('PARTY');
        return;
      }
      if (moveLearningStep.kind === 'finish' && target && moveLearningStep.evolution) {
        setEvolutionData(target, moveLearningStep.evolution);
        stateMachine.push('EVOLUTION');
        return;
      }
      return;
    }

    // Handle return from party target selection
    if (waitingForPartyTarget && pendingOverworldItemId) {
      waitingForPartyTarget = false;
      const chosenIndex = selectedPartyIndex;
      clearSelectedPartyIndex();
      if (chosenIndex >= 0) {
        const pd = getPlayerData();
        const target = pd.party[chosenIndex];
        if (target) {
          // Check if this is a TM/HM — handle separately
          const tmEffect = getTMEffect(pendingOverworldItemId);
          if (tmEffect) {
            const itemIdForTM = pendingOverworldItemId;
            pendingOverworldItemId = null;
            handleTMTeaching(itemIdForTM, tmEffect, target, chosenIndex);
            return;
          }

          const result = applyItemEffect(pendingOverworldItemId, target);
          if (result.success) {
            if (isItemConsumable(pendingOverworldItemId)) {
              consumeItem(pd.items, pendingOverworldItemId);
            }
            autoSave();
            getGlobalAudio()?.playSFX('heal');
            if (result.newMoves && result.newMoves.length > 0) {
              const pokeName = getPokemonDisplayName(target.id);
              initializeMoveLearningQueue(
                pendingMoveLearning,
                chosenIndex,
                target.id,
                result.newMoves,
                result.evolution ?? null,
              );
              message = `${pokeName}: ${result.message}`;
              messageTimer = 2.0;
              pendingOverworldItemId = null;
              return;
            }
            if (result.evolution) {
              setEvolutionData(target, result.evolution);
              stateMachine.push('EVOLUTION');
              pendingOverworldItemId = null;
              return;
            }
            const pokeName = getPokemonDisplayName(target.id);
            message = `${pokeName}: ${result.message}`;
          } else {
            message = result.message;
          }
          messageTimer = 2.0;
        }
      }
      pendingOverworldItemId = null;
      return;
    }

    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) message = '';
      return;
    }

    if (input.isKeyPressed('Escape')) {
      stateMachine.pop();
      return;
    }

    const items = getTabItems();

    // Left/Right: switch category tabs
    if (input.isKeyPressed('ArrowLeft')) {
      tabIndex = tabIndex < BAG_TABS.length - 1 ? tabIndex + 1 : 0;
      itemIndex = 0;
      return;
    }
    if (input.isKeyPressed('ArrowRight')) {
      tabIndex = tabIndex > 0 ? tabIndex - 1 : BAG_TABS.length - 1;
      itemIndex = 0;
      return;
    }

    // Up/Down: navigate items
    if (input.isKeyPressed('ArrowUp')) {
      if (items.length > 0) {
        itemIndex = itemIndex > 0 ? itemIndex - 1 : items.length - 1;
      }
    }
    if (input.isKeyPressed('ArrowDown')) {
      if (items.length > 0) {
        itemIndex = itemIndex < items.length - 1 ? itemIndex + 1 : 0;
      }
    }

    // Enter: use item
    if (input.isKeyPressed('Enter')) {
      if (items.length > 0 && itemIndex < items.length) {
        const item = items[itemIndex];
        if (bagMode === 'battle') {
          pendingItem = { itemId: item.id, def: item.def };
          stateMachine.pop();
        } else if (item.def.usableInOverworld) {
          // Items that target a Pokemon: push PARTY scene in select-target mode
          const needsTarget = itemTargetsPokemon(item.id);
          if (needsTarget) {
            // For TMs: check if anyone in party can learn the move before opening party screen
            const tmCheckEffect = getTMEffect(item.id);
            if (tmCheckEffect) {
              const pd = getPlayerData();
              const moveName = getMoveDisplayName(tmCheckEffect.moveId);
              const anyCanLearn = pd.party.some(
                (p) => canLearnViaTM(p.id, tmCheckEffect.moveId) && !p.moves.some((m) => m.id === tmCheckEffect.moveId),
              );
              if (!anyCanLearn) {
                message = t('bag.tm.noneCanLearn', { move: moveName });
                messageTimer = 2.5;
                return;
              }
            }
            pendingOverworldItemId = item.id;
            waitingForPartyTarget = true;
            //! canvas version : delete when finish with react
            // setPartyMode('select-target', undefined, {
            //   itemId: item.id,
            //   itemName: getLocalizedName(item.def.name),
            //   description: getLocalizedName(item.def.description),
            // });
            // stateMachine.push('PARTY');

            //! React version : TODO : test it
            const partyScene = createPartyReactScene(stateMachine, {
              kind: 'select-target',
              itemId: item.id,
              itemName: getLocalizedName(item.def.name),
              description: getLocalizedName(item.def.description),

              // isEligible: (p) => !p.heldItemId,
            });
            // Register it transiently and push
            stateMachine.register('PARTY', partyScene);
            stateMachine.push('PARTY');
          } else if (isDirectUseItem(item.id)) {
            // Direct-use items (e.g. pokedex-battery, battle-helper) — no Pokemon target needed
            const result = applyDirectItemEffect(item.id);
            if (result.success) {
              const bagPd = getPlayerData();
              if (isItemConsumable(item.id)) {
                consumeItem(bagPd.items, item.id);
              }
              autoSave();
            }
            message = result.message;
            messageTimer = 2.5;
          } else {
            // Non-usable items
            message = t('bag.cantUseHere');
            messageTimer = 1.5;
          }
        } else if (item.def.category === 'held') {
          waitingForPartyTarget = true;
          //! canvas : old version (delete after react version is tested)
          // setPartyMode(
          //   'select-target',
          //   (index) => {
          //     const pd = getPlayerData();
          //     const pokemon = pd.party[index];
          //     if (!pokemon) return false;
          //     if (pokemon.heldItemId) {
          //       message = t('bag.heldItem.equippedAlready', { name: getPokemonDisplayName(pokemon.id) });
          //       messageTimer = 2.0;
          //       return false;
          //     }

          //     pokemon.heldItemId = item.id;
          //     consumeItem(pd.items, item.id);
          //     autoSave();
          //     const pokeName = getPokemonDisplayName(pokemon.id);
          //     const itemName = getLocalizedName(item.def.name);
          //     message = t('bag.heldItem.equipped', { name: pokeName, item: itemName });
          //     messageTimer = 2.0;
          //     return true;
          //   },
          //   {
          //     itemId: item.id,
          //     itemName: getLocalizedName(item.def.name),
          //     description: getLocalizedName(item.def.description),
          //     isEligible: (pokemon: any) => !pokemon.heldItemId,
          //   },
          // );
          // stateMachine.push('PARTY');
          // ! React version : TODO : test it
          const partyScene = createPartyReactScene(stateMachine, {
            kind: 'select-target',
            itemId: item.id,
            itemName: getLocalizedName(item.def.name),
            description: getLocalizedName(item.def.description),
            isEligible: (pokemon) => !pokemon.heldItemId,
            onSelect: (index) => {
              const pd = getPlayerData();
              const pokemon = pd.party[index];
              if (!pokemon) return false;
              if (pokemon.heldItemId) {
                message = t('bag.heldItem.equippedAlready', { name: getPokemonDisplayName(pokemon.id) });
                messageTimer = 2.0;
                return false;
              }
              pokemon.heldItemId = item.id;
              consumeItem(pd.items, item.id);
              autoSave();
              message = t('bag.heldItem.equipped', {
                name: getPokemonDisplayName(pokemon.id),
                item: getLocalizedName(item.def.name),
              });
              messageTimer = 2.0;
              return true;
            },
          });
          stateMachine.register('PARTY', partyScene);
          stateMachine.push('PARTY');
          return;
        } else {
          message = t('bag.cantUseHere');
          messageTimer = 1.5;
        }
      }
    }
  }

  return {
    enter(): void {
      tabIndex = 0;
      itemIndex = 0;
      message = '';
      messageTimer = 0;
      pendingItem = null;
      waitingForPartyTarget = false;
      pendingOverworldItemId = null;
      tmWarning = null;
      resetMoveLearningQueueState(pendingMoveLearning);
    },
    exit(): void {},
    update(dt: number): void {
      update(dt);
    },
    render(ctx: CanvasRenderingContext2D): void {
      render(ctx);
    },
  };
}
