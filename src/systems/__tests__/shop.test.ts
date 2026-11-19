import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../auth/supabase-client.js', () => ({ supabase: {} }));
import { createNewPlayerData, getPlayerData, startSandboxGame } from '../game-state.js';
import { isShopItemUnlocked } from '../trainer-rank.js';
import { buyItem, discountedPrice, maxAffordable, rollShopDiscount, shopStock } from '../shop.js';
import { ITEMS } from '../../data/items.js';

const ALL = { categoriesToExclude: [], categoryTags: {} };

beforeEach(() => startSandboxGame(createNewPlayerData()));

describe('shop stock', () => {
  it('never sells key items, stones or free items', () => {
    for (const { def } of shopStock(getPlayerData(), ALL)) {
      expect(def.price).toBeGreaterThan(0);
      expect(['key', 'evolution']).not.toContain(def.category);
    }
  });

  it('a shopkeeper can leave out whole categories', () => {
    const stock = shopStock(getPlayerData(), { categoriesToExclude: ['held', 'machine'], categoryTags: {} });
    expect(stock.some((s) => s.def.category === 'held' || s.def.category === 'machine')).toBe(false);
  });

  it('a tag filter keeps only tagged items of that category', () => {
    const stock = shopStock(getPlayerData(), { categoriesToExclude: [], categoryTags: { machine: ['shop-tm'] } });
    for (const s of stock.filter((x) => x.def.category === 'machine')) expect(s.def.tags).toContain('shop-tm');
  });

  it('items above the player rank are listed but locked, with the rank that opens them', () => {
    const pd = getPlayerData();
    const stock = shopStock(pd, ALL);
    for (const s of stock) expect(!!s.lockedBy).toBe(!isShopItemUnlocked(pd, s.def.id));
    const locked = stock.find((s) => s.lockedBy);
    if (locked) expect(locked.lockedBy!.label.he).toBeTruthy();
  });
});

describe('buying', () => {
  it('pays and adds the items; refuses without the money', () => {
    const pd = getPlayerData();
    pd.money = 1000;
    pd.items = {};
    expect(buyItem('potion', 2, 600)).toBe(true);
    expect(pd.money).toBe(400);
    expect(pd.items.potion).toBe(2);
    expect(buyItem('potion', 2, 600)).toBe(false);
    expect(pd.items.potion).toBe(2);
  });

  it('caps the amount by money and 99', () => {
    expect(maxAffordable(ITEMS['potion'], 0)).toBe(0);
    expect(maxAffordable(ITEMS['potion'], ITEMS['potion'].price * 3 + 1)).toBe(3);
    expect(maxAffordable(ITEMS['potion'], 10_000_000)).toBe(99);
  });

  it('discount answer and odds', () => {
    expect(discountedPrice(600, 20)).toBe(480);
    expect(discountedPrice(350, 30)).toBe(245);
    expect([0.1, 0.6, 0.8, 0.95].map(rollShopDiscount)).toEqual([0, 10, 20, 30]);
  });
});
