/**
 * Poké-Doku player-visible text, bilingual. Kept in the game folder (not the locale JSON) so the
 * game is self-contained; resolve with `say(STRINGS.x, locale, params)`.
 */

import type { Bilingual } from '../../types.js';

export const STRINGS = {
  check: { en: 'Check', he: 'בדיקה' },
  hint: { en: 'Hint', he: 'רמז' },
  erase: { en: 'Erase', he: 'מחיקה' },
  hintsLeft: { en: '{n} left', he: 'נשארו {n}' },
  idle: {
    en: 'Each Pokémon once in every row, column and box!',
    he: 'כל פוקימון פעם אחת בכל שורה, טור וריבוע!',
  },
  idleTypes: {
    en: 'Each type once in every row, column and box!',
    he: 'כל סוג פעם אחת בכל שורה, טור וריבוע!',
  },
  hintSingle: {
    en: 'Look here! Only {name} fits — the row, column and box have all the others.',
    he: 'תסתכלו כאן! רק {name} מתאים — בשורה, בטור ובריבוע כבר יש את כל השאר.',
  },
  hintRow: { en: 'In this row, {name} can only go here!', he: 'בשורה הזאת, {name} יכול להיכנס רק לכאן!' },
  hintCol: { en: 'In this column, {name} can only go here!', he: 'בטור הזה, {name} יכול להיכנס רק לכאן!' },
  hintBox: { en: 'In this box, {name} can only go here!', he: 'בריבוע הזה, {name} יכול להיכנס רק לכאן!' },
  hintReveal: { en: 'Psyduck’s head hurts… try {name} here!', he: 'לפסיידאק כואב הראש… נסו לשים כאן {name}!' },
  hintFix: { en: 'This one is mixed up — {name} goes here!', he: 'כאן יש טעות — צריך לשים כאן {name}!' },
  noHints: { en: 'No hints left — you can do it!', he: 'נגמרו הרמזים — אתם יכולים!' },
  checkGood: { en: 'All good so far — keep going!', he: 'הכול נכון עד עכשיו — ממשיכים!' },
  checkBad: { en: 'Fix the red squares! ({n})', he: 'מתקנים את המשבצות האדומות! ({n})' },
  boardFull: {
    en: 'The board is full, but something is mixed up. Tap Check!',
    he: 'הלוח מלא, אבל משהו התבלבל. לוחצים על בדיקה!',
  },
  pickCell: { en: 'Tap a square first!', he: 'קודם בוחרים משבצת!' },
  timeBonus: { en: 'Speed bonus +{n}!', he: 'בונוס מהירות +{n}!' },
  timeUp: { en: 'No speed bonus — but keep going!', he: 'נגמר בונוס המהירות — אבל ממשיכים!' },
  solved: { en: 'Solved!', he: 'פתרתם!' },
} satisfies Record<string, Bilingual>;

export function say(text: Bilingual, locale: 'en' | 'he', params: Record<string, string | number> = {}): string {
  return text[locale].replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}
