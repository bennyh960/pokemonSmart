/**
 * Bag pockets — the one place that groups item categories for the player.
 * Every ItemCategory belongs to exactly one pocket (checked in a test).
 * Medicine is split further by its own categories (HP / status / revive / PP).
 */

import type { ItemCategory } from './item-defs.js';

export type BagPocketId = 'medicine' | 'balls' | 'battle' | 'held' | 'boost' | 'machines' | 'key';

export interface BagPocket {
  id: BagPocketId;
  /** i18n key of the pocket's name */
  labelKey: string;
  categories: ItemCategory[];
  /** Dot color in the pocket list */
  color: string;
}

export const BAG_POCKETS: BagPocket[] = [
  {
    id: 'medicine',
    labelKey: 'bag.pocket.medicine',
    categories: ['healing', 'status-cure', 'revival', 'pp-restore'],
    color: '#20d860',
  },
  { id: 'balls', labelKey: 'bag.pocket.balls', categories: ['pokeball'], color: '#e85858' },
  { id: 'battle', labelKey: 'bag.pocket.battle', categories: ['battle'], color: '#f08030' },
  { id: 'held', labelKey: 'bag.pocket.held', categories: ['held'], color: '#8a7cf0' },
  { id: 'boost', labelKey: 'bag.pocket.boost', categories: ['vitamin', 'evolution'], color: '#d070d0' },
  { id: 'machines', labelKey: 'bag.pocket.machines', categories: ['machine'], color: '#40a0c0' },
  { id: 'key', labelKey: 'bag.pocket.key', categories: ['key'], color: '#f8d030' },
];

/** i18n key for a single category — used for the medicine sub-filter chips and item subtitles. */
export const categoryLabelKey = (c: ItemCategory): string => `bag.category.${c}`;

export function pocketOf(category: ItemCategory): BagPocket | undefined {
  return BAG_POCKETS.find((p) => p.categories.includes(category));
}
