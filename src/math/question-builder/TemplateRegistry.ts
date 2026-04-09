/**
 * TemplateRegistry.ts
 *
 * Central registry for all QuestionTemplates.
 *
 * Design patterns: Registry (singleton) + Iterator
 * ─────────────────────────────────────────────────
 * A single shared instance holds all registered templates.
 * Teachers / admins can add or remove templates at runtime so the
 * question pool can be tailored without redeploying.
 *
 * Usage:
 *   import { registry } from './TemplateRegistry.js';
 *   registry.register(new SingleItemCostTemplate());
 *   const templates = registry.forConfig(grade3Config);
 */

import type { ClassConfig } from './types.js';
import type { QuestionTemplate } from './QuestionTemplate.js';

export class TemplateRegistry {
  private readonly _templates = new Map<string, QuestionTemplate>();

  // ── Mutation ──────────────────────────────────────────────────────────────

  /**
   * Register a template.  If a template with the same id already exists
   * it is silently replaced (allows hot-reloading during development).
   */
  register(template: QuestionTemplate): this {
    this._templates.set(template.id, template);
    return this; // fluent — allows chaining register() calls
  }

  /**
   * Register multiple templates at once (convenience overload).
   * Returns `this` for chaining.
   */
  registerAll(templates: QuestionTemplate[]): this {
    for (const t of templates) this.register(t);
    return this;
  }

  /**
   * Remove a template by id.
   * @returns true if the template existed and was removed.
   */
  unregister(id: string): boolean {
    return this._templates.delete(id);
  }

  /** Remove all registered templates. Useful in tests. */
  clear(): void {
    this._templates.clear();
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  /** Look up a single template by id (throws if not found). */
  get(id: string): QuestionTemplate {
    const t = this._templates.get(id);
    if (!t) throw new Error(`[TemplateRegistry] Template "${id}" not found.`);
    return t;
  }

  /** Return all templates that are compatible with the given ClassConfig. */
  forConfig(config: ClassConfig): QuestionTemplate[] {
    return [...this._templates.values()].filter(t => t.isCompatibleWith(config));
  }

  /** Return all templates in a specific category (optionally filtered by config). */
  forCategory(
    category: QuestionTemplate['category'],
    config?: ClassConfig,
  ): QuestionTemplate[] {
    const all = config ? this.forConfig(config) : [...this._templates.values()];
    return all.filter(t => t.category === category);
  }

  /** Return all registered template ids. */
  ids(): string[] {
    return [...this._templates.keys()];
  }

  /** How many templates are registered. */
  get size(): number {
    return this._templates.size;
  }

  // ── Random selection ───────────────────────────────────────────────────────

  /**
   * Pick one random template that is compatible with the given config.
   * Optionally restrict to a category.
   * Throws if no compatible templates are found.
   */
  pickRandom(config: ClassConfig, category?: QuestionTemplate['category']): QuestionTemplate {
    const pool = category ? this.forCategory(category, config) : this.forConfig(config);
    if (pool.length === 0) {
      throw new Error(
        `[TemplateRegistry] No templates available for config "${config.id}"` +
        (category ? ` in category "${category}"` : '') + '.',
      );
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

// ─── Shared singleton ─────────────────────────────────────────────────────────

/**
 * The application-wide template registry.
 * Import and call `registry.register(...)` to add templates.
 * The QuestionBuilder and QuestionFactory both use this instance.
 */
export const registry = new TemplateRegistry();
