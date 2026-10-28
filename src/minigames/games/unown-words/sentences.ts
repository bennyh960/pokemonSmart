/**
 * Sentence Builder (L7) templates — the one hand-written word list in this game (by design).
 * Every slot is filled from game data, and a template only uses a Pokémon it is true for
 * ("Pidgey can fly" only for Flying types).
 */

import type { PokemonType } from '../../../types/index.js';
import type { PictureItem, UnownContent, WordPokemon } from './content.js';
import { pick, type Rng } from './random.js';

export interface Sentence {
  words: string[];
  /** Picture shown as the hint. */
  pokemonId?: number;
  item?: PictureItem;
}

interface Template {
  build(rng: Rng, content: UnownContent): Sentence | null;
}

/** Types that read as a thing a Pokémon can "like" ("Charmander likes fire"). */
const LIKEABLE_TYPES: PokemonType[] = ['fire', 'water', 'grass', 'ice', 'rock'];

export function article(nextWord: string): 'a' | 'an' {
  return /^[aeiou]/i.test(nextWord) ? 'an' : 'a';
}

function anyPokemon(rng: Rng, content: UnownContent, filter?: (p: WordPokemon) => boolean): WordPokemon | null {
  const pool = filter ? content.pokemon.filter(filter) : content.pokemon;
  return pool.length ? pick(rng, pool) : null;
}

function withPokemon(
  words: (p: WordPokemon, rng: Rng, content: UnownContent) => string[] | null,
  filter?: (p: WordPokemon) => boolean,
): Template {
  return {
    build(rng, content) {
      const p = anyPokemon(rng, content, filter);
      const w = p && words(p, rng, content);
      return p && w ? { words: w, pokemonId: p.id } : null;
    },
  };
}

export const SENTENCE_TEMPLATES: readonly Template[] = [
  withPokemon((p) => ['I', 'love', p.en]),
  withPokemon((p) => [p.en, 'is', 'strong']),
  withPokemon(
    (p) => [p.en, 'can', 'fly'],
    (p) => p.types.includes('flying'),
  ),
  withPokemon(
    (p) => [p.en, 'can', 'swim'],
    (p) => p.types.includes('water'),
  ),
  withPokemon(
    (p, rng) => {
      const likes = p.types.filter((t) => LIKEABLE_TYPES.includes(t));
      return likes.length ? [p.en, 'likes', pick(rng, likes)] : null;
    },
    (p) => p.types.some((t) => LIKEABLE_TYPES.includes(t)),
  ),
  withPokemon((p) => ['My', p.en, 'is', 'happy']),
  withPokemon((p) => ['Look', 'at', 'my', p.en]),
  withPokemon((p, rng, content) => {
    const t = content.types.find((st) => st.type === pick(rng, p.types));
    return t ? [p.en, 'is', article(t.en), t.en, 'Pokémon'] : null;
  }),
  {
    build(rng, content) {
      if (!content.items.length) return null;
      const item = pick(rng, content.items);
      return { words: ['I', 'have', article(item.en), ...item.en.split(' ')], item };
    },
  },
];

/** One sentence with exactly `wordCount` words (or the closest found), not in `used`. */
export function buildSentence(rng: Rng, content: UnownContent, wordCount: number, used: Set<string>): Sentence {
  let best: Sentence | null = null;
  for (let tries = 0; tries < 80; tries++) {
    const s = pick(rng, SENTENCE_TEMPLATES).build(rng, content);
    if (!s || used.has(s.words.join(' '))) continue;
    if (s.words.length === wordCount) return s;
    if (!best || Math.abs(s.words.length - wordCount) < Math.abs(best.words.length - wordCount)) best = s;
  }
  if (best) return best;
  const p = content.pokemon[0];
  return { words: ['I', 'love', p.en], pokemonId: p.id };
}
