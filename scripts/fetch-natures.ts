/**
 * Fetches all 25 natures from PokeAPI.
 *
 * Produces: natures.json — keyed by ID: { name, increasedStat, decreasedStat }
 * Neutral natures (e.g. Hardy) have null for both stat fields.
 *
 * Usage: npx tsx scripts/fetch-natures.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 100;
const TOTAL_NATURES = 25;
const MAX_RETRIES = 3;

export interface LocalizedName {
  en: string;
  he: string;
}

/** Maps PokeAPI stat names to our stat keys */
const STAT_KEY_MAP: Record<string, string> = {
  'attack': 'attack',
  'defense': 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  'speed': 'speed',
};

export interface NatureDef {
  name: LocalizedName;
  increasedStat: string | null;
  decreasedStat: string | null;
}

export type NaturesData = Record<string, NatureDef>;

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

function formatName(apiName: string): string {
  return apiName.charAt(0).toUpperCase() + apiName.slice(1);
}

export async function fetchNatures(): Promise<NaturesData> {
  const natures: NaturesData = {};

  for (let id = 1; id <= TOTAL_NATURES; id++) {
    const res = await fetchWithRetry(`${API_BASE}/nature/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch nature ${id}: ${res.status}`);
    const data = await res.json();

    const enName = formatName(data.name);
    const increased = data.increased_stat?.name ?? null;
    const decreased = data.decreased_stat?.name ?? null;

    natures[String(id)] = {
      name: { en: enName, he: enName }, // Hebrew added by post-processing script
      increasedStat: increased ? (STAT_KEY_MAP[increased] ?? increased) : null,
      decreasedStat: decreased ? (STAT_KEY_MAP[decreased] ?? decreased) : null,
    };

    console.log(
      `  Nature ${id}/${TOTAL_NATURES}: ${enName}` +
      (increased ? ` (+${STAT_KEY_MAP[increased] ?? increased} / -${STAT_KEY_MAP[decreased!] ?? decreased})` : ' (neutral)')
    );
    await sleep(RATE_LIMIT_MS);
  }

  return natures;
}

// Standalone runner
async function main(): Promise<void> {
  console.log('=== Fetching Natures ===\n');
  const startTime = Date.now();

  const data = await fetchNatures();

  const dataDir = join(process.cwd(), 'src', 'data');
  mkdirSync(dataDir, { recursive: true });

  const outPath = join(dataDir, 'natures.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Wrote ${Object.keys(data).length} natures to natures.json in ${elapsed}s`);
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
