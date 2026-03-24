/**
 * BagScene - Full-screen item bag with category tabs and scrollable item list.
 *
 * Layout (240x160 logical pixels):
 * - Top bar (y=0-14): "BAG" title + category name
 * - Left sidebar (x=0-50, y=14-146): Category tabs vertically stacked
 * - Right panel (x=52-238, y=14-146): Scrollable item list
 * - Bottom bar (y=146-160): Controls hint + item description
 *
 * Supports overworld and battle modes. B key in overworld pushes this scene;
 * Escape pops back.
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawRect, drawText } from '../engine/renderer.js';
import { t } from '../i18n/i18n.js';
import { getPlayerData } from '../systems/game-state.js';
import { getItem, type ItemDef, type ItemCategory } from '../data/items.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
import { drawItemIcon } from '../ui/item-icons.js';

// ── Layout constants ──
const TOP_BAR_H = 14;
const BOTTOM_BAR_Y = 146;
const SIDEBAR_W = 50;
const PANEL_X = 52;
const PANEL_W = SCREEN_W - PANEL_X - 2;
const PANEL_Y = TOP_BAR_H;
const PANEL_H = BOTTOM_BAR_Y - TOP_BAR_H;
const TAB_H = 18;
const ROW_H = 18;
const VISIBLE_ROWS = Math.floor(PANEL_H / ROW_H);

// ── Colors ──
const COL_BG = '#181830';
const COL_PANEL = '#202040';
const COL_SELECTED = '#303060';
const COL_TEXT = '#ffffff';
const COL_TEXT2 = '#aaaacc';
const COL_HINT = '#666688';
const COL_GOLD = '#f8d030';
const COL_BORDER = '#585858';

// ── Category definitions ──
interface BagCategory {
  id: string;
  label: string;
  /** Item categories from items.ts that belong to this bag tab. */
  itemCategories: ItemCategory[];
  color: string;
}

const BAG_CATEGORIES: BagCategory[] = [
  { id: 'medicine', label: 'Medicine',   itemCategories: ['healing', 'status-cure', 'revival'], color: '#e05050' },
  { id: 'balls',    label: 'Balls',      itemCategories: ['pokeball'],                          color: '#e0e0e0' },
  { id: 'battle',   label: 'Battle',     itemCategories: ['battle'],                            color: '#50a0e0' },
  { id: 'vitamins', label: 'Vitamins',   itemCategories: ['vitamin'],                           color: '#50e050' },
  { id: 'key',      label: 'Key Items',  itemCategories: ['key'],                               color: '#e0c050' },
];

// ── Bag mode (overworld vs battle) ──
let bagMode: 'overworld' | 'battle' = 'overworld';

/** Set the bag mode before pushing the BAG scene. */
export function setBagMode(mode: 'overworld' | 'battle'): void {
  bagMode = mode;
}

/** Pending item for use-on-Pokemon flow (read by party scene integration). */
export let pendingItem: ItemDef | null = null;

/** Clear the pending item after it has been consumed. */
export function clearPendingItem(): void {
  pendingItem = null;
}

// ── Helpers ──

interface BagItem {
  def: ItemDef;
  qty: number;
}

/** Get items for the given bag category, filtered by mode and player inventory. */
function getCategoryItems(cat: BagCategory): BagItem[] {
  const playerItems = getPlayerData().items;
  const results: BagItem[] = [];

  for (const [itemId, qty] of Object.entries(playerItems)) {
    if (qty <= 0) continue;
    const def = getItem(itemId);
    if (!def) continue;
    if (!cat.itemCategories.includes(def.category)) continue;

    // In battle mode, only show battle-usable items
    if (bagMode === 'battle' && !def.usableInBattle) continue;

    results.push({ def, qty });
  }

  return results;
}

/** Draw a small category icon shape in the sidebar tab. */
function drawCategoryIcon(ctx: CanvasRenderingContext2D, catId: string, x: number, y: number): void {
  switch (catId) {
    case 'medicine':
      // Small cross/plus
      ctx.fillStyle = '#e05050';
      ctx.fillRect(x + 3, y + 1, 2, 8);
      ctx.fillRect(x + 1, y + 3, 6, 2);
      break;
    case 'balls':
      // Small circle
      ctx.fillStyle = '#e03030';
      ctx.beginPath();
      ctx.arc(x + 4, y + 4, 3, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + 4, y + 4, 3, 0, Math.PI);
      ctx.fill();
      break;
    case 'battle':
      // Small sword/arrow
      ctx.fillStyle = '#50a0e0';
      ctx.fillRect(x + 3, y + 1, 2, 6);
      ctx.fillRect(x + 1, y + 4, 6, 2);
      break;
    case 'vitamins':
      // Small star shape (simplified)
      ctx.fillStyle = '#50e050';
      ctx.fillRect(x + 2, y + 2, 4, 4);
      ctx.fillRect(x + 3, y + 1, 2, 6);
      break;
    case 'key':
      // Small key shape
      ctx.fillStyle = '#e0c050';
      ctx.beginPath();
      ctx.arc(x + 3, y + 3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x + 4, y + 2, 4, 2);
      break;
  }
}

// ── Scene factory ──

export function createBagScene(input: InputManager, stateMachine: StateMachine): Scene {
  let catIndex = 0;
  let itemCursor = 0;
  let scrollOffset = 0;
  let focus: 'categories' | 'items' = 'categories';
  let message: string | null = null;
  let messageTimer = 0;

  /** Clamp item cursor after switching category or scrolling. */
  function clampItemCursor(items: BagItem[]): void {
    if (items.length === 0) {
      itemCursor = 0;
      scrollOffset = 0;
      return;
    }
    if (itemCursor >= items.length) itemCursor = items.length - 1;
    if (itemCursor < 0) itemCursor = 0;
    // Keep cursor in visible range
    if (itemCursor < scrollOffset) scrollOffset = itemCursor;
    if (itemCursor >= scrollOffset + VISIBLE_ROWS) scrollOffset = itemCursor - VISIBLE_ROWS + 1;
  }

  function showMessage(msg: string): void {
    message = msg;
    messageTimer = 1.5;
  }

  // ── Render helpers ──

  function renderTopBar(ctx: CanvasRenderingContext2D): void {
    fillRect(ctx, 0, 0, SCREEN_W, TOP_BAR_H, COL_PANEL);
    drawText(ctx, t('bag.title'), 4, 3, { size: 8, color: COL_TEXT });

    const cat = BAG_CATEGORIES[catIndex];
    drawText(ctx, cat.label, SCREEN_W - 4, 3, { size: 8, color: COL_GOLD, align: 'right' });

    // Separator line
    fillRect(ctx, 0, TOP_BAR_H - 1, SCREEN_W, 1, COL_BORDER);
  }

  function renderSidebar(ctx: CanvasRenderingContext2D): void {
    fillRect(ctx, 0, PANEL_Y, SIDEBAR_W, PANEL_H, COL_PANEL);

    for (let i = 0; i < BAG_CATEGORIES.length; i++) {
      const cat = BAG_CATEGORIES[i];
      const ty = PANEL_Y + i * TAB_H;

      const isActive = i === catIndex;
      const isFocused = isActive && focus === 'categories';

      if (isFocused) {
        fillRect(ctx, 0, ty, SIDEBAR_W, TAB_H - 1, COL_SELECTED);
        drawRect(ctx, 0, ty, SIDEBAR_W, TAB_H - 1, COL_GOLD, 1);
      } else if (isActive) {
        fillRect(ctx, 0, ty, SIDEBAR_W, TAB_H - 1, COL_SELECTED);
      }

      // Icon
      drawCategoryIcon(ctx, cat.id, 2, ty + 4);

      // Label
      const labelColor = isActive ? COL_GOLD : COL_TEXT2;
      drawText(ctx, cat.label, 12, ty + 5, { size: 7, color: labelColor });
    }

    // Vertical separator
    fillRect(ctx, SIDEBAR_W, PANEL_Y, 1, PANEL_H, COL_BORDER);
  }

  function renderItemList(ctx: CanvasRenderingContext2D): void {
    const cat = BAG_CATEGORIES[catIndex];
    const items = getCategoryItems(cat);

    // Panel background
    fillRect(ctx, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, COL_BG);

    if (items.length === 0) {
      drawText(ctx, t('bag.noItems'), PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H / 2 - 4, {
        size: 8, color: COL_HINT, align: 'center',
      });
      return;
    }

    clampItemCursor(items);

    // Draw visible rows
    for (let vi = 0; vi < VISIBLE_ROWS; vi++) {
      const idx = scrollOffset + vi;
      if (idx >= items.length) break;

      const item = items[idx];
      const ry = PANEL_Y + vi * ROW_H;
      const isSelected = idx === itemCursor && focus === 'items';

      if (isSelected) {
        fillRect(ctx, PANEL_X, ry, PANEL_W, ROW_H - 1, COL_SELECTED);
      }

      // Item icon
      drawItemIcon(ctx, item.def.id, PANEL_X + 2, ry + 1, 14);

      // Item name
      const nameColor = isSelected ? COL_TEXT : COL_TEXT2;
      drawText(ctx, t(item.def.nameKey), PANEL_X + 18, ry + 4, { size: 7, color: nameColor });

      // Quantity right-aligned
      drawText(ctx, `x${item.qty}`, PANEL_X + PANEL_W - 4, ry + 4, {
        size: 7, color: COL_TEXT2, align: 'right',
      });
    }

    // Scroll indicators
    if (scrollOffset > 0) {
      drawText(ctx, '\u25b2', PANEL_X + PANEL_W / 2, PANEL_Y - 1, {
        size: 6, color: COL_HINT, align: 'center',
      });
    }
    if (scrollOffset + VISIBLE_ROWS < items.length) {
      drawText(ctx, '\u25bc', PANEL_X + PANEL_W / 2, PANEL_Y + PANEL_H - 7, {
        size: 6, color: COL_HINT, align: 'center',
      });
    }
  }

  function renderBottomBar(ctx: CanvasRenderingContext2D): void {
    fillRect(ctx, 0, BOTTOM_BAR_Y, SCREEN_W, SCREEN_H - BOTTOM_BAR_Y, COL_PANEL);
    fillRect(ctx, 0, BOTTOM_BAR_Y, SCREEN_W, 1, COL_BORDER);

    if (message) {
      drawText(ctx, message, SCREEN_W / 2, BOTTOM_BAR_Y + 3, {
        size: 7, color: COL_GOLD, align: 'center',
      });
      return;
    }

    // Show description of selected item if focused on items
    if (focus === 'items') {
      const cat = BAG_CATEGORIES[catIndex];
      const items = getCategoryItems(cat);
      if (items.length > 0 && itemCursor < items.length) {
        const item = items[itemCursor];
        drawText(ctx, t(item.def.descriptionKey), 4, BOTTOM_BAR_Y + 2, {
          size: 7, color: COL_TEXT, maxWidth: SCREEN_W - 8, lineHeight: 8,
        });
        return;
      }
    }

    // Controls hint
    drawText(ctx, 'ESC:Back  ENTER:Use  \u2190\u2191\u2193\u2192:Navigate', 4, BOTTOM_BAR_Y + 3, {
      size: 6, color: COL_HINT,
    });
  }

  // ── Scene interface ──

  return {
    enter(): void {
      catIndex = 0;
      itemCursor = 0;
      scrollOffset = 0;
      focus = 'categories';
      message = null;
      messageTimer = 0;
      pendingItem = null;
    },

    exit(): void {
      // Nothing to clean up
    },

    update(dt: number): void {
      // Message timer
      if (message && messageTimer > 0) {
        messageTimer -= dt;
        if (messageTimer <= 0) {
          message = null;
          messageTimer = 0;
        }
      }

      // Escape → back
      if (input.isKeyPressed('Escape')) {
        stateMachine.pop();
        return;
      }

      const cat = BAG_CATEGORIES[catIndex];
      const items = getCategoryItems(cat);

      if (focus === 'categories') {
        // Navigate categories
        if (input.isKeyPressed('ArrowUp')) {
          catIndex = catIndex > 0 ? catIndex - 1 : BAG_CATEGORIES.length - 1;
          itemCursor = 0;
          scrollOffset = 0;
        }
        if (input.isKeyPressed('ArrowDown')) {
          catIndex = catIndex < BAG_CATEGORIES.length - 1 ? catIndex + 1 : 0;
          itemCursor = 0;
          scrollOffset = 0;
        }
        // Move focus to item list
        if (input.isKeyPressed('ArrowRight') || input.isKeyPressed('Enter')) {
          if (items.length > 0) {
            focus = 'items';
            itemCursor = 0;
            scrollOffset = 0;
          }
        }
      } else {
        // Navigate items
        if (input.isKeyPressed('ArrowUp')) {
          if (itemCursor > 0) {
            itemCursor--;
          } else {
            itemCursor = items.length - 1;
          }
          clampItemCursor(items);
        }
        if (input.isKeyPressed('ArrowDown')) {
          if (itemCursor < items.length - 1) {
            itemCursor++;
          } else {
            itemCursor = 0;
          }
          clampItemCursor(items);
        }
        // Move focus back to categories
        if (input.isKeyPressed('ArrowLeft')) {
          focus = 'categories';
        }

        // Use item
        if (input.isKeyPressed('Enter') && items.length > 0 && itemCursor < items.length) {
          const item = items[itemCursor];
          const canUse = bagMode === 'battle' ? item.def.usableInBattle : item.def.usableInOverworld;

          if (!canUse) {
            showMessage(t('bag.cantUseHere'));
            return;
          }

          // Items that need a target Pokemon
          const effectType = item.def.effect.type;
          const needsTarget = effectType === 'heal' || effectType === 'heal-full'
            || effectType === 'revive' || effectType === 'status-cure'
            || effectType === 'pp-restore' || effectType === 'rare-candy';

          if (needsTarget) {
            pendingItem = item.def;
            showMessage(t('bag.selectPokemon'));
            // Push PARTY scene for target selection (will be wired in a later task)
            // For now show the message; integration with party scene comes in Task 4/5
            return;
          }

          // Non-target items (pokeballs, stat boosts) — handled by battle scene
          if (bagMode === 'battle') {
            pendingItem = item.def;
            stateMachine.pop();
            return;
          }

          showMessage(t('bag.cantUseHere'));
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, COL_BG);
      renderTopBar(ctx);
      renderSidebar(ctx);
      renderItemList(ctx);
      renderBottomBar(ctx);
    },
  };
}
