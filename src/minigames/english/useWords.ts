/** Reads / saves the shared word progress of all English modes (see learning.ts). */

import { useCallback } from 'react';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.js';
import { ensureGameProgress } from '../progress.js';
import type { MiniGamesSave } from '../types.js';
import { markShown, readWordStats, recordAnswers, todayKey, type WordAnswer, type WordStats } from './learning.js';

/** The library's home game keeps the word records of every English mode. */
export const WORDS_HOME = 'unown-words';

export function wordStatsOf(save: MiniGamesSave | undefined): WordStats {
  return readWordStats(save?.[WORDS_HOME]?.data?.words);
}

/** [stats, record(answers), shown(wordIds)] — record saves a finished round, shown marks learning cards seen. */
export function useWordStats(): readonly [
  WordStats,
  (answers: readonly WordAnswer[]) => void,
  (wordIds: readonly string[]) => void,
] {
  const [pd, mutate] = usePlayerData();
  const update = useCallback(
    (fn: (stats: WordStats) => WordStats) =>
      mutate((draft) => {
        draft.miniGames ??= {};
        const data = (ensureGameProgress(draft.miniGames, WORDS_HOME).data ??= {});
        data.words = fn(readWordStats(data.words));
      }),
    [mutate],
  );
  const record = useCallback(
    (answers: readonly WordAnswer[]) => update((s) => recordAnswers(s, answers, todayKey())),
    [update],
  );
  const shown = useCallback((ids: readonly string[]) => update((s) => markShown(s, ids, todayKey())), [update]);
  return [wordStatsOf(pd.miniGames), record, shown] as const;
}
