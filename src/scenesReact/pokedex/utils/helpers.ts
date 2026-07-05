import { getPokemon } from '../../../services/pokemon-data';
import type { PokedexPokemon } from '../types';
import type { PlayerData } from '../../../types';

//TODO: This function is also in old pokdex - delete it from there post migration
// Also it been used for migration
export function isPokemonStillWithPlayer(pd: PlayerData, id: number): boolean {
  if (pd.party?.some((p) => p?.id === id)) return true;
  if (pd.boxes) {
    for (const box of pd.boxes) {
      if (box.pokemon.some((p) => p?.id === id)) return true;
    }
  }
  return false;
}

export function getCaughtCount(pd: PlayerData): number {
  const count = pd.pokedex
    ? Object.values(pd.pokedex).filter((status) => status === 'caught' || status === 'release').length
    : 0;
  return count;
}

export const getPokdexPokemons = (pd: PlayerData, EXTRA_POKEMONS_IDS: number[]): Map<number, PokedexPokemon> => {
  const pokemonMap = new Map<number, PokedexPokemon>();
  // 1-251
  for (let i = 1; i <= 251; i++) {
    const pokemon = getPokemon(i);

    if (pokemon) pokemonMap.set(i, { ...pokemon, status: pd.pokedex[i] ?? 'unseen' });
  }
  // extra pokemons
  for (const i of EXTRA_POKEMONS_IDS) {
    const pokemon = getPokemon(i);
    if (pokemon) {
      pokemonMap.set(i, { ...pokemon, status: pd.pokedex[i] ?? 'unseen' });
    }
  }
  return pokemonMap;
};
