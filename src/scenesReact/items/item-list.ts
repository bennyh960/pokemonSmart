/**
 * Pure list logic shared by the bag and the shop: filtering by pocket / category /
 * search, sorting, and how an item is named in a list. No React.
 */
import type { ItemDef } from '../../data/items.js';
import type { ItemCategory } from '../../data/item-defs.js';
import { getTMEffect } from '../../data/item-defs.js';
import { BAG_POCKETS, type BagPocketId } from '../../data/bag-pockets.js';
import { getMove } from '../../services/pokemon-data.js';

export interface ItemEntry {
  id: string;
  def: ItemDef;
  /** How many the player has */
  qty: number;
}

export type ItemSort = 'default' | 'name' | 'qty' | 'price';

export interface ItemFilter {
  pocket: BagPocketId | 'all';
  /** Pockets with several categories (Medicine): narrow to one of them */
  category: ItemCategory | null;
  query: string;
  sort: ItemSort;
}

const pocketIndex = (c: ItemCategory) => BAG_POCKETS.findIndex((p) => p.categories.includes(c));
const isHM = (id: string) => getTMEffect(id)?.isHM ?? false;

/** Item name as shown in a list — a TM/HM adds its move ("TM24 Thunderbolt"). */
export function entryName(def: ItemDef, locale: 'en' | 'he'): string {
  const tm = getTMEffect(def.id);
  const move = tm ? getMove(tm.moveId) : undefined;
  return move ? `${def.name[locale]} ${move.name[locale]}` : def.name[locale];
}

export function matchesQuery(e: ItemEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tm = getTMEffect(e.id);
  const move = tm ? getMove(tm.moveId) : undefined;
  const words = [e.id, e.def.name.en, e.def.name.he, move?.name.en, move?.name.he];
  return words.some((w) => !!w && w.toLowerCase().includes(q));
}

export function sortEntries<T extends ItemEntry>(list: T[], sort: ItemSort): T[] {
  // Stable sort: the default keeps the incoming order inside a pocket
  return [...list].sort((a, b) => {
    if (sort === 'name') return a.def.name.en.localeCompare(b.def.name.en);
    if (sort === 'qty') return b.qty - a.qty;
    if (sort === 'price') return a.def.price - b.def.price;
    const p = pocketIndex(a.def.category) - pocketIndex(b.def.category);
    if (p !== 0) return p;
    if (a.def.category === 'machine' && b.def.category === 'machine') {
      if (isHM(a.id) !== isHM(b.id)) return isHM(a.id) ? -1 : 1;
      return a.id.localeCompare(b.id);
    }
    return 0;
  });
}

export function inPocket(e: ItemEntry, pocket: ItemFilter['pocket']): boolean {
  if (pocket === 'all') return true;
  return BAG_POCKETS.find((p) => p.id === pocket)?.categories.includes(e.def.category) ?? false;
}

/** The list shown for a filter. A search looks through every pocket. */
export function filterEntries<T extends ItemEntry>(entries: T[], f: ItemFilter): T[] {
  const searching = f.query.trim() !== '';
  const list = entries.filter(
    (e) =>
      matchesQuery(e, f.query) &&
      (searching || inPocket(e, f.pocket)) &&
      (searching || !f.category || e.def.category === f.category),
  );
  return sortEntries(list, f.sort);
}

/** Sub-category chips of a pocket that actually have items (no empty chips). */
export function presentCategories(entries: ItemEntry[], pocket: ItemFilter['pocket']): ItemCategory[] {
  const p = BAG_POCKETS.find((x) => x.id === pocket);
  if (!p || p.categories.length < 2) return [];
  return p.categories.filter((c) => entries.some((e) => e.def.category === c));
}
