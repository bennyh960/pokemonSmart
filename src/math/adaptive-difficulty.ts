import type { MathDifficulty, MathResult, AdaptiveState } from '../types/index.js';

export function createAdaptiveState(initialDifficulty: MathDifficulty = 1): AdaptiveState {
  return {
    currentDifficulty: initialDifficulty,
    consecutiveCorrect: 0,
    consecutiveWrong: 0,
    totalCorrect: 0,
    totalAttempted: 0,
    streak: 0,
  };
}

export function updateAdaptiveState(state: AdaptiveState, result: MathResult): AdaptiveState {
  const next = { ...state };
  next.totalAttempted++;

  if (result.correct) {
    next.totalCorrect++;
    next.consecutiveCorrect++;
    next.consecutiveWrong = 0;
    next.streak = state.streak + 1;

    if (next.consecutiveCorrect >= 3 && next.currentDifficulty < 6) {
      next.currentDifficulty = (next.currentDifficulty + 1) as MathDifficulty;
      next.consecutiveCorrect = 0;
    }
  } else {
    next.consecutiveWrong++;
    next.consecutiveCorrect = 0;
    next.streak = 0;

    if (next.consecutiveWrong >= 2 && next.currentDifficulty > 1) {
      next.currentDifficulty = (next.currentDifficulty - 1) as MathDifficulty;
      next.consecutiveWrong = 0;
    }
  }

  return next;
}
