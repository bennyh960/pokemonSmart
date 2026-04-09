/**
 * index.ts  —  Public API for the question-builder system.
 *
 * This module:
 *   1. Registers all built-in templates into the shared registry.
 *   2. Exports the QuestionFactory for quick one-liner question generation.
 *   3. Re-exports key primitives so callers only need one import.
 *
 * Quick-start example:
 * ─────────────────────
 *   import { QuestionFactory } from './question-builder/index.js';
 *
 *   // Generate one random question for a Grade 3 student
 *   const q = QuestionFactory.one('grade3');
 *   console.log(q.question.he);   // Hebrew question text
 *   console.log(q.correctAnswer); // numeric answer
 *   console.log(q.assets);        // sprites to render
 *
 * Advanced (fluent builder) example:
 * ────────────────────────────────────
 *   import { QuestionBuilder, buildSnapshot, getClassConfig } from './question-builder/index.js';
 *
 *   const q = new QuestionBuilder()
 *     .withConfig(getClassConfig('grade4'))
 *     .withSnapshot(buildSnapshot({ maxPokemonId: 151 }))
 *     .withCategory('battle')
 *     .withTemplateId('battle.stab-bonus')
 *     .build();
 */

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type {
  BilingualText,
  ClassConfig,
  GradeId,
  KidProfile,
  PokemonWorldSnapshot,
  QuestionAsset,
  QuestionCategory,
  QuestionMove,
  QuestionPokemon,
  RichQuestion,
  StoreItem,
  TemplateParams,
} from './types.js';

export { GRADE_CONFIGS, getClassConfig, createCustomConfig, listGrades, registerCustomConfig, removeCustomConfig } from './ClassConfig.js';
export { registry, TemplateRegistry } from './TemplateRegistry.js';
export { QuestionTemplate } from './QuestionTemplate.js';
export { QuestionBuilder } from './QuestionBuilder.js';
export { buildSnapshot } from './PokemonWorldContext.js';

// Store templates
export { SingleItemCostTemplate, MaxItemsBudgetTemplate, TwoItemsTotalTemplate, BudgetRemainingTemplate } from './templates/StoreTemplates.js';
// Battle templates
export { BasicDamageTemplate, AttackFormulaDamageTemplate, STABBonusTemplate, MoveEffectivenessTemplate } from './templates/BattleTemplates.js';
// Catch templates
export { PokeBallsNeededTemplate, HPReductionTemplate, CatchCostTemplate } from './templates/CatchTemplates.js';
// Fraction templates
export { FractionOfHPTemplate, FractionOfBudgetTemplate, FractionCompareTemplate, FractionItemSplitTemplate } from './templates/FractionTemplates.js';

// ─── Auto-registration of built-in templates ──────────────────────────────────

import { registry as _registry } from './TemplateRegistry.js';

import { SingleItemCostTemplate, MaxItemsBudgetTemplate, TwoItemsTotalTemplate, BudgetRemainingTemplate } from './templates/StoreTemplates.js';
import { BasicDamageTemplate, AttackFormulaDamageTemplate, STABBonusTemplate, MoveEffectivenessTemplate } from './templates/BattleTemplates.js';
import { PokeBallsNeededTemplate, HPReductionTemplate, CatchCostTemplate } from './templates/CatchTemplates.js';
import { FractionOfHPTemplate, FractionOfBudgetTemplate, FractionCompareTemplate, FractionItemSplitTemplate } from './templates/FractionTemplates.js';

_registry.registerAll([
  // Store
  new SingleItemCostTemplate(),
  new MaxItemsBudgetTemplate(),
  new TwoItemsTotalTemplate(),
  new BudgetRemainingTemplate(),
  // Battle
  new BasicDamageTemplate(),
  new AttackFormulaDamageTemplate(),
  new STABBonusTemplate(),
  new MoveEffectivenessTemplate(),
  // Catch
  new PokeBallsNeededTemplate(),
  new HPReductionTemplate(),
  new CatchCostTemplate(),
  // Fractions
  new FractionOfHPTemplate(),
  new FractionOfBudgetTemplate(),
  new FractionCompareTemplate(),
  new FractionItemSplitTemplate(),
]);

// ─── QuestionFactory ──────────────────────────────────────────────────────────

import { QuestionBuilder } from './QuestionBuilder.js';
import { buildSnapshot } from './PokemonWorldContext.js';
import { getClassConfig } from './ClassConfig.js';
import type { GradeId, QuestionCategory, RichQuestion } from './types.js';

/**
 * Convenience factory — no builder boilerplate needed for the common cases.
 *
 * All methods use the shared registry and a default snapshot (Gen 1+2 Pokemon,
 * items with price ≤ 5000₽, moves with power ≥ 20).
 */
export const QuestionFactory = {
  /**
   * Generate one random question for the given grade.
   * Optionally restrict to a specific category.
   */
  one(gradeId: GradeId, category?: QuestionCategory): RichQuestion {
    const builder = new QuestionBuilder()
      .withConfig(getClassConfig(gradeId))
      .withSnapshot(buildSnapshot());

    if (category) builder.withCategory(category);
    return builder.build();
  },

  /**
   * Generate `count` questions for the given grade.
   */
  many(gradeId: GradeId, count: number, category?: QuestionCategory): RichQuestion[] {
    const builder = new QuestionBuilder()
      .withConfig(getClassConfig(gradeId))
      .withSnapshot(buildSnapshot());

    if (category) builder.withCategory(category);
    return builder.buildMany(count);
  },

  /**
   * Generate one question from a specific named template.
   */
  fromTemplate(gradeId: GradeId, templateId: string): RichQuestion {
    return new QuestionBuilder()
      .withConfig(getClassConfig(gradeId))
      .withSnapshot(buildSnapshot())
      .withTemplateId(templateId)
      .build();
  },
} as const;
