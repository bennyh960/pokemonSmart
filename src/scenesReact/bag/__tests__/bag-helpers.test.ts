import { describe, it, expect, vi } from 'vitest';
vi.mock('../../../auth/supabase-client.js', () => ({ supabase: {} }));
import { ITEMS } from '../../../data/items';
import { BAG_POCKETS, pocketOf } from '../../../data/bag-pockets';
import { bagEntries, canToss, filterEntries, presentCategories, primaryAction, type BagFilter } from '../bag-helpers';

const F: BagFilter = { pocket: 'all', category: null, query: '', sort: 'default' };
const items = { potion: 3, antidote: 1, revive: 2, 'poke-ball': 10, 'great-ball': 4, 'exp-share': 1, 'bypass-card': 2 };

describe('bag pockets', () => {
  it('every item category belongs to exactly one pocket', () => {
    for (const def of Object.values(ITEMS)) {
      const owners = BAG_POCKETS.filter((p) => p.categories.includes(def.category));
      expect(
        owners.map((p) => p.id),
        `${def.id} (${def.category})`,
      ).toHaveLength(1);
    }
  });
});

describe('bag list', () => {
  it('lists owned items in pocket order', () => {
    const ids = bagEntries({ 'poke-ball': 1, potion: 2, zero: 0 }, 'overworld').map((e) => e.id);
    expect(ids).toEqual(['potion', 'poke-ball']);
  });

  it('battle mode shows only items usable in battle', () => {
    for (const e of bagEntries(items, 'battle')) expect(e.def.usableInBattle).toBe(true);
    expect(bagEntries(items, 'battle').some((e) => e.id === 'poke-ball')).toBe(true);
  });

  it('sell mode hides key items and free items', () => {
    const ids = bagEntries(items, 'sell-item').map((e) => e.id);
    expect(ids).not.toContain('bypass-card');
    for (const id of ids) expect(ITEMS[id].price).toBeGreaterThan(0);
  });

  it('filters by pocket and medicine category', () => {
    const all = bagEntries(items, 'overworld');
    expect(filterEntries(all, { ...F, pocket: 'balls' }).map((e) => e.id)).toEqual(['poke-ball', 'great-ball']);
    expect(filterEntries(all, { ...F, pocket: 'medicine', category: 'revival' }).map((e) => e.id)).toEqual(['revive']);
    expect(presentCategories(all, 'medicine')).toEqual(['healing', 'status-cure', 'revival']);
    expect(presentCategories(all, 'balls')).toEqual([]);
  });

  it('search looks through every pocket, in English or Hebrew', () => {
    const all = bagEntries(items, 'overworld');
    expect(filterEntries(all, { ...F, pocket: 'key', query: 'ball' }).map((e) => e.id)).toEqual([
      'poke-ball',
      'great-ball',
    ]);
    const he = ITEMS['potion'].name.he;
    expect(filterEntries(all, { ...F, query: he }).map((e) => e.id)).toContain('potion');
  });

  it('sorts by amount', () => {
    const all = bagEntries(items, 'overworld');
    expect(filterEntries(all, { ...F, sort: 'qty' })[0].id).toBe('poke-ball');
  });
});

describe('bag actions', () => {
  it('picks the right main action', () => {
    expect(primaryAction(ITEMS['potion'], 'overworld').kind).toBe('use');
    expect(primaryAction(ITEMS['exp-share'], 'overworld').kind).toBe('give');
    expect(primaryAction(ITEMS['poke-ball'], 'overworld').kind).toBe('none');
    expect(primaryAction(ITEMS['poke-ball'], 'battle').kind).toBe('pick');
    expect(primaryAction(ITEMS['potion'], 'sell-item').kind).toBe('sell');
    const tm = Object.values(ITEMS).find((d) => d.category === 'machine')!;
    expect(primaryAction(tm, 'overworld').kind).toBe('teach');
  });

  it('never tosses key items or machines', () => {
    expect(canToss(ITEMS['potion'], 'overworld')).toBe(true);
    expect(canToss(ITEMS['potion'], 'battle')).toBe(false);
    expect(canToss(ITEMS['bypass-card'], 'overworld')).toBe(false);
    expect(pocketOf('machine')?.id).toBe('machines');
  });
});
