import { describe, expect, it } from 'vitest';
import { getPokemon } from '../../services/pokemon-data.js';
import { calculateXpGain, checkAndApplyLevelUp, createPokemonFromData, getXpToNextLevel } from '../encounter.js';

describe('XP rebalance', () => {
  it('uses the Fluctuating XP-to-next curve', () => {
    // L1→2: total(2)-total(1) = 4-0 = 4
    expect(getXpToNextLevel(1)).toBe(4);
    // L5→6: total(6)-total(5) = 112-65 = 47
    expect(getXpToNextLevel(5)).toBe(47);
    // L10→11: total(11)-total(10) = 745-540 = 205
    expect(getXpToNextLevel(10)).toBe(205);
  });

  it('initializes and updates xpToNext with the shared formula', () => {
    const bulbasaur = getPokemon(1);
    expect(bulbasaur).toBeDefined();

    const pokemon = createPokemonFromData(bulbasaur!, 5);
    expect(pokemon.xpToNext).toBe(47);

    pokemon.xp = pokemon.xpToNext;
    const result = checkAndApplyLevelUp(pokemon);

    expect(result.leveledUp).toBe(true);
    expect(pokemon.level).toBe(6);
    // L6→7: total(7)-total(6) = 178-112 = 66
    expect(pokemon.xpToNext).toBe(66);
  });

  it('boosts battle XP and gives trainer battles extra reward', () => {
    const pidgey = getPokemon(16);
    const bulbasaur = getPokemon(1);
    expect(pidgey).toBeDefined();
    expect(bulbasaur).toBeDefined();

    const commonEnemy = createPokemonFromData(pidgey!, 3);
    const rareEnemy = createPokemonFromData(bulbasaur!, 5);

    expect(calculateXpGain(commonEnemy)).toBe(30);
    expect(calculateXpGain(rareEnemy)).toBe(72);
    expect(calculateXpGain(rareEnemy, { trainerBattle: true })).toBe(109);
  });
});
