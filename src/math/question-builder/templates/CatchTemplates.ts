/**
 * CatchTemplates.ts
 *
 * Question templates themed around catching Pokémon.
 * Templates in this file:
 *
 *   1. PokeBallsNeededTemplate    ("catch.pokeballs-needed")
 *      Grade 1-3 · ops: -
 *      "You need {needed} Poké Balls to catch {pokemon}. You have {have}.
 *       How many more do you need to buy?"
 *
 *   2. HPReductionTemplate        ("catch.hp-reduction")
 *      Grade 3-5 · ops: -, ÷
 *      "{pokemon} has {hp} HP. To catch it you must lower its HP to {target}.
 *       Your attack does {dmg} damage each turn. How many turns do you need?"
 *
 *   3. CatchCostTemplate          ("catch.catch-cost")
 *      Grade 2-4 · ops: ×, +
 *      "To catch {pokemon} you need {balls} Poké Balls and {potions} Potions.
 *       Balls cost {bp}₽, Potions cost {pp}₽. How much will the catch cost?"
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pokemonAsset(p: QuestionPokemon): QuestionAsset {
  return { kind: 'pokemon', id: p.id, spriteUrl: p.spriteUrl, label: p.name };
}

function itemAsset(item: StoreItem): QuestionAsset {
  return { kind: 'item', id: item.id, spriteUrl: item.spriteUrl, label: item.name };
}

// ─── 1. PokeBallsNeededTemplate ───────────────────────────────────────────────

/**
 * Subtraction: figure out how many more Poké Balls to buy.
 */
export class PokeBallsNeededTemplate extends QuestionTemplate {
  readonly id = 'catch.pokeballs-needed';
  readonly name: BilingualText = {
    en: 'Poké Balls Needed',
    he: 'כדורים נדרשים לתפיסה',
  };
  readonly category = 'catch' as const;
  readonly requiredOperations = ['-'] as const;
  readonly minDifficulty = 1 as const;
  readonly maxDifficulty = 3 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const pokemon = this.pickRandom(snapshot.pokemon);
    const needed = this.pickNumber(config, 3, Math.min(20, config.numberRange.max));
    const have = this.randInt(0, needed - 1); // always have fewer than needed
    return { pokemon, needed, have };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const pokemon = params.pokemon as QuestionPokemon;
    const needed = params.needed as number;
    const have = params.have as number;
    const answer = needed - have;

    return {
      answer,
      steps: [
        {
          en: `Balls needed − Balls you have = ${needed} − ${have} = ${answer}`,
          he: `כדורים נדרשים − כדורים שיש לך = ${needed} − ${have} = ${answer}`,
        },
      ],
      hint: {
        en: `Subtract what you have from what you need.`,
        he: `חסר ממה שצריך את מה שכבר יש לך.`,
      },
      assets: [pokemonAsset(pokemon)],
      distractors: [answer + 1, needed, have],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const pokemon = params.pokemon as QuestionPokemon;
    const needed = params.needed as number;
    const have = params.have as number;
    return {
      en:
        `To catch ${pokemon.name.en} you need ${needed} Poké Balls.\n` +
        `You already have ${have}.\nHow many more do you need to buy?`,
      he:
        `כדי לתפוס את ${pokemon.name.he} אתה צריך ${needed} פוכדור${needed > 1 ? 'ים' : ''}.\n` +
        `כבר יש לך ${have}.\nכמה עוד אתה צריך לקנות?`,
    };
  }
}

// ─── 2. HPReductionTemplate ───────────────────────────────────────────────────

/**
 * Division: how many attacks to lower HP enough to catch the Pokémon.
 */
export class HPReductionTemplate extends QuestionTemplate {
  readonly id = 'catch.hp-reduction';
  readonly name: BilingualText = {
    en: 'HP Reduction to Catch',
    he: 'הפחתת HP לתפיסה',
  };
  readonly category = 'catch' as const;
  readonly requiredOperations = ['-', '÷'] as const;
  readonly minDifficulty = 2 as const;
  readonly maxDifficulty = 4 as const;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const pokemon = this.pickRandom(snapshot.pokemon);
    const divisor = this.randInt(2, 8); // attack damage per turn
    const turnsNeeded = this.randInt(2, Math.min(8, config.numberRange.max));
    const hpToReduce = divisor * turnsNeeded; // ensures clean division
    const target = this.randInt(1, 15); // HP they need to reach
    const hp = hpToReduce + target;

    return { pokemon, hp, target, dmg: divisor };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const pokemon = params.pokemon as QuestionPokemon;
    const hp = params.hp as number;
    const target = params.target as number;
    const dmg = params.dmg as number;
    const toReduce = hp - target;
    const answer = Math.ceil(toReduce / dmg);

    return {
      answer,
      steps: [
        {
          en: `HP to reduce: ${hp} − ${target} = ${toReduce}`,
          he: `HP להפחית: ${hp} − ${target} = ${toReduce}`,
        },
        {
          en: `Turns needed: ${toReduce} ÷ ${dmg} = ${answer}`,
          he: `תורות נדרשות: ${toReduce} ÷ ${dmg} = ${answer}`,
        },
      ],
      hint: {
        en: `First find how much HP you must reduce, then divide by the damage per turn.`,
        he: `ראשית מצא כמה HP יש להפחית, ואז חלק בנזק לכל תור.`,
      },
      assets: [pokemonAsset(pokemon)],
      distractors: [answer + 1, answer - 1, Math.ceil(hp / dmg)],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const pokemon = params.pokemon as QuestionPokemon;
    const hp = params.hp as number;
    const target = params.target as number;
    const dmg = params.dmg as number;
    return {
      en:
        `${pokemon.name.en} has ${hp} HP.\n` +
        `To catch it you must lower its HP to ${target} or below.\n` +
        `Your move deals ${dmg} damage each turn.\n` +
        `How many turns do you need to attack?`,
      he:
        `ל-${pokemon.name.he} יש ${hp} נקודות HP.\n` +
        ` (HP = Health Points = נקודות חיים)\n` +
        `כדי לתפוס אותו תצטרך להוריד את ה-HP שלו ל-${target} או פחות.\n` +
        `המהלך שלך גורם ${dmg} נזק בכל תור.\n` +
        `כמה תורות תצטרך לתקוף?`,
    };
  }
}

// ─── 3. CatchCostTemplate ─────────────────────────────────────────────────────

/**
 * Two-step multiplication + addition: total cost of balls + potions for a catch.
 */
export class CatchCostTemplate extends QuestionTemplate {
  readonly id = 'catch.catch-cost';
  readonly name: BilingualText = {
    en: 'Total Cost to Catch',
    he: 'עלות כוללת של תפיסה',
  };
  readonly category = 'catch' as const;
  readonly requiredOperations = ['×', '+'] as const;
  readonly minDifficulty = 2 as const;
  readonly maxDifficulty = 4 as const;

  // Poke Ball id = 4 (200₽), Potion id = 17 (300₽) — hardcoded for reliability
  private static readonly POKEBALL_ID = 4;
  private static readonly POTION_ID = 17;

  protected generateParams(snapshot: PokemonWorldSnapshot, config: ClassConfig): TemplateParams {
    const pokemon = this.pickRandom(snapshot.pokemon);
    const ball =
      snapshot.items.find((i) => i.id === CatchCostTemplate.POKEBALL_ID) ??
      snapshot.items.find((i) => i.category === 'pokeball') ??
      snapshot.items[0];
    const potion =
      snapshot.items.find((i) => i.id === CatchCostTemplate.POTION_ID) ??
      snapshot.items.find((i) => i.category === 'healing') ??
      snapshot.items[1];

    // Generous upper bound — makes quantities more diverse (1–8 balls, 0–6 potions)
    const maxBalls = Math.min(8, Math.floor(config.numberRange.max / ball.price));
    const maxPotions = Math.min(6, Math.floor(config.numberRange.max / potion.price));
    const balls = this.randInt(1, Math.max(1, maxBalls)); // always ≥ 1
    const potions = this.randInt(0, Math.max(0, maxPotions)); // can be 0

    return { pokemon, ball, potion, balls, potions };
  }

  protected solve(params: TemplateParams, _config: ClassConfig): SolveResult {
    const pokemon = params.pokemon as QuestionPokemon;
    const ball = params.ball as StoreItem;
    const potion = params.potion as StoreItem;
    const balls = params.balls as number;
    const potions = params.potions as number;
    const ballCost = ball.price * balls;
    const potionCost = potion.price * potions;
    const answer = ballCost + potionCost;

    const steps: BilingualText[] = [
      {
        en: `Poké Balls: ${balls} × ${ball.price}₽ = ${ballCost}₽`,
        he: `פוכדור${balls > 1 ? 'ים' : ''}: ${balls} × ${ball.price}₽ = ${ballCost}₽`,
      },
    ];
    if (potions > 0) {
      steps.push({
        en: `Potions: ${potions} × ${potion.price}₽ = ${potionCost}₽`,
        he: `תרופות: ${potions} × ${potion.price}₽ = ${potionCost}₽`,
      });
      steps.push({
        en: `Total: ${ballCost}₽ + ${potionCost}₽ = ${answer}₽`,
        he: `סכום: ${ballCost}₽ + ${potionCost}₽ = ${answer}₽`,
      });
    }

    const assets: QuestionAsset[] = [pokemonAsset(pokemon), itemAsset(ball)];
    if (potions > 0) assets.push(itemAsset(potion));

    return {
      answer,
      steps,
      hint: {
        en: `Calculate the cost of each item group separately, then add them.`,
        he: `חשב את עלות כל קבוצת פריטים בנפרד, ואז חבר.`,
      },
      assets,
      distractors: [
        ballCost + potion.price,
        potionCost > 0 ? potionCost + ball.price : answer + ball.price,
        answer + ball.price,
      ],
    };
  }

  protected questionText(params: TemplateParams): BilingualText {
    const pokemon = params.pokemon as QuestionPokemon;
    const ball = params.ball as StoreItem;
    const potion = params.potion as StoreItem;
    const balls = params.balls as number;
    const potions = params.potions as number;

    if (potions === 0) {
      return {
        en: `To catch ${pokemon.name.en} you'll need ${balls} Poké Ball${balls > 1 ? 's' : ''} (${ball.price}₽ each).\nHow much will everything cost?`,
        he: `כדי לתפוס את ${pokemon.name.he} תצטרך ${balls} פוכדור${balls > 1 ? 'ים' : ''} (${ball.price}₽ כל אחד).\nכמה יעלה הכל?`,
      };
    }

    return {
      en:
        `To catch ${pokemon.name.en} you'll need:\n` +
        `• ${balls} Poké Ball${balls > 1 ? 's' : ''} at ${ball.price}₽ each\n` +
        `• ${potions} Potion${potions > 1 ? 's' : ''} at ${potion.price}₽ each\n` +
        `How much will everything cost?`,
      he:
        `כדי לתפוס את ${pokemon.name.he} תצטרך:\n` +
        `• ${balls} פוכדור${balls > 1 ? 'ים' : ''} ב-${ball.price}₽ כל אחד\n` +
        `• ${potions} תרופות ב-${potion.price}₽ כל אחת\n` +
        `כמה יעלה הכל?`,
    };
  }
}
