/**
 * Downloads battle background images from Pokemon Showdown.
 * Saves to public/sprites/backgrounds/bg-{name}.jpg
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const BASE_URL = 'https://play.pokemonshowdown.com/sprites/gen6bgs/';
const RATE_LIMIT_MS = 200;

interface BackgroundDef {
  /** Normalized output name (without extension) */
  name: string;
  /** Candidate filenames to try on the server */
  candidates: string[];
}

const BACKGROUNDS: BackgroundDef[] = [
  { name: 'bg-meadow', candidates: ['bg-meadow.jpg', 'meadow.jpg', 'bg-grass.jpg'] },
  { name: 'bg-ocean', candidates: ['bg-ocean.jpg', 'ocean.jpg', 'bg-water.jpg'] },
  { name: 'bg-cave', candidates: ['bg-cave.jpg', 'cave.jpg'] },
  { name: 'bg-city', candidates: ['bg-city.jpg', 'city.jpg'] },
  { name: 'bg-gym', candidates: ['bg-gym.jpg', 'gym.jpg'] },
  { name: 'bg-elite4', candidates: ['bg-elite4.jpg', 'elite4.jpg'] },
  { name: 'bg-route', candidates: ['bg-route.jpg', 'route.jpg'] },
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryDownload(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function fetchBattleBackgrounds(outDir: string): Promise<number> {
  mkdirSync(outDir, { recursive: true });
  let downloaded = 0;

  for (const bg of BACKGROUNDS) {
    const outPath = join(outDir, `${bg.name}.jpg`);

    // Skip already downloaded
    if (existsSync(outPath)) {
      console.log(`  ⏭ ${bg.name} (already exists)`);
      downloaded++;
      continue;
    }

    let found = false;
    for (const candidate of bg.candidates) {
      const url = `${BASE_URL}${candidate}`;
      const data = await tryDownload(url);
      if (data) {
        writeFileSync(outPath, data);
        console.log(`  ✓ ${bg.name} (from ${candidate})`);
        downloaded++;
        found = true;
        break;
      }
      await sleep(RATE_LIMIT_MS);
    }

    if (!found) {
      console.log(`  ✗ ${bg.name} — no candidate matched (tried: ${bg.candidates.join(', ')})`);
    }
  }

  return downloaded;
}

// Allow running standalone: npx tsx scripts/fetch-battle-backgrounds.ts
if (process.argv[1]?.includes('fetch-battle-backgrounds')) {
  const ROOT = process.cwd();
  const OUT = join(ROOT, 'public', 'sprites', 'backgrounds');
  console.log('=== Fetching Battle Backgrounds ===\n');
  fetchBattleBackgrounds(OUT)
    .then(n => console.log(`\nDone — ${n}/${BACKGROUNDS.length} backgrounds downloaded.`))
    .catch(err => {
      console.error('FATAL:', err);
      process.exit(1);
    });
}
