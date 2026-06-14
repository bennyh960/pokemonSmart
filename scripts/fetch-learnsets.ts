/**
 * Fetches learnset data (level-up moves) for all 251 Gen 1-2 Pokemon from PokeAPI.
 * Saves to src/data/learnsets.json
 *
 * Usage: npx tsx scripts/fetch-learnsets.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 150;
const TOTAL_POKEMON = 251;
const MAX_RETRIES = 3;

/** Preferred version groups in priority order */
const VERSION_GROUP_PRIORITY = [
  // דור 4 (עבור פוקימונים חדשים כמו טוגקיס ואלקטיבייר)
  'diamond-pearl',
  'platinum',
  'heartgold-soulsilver',

  // דור 3 (עבור פוקימונים כמו בלדום, סלמנס, פלאיגון)
  'ruby-sapphire',
  'emerald',
  'firered-leafgreen',

  // דור 2 ו-1 (עבור הפוקימונים המקוריים של המשחק שלך)
  'gold-silver',
  'crystal',
  'red-blue',
  'yellow',
];

export interface LearnsetEntry {
  moveId: number;
  levelLearned: number;
}

export type LearnsetData = Record<string, LearnsetEntry[]>;

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

export async function fetchLearnsets(): Promise<LearnsetData> {
  const learnsets: LearnsetData = {};

  for (let id = 1; id <= TOTAL_POKEMON; id++) {
    const entries = await fetchLearnsetByPokemonId(id);

    learnsets[String(id)] = entries;

    await sleep(RATE_LIMIT_MS);
  }

  return learnsets;
}

export async function fetchLearnsetByPokemonId(pokemonId: number): Promise<LearnsetEntry[]> {
  const res = await fetchWithRetry(`${API_BASE}/pokemon/${pokemonId}`);
  if (!res.ok) throw new Error(`Failed to fetch pokemon ${pokemonId}: ${res.status}`);
  const data = await res.json();

  const enName = data.name.charAt(0).toUpperCase() + data.name.slice(1);
  console.log(`Fetching learnset for Pokemon ${pokemonId}/${TOTAL_POKEMON} (${enName})...`);

  const entries: LearnsetEntry[] = [];

  for (const move of data.moves) {
    const moveId = extractIdFromUrl(move.move.url);

    // Find the best matching version group detail for level-up moves
    let bestDetail: any = null;
    for (const versionGroup of VERSION_GROUP_PRIORITY) {
      bestDetail = move.version_group_details.find(
        (d: any) => d.version_group.name === versionGroup && d.move_learn_method.name === 'level-up',
      );
      if (bestDetail) break;
    }

    if (bestDetail) {
      entries.push({
        moveId,
        levelLearned: bestDetail.level_learned_at,
      });
    }
  }

  // Sort by levelLearned ascending, then by moveId ascending for ties
  entries.sort((a, b) => a.levelLearned - b.levelLearned || a.moveId - b.moveId);

  return entries;
}

// Standalone runner
// async function main(): Promise<void> {
//   console.log('=== Fetching Learnsets ===\n');
//   const startTime = Date.now();

//   const data = await fetchLearnsets();

//   const dataDir = join(process.cwd(), 'src', 'data');
//   mkdirSync(dataDir, { recursive: true });
//   const outPath = join(dataDir, 'learnsets.json');
//   writeFileSync(outPath, JSON.stringify(data, null, 2));

//   const count = Object.keys(data).length;
//   const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
//   console.log(`\n✓ Wrote learnsets for ${count} Pokemon to ${outPath} in ${elapsed}s`);
// }

// main().catch((err) => {
//   console.error('\nFATAL:', err);
//   process.exit(1);
// });
