/**
 * Memory Match — pure logic. Each word has two cards: its English and its partner face (picture, or the
 * Hebrew translation on higher levels). Flip two; same word = a match, else they turn back over.
 */

import { pickWords, type WordAnswer, type WordStats } from '../../english/learning.js';
import { shuffle, type Rng } from '../../english/random.js';
import { wordsFor, type Word, type WordTier } from '../../english/words.js';
import type { Stars } from '../../types.js';

export interface MemoryConfig {
  pairs: number;
  maxTier: WordTier;
  /** What the English card is matched with. */
  partner: 'picture' | 'hebrew';
}

export interface MemoryCard {
  word: Word;
  face: 'en' | 'picture' | 'hebrew';
}

export function generateMemory(cfg: MemoryConfig, rng: Rng, stats: WordStats, today: string): MemoryCard[] {
  const words = pickWords(rng, wordsFor('all', cfg.maxTier), stats, cfg.pairs, today);
  return shuffle(
    rng,
    words.flatMap((word) => [
      { word, face: 'en' as const },
      { word, face: cfg.partner },
    ]),
  );
}

export interface MemoryState {
  /** Face-up cards waiting to be compared (0–2). */
  open: number[];
  matched: number[];
  mistakes: number;
  /** Words that were part of a wrong pair (not learned on the first try). */
  missed: string[];
  combo: number;
}

export const NEW_MEMORY: MemoryState = { open: [], matched: [], mistakes: 0, missed: [], combo: 0 };

export type FlipResult = 'ignored' | 'opened' | 'match' | 'mismatch';

/** Flip card `i`. With two open cards, the caller closes them (`closeOpen`) after showing them. */
export function flip(
  cards: readonly MemoryCard[],
  s: MemoryState,
  i: number,
): { state: MemoryState; result: FlipResult } {
  if (s.open.length >= 2 || s.open.includes(i) || s.matched.includes(i) || !cards[i])
    return { state: s, result: 'ignored' };
  const open = [...s.open, i];
  if (open.length < 2) return { state: { ...s, open }, result: 'opened' };
  const [a, b] = open;
  if (cards[a].word.id === cards[b].word.id) {
    return { state: { ...s, open: [], matched: [...s.matched, a, b], combo: s.combo + 1 }, result: 'match' };
  }
  const missed = [...new Set([...s.missed, cards[a].word.id, cards[b].word.id])];
  return { state: { ...s, open, mistakes: s.mistakes + 1, missed, combo: 0 }, result: 'mismatch' };
}

export function closeOpen(s: MemoryState): MemoryState {
  return { ...s, open: [] };
}

export function isDone(cards: readonly MemoryCard[], s: MemoryState): boolean {
  return s.matched.length === cards.length;
}

/** 3★ = mistakes ≤ half the pairs, 2★ = ≤ the pairs, else 1★ (finishing always clears). */
export function memoryStars(mistakes: number, pairs: number): Stars {
  if (mistakes <= Math.floor(pairs / 2)) return 3;
  if (mistakes <= pairs) return 2;
  return 1;
}

export const MATCH_POINTS = 100;
export const COMBO_POINTS = 20;

/** Every word once: right if it was never part of a wrong pair. */
export function memoryAnswers(cards: readonly MemoryCard[], s: MemoryState): WordAnswer[] {
  const ids = [...new Set(cards.map((c) => c.word.id))];
  return ids.map((wordId) => ({ wordId, right: !s.missed.includes(wordId) }));
}
