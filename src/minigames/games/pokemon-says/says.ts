/**
 * Pokémon Says — question generator (pure). A Pokémon calls out an action ("Pikachu, JUMP!");
 * the player taps its picture. Words: actions + moves from the word bank, picked by learning need.
 */

import type { WordStats } from '../../english/learning.js';
import { pickWords } from '../../english/learning.js';
import { pick, sample, shuffle, type Rng } from '../../english/random.js';
import { wordsFor, type Word, type WordTier } from '../../english/words.js';
import type { HebrewHelp } from '../../english/help.js';

export interface SaysConfig {
  questions: number;
  choices: number;
  maxTier: WordTier;
  /** Seconds to answer (0 = no limit). */
  seconds: number;
  hebrewHelp: HebrewHelp;
}

export interface SaysQuestion {
  word: Word;
  options: Word[];
  answer: number;
  /** The Pokémon giving the command. */
  pokemonId: number;
}

export const SAYS_THEMES = ['actions', 'moves'] as const;

export function generateSays(
  cfg: SaysConfig,
  rng: Rng,
  stats: WordStats,
  today: string,
  speakers: readonly number[],
): SaysQuestion[] {
  const pool = wordsFor(SAYS_THEMES, cfg.maxTier);
  return pickWords(rng, pool, stats, cfg.questions, today).map((word) => {
    const options = shuffle(rng, [
      word,
      ...sample(
        rng,
        pool.filter((w) => w.id !== word.id),
        cfg.choices - 1,
      ),
    ]);
    return { word, options, answer: options.indexOf(word), pokemonId: pick(rng, speakers) };
  });
}
