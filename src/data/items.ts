/**
 * Item definitions for the Poke Mart and battle bag.
 */

export interface ItemDef {
  id: string;
  nameKey: string;       // i18n key for name
  descriptionKey: string; // i18n key for description
  price: number;
  effect: { type: 'heal'; amount: number };
  usableInBattle: boolean;
}

export const ITEMS: Record<string, ItemDef> = {
  'potion': {
    id: 'potion',
    nameKey: 'item.potion.name',
    descriptionKey: 'item.potion.desc',
    price: 300,
    effect: { type: 'heal', amount: 20 },
    usableInBattle: true,
  },
  'super-potion': {
    id: 'super-potion',
    nameKey: 'item.superPotion.name',
    descriptionKey: 'item.superPotion.desc',
    price: 700,
    effect: { type: 'heal', amount: 50 },
    usableInBattle: true,
  },
};

export function getItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}

export function getShopItems(): ItemDef[] {
  return Object.values(ITEMS);
}
