import { useEffect, useRef } from 'react';
import { inputManager } from '../inputManager';
import type { InputActionEvent, KeyBinding, PointerHitTest, InputLayer } from '../types';

export interface UseInputLayerOptions {
  id: string;
  name: string;
  keyBindings?: readonly KeyBinding[];
  hitTest?: PointerHitTest;
  blocksLowerLayers?: boolean;
  onAction: (action: string, event: InputActionEvent) => void;
  /**
   * Only push the layer while true. Toggle this from state that already
   * exists (e.g. `active: screen === 'gameplay'`), rather than
   * conditionally calling this hook itself — hooks must be called
   * unconditionally, same as any other React hook.
   */
  active?: boolean;
}

/**
 * Pushes a layer onto the shared InputManager for as long as the calling
 * component is mounted and `active` is true; pops it automatically on
 * unmount or when `active` becomes false.
 *
 * This is the entire integration point between React and the input
 * system — the manager itself has zero React dependency, so the exact
 * same layer concept works from a canvas scene class with no hook at all
 * (call `inputManager.push(...)` / the returned unsubscribe directly).
 */
export function useInputLayer(options: UseInputLayerOptions): void {
  const { id, name, keyBindings, hitTest, blocksLowerLayers, active = true } = options;

  // onAction is read through a ref so callers can pass an inline arrow
  // function without it forcing a push/pop cycle on every render.
  const onActionRef = useRef(options.onAction);
  onActionRef.current = options.onAction;

  useEffect(() => {
    if (!active) return;

    const layer: InputLayer = {
      id,
      name,
      keyBindings,
      hitTest,
      blocksLowerLayers,
      onAction: (action, event) => onActionRef.current(action, event),
    };

    return inputManager.push(layer);

    // Only id/active are dependencies on purpose: keyBindings/hitTest are
    // expected to be stable references (defined at module scope, or
    // memoized) rather than re-created inline every render. If they
    // change identity every render, this effect intentionally does NOT
    // re-push on every keystroke of unrelated state — that would be a
    // performance smell, not a correctness requirement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, active]);
}
