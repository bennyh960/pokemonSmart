import { describe, expect, it } from 'vitest';
import { getPokemonCatchRate } from '../../services/pokemon-data.js';
import {
  calculateCaptureChance,
  getLevelDifferenceCatchMultiplier,
  getStatusCatchMultiplier,
  getTurnCatchBonus,
} from '../capture.js';

describe('capture helpers', () => {
  it('exposes species catch rates for known Pokemon', () => {
    expect(getPokemonCatchRate(1)).toBe(45);
    expect(getPokemonCatchRate(25)).toBe(190);
    expect(getPokemonCatchRate(150)).toBe(3);
  });

  it('applies stronger status bonus for sleep and freeze', () => {
    expect(getStatusCatchMultiplier('sleep')).toBe(1.5);
    expect(getStatusCatchMultiplier('freeze')).toBe(1.5);
    expect(getStatusCatchMultiplier('paralysis')).toBe(1.2);
    expect(getStatusCatchMultiplier(undefined)).toBe(1);
  });

  it('caps level-difference impact so large gaps stay bounded', () => {
    expect(getLevelDifferenceCatchMultiplier(40, 20)).toBe(1.2);
    expect(getLevelDifferenceCatchMultiplier(20, 40)).toBe(0.8);
    expect(getLevelDifferenceCatchMultiplier(30, 30)).toBe(1);
  });

  it('adds an additive turn bonus capped at ten percentage points', () => {
    expect(getTurnCatchBonus(1)).toBe(0);
    expect(getTurnCatchBonus(2)).toBe(0.02);
    expect(getTurnCatchBonus(3)).toBe(0.03);
    expect(getTurnCatchBonus(25)).toBe(0.1);
  });

  it('guarantees master-ball style capture rates', () => {
    expect(calculateCaptureChance({
      ballRate: 255,
      speciesCatchRate: 3,
      currentHp: 100,
      maxHp: 100,
      playerLevel: 5,
      wildLevel: 70,
      turnNumber: 1,
    })).toBe(1);
  });

  it('combines species rate, hp, status, level, and turn bonuses', () => {
    const base = calculateCaptureChance({
      ballRate: 1,
      speciesCatchRate: 45,
      currentHp: 40,
      maxHp: 40,
      playerLevel: 15,
      wildLevel: 15,
      turnNumber: 1,
    });
    const boosted = calculateCaptureChance({
      ballRate: 1.5,
      speciesCatchRate: 45,
      currentHp: 5,
      maxHp: 40,
      playerLevel: 20,
      wildLevel: 15,
      turnNumber: 5,
      status: 'sleep',
    });

    expect(base).toBeCloseTo(0.0882, 4);
    expect(boosted).toBeGreaterThan(base);
    expect(boosted).toBeLessThanOrEqual(1);
  });
});
