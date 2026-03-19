/**
 * Master script that runs all fetch scripts in sequence.
 * Usage: npx tsx scripts/run-all.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fetchPokemonData } from './fetch-pokemon-data.js';
import { fetchMovesData } from './fetch-moves-data.js';
import { fetchTypeChart } from './fetch-type-chart.js';
import { fetchEvolutionChains } from './fetch-evolution-chains.js';
import { fetchSprites } from './fetch-sprites.js';

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'src', 'data');
const SPRITES_DIR = join(ROOT, 'public', 'sprites', 'pokemon');

interface Task {
  name: string;
  run: () => Promise<void>;
}

function writeJson(filename: string, data: unknown): void {
  const outPath = join(DATA_DIR, filename);
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(outPath, JSON.stringify(data, null, 2));
}

const tasks: Task[] = [
  {
    name: 'Pokemon Data (251)',
    async run() {
      const data = await fetchPokemonData();
      writeJson('pokemon.json', data);
      console.log(`  ✓ Wrote ${data.length} Pokemon`);
    },
  },
  {
    name: 'Moves Data',
    async run() {
      const data = await fetchMovesData();
      writeJson('moves.json', data);
      console.log(`  ✓ Wrote ${data.length} moves`);
    },
  },
  {
    name: 'Type Chart',
    async run() {
      const data = await fetchTypeChart();
      writeJson('type-chart.json', data);
      console.log(`  ✓ Wrote type chart with ${data.types.length} types`);
    },
  },
  {
    name: 'Evolution Chains',
    async run() {
      const data = await fetchEvolutionChains();
      writeJson('evolution-chains.json', data);
      console.log(`  ✓ Wrote ${data.length} evolution chains`);
    },
  },
  {
    name: 'Sprites',
    async run() {
      const counts = await fetchSprites(SPRITES_DIR);
      console.log(`  ✓ Downloaded sprites - Front: ${counts.front}, Back: ${counts.back}, Icons: ${counts.icons}`);
    },
  },
];

async function runWithRetry(task: Task, maxRetries = 2): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      await task.run();
      return;
    } catch (err) {
      if (attempt > maxRetries) throw err;
      console.log(`  ⚠ ${task.name} failed (attempt ${attempt}/${maxRetries + 1}), retrying...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function main(): Promise<void> {
  console.log('=== Pokemon Math Adventure - Data Pipeline ===\n');
  const startTime = Date.now();

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`\n[${i + 1}/${tasks.length}] ${task.name}...`);
    await runWithRetry(task);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n=== All done in ${elapsed}s ===`);
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
