import type { HitTestResult, InputLayer, InputLogEntry, KeyBinding, Point } from './types';

/**
 * InputManager
 * ============
 *
 * The single authority for "who is allowed to react to input right now" —
 * for keyboard AND pointer (mouse, touch, pen, unified) alike.
 *
 * WHY A SINGLETON
 * Input is a genuinely global, cross-cutting resource: exactly one
 * keyboard and one pointer exist per tab, so exactly one thing should own
 * listening to them — the same reasoning that justifies a single Logger
 * or a single Router. Every screen, canvas scene, or React component
 * pushes/pops LAYERS onto this one instance instead of registering its
 * own private listeners. That discipline is load-bearing: if any part of
 * the app adds its own `window.addEventListener('keydown', ...)` on the
 * side, this manager's scoping guarantees stop applying to it. See
 * README.md for the concrete failure mode.
 *
 * PATTERNS USED (deliberately, not decoratively)
 *  - Observer:                subscribeToStack() lets UI re-render on stack change,
 *                              decoupled from the dispatch path itself.
 *  - Command:                 triggers resolve to named actions; layers never
 *                              receive raw DOM events to interpret themselves.
 *  - Chain of Responsibility: dispatch walks the stack top-down; the first
 *                              layer that can handle the event does, and an
 *                              "opaque" layer can stop the chain outright.
 */
export class InputManager {
  private readonly stack: InputLayer[] = [];
  private readonly heldKeys = new Set<string>();
  private readonly stackListeners = new Set<(stack: readonly InputLayer[]) => void>();
  private logHandler: ((entry: InputLogEntry) => void) | null = null;

  // ---------------------------------------------------------------------
  // Layer stack
  // ---------------------------------------------------------------------

  /** Push a layer onto the top of the stack. Returns a function that pops it. */
  push(layer: InputLayer): () => void {
    if (import.meta.env?.DEV && this.stack.some((l) => l.id === layer.id)) {
      // The most common real cause: a previous scene/component with the
      // same layer id never called its cleanup — a leaked layer from a
      // scene that thinks it already exited. Left unwarned, this is
      // exactly the class of bug per-scene manager instances were meant
      // to prevent, just happening silently instead of loudly.
      console.warn(
        `[InputManager] Layer id "${layer.id}" is being pushed while a layer with the ` +
          `same id is already in the stack. This usually means the previous owner of this ` +
          `id never called the unsubscribe function returned by push() — check for a missing ` +
          `pop() / scene exit() / effect cleanup.`,
      );
    }
    this.stack.push(layer);
    this.notifyStack();
    return () => this.pop(layer.id);
  }

  pop(id: string): void {
    const index = this.stack.findIndex((l) => l.id === id);
    if (index === -1) return;
    this.stack.splice(index, 1);
    this.notifyStack();
  }

  /**
   * Empties the entire stack, unconditionally. Call this exactly once, in
   * the state machine, on every scene transition — this is what
   * guarantees a leaked layer from a scene that forgot to clean up can
   * never survive into the next scene. This is the single place that
   * safety lives, instead of every scene author needing to get push/pop
   * exactly right.
   */
  clearStack(): void {
    this.stack.length = 0;
    this.notifyStack();
  }

  /** True only if `id` is both present AND currently sits on top of the stack. */
  isTopLayer(id: string): boolean {
    return this.stack[this.stack.length - 1]?.id === id;
  }

  /** Debug/UI observation only — never part of the dispatch decision itself. */
  subscribeToStack(fn: (stack: readonly InputLayer[]) => void): () => void {
    this.stackListeners.add(fn);
    return () => this.stackListeners.delete(fn);
  }

  setLogHandler(fn: ((entry: InputLogEntry) => void) | null): void {
    this.logHandler = fn;
  }

  private notifyStack(): void {
    const snapshot = [...this.stack];
    this.stackListeners.forEach((fn) => fn(snapshot));
  }

  private log(entry: Omit<InputLogEntry, 'timestamp'>): void {
    this.logHandler?.({ ...entry, timestamp: performance.now() });
  }

  // ---------------------------------------------------------------------
  // Held-key polling — for continuous input like movement, as opposed to
  // discrete actions dispatched through keyBindings below.
  // ---------------------------------------------------------------------

  /**
   * Safe held-key check for continuous/polled input (movement, etc).
   *
   * Deliberately requires the calling layer's own id and re-checks
   * isTopLayer internally, rather than exposing the raw heldKeys set.
   * A bare `heldKeys.has(code)` would let a background layer's game loop
   * keep reading keys meant for whatever is currently on top of it — this
   * makes that mistake structurally unavailable instead of relying on
   * every caller remembering to check first.
   */
  isKeyHeld(code: string, layerId: string): boolean {
    return this.isTopLayer(layerId) && this.heldKeys.has(code);
  }

  /**
   * Mark a code as "held" from a non-keyboard source — an on-screen d-pad
   * button, for instance — AND dispatch any discrete keyBinding for that
   * code, exactly like a real keydown would.
   *
   * This was the missing piece: heldKeys alone only serves isKeyHeld()
   * (continuous/polled input). A virtual button meant to trigger a
   * discrete action — like this app's "Party" button mapped to KeyX —
   * needs to go through the SAME dispatch walk a real keydown does, or it
   * silently does nothing beyond marking a key "held" that nothing polls.
   *
   * One real limitation versus a physical keydown: this can't express
   * modifier combinations (Ctrl+X, etc.) — a virtual button has no
   * concept of "held while also pressing Ctrl." Only bind virtual buttons
   * to plain, unmodified keyBindings.
   */
  pressVirtualKey(code: string): void {
    this.heldKeys.add(code);
    this.dispatchVirtualCode(code);
  }

  private dispatchVirtualCode(code: string): void {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const layer = this.stack[i];
      const binding = layer.keyBindings?.find((b) => b.code === code && !b.ctrl && !b.shift && !b.alt && !b.meta);
      if (binding) {
        layer.onAction(binding.action, { source: 'pointer' });
        this.log({ source: 'pointer', trigger: code, layer: layer.name, action: binding.action });
        return;
      }
      if (layer.blocksLowerLayers) {
        this.log({ source: 'pointer', trigger: code, layer: layer.name, action: null, note: 'blocked' });
        return;
      }
    }
    this.log({ source: 'pointer', trigger: code, layer: '(none)', action: null, note: 'unhandled' });
  }

  /**
   * Release a code added via pressVirtualKey. Call this on pointerup AND
   * pointerleave/pointercancel — a finger sliding off a button without a
   * clean pointerup is a real failure mode on touch devices, and skipping
   * either handler risks a permanently "stuck" held key.
   */
  releaseVirtualKey(code: string): void {
    this.heldKeys.delete(code);
  }

  // ---------------------------------------------------------------------
  // Keyboard dispatch — called by the keyboard adapter, never directly by
  // feature code.
  // ---------------------------------------------------------------------

  handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isEditable =
      !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
    // Never hijack typing, regardless of what layers are registered.
    if (isEditable || event.repeat || event.isComposing) return;

    this.heldKeys.add(event.code);

    for (let i = this.stack.length - 1; i >= 0; i--) {
      const layer = this.stack[i];
      const binding = layer.keyBindings?.find((b) => matchesBinding(b, event));
      if (binding) {
        event.preventDefault();
        layer.onAction(binding.action, { source: 'keyboard' });
        this.log({ source: 'keyboard', trigger: describeKeyEvent(event), layer: layer.name, action: binding.action });
        return;
      }
      if (layer.blocksLowerLayers) {
        this.log({
          source: 'keyboard',
          trigger: describeKeyEvent(event),
          layer: layer.name,
          action: null,
          note: 'blocked',
        });
        return;
      }
    }
    this.log({
      source: 'keyboard',
      trigger: describeKeyEvent(event),
      layer: '(none)',
      action: null,
      note: 'unhandled',
    });
  }

  handleKeyUp(event: KeyboardEvent): void {
    this.heldKeys.delete(event.code);
  }

  // ---------------------------------------------------------------------
  // Pointer dispatch — unifies mouse, touch, and pen via a single call.
  // The pointer *adapter* (adapters/pointerAdapter.ts) is what actually
  // listens for browser events; this method just resolves "who handles a
  // point that was pressed." Only needed where the browser can't already
  // hit-test for you (i.e. inside a <canvas>) — real DOM elements should
  // use native onClick, where paint order already provides correct
  // scoping for free. See README.md.
  // ---------------------------------------------------------------------

  handlePointerDown(point: Point): HitTestResult | null {
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const layer = this.stack[i];
      const hit = layer.hitTest?.(point) ?? null;
      if (hit) {
        layer.onAction(hit.action, { source: 'pointer', point, meta: hit.meta });
        this.log({ source: 'pointer', trigger: pointToString(point), layer: layer.name, action: hit.action });
        return hit;
      }
      if (layer.blocksLowerLayers) {
        this.log({
          source: 'pointer',
          trigger: pointToString(point),
          layer: layer.name,
          action: null,
          note: 'blocked',
        });
        return null;
      }
    }
    this.log({ source: 'pointer', trigger: pointToString(point), layer: '(none)', action: null, note: 'unhandled' });
    return null;
  }
}

function matchesBinding(binding: KeyBinding, event: KeyboardEvent): boolean {
  return (
    binding.code === event.code &&
    !!binding.ctrl === event.ctrlKey &&
    !!binding.shift === event.shiftKey &&
    !!binding.alt === event.altKey &&
    !!binding.meta === event.metaKey
  );
}

function describeKeyEvent(event: KeyboardEvent): string {
  const mods = [event.ctrlKey && 'Ctrl', event.shiftKey && 'Shift', event.altKey && 'Alt', event.metaKey && 'Meta']
    .filter(Boolean)
    .join('+');
  return mods ? `${mods}+${event.code}` : event.code;
}

function pointToString(point: Point): string {
  return `${Math.round(point.x)},${Math.round(point.y)}`;
}

/**
 * The one shared instance. Import this everywhere — React components,
 * canvas scene classes, anything that needs input — rather than
 * constructing your own `new InputManager()`. Exactly one should exist
 * per running app.
 */
export const inputManager = new InputManager();
