/**
 * KeyboardInput - Handles keyboard input only.
 *
 * Tracks key states per-frame to distinguish between
 * "key is held down" vs "key was just pressed this frame".
 *
 * Uses e.code (physical key position) for game controls so they work
 * regardless of keyboard layout (e.g. Hebrew). Uses e.key for special
 * keys (Enter, Escape, arrows) and number input.
 */

export interface InputState {
  keysDown: Set<string>;
  keysPressed: Set<string>;
  /** Held virtual keys (touch d-pad). Persist until releaseVirtualKey — NOT cleared per frame. */
  virtualDownSticky: Set<string>;
  /** One-shot virtual keys (region onSelect / menu clicks). Cleared every endFrame. */
  virtualDownMomentary: Set<string>;
  virtualPressed: Set<string>;
  numberBuffer: string;
  textBuffer: string;
  tapDetected: boolean;
  tapPosition: { x: number; y: number } | null;
}

/** Input state snapshot for the current frame. */

const KEY_TO_CODE: Record<string, string> = {
  a: 'KeyA',
  A: 'KeyA',
  b: 'KeyB',
  B: 'KeyB',
  c: 'KeyC',
  C: 'KeyC',
  d: 'KeyD',
  D: 'KeyD',
  e: 'KeyE',
  E: 'KeyE',
  f: 'KeyF',
  F: 'KeyF',
  g: 'KeyG',
  G: 'KeyG',
  h: 'KeyH',
  H: 'KeyH',
  i: 'KeyI',
  I: 'KeyI',
  j: 'KeyJ',
  J: 'KeyJ',
  k: 'KeyK',
  K: 'KeyK',
  l: 'KeyL',
  L: 'KeyL',
  m: 'KeyM',
  M: 'KeyM',
  n: 'KeyN',
  N: 'KeyN',
  o: 'KeyO',
  O: 'KeyO',
  p: 'KeyP',
  P: 'KeyP',
  q: 'KeyQ',
  Q: 'KeyQ',
  r: 'KeyR',
  R: 'KeyR',
  s: 'KeyS',
  S: 'KeyS',
  t: 'KeyT',
  T: 'KeyT',
  u: 'KeyU',
  U: 'KeyU',
  v: 'KeyV',
  V: 'KeyV',
  w: 'KeyW',
  W: 'KeyW',
  x: 'KeyX',
  X: 'KeyX',
  y: 'KeyY',
  Y: 'KeyY',
  z: 'KeyZ',
  Z: 'KeyZ',
  '0': 'Digit0',
  '1': 'Digit1',
  '2': 'Digit2',
  '3': 'Digit3',
  '4': 'Digit4',
  '5': 'Digit5',
  '6': 'Digit6',
  '7': 'Digit7',
  '8': 'Digit8',
  '9': 'Digit9',
  ' ': 'Space',
  Tab: 'Tab',
  Escape: 'Escape',
  Enter: 'Enter',
  Backspace: 'Backspace',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
};

export function toCode(key: string): string {
  return KEY_TO_CODE[key] ?? key;
}

const PREVENTED_CODES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space']);

export function createKeyboardInput(state: InputState) {
  function handleKeyDown(e: KeyboardEvent): void {
    const code = e.code;
    if (!state.keysDown.has(code)) {
      state.keysPressed.add(code);
    }
    state.keysDown.add(code);

    const { key } = e;

    if (key >= '0' && key <= '9') {
      state.numberBuffer += key;
    }

    if (key === 'Backspace' && state.numberBuffer.length > 0) {
      state.numberBuffer = state.numberBuffer.slice(0, -1);
    }

    if (!e.ctrlKey && !e.metaKey && !e.altKey && key.length === 1) {
      state.textBuffer += key;
    }

    if (PREVENTED_CODES.has(code)) {
      e.preventDefault();
    }
  }

  function handleKeyUp(e: KeyboardEvent): void {
    state.keysDown.delete(e.code);
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return {
    destroy() {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    },
  };
}
