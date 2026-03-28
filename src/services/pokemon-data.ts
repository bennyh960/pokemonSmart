/**
 * Service layer for accessing Pokemon data from static JSON files.
 * Provides type-safe access to pokemon, moves, type effectiveness, and evolution chains.
 */

import type { PokemonType, MathDifficulty } from '../types/index.ts';
import { getLocale } from '../i18n/i18n.ts';
import pokemonData from '../data/pokemon.json';
import movesData from '../data/moves.json';
import typeChartData from '../data/type-chart.json';
import evolutionData from '../data/evolution-chains.json';
import encounterData from '../data/encounter-tables.json';
import learnsetData from '../data/learnsets.json';
import tmLearnsetData from '../data/tm-learnsets.json';
import abilitiesData from '../data/abilities.json';
import pokemonAbilitiesData from '../data/pokemon-abilities.json';
import naturesData from '../data/natures.json';
import itemsData from '../data/items.json';

// --- Types matching the JSON shapes ---

export interface LocalizedName {
  en: string;
  he: string;
}

export interface PokemonData {
  id: number;
  name: LocalizedName;
  types: string[];
  stats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  baseExperience: number;
  height?: number;        // in decimeters (from PokeAPI) — TODO: populate via scripts/enrich-pokemon-metadata.ts
  weight?: number;        // in hectograms (from PokeAPI) — TODO: populate via scripts/enrich-pokemon-metadata.ts
  category?: string;      // e.g. "Seed Pokémon" — English only, TODO: fetch from PokeAPI species
  description?: string;   // Pokedex flavor text — English only, TODO: fetch from PokeAPI species
}

export interface MoveData {
  id: number;
  name: LocalizedName;
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  effectChance: number | null;
  mathDifficulty: number;
  damageClass: string;
  description: string;
}

export interface TypeChartData {
  types: string[];
  effectiveness: Record<string, Record<string, number>>;
}

export interface EvolutionStep {
  id: number;
  name: LocalizedName;
  minLevel: number | null;
  trigger: string | null;
  item: string | null;
}

export interface EvolutionChainData {
  chainId: number;
  stages: EvolutionStep[];
}

// --- Encounter types ---

interface EncounterEntry {
  pokemonId: number;
  minLevel: number;
  maxLevel: number;
  weight: number;
}

interface EncounterTable {
  encounterRate: number;
  entries: EncounterEntry[];
}

export interface SpawnLocation {
  mapId: string;
  minLevel: number;
  maxLevel: number;
}

// --- Indexed lookups ---

const pokemonById = new Map<number, PokemonData>();
const pokemonByName = new Map<string, PokemonData>();
for (const p of pokemonData as unknown as PokemonData[]) {
  pokemonById.set(p.id, p);
  pokemonByName.set(p.name.en.toLowerCase(), p);
}

const moveById = new Map<number, MoveData>();
const moveByName = new Map<string, MoveData>();
for (const m of movesData as unknown as MoveData[]) {
  moveById.set(m.id, m);
  moveByName.set(m.name.en.toLowerCase(), m);
}

const typeChart = typeChartData as TypeChartData;

const evolutionByPokemonId = new Map<number, EvolutionChainData>();
for (const chain of evolutionData as unknown as EvolutionChainData[]) {
  for (const stage of chain.stages) {
    evolutionByPokemonId.set(stage.id, chain);
  }
}

// Build reverse index: pokemonId → spawn locations
const spawnIndex: Record<number, SpawnLocation[]> = {};
const encounters = encounterData as Record<string, EncounterTable>;
for (const [mapId, table] of Object.entries(encounters)) {
  for (const entry of table.entries) {
    if (!spawnIndex[entry.pokemonId]) {
      spawnIndex[entry.pokemonId] = [];
    }
    spawnIndex[entry.pokemonId].push({
      mapId,
      minLevel: entry.minLevel,
      maxLevel: entry.maxLevel,
    });
  }
}

// --- Public API ---

/** Get localized display name for a Pokemon by ID. Uses current locale. */
export function getPokemonDisplayName(id: number): string {
  const data = pokemonById.get(id);
  if (!data) return 'MissingNo';
  return data.name[getLocale()];
}

/** Get localized display name for a move by ID. Uses current locale. */
export function getMoveDisplayName(id: number): string {
  const data = moveById.get(id);
  if (!data) return '???';
  return data.name[getLocale()];
}

/** Resolve a LocalizedName to a string using current locale. */
export function getLocalizedName(name: LocalizedName): string {
  return name[getLocale()];
}

export function getPokemon(id: number): PokemonData | undefined {
  return pokemonById.get(id);
}

export function getPokemonByName(name: string): PokemonData | undefined {
  return pokemonByName.get(name.toLowerCase());
}

export function getAllPokemon(): PokemonData[] {
  return pokemonData as PokemonData[];
}

export function getMove(id: number): MoveData | undefined {
  return moveById.get(id);
}

export function getMoveByName(name: string): MoveData | undefined {
  return moveByName.get(name.toLowerCase());
}

export function getAllMoves(): MoveData[] {
  return movesData as MoveData[];
}

export function getTypeEffectiveness(attackingType: PokemonType, defendingType: PokemonType): number {
  return typeChart.effectiveness[attackingType]?.[defendingType] ?? 1;
}

export function getCombinedTypeEffectiveness(attackingType: PokemonType, defendingTypes: PokemonType[]): number {
  let multiplier = 1;
  for (const defType of defendingTypes) {
    multiplier *= getTypeEffectiveness(attackingType, defType);
  }
  return multiplier;
}

export function getAllTypes(): string[] {
  return typeChart.types;
}

export function getEvolutionChain(pokemonId: number): EvolutionChainData | undefined {
  return evolutionByPokemonId.get(pokemonId);
}

export function getNextEvolution(pokemonId: number): EvolutionStep | undefined {
  const chain = evolutionByPokemonId.get(pokemonId);
  if (!chain) return undefined;

  const stages = chain.stages;
  const currentIndex = stages.findIndex(s => s.id === pokemonId);
  if (currentIndex === -1 || currentIndex >= stages.length - 1) return undefined;

  return stages[currentIndex + 1];
}

export function movePowerToMathDifficulty(power: number | null): MathDifficulty {
  if (power === null || power === 0) return 1;
  if (power <= 40) return 1;
  if (power <= 60) return 2;
  if (power <= 80) return 3;
  if (power <= 100) return 4;
  if (power <= 120) return 5;
  return 6;
}

/** Get locations where a Pokemon can be encountered. */
export function getSpawnLocations(pokemonId: number): SpawnLocation[] {
  return spawnIndex[pokemonId] || [];
}

// --- Learnset data ---

const learnsets = learnsetData as Record<string, { moveId: number; levelLearned: number }[]>;

/** Get the learnset for a Pokemon (moves learned by level-up). */
export function getLearnset(pokemonId: number): { moveId: number; levelLearned: number }[] {
  return learnsets[String(pokemonId)] || [];
}

const tmLearnsets = tmLearnsetData as Record<string, { moveId: number }[]>;

/** Get the TM/HM learnable moves for a Pokemon. */
export function getTmLearnset(pokemonId: number): { moveId: number }[] {
  return tmLearnsets[String(pokemonId)] || [];
}

// --- Pokemon metadata helpers ---

/** Get Pokemon height in meters (data is in decimeters). Returns just the number string, or '?' if missing. */
export function getPokemonHeight(id: number): string {
  const data = pokemonById.get(id);
  if (!data?.height) return '?';
  return (data.height / 10).toFixed(1);
}

/** Get Pokemon weight in kg (data is in hectograms). Returns just the number string, or '?' if missing. */
export function getPokemonWeight(id: number): string {
  const data = pokemonById.get(id);
  if (!data?.weight) return '?';
  return (data.weight / 10).toFixed(1);
}

/** Get Pokemon category/species text. */
export function getPokemonCategory(id: number): string {
  return pokemonById.get(id)?.category ?? '';
}

/** Get Pokemon Pokedex description/flavor text. */
export function getPokemonDescription(id: number): string {
  return pokemonById.get(id)?.description ?? '';
}

// --- Abilities data ---

export interface AbilityDef {
  name: LocalizedName;
  description: string;
  generationIntroduced: string;
}

export interface PokemonAbilityMapping {
  abilities: number[];
  hidden: number | null;
}

export interface PokemonAbilityDetail extends AbilityDef {
  id: number;
  isHidden: boolean;
}

const abilities = abilitiesData as Record<string, AbilityDef>;
const pokemonAbilities = pokemonAbilitiesData as Record<string, PokemonAbilityMapping>;

/** Get ability definition by PokeAPI ability ID. */
export function getAbility(id: number): AbilityDef | undefined {
  return abilities[String(id)];
}

/** Get localized ability name. */
export function getAbilityDisplayName(id: number): string {
  const a = abilities[String(id)];
  if (!a) return '???';
  return a.name[getLocale()];
}

/** Get the ability mapping for a Pokemon (regular + hidden abilities). */
export function getPokemonAbilities(pokemonId: number): PokemonAbilityMapping | undefined {
  return pokemonAbilities[String(pokemonId)];
}

/** Get all defined abilities for a Pokemon, including hidden ability when present. */
export function getPokemonAbilityDetails(pokemonId: number): PokemonAbilityDetail[] {
  const mapping = pokemonAbilities[String(pokemonId)];
  if (!mapping) return [];

  const abilityIds = [...mapping.abilities];
  if (mapping.hidden !== null && !abilityIds.includes(mapping.hidden)) {
    abilityIds.push(mapping.hidden);
  }

  return abilityIds
    .map((id) => {
      const ability = abilities[String(id)];
      if (!ability) return undefined;
      return {
        id,
        isHidden: mapping.hidden === id,
        ...ability,
      };
    })
    .filter((ability): ability is PokemonAbilityDetail => ability !== undefined);
}

/** Pick a random non-hidden ability for a Pokemon. */
export function getRandomAbility(pokemonId: number): number | null {
  const mapping = pokemonAbilities[String(pokemonId)];
  if (!mapping || mapping.abilities.length === 0) return null;
  return mapping.abilities[Math.floor(Math.random() * mapping.abilities.length)];
}

// --- Natures data ---

export interface NatureDef {
  name: LocalizedName;
  increasedStat: string | null;
  decreasedStat: string | null;
}

const natures = naturesData as Record<string, NatureDef>;

/** Total number of natures (always 25). */
const TOTAL_NATURES = 25;

/** Get nature definition by ID (1-25). */
export function getNature(id: number): NatureDef | undefined {
  return natures[String(id)];
}

/** Get localized nature name. */
export function getNatureDisplayName(id: number): string {
  const n = natures[String(id)];
  if (!n) return '???';
  return n.name[getLocale()];
}

/** Pick a random nature ID (1-25). */
export function getRandomNatureId(): number {
  return Math.floor(Math.random() * TOTAL_NATURES) + 1;
}

/**
 * Get the nature stat multiplier for a given stat.
 * Returns 1.1 for boosted, 0.9 for reduced, 1.0 for neutral.
 */
export function getNatureMultiplier(natureId: number, stat: string): number {
  const n = natures[String(natureId)];
  if (!n) return 1;
  if (n.increasedStat === stat) return 1.1;
  if (n.decreasedStat === stat) return 0.9;
  return 1;
}

// --- Items data (from PokeAPI JSON) ---

export interface ItemData {
  name: LocalizedName;
  slug: string;
  description: string;
  category: string;
  sprite: string | null;
  holdable: boolean;
  flingPower: number | null;
}

const items = itemsData as Record<string, ItemData>;

/** Get item data by PokeAPI item ID. */
export function getItemData(id: number): ItemData | undefined {
  return items[String(id)];
}

/** Get localized item name by PokeAPI item ID. */
export function getItemDisplayName(id: number): string {
  const item = items[String(id)];
  if (!item) return '???';
  return item.name[getLocale()];
}

/** Get all item IDs in the data. */
export function getAllItemIds(): number[] {
  return Object.keys(items).map(Number);
}
