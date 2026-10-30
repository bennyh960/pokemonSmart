/**
 * Pokémon Says — question generator (pure). A Pokémon calls out an action ("Pikachu, JUMP!");
 * the player taps its picture. A round picks a few words (actions + moves, by learning need) and asks each one
 * `repeats` times, mixed up and never twice in a row — hearing a word again and again is how it sticks.
 * Wrong options come from the round's own words first, so the child tells apart the words just learned.
 */

import type { WordStats } from '../../english/learning.js';
import { pickWords } from '../../english/learning.js';
import { pick, sample, shuffle, type Rng } from '../../english/random.js';
import { wordsFor, type Word, type WordTier } from '../../english/words.js';

export interface SaysConfig {
  /** Different words in a round (all shown first). */
  words: number;
  /** Times each word is asked. */
  repeats: number;
  choices: number;
  maxTier: WordTier;
  /** Seconds to answer (0 = no limit). */
  seconds: number;
}

export interface SaysQuestion {
  word: Word;
  options: Word[];
  answer: number;
  /** The Pokémon giving the command. */
  pokemonId: number;
}

export const SAYS_THEMES = ['actions', 'moves'] as const;

/** Every word `repeats` times: shuffled block after block, never the same word twice in a row. */
export function repeatOrder<T>(rng: Rng, items: readonly T[], repeats: number): T[] {
  const out: T[] = [];
  for (let r = 0; r < repeats; r++) {
    const block = shuffle(rng, items);
    if (block.length > 1 && block[0] === out[out.length - 1]) [block[0], block[1]] = [block[1], block[0]];
    out.push(...block);
  }
  return out;
}

export function generateSays(
  cfg: SaysConfig,
  rng: Rng,
  stats: WordStats,
  today: string,
  speakers: readonly number[],
): SaysQuestion[] {
  const pool = wordsFor(SAYS_THEMES, cfg.maxTier);
  const round = pickWords(rng, pool, stats, cfg.words, today);
  const others = pool.filter((w) => !round.includes(w));
  return repeatOrder(rng, round, cfg.repeats).map((word) => {
    const near = sample(
      rng,
      round.filter((w) => w !== word),
      cfg.choices - 1,
    );
    const options = shuffle(rng, [word, ...near, ...sample(rng, others, cfg.choices - 1 - near.length)]);
    return { word, options, answer: options.indexOf(word), pokemonId: pick(rng, speakers) };
  });
}
