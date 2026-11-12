/**
 * Gate card prizes (the cards: systems/gate-cards.ts). Hard to get on purpose.
 *   Labs and care rounds (berry games): only a 3★ round, only by chance (`gateCardPrize`).
 *   Word Board (libraries): card prizes join the level's prize pool by board level (`boardCardPrizes`), so the
 *   board lists them — epic ones have their own chance per 3★ round, the others are drawn like any prize.
 */

import { GATE_CARD_ITEMS, type GateCard } from '../systems/gate-cards.js';
import { item, prize } from './define.js';
import type { EpicPrize } from './english/ladder.js';
import type { AwardedPrize } from './progress.js';
import type { MiniGamePrizeDef, PrizeRarity } from './types.js';

export type CardRoundSource = 'lab' | 'care';

/** Chance of each card per 3★ round. One card per round at most (a Bypass Card is rolled first). */
export const GATE_CARD_ODDS: Readonly<Record<CardRoundSource, Record<GateCard, number>>> = {
  lab: { bypass: 0.2, skip: 0.3 },
  care: { bypass: 0.08, skip: 0.2 },
};

/** Chance per 3★ round of an epic card prize on the Word Board. */
export const BOARD_EPIC_CARD_CHANCE = 0.08;

/** A card prize for a finished lab / care round, or null (not 3★, or no luck this time). */
export function gateCardPrize(source: CardRoundSource, stars: number, rng: () => number): AwardedPrize | null {
  if (stars < 3) return null;
  const r = rng();
  const odds = GATE_CARD_ODDS[source];
  const card: GateCard | null = r < odds.bypass ? 'bypass' : r < odds.bypass + odds.skip ? 'skip' : null;
  return card ? { kind: 'card', rarity: 'epic', reward: item(GATE_CARD_ITEMS[card]) } : null;
}

interface CardPrize {
  card: GateCard;
  rarity: PrizeRarity;
  qty: number;
}

const bypass = (rarity: PrizeRarity, qty: number): CardPrize => ({ card: 'bypass', rarity, qty });
const skip = (rarity: PrizeRarity, qty: number): CardPrize => ({ card: 'skip', rarity, qty });

/** Card prizes of the Word Board by board level (1 = first step). A tier holds from `fromLevel` up. */
const BOARD_CARD_TIERS: readonly { fromLevel: number; prizes: CardPrize[] }[] = [
  { fromLevel: 1, prizes: [skip('rare', 1)] },
  { fromLevel: 4, prizes: [bypass('epic', 2), skip('rare', 2)] },
  { fromLevel: 7, prizes: [bypass('epic', 2), bypass('rare', 1), skip('rare', 2)] },
  { fromLevel: 9, prizes: [bypass('epic', 3), bypass('rare', 1), skip('rare', 3), skip('good', 1)] },
  { fromLevel: 11, prizes: [bypass('epic', 4), bypass('rare', 2), bypass('good', 1), skip('rare', 3), skip('good', 1)] },
];

/** The card prizes of Word Board `level` (english/board.ts `boardStep`): epic ones + the rest of the pool. */
export function boardCardPrizes(level: number): { epic: EpicPrize[]; prizes: MiniGamePrizeDef[] } {
  const tier = [...BOARD_CARD_TIERS].reverse().find((t) => level >= t.fromLevel) ?? BOARD_CARD_TIERS[0];
  const toPrize = (c: CardPrize) => prize(c.rarity, item(GATE_CARD_ITEMS[c.card], c.qty));
  return {
    epic: tier.prizes.filter((c) => c.rarity === 'epic').map((c) => ({ prize: toPrize(c), chance: BOARD_EPIC_CARD_CHANCE })),
    prizes: tier.prizes.filter((c) => c.rarity !== 'epic').map(toPrize),
  };
}
