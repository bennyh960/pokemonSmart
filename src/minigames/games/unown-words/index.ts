/**
 * Unown Letters — the English warm-up: letters and their sounds (docs/stories/library-english.md, Story 3).
 * Levels + prizes here; questions in questions.ts, UI in UnownWordsGame.tsx. Its game data also keeps the word
 * records of every English mode (english/useWords.ts). The old word levels became the other English modes.
 */

import { defineMiniGame, item, money, prize } from '../../define.js';
import type { UnownWordsConfig } from './config.js';
import { UnownWordsGame } from './UnownWordsGame.js';

export type { UnownTask, UnownWordsConfig } from './config.js';

export const UNOWN_ID = 201;

export default defineMiniGame<UnownWordsConfig>({
  id: 'unown-words',
  name: { en: 'Unown Letters', he: 'האותיות של אנאון' },
  tagline: { en: 'Put the living letters back together!', he: 'החזירו את האותיות החיות למקום!' },
  category: 'english',
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
      name: { en: 'Read the Name', he: 'קוראים את השם' },
      goal: { en: 'Hear a letter — find the name that starts with it!', he: 'שומעים אות — מוצאים את השם שמתחיל בה!' },
      rewards: {
        firstClear: prize('rare', item('ultra-ball', 3)),
        threeStar: prize('rare', item('rare-candy')),
        replay: prize('common', money(250)),
      },
      config: { task: 'first-sound', questions: 8, hebrewHelp: 'always', names: 'en' },
    },
  ],
  Component: UnownWordsGame,
});
