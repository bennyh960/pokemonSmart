/**
 * Downloads trainer sprites from Pokemon Showdown.
 * Saves to public/sprites/trainers/{name}.png
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = 'https://play.pokemonshowdown.com/sprites/trainers/';
const RATE_LIMIT_MS = 150;

const TRAINERS: string[] = [
  // Generic trainers
  'youngster',
  'lass',
  'bug-catcher',
  'hiker',
  'beauty',
  'swimmer',
  'fisherman',
  'scientist',
  'rocket-grunt',
  'nurse',
  'shopkeeper',
  // Gym leaders
  'brock',
  'misty',
  'lt-surge',
  'erika',
  'koga',
  'sabrina',
  'blaine',
  'giovanni',
  // Elite Four + Champion
  'lorelei',
  'bruno',
  'agatha',
  'lance',
  'blue',
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadImage(url: string, outPath: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPath, buffer);
    return true;
  } catch {
    return false;
  }
}

export async function fetchTrainerSprites(outDir: string): Promise<{ downloaded: number; skipped: string[] }> {
  mkdirSync(outDir, { recursive: true });
  let downloaded = 0;
  const skipped: string[] = [];

  for (const name of TRAINERS) {
    const outPath = join(outDir, `${name}.png`);

    // Skip already downloaded
    if (existsSync(outPath)) {
      console.log(`  ⏭ ${name} (already exists)`);
      downloaded++;
      continue;
    }

    const url = `${BASE_URL}${name}.png`;
    if (await downloadImage(url, outPath)) {
      console.log(`  ✓ ${name}`);
      downloaded++;
    } else {
      console.log(`  ✗ ${name} — 404 or download failed`);
      skipped.push(name);
    }

    await sleep(RATE_LIMIT_MS);
  }

  return { downloaded, skipped };
}

// Allow running standalone: npx tsx scripts/fetch-trainer-sprites.ts
if (process.argv[1]?.includes('fetch-trainer-sprites')) {
  const ROOT = process.cwd();
  const OUT = join(ROOT, 'public', 'sprites', 'trainers');
  console.log('=== Fetching Trainer Sprites ===\n');
  fetchTrainerSprites(OUT)
    .then(({ downloaded, skipped }) => {
      console.log(`\nDone — ${downloaded}/${TRAINERS.length} trainers downloaded.`);
      if (skipped.length > 0) {
        console.log(`Skipped: ${skipped.join(', ')}`);
      }
    })
    .catch(err => {
      console.error('FATAL:', err);
      process.exit(1);
    });
}
