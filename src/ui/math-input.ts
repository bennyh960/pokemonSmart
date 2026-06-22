/**
 * MathInput - Math problem display with number pad.
 *
 * Shows the problem, answer field, timer bar, and a 3x4 number pad grid.
 * Supports both mouse/touch clicks AND keyboard input.
 * Green flash for correct, red shake + show answer for wrong.
 */

import type { InputManager } from '../engine/input';
import type { MathProblem } from '../types/index.js';
import { fillRect, drawText, drawRect } from '../engine/renderer.js';
import { t } from '../i18n/i18n.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H, RES_SCALE } from '../engine/config.js';

/** Pad button layout: rows of [label, value]. */
const PAD_LAYOUT: string[][] = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['\u232b', '0', '\u2713'],
];

const BTN_W = 22;
const BTN_H = 16;
const BTN_GAP = 3;
const PAD_COLS = 3;
const PAD_ROWS = 4;

const PAD_TOTAL_W = PAD_COLS * BTN_W + (PAD_COLS - 1) * BTN_GAP;
const PAD_TOTAL_H = PAD_ROWS * BTN_H + (PAD_ROWS - 1) * BTN_GAP;
const PAD_X = (SCREEN_W - PAD_TOTAL_W) / 2;
const PAD_Y = SCREEN_H - PAD_TOTAL_H - 6;

type FeedbackType = 'none' | 'correct' | 'wrong';

interface MathInputState {
  problem: MathProblem;
  answer: string;
  timeRemaining: number;
  timeLimit: number;
  feedback: FeedbackType;
  feedbackTimer: number;
  correctAnswer: number;
  done: boolean;
  result: { correct: boolean; answer: number; timeTaken: number } | null;
  shakeOffset: number;
  /** Which pad button is "pressed" this frame (for visual feedback). */
  pressedBtn: string;
}

/** Create a math input state for a given problem. */
export function createMathInput(problem: MathProblem): MathInputState {
  return {
    problem,
    answer: '',
    timeRemaining: problem.timeLimit,
    timeLimit: problem.timeLimit,
    feedback: 'none',
    feedbackTimer: 0,
    correctAnswer: problem.correctAnswer,
    done: false,
    result: null,
    shakeOffset: 0,
    pressedBtn: '',
  };
}

/** Convert canvas-space tap position to native coords. */
function canvasToNative(tapPos: { x: number; y: number }, canvas: HTMLCanvasElement): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: ((tapPos.x - rect.left) * scaleX) / RES_SCALE,
    y: ((tapPos.y - rect.top) * scaleY) / RES_SCALE,
  };
}

/** Check which pad button was clicked. Returns the label or ''. */
function hitTestPad(nx: number, ny: number): string {
  for (let row = 0; row < PAD_ROWS; row++) {
    for (let col = 0; col < PAD_COLS; col++) {
      const bx = PAD_X + col * (BTN_W + BTN_GAP);
      const by = PAD_Y + row * (BTN_H + BTN_GAP);
      if (nx >= bx && nx < bx + BTN_W && ny >= by && ny < by + BTN_H) {
        return PAD_LAYOUT[row][col];
      }
    }
  }
  return '';
}

/** Process a button press (digit, backspace, or submit). */
function handleButton(state: MathInputState, btn: string): void {
  if (state.done || state.feedback !== 'none') return;

  if (btn >= '0' && btn <= '9') {
    if (state.answer.length < 6) {
      state.answer += btn;
    }
  } else if (btn === '\u232b') {
    state.answer = state.answer.slice(0, -1);
  } else if (btn === '\u2713') {
    submitAnswer(state);
  }
}

/** Submit the current answer. */
function submitAnswer(state: MathInputState): void {
  if (state.done) return;
  const answerNum = state.answer === '' ? NaN : Number(state.answer);
  const correct = answerNum === state.correctAnswer;
  const timeTaken = state.timeLimit - state.timeRemaining;

  state.feedback = correct ? 'correct' : 'wrong';
  state.feedbackTimer = correct ? 0.6 : 1.5;
  state.done = true;
  state.result = { correct, answer: answerNum, timeTaken };
}

/**
 * Update the math input. Returns the result when feedback is done, or null.
 */
export function updateMathInput(
  state: MathInputState,
  input: InputManager,
  canvas: HTMLCanvasElement,
  dt: number,
): { correct: boolean; answer: number; timeTaken: number } | null {
  state.pressedBtn = '';

  // Handle feedback timer
  if (state.feedback !== 'none') {
    state.feedbackTimer -= dt;
    if (state.feedback === 'wrong') {
      state.shakeOffset = Math.sin(state.feedbackTimer * 30) * 2;
    }
    if (state.feedbackTimer <= 0) {
      return state.result;
    }
    return null;
  }

  // Timer countdown
  if (!state.done) {
    state.timeRemaining -= dt;
    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      state.answer = '';
      submitAnswer(state);
      return null;
    }
  }

  // Keyboard input: digits handled by InputManager's number buffer
  // We intercept key presses directly for immediate response
  for (let d = 0; d <= 9; d++) {
    if (input.isKeyPressed(String(d))) {
      handleButton(state, String(d));
      state.pressedBtn = String(d);
    }
  }
  if (input.isKeyPressed('Backspace')) {
    handleButton(state, '\u232b');
    state.pressedBtn = '\u232b';
  }
  if (input.isKeyPressed('Enter')) {
    handleButton(state, '\u2713');
    state.pressedBtn = '\u2713';
  }

  // Mouse/touch input
  if (input.isTapped()) {
    const tapPos = input.getTapPosition();
    if (tapPos) {
      const native = canvasToNative(tapPos, canvas);
      const btn = hitTestPad(native.x, native.y);
      if (btn) {
        handleButton(state, btn);
        state.pressedBtn = btn;
      }
    }
  }

  // Clear the input manager's number buffer so it doesn't accumulate
  input.clearNumberInput();

  return null;
}

/** Render the math input overlay. */
export function renderMathInput(ctx: CanvasRenderingContext2D, state: MathInputState): void {
  const shakeX = state.feedback === 'wrong' ? state.shakeOffset : 0;

  // Dim background
  fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, 'rgba(0,0,0,0.7)');

  // Flash overlay for correct
  if (state.feedback === 'correct') {
    const alpha = Math.max(0, state.feedbackTimer / 0.6) * 0.3;
    fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, `rgba(32,216,96,${alpha})`);
  }

  // Problem box
  const boxW = 160;
  const boxH = 52;
  const boxX = (SCREEN_W - boxW) / 2 + shakeX;
  const boxY = 8;

  fillRect(ctx, boxX, boxY, boxW, boxH, '#202038');
  drawRect(ctx, boxX, boxY, boxW, boxH, '#686888');

  // Question text
  drawText(ctx, state.problem.question, SCREEN_W / 2 + shakeX, boxY + 8, {
    size: 12,
    color: '#f8f8f8',
    align: 'center',
  });

  // Answer field
  const answerDisplay = state.answer || '_';
  const answerColor = state.feedback === 'correct' ? '#20d860' : state.feedback === 'wrong' ? '#f84038' : '#f8f8f8';
  drawText(ctx, `= ${answerDisplay}`, SCREEN_W / 2 + shakeX, boxY + 26, {
    size: 12,
    color: answerColor,
    align: 'center',
  });

  // Show correct answer on wrong
  if (state.feedback === 'wrong') {
    drawText(ctx, t('math.answer', { answer: state.correctAnswer }), SCREEN_W / 2, boxY + 42, {
      size: 8,
      color: '#f8c030',
      align: 'center',
    });
  }

  // Timer bar
  const timerBarW = boxW - 8;
  const timerBarH = 4;
  const timerBarX = boxX + 4;
  const timerBarY = boxY + boxH - 7;
  const timeRatio = Math.max(0, state.timeRemaining / state.timeLimit);

  fillRect(ctx, timerBarX, timerBarY, timerBarW, timerBarH, '#303030');
  if (timeRatio > 0) {
    const timerColor = timeRatio > 0.5 ? '#20d860' : timeRatio > 0.25 ? '#f8c030' : '#f84038';
    fillRect(ctx, timerBarX, timerBarY, Math.floor(timerBarW * timeRatio), timerBarH, timerColor);
  }

  // Number pad
  for (let row = 0; row < PAD_ROWS; row++) {
    for (let col = 0; col < PAD_COLS; col++) {
      const label = PAD_LAYOUT[row][col];
      const bx = PAD_X + col * (BTN_W + BTN_GAP);
      const by = PAD_Y + row * (BTN_H + BTN_GAP);

      const isPressed = label === state.pressedBtn;
      let bgColor = '#303048';
      let textColor = '#f8f8f8';

      if (label === '\u2713') {
        bgColor = isPressed ? '#18a848' : '#20884a';
        textColor = '#ffffff';
      } else if (label === '\u232b') {
        bgColor = isPressed ? '#c83030' : '#884040';
        textColor = '#ffffff';
      } else if (isPressed) {
        bgColor = '#505068';
      }

      fillRect(ctx, bx, by, BTN_W, BTN_H, bgColor);
      drawRect(ctx, bx, by, BTN_W, BTN_H, '#585870');

      drawText(ctx, label, bx + BTN_W / 2, by + BTN_H / 2 - 4, {
        size: 8,
        color: textColor,
        align: 'center',
      });
    }
  }
}
