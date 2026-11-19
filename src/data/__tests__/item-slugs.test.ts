import { describe, expect, it } from 'vitest';
import itemsJson from '../items.json';
import { ITEM_GAME_DATA, ITEM_SLUG_TO_ID } from '../item-defs';
import { getItem } from '../items';

const ITEMS_JSON = itemsJson as Record<string, { slug: string }>;

describe('item slug map', () => {
  it('ITEM_SLUG_TO_ID agrees with the items.json slugs', () => {
    const mismatches = Object.entries(ITEM_SLUG_TO_ID)
      .filter(([slug, id]) => ITEMS_JSON[id] && ITEMS_JSON[id].slug !== slug)
      .map(([slug, id]) => `${id}: ${slug} ≠ ${ITEMS_JSON[id].slug}`);
    expect(mismatches).toEqual([]);
  });

  it('every item with game data resolves by its numeric id', () => {
    const missing = Object.keys(ITEM_GAME_DATA).filter((id) => ITEMS_JSON[id] && !getItem(id));
    expect(missing).toEqual([]);
  });
});
