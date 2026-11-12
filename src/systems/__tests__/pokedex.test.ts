import { describe, expect, it } from 'vitest';
import { hasCaughtEvolutionLine } from '../pokedex';
import type { PlayerData } from '../../types';

const pd = (pokedex: PlayerData['pokedex']) => ({ pokedex }) as PlayerData;

describe('hasCaughtEvolutionLine', () => {
  it('marks every stage of a line once any stage is caught', () => {
    const save = pd({ 2: 'caught' }); // Ivysaur
    expect(hasCaughtEvolutionLine(save, 1)).toBe(true); // Bulbasaur (ancestor)
    expect(hasCaughtEvolutionLine(save, 2)).toBe(true);
    expect(hasCaughtEvolutionLine(save, 3)).toBe(true); // Venusaur (descendant)
  });

  it('ignores seen-only species and other lines', () => {
    expect(hasCaughtEvolutionLine(pd({ 1: 'seen' }), 2)).toBe(false);
    expect(hasCaughtEvolutionLine(pd({ 4: 'caught' }), 1)).toBe(false);
  });

  it('counts released species as caught', () => {
    expect(hasCaughtEvolutionLine(pd({ 7: 'release' }), 9)).toBe(true);
  });

  it('does not cross branching siblings (Eevee)', () => {
    const save = pd({ 134: 'caught' }); // Vaporeon
    expect(hasCaughtEvolutionLine(save, 133)).toBe(true); // Eevee
    expect(hasCaughtEvolutionLine(save, 135)).toBe(false); // Jolteon
  });
});
