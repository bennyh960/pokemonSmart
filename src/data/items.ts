/**
 * Item lookup layer — combines items.json (identity) + item-defs.ts (game logic)
 * into a unified ItemDef for consumers (bag, shop, battle, editors).
 *
 * This is an adapter: no data is stored here. All data comes from:
 *   - items.json:    name {en,he}, slug, description, sprite, category (PokeAPI)
 *   - item-defs.ts:  effect, price, usableInBattle, usableInOverworld, topColor (game logic)
 */

import type { LocalizedName } from '../services/pokemon-data.js';
import { ITEM_GAME_DATA, ITEM_ID_TO_SLUG, type ItemCategory, type ItemEffect } from './item-defs.js';
import itemsJson from './items.json';

export type { ItemCategory, ItemEffect } from './item-defs.js';

const rawItems = itemsJson as Record<string, {
  name: { en: string; he: string };
  slug: string;
  description: string;
  category: string;
  sprite: string | null;
  holdable: boolean;
  flingPower: number | null;
}>;

export interface ItemDef {
  id: string;                  // slug (e.g. 'potion') — used as key in player inventory
  numericId: number;           // PokeAPI item ID
  name: LocalizedName;         // { en, he } — use getLocalizedName() to resolve
  description: LocalizedName;  // { en, he } — use getLocalizedName() to resolve
  category: ItemCategory;
  price: number;
  effect: ItemEffect;
  usableInBattle: boolean;
  usableInOverworld: boolean;
  sprite: string;
  topColor?: string;           // Pokeball top-half color
  // ── Key item fields (forwarded from ItemGameDef) ──
  keyFlag?: string;            // Flag auto-set when item is received
  usedFlag?: string;           // Flag that marks item as delivered/used
  usedDescription?: { en: string; he: string }; // Shown in bag when usedFlag is true
}

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

/** Build the ITEMS lookup from JSON + game defs. Only items with game data are included. */
function buildItems(): Record<string, ItemDef> {
  const result: Record<string, ItemDef> = {};

  for (const [numIdStr, gameDef] of Object.entries(ITEM_GAME_DATA)) {
    const numId = Number(numIdStr);
    const raw = rawItems[numIdStr];
    const slug = raw?.slug ?? ITEM_ID_TO_SLUG[numId] ?? `item-${numId}`;

    // Resolve localized name and description: prefer game def override, then items.json, then slug fallback
    const resolvedName = gameDef.name ?? raw?.name ?? { en: slug, he: slug };
    const resolvedDescription = typeof gameDef.description === 'object'
      ? gameDef.description.en
      : (raw?.description ?? '');

    result[slug] = {
      id: slug,
      numericId: numId,
      name: resolvedName,
      description: resolvedDescription,
      category: gameDef.category,
      price: gameDef.price,
      effect: gameDef.effect,
      usableInBattle: gameDef.usableInBattle,
      usableInOverworld: gameDef.usableInOverworld,
      sprite: raw?.sprite ?? `${SPRITE_BASE}/${slug}.png`,
      topColor: gameDef.topColor,
      keyFlag: gameDef.keyFlag,
      usedFlag: gameDef.usedFlag,
      usedDescription: gameDef.usedDescription,
    };
  }

  return result;
}

export const ITEMS: Record<string, ItemDef> = buildItems();

// ─── Public API (same signatures as before) ───

export function getItem(id: string): ItemDef | undefined {
  // Support both slugs and numeric ID strings
  if (ITEMS[id]) return ITEMS[id];
  const numId = Number(id);
  if (!isNaN(numId)) {
    const slug = ITEM_ID_TO_SLUG[numId];
    if (slug) return ITEMS[slug];
  }
  return undefined;
}

export function getAllItems(): ItemDef[] {
  return Object.values(ITEMS);
}

export function getItemsByCategory(category: ItemCategory): ItemDef[] {
  return Object.values(ITEMS).filter(i => i.category === category);
}

/** Items available in the Poke Mart (price > 0, not key items). */
export function getShopItems(): ItemDef[] {
  return Object.values(ITEMS).filter(i => i.price > 0 && i.category !== 'key');
}
