/**
 * OverworldScene - Top-down world exploration with grid-based movement.
 * Encounter triggers on tall grass tiles (10% chance per step).
 * Supports dynamic map loading, transitions, NPC interaction, shop and heal.
 */

import type { Scene, Pokemon } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { createTileMap, type TileMap, type TileMapData } from '../engine/tilemap.js';
import { createCamera, type Camera } from '../engine/camera.js';
import { clearScreen, fillRect, drawText } from '../engine/renderer.js';
import { t, isRTL } from '../i18n/i18n.js';
import { getPlayerData, hasActiveGame, autoSave, healParty } from '../systems/game-state.js';
import { generateWildEncounter } from '../systems/encounter.js';
import { setBattleData } from './battle.js';
import { getPlayerSpriteSheet, getNPCSpriteImage } from '../engine/asset-generator.js';
import { loadMap, setCurrentMapId } from '../systems/map-manager.js';
import { createShopState, openShop, updateShop, renderShop, type ShopState } from '../ui/shop.js';
import { createTextBox, updateTextBox, renderTextBox } from '../ui/text-box.js';
import { createNPCManager, type NPCData, type NPCManager } from '../systems/npc.js';

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

interface ChoiceState {
  options: string[];
  selected: number;
  callback: (idx: number) => void;
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

  // Shop overlay state
  let shop: ShopState = createShopState();

  // Heal text overlay
  let healTextBox: ReturnType<typeof createTextBox> | null = null;

  // NPC state
  let npcManager: NPCManager | null = null;

  // Dialogue state
  let activeTextBox: ReturnType<typeof createTextBox> | null = null;
  let interactingNPC: NPCData | null = null;

  // Choice prompt state
  let choiceState: ChoiceState | null = null;

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

  /** Show a Yes/No choice prompt. */
  function showChoice(callback: (idx: number) => void): void {
    choiceState = {
      options: [t('npc.choice.yes'), t('npc.choice.no')],
      selected: 0,
      callback,
    };
  }

  /** Handle NPC post-dialogue actions. */
  function onDialogueEnd(): void {
    if (!interactingNPC) return;

    if (interactingNPC.type === 'healer') {
      showChoice((idx) => {
        if (idx === 0) {
          healParty();
          autoSave();
          activeTextBox = createTextBox([t('npc.nurse.done')], isRTL());
          interactingNPC = null;
        } else {
          interactingNPC = null;
        }
      });
    } else if (interactingNPC.type === 'shopkeeper') {
      showChoice((idx) => {
        if (idx === 0) {
          openShop(shop);
          interactingNPC = null;
        } else {
          interactingNPC = null;
        }
      });
    } else {
      interactingNPC = null;
    }
  }

  /** Load a map and set up the scene. */
  async function loadAndSetMap(mapId: string, spawnX: number, spawnY: number): Promise<void> {
    const data = await loadMap(mapId);
    currentMapData = data;
    tileMap = createTileMap(data as TileMapData);
    setCurrentMapId(mapId);

    // Load NPCs from map data
    npcManager = createNPCManager((data.npcs as NPCData[]) || []);

    player = initPlayer(spawnX, spawnY);
    camera = createCamera(SCREEN_W, SCREEN_H);
    const cx = player.pixelX + TILE_SIZE / 2;
    const cy = player.pixelY + TILE_SIZE / 2;
    camera.snapTo(cx, cy, tileMap.width * TILE_SIZE, tileMap.height * TILE_SIZE);

    // Play map music
    audio.playMusic(currentMapData.music || 'town');

    // Reset interaction state
    activeTextBox = null;
    interactingNPC = null;
    choiceState = null;
    healTextBox = null;

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
      npcManager = null;
      activeTextBox = null;
      interactingNPC = null;
      choiceState = null;
      healTextBox = null;
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

      // Shop overlay takes priority
      if (shop.open) {
        updateShop(shop, input, dt);
        return;
      }

      // Heal text overlay
      if (healTextBox) {
        if (updateTextBox(healTextBox, input, dt)) {
          healTextBox = null;
        }
        return;
      }

      // Handle choice prompt
      if (choiceState) {
        if (input.isKeyPressed('ArrowLeft')) {
          choiceState.selected = 0;
        } else if (input.isKeyPressed('ArrowRight')) {
          choiceState.selected = 1;
        } else if (input.isKeyPressed('Enter') || input.isKeyPressed(' ')) {
          const cb = choiceState.callback;
          const sel = choiceState.selected;
          choiceState = null;
          cb(sel);
        } else if (input.isKeyPressed('Escape')) {
          const cb = choiceState.callback;
          choiceState = null;
          cb(1); // "No" on escape
        }
        return;
      }

      // Handle NPC dialogue
      if (activeTextBox) {
        const done = updateTextBox(activeTextBox, input, dt);
        if (done) {
          activeTextBox = null;
          if (interactingNPC) {
            onDialogueEnd();
          }
        }
        return;
      }

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

      // NPC interaction: Enter/Space when not moving
      if (!player.moving && (input.isKeyPressed('Enter') || input.isKeyPressed(' '))) {
        if (npcManager) {
          const npc = npcManager.getFacingNPC(player.gridX, player.gridY, player.facing);
          if (npc && npc.dialogue.length > 0) {
            activeTextBox = createTextBox(npc.dialogue, isRTL());
            interactingNPC = npc;
            return;
          }
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

      // N key → Shop (temporary hotkey until NPC interaction wires it)
      if (input.isKeyPressed('n') || input.isKeyPressed('N')) {
        if (hasActiveGame()) {
          openShop(shop);
          return;
        }
      }

      // H key → Heal party (temporary hotkey until NPC interaction wires it)
      if (input.isKeyPressed('h') || input.isKeyPressed('H')) {
        if (hasActiveGame()) {
          healParty();
          autoSave();
          healTextBox = createTextBox([t('heal.done')], isRTL());
          return;
        }
      }

      if (!player.moving) {
        for (const [key, dir] of Object.entries(DIR_VECTORS)) {
          if (input.isKeyDown(key)) {
            player.facing = key;
            const nx = player.gridX + dir.dx;
            const ny = player.gridY + dir.dy;
            if (tileMap.isWalkable(nx, ny) && !(npcManager?.isNPCAt(nx, ny))) {
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

      // Collect renderables for Y-sorting (player + NPCs)
      interface Renderable { y: number; render: () => void; }
      const renderables: Renderable[] = [];

      // Player
      const psx = Math.floor(player.pixelX - camera.x);
      const psy = Math.floor(player.pixelY - camera.y);
      renderables.push({
        y: player.pixelY,
        render: () => {
          const spriteSheet = getPlayerSpriteSheet();
          if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
            const row = DIR_TO_ROW[player.facing] ?? 0;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(spriteSheet, player.walkFrame * 16, row * 16, 16, 16, psx, psy, 16, 16);
          } else {
            fillRect(ctx, psx, psy, TILE_SIZE, TILE_SIZE, '#4488FF');
          }
        },
      });

      // NPCs
      if (npcManager) {
        for (const npc of npcManager.getNPCs()) {
          const nx = Math.floor(npc.x * TILE_SIZE - camera.x);
          const ny = Math.floor(npc.y * TILE_SIZE - camera.y);
          renderables.push({
            y: npc.y * TILE_SIZE,
            render: () => {
              const sprite = getNPCSpriteImage(npc.spriteType);
              ctx.imageSmoothingEnabled = false;
              if (sprite.complete && sprite.naturalWidth > 0) {
                ctx.drawImage(sprite, nx, ny, TILE_SIZE, TILE_SIZE);
              } else {
                fillRect(ctx, nx, ny, TILE_SIZE, TILE_SIZE, '#FF8800');
              }
            },
          });
        }
      }

      // Sort by Y and render
      renderables.sort((a, b) => a.y - b.y);
      for (const r of renderables) r.render();

      // HUD
      const mapName = currentMapData?.name || '';
      drawText(ctx, mapName, 4, 4, { size: 8, color: '#ffffff', font: 'monospace' });

      if (hasActiveGame()) {
        const lead = getPlayerData().party[0];
        if (lead) drawText(ctx, `${lead.name} ${t('hp.level', { level: lead.level })}`, 4, 14, { size: 8, color: '#aaccff', font: 'monospace' });
      }

      // NPC dialogue text box
      if (activeTextBox) {
        renderTextBox(ctx, activeTextBox);
      }

      // Choice prompt
      if (choiceState) {
        const boxW = 100;
        const boxH = 24;
        const boxX = (SCREEN_W - boxW) / 2;
        const boxY = SCREEN_H - 70;

        fillRect(ctx, boxX, boxY, boxW, boxH, '#181820');
        ctx.strokeStyle = '#585858';
        ctx.strokeRect(boxX + 1, boxY + 1, boxW - 2, boxH - 2);

        for (let i = 0; i < choiceState.options.length; i++) {
          const optX = boxX + 10 + i * 50;
          const optY = boxY + 8;
          const selected = i === choiceState.selected;
          if (selected) {
            fillRect(ctx, optX - 2, optY - 2, 44, 14, '#384088');
          }
          drawText(ctx, choiceState.options[i], optX, optY, {
            size: 8,
            color: selected ? '#f8f8f8' : '#a0a0a0',
            font: 'monospace',
          });
        }
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

      // Shop overlay
      renderShop(ctx, shop);

      // Heal text overlay
      if (healTextBox) renderTextBox(ctx, healTextBox);
    },
  };
}
