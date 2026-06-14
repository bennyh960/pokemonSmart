/**
 * Fetches evolution chain data for Gen 1-2 Pokemon from PokeAPI.
 * Saves to src/data/evolution-chains.json
 */

const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 100;
const TOTAL_POKEMON = 251;

export interface LocalizedName {
  en: string;
  he: string;
}

export interface EvolutionStep {
  id: number;
  name: LocalizedName;
  minLevel: number | null;
  trigger: string | null;
  item: string | null;
}

export interface EvolutionChain {
  chainId: number;
  stages: EvolutionStep[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractIdFromUrl(url: string): number {
  const parts = url.replace(/\/$/, '').split('/');
  return parseInt(parts[parts.length - 1], 10);
}

function flattenChain(node: any, stages: EvolutionStep[], skipEarlyReturn: boolean = false): void {
  const speciesId = extractIdFromUrl(node.species.url);
  if (speciesId > TOTAL_POKEMON && !skipEarlyReturn) return;

  const detail = node.evolution_details[0];
  const enName = node.species.name.charAt(0).toUpperCase() + node.species.name.slice(1);
  stages.push({
    id: speciesId,
    name: { en: enName, he: enName }, // Hebrew added by add-hebrew-names.ts
    minLevel: detail?.min_level ?? null,
    trigger: detail?.trigger?.name ?? null,
    item: detail?.item?.name ?? null,
  });

  for (const child of node.evolves_to) {
    flattenChain(child, stages, skipEarlyReturn);
  }
}

export async function fetchEvolutionChains(): Promise<EvolutionChain[]> {
  const chainUrls = new Set<string>();

  console.log('  Collecting evolution chain URLs from species...');
  for (let id = 1; id <= TOTAL_POKEMON; id++) {
    const res = await fetch(`${API_BASE}/pokemon-species/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch species ${id}: ${res.status}`);
    const data = await res.json();
    chainUrls.add(data.evolution_chain.url);

    if (id % 50 === 0 || id === TOTAL_POKEMON) {
      console.log(`  Species: ${id}/${TOTAL_POKEMON} (${chainUrls.size} unique chains)`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  const chains: EvolutionChain[] = [];
  const urls = [...chainUrls];
  let count = 0;

  console.log(`  Fetching ${urls.length} evolution chains...`);
  for (const url of urls) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch chain ${url}: ${res.status}`);
    const data = await res.json();

    const stages: EvolutionStep[] = [];
    flattenChain(data.chain, stages);

    if (stages.length > 0) {
      chains.push({ chainId: data.id, stages });
    }

    count++;
    if (count % 25 === 0 || count === urls.length) {
      console.log(`  Chains: ${count}/${urls.length}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  chains.sort((a, b) => a.chainId - b.chainId);
  return chains;
}

export async function fetchEvolutionChainByPokemonId(
  pokemonId: number,
  skipEarlyReturn: boolean = false,
): Promise<EvolutionChain> {
  const res = await fetch(`${API_BASE}/pokemon-species/${pokemonId}`);
  if (!res.ok) throw new Error(`Failed to fetch species ${pokemonId}: ${res.status}`);
  const data = await res.json();
  const chainUrl = data.evolution_chain.url;

  const chainRes = await fetch(chainUrl);
  if (!chainRes.ok) throw new Error(`Failed to fetch evolution chain ${chainUrl}: ${chainRes.status}`);
  const chainData = await chainRes.json();

  const stages: EvolutionStep[] = [];
  flattenChain(chainData.chain, stages, skipEarlyReturn);

  return { chainId: chainData.id, stages };
}
