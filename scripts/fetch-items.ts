/**
 * Fetches ALL game-relevant items from PokeAPI into a unified items.json.
 *
 * Merges usable items (potions, balls, status cures, vitamins, battle items)
 * and holdable items into a single lookup table keyed by PokeAPI numeric ID.
 *
 * This replaces:
 *   - The name/description/sprite data from items.ts
 *   - The name/description data from pokeballs.ts
 *   - held-items.json (which was a separate holdable-only fetch)
 *
 * Produces: items.json — { [pokeapiId]: { name, slug, description, category, sprite, holdable } }
 *
 * Usage: npx tsx scripts/fetch-items.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 100;
const MAX_RETRIES = 3;

export interface LocalizedName {
  en: string;
  he: string;
}

export interface GameItemDef {
  name: LocalizedName;
  slug: string;            // PokeAPI slug (e.g. 'potion', 'poke-ball') — useful for icon lookups
  description: string;
  category: string;        // PokeAPI category (e.g. 'healing', 'standard-balls', 'held-items')
  sprite: string | null;
  holdable: boolean;       // Can be held by a Pokemon
  flingPower: number | null;
}

export type ItemsData = Record<string, GameItemDef>;

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
  return apiName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Items we explicitly need for gameplay, even if PokeAPI doesn't flag them as holdable.
 * These are our core usable items (potions, balls, cures, etc.)
 */
const REQUIRED_ITEM_IDS = [
  // Pokeballs
  1,    // Master Ball
  2,    // Ultra Ball
  3,    // Great Ball
  4,    // Poke Ball
  // Healing
  17,   // Potion
  18,   // Antidote
  19,   // Burn Heal
  20,   // Ice Heal
  21,   // Awakening
  22,   // Paralyze Heal
  23,   // Full Restore
  24,   // Max Potion
  25,   // Hyper Potion
  26,   // Super Potion
  27,   // Full Heal
  28,   // Revive
  29,   // Max Revive
  // Drinks
  30,   // Fresh Water
  31,   // Soda Pop
  32,   // Lemonade
  33,   // Moomoo Milk
  // PP recovery
  38,   // Ether
  39,   // Max Ether
  40,   // Elixir
  41,   // Max Elixir
  // Vitamins
  45,   // HP Up
  46,   // Protein
  47,   // Iron
  48,   // Carbos
  49,   // Calcium
  50,   // Rare Candy
  // Battle items
  55,   // Guard Spec
  56,   // Dire Hit
  57,   // X Attack
  58,   // X Defense
  59,   // X Speed
  60,   // X Accuracy
  61,   // X Sp. Atk
  62,   // X Sp. Def
  // Evolution stones
  80,   // Sun Stone
  81,   // Moon Stone
  82,   // Fire Stone
  83,   // Thunder Stone
  84,   // Water Stone
  85,   // Leaf Stone
  // Trade evolution held items
  198,  // King's Rock
  210,  // Metal Coat
  235,  // Dragon Scale
  252,  // Up-Grade
];

export async function fetchItems(): Promise<ItemsData> {
  const items: ItemsData = {};
  const processedIds = new Set<number>();

  // Step 1: Fetch holdable items from PokeAPI attributes
  console.log('  Step 1: Finding holdable items...');
  const holdableIds = new Set<number>();
  const HOLDABLE_ATTRIBUTE_IDS = [5, 7]; // 5=holdable, 7=holdable-active

  for (const attrId of HOLDABLE_ATTRIBUTE_IDS) {
    const res = await fetchWithRetry(`${API_BASE}/item-attribute/${attrId}`);
    if (!res.ok) throw new Error(`Failed to fetch item-attribute ${attrId}: ${res.status}`);
    const data = await res.json();

    for (const item of data.items) {
      const parts = item.url.replace(/\/$/, '').split('/');
      holdableIds.add(parseInt(parts[parts.length - 1], 10));
    }
    console.log(`    Attribute ${attrId} (${data.name}): ${data.items.length} items`);
    await sleep(RATE_LIMIT_MS);
  }

  // Combine holdable IDs + required gameplay IDs
  const allIds = new Set<number>([...holdableIds, ...REQUIRED_ITEM_IDS]);

  // Filter to reasonable ID range (Gen 1-3 items + trade evo items up to ~260)
  const idsToFetch = [...allIds].filter(id => id <= 400).sort((a, b) => a - b);
  console.log(`  Found ${holdableIds.size} holdable + ${REQUIRED_ITEM_IDS.length} required = ${idsToFetch.length} unique items to fetch`);

  // Step 2: Fetch each item
  let count = 0;
  console.log(`  Step 2: Fetching ${idsToFetch.length} item definitions...`);

  for (const itemId of idsToFetch) {
    if (processedIds.has(itemId)) continue;

    const res = await fetchWithRetry(`${API_BASE}/item/${itemId}`);
    if (!res.ok) {
      console.warn(`    Skipping item ${itemId}: HTTP ${res.status}`);
      count++;
      await sleep(RATE_LIMIT_MS);
      continue;
    }
    const data = await res.json();

    const enName = formatName(data.name);
    const slug: string = data.name; // PokeAPI slug, e.g. 'potion', 'poke-ball'

    // Extract English flavor text
    const flavorEntries = data.flavor_text_entries ?? [];
    const englishEntries = flavorEntries.filter((e: any) => e.language.name === 'en');
    const gsEntry = englishEntries.find((e: any) =>
      e.version_group?.name === 'gold-silver' ||
      e.version_group?.name === 'ruby-sapphire'
    );
    const flavorText = (gsEntry ?? englishEntries[0])?.text?.replace(/\n/g, ' ')?.trim() ?? '';

    // Fallback to effect text
    const effectEntries = data.effect_entries ?? [];
    const enEffect = effectEntries.find((e: any) => e.language.name === 'en');
    const shortEffect = enEffect?.short_effect ?? '';

    const isHoldable = holdableIds.has(itemId);

    items[String(itemId)] = {
      name: { en: enName, he: enName }, // Hebrew added by post-processing script
      slug,
      description: flavorText || shortEffect,
      category: data.category?.name ?? 'unknown',
      sprite: data.sprites?.default ?? null,
      holdable: isHoldable,
      flingPower: data.fling_power ?? null,
    };

    processedIds.add(itemId);
    count++;
    if (count % 50 === 0 || count === idsToFetch.length) {
      console.log(`    Items: ${count}/${idsToFetch.length}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return items;
}

// Standalone runner
async function main(): Promise<void> {
  console.log('=== Fetching All Game Items ===\n');
  const startTime = Date.now();

  const data = await fetchItems();

  const dataDir = join(process.cwd(), 'src', 'data');
  mkdirSync(dataDir, { recursive: true });

  const outPath = join(dataDir, 'items.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Wrote ${Object.keys(data).length} items to items.json in ${elapsed}s`);
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
