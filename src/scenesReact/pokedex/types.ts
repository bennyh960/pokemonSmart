import type { PokemonData } from '../../services/pokemon-data';
import type { CaughtStatus } from '../../types';

export type PokeType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy';

export interface Ability {
  name: string;
  description: string;
  hidden: boolean;
}

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface LevelMove {
  level: number;
  name: string;
  type: PokeType;
}

export interface TmMove {
  name: string;
  type: PokeType;
}

export interface LocationEntry {
  name: string;
  note: string;
}

export interface EvolutionNode {
  id: number;
  name: string;
  method?: string;
  item?: string;
  children?: EvolutionNode[];
}

export interface PokemonEntry {
  id: number;
  key: string;
  name: string;
  types: PokeType[];
  category: string;
  height: string;
  weight: string;
  status: CaughtStatus;
  stats: BaseStats;
  abilities: Ability[];
  evolution: EvolutionNode;
  moves: {
    level: LevelMove[];
    tm: TmMove[];
  };
  locations: LocationEntry[];
}

export type TabKey = 'info' | 'evolution' | 'battle' | 'moves' | 'locations';

export interface PokedexPokemon extends PokemonData {
  status: CaughtStatus;
}
