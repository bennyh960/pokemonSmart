/**
 * Player-visible strings of this game, as bilingual data (kept in the game folder instead of the
 * shared locale files so the three game agents never touch the same file).
 */

import type { Bilingual } from '../../types.js';
import type { UnownTask } from './config.js';

export const PROMPTS: Record<UnownTask, Bilingual> = {
  'letter-pop': { en: 'Tap the letter you hear!', he: 'לחצו על האות ששמעתם!' },
  'big-small': { en: 'Find the same letter!', he: 'מצאו את אותה האות!' },
  'first-sound': { en: 'Who starts with this sound?', he: 'מי מתחיל בצליל הזה?' },
  'type-speller': { en: 'Spell their type!', he: 'אייתו את הסוג שלהם!' },
  'word-match': { en: 'Tap the picture of the word!', he: 'לחצו על התמונה של המילה!' },
  scramble: { en: 'Spell this Pokémon!', he: 'אייתו את שם הפוקימון!' },
  sentence: { en: 'Put the words in order!', he: 'סדרו את המילים לפי הסדר!' },
};

/** Big & Small says which way the match goes. */
export const BIG_SMALL_PROMPTS: { toSmall: Bilingual; toBig: Bilingual } = {
  toSmall: { en: 'Find the small letter!', he: 'מצאו את האות הקטנה!' },
  toBig: { en: 'Find the big letter!', he: 'מצאו את האות הגדולה!' },
};

export const TEXT = {
  replay: { en: 'Play the sound again', he: 'להשמיע שוב' },
  tryAgain: { en: 'Try again!', he: 'נסו שוב!' },
  meaning: { en: 'In Hebrew:', he: 'בעברית:' },
} satisfies Record<string, Bilingual>;

/** Floating praise after a correct answer — English on purpose (short words kids pick up). */
export const PRAISE = ['Great!', 'Super!', 'Awesome!', 'Yes!', 'Wow!', 'Perfect!'];
