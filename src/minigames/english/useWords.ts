/** Reads / saves the shared word progress of all English modes (see learning.ts). */

import { useCallback } from 'react';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.js';
import { ensureGameProgress } from '../progress.js';
import type { MiniGamesSave } from '../types.js';
import { readWordStats, recordAnswers, todayKey, type WordAnswer, type WordStats } from './learning.js';

/** The library's home game keeps the word records of every English mode. */
export const WORDS_HOME = 'unown-words';

export function wordStatsOf(save: MiniGamesSave | undefined): WordStats {
  return readWordStats(save?.[WORDS_HOME]?.data?.words);
}

/** [stats, record(answers)] — record saves a finished round's answers. */
export function useWordStats(): readonly [WordStats, (answers: readonly WordAnswer[]) => void] {
  const [pd, mutate] = usePlayerData();
  const record = useCallback(
    (answers: readonly WordAnswer[]) =>
      mutate((draft) => {
        draft.miniGames ??= {};
        const data = (ensureGameProgress(draft.miniGames, WORDS_HOME).data ??= {});
        data.words = recordAnswers(readWordStats(data.words), answers, todayKey());
      }),
    [mutate],
  );
  return [wordStatsOf(pd.miniGames), record] as const;
}
