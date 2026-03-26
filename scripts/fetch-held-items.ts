/**
 * Fetches holdable item data from PokeAPI for items relevant to Gen 1-2 Pokemon.
 *
 * Produces: held-items.json — keyed by ID: { name, description, category, effect }
 * These are items a Pokemon can hold (berries, battle items, etc.)
 *
 * Strategy:
 *   1. Fetch item categories that are holdable (held-items, medicine, berries, etc.)
 *   2. Fetch each item's details
 *   3. Only include items from Gen 2 or earlier (held items were introduced in Gen 2)
 *
 * Usage: npx tsx scripts/fetch-held-items.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 100;
const MAX_RETRIES = 3;

/** PokeAPI item category names that contain holdable items */
const HOLDABLE_CATEGORIES = [
  'held-items',
  'choice',
  'effort-training',
  'bad-held-items',
  'training',
  'plates',
  'species-specific',
  'type-enhancement',
  'type-protection',
  'jewels',
  'in-a-pinch',
  'stat-boosts',         // White Herb, Power Herb, etc.
  'vitamins',
];

/** PokeAPI item attribute IDs: 5 = holdable, 7 = holdable-active */
const HOLDABLE_ATTRIBUTE_IDS = [5, 7];

export interface LocalizedName {
  en: string;
  he: string;
}

export interface HeldItemDef {
  name: LocalizedName;
  description: string;
  category: string;
  flingPower: number | null;
  flingEffect: string | null;
  sprite: string | null;
}

export type HeldItemsData = Record<string, HeldItemDef>;

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

function extractIdFromUrl(url: string): number {
  const parts = url.replace(/\/$/, '').split('/');
  return parseInt(parts[parts.length - 1], 10);
}

function formatName(apiName: string): string {
  return apiName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export async function fetchHeldItems(): Promise<HeldItemsData> {
  const items: HeldItemsData = {};

  // Fetch all items that have holdable attributes
  // Use the item-attribute endpoint to get items with attribute 5 (holdable) or 7 (holdable-active)
  const holdableItemUrls = new Set<string>();

  console.log('  Step 1: Finding holdable items via item attributes...');
  for (const attrId of HOLDABLE_ATTRIBUTE_IDS) {
    const res = await fetchWithRetry(`${API_BASE}/item-attribute/${attrId}`);
    if (!res.ok) throw new Error(`Failed to fetch item-attribute ${attrId}: ${res.status}`);
    const data = await res.json();

    for (const item of data.items) {
      holdableItemUrls.add(item.url);
    }
    console.log(`    Attribute ${attrId} (${data.name}): ${data.items.length} items`);
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`  Found ${holdableItemUrls.size} unique holdable items`);

  // Step 2: Fetch each item's details
  const urls = [...holdableItemUrls].sort();
  let count = 0;
  let included = 0;

  console.log(`  Step 2: Fetching item details...`);
  for (const url of urls) {
    const res = await fetchWithRetry(url);
    if (!res.ok) throw new Error(`Failed to fetch item ${url}: ${res.status}`);
    const data = await res.json();

    const itemId = data.id;
    const enName = formatName(data.name);

    // Only include items from gen 2 or earlier (held items started in gen 2)
    // Also include gen 3 items that are commonly associated with gen 2 Pokemon
    const genId = data.game_indices?.length > 0
      ? Math.min(...data.game_indices.map((g: any) => {
          const genName = g.generation?.name ?? '';
          const match = genName.match(/generation-(\w+)/);
          if (!match) return 999;
          const roman: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };
          return roman[match[1]] ?? 999;
        }))
      : 999;

    // Include items from gen 1-3 (gen 3 refined held items system)
    if (genId > 3 && itemId > 300) {
      count++;
      if (count % 50 === 0) console.log(`    Processing: ${count}/${urls.length}`);
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    // Extract English flavor text
    const flavorEntries = data.flavor_text_entries ?? [];
    const englishEntries = flavorEntries.filter((e: any) => e.language.name === 'en');
    const gsEntry = englishEntries.find((e: any) =>
      e.version_group?.name === 'gold-silver' ||
      e.version_group?.name === 'ruby-sapphire'
    );
    const description = (gsEntry ?? englishEntries[0])?.text?.replace(/\n/g, ' ')?.trim() ?? '';

    // Extract English effect text
    const effectEntries = data.effect_entries ?? [];
    const enEffect = effectEntries.find((e: any) => e.language.name === 'en');
    const shortEffect = enEffect?.short_effect ?? '';

    const category = data.category?.name ?? 'unknown';
    const flingPower = data.fling_power ?? null;
    const flingEffect = data.fling_effect?.name ?? null;
    const sprite = data.sprites?.default ?? null;

    items[String(itemId)] = {
      name: { en: enName, he: enName }, // Hebrew added by post-processing script
      description: description || shortEffect,
      category,
      flingPower,
      flingEffect,
      sprite,
    };

    included++;
    count++;
    if (count % 50 === 0 || count === urls.length) {
      console.log(`    Processing: ${count}/${urls.length} (${included} included)`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return items;
}

// Standalone runner
async function main(): Promise<void> {
  console.log('=== Fetching Held Items ===\n');
  const startTime = Date.now();

  const data = await fetchHeldItems();

  const dataDir = join(process.cwd(), 'src', 'data');
  mkdirSync(dataDir, { recursive: true });

  const outPath = join(dataDir, 'held-items.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Wrote ${Object.keys(data).length} held items to held-items.json in ${elapsed}s`);
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
