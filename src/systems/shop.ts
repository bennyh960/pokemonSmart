/**
 * Poké Mart logic: what a shopkeeper sells, the visit's discount challenge, buying.
 * The screen is `src/scenesReact/shop/`.
 */
import type { PlayerData } from '../types/index.js';
import { ITEMS, getItem, type ItemDef } from '../data/items.js';
import type { ItemCategory } from '../data/item-defs.js';
import type { RankConfig } from '../data/trainer-ranks.js';
import { getShopItemRank, isShopItemUnlocked } from './trainer-rank.js';
import { editPlayerData } from './player-store/player-store.js';

/** Set per shopkeeper NPC (`categoriesToExclude`, `shopCategoryTags`). */
export interface ShopConfig {
  categoriesToExclude: ItemCategory[];
  /** Per category, only items with one of these tags (e.g. the Percentile mart: shop TMs only). */
  categoryTags: Partial<Record<ItemCategory, string[]>>;
}

/** Marts never sell these — key items are story rewards, stones are found. */
const NEVER_SOLD: ItemCategory[] = ['key', 'evolution'];

export const MAX_BUY = 99;

export interface ShopStockItem {
  def: ItemDef;
  /** Set while the player's trainer rank is too low to buy it */
  lockedBy: RankConfig | null;
}

/** Everything this shopkeeper sells, including items the player's rank hasn't opened yet. */
export function shopStock(pd: PlayerData, cfg: ShopConfig): ShopStockItem[] {
  return Object.values(ITEMS)
    .filter((def) => def.price > 0 && !NEVER_SOLD.includes(def.category))
    .filter((def) => !cfg.categoriesToExclude.includes(def.category))
    .filter((def) => {
      const tags = cfg.categoryTags[def.category];
      return !tags || (def.tags ?? []).some((tag) => tags.includes(tag));
    })
    .map((def) => ({ def, lockedBy: isShopItemUnlocked(pd, def.id) ? null : (getShopItemRank(def.id) ?? null) }));
}

/** How many the player can afford (at full price), up to MAX_BUY. */
export const maxAffordable = (def: ItemDef, money: number): number =>
  Math.max(0, Math.min(MAX_BUY, Math.floor(money / def.price)));

/** A visit's discount: 50% none, 20% → 10%, 20% → 20%, 10% → 30%. */
export function rollShopDiscount(rand = Math.random()): number {
  if (rand < 0.5) return 0;
  if (rand < 0.7) return 10;
  if (rand < 0.9) return 20;
  return 30;
}

/** The answer of the discount challenge: the total after the discount, rounded. */
export const discountedPrice = (total: number, percent: number): number => Math.round(total * (1 - percent / 100));

/** Pays `total` for `count` of an item. False (nothing changes) if the money isn't there. */
export function buyItem(itemId: string, count: number, total: number): boolean {
  const def = getItem(itemId);
  let ok = false;
  editPlayerData((pd) => {
    if (!def || count <= 0 || pd.money < total) return;
    pd.money -= total;
    pd.items[itemId] = (pd.items[itemId] ?? 0) + count;
    ok = true;
  });
  return ok;
}
