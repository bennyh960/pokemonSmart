/**
 * OverworldScene - Top-down world exploration with grid-based movement.
 * Encounter triggers on tall grass tiles (10% chance per step).
 * Supports dynamic map loading and transitions between maps.
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
import { loadMap, setCurrentMapId } from '../systems/map-manager.js';

const SCREEN_W = 240;
const SCREEN_H = 160;
const TILE_SIZE = 16;
const MOVE_DURATION = 0.2;
const ENCOUNTER_CHANCE = 0.10;
const TRANSITION_FADE_TIME = 0.3;

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
  let tileMap: TileMap | null = null;
  let currentMapData: TileMapData | null = null;
  let camera: Camera;
  let player: PlayerState;
  let encounterTriggered = false;
  let flashTimer = 0;
  let flashPhase: 'none' | 'flash' | 'black' = 'none';

  // Map transition state
  let transitionState: 'none' | 'fade-out' | 'loading' | 'fade-in' = 'none';
  let transitionTarget: { mapId: string; x: number; y: number } | null = null;
  let transitionTimer = 0;
  let mapLoading = false;

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

  /** Check if the player's current tile triggers a map transition. */
  function checkTransition(): boolean {
    if (!currentMapData?.transitions) return false;
    for (const tr of currentMapData.transitions) {
      if (tr.fromX === player.gridX && tr.fromY === player.gridY) {
        transitionState = 'fade-out';
        transitionTimer = 0;
        transitionTarget = { mapId: tr.toMapId, x: tr.toX, y: tr.toY };
        return true;
      }
    }
    return false;
  }

  /** Load a map and set up the scene. */
  async function loadAndSetMap(mapId: string, spawnX: number, spawnY: number): Promise<void> {
    const data = await loadMap(mapId);
    currentMapData = data;
    tileMap = createTileMap(data as TileMapData);
    setCurrentMapId(mapId);

    player = initPlayer(spawnX, spawnY);
    camera = createCamera(SCREEN_W, SCREEN_H);
    const cx = player.pixelX + TILE_SIZE / 2;
    const cy = player.pixelY + TILE_SIZE / 2;
    camera.snapTo(cx, cy, tileMap.width * TILE_SIZE, tileMap.height * TILE_SIZE);

    // Play map music
    audio.playMusic(currentMapData.music || 'town');

    // Auto-save on area entry
    if (hasActiveGame()) {
      const pd = getPlayerData();
      pd.position.x = player.gridX;
      pd.position.y = player.gridY;
      pd.position.mapId = mapId;
      autoSave();
    }
  }

  return {
    enter(): void {
      encounterTriggered = false;
      flashPhase = 'none';
      flashTimer = 0;
      transitionState = 'none';
      transitionTarget = null;
      tileMap = null;
      currentMapData = null;
      mapLoading = true;

      // Determine which map to load
      let mapId = 'zeroville';
      let spawnX = 15;
      let spawnY = 12;

      if (hasActiveGame()) {
        const pd = getPlayerData();
        mapId = pd.position.mapId || 'zeroville';
        spawnX = pd.position.x;
        spawnY = pd.position.y;
      }

      loadAndSetMap(mapId, spawnX, spawnY).then(() => {
        mapLoading = false;
      }).catch((err) => {
        console.error('Failed to load map, falling back to test-map:', err);
        loadAndSetMap('test-map', 10, 10).then(() => {
          mapLoading = false;
        });
      });
    },

    exit(): void {
      if (hasActiveGame() && currentMapData) {
        const pd = getPlayerData();
        pd.position.x = player.gridX;
        pd.position.y = player.gridY;
        pd.position.mapId = currentMapData.id || 'test-map';
        autoSave();
      }
    },

    update(dt: number): void {
      // While map is loading, do nothing
      if (mapLoading || !tileMap) return;

      // Track playtime
      if (hasActiveGame()) getPlayerData().playtime += dt;

      // Handle map transitions
      if (transitionState !== 'none') {
        transitionTimer += dt;
        if (transitionState === 'fade-out' && transitionTimer >= TRANSITION_FADE_TIME) {
          transitionState = 'loading';
          transitionTimer = 0;
          if (transitionTarget) {
            mapLoading = true;
            loadAndSetMap(transitionTarget.mapId, transitionTarget.x, transitionTarget.y).then(() => {
              mapLoading = false;
              transitionState = 'fade-in';
              transitionTimer = 0;
            }).catch((err) => {
              console.error('Transition failed:', err);
              mapLoading = false;
              transitionState = 'none';
              transitionTarget = null;
            });
          }
        }
        if (transitionState === 'fade-in' && transitionTimer >= TRANSITION_FADE_TIME) {
          transitionState = 'none';
          transitionTarget = null;
        }
        return;
      }

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

          // Check for map transition first
          if (checkTransition()) return;

          if (tileMap.isTallGrass(player.gridX, player.gridY)) {
            if (Math.random() < ENCOUNTER_CHANCE) {
              const encounterId = (currentMapData?.encounterTableId ?? currentMapData?.id) || 'test-map';
              const wild = generateWildEncounter(encounterId);
              if (wild) { startEncounterTransition(wild); return; }
            }
          }
        } else {
          player.pixelX = player.startPixelX + (player.targetGridX * TILE_SIZE - player.startPixelX) * player.moveProgress;
          player.pixelY = player.startPixelY + (player.targetGridY * TILE_SIZE - player.startPixelY) * player.moveProgress;
        }
      }

      // P key → Party
      if (input.isKeyPressed('p') || input.isKeyPressed('P')) {
        stateMachine.push('PARTY');
        return;
      }

      // D key → Pokedex
      if (input.isKeyPressed('d') || input.isKeyPressed('D')) {
        stateMachine.push('POKEDEX');
        return;
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

      // Show black screen while loading
      if (mapLoading || !tileMap) return;

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

      const mapName = currentMapData?.name || '';
      drawText(ctx, mapName, 4, 4, { size: 8, color: '#ffffff', font: 'monospace' });

      if (hasActiveGame()) {
        const lead = getPlayerData().party[0];
        if (lead) drawText(ctx, `${lead.name} ${t('hp.level', { level: lead.level })}`, 4, 14, { size: 8, color: '#aaccff', font: 'monospace' });
      }

      // Encounter flash overlay
      if (flashPhase === 'flash') {
        if (Math.floor(flashTimer * 8) % 2 === 0) fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, '#ffffff');
      } else if (flashPhase === 'black') {
        fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, '#000000');
      }

      // Map transition overlay
      if (transitionState === 'fade-out') {
        const alpha = Math.min(transitionTimer / TRANSITION_FADE_TIME, 1);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      } else if (transitionState === 'loading') {
        fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, '#000000');
      } else if (transitionState === 'fade-in') {
        const alpha = 1 - Math.min(transitionTimer / TRANSITION_FADE_TIME, 1);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      }
    },
  };
}
