/**
 * Unown Word Quest — English, progressive levels (docs/stories/mini-games.md §1).
 * Levels + prizes here; questions in questions.ts, scoring in scoring.ts, UI in UnownWordsGame.tsx.
 */

import { defineMiniGame, evolutionStonePrize, giftPokemon, item, money, prize, tmPrize } from '../../define.js';
import type { UnownWordsConfig } from './config.js';
import { UnownWordsGame } from './UnownWordsGame.js';

export type { HebrewHelp, UnownTask, UnownWordsConfig } from './config.js';

const UNOWN_ID = 201;

export default defineMiniGame<UnownWordsConfig>({
  id: 'unown-words',
  name: { en: 'Unown Word Quest', he: 'מסע המילים של אנאון' },
  tagline: { en: 'Put the living letters back together!', he: 'החזירו את האותיות החיות למקום!' },
  theme: { from: '#7c3aed', to: '#2563eb', accent: '#facc15', accentText: '#1e1b4b' },
  mascotPokemonId: UNOWN_ID,
  levels: [
    {
      number: 1,
      name: { en: 'Letter Pop', he: 'פיצוץ אותיות' },
      goal: { en: 'Hear a letter, tap the right Unown!', he: 'שומעים אות — לוחצים על האנאון הנכון!' },
      rewards: {
        firstClear: prize('common', item('poke-ball', 3)),
        threeStar: prize('common', item('potion', 3)),
        replay: prize('common', money(100)),
      },
      config: { task: 'letter-pop', questions: 8, hebrewHelp: 'always' },
    },
    {
      number: 2,
      name: { en: 'Big & Small', he: 'גדולה וקטנה' },
      goal: { en: 'Match each big letter to its small one!', he: 'מתאימים כל אות גדולה לאות הקטנה שלה!' },
      rewards: {
        firstClear: prize('good', item('great-ball', 3)),
        threeStar: prize('good', item('super-potion', 2)),
        replay: prize('common', money(150)),
      },
      config: { task: 'big-small', questions: 8, hebrewHelp: 'always' },
    },
    {
      number: 3,
      name: { en: 'First Sound', he: 'הצליל הראשון' },
      goal: { en: 'Which Pokémon starts with this sound?', he: 'איזה פוקימון מתחיל בצליל הזה?' },
      rewards: {
        firstClear: prize('good', item('ultra-ball', 2)),
        threeStar: prize('rare', item('rare-candy')),
        replay: prize('common', money(200)),
      },
      config: { task: 'first-sound', questions: 8, hebrewHelp: 'always' },
    },
    {
      number: 4,
      name: { en: 'Type Speller', he: 'מאייתים סוגים' },
      goal: { en: 'Spell the type of these Pokémon!', he: 'מאייתים את הסוג של הפוקימונים!' },
      rewards: {
        firstClear: evolutionStonePrize('rare'),
        threeStar: prize('rare', item('rare-candy', 2)),
        replay: prize('common', money(250)),
      },
      config: { task: 'type-speller', questions: 8, hebrewHelp: 'after-mistake' },
    },
    {
      number: 5,
      name: { en: 'Word Match', he: 'התאמת מילים' },
      goal: { en: 'Hear a word, tap its picture!', he: 'שומעים מילה — לוחצים על התמונה!' },
      rewards: {
        firstClear: tmPrize('rare'),
        // design: PP Up — not in the game's item data, closest real item
        threeStar: prize('rare', item('max-elixir')),
        replay: prize('common', money(300)),
      },
      config: { task: 'word-match', questions: 8, hebrewHelp: 'after-mistake' },
    },
    {
      number: 6,
      name: { en: 'Unown Scramble', he: 'בלגן של אנאון' },
      goal: { en: 'Unscramble the letters to spell a Pokémon!', he: 'מסדרים את האותיות לשם של פוקימון!' },
      rewards: {
        // design: Lucky Egg — not in the game's item data, closest real reward (more EXP)
        firstClear: prize('epic', item('rare-candy', 3)),
        threeStar: prize('epic', item('master-ball')),
        replay: prize('good', money(400)),
      },
      config: { task: 'scramble', questions: 8, hebrewHelp: 'never' },
    },
    {
      number: 7,
      name: { en: 'Sentence Builder', he: 'בונים משפטים' },
      goal: { en: 'Put the words in the right order!', he: 'מסדרים את המילים לפי הסדר!' },
      rewards: {
        firstClear: prize('epic', giftPokemon(UNOWN_ID, 10)),
        // design: "Shiny-chance charm / big money" — no charm item exists, so big money
        threeStar: prize('epic', money(5000)),
        replay: prize('good', money(500)),
      },
      config: { task: 'sentence', questions: 8, hebrewHelp: 'never' },
    },
  ],
  Component: UnownWordsGame,
});
