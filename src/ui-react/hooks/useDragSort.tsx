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
      const next = [...items];
      const [moved] = next.splice(dragIndex.current, 1);
      next.splice(i, 0, moved);
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
