/**
 * Poké-Doku — per-level config shape + the symbols of a level, derived from Pokémon data.
 */

import { getPokemon } from '../../../services/pokemon-data.js';
import { TYPE_BADGE } from '../../../data/type-constants.js';
import type { PokemonType } from '../../../types/index.js';
import type { Bilingual } from '../../types.js';
import type { GridSpec } from './sudoku.js';

export const PSYDUCK_ID = 54;

export interface PokeDokuConfig extends GridSpec {
  /** Grid side (4 → 2×2 boxes, 6 → 2×3 boxes). */
  size: 4 | 6;
  /** What the symbols look like: Pokémon sprites, or the Pokémon's first type as an icon (Type-Doku). */
  symbols: 'pokemon' | 'types';
  /** National dex ids — one per symbol, `size` of them. */
  pokemon: number[];
  /** Exact number of givens (the generator removes clues while the solution stays unique). */
  givens: number;
  /** Finish before the HUD timer runs out for a bonus of `pointsPerSecond` × seconds left. */
  timerBonus?: { seconds: number; pointsPerSecond: number };
}

export interface DokuSymbol {
  /** Symbol index 0 … size-1 (key 1 … size). */
  index: number;
  pokemonId: number;
  /** Set in Type-Doku: the icon shown instead of the sprite. */
  type?: PokemonType;
  /** Name used in hint text. */
  name: Bilingual;
}

export function levelSymbols(config: PokeDokuConfig): DokuSymbol[] {
  return config.pokemon.map((pokemonId, index) => {
    const data = getPokemon(pokemonId);
    const name: Bilingual = data ? { ...data.name } : { en: `#${pokemonId}`, he: `#${pokemonId}` };
    if (config.symbols !== 'types') return { index, pokemonId, name };
    const type = data?.types[0] ?? 'normal';
    return { index, pokemonId, type, name: { en: TYPE_BADGE[type].en, he: TYPE_BADGE[type].he } };
  });
}

/** Icon glyph per type for Type-Doku (colour comes from TYPE_BADGE). */
export const TYPE_GLYPH: Partial<Record<PokemonType, string>> = {
  normal: '⭐',
  fire: '🔥',
  water: '💧',
  grass: '🌿',
  electric: '⚡',
  ice: '❄️',
  fighting: '🥊',
  poison: '☠️',
  ground: '⛰️',
  flying: '🪶',
  psychic: '🔮',
  bug: '🐛',
  rock: '🪨',
  ghost: '👻',
  dragon: '🐉',
  dark: '🌙',
  steel: '⚙️',
  fairy: '🧚',
};
