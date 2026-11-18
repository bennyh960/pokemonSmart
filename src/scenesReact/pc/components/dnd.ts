// src/scenesReact/pc/components/dnd.ts
import { useRef, type DragEvent } from 'react';

/** Drag & drop wiring for PC tiles. Keys look like "party:2", "box:17" or "tab:4". */
export interface DragHandlers {
  source: (key: string) => {
    onDragStart: (e: DragEvent) => void;
    onDragEnd: () => void;
  };
  target: (key: string) => {
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
}

/** The dragged key lives in a ref so it survives the re-renders the hover highlight causes. */
export function useDragHandlers(
  setDragOver: (key: string | null) => void,
  onDrop: (from: string, to: string) => void,
): DragHandlers {
  const draggingRef = useRef<string | null>(null);
  return {
    source: (key) => ({
      onDragStart: (e) => {
        draggingRef.current = key;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', key);
      },
      onDragEnd: () => {
        draggingRef.current = null;
        setDragOver(null);
      },
    }),
    target: (key) => ({
      onDragOver: (e) => {
        if (!draggingRef.current || draggingRef.current === key) return;
        e.preventDefault();
        setDragOver(key);
      },
      onDrop: (e) => {
        e.preventDefault();
        const from = draggingRef.current ?? e.dataTransfer.getData('text/plain');
        draggingRef.current = null;
        setDragOver(null);
        if (from && from !== key) onDrop(from, key);
      },
    }),
  };
}
