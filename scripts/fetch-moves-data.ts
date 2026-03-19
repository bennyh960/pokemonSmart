/**
 * Fetches moves data for Gen 1-2 Pokemon from PokeAPI.
 * Calculates mathDifficulty from power.
 * Saves to src/data/moves.json
 */

const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 100;
const TOTAL_POKEMON = 251;

export interface MoveEntry {
  id: number;
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  effectChance: number | null;
  mathDifficulty: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function powerToMathDifficulty(power: number | null): number {
  if (power === null || power === 0) return 1;
  if (power <= 40) return 1;
  if (power <= 60) return 2;
  if (power <= 80) return 3;
  if (power <= 100) return 4;
  if (power <= 120) return 5;
  return 6;
}

export async function fetchMovesData(): Promise<MoveEntry[]> {
  // Step 1: Collect all unique move URLs from Gen 1-2 Pokemon
  const moveUrls = new Set<string>();

  console.log('  Collecting moves from Pokemon...');
  for (let id = 1; id <= TOTAL_POKEMON; id++) {
    const res = await fetch(`${API_BASE}/pokemon/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch pokemon ${id}: ${res.status}`);
    const data = await res.json();

    for (const m of data.moves) {
      moveUrls.add(m.move.url);
    }

    if (id % 50 === 0 || id === TOTAL_POKEMON) {
      console.log(`  Scanned Pokemon: ${id}/${TOTAL_POKEMON} (${moveUrls.size} unique moves found)`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  // Step 2: Fetch each move's details
  const moves: MoveEntry[] = [];
  const urls = [...moveUrls];
  let count = 0;

  console.log(`  Fetching ${urls.length} move details...`);
  for (const url of urls) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch move ${url}: ${res.status}`);
    const data = await res.json();

    moves.push({
      id: data.id,
      name: data.name,
      type: data.type.name,
      power: data.power,
      accuracy: data.accuracy,
      pp: data.pp,
      effectChance: data.effect_chance,
      mathDifficulty: powerToMathDifficulty(data.power),
    });

    count++;
    if (count % 50 === 0 || count === urls.length) {
      console.log(`  Moves: ${count}/${urls.length}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  moves.sort((a, b) => a.id - b.id);
  return moves;
}
