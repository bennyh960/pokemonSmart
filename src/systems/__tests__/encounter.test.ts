import { describe, expect, it } from 'vitest';
import { getPokemon, getLearnset } from '../../services/pokemon-data.js';
import { checkAndApplyLevelUp, createPokemonFromData } from '../encounter.js';
import { createMoveFromId, MAX_POKEMON_MOVES } from '../move-learning.js';

describe('checkAndApplyLevelUp move learning', () => {
  it('marks new level-up moves as learned when there is room', () => {
    const bulbasaur = getPokemon(1);
    expect(bulbasaur).toBeDefined();

    const learnAt4 = getLearnset(1).find((entry) => entry.levelLearned === 4);
    expect(learnAt4).toBeDefined();

    const pokemon = createPokemonFromData(bulbasaur!, 3);
    pokemon.xp = pokemon.xpToNext;

    const result = checkAndApplyLevelUp(pokemon);

    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(4);
    expect(result.newMoves).toEqual([{ moveId: learnAt4!.moveId, learned: true }]);
    expect(pokemon.moves.some((move) => move.id === learnAt4!.moveId)).toBe(true);
  });

  it('marks new level-up moves as pending when the Pokemon is at the move cap', () => {
    const bulbasaur = getPokemon(1);
    expect(bulbasaur).toBeDefined();

    const learnAt7 = getLearnset(1).find((entry) => entry.levelLearned === 7);
    expect(learnAt7).toBeDefined();

    const pokemon = createPokemonFromData(bulbasaur!, 6);
    const fillerMoveIds = [98, 16, 81, 40, 44, 55, 93, 103];
    for (const moveId of fillerMoveIds) {
      if (pokemon.moves.length >= MAX_POKEMON_MOVES) break;
      if (pokemon.moves.some((move) => move.id === moveId) || moveId === learnAt7!.moveId) continue;
      const move = createMoveFromId(moveId);
      if (move) pokemon.moves.push(move);
    }

    expect(pokemon.moves).toHaveLength(MAX_POKEMON_MOVES);

    pokemon.xp = pokemon.xpToNext;
    const result = checkAndApplyLevelUp(pokemon);

    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(7);
    expect(result.newMoves).toEqual([{ moveId: learnAt7!.moveId, learned: false }]);
    expect(pokemon.moves).toHaveLength(MAX_POKEMON_MOVES);
    expect(pokemon.moves.some((move) => move.id === learnAt7!.moveId)).toBe(false);
  });
});
