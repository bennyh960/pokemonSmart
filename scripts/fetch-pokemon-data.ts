/**
 * Fetches data for all 251 Gen 1+2 Pokemon from PokeAPI.
 * Saves to src/data/pokemon.json
 *
 * NOTE: After fetching, run `npx tsx scripts/add-hebrew-names.ts`
 * to add Hebrew translations (PokeAPI only provides English names).
 */

const TOTAL_POKEMON = 251;
const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 100;

export interface LocalizedName {
  en: string;
  he: string;
}

export interface PokemonEntry {
  id: number;
  name: LocalizedName;
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  baseExperience: number;
  height: number;
  weight: number;
  category?: string;
  description?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPokemonData(): Promise<PokemonEntry[]> {
  const pokemon: PokemonEntry[] = [];

  for (let id = 1; id <= TOTAL_POKEMON; id++) {
    const entry = await fetchPokemonDataById(id);
    pokemon.push(entry);

    if (id % 25 === 0 || id === TOTAL_POKEMON) {
      console.log(`  Pokemon: ${id}/${TOTAL_POKEMON}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return pokemon;
}

export async function fetchPokemonDataById(pokemonId: number): Promise<PokemonEntry> {
  const res = await fetch(`${API_BASE}/pokemon/${pokemonId}`);
  if (!res.ok) throw new Error(`Failed to fetch pokemon ${pokemonId}: ${res.status}`);
  const data = await res.json();

  const statsMap: Record<string, number> = {};
  for (const s of data.stats) {
    statsMap[s.stat.name] = s.base_stat;
  }

  const enName = data.name.charAt(0).toUpperCase() + data.name.slice(1);
  return {
    id: data.id,
    name: { en: enName, he: enName }, // Hebrew added by add-hebrew-names.ts
    types: data.types.map((t: { type: { name: string } }) => t.type.name),
    stats: {
      hp: statsMap['hp'] ?? 0,
      attack: statsMap['attack'] ?? 0,
      defense: statsMap['defense'] ?? 0,
      specialAttack: statsMap['special-attack'] ?? 0,
      specialDefense: statsMap['special-defense'] ?? 0,
      speed: statsMap['speed'] ?? 0,
    },
    baseExperience: data.base_experience ?? 0,
    height: data.height ?? 0,
    weight: data.weight ?? 0,
    category: '?',
    description: '?',
  };
}
