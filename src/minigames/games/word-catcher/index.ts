/** Word Catcher — read fast: catch the English word for the picture (library-english.md, Story 3). */

import { defineMiniGame, evolutionStonePrize, item, money, prize, tmPrize } from '../../define.js';
import type { CatcherConfig } from './catcher.js';
import { WordCatcherGame } from './WordCatcherGame.js';

const PIDGEOTTO = 17;

export default defineMiniGame<CatcherConfig>({
  id: 'word-catcher',
  name: { en: 'Word Catcher', he: 'תופסים מילים' },
  tagline: { en: 'Fly and catch the right word!', he: 'עפים ותופסים את המילה הנכונה!' },
  category: 'english',
  theme: { from: '#38bdf8', to: '#6366f1', accent: '#fde047', accentText: '#1e3a8a' },
  mascotPokemonId: PIDGEOTTO,
  levels: [
    {
      number: 1,
      name: { en: 'Light Breeze', he: 'רוח קלה' },
      goal: { en: 'Catch the word for the picture!', he: 'תופסים את המילה של התמונה!' },
      rewards: {
        firstClear: prize('common', item('poke-ball', 3)),
        threeStar: prize('common', item('potion', 3)),
        replay: prize('common', money(100)),
      },
      config: { seconds: 60, speed: 0.13, bubbles: 3, maxTier: 1, hebrewHelp: 'always', starCatches: [2, 4, 6] },
    },
    {
      number: 2,
      name: { en: 'Windy Day', he: 'יום סוער' },
      goal: { en: 'Faster words — keep your eyes up!', he: 'מילים מהירות יותר — מסתכלים למעלה!' },
      rewards: {
        firstClear: prize('good', item('great-ball', 3)),
        threeStar: prize('good', item('super-potion', 2)),
        replay: prize('common', money(150)),
      },
      config: { seconds: 60, speed: 0.16, bubbles: 3, maxTier: 1, hebrewHelp: 'after-mistake', starCatches: [3, 5, 7] },
    },
    {
      number: 3,
      name: { en: 'Gust', he: 'משב רוח' },
      goal: { en: 'More words in the sky!', he: 'יותר מילים בשמיים!' },
      rewards: {
        firstClear: prize('good', item('ultra-ball', 2)),
        threeStar: prize('rare', item('rare-candy')),
        replay: prize('common', money(200)),
      },
      config: { seconds: 60, speed: 0.18, bubbles: 4, maxTier: 2, hebrewHelp: 'after-mistake', starCatches: [3, 6, 8] },
    },
    {
      number: 4,
      name: { en: 'Storm', he: 'סערה' },
      goal: { en: 'Picture only — read fast!', he: 'רק תמונה — קוראים מהר!' },
      rewards: {
        firstClear: evolutionStonePrize('rare'),
        threeStar: prize('rare', item('rare-candy', 2)),
        replay: prize('common', money(250)),
      },
      config: { seconds: 60, speed: 0.21, bubbles: 4, maxTier: 2, hebrewHelp: 'never', starCatches: [3, 7, 10] },
    },
    {
      number: 5,
      name: { en: 'Hurricane', he: 'הוריקן' },
      goal: { en: 'Five words falling — catch them all!', he: 'חמש מילים נופלות — תופסים הכול!' },
      rewards: {
        firstClear: tmPrize('rare'),
        threeStar: prize('epic', item('master-ball')),
        replay: prize('common', money(300)),
      },
      config: { seconds: 60, speed: 0.24, bubbles: 5, maxTier: 3, hebrewHelp: 'never', starCatches: [4, 8, 11] },
    },
  ],
  Component: WordCatcherGame,
});
