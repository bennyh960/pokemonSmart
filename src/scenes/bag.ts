/**
 * BagScene — Full-screen item inventory with category tabs.
 * Pixel-perfect layout from screens_figma/bag_coordinated.md (240×160).
 *
 * Controls: Up/Down navigate items, Left/Right switch categories, Enter use, Esc back.
 */

import type { Scene, Pokemon } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawText, drawRect } from '../engine/renderer.js';
import { t, getLocale } from '../i18n/i18n.js';
import { getPlayerData, autoSave } from '../systems/game-state.js';
import { ITEMS, type ItemDef, type ItemCategory } from '../data/items.js';
import { drawItemIcon, getItemIconStyle } from '../ui/item-icons.js';
import { applyItemEffect, applyDirectItemEffect, consumeItem, isItemConsumable, itemTargetsPokemon, isDirectUseItem } from '../systems/item-effects.js';
import { setPartyMode, selectedPartyIndex, clearSelectedPartyIndex } from '../scenes/party.js';
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
  { labelKey: 'bag.category.medicine', categories: ['healing', 'status-cure', 'revival'], x: 188, w: 46 },
  { labelKey: 'bag.category.balls', categories: ['pokeball'], x: 155, w: 30 },
  { labelKey: 'bag.category.battle', categories: ['battle'], x: 124, w: 28 },
  { labelKey: 'bag.category.vitamins', categories: ['vitamin'], x: 84, w: 38 },
  { labelKey: 'bag.category.moves', categories: ['machine'], x: 46, w: 36 },
  { labelKey: 'bag.category.key', categories: ['key'], x: 8, w: 36 },
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
    choiceIndex: number; // 0 = Yes (save TM), 1 = No (teach anyway)
  }
  let tmWarning: TMWarningState | null = null;

  function getTabItems(): { id: string; def: ItemDef; qty: number }[] {
    const player = getPlayerData();
    const tab = BAG_TABS[tabIndex];
    const result: { id: string; def: ItemDef; qty: number }[] = [];
    for (const [id, qty] of Object.entries(player.items)) {
      if (qty <= 0) continue;
      const def = ITEMS[id];
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

  function handleTMTeaching(itemId: string, tmEffect: { moveId: number; isHM: boolean }, pokemon: Pokemon): void {
    const moveName = getMoveDisplayName(tmEffect.moveId);
    const pokemonName = getPokemonDisplayName(pokemon.id);

    if (!canLearnViaTM(pokemon.id, tmEffect.moveId)) {
      message = t('bag.tm.cantLearn', { name: pokemonName, move: moveName });
      messageTimer = 2.0;
      return;
    }

    if (pokemon.moves.some((m) => m.id === tmEffect.moveId)) {
      message = t('bag.tm.alreadyKnows', { name: pokemonName, move: moveName });
      messageTimer = 2.0;
      return;
    }

    if (pokemon.moves.length >= 8) {
      message = t('bag.tm.noSpace', { name: pokemonName, move: moveName });
      messageTimer = 2.0;
      return;
    }

    const naturalLevel = getLearnLevelForMove(pokemon.id, tmEffect.moveId);
    if (naturalLevel !== null && naturalLevel > pokemon.level) {
      tmWarning = { itemId, tmEffect, pokemon, choiceIndex: 0 };
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
      messageTimer = 2.5;
    } else if (result.message === 'no-space') {
      const pokeName = getPokemonDisplayName(pokemon.id);
      const moveName = getMoveDisplayName(tmEffect.moveId);
      message = t('bag.tm.noSpace', { name: pokeName, move: moveName });
      messageTimer = 2.0;
    } else {
      message = result.message;
      messageTimer = 2.0;
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

        // Item name (right-aligned at x=206, cy+2)
        drawText(ctx, getLocalizedName(item.def.name), 206, cy + 2, {
          size: 7,
          color: C.TEXT_PRI,
          font: 'monospace',
          align: 'right',
        });

        // Item description (right-aligned at x=206, cy+10)
        // For TM/HM items show the move's actual description instead of "Teaches X"
        const rowTmEffect = getTMEffect(item.id);
        let rowSecondaryText = getLocalizedName(item.def.description);
        if (rowTmEffect) {
          const rowMoveData = getMove(rowTmEffect.moveId);
          if (rowMoveData?.description) {
            const raw = rowMoveData.description;
            rowSecondaryText = raw.length > 40 ? raw.slice(0, 37) + '\u2026' : raw;
          }
        }
        drawText(ctx, rowSecondaryText, 206, cy + 10, {
          size: 5,
          color: isSel ? C.TEXT_MUT : C.TEXT_DIM,
          font: 'monospace',
          align: 'right',
        });

        // Qty × symbol + number (left side)
        drawText(ctx, '\u00d7', 8, cy + 2, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
        drawText(ctx, `${item.qty}`, 14, cy + 1, { size: 8, color: isSel ? C.SEL_BAR : C.TEXT_SEC, font: 'monospace' });
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
      if (detailTmEffect) {
        // TM/HM: show move stats + description
        const detailMoveData = getMove(detailTmEffect.moveId);
        if (detailMoveData) {
          const dcInfo = getDamageClassLabel(detailMoveData.damageClass);
          const pow = detailMoveData.power !== null && detailMoveData.power > 0 ? String(detailMoveData.power) : '\u2014';
          const acc = detailMoveData.accuracy !== null ? detailMoveData.accuracy + '%' : '\u2014';
          drawText(ctx, `PWR:${pow}  ACC:${acc}  ${dcInfo.label}`, 206, 127, {
            size: 5,
            color: dcInfo.color,
            font: 'monospace',
            align: 'right',
          });
          const rawDesc = detailMoveData.description;
          const desc = rawDesc.length > 46 ? rawDesc.slice(0, 43) + '\u2026' : rawDesc;
          drawText(ctx, desc, 206, 136, {
            size: 5,
            color: C.TEXT_SEC,
            font: 'monospace',
            align: 'right',
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
    fillRect(ctx, 8, 151, 20, 8, C.KEY_BG);
    drawRect(ctx, 8, 151, 20, 8, C.KEY_BRD);
    drawText(ctx, 'ESC', 18, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('party.hint.back'), 30, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    // Enter pill
    fillRect(ctx, 62, 151, 26, 8, C.KEY_BG);
    drawRect(ctx, 62, 151, 26, 8, C.KEY_BRD);
    drawText(ctx, 'Enter', 75, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('bag.hint.use') || 'Use', 90, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });
    // Arrows pill
    fillRect(ctx, 126, 151, 18, 8, C.KEY_BG);
    drawRect(ctx, 126, 151, 18, 8, C.KEY_BRD);
    drawText(ctx, '\u25c0\u25b6', 135, 152, { size: 6, color: C.TEXT_SEC, font: 'monospace', align: 'center' });
    drawText(ctx, t('bag.hint.navigate') || 'Nav', 146, 153, { size: 6, color: C.TEXT_MUT, font: 'monospace' });

    // ── Message overlay ──
    if (messageTimer > 0) {
      fillRect(ctx, 20, 70, 200, 20, C.BG);
      drawRect(ctx, 20, 70, 200, 20, C.BORDER_SEL);
      drawText(ctx, message, 120, 75, { size: 7, color: C.TEXT_PRI, font: 'monospace', align: 'center' });
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
        messageTimer = 2.0;
        return;
      }
      if (moveLearningStep.kind === 'open-session') {
        setPartyMode('move-learning');
        setMoveLearningSession(moveLearningStep.session);
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
            handleTMTeaching(itemIdForTM, tmEffect, target);
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
            pendingOverworldItemId = item.id;
            waitingForPartyTarget = true;
            setPartyMode('select-target', undefined, {
              itemId: item.id,
              itemName: getLocalizedName(item.def.name),
              description: getLocalizedName(item.def.description),
            });
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
