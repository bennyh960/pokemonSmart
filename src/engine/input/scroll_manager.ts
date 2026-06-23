import { uiRegistry } from './uiRegistry';

export function createScrollManager(canvas: HTMLCanvasElement) {
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    uiRegistry.processCanvasScroll(canvas, e.clientX, e.clientY, e.deltaY);
  }

  canvas.addEventListener('wheel', handleWheel, { passive: false });

  return {
    destroy() {
      canvas.removeEventListener('wheel', handleWheel);
    },
  };
}
