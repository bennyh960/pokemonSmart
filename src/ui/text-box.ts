/**
 * TextBox - GBA-style text box with typewriter effect.
 *
 * Renders at bottom of screen. Supports RTL for Hebrew.
 * Reveals text character-by-character. ENTER to advance or skip.
 */

import type { InputManager } from '../engine/input';
import { fillRect, drawText, drawRect } from '../engine/renderer.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
import { fontFor } from '../engine/fonts.js';
const BOX_H = 36;
const BOX_Y = SCREEN_H - BOX_H;
const TEXT_X = 8;
const TEXT_Y = BOX_Y + 6;
const CHARS_PER_SECOND = 30;

export interface TextBoxState {
  lines: string[];
  currentLine: number;
  revealedChars: number;
  timer: number;
  done: boolean;
  isRtl: boolean;
  waitingForInput: boolean;
  speakerName?: string;
}

/** Create a text box with an array of lines to display. */
export function createTextBox(lines: string[], rtl = false, speakerName?: string): TextBoxState {
  return {
    lines,
    currentLine: 0,
    revealedChars: 0,
    timer: 0,
    done: false,
    isRtl: rtl,
    waitingForInput: false,
    speakerName,
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

const NAME_PAD_X = 6;
const NAME_PAD_Y = 3;
const NAME_FONT_SIZE = 8;
const NAME_TAB_H = NAME_FONT_SIZE + NAME_PAD_Y * 2;

/** Render the text box. */
export function renderTextBox(ctx: CanvasRenderingContext2D, state: TextBoxState): void {
  if (state.done) return;

  // ── Speaker nameplate (tab above box) ──
  if (state.speakerName) {
    // Measure with the actual font so the tab fits the text exactly
    ctx.save();
    ctx.font = `${NAME_FONT_SIZE}px ${fontFor(state.speakerName)}`;
    const measured = Math.ceil(ctx.measureText(state.speakerName).width);
    ctx.restore();
    const nameW = Math.min(measured + NAME_PAD_X * 2, SCREEN_W - 8);
    const tabX = state.isRtl ? SCREEN_W - nameW - 4 : 4;
    const tabY = BOX_Y - NAME_TAB_H;
    fillRect(ctx, tabX, tabY, nameW, NAME_TAB_H + 2, '#181820');
    drawRect(ctx, tabX, tabY, nameW, NAME_TAB_H, '#585858');
    drawRect(ctx, tabX - 1, tabY - 1, nameW + 2, NAME_TAB_H + 1, '#383848');
    drawText(ctx, state.speakerName, state.isRtl ? tabX + nameW - NAME_PAD_X : tabX + NAME_PAD_X, tabY + NAME_PAD_Y, {
      size: NAME_FONT_SIZE,
      color: '#ffe878',
      direction: state.isRtl ? 'rtl' : 'ltr',
      align: state.isRtl ? 'right' : 'left',
    });
  }

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
