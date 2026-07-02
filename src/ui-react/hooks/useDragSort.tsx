// ─── useDragSort hook (reusable — used here and in MovesTab) ────────────────

import { useCallback, useRef } from 'react';

export function useDragSort<T>(items: T[], onReorder: (next: T[]) => void) {
  const dragIndex = useRef<number | null>(null);

  const onDragStart = useCallback((i: number) => {
    dragIndex.current = i;
  }, []);

  const onDragOver = useCallback(
    (e: React.DragEvent, i: number) => {
      e.preventDefault();
      if (dragIndex.current === null || dragIndex.current === i) return;
      // swap :
      const next = [...items];
      const temp = next[dragIndex.current];
      next[dragIndex.current] = next[i];
      next[i] = temp;
      dragIndex.current = i;

      onReorder(next);
    },
    [items, onReorder],
  );

  const onDragEnd = useCallback(() => {
    dragIndex.current = null;
  }, []);

  return { onDragStart, onDragOver, onDragEnd };
}
