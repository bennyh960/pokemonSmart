import type { InputManager } from '../InputManager';
import type { Point } from '../types';

/**
 * Attaches pointer handling — mouse, touch, and pen, unified — to a
 * single element. This is what you use for a <canvas> that draws its own
 * UI and therefore has no DOM structure for the browser to hit-test
 * against on its own.
 *
 * WHY POINTER EVENTS, NOT SEPARATE MOUSE/TOUCH LISTENERS
 * The Pointer Events API (`pointerdown`, `pointermove`, `pointerup`) is
 * the browser-native unification of mouse, touch, and stylus input into
 * one event model. `event.pointerType` tells you which device fired it,
 * if you need that for gesture disambiguation. Handling mouse and touch
 * as two separate code paths is legacy pre-2019 practice — Pointer
 * Events are supported in every evergreen browser and are the standard
 * approach in modern canvas/game libraries.
 *
 * WHEN NOT TO USE THIS
 * Do not attach this to ordinary DOM UI (a settings panel built from real
 * <button> elements, say). Native onClick already gets correct scoping
 * for free from the browser's own paint order — see README.md. This
 * adapter exists specifically for the case where that's unavailable.
 */
export function attachPointerAdapter(manager: InputManager, element: HTMLElement): () => void {
  const onPointerDown = (e: PointerEvent) => {
    const rect = element.getBoundingClientRect();
    const point: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    manager.handlePointerDown(point);
  };

  element.addEventListener('pointerdown', onPointerDown);

  return () => element.removeEventListener('pointerdown', onPointerDown);
}
