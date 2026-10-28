/**
 * Pokémon Colours — question generator (pure). Show a Pokémon, ask its main colour (PokeAPI species colour in
 * pokemon.json). The colours asked are picked by learning need, then a Pokémon of that colour is drawn.
 */

import type { HebrewHelp } from '../../english/help.js';
import { pickWords, type WordStats } from '../../english/learning.js';
import { pick, sample, shuffle, type Rng } from '../../english/random.js';
import { getWord, type Word } from '../../english/words.js';
import type { PokemonColor } from '../../../services/pokemon-data.js';

export interface ColorsConfig {
  questions: number;
  /** Colours this level uses (each is a word in the bank). */
  colors: PokemonColor[];
  choices: number;
  hebrewHelp: HebrewHelp;
}

export interface ColorPokemon {
  id: number;
  color: PokemonColor;
}

export interface ColorQuestion {
  pokemonId: number;
  answer: number;
  options: Word[];
}

export function colorWords(cfg: ColorsConfig): Word[] {
  return cfg.colors.map((c) => getWord(c)!);
}

export function generateColors(
  cfg: ColorsConfig,
  rng: Rng,
  pokemon: readonly ColorPokemon[],
  stats: WordStats,
  today: string,
): ColorQuestion[] {
  const words = colorWords(cfg);
  const used = new Set<number>();
  const out: ColorQuestion[] = [];
  while (out.length < cfg.questions) {
    // A round asks every colour about equally, the ones to practise first
    for (const target of pickWords(rng, words, stats, words.length, today, words.length)) {
      if (out.length >= cfg.questions) break;
      const pool = pokemon.filter((p) => p.color === target.id && !used.has(p.id));
      if (pool.length === 0) continue;
      const mon = pick(rng, pool);
      used.add(mon.id);
      const others = sample(
        rng,
        words.filter((w) => w.id !== target.id),
        cfg.choices - 1,
      );
      const options = shuffle(rng, [target, ...others]);
      out.push({ pokemonId: mon.id, options, answer: options.indexOf(target) });
    }
  }
  return out;
}
