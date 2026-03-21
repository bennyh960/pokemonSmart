/**
 * TextBox - GBA-style text box with typewriter effect.
 *
 * Renders at bottom of screen. Supports RTL for Hebrew.
 * Reveals text character-by-character. ENTER to advance or skip.
 */

import type { InputManager } from '../engine/input.js';
import { fillRect, drawText, drawRect } from '../engine/renderer.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
const BOX_H = 36;
const BOX_Y = SCREEN_H - BOX_H;
const TEXT_X = 8;
const TEXT_Y = BOX_Y + 6;
const CHARS_PER_SECOND = 30;

interface TextBoxState {
  lines: string[];
  currentLine: number;
  revealedChars: number;
  timer: number;
  done: boolean;
  isRtl: boolean;
  waitingForInput: boolean;
}

/** Create a text box with an array of lines to display. */
export function createTextBox(lines: string[], rtl = false): TextBoxState {
  return {
    lines,
    currentLine: 0,
    revealedChars: 0,
    timer: 0,
    done: false,
    isRtl: rtl,
    waitingForInput: false,
  };
}

/** Update the text box. Returns true when all text is dismissed. */
export function updateTextBox(state: TextBoxState, input: InputManager, dt: number): boolean {
  if (state.done) return true;

  const line = state.lines[state.currentLine] || '';

  if (state.waitingForInput) {
    if (input.isKeyPressed('Enter') || input.isKeyPressed(' ') || input.isTapped()) {
      state.currentLine++;
      if (state.currentLine >= state.lines.length) {
        state.done = true;
        return true;
      }
      state.revealedChars = 0;
      state.timer = 0;
      state.waitingForInput = false;
    }
    return false;
  }

  // Typewriter effect
  state.timer += dt;
  state.revealedChars = Math.floor(state.timer * CHARS_PER_SECOND);

  // Skip on press
  if (input.isKeyPressed('Enter') || input.isKeyPressed(' ') || input.isTapped()) {
    state.revealedChars = line.length;
  }

  if (state.revealedChars >= line.length) {
    state.revealedChars = line.length;
    state.waitingForInput = true;
  }

  return false;
}

/** Render the text box. */
export function renderTextBox(ctx: CanvasRenderingContext2D, state: TextBoxState): void {
  if (state.done) return;

  // Box background
  fillRect(ctx, 0, BOX_Y, SCREEN_W, BOX_H, '#181820');
  drawRect(ctx, 1, BOX_Y + 1, SCREEN_W - 2, BOX_H - 2, '#585858');
  drawRect(ctx, 0, BOX_Y, SCREEN_W, BOX_H, '#383848');

  const line = state.lines[state.currentLine] || '';
  const visible = line.slice(0, state.revealedChars);

  drawText(ctx, visible, state.isRtl ? SCREEN_W - TEXT_X : TEXT_X, TEXT_Y, {
    size: 8,
    color: '#f8f8f8',
    direction: state.isRtl ? 'rtl' : 'ltr',
    align: state.isRtl ? 'right' : 'left',
    maxWidth: SCREEN_W - TEXT_X * 2,
    lineHeight: 12,
  });

  // Blinking continue arrow
  if (state.waitingForInput) {
    const blink = Math.floor(Date.now() / 400) % 2 === 0;
    if (blink) {
      drawText(ctx, '\u25bc', SCREEN_W - 12, BOX_Y + BOX_H - 10, {
        size: 8,
        color: '#f8f8f8',
      });
    }
  }
}
