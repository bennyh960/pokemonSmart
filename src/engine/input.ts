/**
 * InputManager - Handles keyboard and basic touch input.
 *
 * Tracks key states per-frame to distinguish between
 * "key is held down" vs "key was just pressed this frame".
 *
 * Uses e.code (physical key position) for game controls so they work
 * regardless of keyboard layout (e.g. Hebrew). Uses e.key for special
 * keys (Enter, Escape, arrows) and number input.
 */

/** Input state snapshot for the current frame. */
interface InputState {
  /** Physical keys currently held (e.code values, e.g. 'KeyP', 'ArrowUp'). */
  keysDown: Set<string>;
  /** Physical keys pressed this frame only (e.code values). */
  keysPressed: Set<string>;
  numberBuffer: string;
  tapDetected: boolean;
  tapPosition: { x: number; y: number } | null;
}

/**
 * Maps legacy key strings to physical code strings.
 * Callers can use either 'p'/'P' (old style) or 'KeyP' (new style) —
 * this map normalizes old-style calls to physical codes.
 */
const KEY_TO_CODE: Record<string, string> = {
  // Letters (both cases map to same code)
  'a': 'KeyA', 'A': 'KeyA', 'b': 'KeyB', 'B': 'KeyB',
  'c': 'KeyC', 'C': 'KeyC', 'd': 'KeyD', 'D': 'KeyD',
  'e': 'KeyE', 'E': 'KeyE', 'f': 'KeyF', 'F': 'KeyF',
  'g': 'KeyG', 'G': 'KeyG', 'h': 'KeyH', 'H': 'KeyH',
  'i': 'KeyI', 'I': 'KeyI', 'j': 'KeyJ', 'J': 'KeyJ',
  'k': 'KeyK', 'K': 'KeyK', 'l': 'KeyL', 'L': 'KeyL',
  'm': 'KeyM', 'M': 'KeyM', 'n': 'KeyN', 'N': 'KeyN',
  'o': 'KeyO', 'O': 'KeyO', 'p': 'KeyP', 'P': 'KeyP',
  'q': 'KeyQ', 'Q': 'KeyQ', 'r': 'KeyR', 'R': 'KeyR',
  's': 'KeyS', 'S': 'KeyS', 't': 'KeyT', 'T': 'KeyT',
  'u': 'KeyU', 'U': 'KeyU', 'v': 'KeyV', 'V': 'KeyV',
  'w': 'KeyW', 'W': 'KeyW', 'x': 'KeyX', 'X': 'KeyX',
  'y': 'KeyY', 'Y': 'KeyY', 'z': 'KeyZ', 'Z': 'KeyZ',
  // Digits
  '0': 'Digit0', '1': 'Digit1', '2': 'Digit2', '3': 'Digit3',
  '4': 'Digit4', '5': 'Digit5', '6': 'Digit6', '7': 'Digit7',
  '8': 'Digit8', '9': 'Digit9',
  // Special keys (already match e.code or e.key — pass through)
  ' ': 'Space', 'Tab': 'Tab', 'Escape': 'Escape',
  'Enter': 'Enter', 'Backspace': 'Backspace',
  'ArrowUp': 'ArrowUp', 'ArrowDown': 'ArrowDown',
  'ArrowLeft': 'ArrowLeft', 'ArrowRight': 'ArrowRight',
};

/** Normalize a key query to its physical code. */
function toCode(key: string): string {
  return KEY_TO_CODE[key] ?? key;
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

  /** Physical codes that should prevent default browser behavior. */
  const PREVENTED_CODES = new Set([
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space',
  ]);

  function handleKeyDown(e: KeyboardEvent): void {
    const code = e.code;

    if (!state.keysDown.has(code)) {
      state.keysPressed.add(code);
    }
    state.keysDown.add(code);

    // Number buffer uses e.key so it works with any layout
    const { key } = e;
    if (key >= '0' && key <= '9') {
      state.numberBuffer += key;
    }

    if (key === 'Backspace' && state.numberBuffer.length > 0) {
      state.numberBuffer = state.numberBuffer.slice(0, -1);
    }

    if (PREVENTED_CODES.has(code)) {
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent): void {
    state.keysDown.delete(e.code);
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
    /** Returns true if the key is currently held down. Accepts key char ('p') or code ('KeyP'). */
    isKeyDown(key: string): boolean {
      return state.keysDown.has(toCode(key));
    },

    /** Returns true only on the first frame the key is pressed. Accepts key char ('p') or code ('KeyP'). */
    isKeyPressed(key: string): boolean {
      return state.keysPressed.has(toCode(key));
    },

    /** Consume a key press so no other handler sees it this frame. */
    consumeKey(key: string): void {
      state.keysPressed.delete(toCode(key));
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
