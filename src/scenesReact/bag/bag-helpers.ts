/**
 * Pure bag logic: which items the bag lists and what the main button does for each.
 * Filtering / sorting is shared with the shop (`../items/item-list.ts`). Tested in __tests__.
 */
import type { PlayerData } from '../../types/index.js';
import { ITEMS, getItem, type ItemDef } from '../../data/items.js';
import { getTMEffect } from '../../data/item-defs.js';
import { itemTargetsPokemon, isDirectUseItem } from '../../systems/item-effects.js';
import type { BagMode } from './bag-mode.js';
import { sortEntries, type ItemEntry } from '../items/item-list.js';

/** Every item the player owns that this bag mode may show, in pocket order. */
export function bagEntries(items: PlayerData['items'], mode: BagMode): ItemEntry[] {
  const out: ItemEntry[] = [];
  for (const [id, qty] of Object.entries(items)) {
    if (qty <= 0) continue;
    const def = ITEMS[id] ?? getItem(id);
    if (!def) continue;
    if (mode === 'battle' && !def.usableInBattle) continue;
    if (mode === 'sell-item' && (def.price <= 0 || def.category === 'key')) continue;
    out.push({ id, def, qty });
  }
  return sortEntries(out, 'default');
}

export const sellPrice = (def: ItemDef): number => Math.floor(def.price / 2);

/** A story key item with a usedFlag shows ✓ / pending instead of a quantity. */
export const isStoryKeyItem = (def: ItemDef): boolean => def.category === 'key' && !!def.usedFlag;

export type BagAction = { kind: 'use' | 'teach' | 'give' | 'sell' | 'pick' } | { kind: 'none'; reasonKey: string };

/** What Enter / the main button does for this item in this mode. */
export function primaryAction(def: ItemDef, mode: BagMode): BagAction {
  if (mode === 'sell-item') return { kind: 'sell' };
  if (mode === 'battle') return { kind: 'pick' };
  if (def.category === 'held') return { kind: 'give' };
  if (def.category === 'key' && !isDirectUseItem(def.id)) return { kind: 'none', reasonKey: 'bag.keyItemNote' };
  if (!def.usableInOverworld) {
    return { kind: 'none', reasonKey: def.category === 'pokeball' ? 'bag.ballNote' : 'bag.battleOnly' };
  }
  if (itemTargetsPokemon(def.id)) return { kind: getTMEffect(def.id) ? 'teach' : 'use' };
  if (isDirectUseItem(def.id)) return { kind: 'use' };
  return { kind: 'none', reasonKey: 'bag.cantUseHere' };
}

/** Only ordinary items can be thrown away — never key items or TMs/HMs, and not mid-battle. */
export const canToss = (def: ItemDef, mode: BagMode): boolean =>
  mode === 'overworld' && def.category !== 'key' && def.category !== 'machine';
