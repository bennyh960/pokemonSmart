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
import { t, isRTL, getLocale, setLocale } from '../i18n/i18n.js';
import type { Locale } from '../i18n/i18n.js';
import { getPlayerData, hasActiveGame, autoSave, healParty, updateLastPokemonCenter } from '../systems/game-state.js';
import { setPartyMode } from '../scenes/party.js';
import { setBagMode } from '../scenes/bag.js';
import { generateWildEncounter, createPokemonFromData, getEncounterRate } from '../systems/encounter.js';
import { getPokemon, getPokemonDisplayName } from '../services/pokemon-data.js';
import { setBattleData, setTrainerBattleData, type TrainerBattleData, type BattleContext } from './battle.js';
import { getPlayerSpriteSheet, getNPCSpriteImage } from '../engine/asset-generator.js';
import { loadCharacterSprites, getCharacterFrame, hasCharacter } from '../engine/character-sprites.js';
import { loadMap, setCurrentMapId } from '../systems/map-manager.js';
import { getTileset } from '../engine/tileset.js';
import { createShopState, openShop, updateShop, renderShop, type ShopState } from '../ui/shop.js';
import { createTextBox, updateTextBox, renderTextBox } from '../ui/text-box.js';
import { createNPCManager, type NPCData, type NPCManager, type TrainerData, checkTrainerLineOfSight, normalizeReward, type DialogueReward } from '../systems/npc.js';
import { getItem } from '../data/items.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H, TILE_SIZE, ADMIN_NAME } from '../engine/config.js';
const MOVE_DURATION = 0.2;
// Encounter chance is now per-map, loaded from encounter-tables.json via getEncounterRate()
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

  // Tracks where to return when exiting an interior map (e.g. Pokemon Center)
  let previousMapReturn: { mapId: string; x: number; y: number } | null = null;

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

  // Trainer approach state
  interface TrainerApproachState {
    trainer: TrainerData;
    phase: 'exclamation' | 'walking' | 'battle-start';
    timer: number;
    trainerPixelX: number;
    trainerPixelY: number;
    trainerStartX: number;
    trainerStartY: number;
    trainerTargetX: number;
    trainerTargetY: number;
    walkProgress: number;
    stepsRemaining: number;
    originalX: number;
    originalY: number;
  }
  let trainerApproach: TrainerApproachState | null = null;

  // NPC animation + auto-walk runtime state (keyed by NPC id)
  interface NPCRuntimeState {
    walkFrame: number;    // 0=stand, 1=walk-1, 2=walk-2
    walkTimer: number;
    moving: boolean;
    pixelX: number;
    pixelY: number;
    startPixelX: number;
    startPixelY: number;
    targetPixelX: number;
    targetPixelY: number;
    moveProgress: number;
    facing: string;
    // Auto-walk state
    autoWalkTimer: number;
    autoWalkSteps: number;    // steps taken in current direction
    autoWalkDir: number;      // 1 = forward, -1 = return
    autoWalkAxis: 'horizontal' | 'vertical' | null;
    autoWalkWaiting: boolean;
  }
  const npcStates = new Map<string, NPCRuntimeState>();

  function getNpcState(npc: NPCData): NPCRuntimeState {
    let st = npcStates.get(npc.id);
    if (!st) {
      st = {
        walkFrame: 0, walkTimer: 0, moving: false,
        pixelX: npc.x * TILE_SIZE, pixelY: npc.y * TILE_SIZE,
        startPixelX: npc.x * TILE_SIZE, startPixelY: npc.y * TILE_SIZE,
        targetPixelX: npc.x * TILE_SIZE, targetPixelY: npc.y * TILE_SIZE,
        moveProgress: 0, facing: npc.facing,
        autoWalkTimer: 0, autoWalkSteps: 0, autoWalkDir: 1,
        autoWalkAxis: null, autoWalkWaiting: false,
      };
      npcStates.set(npc.id, st);
    }
    return st;
  }

  function initPlayer(sx: number, sy: number): PlayerState {
    return {
      gridX: sx, gridY: sy, pixelX: sx * TILE_SIZE, pixelY: sy * TILE_SIZE,
      moving: false, targetGridX: sx, targetGridY: sy,
      startPixelX: sx * TILE_SIZE, startPixelY: sy * TILE_SIZE,
      moveProgress: 0, facing: 'ArrowDown',
      walkFrame: 0, walkTimer: 0,
    };
  }

  /** Derive a BattleContext from the current map properties. */
  function deriveBattleContext(): BattleContext {
    if (!currentMapData) return 'grass';
    const tableId = (currentMapData.encounterTableId ?? currentMapData.id ?? '').toLowerCase();
    if (tableId.includes('cave') || tableId.includes('tunnel')) return 'cave';
    if (tableId.includes('water') || tableId.includes('sea') || tableId.includes('lake')) return 'water';
    if (tableId.includes('gym')) return 'gym';
    if (tableId.includes('elite') || tableId.includes('league')) return 'elite';
    if (tableId.includes('city') || tableId.includes('town')) return 'city';
    if (tableId.includes('route') || tableId.includes('path')) return 'route';
    return 'grass';
  }

  function startEncounterTransition(wildPokemon: Pokemon): void {
    encounterTriggered = true;
    flashTimer = 0;
    flashPhase = 'flash';
    const playerData = getPlayerData();
    const playerPokemon = playerData.party[0];
    if (playerPokemon) setBattleData(playerPokemon, wildPokemon, deriveBattleContext());
  }

  /** Check if the player's current tile triggers a map transition. */
  function checkTransition(): boolean {
    if (!currentMapData?.transitions) return false;
    for (const tr of currentMapData.transitions) {
      if (tr.fromX === player.gridX && tr.fromY === player.gridY) {
        transitionState = 'fade-out';
        transitionTimer = 0;
        if (tr.returnToPrevious && previousMapReturn) {
          // Use saved return destination (e.g. exiting Pokemon Center)
          transitionTarget = { ...previousMapReturn };
        } else {
          // Save current position as return point before transitioning
          if (currentMapData.id) {
            previousMapReturn = { mapId: currentMapData.id, x: player.gridX, y: player.gridY + 1 };
          }
          transitionTarget = { mapId: tr.toMapId, x: tr.toX, y: tr.toY };
        }
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
          // Record this Pokemon Center as the respawn point
          if (previousMapReturn) {
            updateLastPokemonCenter(previousMapReturn.mapId, previousMapReturn.x, previousMapReturn.y);
          } else if (currentMapData?.id) {
            // Fallback: use current map position
            updateLastPokemonCenter(currentMapData.id, player.gridX, player.gridY);
          }
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
    } else if (interactingNPC.type === 'trainer') {
      // After dialogue, start battle if trainer not yet defeated
      const trainer = interactingNPC as unknown as TrainerData;
      interactingNPC = null;
      if (hasActiveGame()) {
        const flags = getPlayerData().flags;
        if (!flags[`trainer-${trainer.id}-defeated`]) {
          const trainerBattleData = buildTrainerBattleData(trainer);
          const playerData = getPlayerData();
          const playerPokemon = playerData.party[0];
          if (playerPokemon) {
            setTrainerBattleData(playerPokemon, trainerBattleData, deriveBattleContext());
            stateMachine.push('BATTLE');
          }
        }
      }
    } else {
      // Dialogue / generic NPC — check for item/money reward
      const npc = interactingNPC;
      interactingNPC = null;
      if (npc.reward && hasActiveGame()) {
        giveNPCReward(npc, npc.reward);
      }
    }
  }

  /** Deliver an NPC reward (items + money) if not already given. */
  function giveNPCReward(npc: NPCData, reward: DialogueReward): void {
    const pd = getPlayerData();
    const flagKey = reward.flag || `npc-${npc.id}-rewarded`;

    // Already given — skip
    if (pd.flags[flagKey]) return;

    // Build reward message lines
    const lines: string[] = [];

    // Give items
    if (reward.items) {
      for (const ri of reward.items) {
        pd.items[ri.itemId] = (pd.items[ri.itemId] || 0) + ri.quantity;
        const itemDef = getItem(ri.itemId);
        const displayName = itemDef ? t(itemDef.nameKey) : ri.itemId;
        lines.push(t('npc.reward.item', { item: displayName, qty: ri.quantity }));
      }
    }

    // Give money
    if (reward.money && reward.money > 0) {
      pd.money += reward.money;
      lines.push(t('npc.reward.money', { money: reward.money }));
    }

    // Mark as given
    pd.flags[flagKey] = true;
    autoSave();

    // Show reward message
    if (lines.length > 0) {
      activeTextBox = createTextBox(lines, isRTL());
    }
  }

  /** Start trainer approach: "!" bubble → walk toward player → battle. */
  function startTrainerApproach(trainer: TrainerData): void {
    // Calculate direction from trainer to player
    const dx = player.gridX - trainer.x;
    const dy = player.gridY - trainer.y;
    // Number of tiles to walk (stop 1 tile away from player)
    const dist = Math.max(Math.abs(dx), Math.abs(dy));
    const stepsToTake = dist - 1;

    trainerApproach = {
      trainer,
      phase: 'exclamation',
      timer: 0,
      trainerPixelX: trainer.x * TILE_SIZE,
      trainerPixelY: trainer.y * TILE_SIZE,
      trainerStartX: trainer.x * TILE_SIZE,
      trainerStartY: trainer.y * TILE_SIZE,
      trainerTargetX: trainer.x * TILE_SIZE,
      trainerTargetY: trainer.y * TILE_SIZE,
      walkProgress: 0,
      stepsRemaining: Math.max(0, stepsToTake),
      originalX: trainer.x,
      originalY: trainer.y,
    };
  }

  /** Map NPC spriteType to Showdown trainer sprite name. */
  const NPC_TO_TRAINER_SPRITE: Record<string, string> = {
    'trainer-m': 'youngster',
    'trainer-f': 'lass',
  };

  /** Build TrainerBattleData from a TrainerData NPC. */
  function buildTrainerBattleData(trainer: TrainerData): TrainerBattleData {
    const party = trainer.party.map(p => {
      const data = getPokemon(p.pokemonId);
      const pokemon = data
        ? createPokemonFromData(data, p.level, p.moves)
        : createPokemonFromData(getPokemon(19)!, p.level);
      return pokemon;
    });
    return {
      trainerName: trainer.name || trainer.id,
      trainerId: trainer.id,
      party,
      reward: normalizeReward(trainer.reward),
      trainerSprite: NPC_TO_TRAINER_SPRITE[trainer.spriteType],
    };
  }

  /** Load a map and set up the scene. */
  async function loadAndSetMap(mapId: string, spawnX: number, spawnY: number): Promise<void> {
    const data = await loadMap(mapId);
    currentMapData = data;
    const tileset = data.tileset ? getTileset(data.tileset) : null;
    tileMap = createTileMap(data as TileMapData, tileset);
    setCurrentMapId(mapId);

    // Load character spritesheets
    await loadCharacterSprites();

    // Load NPCs from map data
    npcManager = createNPCManager((data.npcs as NPCData[]) || []);
    npcStates.clear(); // reset runtime states for new map

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
    trainerApproach = null;

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
      trainerApproach = null;
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

      // Trainer approach animation
      if (trainerApproach) {
        const ta = trainerApproach;
        ta.timer += dt;

        if (ta.phase === 'exclamation') {
          // Show "!" for 0.8 seconds
          if (ta.timer >= 0.8) {
            ta.phase = 'walking';
            ta.timer = 0;
            // Start first step
            if (ta.stepsRemaining > 0) {
              const dirX = Math.sign(player.gridX - ta.trainer.x);
              const dirY = Math.sign(player.gridY - ta.trainer.y);
              ta.trainerStartX = ta.trainerPixelX;
              ta.trainerStartY = ta.trainerPixelY;
              ta.trainerTargetX = ta.trainerPixelX + dirX * TILE_SIZE;
              ta.trainerTargetY = ta.trainerPixelY + dirY * TILE_SIZE;
              ta.walkProgress = 0;
            } else {
              ta.phase = 'battle-start';
              ta.timer = 0;
            }
          }
        } else if (ta.phase === 'walking') {
          ta.walkProgress += dt / MOVE_DURATION;
          if (ta.walkProgress >= 1) {
            ta.trainerPixelX = ta.trainerTargetX;
            ta.trainerPixelY = ta.trainerTargetY;
            // Update NPC grid position
            ta.trainer.x = Math.round(ta.trainerPixelX / TILE_SIZE);
            ta.trainer.y = Math.round(ta.trainerPixelY / TILE_SIZE);
            ta.stepsRemaining--;
            if (ta.stepsRemaining > 0) {
              const dirX = Math.sign(player.gridX - ta.trainer.x);
              const dirY = Math.sign(player.gridY - ta.trainer.y);
              ta.trainerStartX = ta.trainerPixelX;
              ta.trainerStartY = ta.trainerPixelY;
              ta.trainerTargetX = ta.trainerPixelX + dirX * TILE_SIZE;
              ta.trainerTargetY = ta.trainerPixelY + dirY * TILE_SIZE;
              ta.walkProgress = 0;
            } else {
              ta.phase = 'battle-start';
              ta.timer = 0;
            }
          } else {
            ta.trainerPixelX = ta.trainerStartX + (ta.trainerTargetX - ta.trainerStartX) * ta.walkProgress;
            ta.trainerPixelY = ta.trainerStartY + (ta.trainerTargetY - ta.trainerStartY) * ta.walkProgress;
          }
        } else if (ta.phase === 'battle-start') {
          // Start the battle
          const trainerBattleData = buildTrainerBattleData(ta.trainer);
          const playerData = getPlayerData();
          const playerPokemon = playerData.party[0];
          if (playerPokemon) {
            setTrainerBattleData(playerPokemon, trainerBattleData, deriveBattleContext());
            // Reset trainer position back after battle
            ta.trainer.x = ta.originalX;
            ta.trainer.y = ta.originalY;
            trainerApproach = null;
            encounterTriggered = true;
            flashTimer = 0;
            flashPhase = 'flash';
          } else {
            trainerApproach = null;
          }
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

          if (tileMap.isEncounterTile(player.gridX, player.gridY)) {
            const encounterId = (currentMapData?.encounterTableId ?? currentMapData?.id) || 'test-map';
            if (Math.random() < getEncounterRate(encounterId)) {
              const wild = generateWildEncounter(encounterId);
              if (wild) { startEncounterTransition(wild); return; }
            }
          }

          // Check trainer line-of-sight after each step
          if (npcManager && hasActiveGame()) {
            const trainers = npcManager.getTrainers();
            const flags = getPlayerData().flags;
            const spotter = checkTrainerLineOfSight(trainers, player.gridX, player.gridY, flags);
            if (spotter) {
              startTrainerApproach(spotter);
              return;
            }
          }
        } else {
          player.pixelX = player.startPixelX + (player.targetGridX * TILE_SIZE - player.startPixelX) * player.moveProgress;
          player.pixelY = player.startPixelY + (player.targetGridY * TILE_SIZE - player.startPixelY) * player.moveProgress;
        }
      }

      // ── NPC auto-walk + animation update ──
      if (npcManager) {
        for (const npc of npcManager.getNPCs()) {
          const st = getNpcState(npc);

          // Update walk animation
          if (st.moving) {
            st.moveProgress += dt / MOVE_DURATION;
            st.walkTimer += dt;
            if (st.walkTimer >= 0.1) { st.walkTimer = 0; st.walkFrame = st.walkFrame === 1 ? 2 : 1; }

            if (st.moveProgress >= 1) {
              st.moveProgress = 1;
              st.pixelX = st.targetPixelX;
              st.pixelY = st.targetPixelY;
              npc.x = Math.round(st.pixelX / TILE_SIZE);
              npc.y = Math.round(st.pixelY / TILE_SIZE);
              st.moving = false;
              st.walkFrame = 0;
            } else {
              st.pixelX = st.startPixelX + (st.targetPixelX - st.startPixelX) * st.moveProgress;
              st.pixelY = st.startPixelY + (st.targetPixelY - st.startPixelY) * st.moveProgress;
            }
          }

          // Auto-walk logic
          const aw = npc.autoWalk;
          if (aw && !st.moving && !trainerApproach) {
            // Pick an axis to walk
            if (!st.autoWalkAxis) {
              if (aw.horizontal) st.autoWalkAxis = 'horizontal';
              else if (aw.vertical) st.autoWalkAxis = 'vertical';
            }

            const axis = st.autoWalkAxis;
            const cfg = axis === 'horizontal' ? aw.horizontal : axis === 'vertical' ? aw.vertical : null;
            if (cfg) {
              if (st.autoWalkWaiting) {
                st.autoWalkTimer += dt;
                if (st.autoWalkTimer >= cfg.delay) {
                  st.autoWalkWaiting = false;
                  st.autoWalkTimer = 0;
                }
              } else {
                // Determine next step direction
                let dx = 0, dy = 0;
                if (axis === 'horizontal') dx = st.autoWalkDir;
                else dy = st.autoWalkDir;

                const nextX = npc.x + dx;
                const nextY = npc.y + dy;

                // Don't walk into player or other NPCs
                const blocked = (nextX === player.gridX && nextY === player.gridY) ||
                  npcManager!.isNPCAt(nextX, nextY);

                if (!blocked && tileMap && tileMap.isWalkable(nextX, nextY)) {
                  // Start moving
                  st.startPixelX = st.pixelX;
                  st.startPixelY = st.pixelY;
                  st.targetPixelX = nextX * TILE_SIZE;
                  st.targetPixelY = nextY * TILE_SIZE;
                  st.moveProgress = 0;
                  st.moving = true;
                  st.facing = dx > 0 ? 'right' : dx < 0 ? 'left' : dy > 0 ? 'down' : 'up';
                  npc.facing = st.facing as NPCData['facing'];
                  st.autoWalkSteps++;

                  if (st.autoWalkSteps >= cfg.steps) {
                    // Reverse direction, wait
                    st.autoWalkDir *= -1;
                    st.autoWalkSteps = 0;
                    st.autoWalkWaiting = true;
                    st.autoWalkTimer = 0;

                    // Switch axis if both are configured
                    if (aw.horizontal && aw.vertical) {
                      st.autoWalkAxis = axis === 'horizontal' ? 'vertical' : 'horizontal';
                    }
                  }
                }
              }
            }
          }
        }
      }

      // NPC interaction: Enter/Space when not moving
      if (!player.moving && (input.isKeyPressed('Enter') || input.isKeyPressed(' '))) {
        if (npcManager) {
          const npc = npcManager.getFacingNPC(player.gridX, player.gridY, player.facing);
          if (npc && npc.dialogue.length > 0) {
            // Defeated trainers show different dialogue
            if (npc.type === 'trainer' && hasActiveGame()) {
              const flags = getPlayerData().flags;
              if (flags[`trainer-${npc.id}-defeated`]) {
                activeTextBox = createTextBox([t('trainer.defeated.dialogue')], isRTL());
                interactingNPC = null;
                return;
              }
            }
            activeTextBox = createTextBox(npc.dialogue, isRTL());
            interactingNPC = npc;
            return;
          }
        }
      }

      // P key → Party
      if (input.isKeyPressed('p') || input.isKeyPressed('P')) {
        setPartyMode('overworld');
        stateMachine.push('PARTY');
        return;
      }

      // D key → Pokedex
      if (input.isKeyPressed('d') || input.isKeyPressed('D')) {
        stateMachine.push('POKEDEX');
        return;
      }

      // B key → Bag
      if (input.isKeyPressed('b') || input.isKeyPressed('B')) {
        setBagMode('overworld');
        stateMachine.push('BAG');
        return;
      }

      // L key → Toggle language
      if (input.isKeyPressed('l') || input.isKeyPressed('L')) {
        const next: Locale = getLocale() === 'he' ? 'en' : 'he';
        setLocale(next);
        return;
      }

      // N key → Shop (admin-only debug shortcut)
      if (input.isKeyPressed('n') || input.isKeyPressed('N')) {
        if (hasActiveGame() && getPlayerData().name === ADMIN_NAME) {
          openShop(shop);
          return;
        }
      }

      // H key → Heal party (admin-only debug shortcut)
      if (input.isKeyPressed('h') || input.isKeyPressed('H')) {
        if (hasActiveGame() && getPlayerData().name === ADMIN_NAME) {
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

      // Collect renderables for Y-sorting (player + NPCs + placed objects)
      interface Renderable { y: number; render: () => void; }
      const renderables: Renderable[] = [];

      // Placed objects split into ground/body/above passes
      const objRenderables = tileMap.getObjectRenderables(ctx, camera.x, camera.y);
      // Ground-level objects (carpet, sand edges) render right after ground tiles
      for (const r of objRenderables.ground) r.render();
      // Body objects (trees, buildings) participate in Y-sort
      renderables.push(...objRenderables.body);

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
          const npcSt = getNpcState(npc);

          // Use runtime pixel position (supports auto-walk + trainer approach)
          let npcPixelX = npcSt.pixelX;
          let npcPixelY = npcSt.pixelY;
          if (trainerApproach && trainerApproach.trainer === npc) {
            npcPixelX = trainerApproach.trainerPixelX;
            npcPixelY = trainerApproach.trainerPixelY;
          }

          const renderY = npcPixelY;
          // Determine facing for rendering (convert from Arrow* format if needed)
          const facingDir = npcSt.facing.replace('Arrow', '').toLowerCase();

          // Determine walk pose — fall back to stand if walk frame is missing
          const poses = ['stand', 'walk-1', 'walk-2'];
          const pose = poses[npcSt.walkFrame % poses.length] || 'stand';

          // Try character sprite system first; if the walk frame is missing, use stand
          let charFrame: ReturnType<typeof getCharacterFrame> = null;
          if (hasCharacter(npc.spriteType)) {
            charFrame = getCharacterFrame(npc.spriteType, facingDir, pose);
            if (!charFrame && pose !== 'stand') {
              charFrame = getCharacterFrame(npc.spriteType, facingDir, 'stand');
            }
          }

          if (charFrame) {
            // Source frames may be any size (e.g. 32×32) but are always
            // rendered at TILE_SIZE×TILE_SIZE (16×16) in the game world.
            // drawImage scales the source rect down to the destination rect.
            const nx = Math.floor(npcPixelX - camera.x);
            const ny = Math.floor(npcPixelY - camera.y);

            renderables.push({
              y: renderY,
              render: () => {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(charFrame.image, charFrame.sx, charFrame.sy, charFrame.w, charFrame.h, nx, ny, TILE_SIZE, TILE_SIZE);
                // "!" exclamation during trainer approach
                if (trainerApproach && trainerApproach.trainer === npc && trainerApproach.phase === 'exclamation') {
                  fillRect(ctx, nx + 4, ny - 12, 8, 10, '#ffffff');
                  drawText(ctx, '!', nx + 5, ny - 11, { size: 8, color: '#ff0000', font: 'monospace' });
                }
              },
            });
          } else {
            // Fallback: old procedural 16x16 sprite
            const nx = Math.floor(npcPixelX - camera.x);
            const ny = Math.floor(npcPixelY - camera.y);
            renderables.push({
              y: renderY,
              render: () => {
                const sprite = getNPCSpriteImage(npc.spriteType);
                ctx.imageSmoothingEnabled = false;
                if (sprite.complete && sprite.naturalWidth > 0) {
                  ctx.drawImage(sprite, nx, ny, TILE_SIZE, TILE_SIZE);
                } else {
                  fillRect(ctx, nx, ny, TILE_SIZE, TILE_SIZE, '#FF8800');
                }
                if (trainerApproach && trainerApproach.trainer === npc && trainerApproach.phase === 'exclamation') {
                  fillRect(ctx, nx + 4, ny - 12, 8, 10, '#ffffff');
                  drawText(ctx, '!', nx + 5, ny - 11, { size: 8, color: '#ff0000', font: 'monospace' });
                }
              },
            });
          }
        }
      }

      // Sort by Y and render
      renderables.sort((a, b) => a.y - b.y);
      for (const r of renderables) r.render();

      // Render above layer (tree canopies, roof overhangs) on top of sprites
      tileMap.renderAbove(ctx, camera.x, camera.y);
      // Render placed object above rows (e.g. roof overhangs)
      for (const r of objRenderables.above) r.render();

      // HUD
      const mapName = currentMapData?.name || '';
      drawText(ctx, mapName, 4, 4, { size: 8, color: '#ffffff', font: 'monospace' });

      if (hasActiveGame()) {
        const lead = getPlayerData().party[0];
        if (lead) drawText(ctx, `${getPokemonDisplayName(lead.id)} ${t('hp.level', { level: lead.level })}`, 4, 14, { size: 8, color: '#aaccff', font: 'monospace' });
      }

      // Keyboard legend bar (bottom of screen, behind dialogues)
      if (!activeTextBox && !choiceState && !healTextBox && !shop.open && !encounterTriggered && transitionState === 'none') {
        const barY = SCREEN_H - 11;
        fillRect(ctx, 0, barY, SCREEN_W, 11, '#00000088');
        const isAdmin = hasActiveGame() && getPlayerData().name === ADMIN_NAME;
        const hints = isAdmin
          ? 'P:Party  D:Dex  B:Bag  L:Lang  N:Shop  H:Heal'
          : 'P:Party  D:Dex  B:Bag  L:Lang';
        drawText(ctx, hints, SCREEN_W / 2, barY + 2, {
          size: 6, color: '#aaaaaa', font: 'monospace', align: 'center',
        });
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
