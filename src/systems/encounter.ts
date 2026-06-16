/**
 * Encounter System - Wild Pokemon encounter tables and generation.
 *
 * Encounter tables are loaded from src/data/encounter-tables.json.
 * Each area has entries mapping Pokemon IDs to level ranges and spawn weights.
 * When the player steps on an encounter tile, a random Pokemon is selected
 * from the current area's table.
 */

import type { Move, Pokemon, PokemonType } from '../types/index.js';
import {
  getPokemon,
  getPokemonCatchRate,
  getLearnset,
  getRandomAbility,
  getRandomNatureId,
  getNatureMultiplier,
  getRegularNextEvolution,
  getAllNextEvolutions,
  getPokemonAbilities,
} from '../services/pokemon-data.js';
import type { PokemonData, EvolutionStep } from '../services/pokemon-data.js';
import { calcHappiness, HAPPINESS_EVOLUTION_THRESHOLD } from './happiness.js';
import { isDaytime } from './weather-system.js';
import encounterTablesJson from '../data/encounter-tables.json';
import { createMoveFromId, MAX_POKEMON_MOVES, type LevelUpMoveResult } from './move-learning.js';

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

const DEFAULT_ENCOUNTER_RATE = 0.005;
const TRAINER_XP_MULTIPLIER = 1.5;
const MAX_CATCH_RATE = 255;
const MAX_RARITY_XP_BONUS = 0.15;

function getSteppedCatchRate(catchRate: number): number {
  const normalizedRate = Math.max(1, Math.min(MAX_CATCH_RATE, catchRate));
  if (normalizedRate <= 50) return 20;
  if (normalizedRate <= 100) return 25;
  if (normalizedRate <= 150) return 30;
  if (normalizedRate <= 200) return 35;
  if (normalizedRate < MAX_CATCH_RATE) return 45;
  return MAX_CATCH_RATE;
}

function getRarityXpMultiplier(pokemonId: number): number {
  const steppedCatchRate = getSteppedCatchRate(getPokemonCatchRate(pokemonId));
  const rarityRatio = (MAX_CATCH_RATE - steppedCatchRate) / MAX_CATCH_RATE;
  return 1 + rarityRatio * MAX_RARITY_XP_BONUS;
}

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

/** Calculate a stat value based on base stat, level, and nature multiplier. */
export function calcStat(baseStat: number, level: number, isHp: boolean, natureMultiplier = 1, ev = 0): number {
  if (isHp) {
    return Math.floor(((2 * baseStat + ev) * level) / 100) + level + 10;
  }
  return Math.floor((Math.floor(((2 * baseStat + ev) * level) / 100) + 5) * natureMultiplier);
}

/** Recalculate all battle stats for a Pokemon using its current level, nature, and EVs. */
export function recalcPokemonStats(pokemon: Pokemon): void {
  const data = getPokemon(pokemon.id);
  if (!data) return;
  const nId = pokemon.natureId ?? 1;
  const evs = pokemon.evs ?? { hp: 0, atk: 0, def: 0, spe: 0, spa: 0, spd: 0 };
  const oldMaxHp = pokemon.maxHp;
  pokemon.maxHp = calcStat(data.stats.hp, pokemon.level, true, 1, evs.hp);
  pokemon.hp = Math.min(pokemon.hp + (pokemon.maxHp - oldMaxHp), pokemon.maxHp);
  pokemon.attack = calcStat(data.stats.attack, pokemon.level, false, getNatureMultiplier(nId, 'attack'), evs.atk);
  pokemon.defense = calcStat(data.stats.defense, pokemon.level, false, getNatureMultiplier(nId, 'defense'), evs.def);
  pokemon.specialAttack = calcStat(
    data.stats.specialAttack,
    pokemon.level,
    false,
    getNatureMultiplier(nId, 'specialAttack'),
    evs.spa,
  );
  pokemon.specialDefense = calcStat(
    data.stats.specialDefense,
    pokemon.level,
    false,
    getNatureMultiplier(nId, 'specialDefense'),
    evs.spd,
  );
  pokemon.speed = calcStat(data.stats.speed, pokemon.level, false, getNatureMultiplier(nId, 'speed'), evs.spe);
}

/** Default moves assigned to wild Pokemon by type (fallback only). */
const defaultMovesByType: Record<string, number[]> = {
  normal: [33, 98], // Tackle, Quick Attack
  flying: [33, 16], // Tackle, Gust
  bug: [33, 81], // Tackle, String Shot
  poison: [33, 40], // Tackle, Poison Sting
};

/** Box-Muller normal distribution sample (mean=0, sd=1). */
function gaussianRandom(): number {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Random size genetics offset in % — normal dist, std≈3.33 → 99.7% within ±10%. */
function randomSizePercent(): number {
  return Math.max(-10, Math.min(10, gaussianRandom() * 3.33));
}

/** Create a Pokemon instance from base data at a given level. */
export function createPokemonFromData(
  data: PokemonData,
  level: number,
  moveIds?: number[],
  heldItemId?: string,
): Pokemon {
  // Assign random ability and nature
  const abilityId = getRandomAbility(data.id);
  const natureId = getRandomNatureId();

  const hp = calcStat(data.stats.hp, level, true);

  // Build move list — learnset base + optional custom overrides
  const moves: Move[] = [];

  // Always compute learnset moves first
  const learnset = getLearnset(data.id);
  const eligible = learnset.filter((entry) => entry.levelLearned <= level);
  const learnsetEntries = eligible.slice(-8); // up to 8 most recent
  const learnsetMoves: Move[] = [];
  for (const entry of learnsetEntries) {
    const move = createMoveFromId(entry.moveId);
    if (move) learnsetMoves.push(move);
  }

  if (!moveIds || moveIds.length === 0) {
    // No custom moves: use full learnset
    moves.push(...learnsetMoves);
  } else {
    // Custom moves are appended at the end (newest slot).
    // Learnset fills remaining slots from the front, up to 8 total.
    // Custom moves with 8 entries → exact custom set (backward-compatible for starters/bosses).
    const customMoves: Move[] = [];
    const customIds = new Set(moveIds);
    for (const id of moveIds) {
      const move = createMoveFromId(id);
      if (move) customMoves.push(move);
    }
    const learnsetSlots = Math.max(0, 8 - customMoves.length);
    const filteredLearnset = learnsetMoves.filter((m) => !customIds.has(m.id));
    moves.push(...filteredLearnset.slice(-learnsetSlots), ...customMoves);
  }

  // Fallback: use defaults based on primary type if learnset yielded nothing
  if (moves.length === 0) {
    const primaryType = data.types[0] || 'normal';
    const ids = defaultMovesByType[primaryType] || defaultMovesByType['normal'];
    for (const id of ids) {
      const move = createMoveFromId(id);
      if (move) moves.push(move);
    }
  }

  // Always ensure at least Tackle
  if (moves.length === 0) {
    const tackle = createMoveFromId(33);
    if (tackle) moves.push(tackle);
  }

  return {
    uuid: crypto.randomUUID(),
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
    xpToNext: getXpToNextLevel(level),
    isGlitched: false,
    abilityId,
    natureId,
    heldItemId: heldItemId ?? null,
    status: null,
    caughtBall: 'poke-ball',
    evs: { hp: 0, atk: 0, def: 0, spe: 0, spa: 0, spd: 0 },
    wPercent: randomSizePercent(),
    hPercent: randomSizePercent(),
  };
}

/**
 * Generate a random wild Pokemon for the given map area.
 * @param mapId - encounter table ID (map id or explicit encounterTableId)
 * @param tileTypes - encounter type filter from the tile. ['*'] = any, ['water'] = water only, etc.
 */
export function generateWildEncounter(mapId: string, tileTypes?: string[] | null): Pokemon | null {
  const table = encounterTables[mapId];
  if (!table || table.entries.length === 0) {
    const fallback = encounterTables['default-map'];
    if (!fallback) return null;
    return rollEncounter(fallback, tileTypes);
  }
  return rollEncounter(table, tileTypes);
}

// Parse encounter type filters into include/exclude lists.
//   ['*']               - all types, no exclusions
//   ['*/water,ice']     - all except water/ice — loose: excludes only if ALL types match (every)
//   ['*/water,ice?']    - all except water/ice — strict: excludes if ANY type matches (some)
//   ['*/water,ice!']    - same as no suffix (loose, every) — explicit form
//   ['water','bug']     - only water and bug
function parseEncounterFilter(tileTypes: string[]): {
  mode: 'all' | 'include';
  include: string[];
  exclude: string[];
  excludeMode: 'some' | 'every';
} {
  const wildcard = tileTypes.find((t) => t.startsWith('*'));
  if (wildcard) {
    const afterSlash = wildcard.split('/')[1]; // e.g. 'water,ice?' or undefined
    let raw = afterSlash ?? '';
    let excludeMode: 'some' | 'every' = 'every';
    if (raw.endsWith('?')) {
      excludeMode = 'some';
      raw = raw.slice(0, -1);
    } else if (raw.endsWith('!')) {
      excludeMode = 'every';
      raw = raw.slice(0, -1);
    }
    const exclude = raw
      ? raw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    return { mode: 'all', include: [], exclude, excludeMode };
  }
  return { mode: 'include', include: tileTypes, exclude: [], excludeMode: 'every' };
}

/** Roll a Pokemon from the encounter table using weighted random, filtered by tile types. */
function rollEncounter(table: EncounterTable, tileTypes?: string[] | null): Pokemon | null {
  // Filter entries by tile encounter types
  let entries = table.entries;
  if (tileTypes) {
    const filter = parseEncounterFilter(tileTypes);
    if (filter.mode === 'all' && filter.exclude.length > 0) {
      entries = entries.filter((e) => {
        const data = getPokemon(e.pokemonId);
        if (!data) return false;
        if (filter.excludeMode === 'some') {
          // Strict: exclude if ANY type is in the exclude list
          return !data.types.some((t) => filter.exclude.includes(t));
        }
        // Loose (default): exclude only if ALL types are in the exclude list
        return !data.types.every((t) => filter.exclude.includes(t));
      });
    } else if (filter.mode === 'include') {
      // Only specific types
      entries = entries.filter((e) => {
        const data = getPokemon(e.pokemonId);
        if (!data) return false;
        return data.types.some((t) => filter.include.includes(t));
      });
    }
    // mode === 'all' with no exclusions → no filtering needed
  }

  if (entries.length === 0) return null;

  const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of entries) {
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

/** Total XP required to reach a given level (Fluctuating growth rate). */
function fluctuatingTotal(n: number): number {
  if (n <= 15) return Math.floor((n ** 3 * (24 + Math.floor((n + 1) / 3))) / 50);
  if (n <= 36) return Math.floor((n ** 3 * (14 + n)) / 50);
  return Math.floor((n ** 3 * (32 + Math.floor(n / 2))) / 50);
}

/**
 * XP needed to advance from `level` to `level + 1`.
 * Uses the Fluctuating growth rate formula from the mainline games.
 * Fast at low levels, very steep past ~level 30.
 * Reference: https://bulbapedia.bulbagarden.net/wiki/Experience#Fluctuating
 */
export function getXpToNextLevel(level: number): number {
  return Math.max(1, fluctuatingTotal(level + 1) - fluctuatingTotal(level));
}

/** Calculate XP gained from defeating a Pokemon in battle. */
export function calculateXpGain(defeatedPokemon: Pokemon, options?: { trainerBattle?: boolean }): number {
  const data = getPokemon(defeatedPokemon.id);
  const baseExp = data?.baseExperience ?? 50;
  const baseReward = Math.floor((baseExp * defeatedPokemon.level) / 5);
  let reward = baseReward * getRarityXpMultiplier(defeatedPokemon.id);
  if (options?.trainerBattle) {
    reward *= TRAINER_XP_MULTIPLIER;
  }
  return Math.floor(reward);
}

export interface StatGains {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

/** Result of a level-up check. */
export interface LevelUpResult {
  leveledUp: boolean;
  newLevel?: number;
  newMoves?: LevelUpMoveResult[];
  evolution?: EvolutionStep;
  statGains?: StatGains;
}

/** Check if a Pokemon should level up, and apply level-up if so. */
export function checkAndApplyLevelUp(pokemon: Pokemon, party: Pokemon[] = []): LevelUpResult {
  if (pokemon.xp < pokemon.xpToNext) return { leveledUp: false };

  pokemon.xp -= pokemon.xpToNext;
  pokemon.level++;
  pokemon.xpToNext = getXpToNextLevel(pokemon.level);

  // Recalculate stats based on base data + nature + EVs
  const data = getPokemon(pokemon.id);
  let statGains: StatGains | undefined;
  if (data) {
    const nId = pokemon.natureId ?? 1;
    const evs = pokemon.evs ?? { hp: 0, atk: 0, def: 0, spe: 0, spa: 0, spd: 0 };
    const oldMaxHp = pokemon.maxHp;
    const oldAttack = pokemon.attack;
    const oldDefense = pokemon.defense;
    const oldSpecialAttack = pokemon.specialAttack;
    const oldSpecialDefense = pokemon.specialDefense;
    const oldSpeed = pokemon.speed;
    pokemon.maxHp = calcStat(data.stats.hp, pokemon.level, true, 1, evs.hp);
    pokemon.hp += pokemon.maxHp - oldMaxHp; // Heal by the HP gained
    pokemon.attack = calcStat(data.stats.attack, pokemon.level, false, getNatureMultiplier(nId, 'attack'), evs.atk);
    pokemon.defense = calcStat(data.stats.defense, pokemon.level, false, getNatureMultiplier(nId, 'defense'), evs.def);
    pokemon.specialAttack = calcStat(
      data.stats.specialAttack,
      pokemon.level,
      false,
      getNatureMultiplier(nId, 'specialAttack'),
      evs.spa,
    );
    pokemon.specialDefense = calcStat(
      data.stats.specialDefense,
      pokemon.level,
      false,
      getNatureMultiplier(nId, 'specialDefense'),
      evs.spd,
    );
    pokemon.speed = calcStat(data.stats.speed, pokemon.level, false, getNatureMultiplier(nId, 'speed'), evs.spe);
    statGains = {
      hp: pokemon.maxHp - oldMaxHp,
      attack: pokemon.attack - oldAttack,
      defense: pokemon.defense - oldDefense,
      specialAttack: pokemon.specialAttack - oldSpecialAttack,
      specialDefense: pokemon.specialDefense - oldSpecialDefense,
      speed: pokemon.speed - oldSpeed,
    };
  }

  // Check learnset for new moves at this level
  const newMoves: LevelUpMoveResult[] = [];
  const learnset = getLearnset(pokemon.id);
  const movesAtLevel = learnset.filter((entry) => entry.levelLearned === pokemon.level);

  for (const entry of movesAtLevel) {
    // Skip if already knows this move
    if (pokemon.moves.some((m) => m.id === entry.moveId)) continue;

    if (pokemon.moves.length < MAX_POKEMON_MOVES) {
      const move = createMoveFromId(entry.moveId);
      if (move) {
        pokemon.moves.push(move);
        newMoves.push({ moveId: entry.moveId, learned: true });
      }
      continue;
    }

    newMoves.push({ moveId: entry.moveId, learned: false });
  }

  console.debug(`${pokemon.name} grew to level ${pokemon.level}!`);
  if (newMoves.length > 0) {
    console.debug(
      `Move learning events: ${newMoves.map((move) => `${move.moveId}:${move.learned ? 'learned' : 'pending'}`).join(', ')}`,
    );
  }

  return {
    leveledUp: true,
    newLevel: pokemon.level,
    newMoves,
    evolution: getPendingLevelEvolution(pokemon) ?? getPendingHappinessEvolution(pokemon, party),
    statGains,
  };
}

export function getPendingLevelEvolution(pokemon: Pokemon): EvolutionStep | undefined {
  // special cases
  const tyrougeNext = getTyrougeChain(pokemon);
  if (tyrougeNext) return tyrougeNext;

  const nextEvolution = getRegularNextEvolution(pokemon.id);
  if (!nextEvolution) return undefined;
  if (nextEvolution.trigger !== 'level-up') return undefined;
  if (nextEvolution.minLevel === null) return undefined;
  return pokemon.level >= nextEvolution.minLevel ? nextEvolution : undefined;
}

// tyrouge to hitmonlee/chan/top
function getTyrougeChain(pokemon: Pokemon) {
  // tyrouge = 236
  if (pokemon.id !== 236) return undefined;
  const candidates = getAllNextEvolutions(pokemon.id).filter((c) => c.minLevel && pokemon.level >= c.minLevel);
  if (candidates.length === 0) return undefined;

  if (pokemon.attack === pokemon.defense) {
    return candidates.find((c) => c.id === 237);
  } else if (pokemon.attack > pokemon.defense) {
    return candidates.find((c) => c.id === 106);
  } else {
    return candidates.find((c) => c.id === 107);
  }
}

/**
 * Returns Espeon/Umbreon if Eevee (or any happiness-evolving Pokemon) has
 * reached the happiness threshold. Day → Espeon (196), night → Umbreon (197).
 */
export function getPendingHappinessEvolution(pokemon: Pokemon, party: Pokemon[]): EvolutionStep | undefined {
  const candidates = getAllNextEvolutions(pokemon.id).filter((s) => s.trigger === 'level-up' && s.minLevel === null);
  if (candidates.length === 0) return undefined;

  const happiness = calcHappiness(pokemon, party);
  if (happiness < HAPPINESS_EVOLUTION_THRESHOLD) return undefined;

  const day = isDaytime();
  const espeon = candidates.find((s) => s.id === 196);
  const umbreon = candidates.find((s) => s.id === 197);
  const lucario = candidates.find((s) => s.id === 448);

  if (day && lucario) return lucario;
  if (day && espeon) return espeon;
  if (!day && umbreon) return umbreon;

  // togetic , crobat , blissy
  return candidates[0];
}

export function applyEvolution(pokemon: Pokemon, evolvedId: number): boolean {
  const evolvedData = getPokemon(evolvedId);
  if (!evolvedData) return false;

  const oldMaxHp = pokemon.maxHp;
  const natureId = pokemon.natureId ?? 1;
  const evs = pokemon.evs ?? { hp: 0, atk: 0, def: 0, spe: 0, spa: 0, spd: 0 };
  pokemon.id = evolvedData.id;
  pokemon.name = evolvedData.name.en;
  pokemon.types = evolvedData.types as PokemonType[];
  pokemon.maxHp = calcStat(evolvedData.stats.hp, pokemon.level, true, 1, evs.hp);
  pokemon.hp = Math.max(1, Math.min(pokemon.maxHp, pokemon.hp + (pokemon.maxHp - oldMaxHp)));
  pokemon.attack = calcStat(
    evolvedData.stats.attack,
    pokemon.level,
    false,
    getNatureMultiplier(natureId, 'attack'),
    evs.atk,
  );
  pokemon.defense = calcStat(
    evolvedData.stats.defense,
    pokemon.level,
    false,
    getNatureMultiplier(natureId, 'defense'),
    evs.def,
  );
  pokemon.specialAttack = calcStat(
    evolvedData.stats.specialAttack,
    pokemon.level,
    false,
    getNatureMultiplier(natureId, 'specialAttack'),
    evs.spa,
  );
  pokemon.specialDefense = calcStat(
    evolvedData.stats.specialDefense,
    pokemon.level,
    false,
    getNatureMultiplier(natureId, 'specialDefense'),
    evs.spd,
  );
  pokemon.speed = calcStat(
    evolvedData.stats.speed,
    pokemon.level,
    false,
    getNatureMultiplier(natureId, 'speed'),
    evs.spe,
  );

  const evolvedAbilities = getPokemonAbilities(evolvedId);
  if (evolvedAbilities) {
    const allowedAbilityIds = [...evolvedAbilities.abilities];
    if (evolvedAbilities.hidden !== null) allowedAbilityIds.push(evolvedAbilities.hidden);
    if (pokemon.abilityId === null || !allowedAbilityIds.includes(pokemon.abilityId)) {
      pokemon.abilityId = getRandomAbility(evolvedId);
    }
  } else {
    pokemon.abilityId = null;
  }

  return true;
}
