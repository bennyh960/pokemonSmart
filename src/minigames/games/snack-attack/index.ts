/**
 * Snack Attack games — arcade + math (docs/stories/mini-games.md §3). One engine, one def per Pokémon world:
 * Snorlax eats berries, Bulbasaur catches sun drops, Charmander catches embers, Squirtle swims into bubbles
 * (and dodges rocks), Pikachu catches bolts. Each def also has a `care` trigger: that Pokémon's line, hurt in
 * the wild, asks to play it (src/minigames/care.ts).
 * Logic: sim.ts (pure, tested) · look: skins.ts · view: SnackAttackGame.tsx. Only this folder belongs to the games.
 */

import type { ComponentType } from 'react';
import { createElement } from 'react';
import {
  defineMiniGame,
  heldItemPrize,
  item,
  money,
  prize,
  prizeOneOf,
  timesPrize,
  vitaminPrize,
  xItemPrize,
} from '../../define.js';
import type {
  Bilingual,
  MiniGameCare,
  MiniGameDef,
  MiniGameId,
  MiniGameLevelRewards,
  MiniGamePrizeDef,
  MiniGameProps,
  MiniGameTheme,
} from '../../types.js';
import type { SnackConfig, SnackOp } from './config.js';
import { MIN_PACE } from './sim.js';
import { SnackAttackGame } from './SnackAttackGame.js';
import { BULBASAUR_SKIN, CHARMANDER_SKIN, PIKACHU_SKIN, SNORLAX_SKIN, SQUIRTLE_SKIN, type SnackSkin } from './skins.js';

export type { SnackConfig } from './config.js';

const SNORLAX = 143;
const BULBASAUR = 1;
const CHARMANDER = 4;
const SQUIRTLE = 7;
const PIKACHU = 25;

// ── Levels ──────────────────────────────────────────────────────────────────

type SnackMath = Omit<SnackConfig, 'pace' | 'roundSeconds' | 'starScores'>;

interface SnackLevelData {
  math: SnackMath;
  starScores: SnackConfig['starScores'];
  /** New ★★ prizes of this level — the ★★ list also keeps every earlier level's. */
  adds: MiniGamePrizeDef[];
  /** ★★★: the ★★ prizes from level `from` up to this one, quantities × `times` — or a list of its own. */
  threeStar: { from: number; times: number } | MiniGamePrizeDef[];
}

const STATUS_CURES = ['antidote', 'paralyze-heal', 'awakening', 'burn-heal', 'ice-heal'];
const ADD_SUB = { targetMin: 10, targetMax: 20, berryMin: 1, berryMax: 9 };

/**
 * The 10 levels, shared by every Snack Attack game: one op at a time, then mixes — + → − → ± → × → ÷ → all four.
 * Each level is a little faster (`pace` MIN_PACE → 1). A level pays from ★★ (`prizeStars`); care rounds pay it on
 * every win, the games menu once per level.
 */
const SNACK_LEVELS: readonly SnackLevelData[] = [
  {
    math: { ops: ['add'], targetMin: 5, targetMax: 10, berryMin: 1, berryMax: 5 },
    starScores: [30, 100, 210],
    adds: [
      prize('common', item('poke-ball')),
      prize('common', item('potion')),
      prizeOneOf(
        'common',
        STATUS_CURES.map((id) => item(id)),
        { en: 'Status cure', he: 'תרופה' },
      ),
    ],
    threeStar: { from: 1, times: 3 },
  },
  {
    math: { ops: ['sub'], targetMin: 5, targetMax: 10, berryMin: 1, berryMax: 5 },
    starScores: [60, 150, 340],
    adds: [prize('common', item('great-ball')), prize('common', item('super-potion'))],
    threeStar: { from: 1, times: 3 },
  },
  {
    math: { ops: ['add', 'sub'], ...ADD_SUB },
    starScores: [30, 100, 250],
    adds: [
      prize('good', item('ultra-ball')),
      prize('good', item('hyper-potion')),
      prize('good', item('full-heal')),
      prize('good', item('ether')),
    ],
    threeStar: { from: 3, times: 3 },
  },
  {
    math: { ops: ['times'], targetMin: 0, targetMax: 0, berryMin: 1, berryMax: 5, maxTable: 5 },
    starScores: [70, 280, 410],
    adds: [prize('good', item('max-potion')), xItemPrize('good')],
    threeStar: { from: 3, times: 3 },
  },
  {
    math: { ops: ['add', 'times'], ...ADD_SUB, maxTable: 5 },
    starScores: [40, 170, 360],
    adds: [prize('rare', item('max-ether')), prize('rare', money(10000))],
    threeStar: { from: 1, times: 4 },
  },
  {
    math: { ops: ['sub', 'times'], ...ADD_SUB, maxTable: 6 },
    starScores: [80, 290, 490],
    adds: [prize('rare', item('elixir')), prize('rare', money(15000))],
    threeStar: { from: 1, times: 4 },
  },
  {
    math: { ops: ['add', 'sub', 'times'], ...ADD_SUB, maxTable: 7 },
    starScores: [60, 220, 440],
    adds: [prize('rare', item('max-elixir')), vitaminPrize('rare', 1)],
    threeStar: { from: 1, times: 5 },
  },
  {
    math: { ops: ['div'], targetMin: 0, targetMax: 0, berryMin: 1, berryMax: 9, maxTable: 5 },
    starScores: [330, 1030, 1300],
    adds: [prize('epic', item('rare-candy')), prize('epic', money(20000))],
    threeStar: { from: 1, times: 5 },
  },
  {
    math: { ops: ['div', 'times'], targetMin: 0, targetMax: 0, berryMin: 1, berryMax: 9, maxTable: 7 },
    starScores: [120, 640, 860],
    adds: [heldItemPrize('epic')],
    threeStar: { from: 1, times: 5 },
  },
  {
    math: {
      ops: ['add', 'sub', 'times', 'div'],
      targetMin: 10,
      targetMax: 30,
      berryMin: 1,
      berryMax: 10,
      maxTable: 10,
      feverOften: true,
    },
    starScores: [90, 510, 730],
    adds: [],
    threeStar: [
      prize('epic', item('leftovers')),
      timesPrize(vitaminPrize('epic', 1), 10),
      prize('epic', money(50000)),
      prize('epic', item('master-ball')),
      prize('epic', item('max-elixir', 20)),
      prize('epic', item('full-restore', 20)),
    ],
  },
];

/** The level configs (exported for tests and tuning). */
export const SNACK_LEVEL_CONFIGS: readonly SnackConfig[] = SNACK_LEVELS.map((l, i) => ({
  ...l.math,
  pace: MIN_PACE + ((1 - MIN_PACE) * i) / (SNACK_LEVELS.length - 1),
  roundSeconds: 60,
  starScores: l.starScores,
}));

/** ★★ list of level i: every level's adds up to it. */
function twoStarPrizes(i: number): MiniGamePrizeDef[] {
  return SNACK_LEVELS.slice(0, i + 1).flatMap((l) => l.adds);
}

function levelRewards(i: number): MiniGameLevelRewards {
  const three = SNACK_LEVELS[i].threeStar;
  return {
    firstClear: twoStarPrizes(i),
    threeStar: Array.isArray(three)
      ? three
      : SNACK_LEVELS.slice(three.from - 1, i + 1)
          .flatMap((l) => l.adds)
          .map((p) => timesPrize(p, three.times)),
    replay: prize('common', money(50 * (i + 1))),
  };
}

const LEVEL_NAMES: Partial<Record<number, Bilingual>> = {
  1: { en: 'Junior', he: 'מתחיל' },
  10: { en: 'Master', he: 'אלוף' },
};

const OP_WORD: Record<SnackOp, Bilingual> = {
  add: { en: 'plus', he: 'חיבור' },
  sub: { en: 'minus', he: 'חיסור' },
  times: { en: 'times', he: 'כפל' },
  div: { en: 'divide', he: 'חילוק' },
};
const ONE_OP_GOAL: Record<SnackOp, Bilingual> = {
  add: { en: 'Add up to the number!', he: 'מחברים עד המספר!' },
  sub: { en: 'Take away down to the number!', he: 'מורידים עד המספר!' },
  times: { en: 'Catch 2 that multiply to the number!', he: 'תופסים 2 שמכפלתם היא המספר!' },
  div: { en: 'Catch the number that divides it!', he: 'תופסים את המספר שמחלק!' },
};

/** "Add up to the number!", or "Plus, minus and times — all mixed!" for a mixed level. */
function goalOf(ops: readonly SnackOp[]): Bilingual {
  if (ops.length === 1) return ONE_OP_GOAL[ops[0]];
  const ordered = (Object.keys(OP_WORD) as SnackOp[]).filter((op) => ops.includes(op));
  const list = (words: string[], and: string) => `${words.slice(0, -1).join(', ')}${and}${words[words.length - 1]}`;
  const en = list(
    ordered.map((op) => OP_WORD[op].en),
    ' and ',
  );
  const he = list(
    ordered.map((op) => OP_WORD[op].he),
    ' ו',
  );
  return { en: `${en[0].toUpperCase()}${en.slice(1)} — all mixed!`, he: `${he} — הכול מעורבב!` };
}

interface SnackGameData {
  id: MiniGameId;
  name: Bilingual;
  tagline: Bilingual;
  theme: MiniGameTheme;
  mascotPokemonId: number;
  skin: SnackSkin;
  /** Applied to every level (e.g. Squirtle swims faster through more rocks). */
  configOverride?: Partial<SnackConfig>;
  care: MiniGameCare;
}

function snackGame(data: SnackGameData): MiniGameDef<SnackConfig> {
  const Component: ComponentType<MiniGameProps<SnackConfig>> = (props) =>
    createElement(SnackAttackGame, { ...props, skin: data.skin });
  Component.displayName = `SnackAttack(${data.id})`;
  return defineMiniGame<SnackConfig>({
    id: data.id,
    name: data.name,
    tagline: data.tagline,
    category: 'arcade',
    theme: data.theme,
    mascotPokemonId: data.mascotPokemonId,
    care: data.care,
    levels: SNACK_LEVEL_CONFIGS.map((config, i) => ({
      number: i + 1,
      name: LEVEL_NAMES[i + 1],
      short: LEVEL_NAMES[i + 1],
      goal: goalOf(config.ops),
      rewards: levelRewards(i),
      prizeStars: 2,
      // Level N opens level N+1 after N wins with 3★
      unlockWins: i + 1,
      config: { ...config, ...data.configOverride },
    })),
    Component,
  });
}

export const snorlaxSnack = snackGame({
  id: 'snorlax-snack',
  name: { en: 'Snorlax Snack Attack', he: 'החטיף של סנורלקס' },
  tagline: { en: 'Feed Snorlax berries that add up exactly!', he: 'מאכילים את סנורלקס בפירות שמסתכמים בדיוק!' },
  theme: { from: '#f97316', to: '#db2777', accent: '#2dd4bf', accentText: '#042f2e' },
  mascotPokemonId: SNORLAX,
  skin: SNORLAX_SKIN,
  care: {
    lineOf: SNORLAX,
    habitat: ['grass'],
    statusAfter: 'sleep',
    prompt: {
      en: "{name}'s tummy is rumbling… Feed it some berries?",
      he: 'הבטן של {name} מקרקרת… להאכיל אותו בפירות?',
    },
    intro: {
      en: '{name} is SO hungry! Fill its belly with berries — then it will feel great… and take a big nap!',
      he: '{name} רעב נורא! ממלאים לו את הבטן בפירות — והוא ירגיש מצוין… וילך לישון שנ"צ גדול!',
    },
  },
});

export const bulbasaurSun = snackGame({
  id: 'bulbasaur-sun',
  name: { en: 'Sunny Bulb', he: 'הפקעת של בולבסאור' },
  tagline: { en: 'Catch sun drops that add up exactly!', he: 'תופסים טיפות שמש שמסתכמות בדיוק!' },
  theme: { from: '#22c55e', to: '#0d9488', accent: '#facc15', accentText: '#422006' },
  mascotPokemonId: BULBASAUR,
  skin: BULBASAUR_SKIN,
  care: {
    lineOf: BULBASAUR,
    habitat: ['grass'],
    statusAfter: null,
    prompt: { en: '{name} is wilting… Find it some sunshine?', he: '{name} נובל… למצוא לו קצת שמש?' },
    intro: {
      en: '{name} is tired and droopy. Catch sunshine for its bulb and it will bloom with energy!',
      he: '{name} עייף ונבול. תופסים שמש בשביל הפקעת שלו — והוא יפרח מאנרגיה!',
    },
  },
});

export const charmanderFlame = snackGame({
  id: 'charmander-flame',
  name: { en: 'Flame Feast', he: 'חגיגת הלהבות' },
  tagline: { en: 'Catch embers that add up exactly!', he: 'תופסים גחלים שמסתכמות בדיוק!' },
  theme: { from: '#f97316', to: '#b91c1c', accent: '#fde047', accentText: '#451a03' },
  mascotPokemonId: CHARMANDER,
  skin: CHARMANDER_SKIN,
  care: {
    lineOf: CHARMANDER,
    habitat: ['ground', 'mountain'],
    statusAfter: null,
    prompt: {
      en: "{name}'s tail flame is getting small… Feed the fire?",
      he: 'הלהבה בזנב של {name} נחלשת… להזין את האש?',
    },
    intro: {
      en: "{name}'s flame is tiny! Catch embers to make it burn bright again!",
      he: 'הלהבה של {name} קטנטנה! תופסים גחלים כדי שתבער חזק שוב!',
    },
  },
});

export const squirtleSwim = snackGame({
  id: 'squirtle-swim',
  name: { en: 'Squirtle Swim', he: 'השחייה של סקווירטל' },
  tagline: { en: 'Swim into bubbles that add up — dodge the rocks!', he: 'שוחים אל בועות שמסתכמות — ונזהרים מהסלעים!' },
  theme: { from: '#0ea5e9', to: '#1d4ed8', accent: '#fbbf24', accentText: '#451a03' },
  mascotPokemonId: SQUIRTLE,
  skin: SQUIRTLE_SKIN,
  // A swim: the river runs faster and has more rocks to dodge
  configOverride: { fallScale: 1.12, hazardScale: 1.5 },
  care: {
    lineOf: SQUIRTLE,
    habitat: ['water'],
    statusAfter: null,
    prompt: { en: '{name} is splashing around… Go for a swim?', he: '{name} משפריץ מים מרוב התרגשות… לצאת לשחות?' },
    intro: {
      en: '{name} needs a swim! Grab the bubbles, watch out for rocks — and it will feel great again!',
      he: '{name} צריך לשחות! תופסים בועות, נזהרים מסלעים — והוא ירגיש מצוין שוב!',
    },
  },
});

export const pikachuCharge = snackGame({
  id: 'pikachu-charge',
  name: { en: 'Pikachu Power Charge', he: 'הטעינה של פיקאצ׳ו' },
  tagline: { en: 'Catch bolts that add up exactly!', he: 'תופסים ברקים שמסתכמים בדיוק!' },
  theme: { from: '#eab308', to: '#6d28d9', accent: '#f43f5e', accentText: '#ffffff' },
  mascotPokemonId: PIKACHU,
  skin: PIKACHU_SKIN,
  care: {
    lineOf: PIKACHU,
    habitat: ['grass', 'ground'],
    statusAfter: null,
    prompt: {
      en: "{name}'s cheeks are barely sparking… Charge it up?",
      he: 'הלחיים של {name} כמעט לא מנצנצות… להטעין אותו?',
    },
    intro: {
      en: '{name} is out of power! Catch lightning to charge it back up!',
      he: 'ל{name} נגמר הכוח! תופסים ברקים כדי להטעין אותו מחדש!',
    },
  },
});
