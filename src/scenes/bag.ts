/**
 * BagScene - Item inventory screen with category tabs.
 *
 * Shows items grouped into categories (Medicine, Balls, Battle, Vitamins, Key Items).
 * Supports full RTL layout for Hebrew and LTR for English.
 * Categories sidebar is 60px wide; the remainder shows the item list.
 *
 * Controls:
 *   Up/Down  - navigate items or categories
 *   Left/Right - switch between categories panel and items panel (flipped in RTL)
 *   Enter    - use/select item
 *   Escape   - go back
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawText, drawRect } from '../engine/renderer.js';
import { t, isRTL } from '../i18n/i18n.js';
import { getPlayerData } from '../systems/game-state.js';
import { ITEMS, type ItemDef, type ItemCategory } from '../data/items.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';

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

/** Bag tab definition — each tab groups one or more ItemCategory values. */
interface BagTab {
  labelKey: string;
  categories: ItemCategory[];
}

const BAG_TABS: BagTab[] = [
  { labelKey: 'bag.category.medicine', categories: ['healing', 'status-cure', 'revival'] },
  { labelKey: 'bag.category.balls',    categories: ['pokeball'] },
  { labelKey: 'bag.category.battle',   categories: ['battle'] },
  { labelKey: 'bag.category.vitamins', categories: ['vitamin'] },
  { labelKey: 'bag.category.key',      categories: ['key'] },
];

const SIDEBAR_W = 60;
const TITLE_H = 14;
const TAB_H = 14;
const ITEM_H = 14;
const HINT_H = 12;

type Focus = 'categories' | 'items';

export function createBagScene(input: InputManager, stateMachine: StateMachine): Scene {
  let tabIndex = 0;
  let itemIndex = 0;
  let focus: Focus = 'categories';
  let message = '';
  let messageTimer = 0;

  /** Get items for the currently selected tab that the player owns. */
  function getTabItems(): { def: ItemDef; qty: number }[] {
    const player = getPlayerData();
    const tab = BAG_TABS[tabIndex];
    const result: { def: ItemDef; qty: number }[] = [];
    for (const [id, qty] of Object.entries(player.items)) {
      if (qty <= 0) continue;
      const def = ITEMS[id];
      if (!def) continue;
      if (!tab.categories.includes(def.category)) continue;
      if (bagMode === 'battle' && !def.usableInBattle) continue;
      result.push({ def, qty });
    }
    return result;
  }

  function showMessage(msg: string): void {
    message = msg;
    messageTimer = 1.5;
  }

  // ── Rendering ────────────────────────────────────────────────

  function renderCategories(ctx: CanvasRenderingContext2D, sideX: number): void {
    // Sidebar background
    fillRect(ctx, sideX, TITLE_H, SIDEBAR_W, SCREEN_H - TITLE_H - HINT_H, '#1a1a3a');

    for (let i = 0; i < BAG_TABS.length; i++) {
      const y = TITLE_H + i * TAB_H;
      const isSelected = i === tabIndex;
      const isFocused = isSelected && focus === 'categories';

      const bgColor = isFocused ? '#4040a0' : isSelected ? '#303060' : '#1a1a3a';
      fillRect(ctx, sideX, y, SIDEBAR_W, TAB_H - 1, bgColor);

      if (isFocused) {
        drawRect(ctx, sideX, y, SIDEBAR_W, TAB_H - 1, '#8888ff', 1);
      }

      const label = t(BAG_TABS[i].labelKey);
      const rtl = isRTL();
      const textX = rtl ? sideX + SIDEBAR_W - 4 : sideX + 4;
      const textAlign: CanvasTextAlign = rtl ? 'right' : 'left';
      drawText(ctx, label, textX, y + 3, { size: 7, color: isSelected ? '#ffffff' : '#8888aa', align: textAlign });
    }
  }

  function renderItems(ctx: CanvasRenderingContext2D, panelX: number, panelW: number): void {
    // Items panel background
    fillRect(ctx, panelX, TITLE_H, panelW, SCREEN_H - TITLE_H - HINT_H, '#181830');

    const items = getTabItems();

    if (items.length === 0) {
      const emptyText = t('bag.noItems');
      drawText(ctx, emptyText, panelX + panelW / 2, TITLE_H + 20, {
        size: 8,
        color: '#666688',
        align: 'center',
      });
      return;
    }

    const rtl = isRTL();
    const maxVisible = Math.floor((SCREEN_H - TITLE_H - HINT_H) / ITEM_H);
    const scrollOffset = Math.max(0, itemIndex - maxVisible + 1);

    for (let i = scrollOffset; i < Math.min(items.length, scrollOffset + maxVisible); i++) {
      const item = items[i];
      const drawY = TITLE_H + (i - scrollOffset) * ITEM_H;
      const isSelected = i === itemIndex && focus === 'items';

      const bgColor = isSelected ? '#303060' : '#181830';
      fillRect(ctx, panelX, drawY, panelW, ITEM_H - 1, bgColor);

      if (isSelected) {
        drawRect(ctx, panelX, drawY, panelW, ITEM_H - 1, '#8888ff', 1);
      }

      // Item name
      const nameText = t(item.def.nameKey);
      const qtyText = `x${item.qty}`;

      if (rtl) {
        // RTL: name on right, qty on left
        drawText(ctx, nameText, panelX + panelW - 4, drawY + 2, {
          size: 7,
          color: '#ffffff',
          align: 'right',
        });
        drawText(ctx, qtyText, panelX + 4, drawY + 2, {
          size: 7,
          color: '#aaaacc',
          align: 'left',
        });
      } else {
        // LTR: name on left, qty on right
        drawText(ctx, nameText, panelX + 4, drawY + 2, {
          size: 7,
          color: '#ffffff',
          align: 'left',
        });
        drawText(ctx, qtyText, panelX + panelW - 4, drawY + 2, {
          size: 7,
          color: '#aaaacc',
          align: 'right',
        });
      }
    }

    // Description of selected item at bottom of items panel
    if (focus === 'items' && itemIndex < items.length) {
      const desc = t(items[itemIndex].def.descriptionKey);
      const descY = SCREEN_H - HINT_H - 12;
      fillRect(ctx, panelX, descY - 2, panelW, 12, '#202050');
      const descX = rtl ? panelX + panelW - 4 : panelX + 4;
      const descAlign: CanvasTextAlign = rtl ? 'right' : 'left';
      drawText(ctx, desc, descX, descY, { size: 7, color: '#ccccee', align: descAlign });
    }
  }

  function render(ctx: CanvasRenderingContext2D): void {
    clearScreen(ctx, '#181830');

    // Title bar
    const title = t('bag.title');
    drawText(ctx, title, SCREEN_W / 2, 3, { size: 8, color: '#ffffff', align: 'center' });

    const rtl = isRTL();
    const panelW = SCREEN_W - SIDEBAR_W;

    if (rtl) {
      // RTL: items on left, categories on right
      renderItems(ctx, 0, panelW);
      renderCategories(ctx, panelW);
    } else {
      // LTR: categories on left, items on right
      renderCategories(ctx, 0);
      renderItems(ctx, SIDEBAR_W, panelW);
    }

    // Message overlay
    if (messageTimer > 0) {
      fillRect(ctx, 20, SCREEN_H / 2 - 10, SCREEN_W - 40, 20, '#202050');
      drawRect(ctx, 20, SCREEN_H / 2 - 10, SCREEN_W - 40, 20, '#8888ff', 1);
      drawText(ctx, message, SCREEN_W / 2, SCREEN_H / 2 - 5, {
        size: 8,
        color: '#ffffff',
        align: 'center',
      });
    }

    // Hints at bottom
    const hintY = SCREEN_H - HINT_H + 2;
    fillRect(ctx, 0, SCREEN_H - HINT_H, SCREEN_W, HINT_H, '#101028');
    drawText(ctx, t('bag.hint'), SCREEN_W / 2, hintY, {
      size: 7,
      color: '#666688',
      align: 'center',
    });
  }

  // ── Input ────────────────────────────────────────────────────

  function update(dt: number): void {
    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) {
        message = '';
      }
      return;
    }

    if (input.isKeyPressed('Escape')) {
      stateMachine.pop();
      return;
    }

    const rtl = isRTL();
    const items = getTabItems();

    if (focus === 'categories') {
      if (input.isKeyPressed('ArrowUp')) {
        tabIndex = tabIndex > 0 ? tabIndex - 1 : BAG_TABS.length - 1;
        itemIndex = 0;
      }
      if (input.isKeyPressed('ArrowDown')) {
        tabIndex = tabIndex < BAG_TABS.length - 1 ? tabIndex + 1 : 0;
        itemIndex = 0;
      }

      // Move to items panel: in LTR press Right, in RTL press Left
      const toItemsKey = rtl ? 'ArrowLeft' : 'ArrowRight';
      if (input.isKeyPressed(toItemsKey) || input.isKeyPressed('Enter')) {
        if (items.length > 0) {
          focus = 'items';
          itemIndex = 0;
        }
      }
    } else {
      // focus === 'items'
      if (input.isKeyPressed('ArrowUp')) {
        itemIndex = itemIndex > 0 ? itemIndex - 1 : items.length - 1;
      }
      if (input.isKeyPressed('ArrowDown')) {
        itemIndex = itemIndex < items.length - 1 ? itemIndex + 1 : 0;
      }

      // Move back to categories: in LTR press Left, in RTL press Right
      const toCatsKey = rtl ? 'ArrowRight' : 'ArrowLeft';
      if (input.isKeyPressed(toCatsKey)) {
        focus = 'categories';
      }

      if (input.isKeyPressed('Enter')) {
        if (itemIndex < items.length) {
          const item = items[itemIndex];
          if (item.def.usableInOverworld) {
            // Item use would be handled by a callback / scene push
            // For now show a message that this is a bag-only view
            showMessage(t('bag.selectPokemon'));
          } else {
            showMessage(t('bag.cantUseHere'));
          }
        }
      }
    }
  }

  return {
    enter(): void {
      tabIndex = 0;
      itemIndex = 0;
      focus = 'categories';
      message = '';
      messageTimer = 0;
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
