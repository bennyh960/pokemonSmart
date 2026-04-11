import { describe, expect, it } from 'vitest';
import { getPokemonCatchRate } from '../../services/pokemon-data.js';
import {
  calculateCaptureChance,
  getLevelDifferenceCatchBonus,
  getStatReductionBonus,
  getStatusCatchBonus,
  getTurnCatchBonus,
} from '../capture.js';

describe('capture helpers', () => {
  it('exposes species catch rates for known Pokemon', () => {
    expect(getPokemonCatchRate(1)).toBe(45);
    expect(getPokemonCatchRate(25)).toBe(190);
    expect(getPokemonCatchRate(150)).toBe(3);
  });

  it('returns additive status bonus (0 = no status, up to 0.30 for sleep/freeze)', () => {
    expect(getStatusCatchBonus('sleep')).toBe(0.3);
    expect(getStatusCatchBonus('freeze')).toBe(0.3);
    expect(getStatusCatchBonus('paralyze')).toBe(0.25);
    expect(getStatusCatchBonus('burn')).toBe(0.2);
    expect(getStatusCatchBonus('poison')).toBe(0.2);
    expect(getStatusCatchBonus()).toBe(0);
    expect(getStatusCatchBonus(null)).toBe(0);
  });

  it('caps level-difference bonus at ±20%', () => {
    expect(getLevelDifferenceCatchBonus(40, 20)).toBeCloseTo(0.2, 5);
    expect(getLevelDifferenceCatchBonus(20, 40)).toBeCloseTo(-0.2, 5);
    expect(getLevelDifferenceCatchBonus(30, 30)).toBe(0);
    // Beyond cap: still clamped
    expect(getLevelDifferenceCatchBonus(100, 5)).toBeCloseTo(0.2, 5);
    expect(getLevelDifferenceCatchBonus(5, 100)).toBeCloseTo(-0.2, 5);
  });

  it('gives a 5% turn bonus per turn after turn 1, capped at 30%', () => {
    expect(getTurnCatchBonus(1)).toBe(0);
    expect(getTurnCatchBonus(2)).toBeCloseTo(0.05, 5);
    expect(getTurnCatchBonus(3)).toBeCloseTo(0.1, 5);
    expect(getTurnCatchBonus(7)).toBeCloseTo(0.3, 5); // capped
    expect(getTurnCatchBonus(100)).toBeCloseTo(0.3, 5); // still capped
  });

  it('gives 3% per stat stage lowered, capped at 30%', () => {
    expect(getStatReductionBonus(0)).toBe(0);
    expect(getStatReductionBonus(2)).toBeCloseTo(0.06, 5);
    expect(getStatReductionBonus(4)).toBeCloseTo(0.12, 5);
    expect(getStatReductionBonus(10)).toBeCloseTo(0.3, 5); // capped
    expect(getStatReductionBonus(-1)).toBe(0); // negatives are ignored
  });

  it('guarantees master-ball style capture rates', () => {
    expect(
      calculateCaptureChance({
        ballRate: 255,
        speciesCatchRate: 3,
        currentHp: 100,
        maxHp: 100,
        playerLevel: 5,
        wildLevel: 70,
        turnNumber: 1,
      }),
    ).toBe(1);
  });

  it('combines species rate, hp, status, level, turn, and stat-reduction bonuses', () => {
    // Full HP, no bonuses — lowest chance
    const base = calculateCaptureChance({
      ballRate: 1,
      speciesCatchRate: 45,
      currentHp: 40,
      maxHp: 40,
      playerLevel: 15,
      wildLevel: 15,
      turnNumber: 1,
    });

    // Low HP + asleep + turn 5 + player lv advantage + great ball
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

    expect(base).toBeCloseTo(0.0141, 3);
    expect(boosted).toBeCloseTo(0.299, 3);
    expect(boosted).toBeGreaterThan(base);
    expect(boosted).toBeLessThanOrEqual(1);
  });

  it('stat reduction bonus further increases catch chance', () => {
    const withoutReduction = calculateCaptureChance({
      ballRate: 1,
      speciesCatchRate: 45,
      currentHp: 20,
      maxHp: 40,
      playerLevel: 15,
      wildLevel: 15,
      turnNumber: 1,
      statStagesReduced: 0,
    });
    const withReduction = calculateCaptureChance({
      ballRate: 1,
      speciesCatchRate: 45,
      currentHp: 20,
      maxHp: 40,
      playerLevel: 15,
      wildLevel: 15,
      turnNumber: 1,
      statStagesReduced: 4, // 4 stages lowered → +12%
    });
    expect(withReduction).toBeGreaterThan(withoutReduction);
  });
});
