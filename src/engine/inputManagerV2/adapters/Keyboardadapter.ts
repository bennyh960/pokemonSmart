import type { InputManager } from '../inputManager';

/**
 * Attaches the ONE global keyboard listener pair for the entire app and
 * forwards every event into the shared InputManager.
 *
 * Call this exactly once, at app startup (or once per InputManager
 * instance, in tests). Do not call it per-component or per-scene — that
 * would recreate the exact "two managers racing each other" problem this
 * whole module exists to avoid.
 *
 * Capture phase is intentional: we want first look at every keydown
 * before it can be intercepted or stopPropagation()'d by unrelated DOM
 * handlers elsewhere in the tree.`
 */
export function attachKeyboardAdapter(manager: InputManager): () => void {
  const onKeyDown = (e: KeyboardEvent) => manager.handleKeyDown(e);
  const onKeyUp = (e: KeyboardEvent) => manager.handleKeyUp(e);

  window.addEventListener('keydown', onKeyDown, { capture: true });
  window.addEventListener('keyup', onKeyUp, { capture: true });

  return () => {
    window.removeEventListener('keydown', onKeyDown, { capture: true });
    window.removeEventListener('keyup', onKeyUp, { capture: true });
  };
}
