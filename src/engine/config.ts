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

/** Admin player name — enables debug shortcuts (H=heal, N=shop). */
export const ADMIN_NAME = 'adminBenny';

// ── Glitch system (NULL-X infection) ─────────────────────────────────────────
export const GLITCH_DAMAGE_BONUS_MIN = 0.1;
export const GLITCH_DAMAGE_BONUS_MAX = 0.25;

import type { InfectionLevel } from '../types/index.js';
/** Probability (0–1) that a wild Pokémon spawns as glitched per infection level. */
export const INFECTION_GLITCH_RATE: Record<InfectionLevel, number> = {
  none: 0,
  low: 0.33,
  medium: 0.5,
  high: 0.75,
  critical: 1.0,
  cleared: 0,
};
