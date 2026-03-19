/**
 * BattleScene - Turn-based battle screen.
 *
 * Displays player and enemy Pokemon, HP bars, action menus,
 * and integrates with the math engine for attack resolution.
 *
 * TODO:
 * - Battle initialization (wild vs trainer)
 * - Turn flow: select action -> math problem -> resolve damage
 * - HP bar rendering with color gradient (green -> yellow -> red)
 * - Pokemon sprite display and attack animations
 * - Victory/defeat conditions and XP reward
 * - Catch attempt flow for wild battles
 * - Battle transition animation (fade/swirl)
 */

import type { Scene } from '../types/index.js';

export function createBattleScene(): Scene {
  return {
    enter(): void {
      // TODO: Initialize battle state, set up combatants
    },

    exit(): void {
      // TODO: Clean up battle resources, return rewards
    },

    update(_dt: number): void {
      // TODO: Battle turn logic, math problem display, animations
    },

    render(_ctx: CanvasRenderingContext2D): void {
      // TODO: Draw battle UI, Pokemon sprites, HP bars, action menu
    },
  };
}
