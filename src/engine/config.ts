/**
 * Config - Shared constants for canvas resolution and rendering.
 *
 * LOGICAL_WIDTH x LOGICAL_HEIGHT is the GBA-style coordinate system (240x160).
 * The physical canvas is scaled by RES_SCALE for higher-quality sprite rendering,
 * while all game logic and drawing uses logical coordinates via ctx.scale().
 */

export const LOGICAL_WIDTH = 240;
export const LOGICAL_HEIGHT = 160;
export const RES_SCALE = 3;
export const CANVAS_WIDTH = LOGICAL_WIDTH * RES_SCALE;
export const CANVAS_HEIGHT = LOGICAL_HEIGHT * RES_SCALE;
export const TILE_SIZE = 16;
export const BASE_FONT_SIZE = 8;
