/** Pokémon Says — listening + action words (docs/stories/library-english.md, Story 3). */

import { defineMiniGame, evolutionStonePrize, item, money, prize, tmPrize } from '../../define.js';
import { PokemonSaysGame } from './PokemonSaysGame.js';
import type { SaysConfig } from './says.js';

const PIKACHU = 25;

export default defineMiniGame<SaysConfig>({
  id: 'pokemon-says',
  name: { en: 'Pokémon Says', he: 'הפוקימון אומר' },
  tagline: { en: 'Listen to your Pokémon and do what it says!', he: 'הקשיבו לפוקימון ועשו מה שהוא אומר!' },
  category: 'english',
  theme: { from: '#f59e0b', to: '#ef4444', accent: '#fde047', accentText: '#7c2d12' },
  mascotPokemonId: PIKACHU,
  levels: [
    {
      number: 1,
      name: { en: 'First Moves', he: 'צעדים ראשונים' },
      goal: { en: 'Hear the action, tap its picture!', he: 'שומעים פעולה — לוחצים על התמונה!' },
      rewards: {
        firstClear: prize('common', item('poke-ball', 3)),
        threeStar: prize('common', item('potion', 3)),
        replay: prize('common', money(100)),
      },
      config: { questions: 6, choices: 3, maxTier: 1, seconds: 0, hebrewHelp: 'always' },
    },
    {
      number: 2,
      name: { en: 'Follow Me', he: 'בואו אחריי' },
      goal: { en: 'More actions — listen well!', he: 'עוד פעולות — מקשיבים טוב!' },
      rewards: {
        firstClear: prize('good', item('great-ball', 3)),
        threeStar: prize('good', item('super-potion', 2)),
        replay: prize('common', money(150)),
      },
      config: { questions: 8, choices: 4, maxTier: 1, seconds: 0, hebrewHelp: 'after-mistake' },
    },
    {
      number: 3,
      name: { en: 'Quick Paws', he: 'כפות זריזות' },
      goal: { en: 'Be quick — the clock is ticking!', he: 'מהר — השעון מתקתק!' },
      rewards: {
        firstClear: prize('good', item('ultra-ball', 2)),
        threeStar: prize('rare', item('rare-candy')),
        replay: prize('common', money(200)),
      },
      config: { questions: 8, choices: 4, maxTier: 2, seconds: 8, hebrewHelp: 'after-mistake' },
    },
    {
      number: 4,
      name: { en: 'Speedy', he: 'מהירים' },
      goal: { en: 'English only, and faster!', he: 'רק אנגלית, ויותר מהר!' },
      rewards: {
        firstClear: evolutionStonePrize('rare'),
        threeStar: prize('rare', item('rare-candy', 2)),
        replay: prize('common', money(250)),
      },
      config: { questions: 10, choices: 4, maxTier: 2, seconds: 6, hebrewHelp: 'never' },
    },
    {
      number: 5,
      name: { en: 'Master Trainer', he: 'מאמן אלוף' },
      goal: { en: 'Six pictures, five seconds — go!', he: 'שש תמונות, חמש שניות — קדימה!' },
      rewards: {
        firstClear: tmPrize('rare'),
        threeStar: prize('epic', item('max-elixir', 2)),
        replay: prize('common', money(300)),
      },
      config: { questions: 10, choices: 6, maxTier: 3, seconds: 5, hebrewHelp: 'never' },
    },
  ],
  Component: PokemonSaysGame,
});
