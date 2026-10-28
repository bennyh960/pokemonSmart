/** Find the Pokémon — describing words + types, checked against real Pokémon data (library-english.md, Story 3). */

import { defineMiniGame, evolutionStonePrize, item, money, prize, tmPrize } from '../../define.js';
import type { FindConfig } from './find.js';
import { FindPokemonGame } from './FindPokemonGame.js';

const SMEARGLE = 235;

export default defineMiniGame<FindConfig>({
  id: 'find-pokemon',
  name: { en: 'Find the Pokémon', he: 'מצאו את הפוקימון' },
  tagline: { en: 'Read the clues and spot the right Pokémon!', he: 'קוראים את הרמזים ומוצאים את הפוקימון!' },
  category: 'english',
  theme: { from: '#10b981', to: '#0ea5e9', accent: '#fde047', accentText: '#064e3b' },
  mascotPokemonId: SMEARGLE,
  levels: [
    {
      number: 1,
      name: { en: 'Type Hunt', he: 'ציד סוגים' },
      goal: { en: 'Find the Pokémon of this type!', he: 'מוצאים את הפוקימון מהסוג הזה!' },
      rewards: {
        firstClear: prize('common', item('poke-ball', 3)),
        threeStar: prize('common', item('potion', 3)),
        replay: prize('common', money(100)),
      },
      config: { questions: 6, options: 3, clues: ['type'], maxTier: 1, hebrewHelp: 'always' },
    },
    {
      number: 2,
      name: { en: 'Big or Small?', he: 'גדול או קטן?' },
      goal: { en: 'Big, small, fast, slow — find it!', he: 'גדול, קטן, מהיר, איטי — מוצאים!' },
      rewards: {
        firstClear: prize('good', item('great-ball', 3)),
        threeStar: prize('good', item('super-potion', 2)),
        replay: prize('common', money(150)),
      },
      config: { questions: 8, options: 3, clues: ['adjective'], maxTier: 1, hebrewHelp: 'always' },
    },
    {
      number: 3,
      name: { en: 'Two Clues', he: 'שני רמזים' },
      goal: { en: 'It must fit both clues!', he: 'הוא צריך להתאים לשני הרמזים!' },
      rewards: {
        firstClear: prize('good', item('ultra-ball', 2)),
        threeStar: prize('rare', item('rare-candy')),
        replay: prize('common', money(200)),
      },
      config: { questions: 8, options: 4, clues: ['adjective', 'type'], maxTier: 2, hebrewHelp: 'after-mistake' },
    },
    {
      number: 4,
      name: { en: 'Detective', he: 'בלש' },
      goal: { en: 'Two describing words — read carefully!', he: 'שתי מילים מתארות — קוראים בעיון!' },
      rewards: {
        firstClear: evolutionStonePrize('rare'),
        threeStar: prize('rare', item('rare-candy', 2)),
        replay: prize('common', money(250)),
      },
      config: {
        questions: 8,
        options: 4,
        clues: ['adjective', 'adjective'],
        maxTier: 2,
        hebrewHelp: 'after-mistake',
      },
    },
    {
      number: 5,
      name: { en: 'Master Detective', he: 'בלש אלוף' },
      goal: { en: 'Three clues, English only!', he: 'שלושה רמזים, רק באנגלית!' },
      rewards: {
        firstClear: tmPrize('rare'),
        threeStar: prize('epic', item('max-revive')),
        replay: prize('common', money(300)),
      },
      config: {
        questions: 10,
        options: 4,
        clues: ['adjective', 'adjective', 'type'],
        maxTier: 3,
        hebrewHelp: 'never',
      },
    },
  ],
  Component: FindPokemonGame,
});
