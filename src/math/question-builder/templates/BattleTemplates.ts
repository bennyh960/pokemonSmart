/**
 * BattleTemplates.ts
 *
 * Question templates themed around Pokémon battles.
 * Templates in this file:
 *
 *   1. BasicDamageTemplate         ("battle.basic-damage")
 *      Grade 1-3 · ops: +, -
 *      "Pikachu's attack (80) + move power (60) − enemy defense (40) = ?"
 *
 *   2. AttackFormulaDamageTemplate ("battle.attack-formula")
 *      Grade 3-5 · ops: ×, +, -
 *      Full simplified formula: damage = (atk × power) ÷ def
 *
 *   3. STABBonusTemplate           ("battle.stab-bonus")
 *      Grade 4-6 · ops: ×
 *      "STAB multiplies damage by 1.5. Base damage = 80. What is the actual damage?"
 *
 *   4. MoveEffectivenessTemplate   ("battle.effectiveness")
 *      Grade 4-6 · ops: ×
 *      "Move is super effective (×2). Damage before = {base}. Final damage = ?"
 */

import { QuestionTemplate, type SolveResult } from '../QuestionTemplate.js';
import type {
  BilingualText,
  ClassConfig,
  PokemonWorldSnapshot,
  QuestionAsset,
  QuestionPokemon,
  QuestionMove,
  TemplateParams,
} from '../types.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import TYPE_CHART from '../../../data/type-chart.json';
import { TYPE_BADGE } from '../../../data/type-constants.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pokemonAsset(p: QuestionPokemon): QuestionAsset {
  return { kind: 'pokemon', id: p.id, spriteUrl: p.spriteUrl, label: p.name };
}

// ─── 1. BasicDamageTemplate ───────────────────────────────────────────────────

/**
 * Simplified damage formula for beginners:
 *   damage = attacker.attack + move.power − defender.defense
 * No multiplication needed — great for grades 1-3.
 */
export class BasicDamageTemplate extends QuestionTemplate {
  readonly id = 'battle.basic-damage';
  readonly name: BilingualText = {
    en: 'Basic Battle Damage',
    he: 'נזק בסיסי בקרב',
  };
  readonly category = 'battle' as const;
  readonly requiredOperations = ['+', '-'] as const;
  readonly minDifficulty = 1 as const;
  readonly maxDifficulty = 3 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const attacker = this.pickRandom(snapshot.pokemon);
    const defender = this.pickRandom(snapshot.pokemon.filter((p) => p.id !== attacker.id));
    // Scale atk/power/def to the config's number range so grade 1 gets small numbers
    const scale = config.numberRange.max / 200; // 200 = typical max base stat
    const atk = Math.max(1, Math.round(attacker.attack * scale));
    const def = Math.max(1, Math.round(defender.defense * scale));
    const move = this.pickRandom(snapshot.moves);
    const power = Math.max(1, Math.round(move.power * scale));
    return { attacker, defender, move, atk, def, power };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const atk = params.atk as number;
    const def = params.def as number;
    const power = params.power as number;
    const answer = Math.max(0, atk + power - def);

    return {
      answer,
      steps: [
        { en: `ATK + Power − DEF`, he: `כוח התקפה + עוצמת מהלך − הגנה` },
        { en: `${atk} + ${power} − ${def} = ${answer}`, he: `${atk} + ${power} − ${def} = ${answer}` },
      ],
      hint: {
        en: `Add the attacker's attack and move power, then subtract the defender's defense.`,
        he: `חבר את כוח ההתקפה ועוצמת המהלך, ואז חסר את ההגנה.`,
      },
      assets: [pokemonAsset(attacker), pokemonAsset(defender)],
      distractors: [answer + def, answer - def, atk + power],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const attacker = params.attacker as QuestionPokemon;
    const move = params.move as QuestionMove;
    const defender = params.defender as QuestionPokemon;
    const atk = params.atk as number;
    const def = params.def as number;
    const power = params.power as number;
    return {
      en:
        `${attacker.name.en} uses ${move.name.en}!\n` +
        `ATK: ${atk} · Move Power: ${power} · ${defender.name.en}'s DEF: ${def}\n\n` +
        `Formula: ATK + Power − DEF = ?`,
      he:
        `${attacker.name.he} משתמש ב-${move.name.he}!\n` +
        `התקפה: ${atk} · עוצמה: ${power} · הגנת ${defender.name.he}: ${def}\n\n` +
        `נוסחה: התקפה + עוצמה − הגנה = ?`,
    };
  }
}

// ─── 2. AttackFormulaDamageTemplate ──────────────────────────────────────────

/**
 * Classic Gen-1-style simplified formula:
 *   damage = (atk × power) ÷ def
 *
 * The divisor is NEVER purely random — it is always chosen to have a clear,
 * mentally tractable relationship to one of the other two operands so kids
 * can reason about the answer rather than just grinding arithmetic.
 *
 * Six "nice divisor" strategies (one is picked randomly per question):
 *   1. def ≈ power (±1|±2)  → result ≈ atk
 *   2. def ≈ atk  (±1|±2)  → result ≈ power
 *   3. def = power × 2      → result = atk ÷ 2
 *   4. def = power ÷ 2      → result = atk × 2
 *   5. def = atk × 2        → result = power ÷ 2
 *   6. def = atk ÷ 2        → result = power × 2
 */
export class AttackFormulaDamageTemplate extends QuestionTemplate {
  readonly id = 'battle.attack-formula';
  readonly name: BilingualText = {
    en: 'Attack Formula Damage',
    he: 'נזק לפי נוסחת הקרב',
  };
  readonly category = 'battle' as const;
  readonly requiredOperations = ['×', '÷'] as const;
  readonly minDifficulty = 3 as const;
  readonly maxDifficulty = 5 as const;

  // Strategy names — kept as a const tuple so TS can type narrow them.
  private static readonly STRATEGIES = [
    'def≈power',
    'def≈atk',
    'def=power×2',
    'def=power÷2',
    'def=atk×2',
    'def=atk÷2',
  ] as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const attacker = this.pickRandom(snapshot.pokemon);
    const defender = this.pickRandom(snapshot.pokemon.filter((p) => p.id !== attacker.id));
    const move = this.pickRandom(snapshot.moves);
    const strategy = this.pickRandom([...AttackFormulaDamageTemplate.STRATEGIES]);

    const cap = Math.min(config.numberRange.max, 60);
    let atk: number, power: number, def: number;

    switch (strategy) {
      case 'def≈power': {
        // def = power ± delta  →  result ≈ atk
        atk = this.randInt(2, Math.min(cap, 40));
        power = this.randInt(4, Math.min(cap, 50));
        const d1 = this.pickRandom([-2, -1, 1, 2]);
        def = Math.max(1, power + d1);
        break;
      }
      case 'def≈atk': {
        // def = atk ± delta  →  result ≈ power
        atk = this.randInt(4, Math.min(cap, 50));
        power = this.randInt(2, Math.min(cap, 40));
        const d2 = this.pickRandom([-2, -1, 1, 2]);
        def = Math.max(1, atk + d2);
        break;
      }
      case 'def=power×2': {
        // def = power × 2, atk even  →  result = atk ÷ 2  (exact)
        power = this.randInt(2, Math.min(cap, 25));
        def = power * 2;
        atk = this.randInt(2, Math.min(cap, 30)) * 2; // even → exact integer
        break;
      }
      case 'def=power÷2': {
        // power even, def = power ÷ 2  →  result = atk × 2  (exact)
        power = this.randInt(2, Math.min(Math.floor(cap / 2), 20)) * 2; // even
        def = power / 2;
        atk = this.randInt(2, Math.min(cap, 30));
        break;
      }
      case 'def=atk×2': {
        // def = atk × 2, power even  →  result = power ÷ 2  (exact)
        atk = this.randInt(2, Math.min(cap, 25));
        def = atk * 2;
        power = this.randInt(2, Math.min(cap, 30)) * 2; // even → exact integer
        break;
      }
      case 'def=atk÷2': {
        // atk even, def = atk ÷ 2  →  result = power × 2  (exact)
        atk = this.randInt(2, Math.min(Math.floor(cap / 2), 20)) * 2; // even
        def = atk / 2;
        power = this.randInt(2, Math.min(cap, 30));
        break;
      }
    }

    return { attacker, defender, move, atk, def, power, strategy };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const atk = params.atk as number;
    const def = params.def as number;
    const power = params.power as number;
    const strategy = params.strategy as string;
    const intermediate = atk * power;
    const answer = Math.floor(intermediate / def);

    const hint = this._strategyHint(strategy, atk, power, def, answer);

    return {
      answer,
      steps: [
        {
          en: `Step 1 – ATK × Power: ${atk} × ${power} = ${intermediate}`,
          he: `שלב 1 – התקפה × עוצמה: ${atk} × ${power} = ${intermediate}`,
        },
        {
          en: `Step 2 – ÷ DEF: ${intermediate} ÷ ${def} = ${answer}`,
          he: `שלב 2 – ÷ הגנה: ${intermediate} ÷ ${def} = ${answer}`,
        },
      ],
      hint,
      assets: [pokemonAsset(attacker), pokemonAsset(defender)],
      distractors: [answer + atk, Math.max(1, answer - 1), answer * 2],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const move = params.move as QuestionMove;
    const atk = params.atk as number;
    const def = params.def as number;
    const power = params.power as number;
    return {
      en:
        `${attacker.name.en} uses ${move.name.en} on ${defender.name.en}!\n` +
        `Formula: (ATK × Power) ÷ DEF\n` +
        `ATK = ${atk},  Power = ${power},  DEF = ${def}\n` +
        `How much damage?`,
      he:
        `${attacker.name.he} תקף את ${defender.name.he} עם ${move.name.he}!\n` +
        `נוסחה: (התקפה × עוצמה) ÷ הגנה\n` +
        `התקפה = ${atk},  עוצמה = ${power},  הגנה = ${def}\n` +
        `כמה נזק?`,
    };
  }

  /** Strategy-specific mental-shortcut hint. */
  private _strategyHint(strategy: string, atk: number, power: number, def: number, answer: number): BilingualText {
    const delta = def - power;
    const deltaAtk = def - atk;
    return this._buildHint(strategy, atk, power, def, delta, deltaAtk, answer);
  }

  /** Flat lookup table — avoids switch/case to keep cognitive complexity low. */
  private _buildHint(
    strategy: string,
    atk: number,
    power: number,
    def: number,
    delta: number,
    deltaAtk: number,
    answer: number,
  ): BilingualText {
    const biggerEn = (d: number) => (d > 0 ? 'slightly BIGGER' : 'slightly SMALLER');
    const resultEn = (d: number) => (d > 0 ? 'slightly LESS' : 'slightly MORE');
    const biggerHe = (d: number) => (d > 0 ? 'קצת גדולה' : 'קצת קטנה');
    const resultHe = (d: number) => (d > 0 ? 'קצת פחות' : 'קצת יותר');

    const hints: Record<string, BilingualText> = {
      'def≈power': {
        en:
          `DEF (${def}) is very close to Power (${power}).\n` +
          `They almost cancel — the result is close to ATK = ${atk}.\n` +
          `Since DEF is ${biggerEn(delta)} than Power, the answer is ${resultEn(delta)} than ${atk}.`,
        he:
          `הגנה (${def}) קרובה מאוד לעוצמה (${power}).\n` +
          `הם כמעט מצטמצמים — התוצאה קרובה להתקפה = ${atk}.\n` +
          `מכיוון שהגנה ${biggerHe(delta)} מהעוצמה, התשובה ${resultHe(delta)} מ-${atk}.`,
      },
      'def≈atk': {
        en:
          `DEF (${def}) is very close to ATK (${atk}).\n` +
          `They almost cancel — the result is close to Power = ${power}.\n` +
          `Since DEF is ${biggerEn(deltaAtk)} than ATK, the answer is ${resultEn(deltaAtk)} than ${power}.`,
        he:
          `הגנה (${def}) קרובה מאוד להתקפה (${atk}).\n` +
          `הם כמעט מצטמצמים — התוצאה קרובה לעוצמה = ${power}.\n` +
          `מכיוון שהגנה ${biggerHe(deltaAtk)} מההתקפה, התשובה ${resultHe(deltaAtk)} מ-${power}.`,
      },
      'def=power×2': {
        en: `DEF = Power × 2, so Power ÷ DEF = ½.\nThe formula becomes: ATK × ½ = ${atk} ÷ 2 = ${answer}.`,
        he: `הגנה = עוצמה × 2, כך ש-עוצמה ÷ הגנה = ½.\nהנוסחה הופכת ל: התקפה × ½ = ${atk} ÷ 2 = ${answer}.`,
      },
      'def=power÷2': {
        en: `DEF = Power ÷ 2, so Power ÷ DEF = 2.\nThe formula becomes: ATK × 2 = ${atk} × 2 = ${answer}.`,
        he: `הגנה = עוצמה ÷ 2, כך ש-עוצמה ÷ הגנה = 2.\nהנוסחה הופכת ל: התקפה × 2 = ${atk} × 2 = ${answer}.`,
      },
      'def=atk×2': {
        en: `DEF = ATK × 2, so ATK ÷ DEF = ½.\nThe formula becomes: Power × ½ = ${power} ÷ 2 = ${answer}.`,
        he: `הגנה = התקפה × 2, כך ש-התקפה ÷ הגנה = ½.\nהנוסחה הופכת ל: עוצמה × ½ = ${power} ÷ 2 = ${answer}.`,
      },
      'def=atk÷2': {
        en: `DEF = ATK ÷ 2, so ATK ÷ DEF = 2.\nThe formula becomes: Power × 2 = ${power} × 2 = ${answer}.`,
        he: `הגנה = התקפה ÷ 2, כך ש-התקפה ÷ הגנה = 2.\nהנוסחה הופכת ל: עוצמה × 2 = ${power} × 2 = ${answer}.`,
      },
    };

    return (
      hints[strategy] ?? {
        en: `Multiply ATK × Power first, then divide by DEF.`,
        he: `הכפל התקפה × עוצמה תחילה, ואז חלק בהגנה.`,
      }
    );
  }
}

// ─── 3. STABBonusTemplate ─────────────────────────────────────────────────────

/**
 * "STAB (Same Type Attack Bonus) multiplies damage by 1.5.
 *  Base damage = {base}. What is the final STAB-boosted damage?"
 * Answer: Math.floor(base * 1.5)
 * Teaches: multiplication with decimals (or ×3÷2 for integer learners).
 */
export class STABBonusTemplate extends QuestionTemplate {
  readonly id = 'battle.stab-bonus';
  readonly name: BilingualText = {
    en: 'STAB Damage Bonus',
    he: 'בונוס STAB',
  };
  readonly category = 'battle' as const;
  readonly requiredOperations = ['×'] as const;
  readonly minDifficulty = 3 as const;
  readonly maxDifficulty = 5 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const attacker = this.pickRandom(snapshot.pokemon);
    // Pick even base damage so ×1.5 yields integer → no decimals for kids
    const maxBase = Math.min(config.numberRange.max, 100);
    const base = this.randInt(10, maxBase / 2) * 2; // always even
    return { attacker, base };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const base = params.base as number;
    const attacker = params.attacker as QuestionPokemon;
    // ×1.5 = ×3÷2 to keep it integer
    const answer = Math.floor(base * 1.5);

    return {
      answer,
      steps: [
        { en: `STAB × 1.5`, he: `STAB × 1.5` },
        { en: `${base} × 3 ÷ 2 = ${answer}`, he: `${base} × 3 ÷ 2 = ${answer}` },
      ],
      hint: {
        en: `STAB means ×1.5. You can calculate it as: base × 3 ÷ 2.`,
        he: `STAB אומר ×1.5. אפשר לחשב: בסיס × 3 ÷ 2.`,
      },
      assets: [pokemonAsset(attacker)],
      distractors: [base, base * 2, answer + 5],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const attacker = params.attacker as QuestionPokemon;
    const base = params.base as number;
    return {
      en:
        `${attacker.name.en} uses a move that matches its own type (STAB)!\n` +
        `STAB multiplies damage by 1.5.\nBase damage = ${base}.\nWhat is the final damage?`,
      he:
        `${attacker.name.he} משתמש במהלך מאותו הסוג שלו (STAB)!\n` +
        `STAB מכפיל את הנזק ב-1.5.\nנזק בסיסי = ${base}.\nמהו הנזק הסופי?`,
    };
  }
}

// ─── Type-chart helpers ───────────────────────────────────────────────────────

type TypeChartEffectiveness = Record<string, Record<string, number>>;

function getTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
  const chart = (TYPE_CHART as { effectiveness: TypeChartEffectiveness }).effectiveness;
  const row = chart[moveType];
  if (!row) return 1;
  let mult = 1;
  for (const dt of defenderTypes) {
    mult *= row[dt] ?? 1;
  }
  return mult;
}

interface EffectivenessLabel {
  en: string;
  he: string;
  multiplierStr: string;
}

function effectivenessLabel(mult: number): EffectivenessLabel {
  if (mult === 0) return { en: 'NO EFFECT', he: 'אין השפעה כלל', multiplierStr: '×0' };
  if (mult <= 0.25) return { en: 'not very effective', he: 'לא יעיל במיוחד', multiplierStr: '×1/4' };
  if (mult < 1) return { en: 'not very effective', he: 'לא יעיל במיוחד', multiplierStr: '×1/2' };
  if (mult === 1) return { en: 'neutral', he: 'רגיל', multiplierStr: '×1' };
  if (mult <= 2) return { en: 'SUPER EFFECTIVE', he: 'יעיל במיוחד', multiplierStr: '×2' };
  return { en: 'SUPER EFFECTIVE', he: 'יעיל במיוחד', multiplierStr: '×4' };
}

function typeNameEn(type: string): string {
  return TYPE_BADGE[type as keyof typeof TYPE_BADGE]?.en ?? type.charAt(0).toUpperCase() + type.slice(1);
}

function typeNameHe(type: string): string {
  return TYPE_BADGE[type as keyof typeof TYPE_BADGE]?.he ?? type;
}

function formatTypesEn(types: string[]): string {
  return types.map(typeNameEn).join('/');
}

function formatTypesHe(types: string[]): string {
  return types.map(typeNameHe).join('/');
}

// ─── 4. MoveEffectivenessTemplate ────────────────────────────────────────────

/**
 * Uses the real Gen 1-2 type chart to compute move effectiveness.
 * The question always shows the move type and defender type(s) so kids
 * learn type matchups on every question — even neutral (×1).
 *
 * Format:
 *   "{Attacker} uses {Move} on {Defender}!
 *    [{MoveType}] {Move} is {label} against {Defender} ({DefenderType(s)})!
 *    Base damage = {base}. What is the final damage? ({multiplierStr})"
 *
 * Base is always divisible by 4 so all multipliers (×0.25, ×0.5, ×1, ×2, ×4)
 * produce clean integer answers.
 */
export class MoveEffectivenessTemplate extends QuestionTemplate {
  readonly id = 'battle.effectiveness';
  readonly name: BilingualText = {
    en: 'Move Type Effectiveness',
    he: 'יעילות מהלך',
  };
  readonly category = 'battle' as const;
  readonly requiredOperations = ['×'] as const;
  readonly minDifficulty = 2 as const;
  readonly maxDifficulty = 5 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const attacker = this.pickRandom(snapshot.pokemon);
    // Single-type defenders only — keeps the type matchup explanation unambiguous
    // (dual types like Bug/Steel can produce "neutral" from two opposing interactions,
    // which would make the educational text misleading for kids)
    const singleTypePool = snapshot.pokemon.filter((p) => p.id !== attacker.id && p.types.length === 1);
    const defender = this.pickRandom(
      singleTypePool.length > 0 ? singleTypePool : snapshot.pokemon.filter((p) => p.id !== attacker.id),
    );
    const move = this.pickRandom(snapshot.moves);

    const effectiveness = getTypeEffectiveness(move.type, defender.types);

    // Base divisible by 4 → all multipliers (×0.25/0.5/1/2/4) yield integers
    const maxBase = Math.min(config.numberRange.max, 100);
    const base = this.randInt(2, Math.floor(maxBase / 4)) * 4;

    return { attacker, defender, move, base, effectiveness };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const base = params.base as number;
    const effectiveness = params.effectiveness as number;
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const move = params.move as QuestionMove;
    const label = effectivenessLabel(effectiveness);
    const answer = Math.floor(base * effectiveness);

    const stepEn =
      effectiveness === 1
        ? `Neutral — ${base} × 1 = ${answer}`
        : `${label.en}! ${base} ${label.multiplierStr} = ${answer}`;
    const stepHe =
      effectiveness === 1
        ? `רגיל — ${base} × 1 = ${answer}`
        : `${label.he}! ${base} ${label.multiplierStr} = ${answer}`;

    const hintEn = _effectivenessHintEn(effectiveness, move.type, formatTypesEn(defender.types));
    const hintHe = _effectivenessHintHe(effectiveness, move.type, formatTypesHe(defender.types));

    // Distractors: the four "other" standard effectiveness results from the same base
    const allResults = [0, Math.floor(base * 0.5), base, base * 2, base * 4];
    const distractors = [...new Set(allResults.filter((v) => v !== answer))].slice(0, 3);

    return {
      answer,
      steps: [{ en: stepEn, he: stepHe }],
      hint: { en: hintEn, he: hintHe },
      assets: [pokemonAsset(attacker), pokemonAsset(defender)],
      distractors,
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const move = params.move as QuestionMove;
    const base = params.base as number;
    const effectiveness = params.effectiveness as number;
    const label = effectivenessLabel(effectiveness);
    const moveTypeEn = typeNameEn(move.type);
    const moveTypeHe = typeNameHe(move.type);
    const defTypeEnStr = formatTypesEn(defender.types);
    // Primary type used in the Hebrew narrative sentence
    const defPrimaryTypeHe = typeNameHe(defender.types[0]);

    const typeLineEn = `[${moveTypeEn}] ${move.name.en} is ${label.en} against ${defender.name.en} (${defTypeEnStr})!`;
    const typeLineHe = _typeEffectivenessLineHe(
      effectiveness,
      moveTypeHe,
      label.multiplierStr,
      defPrimaryTypeHe,
      defender.name.he,
    );

    return {
      en:
        `${attacker.name.en} uses ${move.name.en} on ${defender.name.en}!\n` +
        `${typeLineEn}\n` +
        `Base damage = ${base}. What is the final damage? (${label.multiplierStr})`,
      he:
        `${attacker.name.he} תקף את ${defender.name.he} עם מכת "${move.name.he}" [${moveTypeHe}]\n` +
        `${typeLineHe}\n` +
        `נזק בסיסי = ${base} , מה הנזק הסופי?`,
    };
  }
}

function _effectivenessHintEn(mult: number, moveType: string, defType: string): string {
  const t = typeNameEn(moveType);
  if (mult === 0) return `${t}-type moves have NO EFFECT on ${defType} — the answer is always 0!`;
  if (mult <= 0.25) return `${t} is doubly weak against ${defType}. Multiply by 1/4 (divide by 4).`;
  if (mult < 1) return `${t} is resisted by ${defType}. Multiply by 1/2 (divide by 2).`;
  if (mult === 1) return `${t} deals normal damage against ${defType}. Multiply by 1 — no change!`;
  if (mult <= 2) return `${t} is super effective against ${defType}! Multiply by 2.`;
  return `${t} is doubly super effective against ${defType}! Multiply by 4.`;
}

function _effectivenessHintHe(mult: number, moveType: string, defType: string): string {
  const t = typeNameHe(moveType);
  if (mult === 0) return `למהלכי ${t} אין השפעה על ${defType} — התשובה תמיד 0!`;
  if (mult <= 0.25) return `${t} חלש פי שניים נגד ${defType}. הכפל ב-1/4 (חלק ב-4).`;
  if (mult < 1) return `${t} בלום על ידי ${defType}. הכפל ב-1/2 (חלק ב-2).`;
  if (mult === 1) return `${t} גורם נזק רגיל נגד ${defType}. הכפל ב-1 — אין שינוי!`;
  if (mult <= 2) return `${t} יעיל במיוחד נגד ${defType}! הכפל ב-2.`;
  return `${t} יעיל פי ארבעה נגד ${defType}! הכפל ב-4.`;
}

/**
 * Builds the Hebrew type-effectiveness narrative line.
 * Uses child-friendly phrasing tailored per effectiveness tier.
 *
 * Examples:
 *   ×0  → מכה מסוג אדמה לא יכולה להזיק כלל לפוקימון מסוג מעופף כמו פיג'י ]מעופף[
 *   ×½  → מכה מסוג מים לא יעילה במיוחד )×½( נגד פוקימון עשב כמו בולבזאור ]עשב/רעל[
 *   ×1  → מכה מסוג מים האפקט שלה הוא רגיל )×1( נגד פוקימון חרק כמו הראקרוס ]חרק/לחימה[
 *   ×2  → מכה מסוג מים היא סופר-אפקטיבית )×2( נגד פוקימון אש כמו צ'ארמנדר ]אש[
 *   ×4  → מכה מסוג מים היא סופר-אפקטיבית פי ארבע )×4( נגד פוקימון אש כמו צ'ארמנדר ]אש/סלע[
 */
function _typeEffectivenessLineHe(
  mult: number,
  moveTypeHe: string,
  multStr: string,
  defPrimaryTypeHe: string,
  defenderNameHe: string,
): string {
  const suffix = `כמו ${defenderNameHe}`;
  if (mult === 0) {
    return `מכה מסוג ${moveTypeHe} לא יכולה להזיק כלל לפוקימון מסוג ${defPrimaryTypeHe} ${suffix}`;
  }
  if (mult < 1) {
    return `מכה מסוג ${moveTypeHe} לא יעילה במיוחד (${multStr}) נגד פוקימון ${defPrimaryTypeHe} ${suffix}`;
  }
  if (mult === 1) {
    return `מכה מסוג ${moveTypeHe} האפקט שלה הוא רגיל (${multStr}) נגד פוקימון ${defPrimaryTypeHe} ${suffix}`;
  }
  if (mult <= 2) {
    return `מכה מסוג ${moveTypeHe} היא סופר-אפקטיבית (${multStr}) נגד פוקימון ${defPrimaryTypeHe} ${suffix}`;
  }
  return `מכה מסוג ${moveTypeHe} היא סופר-אפקטיבית פי ארבע (${multStr}) נגד פוקימון ${defPrimaryTypeHe} ${suffix}`;
}
