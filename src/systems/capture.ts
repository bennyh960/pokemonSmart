import { normalizeMajorStatusId } from '../types/battle-metadata.js';

export interface CaptureChanceInput {
  /** 255 = guaranteed catch (Master Ball). Otherwise a ball multiplier: 1 = Poke Ball, 1.5 = Great, 2 = Ultra. */
  ballRate: number;
  /** Raw PokeAPI catch rate 0–255. */
  speciesCatchRate: number;
  currentHp: number;
  maxHp: number;
  playerLevel: number;
  wildLevel: number;
  turnNumber: number;
  status?: string | null;
  /** Total accumulated negative stat stages applied to the wild Pokemon this battle
   *  (sum of absolute stage counts across all stats that were lowered). */
  statStagesReduced?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GUARANTEED_CAPTURE_RATE = 255;

// HP component: goes from HP_BASE at full health → (HP_BASE + HP_RANGE) at 1 HP
// Together they represent a 65% maximum weight for HP.
const HP_BASE = 0.08; // minimum contribution even at full HP
const HP_RANGE = 0.57; // additional contribution as HP drops (0.08 + 0.57 = 0.65 at 0 HP)

// Status bonuses (additive)
const STATUS_SEVERE = 0.3; // sleep / freeze
const STATUS_MODERATE = 0.25; // paralysis
const STATUS_MILD = 0.2; // burn / poison

// Turn bonus: +0.75% per turn after turn 1, capped at 12%
const TURN_BONUS_PER_TURN = 0.0075;
const TURN_BONUS_MAX = 0.12;

// Stat-reduction bonus: +2% per enemy stat stage lowered, capped at 20%
const STAT_BONUS_PER_STAGE = 0.02;
const STAT_BONUS_MAX = 0.2;

// Level-difference bonus/penalty: ±0.4% per level, capped at ±10%
const LEVEL_BONUS_PER_LEVEL = 0.004;
const LEVEL_BONUS_MAX = 0.1;

const SPECIES_FACTOR_REDUCER = 0.8;
const SPECIES_FACTOR_EXPONENT = 1.05; // slight curve so very rare species remain meaningfully harder

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Additive status bonus (0 = no status, up to 0.30 for sleep/freeze).
 */
export function getStatusCatchBonus(status?: string | null): number {
  switch (normalizeMajorStatusId(status)) {
    case 'sleep':
    case 'freeze':
      return STATUS_SEVERE;
    case 'paralyze':
      return STATUS_MODERATE;
    case 'burn':
    case 'poison':
      return STATUS_MILD;
    default:
      return 0;
  }
}

/**
 * Additive turn bonus: +0.75% per turn after the first, capped at 12%.
 */
export function getTurnCatchBonus(turnNumber: number): number {
  if (turnNumber <= 1) return 0;
  return Math.min(TURN_BONUS_MAX, (turnNumber - 1) * TURN_BONUS_PER_TURN);
}

/**
 * Additive bonus from lowering the wild Pokemon's stats.
 * Each stat stage lowered contributes +2%, total capped at 20%.
 */
export function getStatReductionBonus(statStagesReduced: number): number {
  return Math.min(STAT_BONUS_MAX, Math.max(0, statStagesReduced) * STAT_BONUS_PER_STAGE);
}

/**
 * Level-difference bonus/penalty: +0.4% per player level above wild, -0.4% if below.
 * Clamped to ±10%.
 */
export function getLevelDifferenceCatchBonus(playerLevel: number, wildLevel: number): number {
  return clamp((playerLevel - wildLevel) * LEVEL_BONUS_PER_LEVEL, -LEVEL_BONUS_MAX, LEVEL_BONUS_MAX);
}

// ─── Main Formula ─────────────────────────────────────────────────────────────

/**
 * Returns a catch probability in [0, 1].
 *
 * Formula:
 *   rawScore = hpComponent + statusBonus + turnBonus + statReductionBonus + levelDeltaBonus
 *   catchChance = clamp(rawScore × speciesFactor × ballMultiplier, 0, 1)
 *
 * Where hpComponent = HP_BASE + (1 − currentHp/maxHp) × HP_RANGE → [0.08, 0.65]
 */
export function calculateCaptureChance(input: CaptureChanceInput): number {
  if (input.ballRate >= GUARANTEED_CAPTURE_RATE) return 1;

  const maxHp = Math.max(1, input.maxHp);
  const currentHp = clamp(input.currentHp, 0, maxHp);
  const speciesFactor =
    Math.pow(clamp(input.speciesCatchRate / 255, 0, 1), SPECIES_FACTOR_EXPONENT) / SPECIES_FACTOR_REDUCER;

  const hpComponent = HP_BASE + (1 - currentHp / maxHp) * HP_RANGE;
  const statusBonus = getStatusCatchBonus(input.status);
  const turnBonus = getTurnCatchBonus(input.turnNumber);
  const statReductBonus = getStatReductionBonus(input.statStagesReduced ?? 0);
  const levelBonus = getLevelDifferenceCatchBonus(input.playerLevel, input.wildLevel);

  const rawScore = hpComponent + statusBonus + turnBonus + statReductBonus + levelBonus;

  console.log(`Capture Chance Calculation Debug:
  HP Component: ${hpComponent.toFixed(4)}
  Status Bonus: ${statusBonus.toFixed(4)}
  Turn Bonus: ${turnBonus.toFixed(4)}
  Stat Reduction Bonus: ${statReductBonus.toFixed(4)}
  Level Bonus: ${levelBonus.toFixed(4)}
  Raw Score: ${rawScore.toFixed(4)}
  Species Factor: ${speciesFactor.toFixed(4)}
  Ball Rate: ${input.ballRate.toFixed(4)}
  Final Chance (before clamping): ${(rawScore * speciesFactor * input.ballRate).toFixed(4)}
  Final Capture Chance: ${clamp(rawScore * speciesFactor * input.ballRate, 0, 1).toFixed(4)}
  `);
  return clamp(rawScore * speciesFactor * input.ballRate, 0, 1);
}
