/**
 * Word Dex — the collection book of the English modes (pure). Every known word is a card; reaching a
 * milestone of known words gives a prize once; answering the word of the day right gives a small daily prize.
 * Claimed prizes are kept in the words' home game data (`data.dex`, see useWords.ts).
 */

import { giftPokemon, item, money, prize } from '../define.js';
import type { MiniGamePrizeDef } from '../types.js';
import { knownCount, type WordStats } from './learning.js';
import type { Word } from './words.js';

const UNOWN = 201;

export interface DexMilestone {
  known: number;
  prize: MiniGamePrizeDef;
}

export const DEX_MILESTONES: readonly DexMilestone[] = [
  { known: 10, prize: prize('good', item('rare-candy')) },
  { known: 25, prize: prize('rare', item('rare-candy', 3)) },
  { known: 50, prize: prize('epic', giftPokemon(UNOWN, 10)) },
  { known: 100, prize: prize('epic', item('master-ball')) },
  { known: 200, prize: prize('epic', money(5000)) },
];

export const WORD_OF_THE_DAY_PRIZE: MiniGamePrizeDef = prize('common', money(200));

export interface DexData {
  /** Milestones (their `known` count) already claimed. */
  claimed: number[];
  /** Day the word-of-the-day prize was last claimed. */
  wordOfDayClaimed?: string;
}

export function readDex(raw: unknown): DexData {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Partial<DexData>;
  return {
    claimed: Array.isArray(d.claimed) ? d.claimed.filter((n): n is number => typeof n === 'number') : [],
    wordOfDayClaimed: typeof d.wordOfDayClaimed === 'string' ? d.wordOfDayClaimed : undefined,
  };
}

/** Reached and not yet claimed. */
export function claimableMilestones(stats: WordStats, dex: DexData): DexMilestone[] {
  const known = knownCount(stats);
  return DEX_MILESTONES.filter((m) => known >= m.known && !dex.claimed.includes(m.known));
}

/** The word of the day was answered right today and its prize not yet taken. */
export function wordOfDayClaimable(stats: WordStats, word: Word, dex: DexData, today: string): boolean {
  return stats[word.id]?.rightDay === today && dex.wordOfDayClaimed !== today;
}

export type DexCardState = 'known' | 'learning' | 'new';

export function cardState(stats: WordStats, wordId: string): DexCardState {
  const s = stats[wordId];
  if (!s) return 'new';
  return s.known ? 'known' : 'learning';
}
