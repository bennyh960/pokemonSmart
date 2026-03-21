/**
 * Encounter System - Wild Pokemon encounter tables and generation.
 *
 * Each area has an encounter table mapping Pokemon IDs to level ranges
 * and encounter weights. When the player steps on tall grass, a random
 * Pokemon is selected from the current area's table.
 */

import type { Pokemon, Move, PokemonType, MathDifficulty } from '../types/index.js';
import { getPokemon, getMove, movePowerToMathDifficulty, getPokemonDisplayName } from '../services/pokemon-data.js';
import type { PokemonData, MoveData } from '../services/pokemon-data.js';

/** A single entry in an encounter table. */
interface EncounterEntry {
  pokemonId: number;
  minLevel: number;
  maxLevel: number;
  weight: number; // Higher = more common
}

/** Encounter table for an area. */
interface EncounterTable {
  entries: EncounterEntry[];
}

/** All encounter tables keyed by area/map ID. */
const encounterTables: Record<string, EncounterTable> = {
  'test-map': {
    entries: [
      { pokemonId: 16, minLevel: 2, maxLevel: 5, weight: 30 },   // Pidgey
      { pokemonId: 19, minLevel: 2, maxLevel: 4, weight: 30 },   // Rattata
      { pokemonId: 161, minLevel: 2, maxLevel: 5, weight: 20 },  // Sentret
      { pokemonId: 163, minLevel: 3, maxLevel: 5, weight: 10 },  // Hoothoot
      { pokemonId: 10, minLevel: 2, maxLevel: 4, weight: 10 },   // Caterpie
    ],
  },
  'route-1': {
    entries: [
      { pokemonId: 16, minLevel: 3, maxLevel: 6, weight: 25 },   // Pidgey
      { pokemonId: 19, minLevel: 3, maxLevel: 5, weight: 25 },   // Rattata
      { pokemonId: 161, minLevel: 3, maxLevel: 5, weight: 20 },  // Sentret
      { pokemonId: 10, minLevel: 2, maxLevel: 4, weight: 15 },   // Caterpie
      { pokemonId: 13, minLevel: 2, maxLevel: 4, weight: 15 },   // Weedle
    ],
  },
  'route-29': {
    entries: [
      { pokemonId: 16, minLevel: 3, maxLevel: 6, weight: 25 },   // Pidgey
      { pokemonId: 19, minLevel: 3, maxLevel: 5, weight: 25 },   // Rattata
      { pokemonId: 161, minLevel: 3, maxLevel: 6, weight: 20 },  // Sentret
      { pokemonId: 165, minLevel: 3, maxLevel: 5, weight: 15 },  // Ledyba
      { pokemonId: 167, minLevel: 3, maxLevel: 5, weight: 15 },  // Spinarak
    ],
  },
};

/** Default moves assigned to wild Pokemon by type. */
const defaultMovesByType: Record<string, number[]> = {
  normal:  [33, 98],   // Tackle, Quick Attack
  flying:  [33, 16],   // Tackle, Gust
  bug:     [33, 81],   // Tackle, String Shot
  poison:  [33, 40],   // Tackle, Poison Sting
};

/** Pick a random integer between min and max (inclusive). */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Convert a MoveData from the data service into a game Move. */
function moveDataToMove(md: MoveData): Move {
  return {
    id: md.id,
    name: md.name,
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
    name: getPokemonDisplayName(data.id),
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
