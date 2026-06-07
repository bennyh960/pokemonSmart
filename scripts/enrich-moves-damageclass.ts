/**
 * Enriches existing moves.json with damageClass and description fields.
 * Fetches from PokeAPI for each move by ID.
 * Preserves all existing fields (including Hebrew names).
 *
 * Usage: npx tsx scripts/enrich-moves-damageclass.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MOVES_PATH = join(process.cwd(), 'src', 'data', 'moves.json');
const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 150;
const MAX_RETRIES = 3;

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

interface MoveEntry {
  id: number;
  name: { en: string; he: string };
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  effectChance: number | null;
  damageClass?: string;
  description?: string;
}

async function main() {
  // Read existing moves
  const raw = readFileSync(MOVES_PATH, 'utf-8');
  const moves: MoveEntry[] = JSON.parse(raw);
  const total = moves.length;

  console.log(`Enriching ${total} moves with damageClass and description...`);

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];

    try {
      const res = await fetchWithRetry(`${API_BASE}/move/${move.id}`);
      if (!res.ok) {
        console.warn(`  Warning: Failed to fetch move ${move.id} (${move.name.en}): ${res.status}`);
        move.damageClass = 'status';
        move.description = '';
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      const data = await res.json();

      // Extract damage class
      move.damageClass = data.damage_class?.name ?? 'status';

      // Extract English flavor text, preferring gold-silver version group
      const flavorEntries: any[] = data.flavor_text_entries ?? [];
      const englishEntries = flavorEntries.filter((e: any) => e.language.name === 'en');
      const gsEntry = englishEntries.find((e: any) => e.version_group.name === 'gold-silver');
      const flavorText = (gsEntry ?? englishEntries[0])?.flavor_text?.replace(/\n/g, ' ') ?? '';
      move.description = flavorText;
    } catch (err) {
      console.warn(`  Error fetching move ${move.id} (${move.name.en}):`, err);
      move.damageClass = move.damageClass ?? 'status';
      move.description = move.description ?? '';
    }

    // Progress logging
    const count = i + 1;
    if (count % 50 === 0 || count === total) {
      console.log(`  Processing move ${count}/${total}...`);
    }

    await sleep(RATE_LIMIT_MS);
  }

  // Write back preserving order
  writeFileSync(MOVES_PATH, JSON.stringify(moves, null, 2) + '\n', 'utf-8');
  console.log(`Done! Updated ${MOVES_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
