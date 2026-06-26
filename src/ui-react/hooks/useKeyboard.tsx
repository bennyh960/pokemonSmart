import { useEffect } from 'react';

export type Key =
  | 'Escape'
  | 'Enter'
  | ' '
  | 'Tab'
  | 'Backspace'
  | 'Delete'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Home'
  | 'End'
  | 'PageUp'
  | 'PageDown'
  | 'Insert'
  | 'Shift'
  | 'Control'
  | 'Alt'
  | 'Meta'
  | 'CapsLock'
  | 'NumLock'
  | 'ScrollLock'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12'
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z'
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9';

type UseKeyPressOptions = {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  allowRepeat?: boolean;
};

export function useKeyPress(
  keys: Key | Key[],
  callback: (event: KeyboardEvent) => void,
  { enabled = true, preventDefault = false, stopPropagation = false, allowRepeat = false }: UseKeyPressOptions = {},
) {
  useEffect(() => {
    if (!enabled) return;

    const keySet = new Set(Array.isArray(keys) ? keys : [keys]);

    const handler = (event: KeyboardEvent) => {
      if (!keySet.has(event.key as Key)) return;
      if (!allowRepeat && event.repeat) return;

      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();

      callback(event);
    };

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [keys, callback, enabled, preventDefault, stopPropagation, allowRepeat]);
}

// usage examples:
// useKeyPress('Escape', onClose);

// Multiple keys:
// useKeyPress(['Escape', 'Enter'], (e) => {
//     if (e.key === 'Escape') onClose();
//     else onConfirm();
//   });

//   Temporarily disable:
// useKeyPress('Escape', onClose, {
//     enabled: isDialogOpen,
//   });

// Prevent browser default:
// useKeyPress('ArrowUp', moveUp, {
//     preventDefault: true,
//   });
