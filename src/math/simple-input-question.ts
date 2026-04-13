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
 * @param gradeId  - Which grade config to use
 * @param types    - Subset of op types to allow (undefined / empty = all grade-appropriate)
 */
export function generateSimpleInputQuestion(
  gradeId: GradeId,
  types?: SimpleOpType[],
): SimpleInputQuestion {
  const cfg = getClassConfig(gradeId);
  const gradeNum = Number(gradeId.replace('grade', ''));

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

  for (let attempt = 0; attempt < 80; attempt++) {
    const operators: SimpleOpType[] = Array.from(
      { length: termCount - 1 },
      () => validOps[Math.floor(Math.random() * validOps.length)],
    );

    const operands: number[] = [randInt(min, max)];
    let current = operands[0];
    let valid = true;

    for (let i = 0; i < operators.length; i++) {
      const op = operators[i];
      let rhs: number;

      if (op === '÷') {
        // Always require CLEAN integer division — the answer must be exact.
        // Find all divisors of current in [2, min(current, 20)] that divide evenly.
        if (current <= 1) { valid = false; break; }
        const divisors: number[] = [];
        const cap = Math.min(current, 20);
        for (let d = 2; d <= cap; d++) {
          if (current % d === 0) divisors.push(d); // exact division only
        }
        if (divisors.length === 0) { valid = false; break; }
        rhs = divisors[Math.floor(Math.random() * divisors.length)];
        // Result is guaranteed exact integer
        current = current / rhs;
        operands.push(rhs);
        continue; // skip the generic update below
      } else if (op === '×') {
        // Keep the multiplier small so the result stays in a reasonable range
        const mulMax = Math.min(12, Math.floor(max / Math.max(current, 1)));
        if (mulMax < 2) { valid = false; break; }
        rhs = randInt(2, mulMax);
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
