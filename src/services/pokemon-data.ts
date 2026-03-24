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
