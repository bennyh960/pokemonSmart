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
 *   3. FractionCompareTemplate       ("fraction.compare")
 *      Grade 5-6 · ops: ÷
 *      Two Pokemon each restore a fraction of a Potion's heal.
 *      "Which restores more HP?"  — teaches fraction comparison by finding
 *      the larger value, not just comparing symbols.
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

function compSymbol(a: number, b: number): string {
  if (a > b) return '>';
  if (a < b) return '<';
  return '=';
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

// ─── 3. FractionCompareTemplate ──────────────────────────────────────────────

/**
 * "Potion heals {healAmount} HP.
 *  {pokemon1} is healed {frac1} of that amount.
 *  {pokemon2} is healed {frac2} of that amount.
 *  Which Pokemon is healed more?"
 *
 * The correctAnswer is the LARGER healed value (kids pick the Pokemon).
 * Teaches fraction comparison through concrete numbers rather than abstract symbols.
 */
export class FractionCompareTemplate extends QuestionTemplate {
  readonly id = 'fraction.compare';
  readonly name: BilingualText = { en: 'Compare Fractions (Heal)', he: 'השוואת שברים (ריפוי)' };
  readonly category = 'exploration' as const;
  readonly requiredOperations = ['÷'] as const;
  readonly minDifficulty = 4 as const;
  readonly maxDifficulty = 6 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    // Pick two different fractions with the same denominator for simpler comparison
    const grouped: Record<number, Fraction[]> = {};
    for (const f of FRACTIONS) {
      const bucket = grouped[f.den];
      if (bucket) { bucket.push(f); } else { grouped[f.den] = [f]; }
    }
    // Pick a denominator that has ≥ 2 fractions
    const validDens = Object.keys(grouped).map(Number).filter(d => grouped[d].length >= 2);
    const den = this.pickRandom(validDens);
    const denFractions = grouped[den].slice().sort(() => Math.random() - 0.5);
    const frac1 = denFractions[0];
    const frac2 = denFractions[1];

    // Total heal must be divisible by den
    const heal = multipleOf(den, Math.max(den * 10, config.numberRange.min), config.numberRange.max, this.randInt.bind(this));

    const p1 = this.pickRandom(snapshot.pokemon);
    const p2 = this.pickRandom(snapshot.pokemon.filter(p => p.id !== p1.id));

    // Find a potion-like item for context
    const potion = snapshot.items.find(i => i.category === 'healing') ?? snapshot.items[0];

    return { p1, p2, frac1, frac2, heal, potion };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const p1    = params.p1    as QuestionPokemon;
    const p2    = params.p2    as QuestionPokemon;
    const frac1 = params.frac1 as Fraction;
    const frac2 = params.frac2 as Fraction;
    const heal  = params.heal  as number;
    const potion = params.potion as StoreItem;

    const heal1  = applyFrac(heal, frac1);
    const heal2  = applyFrac(heal, frac2);
    const answer = Math.max(heal1, heal2);
    const winner = heal1 >= heal2 ? p1 : p2;

    return {
      answer,
      steps: [
        {
          en: `${p1.name.en}: ${fmtFrac(frac1)} × ${heal} = ${heal1} HP healed`,
          he: `${p1.name.he}: ${fmtFracHe(frac1)} × ${heal} = ${heal1} HP נרפא`,
        },
        {
          en: `${p2.name.en}: ${fmtFrac(frac2)} × ${heal} = ${heal2} HP healed`,
          he: `${p2.name.he}: ${fmtFracHe(frac2)} × ${heal} = ${heal2} HP נרפא`,
        },
        {
          en: `${compSymbol(heal1, heal2)} → ${winner.name.en} is healed more!`,
          he: `${compSymbol(heal1, heal2)} → ${winner.name.he} נרפא יותר!`,
        },
      ],
      hint: {
        en: `Calculate the actual HP healed for each Pokemon, then compare.`,
        he: `חשב את ה-HP שנרפא לכל פוקמון, ואז השווה.`,
      },
      assets: [pokemonAsset(p1), pokemonAsset(p2), itemAsset(potion)],
      distractors: [Math.min(heal1, heal2), heal1 + heal2, Math.abs(heal1 - heal2)],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const p1    = params.p1    as QuestionPokemon;
    const p2    = params.p2    as QuestionPokemon;
    const frac1 = params.frac1 as Fraction;
    const frac2 = params.frac2 as Fraction;
    const heal  = params.heal  as number;
    return {
      en: `A Potion heals ${heal} HP.\n` +
          `${p1.name.en} receives ${fmtFrac(frac1)} of that healing.\n` +
          `${p2.name.en} receives ${fmtFrac(frac2)} of that healing.\n` +
          `What is the LARGER amount of HP healed?`,
      he: `תרופה מרפאת ${heal} נקודות HP.\n` +
          `${p1.name.he} מקבל ${fmtFracHe(frac1)} מהריפוי.\n` +
          `${p2.name.he} מקבל ${fmtFracHe(frac2)} מהריפוי.\n` +
          `מהי הכמות הגדולה יותר של HP שנרפא?`,
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
