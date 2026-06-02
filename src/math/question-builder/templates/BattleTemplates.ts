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
      distractors: this._distractors(strategy, atk, power, answer),
    };
  }

  /**
   * Builds distractors that are pedagogically meaningful per strategy.
   *
   * For approximate strategies (def≈power / def≈atk):
   *   - wrongDir  : mirror of the answer past the pivot (catches kids who reason in
   *                 the wrong direction). Clamped to be at least 3 away from answer.
   *   - moderate  : 10% of the answer further in the SAME direction as answer from
   *                 pivot (catches kids who get the direction right but overshoot).
   *   - far       : pivot × 2 (clear anchor far from the correct ballpark).
   */
  private _distractors(strategy: string, atk: number, power: number, answer: number): number[] {
    const safe = (arr: number[]) =>
      [...new Set(arr.map(Math.round).filter((v) => v >= 1 && v !== answer))].slice(0, 3);

    const approxCase = (pivot: number) => {
      // Moderate: 10% of the answer further in the same direction as answer from pivot.
      // Using the answer (not pivot) makes the gap proportional to what kids must judge.
      // e.g. answer=66 → gap=7 → moderate=73; answer=111 → gap=11 → moderate=122.
      const gap = Math.max(3, Math.round(answer * 0.1));
      const moderate = answer >= pivot ? answer + gap : Math.max(1, answer - gap);

      // WrongDir: goes in the OPPOSITE direction from moderate.
      // Distance = 2×delta+1 (the exact mirror distance past pivot), min 3.
      // This ensures wrongDir and moderate never collide regardless of delta.
      const delta = Math.abs(answer - pivot);
      const oppGap = Math.max(3, 2 * delta + 1);
      const wrongDir = Math.max(1, moderate > answer ? answer - oppGap : answer + oppGap);

      return safe([wrongDir, moderate, pivot * 2]);
    };

    if (strategy === 'def≈power') return approxCase(atk);
    if (strategy === 'def≈atk') return approxCase(power);

    // Exact ratio strategies (def=power×2 etc.) — keep spread around the answer
    return safe([answer + atk, Math.max(1, answer - 1), answer * 2]);
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
    const singleTypePool = snapshot.pokemon.filter((p) => p.id !== attacker.id && p.types.length === 1);
    const defPool = singleTypePool.length > 0 ? singleTypePool : snapshot.pokemon.filter((p) => p.id !== attacker.id);
    const defender = this.pickRandom(defPool);
    let move = this.pickRandom(snapshot.moves);

    let effectiveness = getTypeEffectiveness(move.type, defender.types);
    // Reduce ×1 (neutral) frequency: 70% chance to reroll once when neutral is rolled
    if (effectiveness === 1 && Math.random() < 0.7) {
      move = this.pickRandom(snapshot.moves);
      effectiveness = getTypeEffectiveness(move.type, defender.types);
    }

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

// ─── 5. HPRemainingTemplate ───────────────────────────────────────────────────

/**
 * "{attacker} hits {defender} ({hp} HP) {turns} times, each doing {dmg} damage.
 *  How much HP does {defender} have left?"
 * Answer: hp - dmg × turns
 * Teaches: two-step multiplication then subtraction, all numbers < 100.
 */
export class HPRemainingTemplate extends QuestionTemplate {
  readonly id = 'battle.hp-remaining';
  readonly name: BilingualText = {
    en: 'HP Remaining After Attacks',
    he: 'HP שנותר אחרי מתקפות',
  };
  readonly category = 'battle' as const;
  readonly requiredOperations = ['×', '-'] as const;
  readonly minDifficulty = 2 as const;
  readonly maxDifficulty = 4 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, _config: ClassConfig): TemplateParams {
    const attacker = this.pickRandom(snapshot.pokemon);
    const defender = this.pickRandom(snapshot.pokemon.filter((p) => p.id !== attacker.id));
    const move = this.pickRandom(snapshot.moves);
    const turns = this.randInt(2, 5);
    // Keep total damage < 80 so HP (total_dmg + remainder) stays under 100
    const maxDmgPerTurn = Math.min(15, Math.floor(75 / turns));
    const dmg = this.randInt(2, Math.max(2, maxDmgPerTurn));
    const totalDmg = dmg * turns;
    const hpLeft = this.randInt(1, Math.min(20, 95 - totalDmg));
    const hp = totalDmg + hpLeft;
    return { attacker, defender, move, hp, dmg, turns };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const hp = params.hp as number;
    const dmg = params.dmg as number;
    const turns = params.turns as number;
    const totalDmg = dmg * turns;
    const answer = hp - totalDmg;

    return {
      answer,
      steps: [
        { en: `Total damage: ${dmg} × ${turns} = ${totalDmg}`, he: `סה"כ נזק: ${dmg} × ${turns} = ${totalDmg}` },
        { en: `HP left: ${hp} − ${totalDmg} = ${answer}`, he: `HP שנותר: ${hp} − ${totalDmg} = ${answer}` },
      ],
      hint: {
        en: `First calculate total damage (damage per hit × number of hits), then subtract from HP.`,
        he: `ראשית חשב את הנזק הכולל (נזק למכה × מספר מכות), ואז חסר מה-HP.`,
      },
      assets: [pokemonAsset(attacker), pokemonAsset(defender)],
      distractors: [answer + dmg, Math.max(0, answer - dmg), totalDmg],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const move = params.move as QuestionMove;
    const hp = params.hp as number;
    const dmg = params.dmg as number;
    const turns = params.turns as number;
    return {
      en:
        `${attacker.name.en} uses ${move.name.en} on ${defender.name.en}!\n` +
        `${defender.name.en} has ${hp} HP.\n` +
        `Each hit deals ${dmg} damage. ${attacker.name.en} attacks ${turns} times.\n` +
        `How much HP does ${defender.name.en} have left?`,
      he:
        `${attacker.name.he} תקף את ${defender.name.he} עם ${move.name.he}!\n` +
        `ל-${defender.name.he} יש ${hp} HP.\n` +
        `כל מכה גורמת ${dmg} נזק. ${attacker.name.he} תוקף ${turns} פעמים.\n` +
        `כמה HP נשאר ל-${defender.name.he}?`,
    };
  }
}

// ─── 6. EffectivenessHPRemainingTemplate ─────────────────────────────────────

/**
 * "{attacker} uses a SUPER EFFECTIVE move (×2) on {defender} ({fullHP} HP).
 *  Base damage = {baseDmg}. How much HP does {defender} have left?"
 * Answer: fullHP - baseDmg × 2
 * Teaches: super-effective type matchup + two-step multiply-then-subtract.
 */
export class EffectivenessHPRemainingTemplate extends QuestionTemplate {
  readonly id = 'battle.effectiveness-hp-remaining';
  readonly name: BilingualText = {
    en: 'Super-Effective Hit: HP Remaining',
    he: 'מכה יעילה: HP שנותר',
  };
  readonly category = 'battle' as const;
  readonly requiredOperations = ['×', '-'] as const;
  readonly minDifficulty = 2 as const;
  readonly maxDifficulty = 4 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    // Try up to 10 moves until we find a ×2 super-effective matchup
    let move = this.pickRandom(snapshot.moves);
    let defender = this.pickRandom(snapshot.pokemon);
    for (let i = 0; i < 10; i++) {
      const candidate = this.pickRandom(snapshot.moves);
      const superEffPool = snapshot.pokemon.filter(
        (p) => p.types.length === 1 && getTypeEffectiveness(candidate.type, p.types) === 2,
      );
      if (superEffPool.length > 0) {
        move = candidate;
        defender = this.pickRandom(superEffPool);
        break;
      }
    }
    const attacker = this.pickRandom(snapshot.pokemon.filter((p) => p.id !== defender.id));

    const maxBase = Math.min(25, Math.floor(config.numberRange.max / 3));
    const baseDmg = this.randInt(5, Math.max(5, maxBase));
    const damage = baseDmg * 2;
    const hpLeft = this.randInt(5, Math.min(25, Math.max(5, 80 - damage)));
    const fullHP = damage + hpLeft;

    return { attacker, defender, move, baseDmg, fullHP };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const baseDmg = params.baseDmg as number;
    const fullHP = params.fullHP as number;
    const damage = baseDmg * 2;
    const answer = fullHP - damage;

    return {
      answer,
      steps: [
        { en: `Super effective (×2): ${baseDmg} × 2 = ${damage}`, he: `יעיל במיוחד (×2): ${baseDmg} × 2 = ${damage}` },
        { en: `HP left: ${fullHP} − ${damage} = ${answer}`, he: `HP שנותר: ${fullHP} − ${damage} = ${answer}` },
      ],
      hint: {
        en: `Super effective means ×2! Double the base damage first, then subtract from HP.`,
        he: `יעיל במיוחד אומר ×2! הכפל את הנזק הבסיסי ב-2 תחילה, ואז חסר מה-HP.`,
      },
      assets: [pokemonAsset(attacker), pokemonAsset(defender)],
      distractors: [fullHP - baseDmg, Math.max(0, answer - baseDmg), answer + baseDmg],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const move = params.move as QuestionMove;
    const baseDmg = params.baseDmg as number;
    const fullHP = params.fullHP as number;
    const moveTypeEn = typeNameEn(move.type);
    const moveTypeHe = typeNameHe(move.type);
    const defTypeEn = formatTypesEn(defender.types);
    const defTypeHe = formatTypesHe(defender.types);
    return {
      en:
        `${attacker.name.en} uses ${move.name.en} on ${defender.name.en}!\n` +
        `[${moveTypeEn}] vs [${defTypeEn}] — SUPER EFFECTIVE (×2)!\n` +
        `${defender.name.en} has ${fullHP} HP. Base damage = ${baseDmg}.\n` +
        `How much HP does ${defender.name.en} have left?`,
      he:
        `${attacker.name.he} תקף את ${defender.name.he} עם ${move.name.he}!\n` +
        `[${moveTypeHe}] נגד [${defTypeHe}] — יעיל במיוחד (×2)!\n` +
        `ל-${defender.name.he} יש ${fullHP} HP. נזק בסיסי = ${baseDmg}.\n` +
        `כמה HP נשאר ל-${defender.name.he}?`,
    };
  }
}

// ─── 7. PoisonSleepTemplate ───────────────────────────────────────────────────

/**
 * "{pokemon} is poisoned ({poisonDmg} HP/turn) and is {condition} for {turns} turns.
 *  How much total HP does {pokemon} lose from poison?"
 * Answer: poisonDmg × turns
 * Teaches: repeated multiplication — same-rate damage over multiple turns.
 */
export class PoisonSleepTemplate extends QuestionTemplate {
  readonly id = 'battle.poison-sleep';
  readonly name: BilingualText = {
    en: 'Poison Damage While Immobilized',
    he: 'נזק רעל בזמן שיתוק',
  };
  readonly category = 'battle' as const;
  readonly requiredOperations = ['×'] as const;
  readonly minDifficulty = 1 as const;
  readonly maxDifficulty = 3 as const;

  private static readonly CONDITIONS: ReadonlyArray<BilingualText> = [
    { en: 'asleep', he: 'ישן' },
    { en: 'frozen solid', he: 'קפוא' },
    { en: 'confused and unable to attack', he: 'מבולבל ולא מסוגל לתקוף' },
  ];

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const pokemon = this.pickRandom(snapshot.pokemon);
    const attacker = this.pickRandom(snapshot.pokemon.filter((p) => p.id !== pokemon.id));
    const maxDmg = Math.min(10, Math.floor(config.numberRange.max / 4));
    const poisonOptions = [3, 5, 6, 8, 10].filter((d) => d <= Math.max(3, maxDmg));
    const poisonDmg = this.pickRandom(poisonOptions.length > 0 ? poisonOptions : [5]);
    const maxTurns = Math.min(6, Math.floor(config.numberRange.max / poisonDmg));
    const turns = this.randInt(2, Math.max(2, maxTurns));
    const condition = this.pickRandom([...PoisonSleepTemplate.CONDITIONS]);
    return { pokemon, attacker, poisonDmg, turns, condition };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const pokemon = params.pokemon as QuestionPokemon;
    const attacker = params.attacker as QuestionPokemon;
    const poisonDmg = params.poisonDmg as number;
    const turns = params.turns as number;
    const answer = poisonDmg * turns;

    return {
      answer,
      steps: [
        {
          en: `Poison per turn × turns: ${poisonDmg} × ${turns} = ${answer}`,
          he: `רעל לתור × תורות: ${poisonDmg} × ${turns} = ${answer}`,
        },
      ],
      hint: {
        en: `Poison deals the same HP each turn. Multiply damage per turn by the number of turns.`,
        he: `רעל גורם אותו נזק HP בכל תור. הכפל נזק לתור במספר התורות.`,
      },
      assets: [pokemonAsset(pokemon), pokemonAsset(attacker)],
      distractors: [answer + poisonDmg, Math.max(0, answer - poisonDmg), poisonDmg + turns],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const pokemon = params.pokemon as QuestionPokemon;
    const attacker = params.attacker as QuestionPokemon;
    const poisonDmg = params.poisonDmg as number;
    const turns = params.turns as number;
    const condition = params.condition as BilingualText;
    return {
      en:
        `${pokemon.name.en} is poisoned — it loses ${poisonDmg} HP each turn!\n` +
        `${attacker.name.en} faces ${pokemon.name.en}, but ${attacker.name.en} is ${condition.en} for ${turns} turns.\n` +
        `How much total HP does ${pokemon.name.en} lose from poison?`,
      he:
        `${pokemon.name.he} מורעל — הוא מאבד ${poisonDmg} נקודות חיים בכל תור!\n` +
        `${attacker.name.he} עומד מול ${pokemon.name.he}, אבל ${attacker.name.he} ${condition.he} למשך ${turns} תורות.\n` +
        `כמה נקודות חיים בסך הכל מאבד ${pokemon.name.he} מהרעל?`,
    };
  }
}
