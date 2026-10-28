/**
 * Unown Letters — the Pokémon pool for First Sound, derived from game data (pokemon.json, letters-only
 * names so every first letter is a real letter). Words for the other English modes live in the word bank.
 */

import { getAllPokemon } from '../../../services/pokemon-data.js';
import type { PokemonType } from '../../../types/index.js';

export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

export interface WordPokemon {
  id: number;
  en: string;
  he: string;
  types: PokemonType[];
}

export interface UnownContent {
  pokemon: WordPokemon[];
}

const LETTERS_ONLY = /^[A-Za-z]+$/;

export function buildContent(): UnownContent {
  const pokemon: WordPokemon[] = getAllPokemon()
    .filter((p) => LETTERS_ONLY.test(p.name.en) && p.name.he)
    .map((p) => ({ id: p.id, en: p.name.en, he: p.name.he, types: [...p.types] }));
  return { pokemon };
}

let cached: UnownContent | null = null;

/** Content built once per session (game data is static). */
export function getContent(): UnownContent {
  return (cached ??= buildContent());
}
