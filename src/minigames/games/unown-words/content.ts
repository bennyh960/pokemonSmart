/**
 * Unown Word Quest — the word pools, all derived from game data (no hand-made word lists):
 *   - Pokémon names   → pokemon.json (letters-only names, so every tile is a real letter)
 *   - type names      → TYPE_BADGE, keeping only types real Pokémon have (drops glitch / struggle)
 *   - picture words   → items with a sprite and a simple 1–2 word name
 * The only hand-written word data in this game are the L7 sentence templates (sentences.ts).
 */

import { TYPE_BADGE } from '../../../data/type-constants.js';
import { getAllItems } from '../../../data/items.js';
import { getAllPokemon } from '../../../services/pokemon-data.js';
import type { PokemonType } from '../../../types/index.js';

export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

export interface WordPokemon {
  id: number;
  en: string;
  he: string;
  types: PokemonType[];
}

export interface SpellType {
  type: PokemonType;
  en: string;
  he: string;
  /** Pokémon of this type (mono-type first — clearest hint). */
  pokemon: WordPokemon[];
}

export interface PictureItem {
  id: string;
  en: string;
  he: string;
  sprite: string;
}

export interface UnownContent {
  pokemon: WordPokemon[];
  types: SpellType[];
  items: PictureItem[];
}

/** A type needs at least this many Pokémon to be a Type Speller word (3 hint sprites). */
export const MIN_TYPE_HINTS = 3;

const LETTERS_ONLY = /^[A-Za-z]+$/;
const PICTURE_WORD = /^[A-Za-z]{3,}$/;
/**
 * Bag categories that make poor picture words: key items, TM discs (all look alike), battle boosters
 * and vitamins (abstract names on look-alike bottles — "Dire Hit", "Carbos").
 */
const NON_PICTURE_CATEGORIES = new Set(['key', 'machine', 'battle', 'vitamin']);

export function buildContent(): UnownContent {
  const pokemon: WordPokemon[] = getAllPokemon()
    .filter((p) => LETTERS_ONLY.test(p.name.en) && p.name.he)
    .map((p) => ({ id: p.id, en: p.name.en, he: p.name.he, types: [...p.types] }));

  const types: SpellType[] = [];
  for (const type of Object.keys(TYPE_BADGE) as PokemonType[]) {
    const ofType = pokemon.filter((p) => p.types.includes(type));
    if (ofType.length < MIN_TYPE_HINTS) continue;
    const mono = ofType.filter((p) => p.types.length === 1);
    const dual = ofType.filter((p) => p.types.length > 1);
    types.push({ type, en: TYPE_BADGE[type].en, he: TYPE_BADGE[type].he, pokemon: [...mono, ...dual] });
  }

  const seen = new Set<string>();
  const items: PictureItem[] = [];
  for (const it of getAllItems()) {
    if (NON_PICTURE_CATEGORIES.has(it.category) || !it.sprite) continue;
    const words = it.name.en.trim().split(/\s+/);
    if (words.length > 2 || !words.every((w) => PICTURE_WORD.test(w))) continue;
    const key = it.name.en.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ id: it.id, en: it.name.en, he: it.name.he, sprite: it.sprite });
  }

  return { pokemon, types, items };
}

let cached: UnownContent | null = null;

/** Content built once per session (game data is static). */
export function getContent(): UnownContent {
  return (cached ??= buildContent());
}
