/**
 * Detects whether TOUCH IS THE PRIMARY INPUT — phones and tablets — as
 * opposed to merely "this device can receive touch events," which many
 * laptops with a touchscreen also report even though the user is on a
 * trackpad and keyboard the vast majority of the time.
 *
 * WHY NOT `'ontouchstart' in window` OR `navigator.maxTouchPoints`
 * Both answer "can this device receive touch," not "is touch how this
 * user actually interacts." A touchscreen laptop would false-positive on
 * either check — exactly the hybrid case you want treated as NOT touch.
 *
 * THE ACTUAL SIGNAL
 *   - pointer: coarse  → the primary pointing device is imprecise (a finger),
 *                         as opposed to `fine` (mouse/trackpad/stylus).
 *   - hover: none      → the primary input can't hover at all, which a
 *                         finger genuinely can't do and a mouse always can.
 * A phone/tablet with no attached mouse matches both. A touchscreen
 * laptop's primary pointer is still reported as fine + hover-capable by
 * the OS, so it correctly does NOT match — which is the hybrid-device
 * behavior you want.
 */
export function isTouchPrimaryDevice(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

/**
 * Same check, but live — subscribes to changes so a device that's
 * docked/undocked (a tablet gets a mouse attached, etc.) is reflected
 * without a page reload. Framework-agnostic: takes a plain callback, not
 * a React hook, so it's usable from your canvas/game bootstrap code too.
 */
export function watchTouchPrimaryDevice(onChange: (isTouchPrimary: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    onChange(false);
    return () => {};
  }
  const mql = window.matchMedia('(hover: none) and (pointer: coarse)');
  const handler = () => onChange(mql.matches);
  handler(); // report initial state immediately
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}
