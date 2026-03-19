/**
 * Camera - Follows the player with smooth lerp and map bounds clamping.
 *
 * The camera keeps the player centered on screen while ensuring
 * we never scroll past the edges of the map.
 */

/** Create a camera that follows a target within map bounds. */
export function createCamera(screenWidth: number, screenHeight: number) {
  let x = 0;
  let y = 0;

  /** Lerp smoothing factor (higher = snappier, 1 = instant). */
  const LERP_SPEED = 8;

  return {
    /** Current camera X offset (top-left corner in world coords). */
    get x(): number { return x; },
    /** Current camera Y offset (top-left corner in world coords). */
    get y(): number { return y; },

    /** Snap the camera instantly to center on the given world position. */
    snapTo(targetX: number, targetY: number, mapWidthPx: number, mapHeightPx: number): void {
      x = this.clampX(targetX - screenWidth / 2, mapWidthPx);
      y = this.clampY(targetY - screenHeight / 2, mapHeightPx);
    },

    /** Smoothly move the camera toward the target position. */
    follow(
      targetX: number,
      targetY: number,
      mapWidthPx: number,
      mapHeightPx: number,
      dt: number,
    ): void {
      const desiredX = targetX - screenWidth / 2;
      const desiredY = targetY - screenHeight / 2;

      const clampedX = this.clampX(desiredX, mapWidthPx);
      const clampedY = this.clampY(desiredY, mapHeightPx);

      const t = Math.min(1, LERP_SPEED * dt);
      x += (clampedX - x) * t;
      y += (clampedY - y) * t;
    },

    /** Clamp X so the camera doesn't go past map edges. */
    clampX(val: number, mapWidthPx: number): number {
      const maxX = Math.max(0, mapWidthPx - screenWidth);
      return Math.max(0, Math.min(val, maxX));
    },

    /** Clamp Y so the camera doesn't go past map edges. */
    clampY(val: number, mapHeightPx: number): number {
      const maxY = Math.max(0, mapHeightPx - screenHeight);
      return Math.max(0, Math.min(val, maxY));
    },
  };
}

/** The return type of createCamera, for use in type annotations. */
export type Camera = ReturnType<typeof createCamera>;
