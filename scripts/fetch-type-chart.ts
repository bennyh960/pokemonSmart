/**
 * Fetches type effectiveness chart from PokeAPI.
 * Adds a custom "glitch" type.
 * Saves to src/data/type-chart.json
 */

const API_BASE = 'https://pokeapi.co/api/v2';
const RATE_LIMIT_MS = 100;

const GEN2_TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel',
];

export interface TypeChart {
  types: string[];
  effectiveness: Record<string, Record<string, number>>;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchTypeChart(): Promise<TypeChart> {
  const effectiveness: Record<string, Record<string, number>> = {};

  for (const typeName of GEN2_TYPES) {
    const res = await fetch(`${API_BASE}/type/${typeName}`);
    if (!res.ok) throw new Error(`Failed to fetch type ${typeName}: ${res.status}`);
    const data = await res.json();

    const relations: Record<string, number> = {};
    for (const t of GEN2_TYPES) {
      relations[t] = 1;
    }

    for (const t of data.damage_relations.double_damage_to) {
      if (GEN2_TYPES.includes(t.name)) relations[t.name] = 2;
    }
    for (const t of data.damage_relations.half_damage_to) {
      if (GEN2_TYPES.includes(t.name)) relations[t.name] = 0.5;
    }
    for (const t of data.damage_relations.no_damage_to) {
      if (GEN2_TYPES.includes(t.name)) relations[t.name] = 0;
    }

    relations['glitch'] = 0.5;
    effectiveness[typeName] = relations;
    console.log(`  Type: ${typeName}`);
    await sleep(RATE_LIMIT_MS);
  }

  // Glitch type
  const glitchRelations: Record<string, number> = {};
  for (const t of GEN2_TYPES) {
    glitchRelations[t] = 1;
  }
  glitchRelations['psychic'] = 2;
  glitchRelations['normal'] = 2;
  glitchRelations['dark'] = 0.5;
  glitchRelations['steel'] = 0.5;
  glitchRelations['glitch'] = 1;
  effectiveness['glitch'] = glitchRelations;

  return {
    types: [...GEN2_TYPES, 'glitch'],
    effectiveness,
  };
}
