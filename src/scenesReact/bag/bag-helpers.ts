/**
 * Pure bag logic: which items are listed, how they are filtered/sorted, and what
 * the main button does for each one. No React, no scene — tested in __tests__.
 */
import type { PlayerData } from '../../types/index.js';
import { ITEMS, getItem, type ItemDef } from '../../data/items.js';
import type { ItemCategory } from '../../data/item-defs.js';
import { getTMEffect } from '../../data/item-defs.js';
import { BAG_POCKETS, type BagPocketId } from '../../data/bag-pockets.js';
import { getMove } from '../../services/pokemon-data.js';
import { itemTargetsPokemon, isDirectUseItem } from '../../systems/item-effects.js';
import type { BagMode } from './bag-mode.js';

export interface BagEntry {
  id: string;
  def: ItemDef;
  qty: number;
}

export type BagSort = 'default' | 'name' | 'qty';

export interface BagFilter {
  pocket: BagPocketId | 'all';
  /** Medicine only: narrow to one of its categories */
  category: ItemCategory | null;
  query: string;
  sort: BagSort;
}

/** Every item the player owns that this bag mode may show, in pocket order. */
export function bagEntries(items: PlayerData['items'], mode: BagMode): BagEntry[] {
  const out: BagEntry[] = [];
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

const pocketIndex = (c: ItemCategory) => BAG_POCKETS.findIndex((p) => p.categories.includes(c));
const isHM = (id: string) => getTMEffect(id)?.isHM ?? false;

/** Item name as shown in the bag — a TM/HM adds its move ("TM24 Thunderbolt"). */
export function entryName(def: ItemDef, locale: 'en' | 'he'): string {
  const tm = getTMEffect(def.id);
  const move = tm ? getMove(tm.moveId) : undefined;
  return move ? `${def.name[locale]} ${move.name[locale]}` : def.name[locale];
}

export function matchesQuery(e: BagEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tm = getTMEffect(e.id);
  const move = tm ? getMove(tm.moveId) : undefined;
  const words = [e.id, e.def.name.en, e.def.name.he, move?.name.en, move?.name.he];
  return words.some((w) => !!w && w.toLowerCase().includes(q));
}

export function sortEntries(list: BagEntry[], sort: BagSort): BagEntry[] {
  // Stable sort: the default keeps the order items were first received inside a pocket
  return [...list].sort((a, b) => {
    if (sort === 'name') return a.def.name.en.localeCompare(b.def.name.en);
    if (sort === 'qty') return b.qty - a.qty;
    const p = pocketIndex(a.def.category) - pocketIndex(b.def.category);
    if (p !== 0) return p;
    if (a.def.category === 'machine' && b.def.category === 'machine') {
      if (isHM(a.id) !== isHM(b.id)) return isHM(a.id) ? -1 : 1;
      return a.id.localeCompare(b.id);
    }
    return 0;
  });
}

export function inPocket(e: BagEntry, pocket: BagFilter['pocket']): boolean {
  if (pocket === 'all') return true;
  return BAG_POCKETS.find((p) => p.id === pocket)?.categories.includes(e.def.category) ?? false;
}

/** The list shown for a filter. A search looks through every pocket. */
export function filterEntries(entries: BagEntry[], f: BagFilter): BagEntry[] {
  const searching = f.query.trim() !== '';
  const list = entries.filter(
    (e) =>
      matchesQuery(e, f.query) &&
      (searching || inPocket(e, f.pocket)) &&
      (searching || !f.category || e.def.category === f.category),
  );
  return sortEntries(list, f.sort);
}

/** Medicine sub-filters that actually have items (no empty chips). */
export function presentCategories(entries: BagEntry[], pocket: BagFilter['pocket']): ItemCategory[] {
  const p = BAG_POCKETS.find((x) => x.id === pocket);
  if (!p || p.categories.length < 2) return [];
  return p.categories.filter((c) => entries.some((e) => e.def.category === c));
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
