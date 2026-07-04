import { toCode, createKeyboardInput, type InputState } from './keyboard_input';
import { createClickManager } from './click_manager';
import { createTouchManager } from './touch_manager';
import { createScrollManager } from './scroll_manager';
import { createLayerStack } from './layer_stack';
import { isTouchPrimaryDevice } from './device';
import { createVirtualControls, type VirtualControlSpec } from './virtualControls';
import type { InputLayer } from './react/types';

export interface CreateInputManagerOptions {
  /**
   * If provided, the manager also owns the on-screen touch-button overlay
   * (virtual_controls.ts) and mounts it into this element. Omit this if a
   * game has no touch overlay — the manager works fine without it.
   */
  touchContainer?: HTMLElement;
}

/**
 * The one input manager, with two faces sharing v1's single keyboard:
 *
 *   - POLL face  (canvas): isKeyDown / endFrame / ... read each frame.
 *   - LAYER face (React):  push(layer) -> unsubscribe, via getInput().
 *
 * Creating the manager IS setting it up: it registers itself as the active
 * instance (so React's getInput() can reach it) and, if a touchContainer is
 * given, owns the virtual touch-button overlay too. destroy() reverses all
 * of it. This means game.ts has exactly ONE call to make, not four.
 *
 * The layer logic itself lives in layer_stack.ts (pure). This file just
 * COMPOSES the sub-managers and points the keyboard at the stack.
 */
export function createInputManager(canvas: HTMLCanvasElement, options: CreateInputManagerOptions = {}) {
  const state: InputState = {
    keysDown: new Set(),
    keysPressed: new Set(),
    virtualDownSticky: new Set(),
    virtualDownMomentary: new Set(),
    virtualPressed: new Set(),
    numberBuffer: '',
    textBuffer: '',
    tapDetected: false,
    tapPosition: null,
  };

  // React-facing layer stack (keyboard trigger -> action). Pure; see layer_stack.ts.
  const layerStack = createLayerStack();

  // v1's single keyboard handler fills poll-state AND, on a fresh press, drives
  // the React layers. If a layer consumed the key, prevent the browser default.
  const keyboard = createKeyboardInput(state, (code, e) => {
    const fired = layerStack.dispatchKey(code, {
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey,
    });
    if (fired) e.preventDefault();
  });

  const click = createClickManager(canvas, state);
  const touch = createTouchManager(canvas, state, click.onInteraction);
  const scroll = createScrollManager(canvas);

  const manager = {
    // ================= POLL FACE (canvas) =================
    pressVirtualKey(key: string): void {
      const code = toCode(key);
      if (!state.virtualDownSticky.has(code)) {
        state.virtualPressed.add(code);
      }
      state.virtualDownSticky.add(code);
    },

    releaseVirtualKey(key: string): void {
      state.virtualDownSticky.delete(toCode(key));
    },

    tapVirtualKey(key: string): void {
      const code = toCode(key);
      if (!state.virtualDownMomentary.has(code)) {
        state.virtualPressed.add(code);
      }
      state.virtualDownMomentary.add(code);
    },

    injectNumberBuffer(numStr: string): void {
      if (numStr >= '0' && numStr <= '9') {
        state.numberBuffer += numStr;
      }
    },

    isKeyDown(key: string): boolean {
      const code = toCode(key);
      return state.keysDown.has(code) || state.virtualDownSticky.has(code) || state.virtualDownMomentary.has(code);
    },

    isKeyPressed(key: string): boolean {
      const code = toCode(key);
      return state.keysPressed.has(code) || state.virtualPressed.has(code);
    },

    consumeKey(key: string): void {
      const code = toCode(key);
      state.keysPressed.delete(code);
      state.virtualPressed.delete(code);
      state.virtualDownMomentary.delete(code);
    },

    getNumberInput(): string {
      return state.numberBuffer;
    },

    clearNumberInput(): void {
      state.numberBuffer = '';
    },

    getTextInput(): string {
      return state.textBuffer;
    },

    clearTextInput(): void {
      state.textBuffer = '';
    },

    isTapped(): boolean {
      return state.tapDetected;
    },

    getTapPosition(): { x: number; y: number } | null {
      return state.tapPosition;
    },

    endFrame(): void {
      state.keysPressed.clear();
      state.textBuffer = '';
      state.tapDetected = false;
      state.tapPosition = null;
      state.virtualPressed.clear();
      state.virtualDownMomentary.clear();
      // virtualDownSticky intentionally NOT cleared -- held touch buttons stay
      // down until releaseVirtualKey, mirroring physical keysDown.
    },

    // ================= TOUCH OVERLAY (optional) =================
    /**
     * Apply the active scene's virtual-button layout. No-op if this manager
     * was created without a touchContainer. Call from setOnTransition.
     */
    applyVirtualLayout(specs?: VirtualControlSpec[]): void {
      virtualControls?.applyLayout(specs);
    },

    // ================= LAYER FACE (React) =================
    /** Push a React input layer; returns an unsubscribe. Used by useInputLayer. */
    push(layer: InputLayer): () => void {
      return layerStack.push(layer);
    },

    /** Safety net (e.g. hard scene change). Layers also self-pop on unmount. */
    clearStack(): void {
      layerStack.clear();
    },

    // ================= lifecycle =================
    destroy(): void {
      if (active === manager) active = null;
      virtualControls?.destroy();
      layerStack.clear();
      keyboard.destroy();
      click.destroy();
      touch.destroy();
      scroll.destroy();
    },
  };

  // Optional touch overlay, created AFTER `manager` exists so it can call
  // manager.pressVirtualKey/releaseVirtualKey internally.
  //
  // Gated on isTouchPrimaryDevice(), checked ONCE here, not just on whether a
  // container was passed. A mouse/keyboard machine gets no overlay DOM at all,
  // regardless of what any scene declares via virtualControls — applyVirtualLayout
  // becomes a no-op below. This overlay exists purely to mimic keyboard/click
  // input for devices that lack them, so there's no case where it should show
  // on a device that already has a precise pointer + keyboard.

  const virtualControls =
    options.touchContainer && isTouchPrimaryDevice() ? createVirtualControls(manager, options.touchContainer) : null;

  // Register as the one active instance so React's getInput() can reach it.
  // (See accessor below. Creating the manager IS activating it.)
  active = manager;

  return manager;
}

export type InputManager = ReturnType<typeof createInputManager>;

// ---- Module accessor: how React reaches the one active instance ----------
// Set automatically by createInputManager; cleared automatically by destroy().
// game.ts never touches this directly. React components (via useInputLayer)
// call getInput() at effect time -- always after the game has started -- so
// the guard below should never fire in practice.
let active: InputManager | null = null;

export function getInput(): InputManager {
  if (!active) {
    throw new Error('Input manager not initialized -- createInputManager must run before getInput() is called.');
  }
  return active;
}
