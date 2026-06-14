/**
 * Fetches ability data from PokeAPI for all abilities used by Gen 1-2 Pokemon.
 *
 * Produces two files (relational model — no duplication):
 *   1. abilities.json     — ability definitions keyed by ID: { name, description }
 *   2. pokemon-abilities.json — mapping table: pokemonId → { abilities: [id,...], hidden: id|null }
 *
 * Usage: npx tsx scripts/fetch-abilities.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 100;
const TOTAL_POKEMON = 251;
const MAX_RETRIES = 3;

export interface LocalizedName {
  en: string;
  he: string;
}

export interface AbilityDef {
  name: LocalizedName;
  description: string;
  generationIntroduced: string;
}

export interface PokemonAbilityMapping {
  abilities: number[];
  hidden: number | null;
}

export type AbilitiesData = Record<string, AbilityDef>;
export type PokemonAbilitiesData = Record<string, PokemonAbilityMapping>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function extractIdFromUrl(url: string): number {
  const parts = url.replace(/\/$/, '').split('/');
  return parseInt(parts[parts.length - 1], 10);
}

function formatName(apiName: string): string {
  return apiName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function fetchPokemobAbilitesByPokemonId(
  pokemonId: number,
  abilityIds?: Set<number>,
): Promise<PokemonAbilityMapping> {
  const res = await fetchWithRetry(`${API_BASE}/pokemon/${pokemonId}`);
  if (!res.ok) throw new Error(`Failed to fetch pokemon ${pokemonId}: ${res.status}`);
  const data = await res.json();

  const regular: number[] = [];
  let hidden: number | null = null;

  for (const a of data.abilities) {
    const abilityId = extractIdFromUrl(a.ability.url);

    // set its only when run in loop
    if (abilityIds) abilityIds.add(abilityId);

    if (a.is_hidden) {
      hidden = abilityId;
    } else {
      regular.push(abilityId);
    }
  }

  // Sort regular abilities by slot for deterministic order
  regular.sort((a, b) => a - b);
  return { abilities: regular, hidden };
}

export async function fetchAbilities(): Promise<{
  abilities: AbilitiesData;
  pokemonAbilities: PokemonAbilitiesData;
}> {
  const pokemonAbilities: PokemonAbilitiesData = {};
  const abilityIds = new Set<number>();

  // Step 1: Collect ability mappings from all 251 Pokemon
  console.log('  Step 1: Collecting ability mappings from Pokemon...');
  for (let id = 1; id <= TOTAL_POKEMON; id++) {
    const { abilities: regular, hidden } = await fetchPokemobAbilitesByPokemonId(id, abilityIds);

    pokemonAbilities[String(id)] = { abilities: regular, hidden };

    if (id % 50 === 0 || id === TOTAL_POKEMON) {
      console.log(`    Pokemon: ${id}/${TOTAL_POKEMON} (${abilityIds.size} unique abilities found)`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  // Step 2: Fetch each ability's definition
  const abilities: AbilitiesData = {};
  const ids = [...abilityIds].sort((a, b) => a - b);
  let count = 0;

  console.log(`  Step 2: Fetching ${ids.length} ability definitions...`);
  for (const abilityId of ids) {
    const res = await fetchWithRetry(`${API_BASE}/ability/${abilityId}`);
    if (!res.ok) throw new Error(`Failed to fetch ability ${abilityId}: ${res.status}`);
    const data = await res.json();

    const enName = formatName(data.name);

    // Extract English flavor text, preferring gold-silver era
    const flavorEntries = data.flavor_text_entries ?? [];
    const englishEntries = flavorEntries.filter((e: any) => e.language.name === 'en');
    const gsEntry = englishEntries.find(
      (e: any) => e.version_group?.name === 'gold-silver' || e.version_group?.name === 'ruby-sapphire',
    );
    const description = (gsEntry ?? englishEntries[0])?.flavor_text?.replace(/\n/g, ' ')?.trim() ?? '';

    // Extract English effect text (short)
    const effectEntries = data.effect_entries ?? [];
    const enEffect = effectEntries.find((e: any) => e.language.name === 'en');
    const shortEffect = enEffect?.short_effect ?? '';

    abilities[String(abilityId)] = {
      name: { en: enName, he: enName }, // Hebrew added by post-processing script
      description: description || shortEffect,
      generationIntroduced: data.generation?.name ?? 'unknown',
    };

    count++;
    if (count % 20 === 0 || count === ids.length) {
      console.log(`    Abilities: ${count}/${ids.length}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return { abilities, pokemonAbilities };
}

// Standalone runner
async function main(): Promise<void> {
  console.log('=== Fetching Abilities ===\n');
  const startTime = Date.now();

  const { abilities, pokemonAbilities } = await fetchAbilities();

  const dataDir = join(process.cwd(), 'src', 'data');
  mkdirSync(dataDir, { recursive: true });

  const abilitiesPath = join(dataDir, 'abilities.json');
  writeFileSync(abilitiesPath, JSON.stringify(abilities, null, 2));
  console.log(`\n✓ Wrote ${Object.keys(abilities).length} abilities to abilities.json`);

  const mappingPath = join(dataDir, 'pokemon-abilities.json');
  writeFileSync(mappingPath, JSON.stringify(pokemonAbilities, null, 2));
  console.log(`✓ Wrote ability mappings for ${Object.keys(pokemonAbilities).length} Pokemon to pokemon-abilities.json`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s`);
}

main().catch((err) => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
