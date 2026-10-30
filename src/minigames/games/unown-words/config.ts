/** Per-level config of Unown Letters (the shell never reads it). */

import type { HebrewHelp } from '../../english/help.js';

export type UnownTask = 'letter-pop' | 'big-small' | 'first-sound';

export interface UnownWordsConfig {
  task: UnownTask;
  questions: number;
  hebrewHelp: HebrewHelp;
  /** Answer choices per question. */
  choices?: number;
  /** First Sound: how the Pokémon cards are named before the answer — Hebrew (match by sound) or English (read it). */
  names?: 'he' | 'en';
}
