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

export type ItemCategory = 'healing' | 'status-cure' | 'revival' | 'pokeball' | 'battle' | 'vitamin' | 'pp-restore' | 'evolution' | 'held' | 'key' | 'machine';

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
  | { type: 'tm'; moveId: number; isHM: boolean }
  | { type: 'vitamin'; stat: 'hp' | 'atk' | 'def' | 'spe' | 'spa' | 'spd' }
  | { type: 'none' };

export interface ItemGameDef {
  category: ItemCategory;
  price: number;              // 0 = not purchasable
  effect: ItemEffect;
  usableInBattle: boolean;
  usableInOverworld: boolean;
  topColor?: string;          // Pokeball top-half color for rendering
  name?: { en: string; he: string };         // Override name (used for TM/HM items not in items.json)
  description?: { en: string; he: string };  // Override description (bilingual)
  sellPrice?: number;         // Custom sell price (TMs have explicit sell prices)
  // ── Key item fields ──
  /** Flag automatically set in pd.flags when this item is received. */
  keyFlag?: string;
  /** Flag that marks this key item as delivered/used. When set, the bag shows usedDescription. */
  usedFlag?: string;
  /** Description shown in the bag after the item has been used/delivered. */
  usedDescription?: { en: string; he: string };
}

// ─── Slug ↔ ID mapping ───
// Allows existing code using string slugs to transition gradually.

export const ITEM_SLUG_TO_ID: Record<string, number> = {
  // HMs
  'hm01': 305,
  'hm02': 306,
  'hm03': 307,
  'hm04': 308,
  'hm05': 309,
  // TMs
  'tm06': 310,
  'tm09': 311,
  'tm10': 312,
  'tm11': 313,
  'tm13': 314,
  'tm14': 315,
  'tm15': 316,
  'tm17': 317,
  'tm18': 318,
  'tm19': 319,
  'tm20': 320,
  'tm21': 321,
  'tm22': 322,
  'tm23': 323,
  'tm24': 324,
  'tm25': 325,
  'tm26': 326,
  'tm27': 327,
  'tm28': 328,
  'tm29': 329,
  'tm30': 330,
  'tm31': 331,
  'tm32': 332,
  'tm34': 333,
  'tm35': 334,
  'tm36': 335,
  'tm37': 336,
  'tm38': 337,
  'tm39': 338,
  'tm44': 339,
  'tm45': 340,
  'tm46': 341,
  'tm47': 342,
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
  'zinc': 52,
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
  45: { category: 'vitamin', price: 9800, effect: { type: 'vitamin', stat: 'hp'  }, usableInBattle: false, usableInOverworld: true },  // HP Up
  46: { category: 'vitamin', price: 9800, effect: { type: 'vitamin', stat: 'atk' }, usableInBattle: false, usableInOverworld: true },  // Protein
  47: { category: 'vitamin', price: 9800, effect: { type: 'vitamin', stat: 'def' }, usableInBattle: false, usableInOverworld: true },  // Iron
  48: { category: 'vitamin', price: 9800, effect: { type: 'vitamin', stat: 'spe' }, usableInBattle: false, usableInOverworld: true },  // Carbos
  49: { category: 'vitamin', price: 9800, effect: { type: 'vitamin', stat: 'spa' }, usableInBattle: false, usableInOverworld: true },  // Calcium
  52: { category: 'vitamin', price: 9800, effect: { type: 'vitamin', stat: 'spd' }, usableInBattle: false, usableInOverworld: true },  // Zinc
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

  // ── HM items (reusable field-moves) — IDs 305-309 ──
  305: { category: 'machine', price: 0, sellPrice: 0, effect: { type: 'tm', moveId: 15, isHM: true }, usableInBattle: false, usableInOverworld: true, name: { en: 'HM01 Cut', he: 'HM01 גזירה' }, description: { en: 'Teaches Cut. Reusable.', he: 'מלמד גזירה. שימוש חוזר.' } },
  306: { category: 'machine', price: 0, sellPrice: 0, effect: { type: 'tm', moveId: 19, isHM: true }, usableInBattle: false, usableInOverworld: true, name: { en: 'HM02 Fly', he: 'HM02 טיסה' }, description: { en: 'Teaches Fly. Reusable.', he: 'מלמד טיסה. שימוש חוזר.' } },
  307: { category: 'machine', price: 0, sellPrice: 0, effect: { type: 'tm', moveId: 57, isHM: true }, usableInBattle: false, usableInOverworld: true, name: { en: 'HM03 Surf', he: 'HM03 גלישה' }, description: { en: 'Teaches Surf. Reusable.', he: 'מלמד גלישה. שימוש חוזר.' } },
  308: { category: 'machine', price: 0, sellPrice: 0, effect: { type: 'tm', moveId: 70, isHM: true }, usableInBattle: false, usableInOverworld: true, name: { en: 'HM04 Strength', he: 'HM04 כוח' }, description: { en: 'Teaches Strength. Reusable.', he: 'מלמד כוח. שימוש חוזר.' } },
  309: { category: 'machine', price: 0, sellPrice: 0, effect: { type: 'tm', moveId: 148, isHM: true }, usableInBattle: false, usableInOverworld: true, name: { en: 'HM05 Flash', he: 'HM05 הבזק' }, description: { en: 'Teaches Flash. Reusable.', he: 'מלמד הבזק. שימוש חוזר.' } },

  // ── TM items (Gen 2 standard set) — IDs 310-349 ──
  310: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 92,  isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM06', he: 'TM06' }, description: { en: 'Teaches Toxic', he: 'מלמד Toxic' } },
  311: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 244, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM09', he: 'TM09' }, description: { en: 'Teaches Psych Up', he: 'מלמד Psych Up' } },
  312: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 237, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM10', he: 'TM10' }, description: { en: 'Teaches Hidden Power', he: 'מלמד Hidden Power' } },
  313: { category: 'machine', price: 2000, sellPrice: 1000, effect: { type: 'tm', moveId: 241, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM11', he: 'TM11' }, description: { en: 'Teaches Sunny Day', he: 'מלמד Sunny Day' } },
  314: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 173, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM13', he: 'TM13' }, description: { en: 'Teaches Snore', he: 'מלמד Snore' } },
  315: { category: 'machine', price: 5500, sellPrice: 2750, effect: { type: 'tm', moveId: 59,  isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM14', he: 'TM14' }, description: { en: 'Teaches Blizzard', he: 'מלמד Blizzard' } },
  316: { category: 'machine', price: 7500, sellPrice: 3750, effect: { type: 'tm', moveId: 63,  isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM15', he: 'TM15' }, description: { en: 'Teaches Hyper Beam', he: 'מלמד Hyper Beam' } },
  317: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 182, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM17', he: 'TM17' }, description: { en: 'Teaches Protect', he: 'מלמד Protect' } },
  318: { category: 'machine', price: 2000, sellPrice: 1000, effect: { type: 'tm', moveId: 240, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM18', he: 'TM18' }, description: { en: 'Teaches Rain Dance', he: 'מלמד Rain Dance' } },
  319: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 202, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM19', he: 'TM19' }, description: { en: 'Teaches Giga Drain', he: 'מלמד Giga Drain' } },
  320: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 203, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM20', he: 'TM20' }, description: { en: 'Teaches Endure', he: 'מלמד Endure' } },
  321: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 218, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM21', he: 'TM21' }, description: { en: 'Teaches Frustration', he: 'מלמד Frustration' } },
  322: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 76,  isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM22', he: 'TM22' }, description: { en: 'Teaches Solar Beam', he: 'מלמד Solar Beam' } },
  323: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 231, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM23', he: 'TM23' }, description: { en: 'Teaches Iron Tail', he: 'מלמד Iron Tail' } },
  324: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 225, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM24', he: 'TM24' }, description: { en: 'Teaches Dragon Breath', he: 'מלמד Dragon Breath' } },
  325: { category: 'machine', price: 5500, sellPrice: 2750, effect: { type: 'tm', moveId: 87,  isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM25', he: 'TM25' }, description: { en: 'Teaches Thunder', he: 'מלמד Thunder' } },
  326: { category: 'machine', price: 5000, sellPrice: 2500, effect: { type: 'tm', moveId: 89,  isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM26', he: 'TM26' }, description: { en: 'Teaches Earthquake', he: 'מלמד Earthquake' } },
  327: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 216, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM27', he: 'TM27' }, description: { en: 'Teaches Return', he: 'מלמד Return' } },
  328: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 91,  isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM28', he: 'TM28' }, description: { en: 'Teaches Dig', he: 'מלמד Dig' } },
  329: { category: 'machine', price: 3500, sellPrice: 1750, effect: { type: 'tm', moveId: 94,  isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM29', he: 'TM29' }, description: { en: 'Teaches Psychic', he: 'מלמד Psychic' } },
  330: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 247, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM30', he: 'TM30' }, description: { en: 'Teaches Shadow Ball', he: 'מלמד Shadow Ball' } },
  331: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 189, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM31', he: 'TM31' }, description: { en: 'Teaches Mud-Slap', he: 'מלמד Mud-Slap' } },
  332: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 104, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM32', he: 'TM32' }, description: { en: 'Teaches Double Team', he: 'מלמד Double Team' } },
  333: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 207, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM34', he: 'TM34' }, description: { en: 'Teaches Swagger', he: 'מלמד Swagger' } },
  334: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 214, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM35', he: 'TM35' }, description: { en: 'Teaches Sleep Talk', he: 'מלמד Sleep Talk' } },
  335: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 188, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM36', he: 'TM36' }, description: { en: 'Teaches Sludge Bomb', he: 'מלמד Sludge Bomb' } },
  336: { category: 'machine', price: 2000, sellPrice: 1000, effect: { type: 'tm', moveId: 201, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM37', he: 'TM37' }, description: { en: 'Teaches Sandstorm', he: 'מלמד Sandstorm' } },
  337: { category: 'machine', price: 5500, sellPrice: 2750, effect: { type: 'tm', moveId: 126, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM38', he: 'TM38' }, description: { en: 'Teaches Fire Blast', he: 'מלמד Fire Blast' } },
  338: { category: 'machine', price: 2000, sellPrice: 1000, effect: { type: 'tm', moveId: 129, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM39', he: 'TM39' }, description: { en: 'Teaches Swift', he: 'מלמד Swift' } },
  339: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 156, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM44', he: 'TM44' }, description: { en: 'Teaches Rest', he: 'מלמד Rest' } },
  340: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 213, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM45', he: 'TM45' }, description: { en: 'Teaches Attract', he: 'מלמד Attract' } },
  341: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 168, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM46', he: 'TM46' }, description: { en: 'Teaches Thief', he: 'מלמד Thief' } },
  342: { category: 'machine', price: 3000, sellPrice: 1500, effect: { type: 'tm', moveId: 211, isHM: false }, usableInBattle: false, usableInOverworld: true, name: { en: 'TM47', he: 'TM47' }, description: { en: 'Teaches Steel Wing', he: 'מלמד Steel Wing' } },
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

/** Get TM/HM data for an item by its slug or numeric ID string. Returns null if not a TM/HM. */
export function getTMEffect(itemId: string): { moveId: number; isHM: boolean } | null {
  const numId = Number(itemId);
  let def: ItemGameDef | undefined;
  if (!isNaN(numId)) {
    def = ITEM_GAME_DATA[numId];
  } else {
    const id = ITEM_SLUG_TO_ID[itemId];
    if (id != null) def = ITEM_GAME_DATA[id];
  }
  if (def?.effect.type === 'tm') return { moveId: def.effect.moveId, isHM: def.effect.isHM };
  return null;
}
