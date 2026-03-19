/**
 * InputManager - Handles keyboard and basic touch input.
 *
 * Tracks key states per-frame to distinguish between
 * "key is held down" vs "key was just pressed this frame".
 * Captures number key input for math answer entry.
 */

/** Input state snapshot for the current frame. */
interface InputState {
  keysDown: Set<string>;
  keysPressed: Set<string>;
  numberBuffer: string;
  tapDetected: boolean;
  tapPosition: { x: number; y: number } | null;
}

/** Creates and returns an InputManager bound to the given canvas. */
export function createInputManager(canvas: HTMLCanvasElement) {
  const state: InputState = {
    keysDown: new Set(),
    keysPressed: new Set(),
    numberBuffer: '',
    tapDetected: false,
    tapPosition: null,
  };

  /** Game keys that should prevent default browser behavior. */
  const PREVENTED_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '];

  function handleKeyDown(e: KeyboardEvent): void {
    const { key } = e;

    if (!state.keysDown.has(key)) {
      state.keysPressed.add(key);
    }
    state.keysDown.add(key);

    if (key >= '0' && key <= '9') {
      state.numberBuffer += key;
    }

    if (key === 'Backspace' && state.numberBuffer.length > 0) {
      state.numberBuffer = state.numberBuffer.slice(0, -1);
    }

    if (PREVENTED_KEYS.includes(key)) {
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent): void {
    state.keysDown.delete(e.key);
  }

  function handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    if (touch) {
      state.tapDetected = true;
      state.tapPosition = { x: touch.clientX, y: touch.clientY };
    }
  }

  function handleClick(e: MouseEvent): void {
    state.tapDetected = true;
    state.tapPosition = { x: e.clientX, y: e.clientY };
  }

  // Bind event listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('click', handleClick);

  return {
    /** Returns true if the key is currently held down. */
    isKeyDown(key: string): boolean {
      return state.keysDown.has(key);
    },

    /** Returns true only on the first frame the key is pressed. */
    isKeyPressed(key: string): boolean {
      return state.keysPressed.has(key);
    },

    /** Returns the current number input buffer (digits typed so far). */
    getNumberInput(): string {
      return state.numberBuffer;
    },

    /** Clears the number input buffer (call after submitting an answer). */
    clearNumberInput(): void {
      state.numberBuffer = '';
    },

    /** Returns true if a tap/click happened this frame. */
    isTapped(): boolean {
      return state.tapDetected;
    },

    /** Returns the position of the last tap, or null. */
    getTapPosition(): { x: number; y: number } | null {
      return state.tapPosition;
    },

    /** Call at the END of each frame to reset single-frame states. */
    endFrame(): void {
      state.keysPressed.clear();
      state.tapDetected = false;
      state.tapPosition = null;
    },

    /** Remove all event listeners (cleanup). */
    destroy(): void {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('click', handleClick);
    },
  };
}

/** The return type of createInputManager, for use in type annotations. */
export type InputManager = ReturnType<typeof createInputManager>;
