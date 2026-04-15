/**
 * QuestionTemplate.ts
 *
 * Abstract base class for all question templates.
 *
 * Design pattern: Template Method
 * ─────────────────────────────
 * `build()` is the template method: it calls `generateParams()` then `solve()`,
 * both of which are abstract and must be implemented by each concrete template.
 *
 * Concrete templates live in ./templates/ and only define the domain-specific
 * parameter generation and solving logic. All shared boilerplate (validation,
 * difficulty/timeLimit calculation, asset extraction) lives here.
 *
 * Pattern summary:
 *   build()                  ← template method (final, not overridable)
 *   generateParams()         ← abstract hook (what values go in the question)
 *   solve()                  ← abstract hook (how to compute the answer + steps)
 *   isCompatibleWith()       ← can this template be used with a given ClassConfig?
 */

import type { MathDifficulty } from '../../types/index.js';
import type {
  BilingualText,
  ClassConfig,
  PokemonWorldSnapshot,
  QuestionAsset,
  QuestionCategory,
  RichQuestion,
  TemplateParams,
} from './types.js';

// ─── Internal result from solve() ────────────────────────────────────────────

export interface SolveResult {
  answer: number;
  /** Step-by-step explanation in both languages. */
  steps: BilingualText[];
  /** Optional hint for struggling students. */
  hint?: BilingualText;
  /** Visual sprites to show alongside the question. */
  assets: QuestionAsset[];
  /** Multiple-choice distractors (excluding the correct answer). */
  distractors?: number[];
}

// ─── Abstract base ────────────────────────────────────────────────────────────

export abstract class QuestionTemplate {
  // ── Metadata (set by subclass as readonly fields) ──────────────────────────

  /** Unique stable identifier, e.g. "store.single-item-cost". */
  abstract readonly id: string;

  /** Human-readable name for the admin UI. */
  abstract readonly name: BilingualText;

  /** Broad category used for filtering. */
  abstract readonly category: QuestionCategory;

  /**
   * Which operations this template requires.
   * Used by TemplateRegistry to filter templates that are compatible
   * with a given ClassConfig.allowedOperations.
   * Declared as ReadonlyArray so subclasses can use `as const` tuples.
   */
  abstract readonly requiredOperations: ReadonlyArray<'+' | '-' | '×' | '÷' | '()'>;

  /**
   * Minimum grade difficulty this template targets.
   * Templates with minDifficulty > config.difficultyRange[1] are skipped.
   */
  abstract readonly minDifficulty: MathDifficulty;

  /** Maximum grade difficulty this template targets. */
  abstract readonly maxDifficulty: MathDifficulty;

  // ── Abstract hooks ─────────────────────────────────────────────────────────

  /**
   * Generate concrete parameter values for this question instance.
   * Uses the snapshot (live Pokemon/items) and classConfig (number ranges, etc.)
   * to pick and produce all named slots the question text needs.
   */
  protected abstract generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams;

  /**
   * Given the generated parameters, compute the correct answer,
   * solution steps, hint and visual assets.
   */
  protected abstract solve(params: TemplateParams, config: ClassConfig): SolveResult;

  /**
   * Return the question text in both languages, with {slot} placeholders
   * resolved from params.  Subclasses define the template strings here.
   */
  protected abstract questionText(params: TemplateParams): BilingualText;

  // ── Template method (final) ────────────────────────────────────────────────

  /**
   * Build a fully-resolved RichQuestion.
   * This is the only method callers should invoke.
   */
  build(snapshot: PokemonWorldSnapshot, config: ClassConfig): RichQuestion {
    this._assertCompatible(config);

    const params = this.generateParams(snapshot, config);
    const { answer, steps, hint, assets, distractors } = this.solve(params, config);
    const questionText = this.questionText(params);

    const choices = distractors ? this._buildChoices(answer, distractors) : undefined;

    return {
      templateId: this.id,
      question: questionText,
      correctAnswer: answer,
      choices,
      steps,
      hint,
      assets,
      difficulty: this._calcDifficulty(config),
      category: this.category,
      timeLimit: this._calcTimeLimit(config),
      classConfigId: config.id,
    };
  }

  // ── Compatibility check ────────────────────────────────────────────────────

  /**
   * Return true when every operation this template requires is present in
   * `config.allowedOperations`, AND difficulty ranges overlap.
   */
  isCompatibleWith(config: ClassConfig): boolean {
    const opsOk = this.requiredOperations.every((op) => config.allowedOperations.includes(op));
    const difficultyOk =
      this.minDifficulty <= config.difficultyRange[1] && this.maxDifficulty >= config.difficultyRange[0];

    return opsOk && difficultyOk;
  }

  // ── Protected utilities for subclasses ────────────────────────────────────

  /** Pick a random integer in [min, max] inclusive. */
  protected randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** Pick a random element from an array. */
  protected pickRandom<T>(arr: T[]): T {
    if (arr.length === 0) throw new Error(`[${this.id}] pickRandom called with empty array`);
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Pick a random integer that is inside [config.numberRange.min, config.numberRange.max]
   * and additionally clamped to [localMin, localMax].
   * Use this for operand generation so templates respect the grade's number range.
   */
  protected pickNumber(config: ClassConfig, localMin: number, localMax: number): number {
    const min = Math.max(config.numberRange.min, localMin);
    const max = Math.min(config.numberRange.max, localMax);
    if (min > max) return localMin; // fallback when ranges don't overlap
    return this.randInt(min, max);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _assertCompatible(config: ClassConfig): void {
    if (!this.isCompatibleWith(config)) {
      throw new Error(
        `[QuestionTemplate] "${this.id}" is not compatible with class config "${config.id}". ` +
          `Required ops: [${this.requiredOperations}], allowed: [${config.allowedOperations}].`,
      );
    }
  }

  private _calcDifficulty(config: ClassConfig): MathDifficulty {
    // Clamp the template's own difficulty to what the config supports.
    const [configMin, configMax] = config.difficultyRange;
    const clamped = Math.max(configMin, Math.min(configMax, this.minDifficulty));
    return clamped as MathDifficulty;
  }

  private _calcTimeLimit(config: ClassConfig): number {
    // Base: 15s; add 10s per extra step; add 5s per difficulty point above 2.
    const difficulty = this._calcDifficulty(config);
    return 15 + (config.maxSteps - 1) * 10 + Math.max(0, difficulty - 2) * 5;
  }

  private _buildChoices(correct: number, distractors: number[]): number[] {
    // Dedupe, exclude correct, take up to 3 and shuffle.
    const unique = [...new Set(distractors.filter((d) => d !== correct))].slice(0, 3);

    while (unique.length < 3) {
      // Pad with random numbers if not enough unique distractors provided.
      const randomDistractor = correct + this.randInt(-10, 10);
      if (!unique.includes(randomDistractor) && randomDistractor !== correct) {
        unique.push(randomDistractor);
      }
    }

    const all = [...unique, correct];
    // Fisher-Yates shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }
}
