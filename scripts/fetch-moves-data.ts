/**
 * Fetches moves data for Gen 1-2 Pokemon from PokeAPI.
 * Saves to src/data/moves.json
 *
 * NOTE: After fetching, run `npx tsx scripts/add-hebrew-move-names.ts`
 * to add Hebrew translations (PokeAPI only provides English names).
 */

const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 100;
const TOTAL_POKEMON = 251;

export interface LocalizedName {
  en: string;
  he: string;
}

export interface MoveEntry {
  id: number;
  name: LocalizedName;
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  effectChance: number | null;
  damageClass: string; // "physical" | "special" | "status"
  description: string; // English flavor text
  battle: {
    priority: number;
    target: string;
    ailment: {
      status: string;
      chance: number;
      target: 'user' | 'target';
      minTurns?: number | null;
      maxTurns?: number | null;
    } | null;
    statChanges: Array<{
      stat: string;
      stages: number;
      target: 'user' | 'target';
      chance: number;
    }>;
    critRate: number;
    flinchChance: number | null;
    drainPercent: number | null;
    healingPercent: number | null;
    minHits: number | null;
    maxHits: number | null;
    minTurns: number | null;
    maxTurns: number | null;
    category: string | null;
    flags: string[];
    behaviorTags: string[];
  };
}

function normalizeStatus(status: string | null | undefined): string | null {
  switch (status) {
    case 'poison':
    case 'burn':
    case 'sleep':
    case 'freeze':
      return status;
    case 'paralysis':
    case 'paralyze':
      return 'paralyze';
    default:
      return null;
  }
}

function inferChangeTarget(target: string | undefined): 'user' | 'target' {
  return target === 'user' || target === 'user-or-ally' ? 'user' : 'target';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

    const enName = data.name
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    // Extract damage class
    const damageClass: string = data.damage_class?.name ?? 'status';

    // Extract English flavor text, preferring gold-silver version group
    const flavorEntries = data.flavor_text_entries ?? [];
    const englishEntries = flavorEntries.filter((e: any) => e.language.name === 'en');
    const gsEntry = englishEntries.find((e: any) => e.version_group.name === 'gold-silver');
    const flavorText = (gsEntry ?? englishEntries[0])?.flavor_text?.replace(/\n/g, ' ') ?? '';
    const ailmentStatus = normalizeStatus(data.meta?.ailment?.name);
    const ailment = ailmentStatus
      ? {
          status: ailmentStatus,
          chance: data.meta?.ailment_chance ?? data.effect_chance ?? 100,
          target: inferChangeTarget(data.target?.name),
          minTurns: data.meta?.min_turns ?? null,
          maxTurns: data.meta?.max_turns ?? null,
        }
      : null;
    const changeTarget = inferChangeTarget(data.target?.name);

    moves.push({
      id: data.id,
      name: { en: enName, he: enName }, // Hebrew added by add-hebrew-move-names.ts
      type: data.type.name,
      power: data.power,
      accuracy: data.accuracy,
      pp: data.pp,
      effectChance: data.effect_chance,
      damageClass,
      description: flavorText,
      battle: {
        priority: data.priority ?? 0,
        target: data.target?.name ?? 'selected-pokemon',
        ailment,
        statChanges: (data.stat_changes ?? []).map((change: any) => ({
          stat: change.stat?.name ?? '',
          stages: change.change ?? 0,
          target: changeTarget,
          chance: data.effect_chance ?? 100,
        })),
        critRate: data.meta?.crit_rate ?? 0,
        flinchChance: data.meta?.flinch_chance ?? null,
        drainPercent: data.meta?.drain ?? null,
        healingPercent: data.meta?.healing ?? null,
        minHits: data.meta?.min_hits ?? null,
        maxHits: data.meta?.max_hits ?? null,
        minTurns: data.meta?.min_turns ?? null,
        maxTurns: data.meta?.max_turns ?? null,
        category: data.meta?.category?.name ?? null,
        flags: (data.flags ?? []).map((flag: any) => flag.name),
        behaviorTags: [],
      },
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
