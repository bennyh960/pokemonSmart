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

// ── Enemy power tiers ────────────────────────────────────────────────────────
/** Damage multipliers for tough enemies, rolled per hit within [min, max].
 *  `deal` = damage they deal, `take` = damage they take. Stats are never changed. */
export interface EnemyPowerTier {
  deal: readonly [number, number];
  take: readonly [number, number];
}
export type EnemyPowerTierId = 'glitch' | 'gym' | 'wildNpc' | 'elite';
export const ENEMY_POWER_TIERS: Record<EnemyPowerTierId, EnemyPowerTier> = {
  glitch: { deal: [1.1, 1.25], take: [0.75, 0.9] }, // any NULL-X glitched Pokémon
  gym: { deal: [1.15, 1.3], take: [0.7, 0.85] }, // gym leader Pokémon
  wildNpc: { deal: [1.2, 1.35], take: [0.65, 0.8] }, // wild Pokémon standing on the map
  elite: { deal: [1.25, 1.4], take: [0.6, 0.75] }, // Elite Four + Champion
};

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
