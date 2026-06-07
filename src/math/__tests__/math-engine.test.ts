import { describe, it, expect } from 'vitest';
import { generateProblem, validateAnswer } from '../math-engine.js';
import { createAdaptiveState, updateAdaptiveState } from '../adaptive-difficulty.js';
import type { MathDifficulty, MathResult } from '../../types/index.js';

function generateMany(difficulty: MathDifficulty, count: number) {
  return Array.from({ length: count }, () => generateProblem(difficulty));
}

describe('generateProblem', () => {
  describe('Level 1 - single digit addition/subtraction', () => {
    it('generates 100 problems with correct answers', () => {
      const problems = generateMany(1, 100);
      for (const p of problems) {
        expect(p.difficulty).toBe(1);
        expect(p.correctAnswer).toBeTypeOf('number');
        expect(Number.isInteger(p.correctAnswer)).toBe(true);
      }
    });

    it('never produces negative results', () => {
      const problems = generateMany(1, 100);
      for (const p of problems) {
        expect(p.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    });

    it('uses single-digit operands', () => {
      const problems = generateMany(1, 100);
      for (const p of problems) {
        const nums = p.question.match(/\d+/g)!.map(Number);
        for (const n of nums) {
          expect(n).toBeLessThanOrEqual(9);
        }
      }
    });
  });

  describe('Level 2 - double digit addition/subtraction', () => {
    it('generates 100 problems with correct answers', () => {
      const problems = generateMany(2, 100);
      for (const p of problems) {
        expect(p.difficulty).toBe(2);
        expect(Number.isInteger(p.correctAnswer)).toBe(true);
      }
    });

    it('never produces negative results', () => {
      const problems = generateMany(2, 100);
      for (const p of problems) {
        expect(p.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    });

    it('uses double-digit operands', () => {
      const problems = generateMany(2, 100);
      for (const p of problems) {
        const nums = p.question.match(/\d+/g)!.map(Number);
        for (const n of nums) {
          expect(n).toBeGreaterThanOrEqual(10);
          expect(n).toBeLessThanOrEqual(99);
        }
      }
    });
  });

  describe('Level 3 - single digit multiplication', () => {
    it('generates 100 problems with correct answers', () => {
      const problems = generateMany(3, 100);
      for (const p of problems) {
        expect(p.difficulty).toBe(3);
        const nums = p.question.match(/\d+/g)!.map(Number);
        expect(nums.length).toBe(2);
        expect(p.correctAnswer).toBe(nums[0] * nums[1]);
      }
    });

    it('uses numbers 1-9', () => {
      const problems = generateMany(3, 100);
      for (const p of problems) {
        const nums = p.question.match(/\d+/g)!.map(Number);
        for (const n of nums) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(9);
        }
      }
    });
  });

  describe('Level 4 - multiplication & division', () => {
    it('generates 100 problems with correct answers', () => {
      const problems = generateMany(4, 100);
      for (const p of problems) {
        expect(p.difficulty).toBe(4);
        expect(Number.isInteger(p.correctAnswer)).toBe(true);
      }
    });

    it('division has no remainders', () => {
      const problems = generateMany(4, 200);
      const divProblems = problems.filter((p) => p.question.includes('÷'));
      expect(divProblems.length).toBeGreaterThan(0);
      for (const p of divProblems) {
        const nums = p.question.match(/\d+/g)!.map(Number);
        expect(nums[0] % nums[1]).toBe(0);
        expect(p.correctAnswer).toBe(nums[0] / nums[1]);
      }
    });
  });

  describe('Level 5 - mixed operations', () => {
    it('generates 100 problems with correct answers', () => {
      const problems = generateMany(5, 100);
      for (const p of problems) {
        expect(p.difficulty).toBe(5);
        expect(Number.isInteger(p.correctAnswer)).toBe(true);
        expect(p.correctAnswer).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Level 6 - complex expressions & fractions', () => {
    it('generates 100 problems with correct answers', () => {
      const problems = generateMany(6, 100);
      for (const p of problems) {
        expect(p.difficulty).toBe(6);
        expect(Number.isFinite(p.correctAnswer)).toBe(true);
      }
    });

    it('fraction problems produce integer answers', () => {
      const problems = generateMany(6, 300);
      const fracProblems = problems.filter((p) => p.question.includes('/'));
      expect(fracProblems.length).toBeGreaterThan(0);
      for (const p of fracProblems) {
        expect(Number.isInteger(p.correctAnswer)).toBe(true);
      }
    });
  });
});

describe('validateAnswer', () => {
  it('returns correct=true for right answer', () => {
    const problem = generateProblem(1);
    const result = validateAnswer(problem, problem.correctAnswer);
    expect(result.correct).toBe(true);
  });

  it('returns correct=false for wrong answer', () => {
    const problem = generateProblem(1);
    const result = validateAnswer(problem, problem.correctAnswer + 999);
    expect(result.correct).toBe(false);
  });
});

describe('adaptive difficulty', () => {
  it('creates initial state', () => {
    const state = createAdaptiveState();
    expect(state.currentDifficulty).toBe(1);
    expect(state.consecutiveCorrect).toBe(0);
    expect(state.consecutiveWrong).toBe(0);
    expect(state.streak).toBe(0);
  });

  it('increases difficulty after 3 correct in a row', () => {
    let state = createAdaptiveState();
    const correct: MathResult = { correct: true, timeTaken: 5, bonusMultiplier: 1, answer: 0 };
    state = updateAdaptiveState(state, correct);
    state = updateAdaptiveState(state, correct);
    expect(state.currentDifficulty).toBe(1);
    state = updateAdaptiveState(state, correct);
    expect(state.currentDifficulty).toBe(2);
  });

  it('decreases difficulty after 2 wrong in a row', () => {
    let state = createAdaptiveState(3);
    const wrong: MathResult = { correct: false, timeTaken: 5, bonusMultiplier: 0.5, answer: 0 };
    state = updateAdaptiveState(state, wrong);
    expect(state.currentDifficulty).toBe(3);
    state = updateAdaptiveState(state, wrong);
    expect(state.currentDifficulty).toBe(2);
  });

  it('does not go below difficulty 1', () => {
    let state = createAdaptiveState(1);
    const wrong: MathResult = { correct: false, timeTaken: 5, bonusMultiplier: 0.5, answer: 0 };
    state = updateAdaptiveState(state, wrong);
    state = updateAdaptiveState(state, wrong);
    expect(state.currentDifficulty).toBe(1);
  });

  it('does not go above difficulty 6', () => {
    let state = createAdaptiveState(6);
    const correct: MathResult = { correct: true, timeTaken: 5, bonusMultiplier: 1, answer: 0 };
    state = updateAdaptiveState(state, correct);
    state = updateAdaptiveState(state, correct);
    state = updateAdaptiveState(state, correct);
    expect(state.currentDifficulty).toBe(6);
  });

  it('tracks streak correctly', () => {
    let state = createAdaptiveState();
    const correct: MathResult = { correct: true, timeTaken: 5, bonusMultiplier: 1, answer: 0 };
    const wrong: MathResult = { correct: false, timeTaken: 5, bonusMultiplier: 0.5, answer: 0 };
    state = updateAdaptiveState(state, correct);
    state = updateAdaptiveState(state, correct);
    expect(state.streak).toBe(2);
    state = updateAdaptiveState(state, wrong);
    expect(state.streak).toBe(0);
  });

  it('tracks success rate', () => {
    let state = createAdaptiveState();
    const correct: MathResult = { correct: true, timeTaken: 5, bonusMultiplier: 1, answer: 0 };
    const wrong: MathResult = { correct: false, timeTaken: 5, bonusMultiplier: 0.5, answer: 0 };
    state = updateAdaptiveState(state, correct);
    state = updateAdaptiveState(state, correct);
    state = updateAdaptiveState(state, wrong);
    expect(state.totalCorrect).toBe(2);
    expect(state.totalAttempted).toBe(3);
  });
});
