/**
 * Shared types for the input system.
 *
 * Everything here rests on one idea, repeated throughout this module:
 * separate TRIGGER (a key, a click, a tap) from ACTION (a semantic string
 * like "pause" or "confirm"). Layers map triggers -> actions. Consumers
 * only ever react to actions, never to raw events directly.
 */

export type Point = { readonly x: number; readonly y: number };

export type InputSource = 'keyboard' | 'pointer';

/**
 * One keyboard binding: a physical key plus an EXACT modifier state,
 * mapped to an action name.
 *
 * We match on `event.code` ("KeyW", "Escape"), not `event.key`, so
 * bindings stay tied to physical key position regardless of keyboard
 * layout — the correct choice for game-style controls (WASD stays WASD
 * on AZERTY). If you need layout-aware shortcuts (Ctrl+S should mean
 * "save" wherever the S key physically lives), match on `event.key`
 * instead for that specific binding.
 */
export interface KeyBinding {
  code: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: string;
}

/** What a layer's own hit-test found at a point, if anything. */
export interface HitTestResult {
  action: string;
  meta?: Record<string, unknown>;
}

/**
 * Given a point in the target element's local coordinate space, decide
 * whether this layer's on-screen content was hit, and what that means.
 * Only needed where the browser can't hit-test for you — i.e. inside a
 * <canvas>. Real DOM elements should use native onClick instead; see
 * README.md.
 */
export type PointerHitTest = (point: Point) => HitTestResult | null;

/** Payload passed to a layer's onAction, regardless of which input source triggered it. */
export interface InputActionEvent {
  source: InputSource;
  point?: Point;
  meta?: Record<string, unknown>;
}

/**
 * One entry in the input stack. Only the topmost layer able to handle a
 * given event actually receives it — that's the entire scoping mechanism.
 * Structurally this is a Chain of Responsibility: each layer gets a
 * chance to handle the event or explicitly block it from going further.
 */
export interface InputLayer {
  /** Unique id. Used for push/pop and isTopLayer/isKeyHeld checks. */
  id: string;
  /** Human-readable name — logs and debug UI only, never compared against. */
  name: string;
  /**
   * If true, dispatch stops at this layer even when it has no matching
   * binding/hit for the current event. This is what makes a modal
   * "opaque": everything beneath it goes silent, mapped or not — the
   * difference between "this layer didn't want that key" and "this layer
   * doesn't let anything below it see input at all."
   */
  blocksLowerLayers?: boolean;
  keyBindings?: readonly KeyBinding[];
  hitTest?: PointerHitTest;
  onAction: (action: string, event: InputActionEvent) => void;
}

export interface InputLogEntry {
  source: InputSource;
  trigger: string;
  layer: string;
  action: string | null;
  note?: 'blocked' | 'unhandled';
  timestamp: number;
}
