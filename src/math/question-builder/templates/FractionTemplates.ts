/**
 * FractionTemplates.ts
 *
 * Question templates that teach fractional thinking using Pokémon-world context.
 * All questions are designed to give intuitive visual meaning to fractions
 * (e.g. "half your HP", "a quarter of your budget") so kids build number sense,
 * not just symbol manipulation.
 *
 * Templates in this file:
 *
 *   1. FractionOfHPTemplate          ("fraction.hp-fraction")
 *      Grade 4-6 · ops: ×, ÷
 *      "{pokemon} has {hp} HP.  A move deals {num}/{den} of its HP as damage.
 *       How much damage is that?"
 *      Fractions: 1/2, 1/4, 3/4, 1/3, 2/3, 1/5, 2/5, 3/5
 *
 *   2. FractionOfBudgetTemplate      ("fraction.budget-fraction")
 *      Grade 4-6 · ops: ×, ÷
 *      "You have {budget}₽.  You spend {num}/{den} of it in the store.
 *       How much did you spend?  How much is left?"
 *      Always generates budgets that divide evenly.
 *
 *   3. FractionHealSumTemplate       ("fraction.heal-sum")
 *      Grade 5-6 · ops: ÷
 *      A Pokémon Center report: two Pokemon each got a fraction of the HP healed.
 *      "How much did they get together?"  — same denominator (3, 5, 10).
 *
 *   4. FractionItemSplitTemplate     ("fraction.item-split")
 *      Grade 4-6 · ops: ÷
 *      "You and your {n} friends share {total} {items} equally.
 *       How many does each person get?"
 *      Bridges whole-number division → fractions (total/n).
 */

import { QuestionTemplate, type SolveResult } from '../QuestionTemplate.js';
import type {
  BilingualText,
  ClassConfig,
  PokemonWorldSnapshot,
  QuestionAsset,
  QuestionPokemon,
  StoreItem,
  TemplateParams,
} from '../types.js';

// ─── Fraction type ────────────────────────────────────────────────────────────

interface Fraction { num: number; den: number; }

/** All "nice" fractions used in these templates. */
const FRACTIONS: Fraction[] = [
  { num: 1, den: 2 },
  { num: 1, den: 4 },
  { num: 3, den: 4 },
  { num: 1, den: 3 },
  { num: 2, den: 3 },
  { num: 1, den: 5 },
  { num: 2, den: 5 },
  { num: 3, den: 5 },
];

/** Simpler fractions for grades 4–5. */
const SIMPLE_FRACTIONS: Fraction[] = [
  { num: 1, den: 2 },
  { num: 1, den: 4 },
  { num: 3, den: 4 },
];

function fmtFrac({ num, den }: Fraction): string {
  return `${num}/${den}`;
}

function fmtFracHe({ num, den }: Fraction): string {
  return `${num}/${den}`;   // numerals are the same; context words differ in the question
}

function applyFrac(whole: number, { num, den }: Fraction): number {
  return Math.floor((whole * num) / den);
}

/** Pick a multiple of `den` that fits in [min, max]. */
function multipleOf(den: number, min: number, max: number, rng: (a: number, b: number) => number): number {
  const loMultiple = Math.ceil(min / den);
  const hiMultiple = Math.floor(max / den);
  if (loMultiple > hiMultiple) return den * loMultiple; // fallback
  return den * rng(loMultiple, hiMultiple);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pokemonAsset(p: QuestionPokemon): QuestionAsset {
  return { kind: 'pokemon', id: p.id, spriteUrl: p.spriteUrl, label: p.name };
}

function itemAsset(item: StoreItem): QuestionAsset {
  return { kind: 'item', id: item.id, spriteUrl: item.spriteUrl, label: item.name };
}

// ─── 1. FractionOfHPTemplate ─────────────────────────────────────────────────

/**
 * "A move deals {num}/{den} of {pokemon}'s HP as damage. How much is that?"
 * HP is always a clean multiple of den so the answer is a whole number.
 */
export class FractionOfHPTemplate extends QuestionTemplate {
  readonly id = 'fraction.hp-fraction';
  readonly name: BilingualText = { en: 'Fraction of HP as Damage', he: 'שבר מ-HP כנזק' };
  readonly category = 'battle' as const;
  readonly requiredOperations = ['×', '÷'] as const;
  readonly minDifficulty = 3 as const;
  readonly maxDifficulty = 6 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const pool = config.allowFractions ? FRACTIONS : SIMPLE_FRACTIONS;
    const frac = this.pickRandom(pool);
    const pokemon = this.pickRandom(snapshot.pokemon);

    // HP must be divisible by den so answer is integer
    const hp = multipleOf(frac.den, Math.max(frac.den, config.numberRange.min), config.numberRange.max, this.randInt.bind(this));

    return { pokemon, frac, hp };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const pokemon = params.pokemon as QuestionPokemon;
    const frac    = params.frac    as Fraction;
    const hp      = params.hp      as number;
    const answer  = applyFrac(hp, frac);
    const perPart = hp / frac.den;

    return {
      answer,
      steps: [
        {
          en: `${fmtFrac(frac)} of ${hp} HP`,
          he: `${fmtFracHe(frac)} מתוך ${hp} נקודות HP`,
        },
        {
          en: `Step 1 – divide by denominator: ${hp} ÷ ${frac.den} = ${perPart}`,
          he: `שלב 1 – חלק במכנה: ${hp} ÷ ${frac.den} = ${perPart}`,
        },
        {
          en: `Step 2 – multiply by numerator: ${perPart} × ${frac.num} = ${answer}`,
          he: `שלב 2 – כפול במונה: ${perPart} × ${frac.num} = ${answer}`,
        },
      ],
      hint: {
        en: `To find a fraction of a number: divide by the bottom number first, then multiply by the top.`,
        he: `למצוא שבר של מספר: חלק במספר התחתון (המכנה), ואז כפול במספר העליון (המונה).`,
      },
      assets: [pokemonAsset(pokemon)],
      distractors: [
        applyFrac(hp, { num: frac.num, den: frac.den === 2 ? 4 : 2 }),
        hp - answer,
        hp * frac.num,
      ],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const pokemon = params.pokemon as QuestionPokemon;
    const frac    = params.frac    as Fraction;
    const hp      = params.hp      as number;
    return {
      en: `${pokemon.name.en} has ${hp} HP.\n` +
          `A super-powered move deals ${fmtFrac(frac)} of its HP as damage.\n` +
          `How much HP damage is dealt?`,
      he: `ל-${pokemon.name.he} יש ${hp} נקודות HP.\n` +
          `מהלך עוצמתי גורם ${fmtFracHe(frac)} מה-HP שלו כנזק.\n` +
          `כמה נזק נגרם?`,
    };
  }
}

// ─── 2. FractionOfBudgetTemplate ─────────────────────────────────────────────

/**
 * "You have {budget}₽.  You spend {num}/{den} of it. How much did you spend?
 *  And how much is left?"
 *
 * Renders as TWO separate sub-questions — both answers printed in steps.
 * The `correctAnswer` is the amount spent; the "left" amount is in the steps.
 */
export class FractionOfBudgetTemplate extends QuestionTemplate {
  readonly id = 'fraction.budget-fraction';
  readonly name: BilingualText = { en: 'Fraction of Budget Spent', he: 'שבר מהתקציב שהוצא' };
  readonly category = 'store' as const;
  readonly requiredOperations = ['×', '÷'] as const;
  readonly minDifficulty = 3 as const;
  readonly maxDifficulty = 5 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const pool = config.allowFractions ? FRACTIONS : SIMPLE_FRACTIONS;
    const frac = this.pickRandom(pool);

    // Budget is a clean multiple of den
    const budget = multipleOf(frac.den, Math.max(frac.den * 100, config.numberRange.min), config.numberRange.max, this.randInt.bind(this));

    // Pick a random item to give context (not used in math, just for visual)
    const item = this.pickRandom(snapshot.items);

    return { frac, budget, item };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const frac   = params.frac   as Fraction;
    const budget = params.budget as number;
    const item   = params.item   as StoreItem;
    const spent  = applyFrac(budget, frac);
    const left   = budget - spent;
    const perPart = budget / frac.den;

    return {
      answer: spent,
      steps: [
        {
          en: `${fmtFrac(frac)} of ${budget}₽`,
          he: `${fmtFracHe(frac)} מתוך ${budget}₽`,
        },
        {
          en: `Step 1 – ${budget}₽ ÷ ${frac.den} = ${perPart}₽  (one part)`,
          he: `שלב 1 – ${budget}₽ ÷ ${frac.den} = ${perPart}₽  (חלק אחד)`,
        },
        {
          en: `Step 2 – ${perPart}₽ × ${frac.num} = ${spent}₽  (spent)`,
          he: `שלב 2 – ${perPart}₽ × ${frac.num} = ${spent}₽  (הוצאת)`,
        },
        {
          en: `Remaining: ${budget}₽ − ${spent}₽ = ${left}₽`,
          he: `נותר: ${budget}₽ − ${spent}₽ = ${left}₽`,
        },
      ],
      hint: {
        en: `Divide your budget by the bottom number, then multiply by the top number.`,
        he: `חלק את התקציב במכנה, ואז כפול במונה.`,
      },
      assets: [itemAsset(item)],
      distractors: [left, applyFrac(budget, { num: 1, den: frac.den }), budget - applyFrac(budget, SIMPLE_FRACTIONS[0])],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const frac   = params.frac   as Fraction;
    const budget = params.budget as number;
    const item   = params.item   as StoreItem;
    return {
      en: `You have ${budget}₽ to spend in the Poké Store.\n` +
          `You spend ${fmtFrac(frac)} of your money on ${item.name.en}.\n` +
          `How much did you spend?`,
      he: `יש לך ${budget}₽ לבזבז בחנות הפוקה.\n` +
          `אתה מוציא ${fmtFracHe(frac)} מהכסף שלך על ${item.name.he}.\n` +
          `כמה הוצאת?`,
    };
  }
}

// ─── 3. FractionHealSumTemplate ──────────────────────────────────────────────

/**
 * Kid-friendly denominators for the heal report. The two parts always add up to
 * less than the whole (a + c < den) so the answer is never the total itself —
 * which is why 2 isn't here (1/2 + 1/2 is the whole).
 */
const HEAL_SUM_DENS = [3, 5, 10];

/**
 * "The Pokémon Center report: {heal} HP were healed today.
 *  {pokemon1} got {a}/{den} of it, {pokemon2} got {c}/{den} of it.
 *  How much HP did they get together?"
 *
 * Both fractions share one denominator and add up to less than the whole,
 * so the answer is unambiguous: heal × a/den + heal × c/den.
 */
export class FractionHealSumTemplate extends QuestionTemplate {
  readonly id = 'fraction.heal-sum';
  readonly name: BilingualText = { en: 'Add Fractions (Heal Report)', he: 'חיבור שברים (דוח ריפוי)' };
  readonly category = 'exploration' as const;
  readonly requiredOperations = ['÷'] as const;
  readonly minDifficulty = 4 as const;
  readonly maxDifficulty = 6 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const den = this.pickRandom(HEAL_SUM_DENS);
    const num1 = this.randInt(1, den - 2);
    const num2 = this.randInt(1, den - 1 - num1);
    const frac1: Fraction = { num: num1, den };
    const frac2: Fraction = { num: num2, den };

    // Total heal must be divisible by den
    const heal = multipleOf(den, Math.max(den * 10, config.numberRange.min), config.numberRange.max, this.randInt.bind(this));

    const p1 = this.pickRandom(snapshot.pokemon);
    const p2 = this.pickRandom(snapshot.pokemon.filter(p => p.id !== p1.id));

    return { p1, p2, frac1, frac2, heal };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const p1    = params.p1    as QuestionPokemon;
    const p2    = params.p2    as QuestionPokemon;
    const frac1 = params.frac1 as Fraction;
    const frac2 = params.frac2 as Fraction;
    const heal  = params.heal  as number;

    const heal1  = applyFrac(heal, frac1);
    const heal2  = applyFrac(heal, frac2);
    const answer = heal1 + heal2;
    const unit   = heal / frac1.den;

    return {
      answer,
      steps: [
        {
          en: `1/${frac1.den} of ${heal} = ${heal} ÷ ${frac1.den} = ${unit} HP`,
          he: `1/${frac1.den} מתוך ${heal} = ${heal} ÷ ${frac1.den} = ${unit} נקודות חיים`,
        },
        {
          en: `${p1.name.en}: ${fmtFrac(frac1)} = ${frac1.num} × ${unit} = ${heal1} HP`,
          he: `${p1.name.he}: ${fmtFracHe(frac1)} = ${frac1.num} × ${unit} = ${heal1} נקודות חיים`,
        },
        {
          en: `${p2.name.en}: ${fmtFrac(frac2)} = ${frac2.num} × ${unit} = ${heal2} HP`,
          he: `${p2.name.he}: ${fmtFracHe(frac2)} = ${frac2.num} × ${unit} = ${heal2} נקודות חיים`,
        },
        {
          en: `Together: ${heal1} + ${heal2} = ${answer} HP`,
          he: `ביחד: ${heal1} + ${heal2} = ${answer} נקודות חיים`,
        },
      ],
      hint: {
        en: `Divide ${heal} by ${frac1.den} to find one part, then count the parts of both Pokémon.`,
        he: `חלקו את ${heal} ב-${frac1.den} כדי למצוא חלק אחד, ואז ספרו את החלקים של שני הפוקימונים.`,
      },
      assets: [pokemonAsset(p1), pokemonAsset(p2)],
      distractors: [Math.max(heal1, heal2), Math.abs(heal1 - heal2), heal - answer].filter(d => d > 0),
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const p1    = params.p1    as QuestionPokemon;
    const p2    = params.p2    as QuestionPokemon;
    const frac1 = params.frac1 as Fraction;
    const frac2 = params.frac2 as Fraction;
    const heal  = params.heal  as number;
    return {
      en: `Pokémon Center report: ${heal} HP were healed today.
` +
          `${p1.name.en} got ${fmtFrac(frac1)} of it.
` +
          `${p2.name.en} got ${fmtFrac(frac2)} of it.
` +
          `How much HP did ${p1.name.en} and ${p2.name.en} get TOGETHER?`,
      he: `דוח ממרכז הפוקימונים: היום רופאו ${heal} נקודות חיים.
` +
          `${p1.name.he} קיבל ${fmtFracHe(frac1)} מהן.
` +
          `${p2.name.he} קיבל ${fmtFracHe(frac2)} מהן.
` +
          `כמה נקודות חיים קיבלו ${p1.name.he} ו${p2.name.he} ביחד?`,
    };
  }
}

// ─── 4. FractionItemSplitTemplate ────────────────────────────────────────────

/**
 * "You and your {partners} friends have {total} {items} — share them equally.
 *  How many does each trainer get?"
 *
 * Answer is always a whole number.  Bridges division ↔ fractions: each trainer
 * gets (total ÷ people) = (1/people) of the total.
 * The hint explicitly draws out the fraction language.
 */
export class FractionItemSplitTemplate extends QuestionTemplate {
  readonly id = 'fraction.item-split';
  readonly name: BilingualText = { en: 'Fair Share (Fractions as Division)', he: 'חלוקה שווה (שבר כחלוקה)' };
  readonly category = 'store' as const;
  readonly requiredOperations = ['÷'] as const;
  readonly minDifficulty = 3 as const;
  readonly maxDifficulty = 5 as const;

  // Number of people in the sharing group (2–5)
  private readonly PEOPLE_OPTIONS = [2, 3, 4, 5] as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const people = this.pickRandom([...this.PEOPLE_OPTIONS]);
    // Total must be divisible by people and within the range
    const total = multipleOf(people, Math.max(people * 2, config.numberRange.min), config.numberRange.max, this.randInt.bind(this));
    const item = this.pickRandom(snapshot.items);
    const partners = people - 1; // "you and N friends" = people total
    return { people, partners, total, item };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const people = params.people as number;
    const total  = params.total  as number;
    const item     = params.item     as StoreItem;
    const answer   = total / people;

    return {
      answer,
      steps: [
        {
          en: `${total} items ÷ ${people} trainers = ${answer} each`,
          he: `${total} פריטים ÷ ${people} מאמנים = ${answer} לכל אחד`,
        },
        {
          en: `In fraction language: each trainer gets 1/${people} of ${total} = ${answer}`,
          he: `בשפת השברים: כל מאמן מקבל 1/${people} מתוך ${total} = ${answer}`,
        },
      ],
      hint: {
        en: `Dividing by ${people} is the same as finding 1/${people} of the total.`,
        he: `לחלק ב-${people} זה אותו דבר כמו למצוא 1/${people} מהסכום.`,
      },
      assets: [itemAsset(item)],
      distractors: [
        total / Math.max(1, people - 1),
        total / (people + 1),
        answer * 2,
      ].map(n => Math.floor(n)),
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const people   = params.people   as number;
    const partners = people - 1;
    const total    = params.total    as number;
    const item     = params.item     as StoreItem;
    return {
      en: `You and ${partners} friend${partners > 1 ? 's' : ''} found ${total} ${item.name.en}s.\n` +
          `You decide to share them equally between all ${people} trainers.\n` +
          `How many ${item.name.en}s does each trainer get?`,
      he: `אתה ו-${partners} חבר${partners > 1 ? 'ים' : ''} מצאתם ${total} ${item.name.he}.\n` +
          `החלטתם לחלק אותם שווה בשווה בין ${people} המאמנים.\n` +
          `כמה ${item.name.he} מקבל כל מאמן?`,
    };
  }
}
