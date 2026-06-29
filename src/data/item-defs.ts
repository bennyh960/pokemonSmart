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

import { getMove } from '../services/pokemon-data';
import type { BattlePokemonRuntimeState, BattleStatModifiers } from '../systems/battle-state';
import { HM_CONFIG } from '../systems/hm';
import type { Pokemon, PokemonType } from '../types';
import type { MajorStatusId } from '../types/battle-metadata';
import type { ItemDef } from './items';

// ─── Types ───

export type ItemCategory =
  | 'healing'
  | 'status-cure'
  | 'revival'
  | 'pokeball'
  | 'battle'
  | 'vitamin'
  | 'pp-restore'
  | 'evolution'
  | 'held'
  | 'key'
  | 'machine';

type pokemonStates = 'hp' | 'atk' | 'def' | 'spe' | 'spa' | 'spd';

//#region Held items in battle types
type BattleItemConfig = {
  isEndOfTurn: boolean;
  localMessage?: string;
  hpAmount?: number; // +/-
  stats?: Partial<BattleStatModifiers>; // e.g. {atk: +1, def: -1}
  moveTypeBoost?: { moveType: PokemonType | 'all'; boost: number };
  category?: 'choice' | 'damage-boost' | 'defense-boost' | 'crit-boost';
  condition?: (args?: { runtimeState?: BattlePokemonRuntimeState; pokemon?: Pokemon }) => boolean; // additional condition for activation (e.g. Life Orb doesn't activate on status moves or if it would faint the holder)
};

export interface HeldItemDef extends Omit<ItemDef, 'effect'> {
  category: 'held';
  effect: Extract<ItemEffect, { type: 'battle' }>;
}

// cb for items
// choice:
const choiceItemCB = (args?: Parameters<NonNullable<BattleItemConfig['condition']>>[0]) => {
  // stats changes is from createBattleRuntimeStateForPokemon
  // choice item not given to Enemy

  if (!args?.pokemon || !args?.runtimeState) return false;

  if (!args.runtimeState.lastMoveUsedId) return false;
  if (!(args.runtimeState.heldItem?.effect.config.category === 'choice')) return false;

  const { pokemon, runtimeState } = args;
  const movesToLock = pokemon.moves.map((m) => m.id).filter((id) => id !== runtimeState.lastMoveUsedId);
  runtimeState.softLockedInMovesId = movesToLock.length > 0 ? movesToLock : null;
  return true;
};

// #endregion

export type ItemEffect =
  | { type: 'heal'; amount: number }
  | { type: 'heal-full' } // Heals all HP
  | { type: 'restore-full'; status: MajorStatusId | 'all' } // Heals all HP and status conditions (e.g. Full Restore)
  | { type: 'revive'; hpPercent: number }
  | { type: 'status-cure'; status: MajorStatusId | 'all' }
  | { type: 'pp-restore'; amount: number | 'all' }
  | { type: 'pp-restore-one'; amount: number }
  | { type: 'stat-boost'; stat: string; stages: number }
  | { type: 'capture'; rate: number }
  | { type: 'rare-candy' }
  | { type: 'evolution-stone' }
  | { type: 'tm'; moveId: number; isHM: boolean }
  | { type: 'vitamin'; stat: pokemonStates }
  | { type: 'pokedex-battery'; amount: number }
  | { type: 'battle-helper'; battles: number }
  | { type: 'repel'; steps: number }
  | { type: 'none' }
  // held items
  | {
      type: 'battle';
      config: BattleItemConfig;
    };

export interface ItemGameDef {
  category: ItemCategory;
  price: number; // 0 = not purchasable
  effect: ItemEffect;
  usableInBattle: boolean;
  usableInOverworld: boolean;
  topColor?: string; // Pokeball top-half color for rendering
  name?: { en: string; he: string }; // Override name (used for TM/HM items not in items.json)
  description?: { en: string; he: string }; // Override description (bilingual)
  sellPrice?: number; // Custom sell price (TMs have explicit sell prices)
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
  hm01: 305,
  hm02: 306,
  hm03: 307,
  hm04: 308,
  hm05: 309,
  // TMs
  tm06: 310,
  tm09: 311,
  tm10: 312,
  tm11: 313,
  tm13: 314,
  tm14: 315,
  tm15: 316,
  tm17: 317,
  tm18: 318,
  tm19: 319,
  tm20: 320,
  tm21: 321,
  tm22: 322,
  tm23: 323,
  tm24: 324,
  tm25: 325,
  tm26: 326,
  tm27: 327,
  tm28: 328,
  tm29: 329,
  tm30: 330,
  tm31: 331,
  tm32: 332,
  tm34: 333,
  tm35: 334,
  tm36: 335,
  tm37: 336,
  tm38: 337,
  tm39: 338,
  tm44: 339,
  tm45: 340,
  tm46: 341,
  tm47: 342,
  tm48: 343, //dream-eater
  tm49: 344, //spore
  tm50: 345, //hypnosis
  tm51: 349, // dragon dance
  tm52: 350, // curse
  // Pokeballs
  'master-ball': 1,
  'ultra-ball': 2,
  'great-ball': 3,
  'poke-ball': 4,
  // Healing
  potion: 17,
  antidote: 18,
  'burn-heal': 19,
  'ice-heal': 20,
  awakening: 21,
  'paralyze-heal': 22,
  'full-restore': 23,
  'max-potion': 24,
  'hyper-potion': 25,
  'super-potion': 26,
  'full-heal': 27,
  revive: 28,
  'max-revive': 29,
  // Drinks
  'fresh-water': 30,
  'soda-pop': 31,
  lemonade: 32,
  'moomoo-milk': 33,
  // PP recovery
  ether: 38,
  'max-ether': 39,
  elixir: 40,
  'max-elixir': 41,
  // Vitamins
  'hp-up': 45,
  protein: 46,
  iron: 47,
  carbos: 48,
  calcium: 49,
  zinc: 52,
  'rare-candy': 50,
  // Battle items
  'guard-spec': 55,
  'dire-hit': 56,
  'x-attack': 57,
  'x-defense': 58,
  'x-speed': 59,
  'x-accuracy': 60,
  'x-special': 61, // X Sp. Atk
  'x-sp-def': 62, // X Sp. Def
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
  'dragon-scale': 9018,
  // Custom game items (no PokeAPI equivalent)
  'pokedex-battery': 9001,
  'battle-helper': 9002,
  // Key story items
  'secret-doc': 9003,
  'core-x1': 9004,
  'core-x2': 9005,
  'core-x3': 9006,
  'core-x4': 9007,
  'core-x5': 9008,
  'core-x6': 9009,
  'core-x7': 9010,
  'core-x8': 9011,
  // Fishing items
  'fishing-rod': 9012,
  'fishing-bait': 9013,
  // Repel series
  repel: 9014,
  'super-repel': 9015,
  'hyper-repel': 9016,
  'max-repel': 9017,

  // held items
  leftovers: 211,
  'choice-band': 197,
  'choice-spec': 274,
  'choice-scarf': 264,
  'zoom-lens': 253,
  'wide-lens': 242,
  'life-orb': 247,
  'soft-sand': 199,
  'silver-powder': 214,
  'hard-stone': 215,
  'miracle-seed': 216,
  'black-glasses': 217,
  'black-belt': 218,
  magnet: 219,
  'mystic-water': 220,
  'sharp-beak': 221,
  'poison-barb': 222,
  'never-melt-ice': 223,
  'spell-tag': 224,
  'twisted-spoon': 225,
  charcoal: 226,
  'dragon-fang': 227,
  'silk-scarf': 228,
};

// Reverse lookup
export const ITEM_ID_TO_SLUG: Record<number, string> = Object.fromEntries(
  Object.entries(ITEM_SLUG_TO_ID).map(([slug, id]) => [id, slug]),
);

// ─── Game data per item ───

export const ITEM_GAME_DATA: Record<number, ItemGameDef> = {
  // ── Pokeballs ──
  1: {
    category: 'pokeball',
    price: 0,
    effect: { type: 'capture', rate: 255 },
    usableInBattle: true,
    usableInOverworld: false,
    topColor: '#8040c0',
  }, // Master Ball
  2: {
    category: 'pokeball',
    price: 1200,
    effect: { type: 'capture', rate: 2 },
    usableInBattle: true,
    usableInOverworld: false,
    topColor: '#e0c020',
  }, // Ultra Ball
  3: {
    category: 'pokeball',
    price: 600,
    effect: { type: 'capture', rate: 1.5 },
    usableInBattle: true,
    usableInOverworld: false,
    topColor: '#3060e0',
  }, // Great Ball
  4: {
    category: 'pokeball',
    price: 200,
    effect: { type: 'capture', rate: 1 },
    usableInBattle: true,
    usableInOverworld: false,
    topColor: '#e03030',
  }, // Poke Ball

  // ── Healing ──
  17: {
    category: 'healing',
    price: 300,
    effect: { type: 'heal', amount: 20 },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Potion
  26: {
    category: 'healing',
    price: 700,
    effect: { type: 'heal', amount: 50 },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Super Potion
  25: {
    category: 'healing',
    price: 1200,
    effect: { type: 'heal', amount: 200 },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Hyper Potion
  24: {
    category: 'healing',
    price: 2500,
    effect: { type: 'heal-full' },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Max Potion
  23: {
    category: 'healing',
    price: 3000,
    effect: { type: 'restore-full', status: 'all' },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Full Restore

  // ── Drinks ──
  30: {
    category: 'healing',
    price: 200,
    effect: { type: 'heal', amount: 50 },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Fresh Water
  31: {
    category: 'healing',
    price: 300,
    effect: { type: 'heal', amount: 60 },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Soda Pop
  32: {
    category: 'healing',
    price: 350,
    effect: { type: 'heal', amount: 80 },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Lemonade
  33: {
    category: 'healing',
    price: 500,
    effect: { type: 'heal', amount: 100 },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Moomoo Milk

  // ── Status cures ──
  18: {
    category: 'status-cure',
    price: 100,
    effect: { type: 'status-cure', status: 'poison' },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Antidote
  19: {
    category: 'status-cure',
    price: 250,
    effect: { type: 'status-cure', status: 'burn' },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Burn Heal
  20: {
    category: 'status-cure',
    price: 250,
    effect: { type: 'status-cure', status: 'freeze' },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Ice Heal
  21: {
    category: 'status-cure',
    price: 250,
    effect: { type: 'status-cure', status: 'sleep' },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Awakening
  22: {
    category: 'status-cure',
    price: 200,
    effect: { type: 'status-cure', status: 'paralysis' },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Paralyze Heal
  27: {
    category: 'status-cure',
    price: 600,
    effect: { type: 'status-cure', status: 'all' },
    usableInBattle: true,
    usableInOverworld: true,
  }, // Full Heal

  // ── Revival ──
  28: {
    category: 'revival',
    price: 1500,
    effect: { type: 'revive', hpPercent: 50 },
    usableInBattle: false, // currently we block it cause it use on the pokemon that out that is not fainted
    usableInOverworld: true,
  }, // Revive
  29: {
    category: 'revival',
    price: 3500,
    effect: { type: 'revive', hpPercent: 100 },
    usableInBattle: false, // currently we block it cause it use on the pokemon that out that is not fainted
    usableInOverworld: true,
  }, // Max Revive

  // ── PP recovery ──
  // Ether
  38: {
    category: 'pp-restore',
    price: 300,
    effect: { type: 'pp-restore-one', amount: 10 },
    usableInBattle: true,
    usableInOverworld: true,
  },
  // Max Ether
  39: {
    category: 'pp-restore',
    price: 700,
    effect: { type: 'pp-restore-one', amount: 999 },
    usableInBattle: true,
    usableInOverworld: true,
  },
  // Elixir
  40: {
    category: 'pp-restore',
    price: 2000,
    effect: { type: 'pp-restore', amount: 10 },
    usableInBattle: true,
    usableInOverworld: true,
  },
  // Max Elixir
  41: {
    category: 'pp-restore',
    price: 4000,
    effect: { type: 'pp-restore', amount: 'all' },
    usableInBattle: true,
    usableInOverworld: true,
  },

  // ── Vitamins ──
  45: {
    category: 'vitamin',
    price: 9800,
    effect: { type: 'vitamin', stat: 'hp' },
    usableInBattle: false,
    usableInOverworld: true,
  }, // HP Up
  46: {
    category: 'vitamin',
    price: 9800,
    effect: { type: 'vitamin', stat: 'atk' },
    usableInBattle: false,
    usableInOverworld: true,
  }, // Protein
  47: {
    category: 'vitamin',
    price: 9800,
    effect: { type: 'vitamin', stat: 'def' },
    usableInBattle: false,
    usableInOverworld: true,
  }, // Iron
  48: {
    category: 'vitamin',
    price: 9800,
    effect: { type: 'vitamin', stat: 'spe' },
    usableInBattle: false,
    usableInOverworld: true,
  }, // Carbos
  49: {
    category: 'vitamin',
    price: 9800,
    effect: { type: 'vitamin', stat: 'spa' },
    usableInBattle: false,
    usableInOverworld: true,
  }, // Calcium
  52: {
    category: 'vitamin',
    price: 9800,
    effect: { type: 'vitamin', stat: 'spd' },
    usableInBattle: false,
    usableInOverworld: true,
  }, // Zinc
  50: { category: 'vitamin', price: 0, effect: { type: 'rare-candy' }, usableInBattle: false, usableInOverworld: true }, // Rare Candy

  // ── Battle items ──
  55: { category: 'battle', price: 700, effect: { type: 'none' }, usableInBattle: true, usableInOverworld: false }, // Guard Spec
  56: { category: 'battle', price: 650, effect: { type: 'none' }, usableInBattle: true, usableInOverworld: false }, // Dire Hit
  57: {
    category: 'battle',
    price: 500,
    effect: { type: 'stat-boost', stat: 'attack', stages: 1 },
    usableInBattle: true,
    usableInOverworld: false,
  }, // X Attack
  58: {
    category: 'battle',
    price: 550,
    effect: { type: 'stat-boost', stat: 'defense', stages: 1 },
    usableInBattle: true,
    usableInOverworld: false,
  }, // X Defense
  59: {
    category: 'battle',
    price: 350,
    effect: { type: 'stat-boost', stat: 'speed', stages: 1 },
    usableInBattle: true,
    usableInOverworld: false,
  }, // X Speed
  60: {
    category: 'battle',
    price: 950,
    effect: { type: 'stat-boost', stat: 'accuracy', stages: 1 },
    usableInBattle: true,
    usableInOverworld: false,
  }, // X Accuracy
  61: {
    category: 'battle',
    price: 350,
    effect: { type: 'stat-boost', stat: 'specialAttack', stages: 1 },
    usableInBattle: true,
    usableInOverworld: false,
  }, // X Sp. Atk
  62: {
    category: 'battle',
    price: 350,
    effect: { type: 'stat-boost', stat: 'specialDefense', stages: 1 },
    usableInBattle: true,
    usableInOverworld: false,
  }, // X Sp. Def

  // ── Evolution stones ──
  80: {
    category: 'evolution',
    price: 0,
    effect: { type: 'evolution-stone' },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Sun Stone', he: 'אבן שמש' },
    description: { en: 'Evolves certain Pokémon when used.', he: 'מפתח פוקימוני מסוימים בשימוש.' },
  }, // Sun Stone
  81: {
    category: 'evolution',
    price: 0,
    effect: { type: 'evolution-stone' },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Moon Stone', he: 'אבן ירח' },
    description: { en: 'Evolves certain Pokémon when used.', he: 'מפתח פוקימוני מסוימים בשימוש.' },
  }, // Moon Stone
  82: {
    category: 'evolution',
    price: 0,
    effect: { type: 'evolution-stone' },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Fire Stone', he: 'אבן אש' },
    description: { en: 'Evolves certain Pokémon when used.', he: 'מפתח פוקימוני מסוימים בשימוש.' },
  }, // Fire Stone
  83: {
    category: 'evolution',
    price: 0,
    effect: { type: 'evolution-stone' },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Thunder Stone', he: 'אבן ברק' },
    description: { en: 'Evolves certain Pokémon when used.', he: 'מפתח פוקימוני מסוימים בשימוש.' },
  }, // Thunder Stone
  84: {
    category: 'evolution',
    price: 0,
    effect: { type: 'evolution-stone' },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Water Stone', he: 'אבן מים' },
    description: { en: 'Evolves certain Pokémon when used.', he: 'מפתח פוקימוני מסוימים בשימוש.' },
  }, // Water Stone
  85: {
    category: 'evolution',
    price: 0,
    effect: { type: 'evolution-stone' },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Leaf Stone', he: 'אבן עלה' },
    description: { en: 'Evolves certain Pokémon when used.', he: 'מפתח פוקימוני מסוימים בשימוש.' },
  }, // Leaf Stone

  // ── Trade evolution items (holdable) ──
  198: { category: 'held', price: 0, effect: { type: 'none' }, usableInBattle: false, usableInOverworld: false }, // King's Rock
  // Metal Coat
  210: {
    category: 'held',
    price: 0,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        localMessage: 'battle.metalCoatBoost',
        moveTypeBoost: { moveType: 'steel', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'Metal Coat', he: 'מעיל מתכת' },
  },
  9018: { category: 'held', price: 0, effect: { type: 'none' }, usableInBattle: false, usableInOverworld: false }, // Dragon Scale

  // held items
  // leftovers
  211: {
    category: 'held',
    price: 20000,
    effect: {
      type: 'battle',
      config: { condition: () => true, isEndOfTurn: true, hpAmount: 1 / 16, localMessage: 'battle.leftoversHeal' },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  //choise spec
  274: {
    category: 'held',
    price: 15000,
    effect: {
      type: 'battle',
      config: { condition: choiceItemCB, isEndOfTurn: false, category: 'choice', stats: { specialAttack: 1 } },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  //choise-band
  197: {
    category: 'held',
    price: 15000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        category: 'choice',
        stats: { attack: 1 },
        condition: choiceItemCB,
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  //choise scarf
  264: {
    category: 'held',
    price: 15000,
    effect: {
      type: 'battle',
      config: { condition: choiceItemCB, isEndOfTurn: false, category: 'choice', stats: { speed: 1 } },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  // zoom lens
  253: {
    category: 'held',
    price: 25000,
    effect: { type: 'battle', config: { isEndOfTurn: false, category: 'crit-boost' } },
    usableInBattle: false,
    usableInOverworld: false,
  },
  199: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'bug', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  214: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'ground', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  215: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'rock', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  216: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'grass', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  217: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'dark', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  218: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'fighting', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  219: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'electric', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  220: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'water', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  221: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'flying', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  222: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'poison', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  223: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'ice', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  224: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'ghost', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  225: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'psychic', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  226: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'fire', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  227: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'dragon', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  228: {
    category: 'held',
    price: 10000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        moveTypeBoost: { moveType: 'normal', boost: 1.2 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  // life orb
  247: {
    category: 'held',
    price: 15000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: true,
        localMessage: 'battle.lifeOrbDamage',
        hpAmount: -1 / 10,
        category: 'damage-boost',
        moveTypeBoost: { moveType: 'all', boost: 1.3 },
        condition: ({ runtimeState } = {}) => {
          if (!runtimeState?.lastMoveUsedId) return false;
          const move = getMove(runtimeState.lastMoveUsedId);
          if (!move) return false;
          if (runtimeState.turnFlags.charging || runtimeState.turnFlags.flinched) return false; // don't activate if the pokemon is currently charging a move or flinched (i.e. didn't actually use the move)
          return move?.damageClass !== 'status';
        },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },
  242: {
    category: 'held',
    price: 15000,
    effect: {
      type: 'battle',
      config: {
        isEndOfTurn: false,
        stats: { accuracy: 1 },
      },
    },
    usableInBattle: false,
    usableInOverworld: false,
  },

  // ── Custom game items ──
  9001: {
    category: 'battle',
    price: 100,
    effect: { type: 'pokedex-battery', amount: 10 },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Pokedex Battery', he: 'סוללת פוקדקס' },
    description: {
      en: 'Charges Pokedex by 10 uses (max 50). Recharge free at PokeCenter.',
      he: 'טוען פוקדקס ב-10 שימושים (מקס 50). טעינה חינמית במרכז הפוקימון.',
    },
  },
  9002: {
    category: 'battle',
    price: 1500,
    effect: { type: 'battle-helper', battles: 30 },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Battle Helper', he: 'עוזר קרב' },
    description: {
      en: 'Shows type effectiveness on moves for 30 battles. Toggle ON/OFF in Pokedex.',
      he: 'מציג יעילות סוג על מהלכים ל-30 קרבות. הפעל/כבה בפוקדקס.',
    },
  },

  // ── Key story items ──
  9003: {
    category: 'key',
    price: 0,
    effect: { type: 'none' },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'Secret Document', he: 'מסמך סודי' },
    description: {
      en: 'A classified document dropped by a Team Rocket grunt. Prof. Algorithma needs to analyse it.',
      he: 'מסמך סודי שנשמט מסוכן של צוות רוקט. פרופ׳ אלגוריתמה צריך לנתח אותו.',
    },
    keyFlag: 'key-secret-doc-obtained',
    usedFlag: 'key-secret-doc-analyzed',
    usedDescription: {
      en: 'Analysed by Prof. Algorithma. The data has been decoded.',
      he: 'נותח על ידי פרופ׳ אלגוריתמה. הנתונים פוענחו.',
    },
  },
  9004: {
    category: 'key',
    price: 0,
    effect: { type: 'none' },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'NULL-X Core X1', he: 'ליבת נאל-איקס - X1' },
    description: {
      en: "A fragment of NULL-X's core code. One of eight pieces needed to shut it down permanently.",
      he: 'נמצא אחרי קרב עם זאפדוס האגדי - שבר מקוד הליבה של נאל-איקס.',
    },
    keyFlag: 'key-core-x1-obtained',
    usedFlag: 'key-core-x1-used',
    usedDescription: { en: 'Fragment neutralised. NULL-X grows weaker.', he: 'השבר נוטרל. נאל-איקס נחלש.' },
  },
  9005: {
    category: 'key',
    price: 0,
    effect: { type: 'none' },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'NULL-X Core X2', he: 'ליבת נאל-איקס - X2' },
    description: {
      en: "A fragment of NULL-X's core code. One of eight pieces needed to shut it down permanently.",
      he: 'נמצא אחרי קרב עם ראיקו האגדי - שבר מקוד הליבה של נאל-איקס. אחד משמונה חלקים הנדרשים לכיבויו הקבוע.',
    },
    keyFlag: 'key-core-x2-obtained',
    usedFlag: 'key-core-x2-used',
    usedDescription: { en: 'Fragment neutralised. NULL-X grows weaker.', he: 'השבר נוטרל. נאל-איקס נחלש.' },
  },
  9006: {
    category: 'key',
    price: 0,
    effect: { type: 'none' },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'NULL-X Core X3', he: 'ליבת נאל-איקס - X3' },
    description: {
      en: "A fragment of NULL-X's core code. One of eight pieces needed to shut it down permanently.",
      he: 'שבר מקוד הליבה של נאל-איקס. אחד משמונה חלקים הנדרשים לכיבויו הקבוע.',
    },
    keyFlag: 'key-core-x3-obtained',
    usedFlag: 'key-core-x3-used',
    usedDescription: { en: 'Fragment neutralised. NULL-X grows weaker.', he: 'השבר נוטרל. נאל-איקס נחלש.' },
  },
  9007: {
    category: 'key',
    price: 0,
    effect: { type: 'none' },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'NULL-X Core X4', he: 'ליבת נאל-איקס - X4' },
    description: {
      en: "A fragment of NULL-X's core code. Found on Raikou.",
      he: 'שבר מקוד הליבה של נאל-איקס. נמצא על ראיקו האגדי',
    },
    keyFlag: 'key-core-x4-obtained',
    usedFlag: 'key-core-x4-used',
    usedDescription: { en: 'Fragment neutralised. NULL-X grows weaker.', he: 'השבר נוטרל. נאל-איקס נחלש.' },
  },
  9008: {
    category: 'key',
    price: 0,
    effect: { type: 'none' },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'NULL-X Core X5', he: 'ליבת נאל-איקס - X5' },
    description: {
      en: "A fragment of NULL-X's core code. One of eight pieces needed to shut it down permanently.",
      he: 'שבר מקוד הליבה של נאל-איקס. אחד משמונה חלקים הנדרשים לכיבויו הקבוע.',
    },
    keyFlag: 'key-core-x5-obtained',
    usedFlag: 'key-core-x5-used',
    usedDescription: { en: 'Fragment neutralised. NULL-X grows weaker.', he: 'השבר נוטרל. נאל-איקס נחלש.' },
  },
  9009: {
    category: 'key',
    price: 0,
    effect: { type: 'none' },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'NULL-X Core X6', he: 'ליבת נאל-איקס - X6' },
    description: {
      en: "A fragment of NULL-X's core code. One of eight pieces needed to shut it down permanently.",
      he: 'שבר מקוד הליבה של נאל-איקס. אחד משמונה חלקים הנדרשים לכיבויו הקבוע.',
    },
    keyFlag: 'key-core-x6-obtained',
    usedFlag: 'key-core-x6-used',
    usedDescription: { en: 'Fragment neutralised. NULL-X grows weaker.', he: 'השבר נוטרל. נאל-איקס נחלש.' },
  },
  9010: {
    category: 'key',
    price: 0,
    effect: { type: 'none' },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'NULL-X Core X7', he: 'ליבת נאל-איקס - X7' },
    description: {
      en: "A fragment of NULL-X's core code. One of eight pieces needed to shut it down permanently.",
      he: 'שבר מקוד הליבה של נאל-איקס. אחד משמונה חלקים הנדרשים לכיבויו הקבוע.',
    },
    keyFlag: 'key-core-x7-obtained',
    usedFlag: 'key-core-x7-used',
    usedDescription: { en: 'Fragment neutralised. NULL-X grows weaker.', he: 'השבר נוטרל. נאל-איקס נחלש.' },
  },
  9011: {
    category: 'key',
    price: 0,
    effect: { type: 'none' },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'NULL-X Core X8', he: 'ליבת נאל-איקס - X8' },
    description: {
      en: "The final fragment of NULL-X's core code. With this, the shutdown sequence can begin.",
      he: 'השבר האחרון של קוד הליבה של נאל-איקס. עם זה, רצף הכיבוי יכול להתחיל.',
    },
    keyFlag: 'key-core-x8-obtained',
    usedFlag: 'key-core-x8-used',
    usedDescription: {
      en: 'All fragments neutralised. NULL-X has been shut down.',
      he: 'כל השברים נוטרלו. נאל-איקס כובה.',
    },
  },

  9012: {
    category: 'key',
    price: 0,
    effect: { type: 'none' },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'Fishing Rod', he: 'חכת דיג' },
    description: {
      en: 'A rod for catching wild water Pokémon. Press F near water to fish.',
      he: 'חכה לתפיסת פוקימוני מים פראיים. לחץ F ליד מים כדי לדוג.',
    },
    keyFlag: 'key-fishing-rod-obtained',
  },
  9013: {
    category: 'battle',
    price: 300,
    effect: { type: 'none' },
    usableInBattle: false,
    usableInOverworld: false,
    name: { en: 'Fishing Bait', he: 'פיתיון דיג' },
    description: {
      en: 'Bait used when fishing. One consumed per cast. Buy more at the Pokémart.',
      he: 'פיתיון לדיג. אחד מתכלה בכל זריקה. קנה עוד בחנות הפוקמארט.',
    },
  },

  9014: {
    category: 'battle',
    price: 400,
    effect: { type: 'repel', steps: 50 },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Repel', he: 'רפל' },
    description: {
      en: 'Blocks wild encounters for 50 steps. Cannot stack with other Repels.',
      he: 'חוסם מפגשים עם פוקימון פראיים ל-50 צעדים. לא ניתן לצבור עם רפלים אחרים.',
    },
  },
  9015: {
    category: 'battle',
    price: 750,
    effect: { type: 'repel', steps: 100 },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Super Repel', he: 'סופר-רפל' },
    description: {
      en: 'Blocks wild encounters for 100 steps. Cannot stack with other Repels.',
      he: 'חוסם מפגשים עם פוקימון פראיים ל-100 צעדים. לא ניתן לצבור עם רפלים אחרים.',
    },
  },
  9016: {
    category: 'battle',
    price: 1000,
    effect: { type: 'repel', steps: 125 },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Hyper Repel', he: 'היפר-רפל' },
    description: {
      en: 'Blocks wild encounters for 125 steps. Cannot stack with other Repels.',
      he: 'חוסם מפגשים עם פוקימון פראיים ל-125 צעדים. לא ניתן לצבור עם רפלים אחרים.',
    },
  },
  9017: {
    category: 'battle',
    price: 1500,
    effect: { type: 'repel', steps: 200 },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'Max Repel', he: 'מקסי-רפל' },
    description: {
      en: 'Blocks wild encounters for 200 steps. Cannot stack with other Repels.',
      he: 'חוסם מפגשים עם פוקימון פראיים ל-200 צעדים. לא ניתן לצבור עם רפלים אחרים.',
    },
  },

  // ── HM items (reusable field-moves) — IDs 305-309 ──
  305: {
    category: 'machine',
    price: 0,
    sellPrice: 0,
    effect: { type: 'tm', moveId: 15, isHM: true },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'HM01 Cut', he: 'HM01 גזירה' },
    description: { en: 'Teaches Cut. Reusable.', he: 'מלמד גזירה. שימוש חוזר.' },
  },
  306: {
    category: 'machine',
    price: 0,
    sellPrice: 0,
    effect: { type: 'tm', moveId: 19, isHM: true },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'HM02 Fly', he: 'HM02 תעופה' },
    description: {
      en: 'Allows the Pokémon to fly from one location to another on the map.',
      he: 'מאפשר לעוף עם הפוקימון ממקום למקום על גבי המפה',
    },
  },
  307: {
    category: 'machine',
    price: 0,
    sellPrice: 0,
    effect: { type: 'tm', moveId: 57, isHM: true },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'HM03 Surf', he: 'HM03 גלישה' },
    description: {
      en: `Powerfull water move - also used to surf on water. (conditions: level ${HM_CONFIG.surf.minLevel} , weight ${HM_CONFIG.surf.minWeight}, height ${HM_CONFIG.surf.minHeight}) m.`,
      he: `מהלך מים חזק - משמש גם לגלישה על מים. (תנאים: רמה ${HM_CONFIG.surf.minLevel}, משקל ${HM_CONFIG.surf.minWeight} ק"ג, גובה ${HM_CONFIG.surf.minHeight} מטר).`,
    },
  },
  308: {
    category: 'machine',
    price: 0,
    sellPrice: 0,
    effect: { type: 'tm', moveId: 70, isHM: true },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'HM04 Strength', he: 'HM04 כוח' },
    description: { en: 'Teaches Strength. Reusable.', he: 'מלמד כוח. שימוש חוזר.' },
  },
  309: {
    category: 'machine',
    price: 0,
    sellPrice: 0,
    effect: { type: 'tm', moveId: 148, isHM: true },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'HM05 Flash', he: 'HM05 הבזק' },
    description: { en: 'Teaches Flash. Reusable.', he: 'מלמד הבזק. שימוש חוזר.' },
  },

  // ── TM items (Gen 2 standard set) — IDs 310-349 ──
  310: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 92, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM06', he: 'TM06' },
    description: { en: 'Teaches Toxic', he: 'מלמד מתקפת רעל' },
  },
  311: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 244, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM09', he: 'TM09' },
    description: { en: 'Teaches Psych Up', he: 'מלמד מתקפת חיזוק פסיכולוגי' },
  },
  312: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 237, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM10', he: 'TM10' },
    description: { en: 'Teaches Hidden Power', he: 'מלמד מתקפת כוח נסתר' },
  },
  313: {
    category: 'machine',
    price: 2000,
    sellPrice: 1000,
    effect: { type: 'tm', moveId: 241, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM11', he: 'TM11' },
    description: { en: 'Teaches Sunny Day', he: 'מלמד מתקפת יום שמש' },
  },
  314: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 173, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM13', he: 'TM13' },
    description: { en: 'Teaches Snore', he: 'מלמד מתקפת נחירה' },
  },
  315: {
    category: 'machine',
    price: 5500,
    sellPrice: 2750,
    effect: { type: 'tm', moveId: 59, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM14', he: 'TM14' },
    description: { en: 'Teaches Blizzard', he: 'מלמד מתקפת סופת שלג' },
  },
  316: {
    category: 'machine',
    price: 7500,
    sellPrice: 3750,
    effect: { type: 'tm', moveId: 63, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM15', he: 'TM15' },
    description: { en: 'Teaches Hyper Beam', he: 'מלמד מתקפת קרן על' },
  },
  317: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 182, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM17', he: 'TM17' },
    description: { en: 'Teaches Protect', he: 'מלמד הגנה' },
  },
  318: {
    category: 'machine',
    price: 2000,
    sellPrice: 1000,
    effect: { type: 'tm', moveId: 240, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM18', he: 'TM18' },
    description: { en: 'Teaches Rain Dance', he: 'מלמד מתקפת ריקוד גשם' },
  },
  319: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 202, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM19', he: 'TM19' },
    description: { en: 'Teaches Giga Drain', he: 'מלמד מתקפת יניקת אנרגיה' },
  },
  320: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 203, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM20', he: 'TM20' },
    description: { en: 'Teaches Endure', he: 'מלמד יכולת שרידה' },
  },
  321: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 218, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM21', he: 'TM21' },
    description: { en: 'Teaches Frustration', he: 'מלמד מתקפת תסכול' },
  },
  322: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 76, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM22', he: 'TM22' },
    description: { en: 'Teaches Solar Beam', he: 'מלמד מתקפת קרן סולארית' },
  },
  323: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 231, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM23', he: 'TM23' },
    description: { en: 'Teaches Iron Tail', he: 'מלמד מתקפת זנב ברזל' },
  },
  324: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 225, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM24', he: 'TM24' },
    description: { en: 'Teaches Dragon Breath', he: 'מלמד מתקפת נשימת דרקון' },
  },
  325: {
    category: 'machine',
    price: 5500,
    sellPrice: 2750,
    effect: { type: 'tm', moveId: 87, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM25', he: 'TM25' },
    description: { en: 'Teaches Thunder', he: 'מלמד מתקפת רעם' },
  },
  326: {
    category: 'machine',
    price: 5000,
    sellPrice: 2500,
    effect: { type: 'tm', moveId: 89, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM26', he: 'TM26' },
    description: { en: 'Teaches Earthquake', he: 'מלמד מתקפת רעידת אדמה' },
  },
  327: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 216, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM27', he: 'TM27' },
    description: { en: 'Teaches Return', he: 'מלמד מתקפת חזרה' },
  },
  328: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 91, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM28', he: 'TM28' },
    description: { en: 'Teaches Dig', he: 'מלמד מתקפת חפירה' },
  },
  329: {
    category: 'machine',
    price: 3500,
    sellPrice: 1750,
    effect: { type: 'tm', moveId: 94, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM29', he: 'TM29' },
    description: { en: 'Teaches Psychic', he: 'מלמד מתקפה על חושית' },
  },
  330: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 247, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM30', he: 'TM30' },
    description: { en: 'Teaches Shadow Ball', he: 'מלמד מתקפת כדור צל' },
  },
  331: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 189, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM31', he: 'TM31' },
    description: { en: 'Teaches Mud-Slap', he: 'מלמד מתקפת חבטת בוץ' },
  },
  332: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 104, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM32', he: 'TM32' },
    description: { en: 'Teaches Double Team', he: 'מלמד צוות כפול' },
  },
  333: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 207, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM34', he: 'TM34' },
    description: { en: 'Teaches Swagger', he: 'מלמד התהדרות' },
  },
  334: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 214, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM35', he: 'TM35' },
    description: { en: 'Teaches Sleep Talk', he: 'מלמד נדודי שינה' },
  },
  335: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 188, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM36', he: 'TM36' },
    description: { en: 'Teaches Sludge Bomb', he: 'מלמד פצצת בוץ' },
  },
  336: {
    category: 'machine',
    price: 2000,
    sellPrice: 1000,
    effect: { type: 'tm', moveId: 201, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM37', he: 'TM37' },
    description: { en: 'Teaches Sandstorm', he: 'מלמד סופת חול' },
  },
  337: {
    category: 'machine',
    price: 5500,
    sellPrice: 2750,
    effect: { type: 'tm', moveId: 126, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM38', he: 'TM38' },
    description: { en: 'Teaches Fire Blast', he: 'מלמד מתקפת פיצוץ אש' },
  },
  338: {
    category: 'machine',
    price: 2000,
    sellPrice: 1000,
    effect: { type: 'tm', moveId: 129, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM39', he: 'TM39' },
    description: { en: 'Teaches Swift', he: 'מלמד מתקפת ירי כוכבים' },
  },
  339: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 156, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM44', he: 'TM44' },
    description: { en: 'Teaches Rest', he: 'מלמד מהלך מנוחה' },
  },
  340: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 213, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM45', he: 'TM45' },
    description: { en: 'Teaches Attract', he: 'מלמד מהלך משיכה' },
  },
  341: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 168, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM46', he: 'TM46' },
    description: { en: 'Teaches Thief', he: 'מלמד מהלך גניבה' },
  },
  342: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 211, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM47', he: 'TM47' },
    description: { en: 'Teaches Steel Wing', he: 'מלמד כנף פלדה' },
  },
  343: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 138, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM48', he: 'TM48' },
    description: { en: 'Teaches Dream Eater', he: 'מלמד אוכלי חלומות' },
  },
  344: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 147, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM49', he: 'TM49' },
    description: { en: 'Teaches Spore', he: 'מלמד נבג שינה' },
  },
  345: {
    category: 'machine',
    price: 3000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 95, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM50', he: 'TM50' },
    description: { en: 'Teaches Hypnosis', he: 'מלמד היפנוזה' },
  },
  349: {
    category: 'machine',
    price: 10000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 349, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM51', he: 'TM51' },
    description: { en: 'Teaches Dragon Dance', he: 'מלמד ריקוד דרקון' },
  },
  350: {
    category: 'machine',
    price: 10000,
    sellPrice: 1500,
    effect: { type: 'tm', moveId: 174, isHM: false },
    usableInBattle: false,
    usableInOverworld: true,
    name: { en: 'TM52', he: 'TM52' },
    description: { en: 'Teaches Curse', he: 'מלמד מתקפת קללה' },
  },
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

/** Reverse lookup: given a moveId, return the TM/HM label (e.g. "TM06", "HM01"). Returns null if not teachable by TM/HM. */
export function getTMLabelForMoveId(moveId: number): string | null {
  for (const def of Object.values(ITEM_GAME_DATA)) {
    if (def.effect.type === 'tm' && def.effect.moveId === moveId && def.name) {
      return def.name.en;
    }
  }
  return null;
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
