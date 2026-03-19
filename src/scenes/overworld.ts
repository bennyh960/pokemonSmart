/**
 * OverworldScene - Top-down world exploration.
 *
 * Handles tile-based movement, NPC interactions, area transitions,
 * and wild encounter triggers on the overworld map.
 *
 * TODO:
 * - Tile map loading and rendering
 * - Player character movement (4-directional grid-based)
 * - NPC placement and interaction triggers
 * - Area/route transitions with fade
 * - Wild encounter random triggers based on terrain
 * - Overworld HUD (location name, mini-map indicator)
 */

import type { Scene } from '../types/index.js';

export function createOverworldScene(): Scene {
  return {
    enter(): void {
      // TODO: Load map data, reset camera position
    },

    exit(): void {
      // TODO: Clean up map resources
    },

    update(_dt: number): void {
      // TODO: Handle player movement, NPC AI, encounter checks
    },

    render(_ctx: CanvasRenderingContext2D): void {
      // TODO: Render tilemap, sprites, HUD
    },
  };
}
