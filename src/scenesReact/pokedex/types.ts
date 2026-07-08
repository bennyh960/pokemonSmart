import type { PokemonData } from '../../services/pokemon-data';
import type { CaughtStatus } from '../../types';

export type TabKey = 'info' | 'evolution' | 'battle' | 'moves' | 'locations';

export interface PokedexPokemon extends PokemonData {
  status: CaughtStatus;
}

export type { WildLocation } from './utils/locationHelper';
