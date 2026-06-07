/**
 * Item lookup layer — combines items.json (identity) + item-defs.ts (game logic)
 * into a unified ItemDef for consumers (bag, shop, battle, editors).
 *
 * This is an adapter: no data is stored here. All data comes from:
 *   - items.json:    name {en,he}, slug, description, sprite, category (PokeAPI)
 *   - item-defs.ts:  effect, price, usableInBattle, usableInOverworld, topColor (game logic)
 */

import { t } from '../i18n/i18n.js';
import { getPokemonDisplayName, type LocalizedName } from '../services/pokemon-data.js';
import type { BattlePokemonRuntimeState } from '../systems/battle-state.js';
import type { Pokemon } from '../types/index.js';
import { ITEM_GAME_DATA, ITEM_ID_TO_SLUG, type ItemCategory, type ItemEffect } from './item-defs.js';
import itemsJson from './items.json';

export type { ItemCategory, ItemEffect } from './item-defs.js';

const rawItems = itemsJson as unknown as Record<
  string,
  {
    name: { en: string; he: string };
    slug: string;
    description: { en: string; he: string };
    category: string;
    sprite: string | null;
    holdable: boolean;
    flingPower: number | null;
  }
>;

export interface ItemDef {
  id: string; // slug (e.g. 'potion') — used as key in player inventory
  numericId: number; // PokeAPI item ID
  name: LocalizedName; // { en, he } — use getLocalizedName() to resolve
  description: LocalizedName; // { en, he } — use getLocalizedName() to resolve
  category: ItemCategory;
  price: number;
  effect: ItemEffect;
  usableInBattle: boolean;
  usableInOverworld: boolean;
  sprite: string;
  topColor?: string; // Pokeball top-half color
  // ── Key item fields (forwarded from ItemGameDef) ──
  keyFlag?: string; // Flag auto-set when item is received
  usedFlag?: string; // Flag that marks item as delivered/used
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

    result[slug] = {
      id: slug,
      numericId: numId,
      name: resolvedName,
      description: gameDef.description ?? raw?.description ?? { en: 'unknown', he: '???' },
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
  return Object.values(ITEMS).filter((i) => i.category === category);
}

/** Items available in the Poke Mart (price > 0, not key items). */
export function getShopItems(): ItemDef[] {
  return Object.values(ITEMS).filter((i) => i.price > 0 && i.category !== 'key');
}

// moveTypeBoost - is private case handle in calcDamage
// rest for now seems works by this func
export const applyHeldItemEffectInBattle = ({
  pokemon,
  runtimeState,
  actor,
  when,
  lines,
  queueStatusTurnEffect,
}: {
  pokemon: Pokemon;
  runtimeState: BattlePokemonRuntimeState;
  actor: 'player' | 'enemy';
  when: 'endOfTurn' | 'onSwitchOut';
  lines: string[];
  queueStatusTurnEffect: (actor: 'player' | 'enemy', itemId: string) => void;
}) => {
  const heldItem = pokemon.heldItemId ? getItem(pokemon.heldItemId) : null;
  if (!heldItem) return;
  if (heldItem.effect.type === 'battle' && heldItem.category === 'held') {
    const { isEndOfTurn, localMessage, hpAmount, category, condition } = heldItem.effect.config;
    if ((when === 'endOfTurn' && isEndOfTurn) || (when === 'onSwitchOut' && !isEndOfTurn)) {
      const isConditionMet = condition ? condition({ runtimeState: runtimeState }) : true;
      if (hpAmount && isConditionMet) {
        const healAmount = Math.floor(pokemon.maxHp * hpAmount);
        pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + healAmount);
        queueStatusTurnEffect(actor, heldItem.id);
        lines.push(t(localMessage ?? '', { name: getPokemonDisplayName(pokemon.id), amount: healAmount }));
      }
    }

    //! choice not working on enemy pokemon since we don't track their lastMoveUsedId in runtimeState — would need to add that for this to work properly on enemy-held items. For now, just apply the lock-in effect to player pokemon.
    if (category === 'choice' && runtimeState.lastMoveUsedId) {
      const movesToLock = pokemon.moves.map((m) => m.id).filter((id) => id !== runtimeState.lastMoveUsedId);
      runtimeState.softLockedInMovesId = movesToLock.length > 0 ? movesToLock : null;
    }
  }
};
