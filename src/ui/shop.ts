/**
 * Shop UI overlay — redesigned with category tabs, item cards, icons,
 * scrolling, and a bottom key-hint bar.
 *
 * All coordinates are in 240×160 logical space (canvas is scaled ×3).
 * Layout spec: screens_examples_coords/shop_canvas_coordinates.md
 */

import { fillRect, fillRoundRect, strokeRoundRect } from '../engine/renderer.js';
import { t } from '../i18n/i18n.js';
import { getPlayerData, autoSave } from '../systems/game-state.js';
import { getItemsByCategory, getItem, type ItemDef, type ItemCategory } from '../data/items.js';
import { getLocalizedName } from '../services/pokemon-data.js';
import type { InputManager } from '../engine/input.js';
import { LOGICAL_WIDTH as SW, LOGICAL_HEIGHT as SH } from '../engine/config.js';
import { FONT_HE } from '../engine/fonts.js';

// ─── Category definitions ───────────────────────────────────────────
interface CategoryDef {
  id: ItemCategory;
  text: string;
  x: number;
  w: number;
  dotColor: string;
  dotX?: number;
}

const CATEGORIES: CategoryDef[] = [
  { id: 'healing',     text: 'ריפוי',     x: 198, w: 36, dotColor: '#20d860' },
  { id: 'status-cure', text: 'ריפוי מצב', x: 142, w: 28, dotColor: '#5080ff', dotX: 172 },
  { id: 'revival',     text: 'החייאה',     x: 104, w: 20, dotColor: '#f8d030', dotX: 126 },
  { id: 'pokeball',    text: 'כדורים',     x: 66,  w: 22, dotColor: '#e85858', dotX: 90 },
  { id: 'battle',      text: 'קרב',        x: 38,  w: 14, dotColor: '#f08030', dotX: 54 },
  { id: 'vitamin',     text: 'ויטמינים',   x: 4,   w: 18, dotColor: '#a040a0', dotX: 24 },
];

// Icon color mapping per item id
const ICON_COLORS: Record<string, { color: string; type: string }> = {
  'potion':        { color: '#a040dc', type: 'potion' },
  'super-potion':  { color: '#50a0ff', type: 'potion' },
  'hyper-potion':  { color: '#ff783c', type: 'potion' },
  'max-potion':    { color: '#f8d030', type: 'potion' },
  'full-restore':  { color: '#20d860', type: 'cross' },
  'fresh-water':   { color: '#40b0e0', type: 'potion' },
  'soda-pop':      { color: '#e060a0', type: 'potion' },
  'lemonade':      { color: '#e0c040', type: 'potion' },
  'moomoo-milk':   { color: '#f0f0f0', type: 'potion' },
  'antidote':      { color: '#f8d030', type: 'capsule' },
  'burn-heal':     { color: '#f08030', type: 'capsule' },
  'ice-heal':      { color: '#98d8d8', type: 'capsule' },
  'awakening':     { color: '#f0c040', type: 'capsule' },
  'paralyze-heal': { color: '#f8d830', type: 'capsule' },
  'full-heal':     { color: '#20d860', type: 'cross' },
  'revive':        { color: '#f08030', type: 'diamond' },
  'max-revive':    { color: '#f8d030', type: 'diamond' },
  'poke-ball':     { color: '#e85858', type: 'ball' },
  'great-ball':    { color: '#5080ff', type: 'ball' },
  'ultra-ball':    { color: '#f8d030', type: 'ball' },
  'x-attack':      { color: '#f08030', type: 'bottle' },
  'x-defense':     { color: '#6890f0', type: 'bottle' },
  'x-speed':       { color: '#f85888', type: 'bottle' },
  'x-special':     { color: '#a040a0', type: 'bottle' },
  'rare-candy':    { color: '#ff60a0', type: 'diamond' },
};

// ─── Layout constants ───────────────────────────────────────────────
const ITEM_Y0 = 24;
const ITEM_STRIDE = 24;
const ITEM_H = 23;
const MAX_VISIBLE = 5;

// ─── State ──────────────────────────────────────────────────────────
export interface ShopState {
  open: boolean;
  selectedCategory: number;
  selectedItem: number;
  scrollOffset: number;
  items: ItemDef[];
  message: string | null;
  messageTimer: number;
}

export function createShopState(): ShopState {
  return {
    open: false,
    selectedCategory: 0,
    selectedItem: 0,
    scrollOffset: 0,
    items: [],
    message: null,
    messageTimer: 0,
  };
}

export function openShop(shop: ShopState): void {
  shop.open = true;
  shop.selectedCategory = 0;
  shop.selectedItem = 0;
  shop.scrollOffset = 0;
  shop.message = null;
  shop.messageTimer = 0;
  shop.items = getShopItemsForCategory(CATEGORIES[0].id);
}

export function closeShop(shop: ShopState): void {
  shop.open = false;
}

function getShopItemsForCategory(cat: ItemCategory): ItemDef[] {
  return getItemsByCategory(cat).filter(i => i.price > 0);
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

// ─── Update ─────────────────────────────────────────────────────────
export function updateShop(shop: ShopState, input: InputManager, dt: number): boolean {
  if (!shop.open) return false;

  // Message display timer
  if (shop.message) {
    shop.messageTimer += dt;
    if (shop.messageTimer >= 1.2) {
      shop.message = null;
      shop.messageTimer = 0;
    }
    return true;
  }

  if (input.isKeyPressed('Escape')) {
    closeShop(shop);
    return true;
  }

  // Category switching: Left/Right or Tab
  if (input.isKeyPressed('ArrowLeft')) {
    shop.selectedCategory = (shop.selectedCategory + 1) % CATEGORIES.length;
    shop.items = getShopItemsForCategory(CATEGORIES[shop.selectedCategory].id);
    shop.selectedItem = 0;
    shop.scrollOffset = 0;
  }
  if (input.isKeyPressed('ArrowRight')) {
    shop.selectedCategory = (shop.selectedCategory - 1 + CATEGORIES.length) % CATEGORIES.length;
    shop.items = getShopItemsForCategory(CATEGORIES[shop.selectedCategory].id);
    shop.selectedItem = 0;
    shop.scrollOffset = 0;
  }

  // Item navigation
  if (input.isKeyPressed('ArrowUp') && shop.selectedItem > 0) {
    shop.selectedItem--;
    if (shop.selectedItem < shop.scrollOffset) {
      shop.scrollOffset = shop.selectedItem;
    }
  }
  if (input.isKeyPressed('ArrowDown') && shop.selectedItem < shop.items.length - 1) {
    shop.selectedItem++;
    if (shop.selectedItem >= shop.scrollOffset + MAX_VISIBLE) {
      shop.scrollOffset = shop.selectedItem - MAX_VISIBLE + 1;
    }
  }

  // Buy
  if (input.isKeyPressed('Enter') && shop.items.length > 0) {
    const item = shop.items[shop.selectedItem];
    if (buyItem(item.id)) {
      shop.message = t('shop.bought', { item: getLocalizedName(item.name) });
    } else {
      shop.message = t('shop.cantAfford');
    }
    shop.messageTimer = 0;
  }

  return true;
}

// ─── Rendering helpers ──────────────────────────────────────────────

function hexToRGBA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// fillRoundRect and strokeRoundRect imported from renderer.ts

// ─── Icon drawing (16×16 box) ───────────────────────────────────────
function drawItemIcon(
  ctx: CanvasRenderingContext2D,
  type: string, color: string,
  ix: number, iy: number,
): void {
  // Box background
  ctx.fillStyle = hexToRGBA(color, 0.1);
  fillRoundRect(ctx, ix, iy, 16, 16, 3);
  ctx.strokeStyle = hexToRGBA(color, 0.3);
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, ix, iy, 16, 16, 3);

  switch (type) {
    case 'potion':
    default:
      // Bottle cap
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      fillRoundRect(ctx, ix + 5, iy - 1, 6, 3, 1);
      ctx.globalAlpha = 1;
      // Bottle body
      ctx.fillStyle = hexToRGBA(color, 0.15);
      fillRoundRect(ctx, ix + 4, iy + 2, 8, 10, [1, 1, 3, 3]);
      ctx.strokeStyle = hexToRGBA(color, 0.4);
      strokeRoundRect(ctx, ix + 4, iy + 2, 8, 10, [1, 1, 3, 3]);
      break;
    case 'cross':
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(ix + 7, iy + 3, 2, 8);
      ctx.fillRect(ix + 4, iy + 6, 8, 2);
      ctx.globalAlpha = 1;
      break;
    case 'capsule':
      ctx.fillStyle = hexToRGBA(color, 0.2);
      fillRoundRect(ctx, ix + 5, iy + 2, 6, 12, 3);
      ctx.strokeStyle = hexToRGBA(color, 0.4);
      strokeRoundRect(ctx, ix + 5, iy + 2, 6, 12, 3);
      break;
    case 'diamond':
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(ix + 5, iy + 4, 6, 6);
      ctx.globalAlpha = 1;
      break;
    case 'ball':
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ix + 8, iy + 8, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(ix + 2, iy + 7, 12, 2);
      ctx.fillRect(ix + 7, iy + 7, 2, 2);
      break;
    case 'bottle':
      ctx.fillStyle = hexToRGBA(color, 0.15);
      fillRoundRect(ctx, ix + 4, iy + 2, 8, 12, 2);
      ctx.strokeStyle = hexToRGBA(color, 0.4);
      strokeRoundRect(ctx, ix + 4, iy + 2, 8, 12, 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.fillRect(ix + 6, iy + 1, 4, 2);
      ctx.globalAlpha = 1;
      break;
  }
}

// ─── Main render ────────────────────────────────────────────────────
export function renderShop(ctx: CanvasRenderingContext2D, shop: ShopState): void {
  if (!shop.open) return;

  const pd = getPlayerData();

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Full-screen background
  fillRect(ctx, 0, 0, SW, SH, '#0a1a10');

  // ── HEADER BAR (y=0, h=12) ──
  fillRect(ctx, 0, 0, 240, 12, '#0a1a10');

  // Title (right-aligned)
  ctx.font = `8px ${FONT_HE}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.direction = 'rtl';
  ctx.fillText(t('shop.title'), 236, 1);

  // Money badge
  ctx.fillStyle = 'rgba(248,208,48,0.08)';
  fillRoundRect(ctx, 4, 1, 52, 10, 3);
  ctx.strokeStyle = 'rgba(248,208,48,0.15)';
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, 4, 1, 52, 10, 3);

  ctx.fillStyle = '#f8d030';
  ctx.font = `7px ${FONT_HE}`;
  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillText('₪', 40, 2);
  ctx.fillText(String(pd.money), 6, 2);

  // ── CATEGORY TABS (y=13, h=9) ──
  // Tab track background
  ctx.fillStyle = '#0a2a1a';
  fillRoundRect(ctx, 4, 13, 232, 9, 2);
  ctx.strokeStyle = '#1a4a30';
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, 4, 13, 232, 9, 2);

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    const isActive = i === shop.selectedCategory;

    if (isActive) {
      // Active tab pill
      ctx.fillStyle = '#1a5a35';
      fillRoundRect(ctx, cat.x, 13, cat.w, 9, 2);
      ctx.strokeStyle = '#1a4a30';
      strokeRoundRect(ctx, cat.x, 13, cat.w, 9, 2);

      // Active text
      ctx.fillStyle = '#20d860';
      ctx.font = `6px ${FONT_HE}`;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.fillText(cat.text, cat.x + cat.w / 2, 14);
    } else {
      // Inactive: small colored dot
      if (cat.dotX !== undefined) {
        ctx.fillStyle = cat.dotColor;
        ctx.fillRect(cat.dotX, 16, 3, 3);
      }

      // Inactive text
      ctx.fillStyle = '#445544';
      ctx.font = `5px ${FONT_HE}`;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.fillText(cat.text, cat.x + cat.w / 2, 14);
    }
  }

  // ── ITEM CARDS (y=24 to y=143) ──
  if (shop.items.length === 0) {
    ctx.fillStyle = '#445544';
    ctx.font = `7px ${FONT_HE}`;
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText('אין פריטים זמינים', 120, 80);
  } else {
    for (let vi = 0; vi < MAX_VISIBLE; vi++) {
      const idx = shop.scrollOffset + vi;
      if (idx >= shop.items.length) break;

      const item = shop.items[idx];
      const cardY = ITEM_Y0 + vi * ITEM_STRIDE;
      const isSelected = idx === shop.selectedItem;
      const canAfford = pd.money >= item.price;
      const owned = pd.items[item.id] || 0;
      const iconInfo = ICON_COLORS[item.id] || { color: '#888888', type: 'potion' };

      // Card background
      ctx.fillStyle = isSelected ? '#1a3a2a' : '#0f2a1a';
      fillRoundRect(ctx, 4, cardY, 232, ITEM_H, 2);
      ctx.strokeStyle = isSelected ? '#2a6a40' : '#1a4a30';
      ctx.lineWidth = 1;
      strokeRoundRect(ctx, 4, cardY, 232, ITEM_H, 2);

      // Selection indicator bar
      if (isSelected) {
        ctx.fillStyle = '#20d860';
        ctx.fillRect(4, cardY, 2, ITEM_H);
      }

      // Icon (16×16 box at x=214)
      drawItemIcon(ctx, iconInfo.type, iconInfo.color, 214, cardY + 2);

      // Item name (right-aligned, RTL)
      ctx.fillStyle = canAfford ? '#ffffff' : '#667766';
      ctx.font = `7px ${FONT_HE}`;
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      ctx.fillText(getLocalizedName(item.name), 210, cardY + 3);

      // Description
      ctx.fillStyle = isSelected ? '#667766' : '#445544';
      if (!canAfford) ctx.fillStyle = '#334433';
      ctx.font = `5px ${FONT_HE}`;
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      ctx.fillText(item.description, 210, cardY + 12);

      // Owned count
      ctx.fillStyle = '#3a4a3a';
      ctx.font = `5px ${FONT_HE}`;
      ctx.textAlign = 'right';
      ctx.direction = 'rtl';
      const ownedText = t('shop.owned', { count: owned });
      ctx.fillText(ownedText, 210, cardY + 18);

      // Price (₪ symbol + value, left side)
      ctx.fillStyle = canAfford ? '#f8d030' : '#5a4a2a';
      ctx.textAlign = 'left';
      ctx.direction = 'ltr';
      ctx.font = `bold 6px ${FONT_HE}`;
      ctx.fillText('₪', 8, cardY + 3);
      ctx.font = `8px ${FONT_HE}`;
      ctx.fillText(String(item.price), 14, cardY + 2);

      // Buy button (selected only)
      if (isSelected) {
        ctx.fillStyle = canAfford ? '#1a5a35' : '#1a2a1a';
        fillRoundRect(ctx, 8, cardY + 12, 28, 8, 2);
        ctx.strokeStyle = canAfford ? '#2a6a40' : '#2a3a2a';
        ctx.lineWidth = 1;
        strokeRoundRect(ctx, 8, cardY + 12, 28, 8, 2);
        ctx.fillStyle = canAfford ? '#20d860' : '#334433';
        ctx.font = `5px ${FONT_HE}`;
        ctx.textAlign = 'center';
        ctx.direction = 'rtl';
        ctx.fillText(t('shop.buy'), 22, cardY + 13);
      }
    }
  }

  // ── SCROLL INDICATOR (when >5 items) ──
  if (shop.items.length > MAX_VISIBLE) {
    // Track
    ctx.fillStyle = '#0a2a1a';
    ctx.fillRect(237, 28, 2, 110);

    // Thumb
    const thumbH = Math.max(20, (MAX_VISIBLE / shop.items.length) * 110);
    const maxScroll = shop.items.length - MAX_VISIBLE;
    const thumbY = maxScroll > 0
      ? 28 + (shop.scrollOffset / maxScroll) * (110 - thumbH)
      : 28;
    ctx.fillStyle = '#1a4a30';
    ctx.fillRect(237, thumbY, 2, thumbH);
  }

  // ── BOTTOM BAR (y=150, h=10) ──
  fillRect(ctx, 0, 150, 240, 10, '#0a1a10');

  const keys = [
    { pillX: 4,   pillW: 18, pillText: 'ESC',   hintX: 24,  hintText: 'יציאה' },
    { pillX: 52,  pillW: 24, pillText: 'Enter',  hintX: 78,  hintText: t('shop.buy') },
    { pillX: 108, pillW: 14, pillText: '◀▶',     hintX: 124, hintText: 'קטגוריה' },
    { pillX: 160, pillW: 14, pillText: '▲▼',     hintX: 176, hintText: 'ניווט' },
  ];

  for (const k of keys) {
    // Pill background
    ctx.fillStyle = '#1a3a2a';
    fillRoundRect(ctx, k.pillX, 151, k.pillW, 8, 2);
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, k.pillX, 151, k.pillW, 8, 2);

    // Pill text
    ctx.fillStyle = '#aaccaa';
    ctx.font = `5px ${FONT_HE}`;
    ctx.textAlign = 'center';
    ctx.direction = 'ltr';
    ctx.fillText(k.pillText, k.pillX + k.pillW / 2, 152);

    // Hint text
    ctx.fillStyle = '#667766';
    ctx.font = `5px ${FONT_HE}`;
    ctx.textAlign = 'left';
    ctx.direction = 'rtl';
    ctx.fillText(k.hintText, k.hintX, 153);
  }

  // ── MESSAGE OVERLAY ──
  if (shop.message) {
    fillRect(ctx, 20, 65, 200, 30, 'rgba(0,0,0,0.85)');
    ctx.strokeStyle = '#2a6a40';
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, 20, 65, 200, 30, 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = `7px ${FONT_HE}`;
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(shop.message, 120, 76);
  }

  ctx.restore();
}
