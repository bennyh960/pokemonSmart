import { toCode, createKeyboardInput, type InputState } from './keyboard_input';
import { createClickManager } from './click_manager';
import { createTouchManager } from './touch_manager';
import { createScrollManager } from './scroll_manager';

export function createInputManager(canvas: HTMLCanvasElement) {
  // Single state object shared across all sub-managers.
  //
  // Virtual keys are split into two sets with DIFFERENT lifetimes:
  //   - virtualDownSticky: held controls (touch d-pad). Persist until an
  //     explicit releaseVirtualKey (touchend/mouseup). NOT cleared per frame,
  //     so a held button produces continuous movement — same as a physical key.
  //   - virtualDownMomentary: one-shot controls (region onSelect taps / menu
  //     clicks). Auto-released at endFrame, because a click has no "up" event
  //     that could map to releaseVirtualKey.
  const state: InputState = {
    keysDown: new Set(),
    keysPressed: new Set(),
    virtualDownSticky: new Set(),
    virtualDownMomentary: new Set(),
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
    /**
     * Press and HOLD a virtual key. Stays down until releaseVirtualKey.
     * Use for physical touch buttons that have a real press/release lifecycle
     * (the d-pad, A/B, etc.), wired from VirtualControls.
     */
    pressVirtualKey(key: string): void {
      const code = toCode(key);
      if (!state.virtualDownSticky.has(code)) {
        state.virtualPressed.add(code);
      }
      state.virtualDownSticky.add(code);
    },

    releaseVirtualKey(key: string): void {
      state.virtualDownSticky.delete(toCode(key));
    },

    /**
     * Fire a virtual key for a SINGLE frame, then auto-release at endFrame.
     * Use for menu / region onSelect handlers (a click has no matching "up").
     * This is the correct call for uiRegistry onSelect callbacks — NOT
     * pressVirtualKey, which would stay stuck down with no release event.
     */
    tapVirtualKey(key: string): void {
      const code = toCode(key);
      if (!state.virtualDownMomentary.has(code)) {
        state.virtualPressed.add(code);
      }
      state.virtualDownMomentary.add(code);
    },

    injectNumberBuffer(numStr: string): void {
      if (numStr >= '0' && numStr <= '9') {
        state.numberBuffer += numStr;
      }
    },

    isKeyDown(key: string): boolean {
      const code = toCode(key);
      return state.keysDown.has(code) || state.virtualDownSticky.has(code) || state.virtualDownMomentary.has(code);
    },

    isKeyPressed(key: string): boolean {
      const code = toCode(key);
      return state.keysPressed.has(code) || state.virtualPressed.has(code);
    },

    consumeKey(key: string): void {
      const code = toCode(key);
      state.keysPressed.delete(code);
      state.virtualPressed.delete(code);
      // Also drop a momentary tap so a consumed press can't leak into an
      // isKeyDown check later in the same frame. Sticky (held) keys are left
      // alone — you can't "consume" a button the user is still physically holding.
      state.virtualDownMomentary.delete(code);
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
      state.virtualDownMomentary.clear();
      // NOTE: virtualDownSticky is intentionally NOT cleared here. Held touch
      // buttons stay down until releaseVirtualKey fires (touchend/mouseup),
      // mirroring how keysDown persists until a real keyup.
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
