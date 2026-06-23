import { toCode, createKeyboardInput, type InputState } from './keyboard_input';
import { createClickManager } from './click_manager';
import { createTouchManager } from './touch_manager';
import { createScrollManager } from './scroll_manager';

export function createInputManager(canvas: HTMLCanvasElement) {
  // Single state object shared across all sub-managers
  const state: InputState = {
    keysDown: new Set(),
    keysPressed: new Set(),
    virtualDown: new Set(),
    virtualPressed: new Set(),
    numberBuffer: '',
    textBuffer: '',
    tapDetected: false,
    tapPosition: null,
  };

  // Wire up sub-managers
  const keyboard = createKeyboardInput(state);
  const click = createClickManager(canvas, state);
  const touch = createTouchManager(canvas, state, click.onInteraction);
  const scroll = createScrollManager(canvas);

  return {
    pressVirtualKey(key: string): void {
      const code = toCode(key);
      if (!state.virtualDown.has(code)) {
        state.virtualPressed.add(code);
      }
      state.virtualDown.add(code);
    },

    releaseVirtualKey(key: string): void {
      state.virtualDown.delete(toCode(key));
    },

    injectNumberBuffer(numStr: string): void {
      if (numStr >= '0' && numStr <= '9') {
        state.numberBuffer += numStr;
      }
    },

    isKeyDown(key: string): boolean {
      const code = toCode(key);
      return state.keysDown.has(code) || state.virtualDown.has(code);
    },

    isKeyPressed(key: string): boolean {
      const code = toCode(key);
      return state.keysPressed.has(code) || state.virtualPressed.has(code);
    },

    consumeKey(key: string): void {
      const code = toCode(key);
      state.keysPressed.delete(code);
      state.virtualPressed.delete(code);
    },

    getNumberInput(): string {
      return state.numberBuffer;
    },

    clearNumberInput(): void {
      state.numberBuffer = '';
    },

    getTextInput(): string {
      return state.textBuffer;
    },

    clearTextInput(): void {
      state.textBuffer = '';
    },

    isTapped(): boolean {
      return state.tapDetected;
    },

    getTapPosition(): { x: number; y: number } | null {
      return state.tapPosition;
    },

    endFrame(): void {
      state.keysPressed.clear();
      state.textBuffer = '';
      state.tapDetected = false;
      state.tapPosition = null;
      state.virtualPressed.clear();
      state.virtualDown.clear();
    },

    destroy(): void {
      keyboard.destroy();
      click.destroy();
      touch.destroy();
      scroll.destroy();
    },
  };
}

export type InputManager = ReturnType<typeof createInputManager>;
