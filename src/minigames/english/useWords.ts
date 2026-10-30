/** Reads / saves the shared word progress of all English modes (see learning.ts). */

import { useCallback, useEffect } from 'react';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.js';
import { ensureGameProgress } from '../progress.js';
import type { MiniGamesSave } from '../types.js';
import {
  markShown,
  readWordStats,
  recordAnswers,
  setWordOfTheDay,
  todayKey,
  wordOfTheDay,
  type WordAnswer,
  type WordStats,
} from './learning.js';
import { getWords, type Word } from './words.js';

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

/** Today's word (learning.ts wordOfTheDay); saves the choice so it stays all day and the games ask it. */
export function useWordOfTheDay(): Word {
  const [pd, mutate] = usePlayerData();
  const today = todayKey();
  const stats = wordStatsOf(pd.miniGames);
  const word = wordOfTheDay(getWords(), stats, today);
  // only a met word is saved (see setWordOfTheDay)
  const toSave = !!stats[word.id] && stats[word.id].focusDay !== today;
  useEffect(() => {
    if (!toSave) return;
    mutate((draft) => {
      const data = draft.miniGames?.[WORDS_HOME]?.data;
      if (data?.words) data.words = setWordOfTheDay(readWordStats(data.words), word.id, today);
    });
  }, [toSave, word.id, today, mutate]);
  return word;
}
