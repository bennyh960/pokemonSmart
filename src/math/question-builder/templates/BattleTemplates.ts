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

  protected generateParams(
    snapshot: PokemonWorldSnapshot,
    config: ClassConfig,
  ): TemplateParams {
    const attacker = this.pickRandom(snapshot.pokemon);
    const defender = this.pickRandom(
      snapshot.pokemon.filter(p => p.id !== attacker.id),
    );
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
      en: `${attacker.name.en} uses ${move.name.en}!\n` +
          `ATK: ${atk} · Move Power: ${power} · ${defender.name.en}'s DEF: ${def}\n` +
          `Formula: ATK + Power − DEF = ?`,
      he: `${attacker.name.he} משתמש ב-${move.name.he}!\n` +
          `התקפה: ${atk} · עוצמה: ${power} · הגנת ${defender.name.he}: ${def}\n` +
          `נוסחה: התקפה + עוצמה − הגנה = ?`,
    };
  }
}

// ─── 2. AttackFormulaDamageTemplate ──────────────────────────────────────────

/**
 * Classic Gen-1-style simplified formula:
 *   damage = (atk × power) ÷ def
 * Two-step: multiply then divide.
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

  protected generateParams(
    snapshot: PokemonWorldSnapshot,
    config: ClassConfig,
  ): TemplateParams {
    // Use small numbers so the division works out cleanly
    const attacker = this.pickRandom(snapshot.pokemon);
    const defender = this.pickRandom(snapshot.pokemon.filter(p => p.id !== attacker.id));
    const maxVal = Math.min(config.numberRange.max, 50);
    // Pick def first, then pick power and atk so result is a whole number
    const def = this.randInt(2, Math.min(maxVal, 20));
    const power = def * this.randInt(1, 5);     // ensures (atk*power) divisible by def with clean result
    const atk = this.randInt(1, Math.min(maxVal, 30));
    const move = this.pickRandom(snapshot.moves);
    return { attacker, defender, move, atk, def, power };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const atk = params.atk as number;
    const def = params.def as number;
    const power = params.power as number;
    const intermediate = atk * power;
    const answer = Math.floor(intermediate / def);

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
      hint: {
        en: `First multiply the attack by the move power. Then divide by the defense.`,
        he: `ראשית הכפל את ההתקפה בעוצמת המהלך. לאחר מכן חלק בהגנה.`,
      },
      assets: [pokemonAsset(attacker), pokemonAsset(defender)],
      distractors: [answer + atk, answer - 1, answer * 2],
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
      en: `${attacker.name.en} uses ${move.name.en} on ${defender.name.en}!\n` +
          `Formula: (ATK × Power) ÷ DEF\n` +
          `ATK = ${atk}, Power = ${power}, DEF = ${def}\n` +
          `How much damage?`,
      he: `${attacker.name.he} תקף את ${defender.name.he} עם ${move.name.he}!\n` +
          `נוסחה: (התקפה × עוצמה) ÷ הגנה\n` +
          `התקפה = ${atk}, עוצמה = ${power}, הגנה = ${def}\n` +
          `כמה נזק?`,
    };
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

  protected generateParams(
    snapshot: PokemonWorldSnapshot,
    config: ClassConfig,
  ): TemplateParams {
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
      en: `${attacker.name.en} uses a move that matches its own type (STAB)!\n` +
          `STAB multiplies damage by 1.5.\nBase damage = ${base}.\nWhat is the final damage?`,
      he: `${attacker.name.he} משתמש במהלך מאותו הסוג שלו (STAB)!\n` +
          `STAB מכפיל את הנזק ב-1.5.\nנזק בסיסי = ${base}.\nמהו הנזק הסופי?`,
    };
  }
}

// ─── 4. MoveEffectivenessTemplate ────────────────────────────────────────────

/**
 * "The move is super effective (×2) / not very effective (×0.5).
 *  Base damage = {base}. What is the final damage?"
 * Teaches: multiplication by 2 or ×1÷2.
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

  protected generateParams(
    snapshot: PokemonWorldSnapshot,
    config: ClassConfig,
  ): TemplateParams {
    const attacker = this.pickRandom(snapshot.pokemon);
    const defender = this.pickRandom(snapshot.pokemon.filter(p => p.id !== attacker.id));
    // Use even base so ×0.5 stays integer
    const maxBase = Math.min(config.numberRange.max, 100);
    const base = this.randInt(5, maxBase / 2) * 2;
    const superEffective = Math.random() > 0.5;
    return { attacker, defender, base, superEffective };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const base = params.base as number;
    const superEffective = params.superEffective as boolean;
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const answer = superEffective ? base * 2 : Math.floor(base / 2);

    return {
      answer,
      steps: [
        {
          en: superEffective
            ? `Super effective! ${base} × 2 = ${answer}`
            : `Not very effective! ${base} ÷ 2 = ${answer}`,
          he: superEffective
            ? `יעיל במיוחד! ${base} × 2 = ${answer}`
            : `לא יעיל במיוחד! ${base} ÷ 2 = ${answer}`,
        },
      ],
      hint: {
        en: superEffective ? `Super effective means ×2 the damage.` : `Not very effective means ×0.5 (half the damage).`,
        he: superEffective ? `יעיל במיוחד = כפול נזק.` : `לא יעיל במיוחד = חצי נזק.`,
      },
      assets: [pokemonAsset(attacker), pokemonAsset(defender)],
      distractors: [base, base * 3, Math.abs(base - answer)],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const attacker = params.attacker as QuestionPokemon;
    const defender = params.defender as QuestionPokemon;
    const base = params.base as number;
    const superEffective = params.superEffective as boolean;
    const label = superEffective
      ? { en: 'SUPER EFFECTIVE (×2)', he: 'יעיל במיוחד (×2)' }
      : { en: 'NOT VERY EFFECTIVE (×0.5)', he: 'לא יעיל במיוחד (×0.5)' };

    return {
      en: `${attacker.name.en} attacks ${defender.name.en}!\n` +
          `It's ${label.en}!\nBase damage = ${base}.\nWhat is the final damage?`,
      he: `${attacker.name.he} תקף את ${defender.name.he}!\n` +
          `${label.he}!\nנזק בסיסי = ${base}.\nמהו הנזק הסופי?`,
    };
  }
}
