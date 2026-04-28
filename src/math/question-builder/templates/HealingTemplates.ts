/**
 * HealingTemplates.ts
 *
 * Question templates themed around healing Pokémon.
 * Templates in this file:
 *
 *   1. PotionsNeededTemplate  ("healing.potions-needed")
 *      Grade 2-4 · ops: -, ÷
 *      "{pokemon}'s max HP is {maxHP}. It currently has {currentHP} HP.
 *       Each {healer} restores {healAmount} HP. How many do you need?"
 */

import { QuestionTemplate, type SolveResult } from '../QuestionTemplate.js';
import type {
  BilingualText,
  ClassConfig,
  PokemonWorldSnapshot,
  QuestionAsset,
  QuestionPokemon,
  TemplateParams,
} from '../types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pokemonAsset(p: QuestionPokemon): QuestionAsset {
  return { kind: 'pokemon', id: p.id, spriteUrl: p.spriteUrl, label: p.name };
}

interface HealerDef {
  name: BilingualText;
  heal: number;
}

const HEALERS: HealerDef[] = [
  { name: { en: 'Potion', he: 'תרופה' }, heal: 20 },
  { name: { en: 'Super Potion', he: 'תרופה מיוחדת' }, heal: 50 },
  { name: { en: 'Hyper Potion', he: 'תרופה מקסימלית' }, heal: 120 },
  { name: { en: 'Fresh Water', he: 'מים טריים' }, heal: 30 },
  { name: { en: 'Moomoo Milk', he: 'חלב מו-מו' }, heal: 100 },
];

// ─── 1. PotionsNeededTemplate ─────────────────────────────────────────────────

/**
 * "{pokemon}'s max HP is {maxHP}. Currently at {currentHP} HP.
 *  Each {healer} restores {healAmount} HP. How many to fully heal?"
 * Answer: (maxHP - currentHP) ÷ healAmount
 * Generation always ensures clean exact division — no ceiling needed.
 * Teaches: two-step subtract then divide.
 */
export class PotionsNeededTemplate extends QuestionTemplate {
  readonly id = 'healing.potions-needed';
  readonly name: BilingualText = {
    en: 'Potions Needed to Fully Heal',
    he: 'כמה תרופות נדרשות לריפוי מלא?',
  };
  readonly category = 'healing' as const;
  readonly requiredOperations = ['-', '÷'] as const;
  readonly minDifficulty = 2 as const;
  readonly maxDifficulty = 4 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const pokemon = this.pickRandom(snapshot.pokemon);
    const maxHeal = config.numberRange.max;
    // Pick healers whose amount allows at least timesNeeded=2 within the grade range
    const validHealers = HEALERS.filter(h => h.heal * 2 <= maxHeal);
    const healer = this.pickRandom(validHealers.length > 0 ? validHealers : HEALERS.slice(0, 2));

    // Always generate exact division: missing = heal × timesNeeded
    const maxTimes = Math.min(5, Math.floor(maxHeal / healer.heal));
    const timesNeeded = this.randInt(2, Math.max(2, maxTimes));
    const missing = healer.heal * timesNeeded;
    const maxHP = missing + this.randInt(5, Math.min(30, Math.max(5, maxHeal - missing)));
    const currentHP = maxHP - missing;

    return { pokemon, healer, maxHP, currentHP, healAmount: healer.heal };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const pokemon = params.pokemon as QuestionPokemon;
    const healer = params.healer as HealerDef;
    const maxHP = params.maxHP as number;
    const currentHP = params.currentHP as number;
    const healAmount = params.healAmount as number;
    const missing = maxHP - currentHP;
    const answer = missing / healAmount;

    return {
      answer,
      steps: [
        { en: `HP missing: ${maxHP} − ${currentHP} = ${missing}`, he: `HP חסר: ${maxHP} − ${currentHP} = ${missing}` },
        { en: `Potions needed: ${missing} ÷ ${healAmount} = ${answer}`, he: `תרופות נדרשות: ${missing} ÷ ${healAmount} = ${answer}` },
      ],
      hint: {
        en: `First find how much HP is missing, then divide by how much each ${healer.name.en} heals.`,
        he: `ראשית מצא כמה HP חסר, ואז חלק בכמות ה-HP שכל ${healer.name.he} מרפאת.`,
      },
      assets: [pokemonAsset(pokemon)],
      distractors: [answer + 1, Math.max(1, answer - 1), answer * 2],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const pokemon = params.pokemon as QuestionPokemon;
    const healer = params.healer as HealerDef;
    const maxHP = params.maxHP as number;
    const currentHP = params.currentHP as number;
    const healAmount = params.healAmount as number;
    return {
      en:
        `${pokemon.name.en}'s max HP is ${maxHP}. Currently it has ${currentHP} HP.\n` +
        `Each ${healer.name.en} restores ${healAmount} HP.\n` +
        `How many ${healer.name.en}s do you need to fully heal ${pokemon.name.en}?`,
      he:
        `ה-HP המקסימלי של ${pokemon.name.he} הוא ${maxHP}. כרגע יש לו ${currentHP} HP.\n` +
        `כל ${healer.name.he} מחזיר ${healAmount} HP.\n` +
        `כמה ${healer.name.he} צריך כדי לרפא את ${pokemon.name.he} לגמרי?`,
    };
  }
}
