/**
 * One round of word questions — the loop every quiz-style English mode shares:
 * score / combo / mistakes (scoring.ts), a short reveal after each answer, then the next question;
 * at the end the words are saved to the learning records and the shell gets the stars.
 */

import { useEffect, useRef, useState } from 'react';
import { getPlayerBirthYear } from '../../data/story/global-gate-config.js';
import { useReducedMotion } from '../shell/hooks.js';
import type { FloatTextOptions, MiniGameHud, MiniGameResult, MiniGameSfx } from '../types.js';
import type { WordAnswer } from './learning.js';
import { pick } from './random.js';
import { newTally, starsForMistakes, tallyQuestionDone, tallyWrong, type Tally } from './scoring.js';
import { PRAISE } from './ui.js';
import { useWordStats } from './useWords.js';

/** Pause after an answer before the next question (lets the word be heard). */
export const REVEAL_MS = 1700;

export interface WordRoundOptions {
  total: number;
  paused: boolean;
  hud: MiniGameHud;
  sfx: MiniGameSfx;
  onFinish: (result: MiniGameResult) => void;
  /** Bank word ids a question teaches (recorded as right when answered with no mistake). */
  wordIdsOf: (index: number) => readonly string[];
  /** Words of the current question the player was helped with (a hint) — recorded as not known yet. */
  helpedWordIds?: () => readonly string[];
  /** Said when the answer is revealed (the word, again — repetition is learning). */
  onReveal?: (index: number) => void;
  revealMs?: number;
}

export interface WrongTap {
  key: string;
  /** Bumps on every wrong tap (replays the shake). */
  n: number;
}

export function useWordRound(o: WordRoundOptions) {
  const reduced = useReducedMotion();
  const [, recordWords] = useWordStats();
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState<Tally>(newTally);
  const [solved, setSolved] = useState(false);
  /** The question ended without a right answer (time ran out). */
  const [failed, setFailed] = useState(false);
  const [wrong, setWrong] = useState<WrongTap | null>(null);
  const answers = useRef<WordAnswer[]>([]);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  useEffect(() => o.hud.setScore(0), [o.hud]);

  function remember(right: boolean) {
    const helped = o.helpedWordIds?.() ?? [];
    for (const wordId of o.wordIdsOf(index)) answers.current.push({ wordId, right: right && !helped.includes(wordId) });
  }

  /** A wrong tap: shake, soft boop, combo lost. */
  function miss(key: string) {
    if (solved || o.paused) return;
    setTally((t) => tallyWrong(t));
    o.hud.setCombo(0);
    o.sfx.wrong();
    if (!reduced) o.hud.shake();
    setWrong((w) => ({ key, n: (w?.n ?? 0) + 1 }));
    later(() => setWrong((w) => (w?.key === key ? null : w)), 500);
  }

  /** The right answer. */
  function solve(pos?: FloatTextOptions) {
    if (solved || o.paused) return;
    const { tally: next, points } = tallyQuestionDone(tally);
    remember(tally.questionMistakes === 0);
    setTally(next);
    setSolved(true);
    o.hud.addScore(points, pos);
    o.hud.setCombo(next.combo);
    o.sfx.correct(next.combo);
    o.hud.floatText(pick(Math.random, PRAISE));
    later(() => o.onReveal?.(index), 350);
    if (index === o.total - 1 && !reduced) later(() => o.hud.confetti(), 300);
  }

  /** Time ran out: counts as a mistake, shows the answer, no points. */
  function fail() {
    if (solved || o.paused) return;
    remember(false);
    const t = tallyWrong(tally);
    setTally({ ...t, combo: 0, questionMistakes: 0, done: t.done + 1 });
    o.hud.setCombo(0);
    o.sfx.wrong();
    setFailed(true);
    setSolved(true);
    later(() => o.onReveal?.(index), 350);
  }

  // Next question after the reveal (waits while paused).
  useEffect(() => {
    if (!solved || o.paused) return;
    const id = window.setTimeout(() => {
      if (index >= o.total - 1) {
        if (finished.current) return;
        finished.current = true;
        recordWords(answers.current);
        o.onFinish({
          stars: starsForMistakes(tally.mistakes, o.total, new Date().getFullYear() - getPlayerBirthYear()),
          score: tally.score,
          extra: { mistakes: tally.mistakes, bestCombo: tally.bestCombo },
        });
        return;
      }
      setIndex(index + 1);
      setSolved(false);
      setFailed(false);
      setWrong(null);
    }, o.revealMs ?? REVEAL_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, o.paused, index]);

  return { index, tally, solved, failed, wrong, miss, solve, fail, later };
}
