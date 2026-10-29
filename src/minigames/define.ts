/**
 * Helpers for writing a game's def + level table without boilerplate.
 *
 *   levels: [{ number: 1, name, rewards: {
 *     firstClear: prize('common', item('poke-ball', 3)),
 *     threeStar:  prize('good', item('potion', 3)),
 *     replay:     prize('common', money(100)),
 *   }, config: {...} }]
 */

import { getAllItems, type ItemDef } from '../data/items.js';
import type {
  Bilingual,
  DialogueReward,
  MiniGameDef,
  MiniGamePrize,
  MiniGamePrizeChoice,
  MiniGamePrizeDef,
  PrizeRarity,
} from './types.js';

/** Identity helper that keeps the game's config type `C` checked against its component. */
export function defineMiniGame<C>(def: MiniGameDef<C>): MiniGameDef<C> {
  return def;
}

export function item(itemId: string, quantity = 1): DialogueReward {
  return { items: [{ itemId, quantity }] };
}

export function money(amount: number): DialogueReward {
  return { money: amount };
}

export function giftPokemon(id: number, level: number): DialogueReward {
  return { pokemon: { id, level } };
}

export function prize(rarity: PrizeRarity, reward: DialogueReward): MiniGamePrize {
  return { rarity, reward };
}

/** A prize picked at random each time it is given. `label` names it in prize lists. */
export function prizeOneOf(rarity: PrizeRarity, rewards: DialogueReward[], label?: Bilingual): MiniGamePrizeChoice {
  return { rarity, oneOf: rewards, label };
}

/** One of the items matching `test`, ×1..maxQty (every item/quantity pair equally likely). */
function itemPrizeWhere(
  rarity: PrizeRarity,
  label: Bilingual,
  test: (i: ItemDef) => boolean,
  maxQty = 1,
): MiniGamePrizeChoice {
  const rewards: DialogueReward[] = [];
  for (const i of getAllItems().filter(test)) for (let q = 1; q <= maxQty; q++) rewards.push(item(i.id, q));
  return prizeOneOf(rarity, rewards, label);
}

/** One of every evolution stone in the game's item data. */
export function evolutionStonePrize(rarity: PrizeRarity): MiniGamePrizeChoice {
  return itemPrizeWhere(rarity, { en: 'Evolution stone', he: 'אבן התפתחות' }, (i) => i.category === 'evolution');
}

/** One of the buyable TMs (no HMs) in the game's item data. */
export function tmPrize(rarity: PrizeRarity): MiniGamePrizeChoice {
  return itemPrizeWhere(
    rarity,
    { en: 'TM (new move)', he: 'דיסק מהלך' },
    (i) => i.effect.type === 'tm' && !i.effect.isHM && i.price > 0,
  );
}

/** 1..maxQty of one vitamin (HP Up, Protein…). */
export function vitaminPrize(rarity: PrizeRarity, maxQty = 3): MiniGamePrizeChoice {
  return itemPrizeWhere(rarity, { en: 'Vitamin', he: 'ויטמין' }, (i) => i.effect.type === 'vitamin', maxQty);
}

/** One held item that works in battle (Leftovers, Choice Band…). */
export function heldItemPrize(rarity: PrizeRarity): MiniGamePrizeChoice {
  return itemPrizeWhere(
    rarity,
    { en: 'Held item', he: 'חפץ להחזקה' },
    (i) => i.category === 'held' && i.effect.type === 'battle',
  );
}

/** The same prize with every quantity (items and money) multiplied by `n`. */
export function timesPrize<P extends MiniGamePrizeDef>(def: P, n: number): P {
  const scale = (r: DialogueReward): DialogueReward => ({
    ...r,
    ...(r.money && { money: r.money * n }),
    ...(r.items && { items: r.items.map((i) => ({ ...i, quantity: i.quantity * n })) }),
  });
  return 'oneOf' in def ? { ...def, oneOf: def.oneOf.map(scale) } : { ...def, reward: scale(def.reward) };
}

/** 1..maxQty of one battle X item (X Attack, X Speed…). */
export function xItemPrize(rarity: PrizeRarity, maxQty = 1): MiniGamePrizeChoice {
  return itemPrizeWhere(
    rarity,
    { en: 'Battle boost', he: 'חיזוק לקרב' },
    (i) => i.effect.type === 'stat-boost',
    maxQty,
  );
}
