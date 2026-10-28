/** Unown Battle — spelling as a battle (library-english.md, Story 3). Replaces the old Type Speller / Scramble. */

import { defineMiniGame, evolutionStonePrize, item, money, prize, tmPrize } from '../../define.js';
import type { BattleConfig } from './battle.js';
import { UnownBattleGame } from './UnownBattleGame.js';

const UNOWN = 201;

export default defineMiniGame<BattleConfig>({
  id: 'unown-battle',
  name: { en: 'Unown Battle', he: 'קרב אנאון' },
  tagline: { en: 'Spell the word to win the battle!', he: 'מאייתים את המילה ומנצחים בקרב!' },
  category: 'english',
  theme: { from: '#4f46e5', to: '#db2777', accent: '#fde047', accentText: '#312e81' },
  mascotPokemonId: UNOWN,
  levels: [
    {
      number: 1,
      name: { en: 'Tiny Unown', he: 'אנאון קטנטן' },
      goal: { en: 'Put the letters in order!', he: 'מסדרים את האותיות!' },
      rewards: {
        firstClear: prize('common', item('poke-ball', 3)),
        threeStar: prize('common', item('potion', 3)),
        replay: prize('common', money(100)),
      },
      config: { words: 5, maxTier: 1, maxLength: 4, input: 'tiles', hebrewHelp: 'always', letterHint: true },
    },
    {
      number: 2,
      name: { en: 'Tricky Letters', he: 'אותיות מבלבלות' },
      goal: { en: 'Some letters don’t belong!', he: 'יש אותיות שלא שייכות!' },
      rewards: {
        firstClear: prize('good', item('great-ball', 3)),
        threeStar: prize('good', item('super-potion', 2)),
        replay: prize('common', money(150)),
      },
      config: { words: 6, maxTier: 1, maxLength: 5, input: 'decoys', hebrewHelp: 'always', letterHint: true },
    },
    {
      number: 3,
      name: { en: 'Keyboard Hero', he: 'גיבור המקלדת' },
      goal: { en: 'All the letters — find the right ones!', he: 'כל האותיות — מוצאים את הנכונות!' },
      rewards: {
        firstClear: prize('good', item('ultra-ball', 2)),
        threeStar: prize('rare', item('rare-candy')),
        replay: prize('common', money(200)),
      },
      config: {
        words: 6,
        maxTier: 2,
        maxLength: 6,
        input: 'keyboard',
        hebrewHelp: 'after-mistake',
        letterHint: true,
      },
    },
    {
      number: 4,
      name: { en: 'Unown Pack', he: 'להקת אנאון' },
      goal: { en: 'Longer words, more Unown!', he: 'מילים ארוכות, יותר אנאון!' },
      rewards: {
        firstClear: evolutionStonePrize('rare'),
        threeStar: prize('rare', item('rare-candy', 2)),
        replay: prize('common', money(250)),
      },
      config: {
        words: 8,
        maxTier: 2,
        maxLength: 7,
        input: 'keyboard',
        hebrewHelp: 'after-mistake',
        letterHint: true,
      },
    },
    {
      number: 5,
      name: { en: 'Unown Master', he: 'אלוף האנאון' },
      goal: { en: 'Picture and sound only — no hints!', he: 'רק תמונה וצליל — בלי רמזים!' },
      rewards: {
        firstClear: tmPrize('rare'),
        threeStar: prize('epic', item('master-ball')),
        replay: prize('common', money(300)),
      },
      config: { words: 8, maxTier: 3, maxLength: 8, input: 'keyboard', hebrewHelp: 'never', letterHint: false },
    },
  ],
  Component: UnownBattleGame,
});
