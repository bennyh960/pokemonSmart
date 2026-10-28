/** Per-level config of Unown Word Quest (the shell never reads it). */

export type UnownTask =
  'letter-pop' | 'big-small' | 'first-sound' | 'type-speller' | 'word-match' | 'scramble' | 'sentence';

export type HebrewHelp = 'always' | 'after-mistake' | 'never';

export interface UnownWordsConfig {
  task: UnownTask;
  questions: number;
  /** Hebrew help: always shown, only after a mistake, or English only. */
  hebrewHelp: HebrewHelp;
  /** Answer choices per question (choice tasks only). */
  choices?: number;
}
