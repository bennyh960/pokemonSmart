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
import type { InputManager } from '../engine/input';
import { LOGICAL_WIDTH as SW, LOGICAL_HEIGHT as SH } from '../engine/config.js';
import { FONT_HE } from '../engine/fonts.js';
import { getCachedImage } from '../engine/sprite-loader.js';

// ─── Category definitions ───────────────────────────────────────────
interface CategoryDef {
  id: ItemCategory;
  text: string;
  x: number;
  w: number;
  dotColor: string;
  dotX?: number;
  extraCategories?: ItemCategory[]; // additional categories to include in this tab (e.g. 'pp-restore' items also show in 'healing')
}

const CATEGORIES: CategoryDef[] = [
  { id: 'healing', text: 'ריפוי', x: 198, w: 36, dotColor: '#20d860' },
  {
    id: 'status-cure',
    text: 'ריפוי מצב',
    x: 142,
    w: 28,
    dotColor: '#5080ff',
    dotX: 172,
    extraCategories: ['pp-restore'],
  },
  { id: 'revival', text: 'החייאה', x: 104, w: 20, dotColor: '#f8d030', dotX: 126 },
  { id: 'pokeball', text: 'כדורים', x: 66, w: 22, dotColor: '#e85858', dotX: 90 },
  { id: 'battle', text: 'קרב', x: 38, w: 14, dotColor: '#f08030', dotX: 54 },
  { id: 'vitamin', text: 'ויטמינים', x: 4, w: 18, dotColor: '#a040a0', dotX: 24 },
  { id: 'held', text: 'אביזרי קרב', x: 0, w: 28, dotColor: '#4d40a0', dotX: 2 },
];

const getActualCategories = (categoriesToExclude: ItemCategory[]) => {
  return CATEGORIES.filter((cat) => !categoriesToExclude.includes(cat.id));
};

// Icon color mapping per item id
const ICON_COLORS: Record<string, { color: string; type: string }> = {
  potion: { color: '#a040dc', type: 'potion' },
  'super-potion': { color: '#50a0ff', type: 'potion' },
  'hyper-potion': { color: '#ff783c', type: 'potion' },
  'max-potion': { color: '#f8d030', type: 'potion' },
  'full-restore': { color: '#20d860', type: 'cross' },
  'fresh-water': { color: '#40b0e0', type: 'potion' },
  'soda-pop': { color: '#e060a0', type: 'potion' },
  lemonade: { color: '#e0c040', type: 'potion' },
  'moomoo-milk': { color: '#f0f0f0', type: 'potion' },
  antidote: { color: '#f8d030', type: 'capsule' },
  'burn-heal': { color: '#f08030', type: 'capsule' },
  'ice-heal': { color: '#98d8d8', type: 'capsule' },
  awakening: { color: '#f0c040', type: 'capsule' },
  'paralyze-heal': { color: '#f8d830', type: 'capsule' },
  'full-heal': { color: '#20d860', type: 'cross' },
  revive: { color: '#f08030', type: 'diamond' },
  'max-revive': { color: '#f8d030', type: 'diamond' },
  'poke-ball': { color: '#e85858', type: 'ball' },
  'great-ball': { color: '#5080ff', type: 'ball' },
  'ultra-ball': { color: '#f8d030', type: 'ball' },
  'x-attack': { color: '#f08030', type: 'bottle' },
  'x-defense': { color: '#6890f0', type: 'bottle' },
  'x-speed': { color: '#f85888', type: 'bottle' },
  'x-special': { color: '#a040a0', type: 'bottle' },
  'x-sp-def': { color: '#78c850', type: 'bottle' },
  'rare-candy': { color: '#ff60a0', type: 'diamond' },
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
  quantitySelection: boolean; // האם חלונית הכמות פתוחה
  quantity: number;

  // ─── שדות חדשים למנגנון ההנחה ───
  sessionDiscount: number; // אחוז ההנחה הנוכחי לחנות זו (0, 10, 20, 30)
  quizActive: boolean; // האם מסך השאלה פתוח כעת
  quizInputStr: string; // התשובה שהשחקן מציע למחיר הסופי
  quizResult: 'correct' | 'wrong' | null; // תוצאת המענה
  quizResultTimer: number; // טיימר להמתנה של ה-2 שניות

  // exclude categroies
  categoriesToExclude: ItemCategory[];
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
    quantitySelection: false,
    quantity: 1,
    sessionDiscount: rollSessionDiscount(), // גלגול הנחה אקראית בתחילת כל ביקור בחנות
    quizActive: false,
    quizInputStr: '',
    quizResult: null,
    quizResultTimer: 0,
    categoriesToExclude: [],
  };
}

export function openShop(shop: ShopState): void {
  shop.open = true;
  shop.selectedCategory = 0;
  shop.selectedItem = 0;
  shop.scrollOffset = 0;
  shop.message = null;
  shop.messageTimer = 0;
  shop.items = getShopItemsForCategory(getActualCategories(shop.categoriesToExclude)[0]);
  // אתחול מערכת ההנחות
  shop.sessionDiscount = rollSessionDiscount();
  shop.quizActive = false;
  shop.quizInputStr = '';
  shop.quizResult = null;
  shop.quizResultTimer = 0;
}

export function closeShop(shop: ShopState): void {
  shop.open = false;
}

function getShopItemsForCategory(cat: CategoryDef): ItemDef[] {
  const mainItems = getItemsByCategory(cat.id).filter((i) => i.price > 0 && i.category !== 'key');
  if (cat.extraCategories) {
    const extraItems = cat.extraCategories.flatMap((extraCat) =>
      getItemsByCategory(extraCat).filter((i) => i.price > 0 && i.category !== 'key'),
    );
    return [...mainItems, ...extraItems];
  }
  return mainItems;
}

// ─── Update ─────────────────────────────────────────────────────────
export function updateShop(shop: ShopState, input: InputManager, dt: number): boolean {
  if (!shop.open) return false;

  const pd = getPlayerData();
  const currentItem = shop.items[shop.selectedItem];
  const baseTotalPrice = currentItem ? currentItem.price * shop.quantity : 0;
  const correctAnswer = calculateDiscountedPrice(baseTotalPrice, shop.sessionDiscount);

  const ACTUAL_CATEGORIES = getActualCategories(shop.categoriesToExclude);

  // ─── 1. מצב הצגת תוצאה (נעול ל-2 שניות, קניות אוטומטיות בסיום) ───
  if (shop.quizActive && shop.quizResult !== null) {
    shop.quizResultTimer += dt;
    if (shop.quizResultTimer >= 2.0) {
      const finalPrice = shop.quizResult === 'correct' ? correctAnswer : baseTotalPrice;

      if (pd.money >= finalPrice) {
        pd.money -= finalPrice;
        pd.items[currentItem.id] = (pd.items[currentItem.id] || 0) + shop.quantity;
        autoSave();
        shop.message =
          shop.quizResult === 'correct'
            ? t('shop.bought', { item: getLocalizedName(currentItem.name), quantity: shop.quantity })
            : 'הרכישה בוצעה במחיר מלא';
      } else {
        shop.message = t('shop.cantAfford');
      }

      // איפוס מוחלט של כל תתי-המסכים וחזרה לחנות הראשית
      shop.quizActive = false;
      shop.quizResult = null;
      shop.quantitySelection = false;
      shop.messageTimer = 0;
    }
    return true; // עוצר אינפוטים אחרים ברקע
  }

  // ─── 2. מצב אתגר ההנחה (הזנת מספרים חופשית - חיצים משוחררים!) ───
  if (shop.quizActive && currentItem) {
    if (input.isKeyPressed('Escape')) {
      shop.quizActive = false;
      return true;
    }

    // קריאה לפונקציית קליטת הספרות
    handleKeyboardNumericInput(shop, input);

    // בדיקת התשובה בלחיצה על Enter
    if (input.isKeyPressed('Enter')) {
      shop.quizResultTimer = 0;
      const playerNum = parseInt(shop.quizInputStr, 10) || 0; // המרה למספר (ברירת מחדל 0 אם ריק)

      if (playerNum === correctAnswer) {
        shop.quizResult = 'correct';
        // // playSound('success');
      } else {
        shop.quizResult = 'wrong';
        // // playSound('fail');
      }
    }
    return true;
  }

  // ─── 3. מצב בחירת כמות חפצים (לפני הקנייה) ───
  if (shop.quantitySelection && currentItem) {
    const maxAffordable = Math.min(99, Math.floor(pd.money / currentItem.price));

    if (input.isKeyPressed('Escape')) {
      shop.quantitySelection = false;
      return true;
    }

    // מעבר לאתגר ההנחה בלחיצה על SPACE
    if (input.isKeyPressed(' ') && shop.sessionDiscount > 0 && maxAffordable > 0) {
      shop.quizActive = true;
      shop.quizInputStr = ''; // מתחיל ריק כדי שהשחקן יקליד מאפס
      shop.quizResult = null;
      return true;
    }

    // שינוי כמות (רק במצב זה החיצים משנים כמות!)
    if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('ArrowRight')) {
      if (shop.quantity < maxAffordable) shop.quantity++;
    }
    if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('ArrowLeft')) {
      if (shop.quantity > 1) shop.quantity--;
    }

    // קנייה רגילה ישירה ללא הנחה (מחיר מלא)
    if (input.isKeyPressed('Enter')) {
      if (shop.quantity > 0 && buyItemDirect(currentItem.id, shop.quantity)) {
        shop.message = t('shop.bought', { item: getLocalizedName(currentItem.name), quantity: shop.quantity });
      } else {
        shop.message = t('shop.cantAfford');
      }
      shop.quantitySelection = false;
      shop.messageTimer = 0;
    }
    return true;
  }

  // ─── 4. טיימר הודעות רגיל של החנות ───
  if (shop.message) {
    shop.messageTimer += dt;
    if (shop.messageTimer >= 1.2) {
      shop.message = null;
      shop.messageTimer = 0;
    }
    return true;
  }

  // ─── 5. החנות הראשית והניווט הבסיסי (חזר לעבוד כרגיל ללא חסימות!) ───
  if (input.isKeyPressed('Escape')) {
    closeShop(shop);
    return true;
  }

  if (input.isKeyPressed('ArrowLeft')) {
    shop.selectedCategory = (shop.selectedCategory + 1) % ACTUAL_CATEGORIES.length;
    shop.items = getShopItemsForCategory(ACTUAL_CATEGORIES[shop.selectedCategory]);
    shop.selectedItem = 0;
    shop.scrollOffset = 0;
  }
  if (input.isKeyPressed('ArrowRight')) {
    shop.selectedCategory = (shop.selectedCategory - 1 + ACTUAL_CATEGORIES.length) % ACTUAL_CATEGORIES.length;
    shop.items = getShopItemsForCategory(ACTUAL_CATEGORIES[shop.selectedCategory]);
    shop.selectedItem = 0;
    shop.scrollOffset = 0;
  }

  if (input.isKeyPressed('ArrowUp') && shop.selectedItem > 0) {
    shop.selectedItem--;
    if (shop.selectedItem < shop.scrollOffset) shop.scrollOffset = shop.selectedItem;
  }
  if (input.isKeyPressed('ArrowDown') && shop.selectedItem < shop.items.length - 1) {
    shop.selectedItem++;
    if (shop.selectedItem >= shop.scrollOffset + MAX_VISIBLE) {
      shop.scrollOffset = shop.selectedItem - MAX_VISIBLE + 1;
    }
  }

  // פתיחת חלונית בחירת הכמות
  if (input.isKeyPressed('Enter') && shop.items.length > 0) {
    const maxAffordable = Math.min(99, Math.floor(pd.money / currentItem.price));
    if (maxAffordable > 0) {
      shop.quantitySelection = true;
      shop.quantity = 1;
    } else {
      shop.message = t('shop.cantAfford');
      shop.messageTimer = 0;
    }
  }

  return true;
}

// פונקציית עזר לקנייה רגילה
function buyItemDirect(itemId: string, quantity: number): boolean {
  const pd = getPlayerData();
  const item = getItem(itemId);
  if (!item || pd.money < item.price * quantity) return false;
  pd.money -= item.price * quantity;
  pd.items[itemId] = (pd.items[itemId] || 0) + quantity;
  autoSave();
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
function drawItemIcon(ctx: CanvasRenderingContext2D, type: string, color: string, ix: number, iy: number): void {
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
  // Track background
  ctx.fillStyle = '#0a2a1a';
  fillRoundRect(ctx, 4, 13, 232, 9, 2);
  ctx.strokeStyle = '#1a4a30';
  ctx.lineWidth = 1;
  strokeRoundRect(ctx, 4, 13, 232, 9, 2);

  // גזירת הקטגוריות הקיימות - מקסימום 7 קטגוריות לתצוגה
  const ACTUAL_CATEGORIES = getActualCategories(shop.categoriesToExclude).slice(0, 7);

  // הגדרת רוחב קבוע ואחיד לכל טאב ומרווח ביניהם
  const FIXED_TAB_W = 32;
  const TAB_SPACING = 4;

  // מתחילים מהקצה הימני של הבר (X=236) ונעים שמאלה
  let currentX = 236;

  for (let i = 0; i < ACTUAL_CATEGORIES.length; i++) {
    const cat = ACTUAL_CATEGORIES[i];
    const isActive = i === shop.selectedCategory;

    // חישוב ה-X הדינמי לפי הרוחב הקבוע האחיד
    const dynamicX = currentX - FIXED_TAB_W;

    if (isActive) {
      // Active tab pill
      ctx.fillStyle = '#1a5a35';
      fillRoundRect(ctx, dynamicX, 13, FIXED_TAB_W, 9, 2);
      ctx.strokeStyle = '#1a4a30';
      strokeRoundRect(ctx, dynamicX, 13, FIXED_TAB_W, 9, 2);

      // Active text (ממורכז לחלוטין בתוך הריבוע הקבוע)
      ctx.fillStyle = '#20d860';
      ctx.font = `6px ${FONT_HE}`;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.fillText(cat.text, dynamicX + FIXED_TAB_W / 2, 14);
    } else {
      // Inactive text (ממורכז לחלוטין בתוך הריבוע הקבוע)
      ctx.fillStyle = '#445544';
      ctx.font = `5px ${FONT_HE}`;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.fillText(cat.text, dynamicX + FIXED_TAB_W / 2, 14);

      // Inactive: small colored dot
      // כיוון שהכל קבוע, הנקודה ממוקמת תמיד 4 פיקסלים מהקצה השמאלי של הטאב הקבוע
      if (cat.dotColor) {
        ctx.fillStyle = cat.dotColor;
        ctx.fillRect(dynamicX + 3, 15, 3, 3);
      }
    }

    // עדכון נקודת המוצא לטאב הבא בתור (תזוזה שמאלה)
    currentX = dynamicX - TAB_SPACING;
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

      // loadImage
      const itemImg = getCachedImage(item.sprite);
      if (itemImg) {
        ctx.drawImage(itemImg, 216, cardY + 4, 12, 12);
      } else {
        // Icon (16×16 box at x=214)
        drawItemIcon(ctx, iconInfo.type, iconInfo.color, 214, cardY + 2);
      }

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
      ctx.fillText(getLocalizedName(item.description), 210, cardY + 12);

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
    const thumbY = maxScroll > 0 ? 28 + (shop.scrollOffset / maxScroll) * (110 - thumbH) : 28;
    ctx.fillStyle = '#1a4a30';
    ctx.fillRect(237, thumbY, 2, thumbH);
  }

  // ── BOTTOM BAR (y=150, h=10) ──
  fillRect(ctx, 0, 150, 240, 10, '#0a1a10');

  const keys = [
    { pillX: 4, pillW: 18, pillText: 'ESC', hintX: 24, hintText: 'יציאה' },
    { pillX: 52, pillW: 24, pillText: 'Enter', hintX: 78, hintText: t('shop.buy') },
    { pillX: 108, pillW: 14, pillText: '◀▶', hintX: 124, hintText: 'קטגוריה' },
    { pillX: 160, pillW: 14, pillText: '▲▼', hintX: 176, hintText: 'ניווט' },
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

  // ── QUIZ RESULT OVERLAY ──
  // ─── 1. חלונית בחירת כמות (נפתחת בלחיצה ראשונה על Enter בחנות) ───
  if (shop.open && shop.quantitySelection && !shop.quizActive && shop.items.length > 0) {
    const item = shop.items[shop.selectedItem];
    const totalCost = item.price * shop.quantity;

    // רקע חלונית כמות
    fillRect(ctx, 20, 45, 200, 65, 'rgba(5, 15, 10, 0.98)');
    ctx.strokeStyle = '#2a6a40';
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, 20, 45, 200, 65, 4);

    ctx.textAlign = 'center';
    ctx.direction = 'rtl';

    // כותרת ושם החפץ
    ctx.fillStyle = '#ffffff';
    ctx.font = `7px ${FONT_HE}`;
    ctx.fillText(`${getLocalizedName(item.name)}`, 120, 52);

    // מחוון כמות (כאן משתמשים בחצים למעלה/למטה לבחירת כמות)
    ctx.fillStyle = '#20d860';
    ctx.font = `bold 9px ${FONT_HE}`;
    ctx.fillText(`▲ כמות: ${shop.quantity} ▼`, 120, 68);

    // עלות מחושבת בזמן אמת
    ctx.font = `6px ${FONT_HE}`;
    ctx.fillStyle = '#f8d030';
    ctx.fillText(`עלות כוללת: ₪${totalCost}`, 120, 82);

    // מחוון מבצע / הנחה זמינה לסשן
    if (shop.sessionDiscount > 0) {
      ctx.fillStyle = '#ffb000';
      ctx.fillText(`[SPACE] הפעלת אתגר הנחה של ${shop.sessionDiscount}%!`, 120, 96);
    } else {
      ctx.fillStyle = '#556655';
      ctx.fillText('אין הנחות זמינות בחנות כרגע', 120, 96);
    }
  }

  // ─── 2. חלונית אתגר ההנחה וקלט המקלדת (נפתחת בלחיצה על SPACE) ───
  if (shop.open && shop.quizActive && shop.items.length > 0) {
    const item = shop.items[shop.selectedItem];
    const baseTotalPrice = item.price * shop.quantity;

    // נוסחת חישוב המחיר המופחת הנכון (מעוגל)
    const correctAnswer = Math.round(baseTotalPrice * (1 - shop.sessionDiscount / 100));

    // רקע חלונית שאלה
    fillRect(ctx, 15, 35, 210, 90, '#05100a');
    ctx.strokeStyle = '#ffb000';
    ctx.lineWidth = 1;
    strokeRoundRect(ctx, 15, 35, 210, 90, 4);

    ctx.textAlign = 'center';
    ctx.direction = 'rtl';

    if (shop.quizResult === null) {
      // ── מצב א': הצגת השאלה וקליטת המספרים מהמקלדת ──
      ctx.fillStyle = '#ffb000';
      ctx.font = `bold 7px ${FONT_HE}`;
      ctx.fillText('אתגר חישוב הנחה!', 120, 44);

      ctx.fillStyle = '#ffffff';
      ctx.font = `6px ${FONT_HE}`;
      ctx.fillText(`קניית ${shop.quantity} יח' של ${getLocalizedName(item.name)}`, 120, 56);
      ctx.fillText(`מחיר מלא: ₪${baseTotalPrice}`, 120, 66);

      ctx.fillStyle = '#20d860';
      ctx.fillText(`מה המחיר המדויק לאחר ${shop.sessionDiscount}% הנחה?`, 120, 78);

      // אינפוט טקסטואלי שמציג את מה שהשחקן מקליד (בסטרינג shop.quizInputStr)
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 10px ${FONT_HE}`;
      ctx.direction = 'ltr'; // מספרים מוצגים משמאל לימין

      // אם עוד לא הקליד כלום, נראה קו תחתון ריק
      const displayText = shop.quizInputStr === '' ? '₪_____' : `₪${shop.quizInputStr}`;
      ctx.fillText(displayText, 120, 96);

      ctx.fillStyle = '#557766';
      ctx.font = `5px ${FONT_HE}`;
      ctx.direction = 'rtl';
      ctx.fillText('הקש מספרים במקלדת | Backspace למחיקה | Enter לבדיקה', 120, 114);
    } else {
      // ── מצב ב': השחקן לחץ Enter וכרגע מוצג פידבק (למשך 2 שניות) ──
      ctx.font = `bold 10px ${FONT_HE}`;

      if (shop.quizResult === 'correct') {
        ctx.fillStyle = '#20d860';
        ctx.fillText('תשובה נכונה!', 120, 65);
        ctx.font = `7px ${FONT_HE}`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`זכית במחיר המוזל: ₪${correctAnswer}`, 120, 85);
      } else {
        ctx.fillStyle = '#ff4444';
        ctx.fillText('טעות בחישוב!', 120, 60);
        ctx.font = `7px ${FONT_HE}`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`התשובה הנכונה היא: ₪${correctAnswer}`, 120, 78);
        ctx.fillStyle = '#888888';
        ctx.fillText('מבצע רכישה אוטומטית במחיר מלא...', 120, 96);
      }
    }
  }

  ctx.restore();
}

// Quiz for discount
function rollSessionDiscount(): number {
  const rand = Math.random(); // מספר בין 0 ל-1
  if (rand < 0.5) return 0; // 50% סיכוי ל-0% הנחה
  if (rand < 0.7) return 10; // 20% סיכוי ל-10% הנחה (0.50 עד 0.70)
  if (rand < 0.9) return 20; // 20% סיכוי ל-20% הנחה (0.70 עד 0.90)
  return 30; // 10% סיכוי ל-30% הנחה (0.90 עד 1.00)
}

function calculateDiscountedPrice(totalPrice: number, discountPercent: number): number {
  return Math.round(totalPrice * (1 - discountPercent / 100));
}

function handleKeyboardNumericInput(shop: ShopState, input: InputManager): void {
  // בדיקת מקשי מספרים 0-9
  for (let i = 0; i <= 9; i++) {
    if (input.isKeyPressed(String(i))) {
      // מניעת הקלדת אפס בהתחלה סתם
      if (shop.quizInputStr === '' && i === 0) continue;

      // הגבלת אורך מקסימלי (למשל עד 6 ספרות, כדי שלא יגלוש מהמסך)
      if (shop.quizInputStr.length < 6) {
        shop.quizInputStr += String(i);
      }
    }
  }

  // תמיכה במחיקה (Backspace)
  if (input.isKeyPressed('Backspace') && shop.quizInputStr.length > 0) {
    shop.quizInputStr = shop.quizInputStr.slice(0, -1);
  }
}
