/** Unown Battle — word picker (pure). Each word is one wild Unown; spelling it letter by letter knocks it out. */

import type { HebrewHelp } from '../../english/help.js';
import { pickWords, type WordStats } from '../../english/learning.js';
import { sample, shuffle, type Rng } from '../../english/random.js';
import { isSpellable, wordsFor, type Word, type WordTier } from '../../english/words.js';

export type SpellInput = 'tiles' | 'decoys' | 'keyboard';

export interface BattleConfig {
  words: number;
  maxTier: WordTier;
  maxLength: number;
  /** tiles = the word's letters shuffled · decoys = plus extra letters · keyboard = A–Z. */
  input: SpellInput;
  hebrewHelp: HebrewHelp;
  /** After a mistake, glow the next letter. */
  letterHint: boolean;
}

export interface BattleWord {
  word: Word;
  /** Upper-case letters to spell. */
  letters: string[];
  /** Letter tiles to tap (tiles / decoys input). */
  tiles?: string[];
}

export const DECOYS = 2;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function generateBattle(cfg: BattleConfig, rng: Rng, stats: WordStats, today: string): BattleWord[] {
  const pool = wordsFor('all', cfg.maxTier).filter((w) => isSpellable(w) && w.en.length <= cfg.maxLength);
  return pickWords(rng, pool, stats, cfg.words, today).map((word) => {
    const letters = word.en.toUpperCase().split('');
    if (cfg.input === 'keyboard') return { word, letters };
    const extra =
      cfg.input === 'decoys'
        ? sample(
            rng,
            ALPHABET.filter((l) => !letters.includes(l)),
            DECOYS,
          )
        : [];
    return { word, letters, tiles: shuffle(rng, [...letters, ...extra]) };
  });
}
