import type { InputLayer, KeyBinding } from './react/types';

/**
 * layer_stack.ts — the pure, framework-agnostic core of the layer system.
 *
 * It knows nothing about React, the DOM, or the canvas. It just holds an
 * ordered list of layers and answers one question: "given a trigger, which
 * layer's action (if any) fires?" — by walking from the TOP layer down.
 *
 * This is the entire "layer" idea, isolated so it's easy to read and test:
 *   - push(layer)  → add on top, get an unsubscribe back
 *   - dispatchKey  → resolve a keypress to an action on the top-most layer
 *                    that binds it; respect blocksLowerLayers (modal opacity)
 *
 * The TRIGGER→ACTION split lives here: a key + modifiers is the trigger, a
 * binding turns it into an action string, and the layer's onAction receives it.
 */

export interface KeyModifiers {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

/**
 * A binding matches only on an EXACT modifier match: a binding that doesn't
 * mention ctrl requires ctrl to be UP. So `{ code: 'KeyL' }` fires on plain L,
 * not on Ctrl+L, and `{ code: 'KeyS', ctrl: true }` fires only on Ctrl+S. This
 * is the least surprising rule; flip a comparison here if you ever want
 * "don't care" semantics instead.
 */
function bindingMatches(b: KeyBinding, code: string, mods: KeyModifiers): boolean {
  return (
    b.code === code &&
    !!b.ctrl === mods.ctrl &&
    !!b.shift === mods.shift &&
    !!b.alt === mods.alt &&
    !!b.meta === mods.meta
  );
}

export function createLayerStack() {
  const layers: InputLayer[] = [];

  return {
    /** Add a layer on top. Returns an unsubscribe that removes exactly this layer. */
    push(layer: InputLayer): () => void {
      layers.push(layer);
      return () => {
        const i = layers.indexOf(layer);
        if (i !== -1) layers.splice(i, 1);
      };
    },

    clear(): void {
      layers.length = 0;
    },

    /**
     * Resolve a fresh keypress against the stack, top-down.
     * Returns true if an action fired (so the caller can preventDefault).
     *
     * - First layer with a matching binding wins: its onAction is called, stop.
     * - A layer with blocksLowerLayers stops the walk even with no match, so
     *   nothing beneath it hears the key ("modal opacity"). No action fired,
     *   so we return false and the caller leaves the browser default alone.
     */
    dispatchKey(code: string, mods: KeyModifiers): boolean {
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        const binding = layer.keyBindings?.find((b) => bindingMatches(b, code, mods));
        if (binding) {
          layer.onAction(binding.action, { source: 'keyboard' });
          return true;
        }
        if (layer.blocksLowerLayers) return false;
      }
      return false;
    },

    /** For debug/introspection only. */
    get size(): number {
      return layers.length;
    },
  };
}

export type LayerStack = ReturnType<typeof createLayerStack>;
