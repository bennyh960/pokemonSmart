/**
 * Encounter System - Wild Pokemon encounter tables and generation.
 *
 * Encounter tables are loaded from src/data/encounter-tables.json.
 * Each area has entries mapping Pokemon IDs to level ranges and spawn weights.
 * When the player steps on an encounter tile, a random Pokemon is selected
 * from the current area's table.
 */

import type { Pokemon, Move, PokemonType, MathDifficulty } from '../types/index.js';
import { getPokemon, getMove, movePowerToMathDifficulty } from '../services/pokemon-data.js';
import type { PokemonData, MoveData } from '../services/pokemon-data.js';
import encounterTablesJson from '../data/encounter-tables.json';

/** A single entry in an encounter table. */
export interface EncounterEntry {
  pokemonId: number;
  minLevel: number;
  maxLevel: number;
  weight: number; // Higher = more common
}

/** Encounter table for an area. */
export interface EncounterTable {
  encounterRate: number; // 0-1, chance per step on encounter tile
  entries: EncounterEntry[];
}

const DEFAULT_ENCOUNTER_RATE = 0.10;

/** All encounter tables keyed by area/map ID, loaded from JSON. */
const encounterTables: Record<string, EncounterTable> = encounterTablesJson as Record<string, EncounterTable>;

/** Get the encounter rate for a given map. */
export function getEncounterRate(mapId: string): number {
  const table = encounterTables[mapId];
  if (table?.encounterRate != null) return table.encounterRate;
  return DEFAULT_ENCOUNTER_RATE;
}

/** Pick a random integer between min and max (inclusive). */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Convert a MoveData from the data service into a game Move. */
function moveDataToMove(md: MoveData): Move {
  return {
    id: md.id,
    name: md.name.en,
    type: md.type as PokemonType,
    power: md.power ?? 0,
    accuracy: md.accuracy ?? 100,
    pp: md.pp,
    currentPp: md.pp,
    mathDifficulty: movePowerToMathDifficulty(md.power) as MathDifficulty,
  };
}

/** Calculate a stat value based on base stat and level (simplified formula). */
function calcStat(baseStat: number, level: number, isHp: boolean): number {
  if (isHp) {
    return Math.floor(((2 * baseStat) * level) / 100) + level + 10;
  }
  return Math.floor(((2 * baseStat) * level) / 100) + 5;
}

/** Default moves assigned to wild Pokemon by type (fallback only). */
const defaultMovesByType: Record<string, number[]> = {
  normal:  [33, 98],   // Tackle, Quick Attack
  flying:  [33, 16],   // Tackle, Gust
  bug:     [33, 81],   // Tackle, String Shot
  poison:  [33, 40],   // Tackle, Poison Sting
};

/** Create a Pokemon instance from base data at a given level. */
export function createPokemonFromData(data: PokemonData, level: number, moveIds?: number[]): Pokemon {
  const hp = calcStat(data.stats.hp, level, true);

  // Build move list
  const moves: Move[] = [];
  if (moveIds) {
    for (const id of moveIds) {
      const md = getMove(id);
      if (md) moves.push(moveDataToMove(md));
    }
  }

  // If no moves provided, use defaults based on primary type
  if (moves.length === 0) {
    const primaryType = data.types[0] || 'normal';
    const ids = defaultMovesByType[primaryType] || defaultMovesByType['normal'];
    for (const id of ids) {
      const md = getMove(id);
      if (md) moves.push(moveDataToMove(md));
    }
  }

  // Always ensure at least Tackle
  if (moves.length === 0) {
    const tackle = getMove(33);
    if (tackle) moves.push(moveDataToMove(tackle));
  }

  return {
    id: data.id,
    name: data.name.en,
    level,
    hp,
    maxHp: hp,
    attack: calcStat(data.stats.attack, level, false),
    defense: calcStat(data.stats.defense, level, false),
    specialAttack: calcStat(data.stats.specialAttack, level, false),
    specialDefense: calcStat(data.stats.specialDefense, level, false),
    speed: calcStat(data.stats.speed, level, false),
    types: data.types as PokemonType[],
    moves,
    xp: 0,
    xpToNext: level * 100,
    isGlitched: false,
    caughtBall: 'poke-ball',
  };
}

/** Generate a random wild Pokemon for the given map area. */
export function generateWildEncounter(mapId: string): Pokemon | null {
  const table = encounterTables[mapId];
  if (!table || table.entries.length === 0) {
    // Fallback: use test-map table
    const fallback = encounterTables['test-map'];
    if (!fallback) return null;
    return rollEncounter(fallback);
  }
  return rollEncounter(table);
}

/** Roll a Pokemon from the encounter table using weighted random. */
function rollEncounter(table: EncounterTable): Pokemon | null {
  const totalWeight = table.entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of table.entries) {
    roll -= entry.weight;
    if (roll <= 0) {
      const data = getPokemon(entry.pokemonId);
      if (!data) return null;
      const level = randInt(entry.minLevel, entry.maxLevel);
      return createPokemonFromData(data, level);
    }
  }

  return null;
}

/** Calculate XP gained from defeating a wild Pokemon. */
export function calculateXpGain(defeatedPokemon: Pokemon): number {
  const data = getPokemon(defeatedPokemon.id);
  const baseExp = data?.baseExperience ?? 50;
  // Simplified XP formula: (baseExp * level) / 7
  return Math.floor((baseExp * defeatedPokemon.level) / 7);
}

/** Check if a Pokemon should level up, and apply level-up if so. Returns true if leveled. */
export function checkAndApplyLevelUp(pokemon: Pokemon): boolean {
  if (pokemon.xp < pokemon.xpToNext) return false;

  pokemon.xp -= pokemon.xpToNext;
  pokemon.level++;
  pokemon.xpToNext = pokemon.level * 100;

  // Recalculate stats based on base data
  const data = getPokemon(pokemon.id);
  if (data) {
    const oldMaxHp = pokemon.maxHp;
    pokemon.maxHp = calcStat(data.stats.hp, pokemon.level, true);
    pokemon.hp += pokemon.maxHp - oldMaxHp; // Heal by the HP gained
    pokemon.attack = calcStat(data.stats.attack, pokemon.level, false);
    pokemon.defense = calcStat(data.stats.defense, pokemon.level, false);
    pokemon.specialAttack = calcStat(data.stats.specialAttack, pokemon.level, false);
    pokemon.specialDefense = calcStat(data.stats.specialDefense, pokemon.level, false);
    pokemon.speed = calcStat(data.stats.speed, pokemon.level, false);
  }

  // TODO: Move learning placeholder
  console.log(`${pokemon.name} grew to level ${pokemon.level}!`);

  return true;
}
