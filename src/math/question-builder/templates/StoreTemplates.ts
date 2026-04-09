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
 *      Grade 3-5 · ops: ×, +
 *      "You need {q1} Potions and {q2} Antidotes. How much total?"
 *
 *   4. BudgetRemainingTemplate     ("store.budget-remaining")
 *      Grade 3-5 · ops: ×, -
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
    const affordable = snapshot.items.filter(
      i => i.price <= config.numberRange.max,
    );
    const item = this.pickRandom(affordable.length > 0 ? affordable : snapshot.items);
    const maxQty = Math.min(10, Math.floor(config.numberRange.max / item.price));
    const qty = this.randInt(2, Math.max(2, maxQty));
    return { item, qty };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const item = params.item as StoreItem;
    const qty = params.qty as number;
    const answer = item.price * qty;

    return {
      answer,
      steps: [
        {
          en: `${qty} × ${formatPrice(item.price)} = ${formatPrice(answer)}`,
          he: `${qty} × ${formatPrice(item.price)} = ${formatPrice(answer)}`,
        },
      ],
      hint: {
        en: `Multiply the price by the quantity.`,
        he: `הכפל את המחיר בכמות.`,
      },
      assets: [itemAsset(item)],
      distractors: [answer - item.price, answer + item.price, answer * 2],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const item = params.item as StoreItem;
    const qty = params.qty as number;
    return {
      en: `1 ${item.name.en} costs ${formatPrice(item.price)}.\nHow much do ${qty} ${item.name.en}s cost?`,
      he: `${item.name.he} אחד עולה ${formatPrice(item.price)}.\nכמה עולים ${qty} ${item.name.he}?`,
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
    const cheap = snapshot.items.filter(i => i.price * 2 <= config.numberRange.max);
    const item = this.pickRandom(cheap.length > 0 ? cheap : snapshot.items);
    const maxBuyable = Math.min(10, Math.floor(config.numberRange.max / item.price));
    const buyable = this.randInt(2, Math.max(2, maxBuyable)); // how many they CAN buy
    const budget = item.price * buyable + this.randInt(0, item.price - 1); // may have remainder
    return { item, budget };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const item = params.item as StoreItem;
    const budget = params.budget as number;
    const answer = Math.floor(budget / item.price);
    const remainder = budget - answer * item.price;

    const steps: BilingualText[] = [
      {
        en: `${formatPrice(budget)} ÷ ${formatPrice(item.price)} = ${answer} remainder ${formatPrice(remainder)}`,
        he: `${formatPrice(budget)} ÷ ${formatPrice(item.price)} = ${answer} שארית ${formatPrice(remainder)}`,
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
      distractors: [answer - 1, answer + 1, Math.ceil(budget / item.price)],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const item = params.item as StoreItem;
    const budget = params.budget as number;
    return {
      en: `You have ${formatPrice(budget)}.\nEach ${item.name.en} costs ${formatPrice(item.price)}.\nHow many ${item.name.en}s can you buy?`,
      he: `יש לך ${formatPrice(budget)}.\nכל ${item.name.he} עולה ${formatPrice(item.price)}.\nכמה ${item.name.he} תוכל לקנות?`,
    };
  }
}

// ─── 3. TwoItemsTotalTemplate ─────────────────────────────────────────────────

/**
 * "You need {q1} {item1}s and {q2} {item2}s. How much total?"
 * Answer: item1.price × q1 + item2.price × q2
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
    const usable = snapshot.items.filter(i => i.price * 2 <= config.numberRange.max);
    const pool = usable.length >= 2 ? usable : snapshot.items;
    const item1 = this.pickRandom(pool);
    const item2 = this.pickRandom(pool.filter(i => i.id !== item1.id));
    const maxQ = Math.min(5, Math.floor(config.numberRange.max / Math.max(item1.price, item2.price)));
    const q1 = this.randInt(1, Math.max(1, maxQ));
    const q2 = this.randInt(1, Math.max(1, maxQ));
    return { item1, item2, q1, q2 };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const item1 = params.item1 as StoreItem;
    const item2 = params.item2 as StoreItem;
    const q1 = params.q1 as number;
    const q2 = params.q2 as number;
    const cost1 = item1.price * q1;
    const cost2 = item2.price * q2;
    const answer = cost1 + cost2;

    return {
      answer,
      steps: [
        {
          en: `${item1.name.en}: ${q1} × ${formatPrice(item1.price)} = ${formatPrice(cost1)}`,
          he: `${item1.name.he}: ${q1} × ${formatPrice(item1.price)} = ${formatPrice(cost1)}`,
        },
        {
          en: `${item2.name.en}: ${q2} × ${formatPrice(item2.price)} = ${formatPrice(cost2)}`,
          he: `${item2.name.he}: ${q2} × ${formatPrice(item2.price)} = ${formatPrice(cost2)}`,
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
      distractors: [answer - item1.price, answer + item2.price, cost1 + cost2 + item1.price],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const item1 = params.item1 as StoreItem;
    const item2 = params.item2 as StoreItem;
    const q1 = params.q1 as number;
    const q2 = params.q2 as number;
    return {
      en: `You need ${q1} ${item1.name.en}${q1 > 1 ? 's' : ''} (${formatPrice(item1.price)} each)\nand ${q2} ${item2.name.en}${q2 > 1 ? 's' : ''} (${formatPrice(item2.price)} each).\nHow much will you pay in total?`,
      he: `אתה צריך ${q1} ${item1.name.he} (${formatPrice(item1.price)} כל אחד)\nו-${q2} ${item2.name.he} (${formatPrice(item2.price)} כל אחד).\nכמה תשלם בסך הכל?`,
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
    const usable = snapshot.items.filter(i => i.price * 2 <= config.numberRange.max);
    const item = this.pickRandom(usable.length > 0 ? usable : snapshot.items);
    const maxQty = Math.min(8, Math.floor(config.numberRange.max / item.price));
    const qty = this.randInt(1, Math.max(1, maxQty));
    const spent = item.price * qty;
    const leftover = this.randInt(1, Math.min(config.numberRange.max, spent));
    const budget = spent + leftover;
    return { item, qty, budget };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const item = params.item as StoreItem;
    const qty = params.qty as number;
    const budget = params.budget as number;
    const spent = item.price * qty;
    const answer = budget - spent;

    return {
      answer,
      steps: [
        {
          en: `Spent: ${qty} × ${formatPrice(item.price)} = ${formatPrice(spent)}`,
          he: `הוצאה: ${qty} × ${formatPrice(item.price)} = ${formatPrice(spent)}`,
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
      distractors: [answer - item.price, answer + item.price, budget + spent],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const item = params.item as StoreItem;
    const qty = params.qty as number;
    const budget = params.budget as number;
    return {
      en: `You have ${formatPrice(budget)}.\nYou buy ${qty} ${item.name.en}${qty > 1 ? 's' : ''} at ${formatPrice(item.price)} each.\nHow much money do you have left?`,
      he: `יש לך ${formatPrice(budget)}.\nאתה קונה ${qty} ${item.name.he} ב-${formatPrice(item.price)} כל אחד.\nכמה כסף נשאר לך?`,
    };
  }
}
