/**
 * QuestionBuilder.ts
 *
 * Fluent builder for constructing RichQuestions.
 *
 * Design pattern: Builder
 * ───────────────────────
 * Callers chain setter methods to configure the build context, then
 * call .build() which delegates to the resolved template.
 *
 * Usage:
 *   import { QuestionBuilder } from './QuestionBuilder.js';
 *   import { buildSnapshot } from './PokemonWorldContext.js';
 *   import { getClassConfig } from './ClassConfig.js';
 *
 *   const question = new QuestionBuilder()
 *     .withConfig(getClassConfig('grade3'))
 *     .withSnapshot(buildSnapshot())
 *     .withCategory('store')          // optional — any category if omitted
 *     .withTemplateId('store.two-items-total') // optional — random if omitted
 *     .build();
 */

import type { ClassConfig, PokemonWorldSnapshot, QuestionCategory, RichQuestion } from './types.js';
import type { QuestionTemplate } from './QuestionTemplate.js';
import { registry } from './TemplateRegistry.js';

export class QuestionBuilder {
  private _config: ClassConfig | null = null;
  private _snapshot: PokemonWorldSnapshot | null = null;
  private _category: QuestionCategory | null = null;
  private _templateId: string | null = null;

  // ── Fluent setters ─────────────────────────────────────────────────────────

  /** Set the class / grade configuration to use. (Required) */
  withConfig(config: ClassConfig): this {
    this._config = config;
    return this;
  }

  /** Set the Pokemon-world data snapshot. (Required) */
  withSnapshot(snapshot: PokemonWorldSnapshot): this {
    this._snapshot = snapshot;
    return this;
  }

  /**
   * Filter to a specific category ('store' | 'battle' | 'catch' | 'exploration').
   * If omitted, a random compatible template is chosen from any category.
   */
  withCategory(category: QuestionCategory): this {
    this._category = category;
    return this;
  }

  /**
   * Pin a specific template by its id.
   * If omitted, a random compatible template is chosen.
   */
  withTemplateId(id: string): this {
    this._templateId = id;
    return this;
  }

  // ── Build ──────────────────────────────────────────────────────────────────

  /** Build and return a single RichQuestion. Throws if required fields are missing. */
  build(): RichQuestion {
    const config = this._requireConfig();
    const snapshot = this._requireSnapshot();
    const template = this._resolveTemplate(config);
    return template.build(snapshot, config);
  }

  /**
   * Build `count` questions in a row. Each question is independently generated
   * (with a new random template if no templateId is pinned).
   */
  buildMany(count: number): RichQuestion[] {
    const config = this._requireConfig();
    const snapshot = this._requireSnapshot();
    const questions: RichQuestion[] = [];

    for (let i = 0; i < count; i++) {
      const template = this._resolveTemplate(config);
      questions.push(template.build(snapshot, config));
    }

    return questions;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _requireConfig(): ClassConfig {
    if (!this._config) {
      throw new Error('[QuestionBuilder] Call .withConfig(classConfig) before .build().');
    }
    return this._config;
  }

  private _requireSnapshot(): PokemonWorldSnapshot {
    if (!this._snapshot) {
      throw new Error('[QuestionBuilder] Call .withSnapshot(snapshot) before .build().');
    }
    return this._snapshot;
  }

  private _resolveTemplate(config: ClassConfig): QuestionTemplate {
    if (this._templateId) {
      return registry.get(this._templateId);
    }
    return registry.pickRandom(config, this._category ?? undefined);
  }
}
