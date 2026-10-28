/** Player-visible strings of Unown Letters, as bilingual data (shared English strings: english/ui.tsx). */

import type { Bilingual } from '../../types.js';
import type { UnownTask } from './config.js';

export const PROMPTS: Record<UnownTask, Bilingual> = {
  'letter-pop': { en: 'Tap the letter you hear!', he: 'לחצו על האות ששמעתם!' },
  'big-small': { en: 'Find the same letter!', he: 'מצאו את אותה האות!' },
  'first-sound': { en: 'Who starts with this sound?', he: 'מי מתחיל בצליל הזה?' },
};

/** Big & Small says which way the match goes. */
export const BIG_SMALL_PROMPTS: { toSmall: Bilingual; toBig: Bilingual } = {
  toSmall: { en: 'Find the small letter!', he: 'מצאו את האות הקטנה!' },
  toBig: { en: 'Find the big letter!', he: 'מצאו את האות הגדולה!' },
};
