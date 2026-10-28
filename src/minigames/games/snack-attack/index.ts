/**
 * Snack Attack games — arcade + math (docs/stories/mini-games.md §3). One engine, one def per Pokémon world:
 * Snorlax eats berries, Bulbasaur catches sun drops, Charmander catches embers, Squirtle swims into bubbles
 * (and dodges rocks), Pikachu catches bolts. Each def also has a `care` trigger: that Pokémon's line, hurt in
 * the wild, asks to play it (src/minigames/care.ts).
 * Logic: sim.ts (pure, tested) · look: skins.ts · view: SnackAttackGame.tsx. Only this folder belongs to the games.
 */

import type { ComponentType } from 'react';
import { createElement } from 'react';
import { defineMiniGame, evolutionStonePrize, item, money, prize, vitaminPrize, xItemPrize } from '../../define.js';
import type {
  Bilingual,
  MiniGameCare,
  MiniGameDef,
  MiniGameId,
  MiniGameLevelRewards,
  MiniGameProps,
  MiniGameTheme,
} from '../../types.js';
import type { SnackConfig } from './config.js';
import { SnackAttackGame } from './SnackAttackGame.js';
import { BULBASAUR_SKIN, CHARMANDER_SKIN, PIKACHU_SKIN, SNORLAX_SKIN, SQUIRTLE_SKIN, type SnackSkin } from './skins.js';

export type { SnackConfig } from './config.js';

const SNORLAX = 143;
const BULBASAUR = 1;
const CHARMANDER = 4;
const SQUIRTLE = 7;
const PIKACHU = 25;

/** The math of levels 1–5, shared by every Snack Attack game. */
export const SNACK_LEVEL_CONFIGS: readonly SnackConfig[] = [
  {
    math: 'add',
    targetMin: 5,
    targetMax: 10,
    berryMin: 1,
    berryMax: 5,
    speed: 'slow',
    roundSeconds: 60,
    starScores: [60, 220, 380],
  },
  {
    math: 'add',
    targetMin: 10,
    targetMax: 20,
    berryMin: 1,
    berryMax: 9,
    speed: 'medium',
    roundSeconds: 60,
    starScores: [60, 200, 350],
  },
  {
    math: 'add-sub',
    targetMin: 10,
    targetMax: 20,
    berryMin: 1,
    berryMax: 9,
    speed: 'medium',
    roundSeconds: 60,
    starScores: [50, 200, 360],
  },
  {
    math: 'times',
    targetMin: 2,
    targetMax: 50,
    berryMin: 1,
    berryMax: 10,
    speed: 'fast',
    roundSeconds: 60,
    starScores: [60, 220, 450],
    maxTable: 5,
  },
  {
    math: 'times',
    targetMin: 1,
    targetMax: 100,
    berryMin: 1,
    berryMax: 10,
    speed: 'fast',
    roundSeconds: 60,
    starScores: [80, 280, 560],
    maxTable: 10,
    feverOften: true,
  },
];

const GOALS: readonly Bilingual[] = [
  { en: 'Add up to the number!', he: 'מחברים עד המספר!' },
  { en: 'Bigger numbers, faster!', he: 'מספרים גדולים, מהר יותר!' },
  { en: 'Some take away!', he: 'חלק מורידים!' },
  { en: 'Catch 2 that multiply to the number!', he: 'תופסים 2 שמכפלתם היא המספר!' },
  { en: 'All the times tables — and lots of Fever!', he: 'כל לוח הכפל — והרבה קדחת!' },
];

/** Level prizes of the starter / Pikachu games: themed held item at L4, the line's stone at L5. */
function starterRewards(typeItem: string, stone: string): MiniGameLevelRewards[] {
  return [
    {
      firstClear: prize('common', item('potion', 3)),
      threeStar: prize('good', item('great-ball', 3)),
      replay: prize('common', money(100)),
    },
    {
      firstClear: prize('good', item('super-potion', 2)),
      threeStar: xItemPrize('good', 2),
      replay: prize('common', money(150)),
    },
    {
      firstClear: prize('good', item('ultra-ball', 2)),
      threeStar: prize('rare', item('rare-candy')),
      replay: prize('common', money(200)),
    },
    {
      firstClear: prize('rare', item(typeItem)),
      threeStar: prize('rare', item('max-potion', 2)),
      replay: prize('good', money(300)),
    },
    {
      firstClear: prize('rare', item(stone)),
      threeStar: prize('epic', item('leftovers')),
      replay: prize('good', money(400)),
    },
  ];
}

const SNORLAX_REWARDS: MiniGameLevelRewards[] = [
  // design: Oran Berry ×5 — not in the game's item data; Fresh Water is the closest snack-heal
  {
    firstClear: prize('common', item('fresh-water', 5)),
    threeStar: prize('common', item('potion', 3)),
    replay: prize('common', money(100)),
  },
  // design: Sitrus Berry ×3 — not in the game's item data; Moomoo Milk is the closest snack-heal
  {
    firstClear: prize('good', item('moomoo-milk', 3)),
    threeStar: prize('good', item('great-ball', 3)),
    replay: prize('common', money(150)),
  },
  {
    firstClear: prize('good', item('ultra-ball', 2)),
    threeStar: prize('rare', item('rare-candy')),
    replay: prize('common', money(200)),
  },
  {
    firstClear: prize('rare', item('rare-candy', 2)),
    threeStar: prize('rare', item('max-elixir')),
    replay: prize('good', money(300)),
  },
  {
    firstClear: evolutionStonePrize('rare'),
    threeStar: prize('epic', item('master-ball')),
    replay: prize('good', money(400)),
  },
];

interface SnackGameData {
  id: MiniGameId;
  name: Bilingual;
  tagline: Bilingual;
  theme: MiniGameTheme;
  mascotPokemonId: number;
  skin: SnackSkin;
  levelNames: Bilingual[];
  /** Per-level goal lines (default: GOALS, with the skin's "take away" line on level 3). */
  goals?: Bilingual[];
  rewards: MiniGameLevelRewards[];
  /** Applied to every level (e.g. Squirtle swims faster through more rocks). */
  configOverride?: Partial<SnackConfig>;
  care: MiniGameCare;
}

function snackGame(data: SnackGameData): MiniGameDef<SnackConfig> {
  const goals = data.goals ?? GOALS.map((g, i) => (i === 2 ? data.skin.text.hintSub : g));
  const Component: ComponentType<MiniGameProps<SnackConfig>> = (props) =>
    createElement(SnackAttackGame, { ...props, skin: data.skin });
  Component.displayName = `SnackAttack(${data.id})`;
  return defineMiniGame<SnackConfig>({
    id: data.id,
    name: data.name,
    tagline: data.tagline,
    theme: data.theme,
    mascotPokemonId: data.mascotPokemonId,
    care: data.care,
    levels: SNACK_LEVEL_CONFIGS.map((config, i) => ({
      number: i + 1,
      name: data.levelNames[i],
      goal: goals[i],
      rewards: data.rewards[i],
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
  levelNames: [
    { en: 'First Bites', he: 'ביסים ראשונים' },
    { en: 'Big Appetite', he: 'תיאבון גדול' },
    { en: 'Blue Berries', he: 'פירות כחולים' },
    { en: 'Times Feast', he: 'סעודת כפל' },
    { en: 'Fever Frenzy', he: 'טירוף הקדחת' },
  ],
  goals: [
    { en: 'Add berries up to the number on the belly!', he: 'מחברים פירות עד המספר שעל הבטן!' },
    { en: 'Bigger numbers, faster berries!', he: 'מספרים גדולים, פירות מהירים!' },
    { en: 'Blue berries take away!', he: 'פירות כחולים מורידים!' },
    { en: 'Eat 2 berries that multiply to the target!', he: 'אוכלים 2 פירות שמכפלתם היא המספר!' },
    GOALS[4],
  ],
  rewards: SNORLAX_REWARDS,
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
    bonus: { chancePerStar: 0.03, prize: vitaminPrize('epic', 3) },
  },
});

export const bulbasaurSun = snackGame({
  id: 'bulbasaur-sun',
  name: { en: 'Sunny Bulb', he: 'הפקעת של בולבסאור' },
  tagline: { en: 'Catch sun drops that add up exactly!', he: 'תופסים טיפות שמש שמסתכמות בדיוק!' },
  theme: { from: '#22c55e', to: '#0d9488', accent: '#facc15', accentText: '#422006' },
  mascotPokemonId: BULBASAUR,
  skin: BULBASAUR_SKIN,
  levelNames: [
    { en: 'Morning Sun', he: 'שמש של בוקר' },
    { en: 'Bright Noon', he: 'צהריים בהירים' },
    { en: 'Cloudy Sky', he: 'שמיים מעוננים' },
    { en: 'Sun Times', he: 'כפל של שמש' },
    { en: 'Solar Frenzy', he: 'טירוף השמש' },
  ],
  rewards: starterRewards('miracle-seed', 'leaf-stone'),
  care: {
    lineOf: BULBASAUR,
    habitat: ['grass'],
    statusAfter: null,
    prompt: { en: '{name} is wilting… Find it some sunshine?', he: '{name} נובל… למצוא לו קצת שמש?' },
    intro: {
      en: '{name} is tired and droopy. Catch sunshine for its bulb and it will bloom with energy!',
      he: '{name} עייף ונבול. תופסים שמש בשביל הפקעת שלו — והוא יפרח מאנרגיה!',
    },
    bonus: { chancePerStar: 0.07, prize: xItemPrize('rare') },
  },
});

export const charmanderFlame = snackGame({
  id: 'charmander-flame',
  name: { en: 'Flame Feast', he: 'חגיגת הלהבות' },
  tagline: { en: 'Catch embers that add up exactly!', he: 'תופסים גחלים שמסתכמות בדיוק!' },
  theme: { from: '#f97316', to: '#b91c1c', accent: '#fde047', accentText: '#451a03' },
  mascotPokemonId: CHARMANDER,
  skin: CHARMANDER_SKIN,
  levelNames: [
    { en: 'Little Spark', he: 'ניצוץ קטן' },
    { en: 'Campfire', he: 'מדורה' },
    { en: 'Smoky Path', he: 'שביל העשן' },
    { en: 'Fire Times', he: 'כפל של אש' },
    { en: 'Blaze Frenzy', he: 'טירוף הלהבה' },
  ],
  rewards: starterRewards('charcoal', 'fire-stone'),
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
    bonus: { chancePerStar: 0.07, prize: xItemPrize('rare') },
  },
});

export const squirtleSwim = snackGame({
  id: 'squirtle-swim',
  name: { en: 'Squirtle Swim', he: 'השחייה של סקווירטל' },
  tagline: { en: 'Swim into bubbles that add up — dodge the rocks!', he: 'שוחים אל בועות שמסתכמות — ונזהרים מהסלעים!' },
  theme: { from: '#0ea5e9', to: '#1d4ed8', accent: '#fbbf24', accentText: '#451a03' },
  mascotPokemonId: SQUIRTLE,
  skin: SQUIRTLE_SKIN,
  levelNames: [
    { en: 'Calm Stream', he: 'פלג רגוע' },
    { en: 'Fast River', he: 'נהר מהיר' },
    { en: 'Whirlpools', he: 'מערבולות' },
    { en: 'Bubble Times', he: 'כפל של בועות' },
    { en: 'Waterfall Frenzy', he: 'טירוף המפל' },
  ],
  rewards: starterRewards('mystic-water', 'water-stone'),
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
    bonus: { chancePerStar: 0.07, prize: xItemPrize('rare') },
  },
});

export const pikachuCharge = snackGame({
  id: 'pikachu-charge',
  name: { en: 'Pikachu Power Charge', he: 'הטעינה של פיקאצ׳ו' },
  tagline: { en: 'Catch bolts that add up exactly!', he: 'תופסים ברקים שמסתכמים בדיוק!' },
  theme: { from: '#eab308', to: '#6d28d9', accent: '#f43f5e', accentText: '#ffffff' },
  mascotPokemonId: PIKACHU,
  skin: PIKACHU_SKIN,
  levelNames: [
    { en: 'Tiny Spark', he: 'ניצוץ זעיר' },
    { en: 'Thunder Cloud', he: 'ענן רעמים' },
    { en: 'Purple Bolts', he: 'ברקים סגולים' },
    { en: 'Volt Times', he: 'כפל של חשמל' },
    { en: 'Thunder Frenzy', he: 'טירוף הרעם' },
  ],
  rewards: starterRewards('magnet', 'thunder-stone'),
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
    bonus: { chancePerStar: 0.07, prize: xItemPrize('rare') },
  },
});
