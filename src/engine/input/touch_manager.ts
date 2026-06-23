import type { InputState } from './keyboard_input';
import { uiRegistry } from './uiRegistry';

export function createTouchManager(
  canvas: HTMLCanvasElement,
  state: InputState,
  onTap: (clientX: number, clientY: number) => void,
) {
  let startX = 0;
  let startY = 0;

  function handleTouchStart(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    startX = touch.clientX;
    startY = touch.clientY;
  }

  function handleTouchEnd(e: TouchEvent) {
    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaY = startY - touch.clientY;
    const deltaX = startX - touch.clientX;
    const isSwipe = Math.abs(deltaY) > 12 || Math.abs(deltaX) > 12;

    if (isSwipe) {
      uiRegistry.processCanvasScroll(canvas, touch.clientX, touch.clientY, deltaY);
    } else {
      onTap(touch.clientX, touch.clientY);
    }
  }

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

  return {
    destroy() {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    },
  };
}
