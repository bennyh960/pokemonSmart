/**
 * OverworldScene - Top-down world exploration with grid-based movement.
 * Encounter triggers on tall grass tiles (10% chance per step).
 */

import type { Scene, Pokemon } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { createTileMap, type TileMap, type TileMapData } from '../engine/tilemap.js';
import { createCamera, type Camera } from '../engine/camera.js';
import { clearScreen, fillRect, drawText } from '../engine/renderer.js';
import { t } from '../i18n/i18n.js';
import { getPlayerData, hasActiveGame, autoSave } from '../systems/game-state.js';
import { generateWildEncounter } from '../systems/encounter.js';
import { setBattleData } from './battle.js';
import { getPlayerSpriteSheet } from '../engine/asset-generator.js';
import testMapData from '../data/maps/test-map.json';

const SCREEN_W = 240;
const SCREEN_H = 160;
const TILE_SIZE = 16;
const MOVE_DURATION = 0.2;
const ENCOUNTER_CHANCE = 0.10;

const DIR_VECTORS: Record<string, { dx: number; dy: number }> = {
  ArrowUp: { dx: 0, dy: -1 }, ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 }, ArrowRight: { dx: 1, dy: 0 },
};

const DIR_TO_ROW: Record<string, number> = {
  ArrowDown: 0, ArrowUp: 1, ArrowLeft: 2, ArrowRight: 3,
};

interface PlayerState {
  gridX: number; gridY: number; pixelX: number; pixelY: number;
  moving: boolean; targetGridX: number; targetGridY: number;
  startPixelX: number; startPixelY: number; moveProgress: number; facing: string;
  walkFrame: number; walkTimer: number;
}

export function createOverworldScene(input: InputManager, stateMachine: StateMachine, audio: AudioManager): Scene {
  let tileMap: TileMap;
  let camera: Camera;
  let player: PlayerState;
  let encounterTriggered = false;
  let flashTimer = 0;
  let flashPhase: 'none' | 'flash' | 'black' = 'none';

  function initPlayer(sx: number, sy: number): PlayerState {
    return {
      gridX: sx, gridY: sy, pixelX: sx * TILE_SIZE, pixelY: sy * TILE_SIZE,
      moving: false, targetGridX: sx, targetGridY: sy,
      startPixelX: sx * TILE_SIZE, startPixelY: sy * TILE_SIZE,
      moveProgress: 0, facing: 'ArrowDown',
      walkFrame: 0, walkTimer: 0,
    };
  }

  function startEncounterTransition(wildPokemon: Pokemon): void {
    encounterTriggered = true;
    flashTimer = 0;
    flashPhase = 'flash';
    const playerData = getPlayerData();
    const playerPokemon = playerData.party[0];
    if (playerPokemon) setBattleData(playerPokemon, wildPokemon);
  }

  return {
    enter(): void {
      tileMap = createTileMap(testMapData as TileMapData);
      camera = createCamera(SCREEN_W, SCREEN_H);
      encounterTriggered = false;
      flashPhase = 'none';
      flashTimer = 0;
      audio.playMusic('town');

      let spawnX = tileMap.spawn.x;
      let spawnY = tileMap.spawn.y;
      if (hasActiveGame()) {
        const pd = getPlayerData();
        if (pd.position.mapId === 'test-map' && tileMap.isWalkable(pd.position.x, pd.position.y)) {
          spawnX = pd.position.x;
          spawnY = pd.position.y;
        }
      }
      player = initPlayer(spawnX, spawnY);
      const cx = player.pixelX + TILE_SIZE / 2;
      const cy = player.pixelY + TILE_SIZE / 2;
      camera.snapTo(cx, cy, tileMap.width * TILE_SIZE, tileMap.height * TILE_SIZE);

      // Auto-save on area entry
      if (hasActiveGame()) {
        const pd = getPlayerData();
        pd.position.x = player.gridX;
        pd.position.y = player.gridY;
        pd.position.mapId = 'test-map';
        autoSave();
      }
    },

    exit(): void {
      if (hasActiveGame()) {
        const pd = getPlayerData();
        pd.position.x = player.gridX;
        pd.position.y = player.gridY;
        pd.position.mapId = 'test-map';
        autoSave();
      }
    },

    update(dt: number): void {
      // Track playtime
      if (hasActiveGame()) getPlayerData().playtime += dt;

      if (encounterTriggered) {
        flashTimer += dt;
        if (flashPhase === 'flash' && flashTimer >= 0.4) { flashPhase = 'black'; flashTimer = 0; }
        if (flashPhase === 'black' && flashTimer >= 0.3) {
          encounterTriggered = false; flashPhase = 'none';
          stateMachine.change('BATTLE');
        }
        return;
      }

      if (player.moving) {
        player.moveProgress += dt / MOVE_DURATION;
        // Walk animation
        player.walkTimer += dt;
        if (player.walkTimer >= 0.1) { player.walkTimer = 0; player.walkFrame = player.walkFrame === 1 ? 2 : 1; }
        if (player.moveProgress >= 1) {
          player.moveProgress = 1;
          player.gridX = player.targetGridX;
          player.gridY = player.targetGridY;
          player.pixelX = player.gridX * TILE_SIZE;
          player.pixelY = player.gridY * TILE_SIZE;
          player.moving = false;
          player.walkFrame = 0;

          if (tileMap.isTallGrass(player.gridX, player.gridY)) {
            if (Math.random() < ENCOUNTER_CHANCE) {
              const wild = generateWildEncounter('test-map');
              if (wild) { startEncounterTransition(wild); return; }
            }
          }
        } else {
          player.pixelX = player.startPixelX + (player.targetGridX * TILE_SIZE - player.startPixelX) * player.moveProgress;
          player.pixelY = player.startPixelY + (player.targetGridY * TILE_SIZE - player.startPixelY) * player.moveProgress;
        }
      }

      if (!player.moving) {
        for (const [key, dir] of Object.entries(DIR_VECTORS)) {
          if (input.isKeyDown(key)) {
            player.facing = key;
            const nx = player.gridX + dir.dx;
            const ny = player.gridY + dir.dy;
            if (tileMap.isWalkable(nx, ny)) {
              player.moving = true;
              player.targetGridX = nx; player.targetGridY = ny;
              player.startPixelX = player.pixelX; player.startPixelY = player.pixelY;
              player.moveProgress = 0;
              player.walkTimer = 0; player.walkFrame = 1;
            }
            break;
          }
        }
      }

      const cx = player.pixelX + TILE_SIZE / 2;
      const cy = player.pixelY + TILE_SIZE / 2;
      camera.follow(cx, cy, tileMap.width * TILE_SIZE, tileMap.height * TILE_SIZE, dt);
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#000000');
      tileMap.render(ctx, camera.x, camera.y);

      const psx = Math.floor(player.pixelX - camera.x);
      const psy = Math.floor(player.pixelY - camera.y);
      const spriteSheet = getPlayerSpriteSheet();
      if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
        const row = DIR_TO_ROW[player.facing] ?? 0;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spriteSheet, player.walkFrame * 16, row * 16, 16, 16, psx, psy, 16, 16);
      } else {
        fillRect(ctx, psx, psy, TILE_SIZE, TILE_SIZE, '#4488FF');
      }

      drawText(ctx, tileMap.name, 4, 4, { size: 8, color: '#ffffff', font: 'monospace' });

      if (hasActiveGame()) {
        const lead = getPlayerData().party[0];
        if (lead) drawText(ctx, `${lead.name} ${t('hp.level', { level: lead.level })}`, 4, 14, { size: 8, color: '#aaccff', font: 'monospace' });
      }

      if (flashPhase === 'flash') {
        if (Math.floor(flashTimer * 8) % 2 === 0) fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, '#ffffff');
      } else if (flashPhase === 'black') {
        fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, '#000000');
      }
    },
  };
}
