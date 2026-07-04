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
