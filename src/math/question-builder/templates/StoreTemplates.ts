/**
 * StoreTemplates.ts
 *
 * Question templates themed around the Poké-Store.
 * Templates in this file:
 *
 *   1. SingleItemCostTemplate      ("store.single-item-cost")
 *      Grade 1-3 · ops: × (or repeated +)
 *      "1 Potion costs 300₽. How much do {qty} Potions cost?"
 *
 *   2. MaxItemsBudgetTemplate      ("store.max-items-budget")
 *      Grade 2-4 · ops: ÷
 *      "You have {budget}₽. Each Poké Ball costs 200₽. How many can you buy?"
 *
 *   3. TwoItemsTotalTemplate       ("store.two-items-total")
 *      Grade 2-5 · ops: ×, +
 *      "You need {q1} Potions and {q2} Antidotes. How much total?"
 *
 *   4. BudgetRemainingTemplate     ("store.budget-remaining")
 *      Grade 2-5 · ops: ×, -
 *      "You have {budget}₽. You buy {qty} Poké Balls (200₽ each). How much is left?"
 */

import { QuestionTemplate, type SolveResult } from '../QuestionTemplate.js';
import type {
  BilingualText,
  ClassConfig,
  PokemonWorldSnapshot,
  QuestionAsset,
  StoreItem,
  TemplateParams,
} from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function itemAsset(item: StoreItem): QuestionAsset {
  return { kind: 'item', id: item.id, spriteUrl: item.spriteUrl, label: item.name };
}

function formatPrice(n: number): string {
  return `${n.toLocaleString()}₽`;
}

// ─── Price scaling helper ─────────────────────────────────────────────────────

/**
 * Return a price that fits within the grade's number range.
 * If the real item price is too large for qty=3 to be meaningful,
 * pick a synthetic "lesson price" from nice round numbers instead.
 * The item sprite is still shown — only the displayed price changes.
 */
const LESSON_PRICES = [5, 10, 20, 25, 50, 100, 200] as const;

function effectivePrice(item: StoreItem, config: ClassConfig): number {
  const threshold = Math.floor(config.numberRange.max / 3);
  if (item.price <= threshold) return item.price;
  const valid = (LESSON_PRICES as readonly number[]).filter(p => p <= threshold);
  if (valid.length === 0) return Math.max(5, Math.floor(threshold / 5) * 5);
  return valid[Math.floor(Math.random() * valid.length)];
}

// ─── 1. SingleItemCostTemplate ────────────────────────────────────────────────

/**
 * "1 {item} costs {price}₽. How much do {qty} {item}s cost?"
 * Answer: price × qty
 * Teaches: repeated addition / multiplication.
 */
export class SingleItemCostTemplate extends QuestionTemplate {
  readonly id = 'store.single-item-cost';
  readonly name: BilingualText = {
    en: 'Single Item Cost',
    he: 'עלות פריט יחיד',
  };
  readonly category = 'store' as const;
  readonly requiredOperations = ['×'] as const;
  readonly minDifficulty = 1 as const;
  readonly maxDifficulty = 3 as const;

  protected generateParams(
    snapshot: PokemonWorldSnapshot,
    config: ClassConfig,
  ): TemplateParams {
    const item = this.pickRandom(snapshot.items);
    const price = effectivePrice(item, config);
    const maxQty = Math.min(10, Math.floor(config.numberRange.max / price));
    const qty = this.randInt(2, Math.max(5, maxQty));
    return { item, qty, price };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const item = params.item as StoreItem;
    const qty = params.qty as number;
    const price = params.price as number;
    const answer = price * qty;

    return {
      answer,
      steps: [
        {
          en: `${qty} × ${formatPrice(price)} = ${formatPrice(answer)}`,
          he: `${qty} × ${formatPrice(price)} = ${formatPrice(answer)}`,
        },
      ],
      hint: {
        en: `Multiply the price by the quantity.`,
        he: `הכפל את המחיר בכמות.`,
      },
      assets: [itemAsset(item)],
      distractors: [answer - price, answer + price, answer * 2],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const item = params.item as StoreItem;
    const qty = params.qty as number;
    const price = params.price as number;
    return {
      en: `1 ${item.name.en} costs ${formatPrice(price)}.\nHow much do ${qty} ${item.name.en}s cost?`,
      he: `${item.name.he} אחד עולה ${formatPrice(price)}.\nכמה עולים ${qty} ${item.name.he}?`,
    };
  }
}

// ─── 2. MaxItemsBudgetTemplate ────────────────────────────────────────────────

/**
 * "You have {budget}₽. Each {item} costs {price}₽. How many can you buy?"
 * Answer: Math.floor(budget / price)
 * Teaches: integer division.
 */
export class MaxItemsBudgetTemplate extends QuestionTemplate {
  readonly id = 'store.max-items-budget';
  readonly name: BilingualText = {
    en: 'Max Items in Budget',
    he: 'כמה אפשר לקנות בתקציב?',
  };
  readonly category = 'store' as const;
  readonly requiredOperations = ['÷'] as const;
  readonly minDifficulty = 2 as const;
  readonly maxDifficulty = 4 as const;

  protected generateParams(
    snapshot: PokemonWorldSnapshot,
    config: ClassConfig,
  ): TemplateParams {
    const item = this.pickRandom(snapshot.items);
    const price = effectivePrice(item, config);
    const maxBuyable = Math.min(10, Math.floor(config.numberRange.max / price));
    const buyable = this.randInt(2, Math.max(2, maxBuyable));
    const budget = price * buyable + this.randInt(0, price - 1);
    return { item, budget, price };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const item = params.item as StoreItem;
    const budget = params.budget as number;
    const price = params.price as number;
    const answer = Math.floor(budget / price);
    const remainder = budget - answer * price;

    const steps: BilingualText[] = [
      {
        en: `${formatPrice(budget)} ÷ ${formatPrice(price)} = ${answer} remainder ${formatPrice(remainder)}`,
        he: `${formatPrice(budget)} ÷ ${formatPrice(price)} = ${answer} שארית ${formatPrice(remainder)}`,
      },
    ];

    return {
      answer,
      steps,
      hint: {
        en: `How many times does the price fit in your budget?`,
        he: `כמה פעמים המחיר נכנס לתקציב שלך?`,
      },
      assets: [itemAsset(item)],
      distractors: [answer - 1, answer + 1, Math.ceil(budget / price)],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const item = params.item as StoreItem;
    const budget = params.budget as number;
    const price = params.price as number;
    return {
      en: `You have ${formatPrice(budget)}.\nEach ${item.name.en} costs ${formatPrice(price)}.\nHow many ${item.name.en}s can you buy?`,
      he: `יש לך ${formatPrice(budget)}.\nכל ${item.name.he} עולה ${formatPrice(price)}.\nכמה ${item.name.he} תוכל לקנות?`,
    };
  }
}

// ─── 3. TwoItemsTotalTemplate ─────────────────────────────────────────────────

/**
 * "You need {q1} {item1}s and {q2} {item2}s. How much total?"
 * Answer: price1 × q1 + price2 × q2
 * Teaches: two-step multiplication + addition.
 */
export class TwoItemsTotalTemplate extends QuestionTemplate {
  readonly id = 'store.two-items-total';
  readonly name: BilingualText = {
    en: 'Two-Item Total Cost',
    he: 'עלות שני פריטים',
  };
  readonly category = 'store' as const;
  readonly requiredOperations = ['×', '+'] as const;
  readonly minDifficulty = 2 as const;
  readonly maxDifficulty = 5 as const;

  protected generateParams(
    snapshot: PokemonWorldSnapshot,
    config: ClassConfig,
  ): TemplateParams {
    const items = snapshot.items;
    const item1 = this.pickRandom(items);
    const item2 = this.pickRandom(items.filter(i => i.id !== item1.id));
    const price1 = effectivePrice(item1, config);
    const price2 = effectivePrice(item2, config);
    const maxQ = Math.min(5, Math.floor(config.numberRange.max / Math.max(price1, price2)));
    const q1 = this.randInt(1, Math.max(3, maxQ));
    const q2 = this.randInt(1, Math.max(3, maxQ));
    return { item1, item2, q1, q2, price1, price2 };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const item1 = params.item1 as StoreItem;
    const item2 = params.item2 as StoreItem;
    const q1 = params.q1 as number;
    const q2 = params.q2 as number;
    const price1 = params.price1 as number;
    const price2 = params.price2 as number;
    const cost1 = price1 * q1;
    const cost2 = price2 * q2;
    const answer = cost1 + cost2;

    return {
      answer,
      steps: [
        {
          en: `${item1.name.en}: ${q1} × ${formatPrice(price1)} = ${formatPrice(cost1)}`,
          he: `${item1.name.he}: ${q1} × ${formatPrice(price1)} = ${formatPrice(cost1)}`,
        },
        {
          en: `${item2.name.en}: ${q2} × ${formatPrice(price2)} = ${formatPrice(cost2)}`,
          he: `${item2.name.he}: ${q2} × ${formatPrice(price2)} = ${formatPrice(cost2)}`,
        },
        {
          en: `Total: ${formatPrice(cost1)} + ${formatPrice(cost2)} = ${formatPrice(answer)}`,
          he: `סכום: ${formatPrice(cost1)} + ${formatPrice(cost2)} = ${formatPrice(answer)}`,
        },
      ],
      hint: {
        en: `Calculate each item's total cost separately, then add them together.`,
        he: `חשב את עלות כל פריט בנפרד, ואז חבר את התוצאות.`,
      },
      assets: [itemAsset(item1), itemAsset(item2)],
      distractors: [answer - price1, answer + price2, cost1 + cost2 + price1],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const item1 = params.item1 as StoreItem;
    const item2 = params.item2 as StoreItem;
    const q1 = params.q1 as number;
    const q2 = params.q2 as number;
    const price1 = params.price1 as number;
    const price2 = params.price2 as number;
    return {
      en: `You need ${q1} ${item1.name.en}${q1 > 1 ? 's' : ''} (${formatPrice(price1)} each)\nand ${q2} ${item2.name.en}${q2 > 1 ? 's' : ''} (${formatPrice(price2)} each).\nHow much will you pay in total?`,
      he: `אתה צריך ${q1} ${item1.name.he} (${formatPrice(price1)} כל אחד)\nו-${q2} ${item2.name.he} (${formatPrice(price2)} כל אחד).\nכמה תשלם בסך הכל?`,
    };
  }
}

// ─── 4. BudgetRemainingTemplate ───────────────────────────────────────────────

/**
 * "You have {budget}₽. You buy {qty} {item}s ({price}₽ each). How much is left?"
 * Answer: budget - price × qty
 * Teaches: multiplication then subtraction (two-step).
 */
export class BudgetRemainingTemplate extends QuestionTemplate {
  readonly id = 'store.budget-remaining';
  readonly name: BilingualText = {
    en: 'Budget Remaining After Purchase',
    he: 'כמה נותר אחרי הקנייה?',
  };
  readonly category = 'store' as const;
  readonly requiredOperations = ['×', '-'] as const;
  readonly minDifficulty = 2 as const;
  readonly maxDifficulty = 5 as const;

  protected generateParams(
    snapshot: PokemonWorldSnapshot,
    config: ClassConfig,
  ): TemplateParams {
    const item = this.pickRandom(snapshot.items);
    const price = effectivePrice(item, config);
    const maxQty = Math.min(8, Math.floor(config.numberRange.max / price));
    const qty = this.randInt(1, Math.max(3, maxQty));
    const spent = price * qty;
    const leftover = this.randInt(1, Math.min(config.numberRange.max, spent));
    const budget = spent + leftover;
    return { item, qty, budget, price };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const item = params.item as StoreItem;
    const qty = params.qty as number;
    const budget = params.budget as number;
    const price = params.price as number;
    const spent = price * qty;
    const answer = budget - spent;

    return {
      answer,
      steps: [
        {
          en: `Spent: ${qty} × ${formatPrice(price)} = ${formatPrice(spent)}`,
          he: `הוצאה: ${qty} × ${formatPrice(price)} = ${formatPrice(spent)}`,
        },
        {
          en: `Remaining: ${formatPrice(budget)} − ${formatPrice(spent)} = ${formatPrice(answer)}`,
          he: `נותר: ${formatPrice(budget)} − ${formatPrice(spent)} = ${formatPrice(answer)}`,
        },
      ],
      hint: {
        en: `First find out how much you spend, then subtract from your budget.`,
        he: `ראשית, חפש כמה הוצאת, ואז חסר מהתקציב שלך.`,
      },
      assets: [itemAsset(item)],
      distractors: [answer - price, answer + price, budget + spent],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const item = params.item as StoreItem;
    const qty = params.qty as number;
    const budget = params.budget as number;
    const price = params.price as number;
    return {
      en: `You have ${formatPrice(budget)}.\nYou buy ${qty} ${item.name.en}${qty > 1 ? 's' : ''} at ${formatPrice(price)} each.\nHow much money do you have left?`,
      he: `יש לך ${formatPrice(budget)}.\nאתה קונה ${qty} ${item.name.he} ב-${formatPrice(price)} כל אחד.\nכמה כסף נשאר לך?`,
    };
  }
}
