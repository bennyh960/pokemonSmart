import { useEffect, useRef } from 'react';
import { getInput } from '../input_manager'; // <-- your v1 input barrel (adjust path/alias)
import type { InputLayer, KeyBinding, PointerHitTest, InputActionEvent } from './types';

/**
 * useInputLayer — the React ⇆ input-system integration point.
 *
 * React already handles click/touch natively (onClick on real DOM elements),
 * so this hook exists for ONE thing: routing KEYBOARD input to the right React
 * component as semantic actions. While mounted and `active`, it pushes a layer
 * onto v1's shared manager; on unmount / active=false it pops automatically.
 *
 * The manager itself has zero React dependency — the exact same layer concept
 * works from a canvas scene by calling getInput().push(...) directly.
 *
 * `hitTest` is accepted for interface parity but is only meaningful for canvas
 * layers (the browser can't hit-test inside a <canvas>). For React UI, use a
 * normal onClick instead of hitTest.
 */
export interface UseInputLayerOptions {
  id: string;
  name: string;
  keyBindings?: readonly KeyBinding[];
  hitTest?: PointerHitTest;
  blocksLowerLayers?: boolean;
  onAction: (action: string, event: InputActionEvent) => void;
  /**
   * Only push the layer while true. Toggle this from state that already exists
   * (e.g. `active: screen === 'gameplay'`) rather than calling the hook
   * conditionally — hooks must run unconditionally, like any other React hook.
   */
  active?: boolean;
}

export function useInputLayer(options: UseInputLayerOptions): void {
  const { id, name, keyBindings, hitTest, blocksLowerLayers, active = true } = options;

  // onAction is read through a ref so callers can pass an inline arrow function
  // without it forcing a push/pop cycle on every render.
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

    // push() returns an unsubscribe — React runs it on cleanup (unmount or
    // when active flips false), so the layer pops itself. Nothing to manage.
    return getInput().push(layer);

    // Deps are [id, active] on purpose: keyBindings/hitTest are expected to be
    // stable references (module scope or memoized). If you build keyBindings
    // inline every render, this effect will NOT re-push on unrelated state
    // changes — a deliberate perf choice, not a correctness bug. If you truly
    // need bindings to change at runtime, give the layer a new `id`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, active]);
}
