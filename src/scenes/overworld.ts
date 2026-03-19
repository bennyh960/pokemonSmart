/**
 * OverworldScene - Top-down world exploration with grid-based movement.
 *
 * Handles tile-based movement (16px steps, ~200ms per tile),
 * collision detection, camera following, and wild encounter triggers
 * on tall grass tiles (10% chance per step).
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { createTileMap, type TileMap, type TileMapData } from '../engine/tilemap.js';
import { createCamera, type Camera } from '../engine/camera.js';
import { clearScreen, fillRect, drawText } from '../engine/renderer.js';
import testMapData from '../data/maps/test-map.json';

/** Native canvas dimensions. */
const SCREEN_W = 240;
const SCREEN_H = 160;

/** Tile size in pixels. */
const TILE_SIZE = 16;

/** Time to move one tile in seconds. */
const MOVE_DURATION = 0.2;

/** Chance of wild encounter on tall grass (0-1). */
const ENCOUNTER_CHANCE = 0.10;

/** Direction vectors for grid movement. */
const DIR_VECTORS: Record<string, { dx: number; dy: number }> = {
  ArrowUp:    { dx: 0, dy: -1 },
  ArrowDown:  { dx: 0, dy:  1 },
  ArrowLeft:  { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy:  0 },
};

/** Player state for the overworld. */
interface PlayerState {
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  moving: boolean;
  targetGridX: number;
  targetGridY: number;
  startPixelX: number;
  startPixelY: number;
  moveProgress: number;
  facing: string;
}

/** Create the overworld scene. */
export function createOverworldScene(input: InputManager, _stateMachine: StateMachine): Scene {
  let tileMap: TileMap;
  let camera: Camera;
  let player: PlayerState;
  let encounterTriggered = false;

  function initPlayer(spawnX: number, spawnY: number): PlayerState {
    return {
      gridX: spawnX,
      gridY: spawnY,
      pixelX: spawnX * TILE_SIZE,
      pixelY: spawnY * TILE_SIZE,
      moving: false,
      targetGridX: spawnX,
      targetGridY: spawnY,
      startPixelX: spawnX * TILE_SIZE,
      startPixelY: spawnY * TILE_SIZE,
      moveProgress: 0,
      facing: 'ArrowDown',
    };
  }

  return {
    enter(): void {
      tileMap = createTileMap(testMapData as TileMapData);
      camera = createCamera(SCREEN_W, SCREEN_H);
      player = initPlayer(tileMap.spawn.x, tileMap.spawn.y);
      encounterTriggered = false;

      // Snap camera to player immediately
      const centerX = player.pixelX + TILE_SIZE / 2;
      const centerY = player.pixelY + TILE_SIZE / 2;
      camera.snapTo(centerX, centerY, tileMap.width * TILE_SIZE, tileMap.height * TILE_SIZE);
    },

    exit(): void {
      // Nothing to clean up
    },

    update(dt: number): void {
      if (encounterTriggered) return;

      if (player.moving) {
        // Continue smooth movement interpolation
        player.moveProgress += dt / MOVE_DURATION;

        if (player.moveProgress >= 1) {
          // Movement complete - snap to target
          player.moveProgress = 1;
          player.gridX = player.targetGridX;
          player.gridY = player.targetGridY;
          player.pixelX = player.gridX * TILE_SIZE;
          player.pixelY = player.gridY * TILE_SIZE;
          player.moving = false;

          // Check for wild encounter on tall grass
          if (tileMap.isTallGrass(player.gridX, player.gridY)) {
            if (Math.random() < ENCOUNTER_CHANCE) {
              encounterTriggered = true;
              console.log('Wild encounter triggered!');
              // TODO: _stateMachine.change('BATTLE') once battle scene is ready
              setTimeout(() => { encounterTriggered = false; }, 500);
              return;
            }
          }
        } else {
          // Interpolate pixel position
          player.pixelX = player.startPixelX + (player.targetGridX * TILE_SIZE - player.startPixelX) * player.moveProgress;
          player.pixelY = player.startPixelY + (player.targetGridY * TILE_SIZE - player.startPixelY) * player.moveProgress;
        }
      }

      // Start new movement if not moving
      if (!player.moving) {
        for (const [key, dir] of Object.entries(DIR_VECTORS)) {
          if (input.isKeyDown(key)) {
            player.facing = key;

            const newGX = player.gridX + dir.dx;
            const newGY = player.gridY + dir.dy;

            if (tileMap.isWalkable(newGX, newGY)) {
              player.moving = true;
              player.targetGridX = newGX;
              player.targetGridY = newGY;
              player.startPixelX = player.pixelX;
              player.startPixelY = player.pixelY;
              player.moveProgress = 0;
            }
            break;
          }
        }
      }

      // Smooth camera follow
      const centerX = player.pixelX + TILE_SIZE / 2;
      const centerY = player.pixelY + TILE_SIZE / 2;
      camera.follow(centerX, centerY, tileMap.width * TILE_SIZE, tileMap.height * TILE_SIZE, dt);
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#000000');

      // Render tilemap
      tileMap.render(ctx, camera.x, camera.y);

      // Render player as a blue 16x16 rect
      const playerScreenX = Math.floor(player.pixelX - camera.x);
      const playerScreenY = Math.floor(player.pixelY - camera.y);
      fillRect(ctx, playerScreenX, playerScreenY, TILE_SIZE, TILE_SIZE, '#4488FF');

      // Draw a small direction indicator on the player
      const indicatorSize = 4;
      let ix = playerScreenX + TILE_SIZE / 2 - indicatorSize / 2;
      let iy = playerScreenY + TILE_SIZE / 2 - indicatorSize / 2;

      if (player.facing === 'ArrowUp') iy = playerScreenY + 1;
      else if (player.facing === 'ArrowDown') iy = playerScreenY + TILE_SIZE - indicatorSize - 1;
      else if (player.facing === 'ArrowLeft') ix = playerScreenX + 1;
      else if (player.facing === 'ArrowRight') ix = playerScreenX + TILE_SIZE - indicatorSize - 1;

      fillRect(ctx, ix, iy, indicatorSize, indicatorSize, '#AACCFF');

      // Location name HUD
      drawText(ctx, tileMap.name, 4, 4, {
        size: 8,
        color: '#ffffff',
        font: 'monospace',
      });

      // Encounter flash effect
      if (encounterTriggered) {
        fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, '#ffffff');
      }
    },
  };
}
