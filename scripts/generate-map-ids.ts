/**
 * generate-map-ids.ts
 *
 * Scans src/data/maps (excluding "backup" and "templates" folders),
 * reads every *.json file recursively, extracts the top-level "id" field,
 * and writes a TypeScript enum + string-literal union to src/data/maps/map-ids.ts.
 *
 * Run with: npm run generate-mapIds
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAPS_DIR = path.resolve(__dirname, '../src/data/maps');
const OUTPUT_FILE = path.resolve(__dirname, '../src/data/maps', 'map-ids.ts');
const EXCLUDED_DIRS = new Set(['backup', 'templates']);

interface MapEntry {
  key: string; // enum key  e.g. SUMVILLE_GYM
  value: string; // enum value e.g. sumville/sumville-gym
}

function collectEntries(dir: string, topFolder: string, entries: MapEntry[] = []): MapEntry[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        collectEntries(path.join(dir, entry.name), topFolder, entries);
      }
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      try {
        const raw = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed?.id === 'string' && parsed.id.trim() !== '') {
          const id = parsed.id.trim();
          const value = `${topFolder}/${id}`;
          const key = toEnumKey(`${topFolder}_${id}`);
          entries.push({ key, value });
        }
      } catch {
        // skip malformed JSON
      }
    }
  }
  return entries;
}

function toEnumKey(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function generate(): void {
  const allEntries: MapEntry[] = [];

  for (const entry of fs.readdirSync(MAPS_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && !EXCLUDED_DIRS.has(entry.name)) {
      collectEntries(path.join(MAPS_DIR, entry.name), entry.name, allEntries);
    }
  }

  // deduplicate by value, sort by value
  const seen = new Set<string>();
  const unique = allEntries
    .filter((e) => {
      if (seen.has(e.value)) return false;
      seen.add(e.value);
      return true;
    })
    .sort((a, b) => a.value.localeCompare(b.value));

  const constLines = unique.map((e) => `  ${e.key}: '${e.value}',`);

  const output = [
    '// AUTO-GENERATED — do not edit manually.',
    '// Run: npm run generate-mapIds',
    '',
    'export const MapId = {',
    ...constLines,
    '} as const;',
    '',
    'export type MapId = (typeof MapId)[keyof typeof MapId];',
    '',
  ].join('\n');

  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`✅ Generated ${unique.length} map IDs → ${OUTPUT_FILE}`);
}

generate();
