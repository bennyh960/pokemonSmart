/**
 * ClassConfig.ts
 *
 * Pre-defined configurations for school grades 1–6 (כיתה א'–ו').
 * Each config declares which arithmetic operations are allowed,
 * the operand number range, and other constraints that templates
 * must respect when generating questions.
 *
 * Usage:
 *   import { GRADE_CONFIGS, getClassConfig } from './ClassConfig.js';
 *   const cfg = getClassConfig('grade3');
 *
 * You can also create custom configs for advanced / remedial groups
 * by calling createCustomConfig() and registering the result.
 */

import type { ClassConfig, GradeId } from './types.js';

// ─── Preset Configs ───────────────────────────────────────────────────────────

/**
 * Grade 1 (כיתה א')
 * Single-digit addition and subtraction only.
 * Results are always non-negative.
 */
const GRADE_1: ClassConfig = {
  id: 'grade1',
  label: { en: 'Grade 1', he: 'כיתה א׳' },
  allowedOperations: ['+', '-'],
  numberRange: { min: 1, max: 10 },
  maxSteps: 1,
  allowNegative: false,
  allowFractions: false,
  allowRemainders: false,
  difficultyRange: [1, 1],
};

/**
 * Grade 2 (כיתה ב')
 * Two-digit addition / subtraction, introduction to multiplication tables (×2–×5).
 */
const GRADE_2: ClassConfig = {
  id: 'grade2',
  label: { en: 'Grade 2', he: 'כיתה ב׳' },
  allowedOperations: ['+', '-', '×', '÷'],
  numberRange: { min: 1, max: 100 },
  maxSteps: 3,
  allowNegative: false,
  allowFractions: false,
  allowRemainders: false,
  difficultyRange: [1, 2,],
};

/**
 * Grade 3 (כיתה ג')
 * Three-digit arithmetic, full ×/÷ tables (up to 10×10), two-step problems.
 */
const GRADE_3: ClassConfig = {
  id: 'grade3',
  label: { en: 'Grade 3', he: 'כיתה ג׳' },
  allowedOperations: ['+', '-', '×', '÷'],
  numberRange: { min: 1, max: 200 },
  maxSteps: 4,
  allowNegative: false,
  allowFractions: false,
  allowRemainders: true,
  difficultyRange: [2, 3],
};

/**
 * Grade 4 (כיתה ד')
 * Larger numbers, order of operations (parentheses), remainders.
 */
const GRADE_4: ClassConfig = {
  id: 'grade4',
  label: { en: 'Grade 4', he: 'כיתה ד׳' },
  allowedOperations: ['+', '-', '×', '÷', '()'],
  numberRange: { min: 1, max: 500 },
  maxSteps: 2,
  allowNegative: false,
  allowFractions: false,
  allowRemainders: true,
  difficultyRange: [3, 4],
};

/**
 * Grade 5 (כיתה ה')
 * All operations, simple fractions (1/2, 1/4, 3/4), multi-step problems.
 */
const GRADE_5: ClassConfig = {
  id: 'grade5',
  label: { en: 'Grade 5', he: 'כיתה ה׳' },
  allowedOperations: ['+', '-', '×', '÷', '()'],
  numberRange: { min: 1, max: 1000 },
  maxSteps: 3,
  allowNegative: false,
  allowFractions: true,
  allowRemainders: true,
  difficultyRange: [4, 5],
};

/**
 * Grade 6 (כיתה ו')
 * Complex fractions, negative numbers, multi-step reasoning.
 */
const GRADE_6: ClassConfig = {
  id: 'grade6',
  label: { en: 'Grade 6', he: 'כיתה ו׳' },
  allowedOperations: ['+', '-', '×', '÷', '()'],
  numberRange: { min: 1, max: 9999 },
  maxSteps: 3,
  allowNegative: true,
  allowFractions: true,
  allowRemainders: true,
  difficultyRange: [5, 6],
};

// ─── Registry Map ─────────────────────────────────────────────────────────────

/** All built-in grade configs, keyed by GradeId. */
export const GRADE_CONFIGS: Readonly<Record<GradeId, ClassConfig>> = {
  grade1: GRADE_1,
  grade2: GRADE_2,
  grade3: GRADE_3,
  grade4: GRADE_4,
  grade5: GRADE_5,
  grade6: GRADE_6,
};

// ─── Custom config support ────────────────────────────────────────────────────

/** Mutable map for custom / overridden configs (e.g. remedial groups). */
const _customConfigs = new Map<GradeId, ClassConfig>();

/**
 * Register a custom config that overrides a built-in grade or adds
 * a new one. Call this before building any questions for that grade.
 */
export function registerCustomConfig(config: ClassConfig): void {
  _customConfigs.set(config.id, config);
}

/** Remove a previously registered custom config. */
export function removeCustomConfig(id: GradeId): boolean {
  return _customConfigs.delete(id);
}

/**
 * Return the effective ClassConfig for a grade.
 * Custom configs take precedence over built-in presets.
 */
export function getClassConfig(id: GradeId): ClassConfig {
  const custom = _customConfigs.get(id);
  if (custom) return custom;
  const preset = GRADE_CONFIGS[id];
  if (!preset) throw new Error(`[ClassConfig] No config found for grade "${id}"`);
  return preset;
}

/** List all grade IDs sorted by school order. */
export function listGrades(): GradeId[] {
  return ['grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6'];
}

/**
 * Helper: clone an existing config and patch specific fields.
 * Useful for creating a "grade3-advanced" variant without
 * fully re-specifying everything.
 *
 * @example
 * const advanced = createCustomConfig('grade3', { maxSteps: 3, numberRange: { min: 1, max: 200 } });
 */
export function createCustomConfig(
  baseId: GradeId,
  overrides: Partial<ClassConfig>,
): ClassConfig {
  const base = getClassConfig(baseId);
  return { ...base, ...overrides };
}
