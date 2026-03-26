/**
 * Encounter System - Wild Pokemon encounter tables and generation.
 *
 * Encounter tables are loaded from src/data/encounter-tables.json.
 * Each area has entries mapping Pokemon IDs to level ranges and spawn weights.
 * When the player steps on an encounter tile, a random Pokemon is selected
 * from the current area's table.
 */

import type { Pokemon, Move, PokemonType, MathDifficulty } from '../types/index.js';
import { getPokemon, getMove, getLearnset, movePowerToMathDifficulty, getRandomAbility, getRandomNatureId, getNatureMultiplier } from '../services/pokemon-data.js';
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

/** Calculate a stat value based on base stat, level, and nature multiplier. */
function calcStat(baseStat: number, level: number, isHp: boolean, natureMultiplier = 1): number {
  if (isHp) {
    return Math.floor(((2 * baseStat) * level) / 100) + level + 10;
  }
  return Math.floor((Math.floor(((2 * baseStat) * level) / 100) + 5) * natureMultiplier);
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
  // Assign random ability and nature
  const abilityId = getRandomAbility(data.id);
  const natureId = getRandomNatureId();

  const hp = calcStat(data.stats.hp, level, true);

  // Build move list
  const moves: Move[] = [];
  if (moveIds) {
    // Explicit moves provided (e.g. trainer Pokemon) — use them directly
    for (const id of moveIds) {
      const md = getMove(id);
      if (md) moves.push(moveDataToMove(md));
    }
  }

  // If no explicit moves, derive from learnset
  if (moves.length === 0) {
    const learnset = getLearnset(data.id);
    const eligible = learnset.filter(entry => entry.levelLearned <= level);
    // Take the last 4 moves (most recently learned by level) for wild/NPC Pokemon
    const selected = eligible.slice(-4);
    for (const entry of selected) {
      const md = getMove(entry.moveId);
      if (md) moves.push(moveDataToMove(md));
    }
  }

  // Fallback: use defaults based on primary type if learnset yielded nothing
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
    attack: calcStat(data.stats.attack, level, false, getNatureMultiplier(natureId, 'attack')),
    defense: calcStat(data.stats.defense, level, false, getNatureMultiplier(natureId, 'defense')),
    specialAttack: calcStat(data.stats.specialAttack, level, false, getNatureMultiplier(natureId, 'specialAttack')),
    specialDefense: calcStat(data.stats.specialDefense, level, false, getNatureMultiplier(natureId, 'specialDefense')),
    speed: calcStat(data.stats.speed, level, false, getNatureMultiplier(natureId, 'speed')),
    types: data.types as PokemonType[],
    moves,
    xp: 0,
    xpToNext: level * 100,
    isGlitched: false,
    abilityId,
    natureId,
    heldItemId: null,
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

/** Result of a level-up check. */
export interface LevelUpResult {
  leveledUp: boolean;
  newLevel?: number;
  newMoves?: number[];  // moveIds of newly learned moves
}

/** Check if a Pokemon should level up, and apply level-up if so. */
export function checkAndApplyLevelUp(pokemon: Pokemon): LevelUpResult {
  if (pokemon.xp < pokemon.xpToNext) return { leveledUp: false };

  pokemon.xp -= pokemon.xpToNext;
  pokemon.level++;
  pokemon.xpToNext = pokemon.level * 100;

  // Recalculate stats based on base data + nature
  const data = getPokemon(pokemon.id);
  if (data) {
    const nId = pokemon.natureId ?? 1;
    const oldMaxHp = pokemon.maxHp;
    pokemon.maxHp = calcStat(data.stats.hp, pokemon.level, true);
    pokemon.hp += pokemon.maxHp - oldMaxHp; // Heal by the HP gained
    pokemon.attack = calcStat(data.stats.attack, pokemon.level, false, getNatureMultiplier(nId, 'attack'));
    pokemon.defense = calcStat(data.stats.defense, pokemon.level, false, getNatureMultiplier(nId, 'defense'));
    pokemon.specialAttack = calcStat(data.stats.specialAttack, pokemon.level, false, getNatureMultiplier(nId, 'specialAttack'));
    pokemon.specialDefense = calcStat(data.stats.specialDefense, pokemon.level, false, getNatureMultiplier(nId, 'specialDefense'));
    pokemon.speed = calcStat(data.stats.speed, pokemon.level, false, getNatureMultiplier(nId, 'speed'));
  }

  // Check learnset for new moves at this level
  const newMoves: number[] = [];
  const learnset = getLearnset(pokemon.id);
  const movesAtLevel = learnset.filter(entry => entry.levelLearned === pokemon.level);

  for (const entry of movesAtLevel) {
    // Skip if already knows this move
    if (pokemon.moves.some(m => m.id === entry.moveId)) continue;

    if (pokemon.moves.length < 8) {
      const md = getMove(entry.moveId);
      if (md) {
        pokemon.moves.push(moveDataToMove(md));
        newMoves.push(entry.moveId);
      }
    }
    // If moves.length >= 8, move goes unlearned for now (TODO: prompt player to forget a move)
  }

  console.log(`${pokemon.name} grew to level ${pokemon.level}!`);
  if (newMoves.length > 0) {
    console.log(`Learned move(s): ${newMoves.join(', ')}`);
  }

  return { leveledUp: true, newLevel: pokemon.level, newMoves };
}
