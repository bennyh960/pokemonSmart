import { describe, it, expect } from 'vitest';
import { generateProblem, validateAnswer } from '../math-engine.js';
import { createAdaptiveState, updateAdaptiveState } from '../adaptive-difficulty.js';
import type { MathDifficulty } from '../../types/index.js';

/**
 * QA Validation Tests for feature/math-engine
 * Sprint 1 QA checklist:
 * - Generate 100 problems per level, verify all answers are correct
 * - No negative results at levels 1-2
 * - Clean division at level 4
 * - All numbers within specified ranges
 */

function generate(level: MathDifficulty, count: number) {
  return Array.from({ length: count }, () => generateProblem(level));
}

describe('QA: 100 problems per level - all answers correct', () => {
  for (let level = 1; level <= 6; level++) {
    it(`Level ${level}: 100 problems all validate correctly`, () => {
      const problems = generate(level as MathDifficulty, 100);
      for (const p of problems) {
        expect(p.difficulty).toBe(level);
        const result = validateAnswer(p, p.correctAnswer);
        expect(result.correct).toBe(true);
        expect(Number.isFinite(p.correctAnswer)).toBe(true);
      }
    });
  }
});

describe('QA: No negative results at levels 1-2', () => {
  it('Level 1: no negative answers in 200 problems', () => {
    const problems = generate(1, 200);
    for (const p of problems) {
      expect(p.correctAnswer).toBeGreaterThanOrEqual(0);
    }
  });

  it('Level 2: no negative answers in 200 problems', () => {
    const problems = generate(2, 200);
    for (const p of problems) {
      expect(p.correctAnswer).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('QA: Clean division at level 4', () => {
  it('all division problems have integer answers (300 problems sampled)', () => {
    const problems = generate(4, 300);
    const divProblems = problems.filter((p) => p.question.includes('÷'));
    expect(divProblems.length).toBeGreaterThan(0);
    for (const p of divProblems) {
      expect(Number.isInteger(p.correctAnswer)).toBe(true);
      const nums = p.question.match(/\d+/g)!.map(Number);
      expect(nums[0] % nums[1]).toBe(0);
    }
  });
});

describe('QA: Numbers within specified ranges', () => {
  it('Level 1: operands 0-9', () => {
    const problems = generate(1, 200);
    for (const p of problems) {
      const nums = p.question.match(/\d+/g)!.map(Number);
      for (const n of nums) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(9);
      }
    }
  });

  it('Level 2: operands 10-99', () => {
    const problems = generate(2, 200);
    for (const p of problems) {
      const nums = p.question.match(/\d+/g)!.map(Number);
      for (const n of nums) {
        expect(n).toBeGreaterThanOrEqual(10);
        expect(n).toBeLessThanOrEqual(99);
      }
    }
  });

  it('Level 3: operands 1-9', () => {
    const problems = generate(3, 200);
    for (const p of problems) {
      const nums = p.question.match(/\d+/g)!.map(Number);
      for (const n of nums) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(9);
      }
    }
  });

  it('Level 4: multiplication operands up to 12', () => {
    const problems = generate(4, 200);
    const mulProblems = problems.filter((p) => p.question.includes('×'));
    for (const p of mulProblems) {
      const nums = p.question.match(/\d+/g)!.map(Number);
      for (const n of nums) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(12);
      }
    }
  });

  it('Level 6: fraction problems produce integer answers', () => {
    const problems = generate(6, 500);
    const fracProblems = problems.filter((p) => p.question.includes('/'));
    expect(fracProblems.length).toBeGreaterThan(0);
    for (const p of fracProblems) {
      expect(Number.isInteger(p.correctAnswer)).toBe(true);
    }
  });
});

describe('QA: Adaptive difficulty behavior', () => {
  it('full scenario: 3 correct ups, 2 wrong downs, streak resets', () => {
    let state = createAdaptiveState(3);
    const correct = { correct: true, timeTaken: 5, bonusMultiplier: 1, answer: 0 };
    const wrong = { correct: false, timeTaken: 5, bonusMultiplier: 0.5, answer: 0 };

    // 3 correct → level 3 → 4
    state = updateAdaptiveState(state, correct);
    state = updateAdaptiveState(state, correct);
    state = updateAdaptiveState(state, correct);
    expect(state.currentDifficulty).toBe(4);
    expect(state.streak).toBe(3);

    // 1 wrong breaks streak, no level change
    state = updateAdaptiveState(state, wrong);
    expect(state.currentDifficulty).toBe(4);
    expect(state.streak).toBe(0);

    // 2 wrong in a row → level 4 → 3
    state = updateAdaptiveState(state, wrong);
    expect(state.currentDifficulty).toBe(3);

    // success rate tracking
    expect(state.totalCorrect).toBe(3);
    expect(state.totalAttempted).toBe(5);
  });

  it('does not exceed boundaries (1-6)', () => {
    const correct = { correct: true, timeTaken: 5, bonusMultiplier: 1, answer: 0 };
    const wrong = { correct: false, timeTaken: 5, bonusMultiplier: 0.5, answer: 0 };

    let high = createAdaptiveState(6);
    high = updateAdaptiveState(high, correct);
    high = updateAdaptiveState(high, correct);
    high = updateAdaptiveState(high, correct);
    expect(high.currentDifficulty).toBe(6);

    let low = createAdaptiveState(1);
    low = updateAdaptiveState(low, wrong);
    low = updateAdaptiveState(low, wrong);
    expect(low.currentDifficulty).toBe(1);
  });
});
