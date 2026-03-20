/**
 * Shop UI overlay for the Poke Mart.
 * Rendered as an overlay on top of the overworld.
 */

import { fillRect, drawRect, drawText } from '../engine/renderer.js';
import { t } from '../i18n/i18n.js';
import { getPlayerData, autoSave } from '../systems/game-state.js';
import { getShopItems, getItem, type ItemDef } from '../data/items.js';
import type { InputManager } from '../engine/input.js';

const SCREEN_W = 240;
const SCREEN_H = 160;

export interface ShopState {
  open: boolean;
  cursor: number;
  items: ItemDef[];
  message: string | null;
  messageTimer: number;
}

export function createShopState(): ShopState {
  return {
    open: false,
    cursor: 0,
    items: getShopItems(),
    message: null,
    messageTimer: 0,
  };
}

export function openShop(shop: ShopState): void {
  shop.open = true;
  shop.cursor = 0;
  shop.items = getShopItems();
  shop.message = null;
  shop.messageTimer = 0;
}

export function closeShop(shop: ShopState): void {
  shop.open = false;
}

function buyItem(itemId: string): boolean {
  const pd = getPlayerData();
  const item = getItem(itemId);
  if (!item || pd.money < item.price) return false;
  pd.money -= item.price;
  pd.items[itemId] = (pd.items[itemId] || 0) + 1;
  autoSave();
  return true;
}

export function updateShop(shop: ShopState, input: InputManager, dt: number): boolean {
  if (!shop.open) return false;

  // Message display timer
  if (shop.message) {
    shop.messageTimer += dt;
    if (shop.messageTimer >= 1.2) {
      shop.message = null;
      shop.messageTimer = 0;
    }
    // Still consume input while message shows
    return true;
  }

  if (input.isKeyPressed('Escape')) {
    closeShop(shop);
    return true;
  }

  if (input.isKeyPressed('ArrowUp') && shop.cursor > 0) {
    shop.cursor--;
  }
  if (input.isKeyPressed('ArrowDown') && shop.cursor < shop.items.length - 1) {
    shop.cursor++;
  }

  if (input.isKeyPressed('Enter')) {
    const item = shop.items[shop.cursor];
    if (buyItem(item.id)) {
      shop.message = t('shop.bought', { item: t(item.nameKey) });
    } else {
      shop.message = t('shop.cantAfford');
    }
    shop.messageTimer = 0;
  }

  return true; // Shop consumes all input while open
}

export function renderShop(ctx: CanvasRenderingContext2D, shop: ShopState): void {
  if (!shop.open) return;

  const pd = getPlayerData();

  // Background overlay
  fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0, 0, 0, 0.7)');

  // Shop panel
  const panelX = 16;
  const panelY = 12;
  const panelW = SCREEN_W - 32;
  const panelH = SCREEN_H - 24;
  fillRect(ctx, panelX, panelY, panelW, panelH, '#202838');
  drawRect(ctx, panelX, panelY, panelW, panelH, '#5888b8');

  // Title
  drawText(ctx, t('shop.title'), panelX + 6, panelY + 4, { size: 8, color: '#ffffff', font: 'monospace' });

  // Money
  const moneyText = t('shop.money', { money: pd.money });
  drawText(ctx, moneyText, panelX + panelW - 6, panelY + 4, { size: 8, color: '#f8d030', font: 'monospace', align: 'right' });

  // Divider
  fillRect(ctx, panelX + 4, panelY + 16, panelW - 8, 1, '#5888b8');

  // Item list
  const listY = panelY + 22;
  const rowH = 20;

  for (let i = 0; i < shop.items.length; i++) {
    const item = shop.items[i];
    const y = listY + i * rowH;
    const selected = i === shop.cursor;

    if (selected) {
      fillRect(ctx, panelX + 2, y - 1, panelW - 4, rowH - 2, '#304060');
      drawRect(ctx, panelX + 2, y - 1, panelW - 4, rowH - 2, '#5888b8');
    }

    // Item name
    const name = t(item.nameKey);
    drawText(ctx, selected ? `\u25b6 ${name}` : `  ${name}`, panelX + 6, y + 2, {
      size: 8, color: selected ? '#ffffff' : '#c0c0c0', font: 'monospace',
    });

    // Description
    drawText(ctx, t(item.descriptionKey), panelX + 6, y + 11, {
      size: 7, color: '#8899aa', font: 'monospace',
    });

    // Price
    drawText(ctx, `$${item.price}`, panelX + panelW - 50, y + 2, {
      size: 8, color: pd.money >= item.price ? '#f8d030' : '#f84038', font: 'monospace',
    });

    // Owned count
    const owned = pd.items[item.id] || 0;
    if (owned > 0) {
      drawText(ctx, t('shop.owned', { count: owned }), panelX + panelW - 50, y + 11, {
        size: 7, color: '#88aa88', font: 'monospace',
      });
    }
  }

  // Message overlay
  if (shop.message) {
    fillRect(ctx, panelX + 4, SCREEN_H - 40, panelW - 8, 16, '#183050');
    drawRect(ctx, panelX + 4, SCREEN_H - 40, panelW - 8, 16, '#5888b8');
    drawText(ctx, shop.message, SCREEN_W / 2, SCREEN_H - 37, {
      size: 8, color: '#ffffff', font: 'monospace', align: 'center',
    });
  }

  // Help bar
  drawText(ctx, 'Enter: Buy  Esc: Exit', panelX + 6, panelY + panelH - 12, {
    size: 7, color: '#8899aa', font: 'monospace',
  });
}
