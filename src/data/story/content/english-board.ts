/**
 * Word Board intro — the first time the player enters a library that has a Word Board (an object whose tile has
 * interact type 'english-board'), the librarian walks them to it and explains it. Queued by the overworld on map
 * load (no per-library event: any library with a board qualifies). See src/minigames/english/board.ts.
 */

import { registerCutscene } from '../cutscenes.js';
import { FLAGS } from '../flags.js';

export const ENGLISH_BOARD_INTRO_CUTSCENE = 'english-board-intro';

const LIBRARIAN = { en: 'Librarian', he: 'הספרנית' };

registerCutscene({
  id: ENGLISH_BOARD_INTRO_CUTSCENE,
  steps: [
    {
      type: 'dialogue',
      speakerName: LIBRARIAN,
      lines: [
        { en: 'Hi! Welcome to the library!', he: 'שלום! ברוכים הבאים לספרייה!' },
        {
          en: 'NULL-X mixes up words to trick trainers. But a trainer who knows English is hard to trick!',
          he: 'NULL-X מבלבל מילים כדי לרמות מאמנים. אבל מאמן שיודע אנגלית — קשה לרמות אותו!',
        },
        { en: 'Come, I want to show you something!', he: 'בואו, אני רוצה להראות לכם משהו!' },
      ],
    },
    { type: 'walk-to-interact', interact: 'english-board' },
    {
      type: 'dialogue',
      speakerName: LIBRARIAN,
      lines: [
        {
          en: 'This is the Word Board! Here you play games and learn English words.',
          he: 'זה לוח המילים! כאן משחקים ולומדים מילים באנגלית.',
        },
        {
          en: 'Every game fills your bar. A full bar takes you to the next level!',
          he: 'כל משחק ממלא את הפס שלכם. פס מלא — ועולים לרמה הבאה!',
        },
        {
          en: 'More stars, more prizes! Higher levels have rare prizes — and at the top, even a rare Pokémon!',
          he: 'יותר כוכבים — יותר פרסים! ברמות הגבוהות יש פרסים נדירים, ובפסגה אפילו פוקימון נדיר!',
        },
        {
          en: 'Come back and play as often as you like. Press the board to start!',
          he: 'אפשר לחזור ולשחק כמה שרוצים. לחצו על הלוח כדי להתחיל!',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ENGLISH_BOARD_INTRO_DONE } },
  ],
});
