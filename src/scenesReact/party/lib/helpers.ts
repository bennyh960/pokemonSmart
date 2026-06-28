import type { PartyMode } from '..';
import { getItem, type ItemDef } from '../../../data/items';
import type { Pokemon } from '../../../types';

export const getQuickActionsItems = (mode: PartyMode, inventory: Record<string, number>) => {
  // todo: add 'evolution' later and only if pokemon is eligible for evolution
  // todo: 'vitamin' only when not in battle mode

  const items = Object.entries(inventory)
    .map(([itemId, count]) => {
      const itemDef = getItem(itemId);
      return { itemId, count, itemDef };
    })
    .filter(
      (entry) =>
        entry.itemDef &&
        entry.count > 0 &&
        ['healing', 'status-cure', 'revival', 'pp-restore', 'battle', 'vitamin'].includes(entry.itemDef.category) &&
        ((mode.kind === 'battle' && entry.itemDef.usableInBattle) ||
          (mode.kind === 'overworld' && entry.itemDef.usableInOverworld)),
    );
  console.debug('QuickActionButton items:', items);
  return items;
};

export const getQuickActions = (pokemon: Pokemon, mode: PartyMode, inventory: Record<string, number>) => {
  const items = getQuickActionsItems(mode, inventory);

  const itemsToShow: Array<{ itemId: string; count: number; itemDef: ItemDef | undefined }> = [];

  if (pokemon.hp <= 0) {
    // fainted pokemon: only revival items are relevant
    itemsToShow.push(...items.filter((entry) => entry.itemDef?.category === 'revival' && entry.count > 0));
  } else if (pokemon.hp < pokemon.maxHp) {
    // damaged pokemon: only healing/status/pp items are relevant
    itemsToShow.push(
      ...items.filter((entry) => ['healing', 'status-cure', 'pp-restore'].includes(entry.itemDef?.category ?? '')),
    );
  }

  return itemsToShow;
};
