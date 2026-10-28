/** Memory Match — words ↔ pictures, then words ↔ Hebrew (library-english.md, Story 3). */

import { defineMiniGame, evolutionStonePrize, item, money, prize, tmPrize } from '../../define.js';
import type { MemoryConfig } from './memory.js';
import { MemoryMatchGame } from './MemoryMatchGame.js';

const ALAKAZAM = 65;

export default defineMiniGame<MemoryConfig>({
  id: 'memory-match',
  name: { en: 'Memory Match', he: 'משחק זיכרון' },
  tagline: { en: 'Flip the cards and match the words!', he: 'הופכים קלפים ומתאימים מילים!' },
  category: 'english',
  theme: { from: '#a855f7', to: '#ec4899', accent: '#fde047', accentText: '#4a044e' },
  mascotPokemonId: ALAKAZAM,
  levels: [
    {
      number: 1,
      name: { en: 'Picture Pairs', he: 'זוגות תמונות' },
      goal: { en: 'Match each word with its picture!', he: 'מתאימים כל מילה לתמונה שלה!' },
      rewards: {
        firstClear: prize('common', item('poke-ball', 3)),
        threeStar: prize('common', item('potion', 3)),
        replay: prize('common', money(100)),
      },
      config: { pairs: 4, maxTier: 1, partner: 'picture' },
    },
    {
      number: 2,
      name: { en: 'More Pairs', he: 'עוד זוגות' },
      goal: { en: 'Five pairs to find!', he: 'חמישה זוגות למצוא!' },
      rewards: {
        firstClear: prize('good', item('great-ball', 3)),
        threeStar: prize('good', item('super-potion', 2)),
        replay: prize('common', money(150)),
      },
      config: { pairs: 5, maxTier: 1, partner: 'picture' },
    },
    {
      number: 3,
      name: { en: 'Big Board', he: 'לוח גדול' },
      goal: { en: 'New words, bigger board!', he: 'מילים חדשות, לוח גדול!' },
      rewards: {
        firstClear: prize('good', item('ultra-ball', 2)),
        threeStar: prize('rare', item('rare-candy')),
        replay: prize('common', money(200)),
      },
      config: { pairs: 6, maxTier: 2, partner: 'picture' },
    },
    {
      number: 4,
      name: { en: 'Translator', he: 'מתרגם' },
      goal: { en: 'Match English with Hebrew!', he: 'מתאימים אנגלית לעברית!' },
      rewards: {
        firstClear: evolutionStonePrize('rare'),
        threeStar: prize('rare', item('rare-candy', 2)),
        replay: prize('common', money(250)),
      },
      config: { pairs: 6, maxTier: 2, partner: 'hebrew' },
    },
    {
      number: 5,
      name: { en: 'Master Translator', he: 'מתרגם אלוף' },
      goal: { en: 'Eight pairs — English and Hebrew!', he: 'שמונה זוגות — אנגלית ועברית!' },
      rewards: {
        firstClear: tmPrize('rare'),
        threeStar: prize('epic', item('max-revive')),
        replay: prize('common', money(300)),
      },
      config: { pairs: 8, maxTier: 3, partner: 'hebrew' },
    },
  ],
  Component: MemoryMatchGame,
});
