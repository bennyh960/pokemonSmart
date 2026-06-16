import type { PlayerData, DayCareEntry, Pokemon, Move } from '../types/index.js';
import type { DayCareData } from './npc.js';
import { getRegularNextEvolution, getLearnset } from '../services/pokemon-data.js';
import { recalcPokemonStats } from './encounter.js';
import { createMoveFromId, MAX_POKEMON_MOVES } from './move-learning.js';

const DEFAULT_STEPS_PER_LEVEL = 100;
const DEFAULT_COST_PER_LEVEL = 100;

export interface DayCareResult {
  levelsGained: number;
  newLevel: number;
  cost: number;
}

/** Find the deposit entry for a specific day-care NPC, or null if none. */
export function getDayCareEntry(pd: PlayerData, npcId: string): DayCareEntry | null {
  for (const entry of Object.values(pd.awayPokemon)) {
    if (entry.kind === 'day-care' && entry.npcId === npcId) return entry as DayCareEntry;
  }
  return null;
}

/** Return the level cap: one below the next level-up evolution, or 100. */
function evoCap(pokemonId: number, currentLevel: number): number {
  const evo = getRegularNextEvolution(pokemonId);
  if (evo?.trigger === 'level-up' && evo.minLevel != null && evo.minLevel > currentLevel) {
    return evo.minLevel - 1;
  }
  return 100;
}

/** Lazily calculate levels gained and withdrawal cost (does NOT mutate anything). */
export function calcDayCareResult(pd: PlayerData, entry: DayCareEntry, npc: DayCareData): DayCareResult {
  const steps = Math.max(0, pd.totalSteps - entry.depositedAtSteps);
  const stepsPerLevel = npc.stepsPerLevel ?? DEFAULT_STEPS_PER_LEVEL;
  const costPerLevel = npc.costPerLevel ?? DEFAULT_COST_PER_LEVEL;

  const currentLevel = entry.pokemon.level;
  const cap = evoCap(entry.pokemon.id, currentLevel);
  const rawLevels = Math.floor(steps / stepsPerLevel);
  const newLevel = Math.min(currentLevel + rawLevels, cap);
  const levelsGained = newLevel - currentLevel;

  return { levelsGained, newLevel, cost: levelsGained * costPerLevel };
}

/** Map phase of a day-care Pokémon: how far along its stay it is. */
export type DayCarePhase = 'adapting' | 'doing-well' | 'stop-grow';

/** Compute the display phase without mutating anything. */
export function getDayCarePhase(pd: PlayerData, entry: DayCareEntry): DayCarePhase {
  const stepsPerLevel = entry.stepsPerLevel ?? DEFAULT_STEPS_PER_LEVEL;
  const steps = Math.max(0, pd.totalSteps - entry.depositedAtSteps);
  const rawLevels = Math.floor(steps / stepsPerLevel);
  const cap = evoCap(entry.pokemon.id, entry.pokemon.level);
  const newLevel = Math.min(entry.pokemon.level + rawLevels, cap);
  if (newLevel >= cap) return 'stop-grow';
  if (rawLevels === 0) return 'adapting';
  return 'doing-well';
}

/** Compute moves the Pokémon learns while leveling from `fromLevel` to `toLevel` at day care.
 *  Moves are applied in learnset order; slots below MAX fill automatically, the rest are pending. */
function calcDayCareNewMoves(
  pokemon: Pokemon,
  fromLevel: number,
  toLevel: number,
): { autoLearned: Move[]; pending: number[] } {
  const learnset = getLearnset(pokemon.id);
  const movesInRange = learnset
    .filter((e) => e.levelLearned > fromLevel && e.levelLearned <= toLevel)
    .sort((a, b) => a.levelLearned - b.levelLearned);

  const autoLearned: Move[] = [];
  const pending: number[] = [];
  const knownIds = new Set(pokemon.moves.map((m) => m.id));
  let moveCount = pokemon.moves.length;

  for (const entry of movesInRange) {
    if (knownIds.has(entry.moveId)) continue;
    if (moveCount < MAX_POKEMON_MOVES) {
      const move = createMoveFromId(entry.moveId);
      if (move) {
        autoLearned.push(move);
        knownIds.add(entry.moveId);
        moveCount++;
      }
    } else {
      pending.push(entry.moveId);
    }
  }

  return { autoLearned, pending };
}

/** Remove Pokémon from party slot `idx` and create a day-care entry. */
export function depositPokemon(pd: PlayerData, partyIndex: number, npc: DayCareData): Pokemon {
  const pokemon = pd.party.splice(partyIndex, 1)[0];
  pd.awayPokemon[pokemon.uuid] = {
    kind: 'day-care',
    pokemon,
    depositedAtSteps: pd.totalSteps,
    npcId: npc.id,
    route: npc.route ?? { en: '', he: '' },
    stepsPerLevel: npc.stepsPerLevel ?? DEFAULT_STEPS_PER_LEVEL,
  };
  return pokemon;
}

/** Apply earned levels, deduct money, and return Pokémon to party or first free PC box.
 *  Returns auto-learned moves (already applied) and pending move IDs that need player choice. */
export function withdrawPokemon(
  pd: PlayerData,
  entry: DayCareEntry,
  result: DayCareResult,
): { sentToBox: boolean; pendingMoves: number[] } {
  const pokemon = entry.pokemon;
  let pendingMoves: number[] = [];

  if (result.levelsGained > 0) {
    const moveResult = calcDayCareNewMoves(pokemon, pokemon.level, result.newLevel);
    for (const move of moveResult.autoLearned) {
      pokemon.moves.push(move);
    }
    pendingMoves = moveResult.pending;
    pokemon.level = result.newLevel;
    recalcPokemonStats(pokemon);
  }

  delete pd.awayPokemon[pokemon.uuid];
  pd.money -= result.cost;
  // Remove from phone contacts — no longer in care
  if (pd.phoneContacts) {
    pd.phoneContacts = pd.phoneContacts.filter((c) => c.trainerId !== entry.npcId);
  }

  if (pd.party.length < 6) {
    pd.party.push(pokemon);
    return { sentToBox: false, pendingMoves };
  }

  // Party full — place in first free PC box slot
  outer: for (const box of pd.boxes) {
    for (let s = 0; s < box.pokemon.length; s++) {
      if (!box.pokemon[s]) {
        box.pokemon[s] = pokemon;
        break outer;
      }
    }
  }
  return { sentToBox: true, pendingMoves };
}
