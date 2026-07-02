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

//#region Helpers

type ListenerRecord = {
  keys: Set<string>;
  handler: (event: KeyboardEvent) => void;
  priority: number;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

const globalListeners: ListenerRecord[] = [];

const isMatchingEvent = (listener: ListenerRecord, event: KeyboardEvent): boolean => {
  const isKeyMatch = listener.keys.has(event.key.toLowerCase()) || listener.keys.has(event.key);
  if (!isKeyMatch) return false;

  return event.ctrlKey === listener.ctrlKey && event.shiftKey === listener.shiftKey && event.altKey === listener.altKey;
};

const handleGlobalKeyDown = (event: KeyboardEvent) => {
  const matchingListeners = globalListeners.filter((listener) => isMatchingEvent(listener, event));

  if (matchingListeners.length === 0) return;

  matchingListeners.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return globalListeners.indexOf(b) - globalListeners.indexOf(a);
  });

  const topListener = matchingListeners[0];
  topListener.handler(event);
};

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleGlobalKeyDown);
}

//#endregion Helpers

interface UseKeyPressOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  allowRepeat?: boolean;
  priority?: number; // ככל שהמספר גבוה יותר, הליסנר ירוץ קודם
}

/**
 * @deprecated useInputLayer instead for more advanced input handling
 */
export function useKeyPress(
  keys: string | string[],
  callback: (event: KeyboardEvent) => void,
  { enabled = true, preventDefault = false, allowRepeat = false, priority = 0 }: UseKeyPressOptions = {},
) {
  useEffect(() => {
    if (!enabled) return;

    // עיבוד המקשים: הפיכה למערך, ניקוי רווחים והפרדת מקשי עזר
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const keySet = new Set<string>();

    let ctrlKey = false;
    let shiftKey = false;
    let altKey = false;

    keyArray.forEach((keyString) => {
      const parts = keyString.split('+').map((p) => p.trim());

      parts.forEach((part) => {
        const lowerPart = part.toLowerCase();
        if (lowerPart === 'ctrl' || lowerPart === 'control') ctrlKey = true;
        else if (lowerPart === 'shift') shiftKey = true;
        else if (lowerPart === 'alt') altKey = true;
        else {
          // שומרים גם את המקש המקורי וגם ב-lowercase למניעת בעיות אותיות
          keySet.add(part);
          keySet.add(lowerPart);
        }
      });
    });

    if (import.meta.env.MODE === 'development') {
      const isDuplicate = globalListeners.some((listener) => {
        const hasSamePriority = listener.priority === priority;
        const hasSameModifiers =
          listener.ctrlKey === ctrlKey && listener.shiftKey === shiftKey && listener.altKey === altKey;
        const hasOverlapKey = [...keySet].some((k) => listener.keys.has(k));

        return hasSamePriority && hasSameModifiers && hasOverlapKey;
      });

      if (isDuplicate) {
        console.warn(
          `[useKeyPress Warning]: זוהה רישום כפול למקש "${keyArray.join(', ')}" באותה רמת עדיפות (${priority}). ` +
            `זה עלול לגרום להתנגשויות בממשק. מומלץ להשתמש ב-priority שונה או לכבות זמנית בעזרת פרופ 'enabled'.`,
        );
      }
    }

    const handler = (event: KeyboardEvent) => {
      if (!allowRepeat && event.repeat) return;
      if (preventDefault) event.preventDefault();

      callback(event);
    };

    const record: ListenerRecord = {
      keys: keySet,
      handler,
      priority,
      ctrlKey,
      shiftKey,
      altKey,
    };

    // הוספה למחסנית
    globalListeners.push(record);

    // פונקציית קלין-אפ אוטומטית כשהקומפוננטה יורדת או משתנה
    return () => {
      const index = globalListeners.indexOf(record);
      if (index !== -1) {
        globalListeners.splice(index, 1);
      }
    };
  }, [keys, callback, enabled, preventDefault, allowRepeat, priority]);
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
