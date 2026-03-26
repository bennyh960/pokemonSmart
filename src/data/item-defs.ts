/**
 * Game-specific item definitions — effects, prices, usability flags.
 *
 * Keyed by PokeAPI numeric item ID. Item identity (name, description, sprite)
 * comes from items.json — this file only defines game behavior.
 *
 * To look up an item:
 *   items.json[id]       → name, description, sprite (PokeAPI data)
 *   ITEM_GAME_DATA[id]   → effect, price, category, usability (our game logic)
 */

// ─── Types ───

export type ItemCategory = 'healing' | 'status-cure' | 'revival' | 'pokeball' | 'battle' | 'vitamin' | 'pp-restore' | 'evolution' | 'held' | 'key';

export type ItemEffect =
  | { type: 'heal'; amount: number }
  | { type: 'heal-full' }
  | { type: 'revive'; hpPercent: number }
  | { type: 'status-cure'; status: string | 'all' }
  | { type: 'pp-restore'; amount: number | 'all' }
  | { type: 'pp-restore-one'; amount: number }
  | { type: 'stat-boost'; stat: string; stages: number }
  | { type: 'capture'; rate: number }
  | { type: 'rare-candy' }
  | { type: 'evolution-stone' }
  | { type: 'none' };

export interface ItemGameDef {
  category: ItemCategory;
  price: number;              // 0 = not purchasable
  effect: ItemEffect;
  usableInBattle: boolean;
  usableInOverworld: boolean;
  topColor?: string;          // Pokeball top-half color for rendering
}

// ─── Slug ↔ ID mapping ───
// Allows existing code using string slugs to transition gradually.

export const ITEM_SLUG_TO_ID: Record<string, number> = {
  // Pokeballs
  'master-ball': 1,
  'ultra-ball': 2,
  'great-ball': 3,
  'poke-ball': 4,
  // Healing
  'potion': 17,
  'antidote': 18,
  'burn-heal': 19,
  'ice-heal': 20,
  'awakening': 21,
  'paralyze-heal': 22,
  'full-restore': 23,
  'max-potion': 24,
  'hyper-potion': 25,
  'super-potion': 26,
  'full-heal': 27,
  'revive': 28,
  'max-revive': 29,
  // Drinks
  'fresh-water': 30,
  'soda-pop': 31,
  'lemonade': 32,
  'moomoo-milk': 33,
  // PP recovery
  'ether': 38,
  'max-ether': 39,
  'elixir': 40,
  'max-elixir': 41,
  // Vitamins
  'hp-up': 45,
  'protein': 46,
  'iron': 47,
  'carbos': 48,
  'calcium': 49,
  'rare-candy': 50,
  // Battle items
  'guard-spec': 55,
  'dire-hit': 56,
  'x-attack': 57,
  'x-defense': 58,
  'x-speed': 59,
  'x-accuracy': 60,
  'x-special': 61,   // X Sp. Atk
  // Evolution stones
  'sun-stone': 80,
  'moon-stone': 81,
  'fire-stone': 82,
  'thunder-stone': 83,
  'water-stone': 84,
  'leaf-stone': 85,
  // Trade evolution held items
  'kings-rock': 198,
  'metal-coat': 210,
};

// Reverse lookup
export const ITEM_ID_TO_SLUG: Record<number, string> = Object.fromEntries(
  Object.entries(ITEM_SLUG_TO_ID).map(([slug, id]) => [id, slug])
);

// ─── Game data per item ───

export const ITEM_GAME_DATA: Record<number, ItemGameDef> = {
  // ── Pokeballs ──
  1:  { category: 'pokeball', price: 0,    effect: { type: 'capture', rate: 255 }, usableInBattle: true, usableInOverworld: false, topColor: '#8040c0' },  // Master Ball
  2:  { category: 'pokeball', price: 1200, effect: { type: 'capture', rate: 2 },   usableInBattle: true, usableInOverworld: false, topColor: '#e0c020' },  // Ultra Ball
  3:  { category: 'pokeball', price: 600,  effect: { type: 'capture', rate: 1.5 }, usableInBattle: true, usableInOverworld: false, topColor: '#3060e0' },  // Great Ball
  4:  { category: 'pokeball', price: 200,  effect: { type: 'capture', rate: 1 },   usableInBattle: true, usableInOverworld: false, topColor: '#e03030' },  // Poke Ball

  // ── Healing ──
  17: { category: 'healing', price: 300,  effect: { type: 'heal', amount: 20 },  usableInBattle: true, usableInOverworld: true },  // Potion
  26: { category: 'healing', price: 700,  effect: { type: 'heal', amount: 50 },  usableInBattle: true, usableInOverworld: true },  // Super Potion
  25: { category: 'healing', price: 1200, effect: { type: 'heal', amount: 200 }, usableInBattle: true, usableInOverworld: true },  // Hyper Potion
  24: { category: 'healing', price: 2500, effect: { type: 'heal-full' },         usableInBattle: true, usableInOverworld: true },  // Max Potion
  23: { category: 'healing', price: 3000, effect: { type: 'heal-full' },         usableInBattle: true, usableInOverworld: true },  // Full Restore

  // ── Drinks ──
  30: { category: 'healing', price: 200, effect: { type: 'heal', amount: 50 },  usableInBattle: true, usableInOverworld: true },  // Fresh Water
  31: { category: 'healing', price: 300, effect: { type: 'heal', amount: 60 },  usableInBattle: true, usableInOverworld: true },  // Soda Pop
  32: { category: 'healing', price: 350, effect: { type: 'heal', amount: 80 },  usableInBattle: true, usableInOverworld: true },  // Lemonade
  33: { category: 'healing', price: 500, effect: { type: 'heal', amount: 100 }, usableInBattle: true, usableInOverworld: true },  // Moomoo Milk

  // ── Status cures ──
  18: { category: 'status-cure', price: 100, effect: { type: 'status-cure', status: 'poison' },    usableInBattle: true, usableInOverworld: true },  // Antidote
  19: { category: 'status-cure', price: 250, effect: { type: 'status-cure', status: 'burn' },      usableInBattle: true, usableInOverworld: true },  // Burn Heal
  20: { category: 'status-cure', price: 250, effect: { type: 'status-cure', status: 'freeze' },    usableInBattle: true, usableInOverworld: true },  // Ice Heal
  21: { category: 'status-cure', price: 250, effect: { type: 'status-cure', status: 'sleep' },     usableInBattle: true, usableInOverworld: true },  // Awakening
  22: { category: 'status-cure', price: 200, effect: { type: 'status-cure', status: 'paralysis' }, usableInBattle: true, usableInOverworld: true },  // Paralyze Heal
  27: { category: 'status-cure', price: 600, effect: { type: 'status-cure', status: 'all' },       usableInBattle: true, usableInOverworld: true },  // Full Heal

  // ── Revival ──
  28: { category: 'revival', price: 1500, effect: { type: 'revive', hpPercent: 50 },  usableInBattle: true, usableInOverworld: true },  // Revive
  29: { category: 'revival', price: 0,    effect: { type: 'revive', hpPercent: 100 }, usableInBattle: true, usableInOverworld: true },  // Max Revive

  // ── PP recovery ──
  38: { category: 'pp-restore', price: 0, effect: { type: 'pp-restore-one', amount: 10 },  usableInBattle: true, usableInOverworld: true },  // Ether
  39: { category: 'pp-restore', price: 0, effect: { type: 'pp-restore-one', amount: 999 }, usableInBattle: true, usableInOverworld: true },  // Max Ether
  40: { category: 'pp-restore', price: 0, effect: { type: 'pp-restore', amount: 10 },      usableInBattle: true, usableInOverworld: true },  // Elixir
  41: { category: 'pp-restore', price: 0, effect: { type: 'pp-restore', amount: 'all' },   usableInBattle: true, usableInOverworld: true },  // Max Elixir

  // ── Vitamins ──
  45: { category: 'vitamin', price: 9800, effect: { type: 'none' },        usableInBattle: false, usableInOverworld: true },  // HP Up
  46: { category: 'vitamin', price: 9800, effect: { type: 'none' },        usableInBattle: false, usableInOverworld: true },  // Protein
  47: { category: 'vitamin', price: 9800, effect: { type: 'none' },        usableInBattle: false, usableInOverworld: true },  // Iron
  48: { category: 'vitamin', price: 9800, effect: { type: 'none' },        usableInBattle: false, usableInOverworld: true },  // Carbos
  49: { category: 'vitamin', price: 9800, effect: { type: 'none' },        usableInBattle: false, usableInOverworld: true },  // Calcium
  50: { category: 'vitamin', price: 0,    effect: { type: 'rare-candy' },  usableInBattle: false, usableInOverworld: true },  // Rare Candy

  // ── Battle items ──
  55: { category: 'battle', price: 700, effect: { type: 'none' },                                          usableInBattle: true, usableInOverworld: false },  // Guard Spec
  56: { category: 'battle', price: 650, effect: { type: 'none' },                                          usableInBattle: true, usableInOverworld: false },  // Dire Hit
  57: { category: 'battle', price: 500, effect: { type: 'stat-boost', stat: 'attack', stages: 1 },        usableInBattle: true, usableInOverworld: false },  // X Attack
  58: { category: 'battle', price: 550, effect: { type: 'stat-boost', stat: 'defense', stages: 1 },       usableInBattle: true, usableInOverworld: false },  // X Defense
  59: { category: 'battle', price: 350, effect: { type: 'stat-boost', stat: 'speed', stages: 1 },         usableInBattle: true, usableInOverworld: false },  // X Speed
  60: { category: 'battle', price: 950, effect: { type: 'stat-boost', stat: 'accuracy', stages: 1 },      usableInBattle: true, usableInOverworld: false },  // X Accuracy
  61: { category: 'battle', price: 350, effect: { type: 'stat-boost', stat: 'specialAttack', stages: 1 }, usableInBattle: true, usableInOverworld: false },  // X Sp. Atk

  // ── Evolution stones ──
  80: { category: 'evolution', price: 0, effect: { type: 'evolution-stone' }, usableInBattle: false, usableInOverworld: true },  // Sun Stone
  81: { category: 'evolution', price: 0, effect: { type: 'evolution-stone' }, usableInBattle: false, usableInOverworld: true },  // Moon Stone
  82: { category: 'evolution', price: 0, effect: { type: 'evolution-stone' }, usableInBattle: false, usableInOverworld: true },  // Fire Stone
  83: { category: 'evolution', price: 0, effect: { type: 'evolution-stone' }, usableInBattle: false, usableInOverworld: true },  // Thunder Stone
  84: { category: 'evolution', price: 0, effect: { type: 'evolution-stone' }, usableInBattle: false, usableInOverworld: true },  // Water Stone
  85: { category: 'evolution', price: 0, effect: { type: 'evolution-stone' }, usableInBattle: false, usableInOverworld: true },  // Leaf Stone

  // ── Trade evolution items (holdable) ──
  198: { category: 'held', price: 0, effect: { type: 'none' }, usableInBattle: false, usableInOverworld: false },  // King's Rock
  210: { category: 'held', price: 0, effect: { type: 'none' }, usableInBattle: false, usableInOverworld: false },  // Metal Coat
};

// ─── Lookup helpers ───

/** Get game data by PokeAPI item ID. */
export function getItemGameData(id: number): ItemGameDef | undefined {
  return ITEM_GAME_DATA[id];
}

/** Get game data by slug (legacy compatibility). */
export function getItemGameDataBySlug(slug: string): (ItemGameDef & { id: number }) | undefined {
  const id = ITEM_SLUG_TO_ID[slug];
  if (id == null) return undefined;
  const data = ITEM_GAME_DATA[id];
  if (!data) return undefined;
  return { ...data, id };
}

/** Get all items that are purchasable in shops. */
export function getShopItemIds(): number[] {
  return Object.entries(ITEM_GAME_DATA)
    .filter(([_, def]) => def.price > 0 && def.category !== 'key')
    .map(([id]) => Number(id));
}

/** Get all item IDs for a given category. */
export function getItemIdsByCategory(category: ItemCategory): number[] {
  return Object.entries(ITEM_GAME_DATA)
    .filter(([_, def]) => def.category === category)
    .map(([id]) => Number(id));
}
