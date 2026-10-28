/** Hebrew help — shrinks as levels go up, so the English has to carry the meaning. */

export type HebrewHelp = 'always' | 'after-mistake' | 'never';

/** Whether to show the Hebrew help line now (only for Hebrew players). */
export function showHebrewHelp(help: HebrewHelp, locale: string, questionMistakes: number): boolean {
  return locale === 'he' && (help === 'always' || (help === 'after-mistake' && questionMistakes > 0));
}
