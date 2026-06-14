/**
 * Fetches TM/HM learnable moves for all 251 Gen 1-2 Pokemon from PokeAPI.
 * Saves to src/data/tm-learnsets.json
 *
 * Usage: npx tsx scripts/fetch-tm-learnsets.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 150;
const TOTAL_POKEMON = 251;
const MAX_RETRIES = 3;

/** Preferred version groups in priority order (Gen 2 → Gen 1) */
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
export interface TmLearnsetEntry {
  moveId: number;
}

export type TmLearnsetData = Record<string, TmLearnsetEntry[]>;

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

export async function fetchTmLearnsets(): Promise<TmLearnsetData> {
  const tmLearnsets: TmLearnsetData = {};

  for (let id = 1; id <= TOTAL_POKEMON; id++) {
    const entries = await fetchTmLearnsetByPokemonId(id);
    tmLearnsets[String(id)] = entries;

    await sleep(RATE_LIMIT_MS);
  }

  return tmLearnsets;
}

export async function fetchTmLearnsetByPokemonId(pokemonId: number): Promise<TmLearnsetEntry[]> {
  const res = await fetchWithRetry(`${API_BASE}/pokemon/${pokemonId}`);
  if (!res.ok) throw new Error(`Failed to fetch pokemon ${pokemonId}: ${res.status}`);
  const data = await res.json();

  const enName = data.name.charAt(0).toUpperCase() + data.name.slice(1);
  console.log(`Fetching TM/HM moves for Pokemon ${pokemonId}/${TOTAL_POKEMON} (${enName})...`);

  const entries: TmLearnsetEntry[] = [];

  for (const move of data.moves) {
    const moveId = extractIdFromUrl(move.move.url);
    let found = false;

    // שלב א': חיפוש לפי סדר העדיפויות של הגרסאות שלך
    for (const versionGroup of VERSION_GROUP_PRIORITY) {
      const match = move.version_group_details.find(
        (d: any) => d.version_group.name === versionGroup && d.move_learn_method.name === 'machine',
      );
      if (match) {
        found = true;
        break; // מצאנו התאמה שבה הוא לומד את המהלך כ-TM בדור מועדף
      }
    }

    // שלב ב' (גיבוי): אם המהלך נלמד כ-TM בדור אחר לגמרי (למשל דור 5 ומעלה) שאינו ברשימה שלך
    if (!found) {
      const fallbackMatch = move.version_group_details.some((d: any) => d.move_learn_method.name === 'machine');
      if (fallbackMatch) {
        found = true;
      }
    }

    if (found) {
      entries.push({ moveId });
    }
  }

  entries.sort((a, b) => a.moveId - b.moveId);
  return entries;
}

// Standalone runner
// async function main(): Promise<void> {
//   console.log('=== Fetching TM/HM Learnsets ===\n');
//   const startTime = Date.now();

//   const data = await fetchTmLearnsets();

//   const dataDir = join(process.cwd(), 'src', 'data');
//   mkdirSync(dataDir, { recursive: true });
//   const outPath = join(dataDir, 'tm-learnsets.json');
//   writeFileSync(outPath, JSON.stringify(data, null, 2));

//   const count = Object.keys(data).length;
//   const totalMoves = Object.values(data).reduce((sum, entries) => sum + entries.length, 0);
//   const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
//   console.log(
//     `\n✓ Wrote TM/HM learnsets for ${count} Pokemon (${totalMoves} total entries) to ${outPath} in ${elapsed}s`,
//   );
// }

// main().catch((err) => {
//   console.error('\nFATAL:', err);
//   process.exit(1);
// });
