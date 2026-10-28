/**
 * Word Pairs — memory cards: English (+ how it sounds) ↔ Hebrew (+ picture), one theme per level
 * (library-english.md, Story 9). The id stays `memory-match` so saved stars are kept.
 */

import { defineMiniGame, evolutionStonePrize, item, money, prize, tmPrize } from '../../define.js';
import type { MemoryConfig } from './memory.js';
import { MemoryMatchGame } from './MemoryMatchGame.js';

const ALAKAZAM = 65;

export default defineMiniGame<MemoryConfig>({
  id: 'memory-match',
  name: { en: 'Word Pairs', he: 'זוגות מילים' },
  tagline: { en: 'Match each English word with its Hebrew!', he: 'מתאימים כל מילה באנגלית לעברית שלה!' },
  category: 'english',
  theme: { from: '#a855f7', to: '#ec4899', accent: '#fde047', accentText: '#4a044e' },
  mascotPokemonId: ALAKAZAM,
  levels: [
    {
      number: 1,
      name: { en: 'Colors', he: 'צבעים' },
      goal: { en: 'Red, blue, yellow… find the pairs!', he: 'אדום, כחול, צהוב… מוצאים זוגות!' },
      rewards: {
        firstClear: prize('common', item('poke-ball', 3)),
        threeStar: prize('common', item('potion', 3)),
        replay: prize('common', money(100)),
      },
      config: { theme: 'colors', pairs: 3, maxTier: 1 },
    },
    {
      number: 2,
      name: { en: 'Pokémon Types', he: 'סוגי פוקימון' },
      goal: { en: 'Fire, water, grass…', he: 'אש, מים, עשב…' },
      rewards: {
        firstClear: prize('good', item('great-ball', 3)),
        threeStar: prize('good', item('super-potion', 2)),
        replay: prize('common', money(150)),
      },
      config: { theme: 'types', pairs: 4, maxTier: 1 },
    },
    {
      number: 3,
      name: { en: 'Animals', he: 'חיות' },
      goal: { en: 'Cat, dog, fish…', he: 'חתול, כלב, דג…' },
      rewards: {
        firstClear: prize('good', item('ultra-ball', 2)),
        threeStar: prize('rare', item('rare-candy')),
        replay: prize('common', money(150)),
      },
      config: { theme: 'animals', pairs: 4, maxTier: 1 },
    },
    {
      number: 4,
      name: { en: 'Actions', he: 'פעולות' },
      goal: { en: 'Run, jump, swim…', he: 'לרוץ, לקפוץ, לשחות…' },
      rewards: {
        firstClear: prize('rare', item('rare-candy')),
        threeStar: prize('rare', item('rare-candy', 2)),
        replay: prize('common', money(200)),
      },
      config: { theme: 'actions', pairs: 5, maxTier: 1 },
    },
    {
      number: 5,
      name: { en: 'Pokémon World', he: 'עולם הפוקימון' },
      goal: { en: 'Ball, cave, city…', he: 'כדור, מערה, עיר…' },
      rewards: {
        firstClear: evolutionStonePrize('rare'),
        threeStar: prize('rare', item('max-revive')),
        replay: prize('common', money(250)),
      },
      config: { theme: 'world', pairs: 5, maxTier: 2 },
    },
    {
      number: 6,
      name: { en: 'Food', he: 'אוכל' },
      goal: { en: 'Six pairs — yummy words!', he: 'שישה זוגות — מילים טעימות!' },
      rewards: {
        firstClear: tmPrize('rare'),
        threeStar: prize('epic', item('master-ball')),
        replay: prize('common', money(300)),
      },
      config: { theme: 'food', pairs: 6, maxTier: 2 },
    },
  ],
  Component: MemoryMatchGame,
});
