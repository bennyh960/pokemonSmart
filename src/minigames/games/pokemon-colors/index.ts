/** Pokémon Colours — colour words, asked with real Pokémon (library-english.md, Story 10). */

import { defineMiniGame, item, money, prize } from '../../define.js';
import type { ColorsConfig } from './colors.js';
import { PokemonColorsGame } from './PokemonColorsGame.js';

const SMEARGLE = 235;

export default defineMiniGame<ColorsConfig>({
  id: 'pokemon-colors',
  name: { en: 'Pokémon Colors', he: 'הצבעים של הפוקימונים' },
  tagline: { en: 'What color is this Pokémon?', he: 'באיזה צבע הפוקימון הזה?' },
  category: 'english',
  theme: { from: '#f43f5e', to: '#f59e0b', accent: '#fde047', accentText: '#7c2d12' },
  mascotPokemonId: SMEARGLE,
  levels: [
    {
      number: 1,
      name: { en: 'Red, Blue, Yellow', he: 'אדום, כחול, צהוב' },
      goal: { en: 'Three colors to start!', he: 'שלושה צבעים בהתחלה!' },
      rewards: {
        firstClear: prize('common', item('poke-ball', 3)),
        threeStar: prize('common', item('potion', 3)),
        replay: prize('common', money(100)),
      },
      config: { questions: 6, colors: ['red', 'blue', 'yellow'], choices: 3, hebrewHelp: 'always' },
    },
    {
      number: 2,
      name: { en: 'Rainbow', he: 'קשת בענן' },
      goal: { en: 'Six colors now!', he: 'עכשיו שישה צבעים!' },
      rewards: {
        firstClear: prize('good', item('great-ball', 3)),
        threeStar: prize('good', item('super-potion', 2)),
        replay: prize('common', money(150)),
      },
      config: {
        questions: 8,
        colors: ['red', 'blue', 'yellow', 'green', 'pink', 'purple'],
        choices: 4,
        hebrewHelp: 'always',
      },
    },
    {
      number: 3,
      name: { en: 'Every Color', he: 'כל הצבעים' },
      goal: { en: 'All ten Pokémon colors!', he: 'כל עשרת הצבעים!' },
      rewards: {
        firstClear: prize('rare', item('rare-candy')),
        threeStar: prize('rare', item('rare-candy', 2)),
        replay: prize('common', money(200)),
      },
      config: {
        questions: 10,
        colors: ['red', 'blue', 'yellow', 'green', 'pink', 'purple', 'brown', 'black', 'white', 'gray'],
        choices: 4,
        hebrewHelp: 'after-mistake',
      },
    },
  ],
  Component: PokemonColorsGame,
});
