import { inputManager } from '../InputManager';

/**
 * Wires ANY HTMLElement — a React-rendered <button>, or one you built
 * with document.createElement — to press/release a virtual key on the
 * shared manager. This function IS the bridge between the two worlds:
 * there is exactly one implementation of "how a button becomes an input
 * source," and both the React component and the plain-DOM control pad
 * below call it. Neither one talks to the other; they both just talk to
 * this, and through it, to the one shared InputManager.
 */
export function attachVirtualButton(element: HTMLElement, code: string): () => void {
  let isPressed = false;

  const press = () => {
    if (isPressed) return;
    isPressed = true;
    inputManager.pressVirtualKey(code);
  };

  const release = () => {
    if (!isPressed) return;
    isPressed = false;
    inputManager.releaseVirtualKey(code);
  };

  // Prevents the browser's default touch scroll/zoom gestures from
  // interfering with rapid repeated presses on this element.
  element.style.touchAction = 'none';

  element.addEventListener('pointerdown', press);
  element.addEventListener('pointerup', release);
  element.addEventListener('pointerleave', release); // finger slides off without lifting
  element.addEventListener('pointercancel', release); // OS gesture interrupts the touch

  return () => {
    release(); // safety: don't leave a key permanently stuck if detached mid-press
    element.removeEventListener('pointerdown', press);
    element.removeEventListener('pointerup', release);
    element.removeEventListener('pointerleave', release);
    element.removeEventListener('pointercancel', release);
  };
}
