/**
 * Item definitions for the Poke Mart, battle bag, and trainer rewards.
 *
 * Items are categorized by type (healing, status-cure, revival, pokeball,
 * battle, vitamin, key). Each item has an i18n key pair, a price, an
 * optional effect, and a PokeAPI sprite URL.
 */

export type ItemCategory = 'healing' | 'status-cure' | 'revival' | 'pokeball' | 'battle' | 'vitamin' | 'key';

export type ItemEffect =
  | { type: 'heal'; amount: number }
  | { type: 'heal-full' }
  | { type: 'revive'; hpPercent: number }
  | { type: 'status-cure'; status: string | 'all' }
  | { type: 'pp-restore'; amount: number | 'all' }
  | { type: 'stat-boost'; stat: string; stages: number }
  | { type: 'capture'; rate: number }
  | { type: 'rare-candy' }
  | { type: 'none' };

export interface ItemDef {
  id: string;
  nameKey: string;        // i18n key for display name
  descriptionKey: string;  // i18n key for description
  category: ItemCategory;
  price: number;           // 0 = not purchasable
  effect: ItemEffect;
  usableInBattle: boolean;
  usableInOverworld: boolean;
  sprite: string;          // PokeAPI sprite URL
}

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items';

export const ITEMS: Record<string, ItemDef> = {
  // ── Healing ──
  'potion': {
    id: 'potion',
    nameKey: 'item.potion.name',
    descriptionKey: 'item.potion.desc',
    category: 'healing',
    price: 300,
    effect: { type: 'heal', amount: 20 },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/potion.png`,
  },
  'super-potion': {
    id: 'super-potion',
    nameKey: 'item.superPotion.name',
    descriptionKey: 'item.superPotion.desc',
    category: 'healing',
    price: 700,
    effect: { type: 'heal', amount: 50 },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/super-potion.png`,
  },
  'hyper-potion': {
    id: 'hyper-potion',
    nameKey: 'item.hyperPotion.name',
    descriptionKey: 'item.hyperPotion.desc',
    category: 'healing',
    price: 1200,
    effect: { type: 'heal', amount: 200 },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/hyper-potion.png`,
  },
  'max-potion': {
    id: 'max-potion',
    nameKey: 'item.maxPotion.name',
    descriptionKey: 'item.maxPotion.desc',
    category: 'healing',
    price: 2500,
    effect: { type: 'heal-full' },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/max-potion.png`,
  },
  'full-restore': {
    id: 'full-restore',
    nameKey: 'item.fullRestore.name',
    descriptionKey: 'item.fullRestore.desc',
    category: 'healing',
    price: 3000,
    effect: { type: 'heal-full' },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/full-restore.png`,
  },
  'fresh-water': {
    id: 'fresh-water',
    nameKey: 'item.freshWater.name',
    descriptionKey: 'item.freshWater.desc',
    category: 'healing',
    price: 200,
    effect: { type: 'heal', amount: 50 },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/fresh-water.png`,
  },
  'soda-pop': {
    id: 'soda-pop',
    nameKey: 'item.sodaPop.name',
    descriptionKey: 'item.sodaPop.desc',
    category: 'healing',
    price: 300,
    effect: { type: 'heal', amount: 60 },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/soda-pop.png`,
  },
  'lemonade': {
    id: 'lemonade',
    nameKey: 'item.lemonade.name',
    descriptionKey: 'item.lemonade.desc',
    category: 'healing',
    price: 350,
    effect: { type: 'heal', amount: 80 },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/lemonade.png`,
  },
  'moomoo-milk': {
    id: 'moomoo-milk',
    nameKey: 'item.moomooMilk.name',
    descriptionKey: 'item.moomooMilk.desc',
    category: 'healing',
    price: 500,
    effect: { type: 'heal', amount: 100 },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/moomoo-milk.png`,
  },

  // ── Status cures ──
  'antidote': {
    id: 'antidote',
    nameKey: 'item.antidote.name',
    descriptionKey: 'item.antidote.desc',
    category: 'status-cure',
    price: 100,
    effect: { type: 'status-cure', status: 'poison' },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/antidote.png`,
  },
  'burn-heal': {
    id: 'burn-heal',
    nameKey: 'item.burnHeal.name',
    descriptionKey: 'item.burnHeal.desc',
    category: 'status-cure',
    price: 250,
    effect: { type: 'status-cure', status: 'burn' },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/burn-heal.png`,
  },
  'ice-heal': {
    id: 'ice-heal',
    nameKey: 'item.iceHeal.name',
    descriptionKey: 'item.iceHeal.desc',
    category: 'status-cure',
    price: 250,
    effect: { type: 'status-cure', status: 'freeze' },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/ice-heal.png`,
  },
  'awakening': {
    id: 'awakening',
    nameKey: 'item.awakening.name',
    descriptionKey: 'item.awakening.desc',
    category: 'status-cure',
    price: 250,
    effect: { type: 'status-cure', status: 'sleep' },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/awakening.png`,
  },
  'paralyze-heal': {
    id: 'paralyze-heal',
    nameKey: 'item.paralyzeHeal.name',
    descriptionKey: 'item.paralyzeHeal.desc',
    category: 'status-cure',
    price: 200,
    effect: { type: 'status-cure', status: 'paralysis' },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/paralyze-heal.png`,
  },
  'full-heal': {
    id: 'full-heal',
    nameKey: 'item.fullHeal.name',
    descriptionKey: 'item.fullHeal.desc',
    category: 'status-cure',
    price: 600,
    effect: { type: 'status-cure', status: 'all' },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/full-heal.png`,
  },

  // ── Revival ──
  'revive': {
    id: 'revive',
    nameKey: 'item.revive.name',
    descriptionKey: 'item.revive.desc',
    category: 'revival',
    price: 1500,
    effect: { type: 'revive', hpPercent: 50 },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/revive.png`,
  },
  'max-revive': {
    id: 'max-revive',
    nameKey: 'item.maxRevive.name',
    descriptionKey: 'item.maxRevive.desc',
    category: 'revival',
    price: 0,
    effect: { type: 'revive', hpPercent: 100 },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/max-revive.png`,
  },

  // ── Pokeballs ──
  'poke-ball': {
    id: 'poke-ball',
    nameKey: 'item.pokeBall.name',
    descriptionKey: 'item.pokeBall.desc',
    category: 'pokeball',
    price: 200,
    effect: { type: 'capture', rate: 1 },
    usableInBattle: true,
    usableInOverworld: false,
    sprite: `${SPRITE_BASE}/poke-ball.png`,
  },
  'great-ball': {
    id: 'great-ball',
    nameKey: 'item.greatBall.name',
    descriptionKey: 'item.greatBall.desc',
    category: 'pokeball',
    price: 600,
    effect: { type: 'capture', rate: 1.5 },
    usableInBattle: true,
    usableInOverworld: false,
    sprite: `${SPRITE_BASE}/great-ball.png`,
  },
  'ultra-ball': {
    id: 'ultra-ball',
    nameKey: 'item.ultraBall.name',
    descriptionKey: 'item.ultraBall.desc',
    category: 'pokeball',
    price: 1200,
    effect: { type: 'capture', rate: 2 },
    usableInBattle: true,
    usableInOverworld: false,
    sprite: `${SPRITE_BASE}/ultra-ball.png`,
  },

  // ── Battle stat boosts ──
  'x-attack': {
    id: 'x-attack',
    nameKey: 'item.xAttack.name',
    descriptionKey: 'item.xAttack.desc',
    category: 'battle',
    price: 500,
    effect: { type: 'stat-boost', stat: 'attack', stages: 1 },
    usableInBattle: true,
    usableInOverworld: false,
    sprite: `${SPRITE_BASE}/x-attack.png`,
  },
  'x-defense': {
    id: 'x-defense',
    nameKey: 'item.xDefense.name',
    descriptionKey: 'item.xDefense.desc',
    category: 'battle',
    price: 550,
    effect: { type: 'stat-boost', stat: 'defense', stages: 1 },
    usableInBattle: true,
    usableInOverworld: false,
    sprite: `${SPRITE_BASE}/x-defense.png`,
  },
  'x-speed': {
    id: 'x-speed',
    nameKey: 'item.xSpeed.name',
    descriptionKey: 'item.xSpeed.desc',
    category: 'battle',
    price: 350,
    effect: { type: 'stat-boost', stat: 'speed', stages: 1 },
    usableInBattle: true,
    usableInOverworld: false,
    sprite: `${SPRITE_BASE}/x-speed.png`,
  },
  'x-special': {
    id: 'x-special',
    nameKey: 'item.xSpecial.name',
    descriptionKey: 'item.xSpecial.desc',
    category: 'battle',
    price: 350,
    effect: { type: 'stat-boost', stat: 'specialAttack', stages: 1 },
    usableInBattle: true,
    usableInOverworld: false,
    sprite: `${SPRITE_BASE}/x-special.png`,
  },

  // ── Vitamins ──
  'rare-candy': {
    id: 'rare-candy',
    nameKey: 'item.rareCandy.name',
    descriptionKey: 'item.rareCandy.desc',
    category: 'vitamin',
    price: 0,
    effect: { type: 'rare-candy' },
    usableInBattle: false,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/rare-candy.png`,
  },

  // ── PP recovery ──
  'ether': {
    id: 'ether',
    nameKey: 'item.ether.name',
    descriptionKey: 'item.ether.desc',
    category: 'healing',
    price: 0,
    effect: { type: 'pp-restore', amount: 10 },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/ether.png`,
  },
  'elixir': {
    id: 'elixir',
    nameKey: 'item.elixir.name',
    descriptionKey: 'item.elixir.desc',
    category: 'healing',
    price: 0,
    effect: { type: 'pp-restore', amount: 'all' },
    usableInBattle: true,
    usableInOverworld: true,
    sprite: `${SPRITE_BASE}/elixir.png`,
  },
};

export function getItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}

export function getAllItems(): ItemDef[] {
  return Object.values(ITEMS);
}

export function getItemsByCategory(category: ItemCategory): ItemDef[] {
  return Object.values(ITEMS).filter(i => i.category === category);
}

/** Items available in the Poke Mart (price > 0, not key items). */
export function getShopItems(): ItemDef[] {
  return Object.values(ITEMS).filter(i => i.price > 0 && i.category !== 'key');
}
