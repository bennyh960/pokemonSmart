/**
 * Types for the dynamic question-builder system.
 *
 * Design:
 *  - ClassConfig   → per-grade rules (allowed ops, number ranges, etc.)
 *  - QuestionTemplate (abstract) → Template Method pattern: subclasses define
 *    generateParams() and solve(), base class orchestrates build()
 *  - TemplateRegistry → Registry pattern: add / remove templates at runtime
 *  - QuestionBuilder  → Fluent Builder pattern
 *  - QuestionFactory  → convenience factory per ClassConfig
 *  - PokemonWorldContext → supplies live Pokemon / item / move snapshots
 */

import type { MathDifficulty } from '../../types/index.js';
import type { MathOperation } from '../mathConfig.js';

// ─── Primitives ──────────────────────────────────────────────────────────────

export interface BilingualText {
  en: string;
  he: string;
}

export interface NumberRange {
  min: number;
  max: number;
}

// ─── Grade / Class config ─────────────────────────────────────────────────────

/** Supported school-grade identifiers. */
export type GradeId =
  | 'grade1'
  | 'grade2'
  | 'grade3'
  | 'grade4'
  | 'grade5'
  | 'grade6';

/**
 * Full configuration for a school class / grade level.
 * One ClassConfig per grade (or custom group).
 */
export interface ClassConfig {
  /** Unique identifier — also used as key in presets map. */
  id: GradeId;
  /** Human-readable label in both languages. */
  label: BilingualText;
  /** Which arithmetic operations are allowed for this grade. */
  allowedOperations: MathOperation[];
  /** Integer range for operands generated in questions. */
  numberRange: NumberRange;
  /**
   * Maximum number of computational steps in a single question.
   * 1 = single-step, 2 = two-step, 3 = multi-step.
   */
  maxSteps: number;
  /** Whether questions may produce or require negative numbers. */
  allowNegative: boolean;
  /** Whether fraction arithmetic is allowed. */
  allowFractions: boolean;
  /** Whether integer division with remainders is allowed. */
  allowRemainders: boolean;
  /** [min, max] difficulty band mapped to MathDifficulty (1-6). */
  difficultyRange: [MathDifficulty, MathDifficulty];
}

// ─── Pokemon-world entities used in questions ─────────────────────────────────

/** A shop item with its price, sourced from item-defs. */
export interface StoreItem {
  id: number;
  name: BilingualText;
  /** Price in Poké-₽ (0 = not buyable). */
  price: number;
  spriteUrl: string;
  category: string;
}

/** A Pokemon entry with the stats needed for question math. */
export interface QuestionPokemon {
  id: number;
  name: BilingualText;
  /** Front battle sprite (PokeAPI). */
  spriteUrl: string;
  catchRate: number;
  hp: number;
  attack: number;
  defense: number;
  types: string[];
}

/** A move with the power needed for damage calculations. */
export interface QuestionMove {
  id: number;
  name: BilingualText;
  power: number;
  type: string;
}

// ─── Question output ──────────────────────────────────────────────────────────

/** A visual asset (sprite) to render next to a question. */
export interface QuestionAsset {
  kind: 'pokemon' | 'item';
  id: number;
  spriteUrl: string;
  label: BilingualText;
}

/**
 * A fully-resolved question ready for the UI to display.
 * Extends the concept of the existing MathProblem with bilingual
 * text, visual assets, and step-by-step solution.
 */
export interface RichQuestion {
  /** Template that generated this question. */
  templateId: string;
  /** The actual question sentence in both languages. */
  question: BilingualText;
  correctAnswer: number;
  /** Multiple-choice options (if template generates them). */
  choices?: number[];
  /**
   * Step-by-step solution explanation in both languages,
   * useful for showing kids how to reach the answer.
   */
  steps: BilingualText[];
  hint?: BilingualText;
  /** Sprites / images to render alongside the question. */
  assets: QuestionAsset[];
  difficulty: MathDifficulty;
  category: QuestionCategory;
  /** Time limit in seconds. */
  timeLimit: number;
  /** Which grade config was used to build this question. */
  classConfigId: GradeId;
}

export type QuestionCategory = 'store' | 'battle' | 'catch' | 'exploration';

// ─── Template internals ───────────────────────────────────────────────────────

/**
 * Snapshot of Pokemon-world data consumed by templates.
 * Pre-filtered to items/pokemon/moves that are suitable for questions.
 */
export interface PokemonWorldSnapshot {
  items: StoreItem[];
  pokemon: QuestionPokemon[];
  moves: QuestionMove[];
}

/**
 * Loose bag of named values produced by generateParams()
 * and consumed by solve() inside a QuestionTemplate.
 */
export type TemplateParams = Record<string, number | string | boolean | StoreItem | QuestionPokemon | QuestionMove>;

// ─── Kid profile ──────────────────────────────────────────────────────────────

/** A single student / child linked to one ClassConfig. */
export interface KidProfile {
  id: string;
  name: BilingualText;
  classConfigId: GradeId;
  /** Unix timestamp (ms). */
  createdAt: number;
}
