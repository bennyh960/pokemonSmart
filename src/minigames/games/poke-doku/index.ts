/**
 * Poké-Doku — a Sudoku with Pokémon (docs/stories/mini-games.md §2).
 * Logic: `sudoku.ts` (pure, seeded, unique-solution generator). Play area: `PokeDokuGame.tsx`.
 */

import { defineMiniGame, evolutionStonePrize, item, money, prize } from '../../define.js';
import { PokeDokuGame } from './PokeDokuGame.js';
import { PSYDUCK_ID, type PokeDokuConfig } from './config.js';

export type { PokeDokuConfig } from './config.js';

/** 4 starters for the 4×4 levels; 6 for the 6×6 levels. */
const STARTERS_4 = [1, 4, 7, 25];
const STARTERS_6 = [1, 4, 7, 152, 155, 158];
/** Type-Doku: each Pokémon shows its first type (fire, water, grass, electric, normal, psychic). */
const TYPE_DOKU = [4, 7, 1, 25, 133, 63];

export default defineMiniGame<PokeDokuConfig>({
  id: 'poke-doku',
  name: { en: 'Poké-Doku', he: 'פוקי-דוקו' },
  tagline: { en: 'Every row, column and box — each Pokémon once!', he: 'בכל שורה, טור וריבוע — כל פוקימון פעם אחת!' },
  category: 'logic',
  theme: { from: '#0891b2', to: '#10b981', accent: '#fb923c', accentText: '#431407' },
  mascotPokemonId: PSYDUCK_ID,
  levels: [
    {
      number: 1,
      name: { en: 'Starter Square', he: 'ריבוע ההתחלה' },
      goal: { en: 'Fill the 4×4 grid with the starters!', he: 'ממלאים את הלוח 4×4 בפוקימוני ההתחלה!' },
      rewards: {
        firstClear: prize('common', item('potion', 3)),
        threeStar: prize('good', item('great-ball', 3)),
        replay: prize('common', money(100)),
      },
      config: { size: 4, boxRows: 2, boxCols: 2, symbols: 'pokemon', pokemon: STARTERS_4, givens: 10 },
    },
    {
      number: 2,
      name: { en: 'Tricky Four', he: 'ארבע מסובך' },
      goal: { en: 'Fewer clues — think hard!', he: 'פחות רמזים — חושבים חזק!' },
      rewards: {
        firstClear: prize('good', item('great-ball', 3)),
        threeStar: prize('good', item('super-potion', 3)),
        replay: prize('common', money(150)),
      },
      config: { size: 4, boxRows: 2, boxCols: 2, symbols: 'pokemon', pokemon: STARTERS_4, givens: 6 },
    },
    {
      number: 3,
      name: { en: 'Six Pack', he: 'שישייה' },
      goal: { en: 'A bigger 6×6 grid!', he: 'לוח גדול יותר — 6×6!' },
      rewards: {
        firstClear: prize('good', item('ultra-ball', 2)),
        threeStar: prize('rare', item('rare-candy')),
        replay: prize('common', money(200)),
      },
      config: { size: 6, boxRows: 2, boxCols: 3, symbols: 'pokemon', pokemon: STARTERS_6, givens: 22 },
    },
    {
      number: 4,
      name: { en: 'Speed Six', he: 'שש מהיר' },
      goal: { en: 'Few clues — finish fast for a bonus!', he: 'מעט רמזים — מסיימים מהר ומקבלים בונוס!' },
      rewards: {
        firstClear: prize('rare', item('rare-candy')),
        threeStar: prize('rare', item('max-revive')),
        replay: prize('good', money(300)),
      },
      config: {
        size: 6,
        boxRows: 2,
        boxCols: 3,
        symbols: 'pokemon',
        pokemon: STARTERS_6,
        givens: 13,
        timerBonus: { seconds: 240, pointsPerSecond: 3 },
      },
    },
    {
      number: 5,
      name: { en: 'Type-Doku', he: 'טייפ-דוקו' },
      goal: { en: 'Now with type icons only!', he: 'עכשיו רק עם סמלי סוגים!' },
      rewards: {
        firstClear: evolutionStonePrize('rare'),
        threeStar: prize('epic', item('master-ball')),
        replay: prize('good', money(400)),
      },
      config: { size: 6, boxRows: 2, boxCols: 3, symbols: 'types', pokemon: TYPE_DOKU, givens: 13 },
    },
  ],
  Component: PokeDokuGame,
});
