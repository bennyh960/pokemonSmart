/**
 * Service layer for accessing Pokemon data from static JSON files.
 * Provides type-safe access to pokemon, moves, type effectiveness, and evolution chains.
 */

import type { PokemonType, MathDifficulty } from '../types/index.ts';
import { getLocale } from '../i18n/i18n.ts';
import pokemonData from '../data/pokemon.json';
import movesUrl from '../data/moves.json?url';
import typeChartData from '../data/type-chart.json';
import evolutionData from '../data/evolution-chains.json';
import encounterData from '../data/encounter-tables.json';
import learnsetUrl from '../data/learnsets.json?url';
import tmLearnsetUrl from '../data/tm-learnsets.json?url';
import abilitiesData from '../data/abilities.json';
import pokemonAbilitiesData from '../data/pokemon-abilities.json';
import naturesData from '../data/natures.json';
import itemsData from '../data/items.json';
import { POKEMON_CATCH_RATES } from '../data/pokemon-catch-rates.js';
import { MOVE_BATTLE_OVERRIDES } from '../data/move-battle-overrides.js';
import { ABILITY_BATTLE_EFFECTS } from '../data/ability-battle-effects.js';
import {
  createDefaultMoveBattleMetadata,
  normalizeMajorStatusId,
  type AbilityBattleEffect,
  type MoveBattleMetadata,
  type MoveBattleTarget,
} from '../types/battle-metadata.js';

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
  height?: number; // in decimeters (from PokeAPI) — TODO: populate via scripts/enrich-pokemon-metadata.ts
  weight?: number; // in hectograms (from PokeAPI) — TODO: populate via scripts/enrich-pokemon-metadata.ts
  category?: string; // e.g. "Seed Pokémon" — English only, TODO: fetch from PokeAPI species
  description?: string; // Pokedex flavor text — English only, TODO: fetch from PokeAPI species
}

interface RawMoveData {
  id: number;
  name: LocalizedName;
  type: string;
  power: number | null;
  accuracy: number | null;
  pp: number;
  effectChance: number | null;
  mathDifficulty: number;
  damageClass: string;
  description: { en: string; he: string };
  battle?: Partial<MoveBattleMetadata>;
}

export interface MoveData extends RawMoveData {
  battle: MoveBattleMetadata;
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

function normalizeMoveBattleMetadata(
  base: Partial<MoveBattleMetadata> | undefined,
  override: Partial<MoveBattleMetadata> | undefined,
): MoveBattleMetadata {
  const merged = {
    ...createDefaultMoveBattleMetadata(),
    ...base,
    ...override,
    ailment: override?.ailment ?? base?.ailment ?? null,
    statChanges: [...(override?.statChanges ?? base?.statChanges ?? [])],
    chargeStatChanges: [...(override?.chargeStatChanges ?? base?.chargeStatChanges ?? [])],
    effects: [...(override?.effects ?? base?.effects ?? [])],
    sideEffects: [...(override?.sideEffects ?? base?.sideEffects ?? [])],
    flags: [...(override?.flags ?? base?.flags ?? [])],
    behaviorTags: [...(override?.behaviorTags ?? base?.behaviorTags ?? [])],
  };

  if (merged.ailment) {
    const status = normalizeMajorStatusId(merged.ailment.status);
    merged.ailment = status ? { ...merged.ailment, status } : null;
  }

  merged.target = merged.target as MoveBattleTarget;
  return merged;
}

function normalizeMoveData(move: RawMoveData): MoveData {
  return {
    ...move,
    battle: normalizeMoveBattleMetadata(move.battle, MOVE_BATTLE_OVERRIDES[move.name.en]),
  };
}

let allMoves: MoveData[] = [];
const moveById = new Map<number, MoveData>();
const moveByName = new Map<string, MoveData>();

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

// --- Lazy-loaded heavy data (moves, learnsets, tm-learnsets) ---
// These 3 files are ~700 KB combined. They are fetched async during the loading
// screen so they don't inflate the initial JS bundle. Call initHeavyData() once
// at startup (main.ts) before any move/learnset lookups are needed.

let learnsets: Record<string, { moveId: number; levelLearned: number }[]> = {};
let tmLearnsets: Record<string, { moveId: number }[]> = {};

export async function initHeavyData(onProgress?: (fraction: number) => void): Promise<void> {
  let done = 0;
  const step = (): void => { done++; onProgress?.(done / 3); };

  const [movesRaw, learnsetRaw, tmLearnsetRaw] = await Promise.all([
    fetch(movesUrl).then(r => r.json()).then((d: unknown) => { step(); return d; }),
    fetch(learnsetUrl).then(r => r.json()).then((d: unknown) => { step(); return d; }),
    fetch(tmLearnsetUrl).then(r => r.json()).then((d: unknown) => { step(); return d; }),
  ]);

  allMoves = (movesRaw as RawMoveData[]).map(normalizeMoveData);
  for (const m of allMoves) {
    moveById.set(m.id, m);
    moveByName.set(m.name.en.toLowerCase(), m);
  }

  learnsets = learnsetRaw as Record<string, { moveId: number; levelLearned: number }[]>;
  tmLearnsets = tmLearnsetRaw as Record<string, { moveId: number }[]>;
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
  return allMoves;
}

export function getMoveBattleData(id: number): MoveBattleMetadata | undefined {
  return moveById.get(id)?.battle;
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
  const currentIndex = stages.findIndex((s) => s.id === pokemonId);
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

/** Get the learnset for a Pokemon (moves learned by level-up). */
export function getLearnset(pokemonId: number): { moveId: number; levelLearned: number }[] {
  return learnsets[String(pokemonId)] || [];
}

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

/** Get Pokemon weight in kg as a number (data is in hectograms). Returns 0 if missing. */
export function getPokemonWeightKg(id: number): number {
  const data = pokemonById.get(id);
  return data?.weight ? data.weight / 10 : 0;
}

/** Get Pokemon weight in kg (data is in hectograms). Returns just the number string, or '?' if missing. */
export function getPokemonWeight(id: number): string {
  const data = pokemonById.get(id);
  if (!data?.weight) return '?';
  return (data.weight / 10).toFixed(1);
}

/**
 * Compute the current dynamic weight and height for a Pokemon instance.
 *
 * Growth model:
 *  - startW = baseW × (1 + wPercent/100)         — weight at level 0
 *  - maxW   = baseW × (1.5 + wPercent/100)        — absolute ceiling
 *  - For Pokemon with a level-up evolution:
 *      target = nextEvoBaseW × (1 + wPercent/100)
 *      rate   = (target - startW) / evoLevel
 *  - For final/no-evo Pokemon:
 *      target = maxW,  horizon = 50 levels
 *  - currentW = clamp(startW + rate × level, startW, maxW)
 *
 * wPercent/hPercent default to 0 if absent (legacy saves behave as base stats).
 */
export function computePokemonSize(pokemon: {
  id: number;
  level: number;
  wPercent?: number;
  hPercent?: number;
}): { weightKg: number; heightM: number } {
  const species = pokemonById.get(pokemon.id);
  if (!species?.weight || !species?.height) return { weightKg: 0, heightM: 0 };

  const wPct = pokemon.wPercent ?? 0;
  const hPct = pokemon.hPercent ?? 0;

  const baseW = species.weight / 10;
  const baseH = species.height / 10;

  const startW = baseW * (1 + wPct / 100);
  const startH = baseH * (1 + hPct / 100);
  const maxW = baseW * (1.5 + wPct / 100);
  const maxH = baseH * (1.5 + hPct / 100);

  const nextEvo = getNextEvolution(pokemon.id);
  let targetW: number, targetH: number, horizon: number;

  if (nextEvo?.trigger === 'level-up' && nextEvo.minLevel) {
    const nextSpecies = pokemonById.get(nextEvo.id);
    if (nextSpecies?.weight && nextSpecies?.height) {
      targetW = (nextSpecies.weight / 10) * (1 + wPct / 100);
      targetH = (nextSpecies.height / 10) * (1 + hPct / 100);
      horizon = nextEvo.minLevel;
    } else {
      targetW = maxW;
      targetH = maxH;
      horizon = 50;
    }
  } else {
    targetW = maxW;
    targetH = maxH;
    horizon = 50;
  }

  const rateW = (targetW - startW) / horizon;
  const rateH = (targetH - startH) / horizon;

  return {
    weightKg: Math.max(0.1, Math.min(maxW, startW + rateW * pokemon.level)),
    heightM: Math.max(0.1, Math.min(maxH, startH + rateH * pokemon.level)),
  };
}

/** Get Pokemon category/species text. */
export function getPokemonCategory(id: number): string {
  return pokemonById.get(id)?.category ?? '';
}

/** Get Pokemon Pokedex description/flavor text. */
export function getPokemonDescription(id: number): string {
  return pokemonById.get(id)?.description ?? '';
}

/** Get the base species catch rate (PokeAPI capture_rate) for a Pokemon. */
export function getPokemonCatchRate(id: number): number {
  return POKEMON_CATCH_RATES[id] ?? 45;
}

// --- Abilities data ---

interface RawAbilityDef {
  name: LocalizedName;
  description: { en: string; he: string };
  generationIntroduced: string;
  battleEffects?: AbilityBattleEffect[];
}

export interface AbilityDef extends RawAbilityDef {
  battleEffects: AbilityBattleEffect[];
}

export interface PokemonAbilityMapping {
  abilities: number[];
  hidden: number | null;
}

export interface PokemonAbilityDetail extends AbilityDef {
  id: number;
  isHidden: boolean;
}

function normalizeAbilityBattleEffects(effects: AbilityBattleEffect[] | undefined): AbilityBattleEffect[] {
  const normalized: AbilityBattleEffect[] = [];
  for (const effect of effects ?? []) {
    if (effect.kind === 'statusImmunity') {
      const statuses = effect.statuses
        .map((status) => normalizeMajorStatusId(status))
        .filter((status): status is NonNullable<typeof status> => status !== null);
      if (statuses.length > 0) {
        normalized.push({ ...effect, statuses });
      }
      continue;
    }

    if (effect.kind === 'contactStatusChance') {
      const status = normalizeMajorStatusId(effect.status);
      if (status) {
        normalized.push({ ...effect, status });
      }
      continue;
    }

    normalized.push(effect);
  }
  return normalized;
}

function normalizeAbilityDef(ability: RawAbilityDef): AbilityDef {
  return {
    ...ability,
    battleEffects: normalizeAbilityBattleEffects(ABILITY_BATTLE_EFFECTS[ability.name.en] ?? ability.battleEffects),
  };
}

const abilities = Object.fromEntries(
  Object.entries(abilitiesData as Record<string, RawAbilityDef>).map(([id, ability]) => [
    id,
    normalizeAbilityDef(ability),
  ]),
) as Record<string, AbilityDef>;
const pokemonAbilities = pokemonAbilitiesData as Record<string, PokemonAbilityMapping>;

/** Get ability definition by PokeAPI ability ID. */
export function getAbility(id: number): AbilityDef | undefined {
  return abilities[String(id)];
}

export function getAbilityBattleEffects(id: number): AbilityBattleEffect[] {
  return abilities[String(id)]?.battleEffects ?? [];
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

/** Pick a random ability for a Pokemon, including its hidden ability if any. */
export function getRandomAbility(pokemonId: number): number | null {
  const mapping = pokemonAbilities[String(pokemonId)];
  if (!mapping || mapping.abilities.length === 0) return null;
  const pool = [...mapping.abilities];
  if (mapping.hidden !== null) pool.push(mapping.hidden);
  return pool[Math.floor(Math.random() * pool.length)];
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

const items = itemsData as unknown as Record<string, ItemData>;

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

/** Returns the level at which a Pokemon naturally learns a move, or null if it doesn't. */
export function getLearnLevelForMove(pokemonId: number, moveId: number): number | null {
  const learnset = getLearnset(pokemonId);
  const entry = learnset.find((e) => e.moveId === moveId);
  return entry ? entry.levelLearned : null;
}

/** Returns true if a Pokemon can learn a specific move via TM/HM. */
export function canLearnViaTM(pokemonId: number, moveId: number): boolean {
  return getTmLearnset(pokemonId).some((e) => e.moveId === moveId);
}
