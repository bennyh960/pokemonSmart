import { describe, expect, it } from 'vitest';
import { getPokemon } from '../../services/pokemon-data.js';
import { createPokemonFromData } from '../encounter.js';
import { applyItemEffect, canUseItemOnPokemon } from '../item-effects.js';

describe('item effects status cure', () => {
  it('cures a matching persistent major status', () => {
    const bulbasaur = getPokemon(1);
    expect(bulbasaur).toBeDefined();

    const pokemon = createPokemonFromData(bulbasaur!, 5);
    pokemon.status = 'poison';

    expect(canUseItemOnPokemon('18', pokemon)).toBe(true);
    expect(applyItemEffect('18', pokemon)).toEqual({
      success: true,
      message: 'Cured!',
    });
    expect(pokemon.status).toBeNull();
  });

  it('rejects the wrong cure item for the current major status', () => {
    const bulbasaur = getPokemon(1);
    expect(bulbasaur).toBeDefined();

    const pokemon = createPokemonFromData(bulbasaur!, 5);
    pokemon.status = 'burn';

    expect(canUseItemOnPokemon('18', pokemon)).toBe(false);
    expect(applyItemEffect('18', pokemon)).toEqual({
      success: false,
      message: 'No matching status to cure!',
    });
    expect(pokemon.status).toBe('burn');
  });
});
