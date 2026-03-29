import { describe, expect, it } from 'vitest';
import { getPokemon } from '../../services/pokemon-data.js';
import { calculateXpGain, checkAndApplyLevelUp, createPokemonFromData, getXpToNextLevel } from '../encounter.js';

describe('XP rebalance', () => {
  it('uses the lighter XP-to-next curve', () => {
    expect(getXpToNextLevel(1)).toBe(80);
    expect(getXpToNextLevel(5)).toBe(200);
    expect(getXpToNextLevel(10)).toBe(350);
  });

  it('initializes and updates xpToNext with the shared formula', () => {
    const bulbasaur = getPokemon(1);
    expect(bulbasaur).toBeDefined();

    const pokemon = createPokemonFromData(bulbasaur!, 5);
    expect(pokemon.xpToNext).toBe(200);

    pokemon.xp = pokemon.xpToNext;
    const result = checkAndApplyLevelUp(pokemon);

    expect(result.leveledUp).toBe(true);
    expect(pokemon.level).toBe(6);
    expect(pokemon.xpToNext).toBe(230);
  });

  it('boosts battle XP and gives trainer battles extra reward', () => {
    const pidgey = getPokemon(16);
    expect(pidgey).toBeDefined();

    const enemy = createPokemonFromData(pidgey!, 3);
    expect(calculateXpGain(enemy)).toBe(30);
    expect(calculateXpGain(enemy, { trainerBattle: true })).toBe(45);
  });
});
