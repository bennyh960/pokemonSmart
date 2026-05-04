/**
 * Simple arithmetic input questions — player types the answer (no multiple choice).
 *
 * Design rules (per user requirement — follow ClassConfig faithfully):
 *  - Number range from cfg.numberRange
 *  - Allowed operations from cfg.allowedOperations (ignores '()')
 *  - Division ALWAYS produces a clean integer result (no remainders), even if
 *    cfg.allowRemainders is true — because the player must type an exact number
 *  - Subtraction never produces a negative unless cfg.allowNegative is true
 *  - Term count: grades 1–3 → 2 terms (1 op); grades 4–6 → 2 or 3 terms (randomly)
 *
 * Used in:
 *  - Gate sessions (inputQuestions config)
 *  - NPC interactions (questions config)
 */

import { getClassConfig } from './question-builder/index.js';
import type { GradeId } from './question-builder/types.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SimpleOpType = '+' | '-' | '×' | '÷';

export interface SimpleInputQuestion {
  /** Discriminator — distinguishes from RichQuestion */
  readonly type: 'simple-input';
  /** Display expression shown to the player, e.g. "3 + 7 = ?" */
  readonly expression: string;
  /** Correct numeric answer */
  readonly answer: number;
  /** Grade that was used to generate this question */
  readonly gradeId: GradeId;
}

// ─── Generator ───────────────────────────────────────────────────────────────

/**
 * Generate one simple arithmetic input question for the given grade.
 *
 * @param gradeId   - Which grade config to use
 * @param types     - Subset of op types to allow (undefined / empty = all grade-appropriate)
 * @param birthYear - Player birth year; if ≥ 2018, applies a learner-friendly
 *                    distribution for × and ÷ (results ≤ 100, round-number families, ×11)
 */
export function generateSimpleInputQuestion(
  gradeId: GradeId,
  types?: SimpleOpType[],
  birthYear?: number,
): SimpleInputQuestion {
  const cfg = getClassConfig(gradeId);
  const gradeNum = Number(gradeId.replace('grade', ''));
  const isYoungLearner = birthYear !== undefined && birthYear >= 2018;

  // Keep only valid simple ops from the grade config (drop '()' which isn't a simple op)
  const gradeOps = cfg.allowedOperations.filter(
    (op): op is SimpleOpType => op === '+' || op === '-' || op === '×' || op === '÷',
  );
  const ops =
    types && types.length > 0
      ? types.filter(t => gradeOps.includes(t))
      : gradeOps;
  const validOps: SimpleOpType[] = ops.length > 0 ? ops : ['+'];

  // Grade 1–3: always 2 terms (1 operation).
  // Grade 4–6: 70% chance of 2 terms, 30% of 3 terms.
  const termCount = gradeNum <= 3 ? 2 : Math.random() < 0.7 ? 2 : 3;

  const { min, max } = cfg.numberRange;
  const allowNegative = cfg.allowNegative;

  // ×100-family bases: reinforces important fact families (20×5=100, 25×4=100, etc.)
  // For grade 2-4 (non-young-learner), the first operand is biased toward these values
  // 30% of the time when the first operator will be ×.
  const X100_BASES = [2, 4, 5, 10, 20, 25].filter(v => v >= min && v <= max);

  // Young-learner constant pools (birthYear ≥ 2018)
  const YL_MUL_M5 = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
  const YL_DIV_M10 = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
  const YL_DIV_M5  = [15, 25, 35, 45, 55, 65, 75, 85, 95]; // end-in-5, divisible by 5

  for (let attempt = 0; attempt < 80; attempt++) {
    const operators: SimpleOpType[] = Array.from(
      { length: termCount - 1 },
      () => validOps[Math.floor(Math.random() * validOps.length)],
    );

    // ×100-family bias: for grade 2-4 (non-young-learner only — young learner
    // has its own distribution that overrides operands anyway).
    let firstOperand = randInt(min, max);
    if (
      gradeNum >= 2 && gradeNum <= 4 &&
      !isYoungLearner &&
      operators[0] === '×' &&
      X100_BASES.length > 0 &&
      Math.random() < 0.30
    ) {
      firstOperand = X100_BASES[Math.floor(Math.random() * X100_BASES.length)];
    }

    const operands: number[] = [firstOperand];
    let current = operands[0];
    let valid = true;

    for (let i = 0; i < operators.length; i++) {
      const op = operators[i];
      let rhs: number;

      if (op === '÷') {
        // ── Young-learner division (birthYear ≥ 2018, first op of a 2-term question) ──
        if (isYoungLearner && i === 0 && termCount === 2) {
          const mode = Math.random();
          if (mode < 0.90) {
            // Dividend ≤ 100, divisor 2–10, clean integer result
            const b = randInt(2, 10);
            const maxQ = Math.floor(100 / b);
            if (maxQ < 1) { valid = false; break; }
            const q = randInt(1, maxQ);
            operands[0] = q * b;
            operands.push(b);
            current = q;
            continue;
          } else if (mode < 0.95) {
            // Multiples of 10 (10–200) ÷ 1–10, clean
            const a = YL_DIV_M10[Math.floor(Math.random() * YL_DIV_M10.length)];
            const validDivs: number[] = [];
            for (let d = 1; d <= 10; d++) { if (a % d === 0) validDivs.push(d); }
            if (validDivs.length === 0) { valid = false; break; }
            const b = validDivs[Math.floor(Math.random() * validDivs.length)];
            operands[0] = a;
            operands.push(b);
            current = a / b;
            continue;
          } else if (mode < 0.98) {
            // Numbers ending in 5 (15–95) ÷ 5
            const a = YL_DIV_M5[Math.floor(Math.random() * YL_DIV_M5.length)];
            operands[0] = a;
            operands.push(5);
            current = a / 5;
            continue;
          }
          // 2%: fall through to generic logic below
        }
        // ── Generic division — always clean integer result ──────────────────────
        if (current <= 1) { valid = false; break; }
        const divisors: number[] = [];
        const cap = Math.min(current, 20);
        for (let d = 2; d <= cap; d++) {
          if (current % d === 0) divisors.push(d);
        }
        if (divisors.length === 0) { valid = false; break; }
        rhs = divisors[Math.floor(Math.random() * divisors.length)];
        current = current / rhs;
        operands.push(rhs);
        continue;
      } else if (op === '×') {
        // ── Young-learner multiplication (birthYear ≥ 2018, first op of 2-term) ──
        if (isYoungLearner && i === 0 && termCount === 2) {
          const mode = Math.random();
          if (mode < 0.90) {
            // Both factors 2–9; product is always < 100
            const a = randInt(2, 9);
            operands[0] = a;
            current = a;
            rhs = randInt(2, 9);
          } else if (mode < 0.95) {
            // Multiple of 5 (10–100) × 1–10
            const a = YL_MUL_M5[Math.floor(Math.random() * YL_MUL_M5.length)];
            operands[0] = a;
            current = a;
            rhs = randInt(1, 10);
          } else if (mode < 0.98) {
            // × 11; first factor kept 2–9 so product stays ≤ 99
            const a = randInt(2, 9);
            operands[0] = a;
            current = a;
            rhs = 11;
          } else {
            // 2%: generic logic (same as non-young-learner path below)
            const mulMax = Math.min(12, Math.floor(max / Math.max(current, 1)));
            if (mulMax < 2) { valid = false; break; }
            const x100Partner = 100 / current;
            if (Number.isInteger(x100Partner) && x100Partner >= 2 && x100Partner <= mulMax && X100_BASES.includes(current) && Math.random() < 0.50) {
              rhs = x100Partner;
            } else {
              rhs = randInt(2, mulMax);
            }
          }
        } else {
          // ── Generic multiplication ──────────────────────────────────────────────
          const mulMax = Math.min(12, Math.floor(max / Math.max(current, 1)));
          if (mulMax < 2) { valid = false; break; }
          const x100Partner = 100 / current;
          if (
            Number.isInteger(x100Partner) &&
            x100Partner >= 2 &&
            x100Partner <= mulMax &&
            X100_BASES.includes(current) &&
            Math.random() < 0.50
          ) {
            rhs = x100Partner;
          } else {
            rhs = randInt(2, mulMax);
          }
        }
      } else if (op === '-') {
        // Avoid negatives unless the grade allows them
        const subMax = allowNegative ? max : current - 1;
        if (subMax < min) { valid = false; break; }
        rhs = randInt(min, subMax);
      } else {
        // Addition — just pick any value in range
        rhs = randInt(min, max);
      }

      operands.push(rhs);
      current = applyOp(current, op, rhs);
    }

    if (!valid) continue;
    const answer = Math.round(current); // should already be integer, but round for safety
    if (!allowNegative && answer < 0) continue;
    if (!isFinite(answer) || isNaN(answer)) continue;

    // Build the display expression (always left-to-right regardless of locale)
    const SYM: Record<SimpleOpType, string> = { '+': '+', '-': '−', '×': '×', '÷': '÷' };
    let expr = String(operands[0]);
    for (let i = 0; i < operators.length; i++) {
      expr += ` ${SYM[operators[i]]} ${operands[i + 1]}`;
    }
    expr += ' = ?';

    return { type: 'simple-input', expression: expr, answer, gradeId };
  }

  // Absolute fallback — should almost never be reached
  return { type: 'simple-input', expression: '1 + 1 = ?', answer: 2, gradeId };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randInt(min: number, max: number): number {
  if (max < min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function applyOp(a: number, op: SimpleOpType, b: number): number {
  switch (op) {
    case '+': return a + b;
    case '-': return a - b;
    case '×': return a * b;
    case '÷': return b !== 0 ? a / b : 0;
  }
}
