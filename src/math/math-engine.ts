import type { MathDifficulty, MathProblem, MathResult, AdaptiveState } from '../types/index.js';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLevel1(): MathProblem {
  const op = pickRandom(['+', '-'] as const);
  let a = randInt(0, 9);
  let b = randInt(0, 9);
  if (op === '-' && a < b) [a, b] = [b, a];
  const answer = op === '+' ? a + b : a - b;
  return {
    question: `${a} ${op} ${b}`,
    correctAnswer: answer,
    difficulty: 1,
    timeLimit: 15,
    category: op === '+' ? 'addition' : 'subtraction',
  };
}

function generateLevel2(): MathProblem {
  const op = pickRandom(['+', '-'] as const);
  let a = randInt(10, 99);
  let b = randInt(10, 99);
  if (op === '-' && a < b) [a, b] = [b, a];
  const answer = op === '+' ? a + b : a - b;
  return {
    question: `${a} ${op} ${b}`,
    correctAnswer: answer,
    difficulty: 2,
    timeLimit: 20,
    category: op === '+' ? 'addition' : 'subtraction',
  };
}

function generateLevel3(): MathProblem {
  const a = randInt(1, 9);
  const b = randInt(1, 9);
  return {
    question: `${a} × ${b}`,
    correctAnswer: a * b,
    difficulty: 3,
    timeLimit: 15,
    category: 'multiplication',
  };
}

function generateLevel4(): MathProblem {
  const op = pickRandom(['×', '÷'] as const);
  if (op === '×') {
    const a = randInt(1, 12);
    const b = randInt(1, 12);
    return {
      question: `${a} × ${b}`,
      correctAnswer: a * b,
      difficulty: 4,
      timeLimit: 20,
      category: 'multiplication',
    };
  }
  const b = randInt(1, 12);
  const quotient = randInt(1, 12);
  const a = b * quotient;
  return {
    question: `${a} ÷ ${b}`,
    correctAnswer: quotient,
    difficulty: 4,
    timeLimit: 20,
    category: 'division',
  };
}

function generateLevel5(): MathProblem {
  const variant = randInt(0, 2);
  let question: string;
  let answer: number;

  if (variant === 0) {
    const a = randInt(1, 20);
    const b = randInt(1, 9);
    const c = randInt(1, 9);
    question = `${a} + ${b} × ${c}`;
    answer = a + b * c;
  } else if (variant === 1) {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const product = a * b;
    const c = randInt(1, product - 1);
    question = `${a} × ${b} - ${c}`;
    answer = product - c;
  } else {
    const a = randInt(1, 10);
    const b = randInt(1, 10);
    const c = randInt(2, 5);
    question = `(${a} + ${b}) × ${c}`;
    answer = (a + b) * c;
  }

  return {
    question,
    correctAnswer: answer,
    difficulty: 5,
    timeLimit: 30,
    category: 'mixed',
  };
}

function generateLevel6(): MathProblem {
  const variant = randInt(0, 2);
  let question: string;
  let answer: number;
  let category = 'mixed';

  if (variant === 0) {
    const a = randInt(2, 10);
    const b = randInt(2, 10);
    const c = randInt(2, 5);
    const partial = (a + b) * c;
    const d = randInt(1, partial - 1);
    question = `(${a} + ${b}) × ${c} - ${d}`;
    answer = partial - d;
  } else if (variant === 1) {
    const a = randInt(2, 6);
    const b = randInt(2, 8);
    const c = randInt(1, 8);
    const d = randInt(1, 20);
    question = `${a} × (${b} + ${c}) + ${d}`;
    answer = a * (b + c) + d;
  } else {
    const fractions: [number, number][] = [
      [1, 2],
      [1, 4],
      [3, 4],
    ];
    const [num, den] = pickRandom(fractions);
    const multiplier = randInt(2, 8);
    const c = den * multiplier;
    question = `${num}/${den} of ${c}`;
    answer = (num * c) / den;
    category = 'fractions';
  }

  return {
    question,
    correctAnswer: answer,
    difficulty: 6,
    timeLimit: 45,
    category,
  };
}

const generators: Record<MathDifficulty, () => MathProblem> = {
  1: generateLevel1,
  2: generateLevel2,
  3: generateLevel3,
  4: generateLevel4,
  5: generateLevel5,
  6: generateLevel6,
};

export function generateProblem(difficulty: MathDifficulty, _adaptiveState?: AdaptiveState): MathProblem {
  return generators[difficulty]();
}

export function validateAnswer(problem: MathProblem, answer: number): MathResult {
  const correct = answer === problem.correctAnswer;
  return {
    correct,
    timeTaken: 0,
    bonusMultiplier: correct ? 1.0 : 0.5,
    answer,
  };
}
