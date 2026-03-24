/**
 * Enriches existing pokemon.json with height, weight, category, and description fields.
 * Fetches from PokeAPI for each of the 251 Pokemon.
 * Preserves all existing fields.
 *
 * Usage: npx tsx scripts/enrich-pokemon-metadata.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const POKEMON_PATH = join(process.cwd(), 'src', 'data', 'pokemon.json');
const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 150;
const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url);
      return res;
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      console.warn(`  Retry ${attempt}/${MAX_RETRIES} for ${url}...`);
      await sleep(1000 * attempt);
    }
  }
  throw new Error('unreachable');
}

interface PokemonEntry {
  id: number;
  name: { en: string; he: string };
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
  height?: number;
  weight?: number;
  category?: string;
  description?: string;
}

async function main() {
  // Read existing pokemon data
  const raw = readFileSync(POKEMON_PATH, 'utf-8');
  const pokemon: PokemonEntry[] = JSON.parse(raw);
  const total = pokemon.length;

  console.log(`Enriching ${total} Pokemon with height, weight, category, and description...`);

  for (let i = 0; i < pokemon.length; i++) {
    const entry = pokemon[i];

    try {
      // Fetch basic Pokemon data (height, weight)
      const pokemonRes = await fetchWithRetry(`${API_BASE}/pokemon/${entry.id}`);
      if (!pokemonRes.ok) {
        console.warn(`  Warning: Failed to fetch pokemon ${entry.id} (${entry.name.en}): ${pokemonRes.status}`);
        // TODO: hardcode defaults if API unavailable
        entry.height = entry.height ?? 0;
        entry.weight = entry.weight ?? 0;
      } else {
        const pokemonData = await pokemonRes.json();
        entry.height = pokemonData.height ?? 0;
        entry.weight = pokemonData.weight ?? 0;
      }

      await sleep(RATE_LIMIT_MS);

      // Fetch species data (category, description)
      const speciesRes = await fetchWithRetry(`${API_BASE}/pokemon-species/${entry.id}`);
      if (!speciesRes.ok) {
        console.warn(`  Warning: Failed to fetch species ${entry.id} (${entry.name.en}): ${speciesRes.status}`);
        // TODO: hardcode defaults if API unavailable
        entry.category = entry.category ?? '';
        entry.description = entry.description ?? '';
      } else {
        const speciesData = await speciesRes.json();

        // Extract English genus (category)
        const genera: any[] = speciesData.genera ?? [];
        const englishGenus = genera.find((g: any) => g.language.name === 'en');
        entry.category = englishGenus?.genus ?? '';

        // Extract English flavor text, preferring gold-silver version
        const flavorEntries: any[] = speciesData.flavor_text_entries ?? [];
        const englishEntries = flavorEntries.filter((e: any) => e.language.name === 'en');
        const gsEntry = englishEntries.find((e: any) => e.version.name === 'gold' || e.version.name === 'silver');
        const flavorText = (gsEntry ?? englishEntries[0])?.flavor_text?.replace(/[\n\f\r]/g, ' ') ?? '';
        entry.description = flavorText;
      }
    } catch (err) {
      console.warn(`  Error fetching pokemon ${entry.id} (${entry.name.en}):`, err);
      // TODO: hardcode defaults if API unavailable
      entry.height = entry.height ?? 0;
      entry.weight = entry.weight ?? 0;
      entry.category = entry.category ?? '';
      entry.description = entry.description ?? '';
    }

    // Progress logging
    const count = i + 1;
    if (count % 25 === 0 || count === total) {
      console.log(`  Processing pokemon ${count}/${total}...`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  // Write back preserving order
  writeFileSync(POKEMON_PATH, JSON.stringify(pokemon, null, 2) + '\n', 'utf-8');
  console.log(`Done! Updated ${POKEMON_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
