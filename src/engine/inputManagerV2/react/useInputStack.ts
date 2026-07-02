import { useEffect, useState } from 'react';
import { inputManager } from '../inputManager';
import type { InputLayer } from '../types';

/**
 * Purely observational: re-renders the calling component whenever the
 * layer stack changes. Useful for a debug HUD, or for dimming a
 * background whenever "any modal is open" (`stack.length > 0`).
 *
 * Not part of the dispatch path — dispatch happens synchronously inside
 * InputManager regardless of whether anything is subscribed here. Delete
 * every usage of this hook and app behavior does not change; you'd only
 * lose the ability to *display* the stack.
 */
export function useInputStack(): readonly InputLayer[] {
  const [stack, setStack] = useState<readonly InputLayer[]>([]);
  useEffect(() => inputManager.subscribeToStack(setStack), []);
  return stack;
}
