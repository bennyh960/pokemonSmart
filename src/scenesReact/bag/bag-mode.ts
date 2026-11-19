/**
 * How the bag was opened, and the item picked in battle.
 * The battle scene reads `pendingItem` after the bag pops (phase WAITING_BAG).
 */
import { getItem, type ItemDef } from '../../data/items.js';

export type BagMode = 'overworld' | 'battle' | 'sell-item';

let bagMode: BagMode = 'overworld';

export let pendingItem: { itemId: string; def: ItemDef } | null = null;

export function setBagMode(mode: BagMode): void {
  bagMode = mode;
}

export function getBagMode(): BagMode {
  return bagMode;
}

export function setBagPendingItem(itemId: string) {
  const def = getItem(itemId);
  if (!def) return null;
  return (pendingItem = { itemId, def });
}

export function clearPendingItem(): void {
  pendingItem = null;
}
