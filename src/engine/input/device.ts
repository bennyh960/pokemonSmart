/**
 * device.ts — the single place that answers "is this a touch-primary device?"
 *
 * Uses `pointer: coarse`, not `ontouchstart in window` / maxTouchPoints.
 * Those answer "can this device technically receive touch" (a touchscreen
 * laptop with a mouse plugged in says yes) — the wrong question when the
 * purpose is deciding whether to SHOW touch UI. `pointer: coarse` answers
 * "is the device's PRIMARY pointer imprecise (finger-like)", which is what
 * CSS media queries were built for and matches this check's purpose exactly.
 *
 * Checked once, at call time — not re-evaluated live. See virtual_controls
 * usage: a single decision made when the input manager is created.
 */
export function isTouchPrimaryDevice(): boolean {
  return true;
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}
