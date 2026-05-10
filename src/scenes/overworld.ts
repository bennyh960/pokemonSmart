/**
 * OverworldScene - Top-down world exploration with grid-based movement.
 * Encounter triggers on tall grass tiles (10% chance per step).
 * Supports dynamic map loading, transitions, NPC interaction, shop and heal.
 */

import type { Scene, Pokemon, PokemonType } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { createTileMap, type TileMap, type TileMapData } from '../engine/tilemap.js';
import { createCamera, type Camera } from '../engine/camera.js';
import { clearScreen, fillRect, drawText } from '../engine/renderer.js';
import { initHUD, updateHUD, setHUDTab, showHUD, hideHUD } from '../ui/hud-overlay.js';
import { t, isRTL, getLocale, setLocale } from '../i18n/i18n.js';
import type { Locale } from '../i18n/i18n.js';
import {
  getPlayerData,
  hasActiveGame,
  autoSave,
  healParty,
  updateLastPokemonCenter,
  setFlag,
  consumeRestoreNotifications,
} from '../systems/game-state.js';
import { setPartyMode } from '../scenes/party.js';
import { setBagMode } from '../scenes/bag.js';
import { generateWildEncounter, createPokemonFromData, getEncounterRate } from '../systems/encounter.js';
import { getPokemon, getPokemonDisplayName, getLocalizedName, getNextEvolution } from '../services/pokemon-data.js';
import { setEvolutionData } from '../scenes/evolution.js';
import { setBattleData, setTrainerBattleData, type TrainerBattleData, type BattleContext } from './battle.js';
import { getPlayerSpriteSheet, getNPCSpriteImage } from '../engine/asset-generator.js';
import { loadCharacterSprites, getCharacterFrame, hasCharacter } from '../engine/character-sprites.js';
import { loadMap, setCurrentMapId, getCachedMap, getCurrentMapId } from '../systems/map-manager.js';
import type { MapId } from '../data/maps/map-ids.js';
import { getTileset } from '../engine/tileset.js';
import { createShopState, openShop, updateShop, renderShop, type ShopState } from '../ui/shop.js';
import { createTextBox, updateTextBox, renderTextBox } from '../ui/text-box.js';
import {
  createNPCManager,
  isNPCVisible,
  type NPCData,
  type NPCManager,
  type TrainerData,
  type GateGuardData,
  type WildPokemonData,
  checkTrainerLineOfSight,
  normalizeReward,
  resolveDialogue,
  type DialogueReward,
} from '../systems/npc.js';
import { getItem } from '../data/items.js';
import { getTypeName } from '../data/type-constants.js';
import type { BattleBackgroundId } from '../data/battle-backgrounds.js';
import { resolveInteract } from '../data/interact-types.js';
import {
  LOGICAL_WIDTH as SCREEN_W,
  LOGICAL_HEIGHT as SCREEN_H,
  TILE_SIZE,
  ADMIN_NAME,
  INFECTION_GLITCH_RATE,
} from '../engine/config.js';
import { findHMUser, canUseHM, checkSurfEligibility } from '../systems/hm.js';
import { getReencounterStatus, buildReencounterParty } from '../systems/reencounter.js';
import {
  isGateUnlocked,
  setActiveGate,
  fireStoryTrigger,
  consumePendingCutscene,
  consumePendingMessage,
  checkAndRecoverInterruptedEvent,
  applyCompletedEventNpcPositions,
} from '../systems/story-engine.js';
import {
  isCutsceneActive,
  activateCutscene,
  updateCutscene,
  renderCutscene,
  type CutsceneContext,
} from '../systems/cutscene-runner.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { setFlyCallback, FLY_DESTINATIONS } from './world-map.js';
import { openSaveSlots } from './save-slots.js';
import { mountInputMathOverlay } from '../systems/input-math-overlay.js';
import charactersManifest from '../data/sprites/characters.json';
import type { SimpleOpType } from '../math/simple-input-question.js';
import { getPlayerBirthYear, gradeFromBirthYear } from '../data/story/global-gate-config.js';
import { allTrainersDefeatedFlag } from '../data/story/flags.js';
const MOVE_DURATION = 0.2;
// Encounter chance is now per-map, loaded from encounter-tables.json via getEncounterRate()
const TRANSITION_FADE_TIME = 0.3;

const DIR_VECTORS: Record<string, { dx: number; dy: number }> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};

const DIR_TO_ROW: Record<string, number> = {
  ArrowDown: 0,
  ArrowUp: 1,
  ArrowLeft: 2,
  ArrowRight: 3,
};

type CutscenePathDir = 'up' | 'down' | 'left' | 'right';

const CUTSCENE_DIR_TO_FACING: Record<CutscenePathDir, PlayerState['facing']> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

const CUTSCENE_DIR_TO_VEC: Record<CutscenePathDir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

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
  walkFrame: number;
  walkTimer: number;
}

interface ChoiceState {
  options: string[];
  selected: number;
  callback: (idx: number) => void;
}

// Module-level state shared with the start menu scene
let _pendingFishing = false;
let _legendVisible = true;
let _playerRef: PlayerState | null = null;

export function scheduleFishing(): void {
  _pendingFishing = true;
}
export function isLegendVisible(): boolean {
  return _legendVisible;
}
export function toggleLegend(): void {
  _legendVisible = !_legendVisible;
}
export function setupWorldMapFly(): void {
  setFlyCallback(null);
}

/** Instantly move the player to a grid position — used by checkpoint recovery. */
export function teleportPlayerTo(x: number, y: number): void {
  if (!_playerRef) return;
  _playerRef.gridX = x;
  _playerRef.gridY = y;
  _playerRef.pixelX = x * TILE_SIZE;
  _playerRef.pixelY = y * TILE_SIZE;
  _playerRef.targetGridX = x;
  _playerRef.targetGridY = y;
}

export function createOverworldScene(input: InputManager, stateMachine: StateMachine, audio: AudioManager): Scene {
  let tileMap: TileMap | null = null;
  let currentMapData: TileMapData | null = null;
  let camera: Camera;
  let player: PlayerState;
  let encounterTriggered = false;
  let flashTimer = 0;
  let flashPhase: 'none' | 'flash' | 'black' = 'none';
  let exclamationFlashTimer = -1; // -1 = inactive; counts up from 0 when any NPC spots player

  // Map transition state
  let transitionState: 'none' | 'fade-out' | 'loading' | 'fade-in' = 'none';
  let transitionTarget: { mapId: string; x?: number; y?: number } | null = null;
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
  let pendingDialogueCallback: (() => void) | null = null;

  // Choice prompt state
  let choiceState: ChoiceState | null = null;

  // HM animation state
  interface HMAnimState {
    phase: 'pokemon-out' | 'action' | 'return' | 'done';
    pokemonId: number;
    pokemonSprite: HTMLImageElement | null;
    obstacleX: number;
    obstacleY: number;
    playerFacing: string;
    timer: number;
    flipSprite: boolean;
    spritePixelX: number;
    spritePixelY: number;
    spriteAlpha: number;
    flashAlpha: number;
    hmName: string;
    slashProgress: number;
    pendingTileRemoval: (() => void) | null;
  }
  let hmAnim: HMAnimState | null = null;
  let pendingHMAction: (() => void) | null = null;

  // Surf return animation (pokemon returning to pokeball on dismount)
  interface SurfReturnAnimState {
    timer: number;
    pokemonId: number;
    pokemonSprite: HTMLImageElement | null;
    alpha: number;
  }
  let surfReturnAnim: SurfReturnAnimState | null = null;

  // Surf mount animation (Pokemon appears at water tile then dives in)
  interface SurfMountAnimState {
    phase: 'pokemon-out' | 'dive' | 'done';
    pokemonId: number;
    pokemonSprite: HTMLImageElement | null;
    waterGridX: number;
    waterGridY: number;
    timer: number;
    alpha: number;
    scale: number;
    capturedPokemon: import('../types/index.js').Pokemon;
  }
  let surfMountAnim: SurfMountAnimState | null = null;

  // Brief flash when surf sprite activates + wave timer while surfing
  let surfFlashTimer = 0;
  let surfWaveTimer = 0;

  // Fly animation state
  interface FlyAnimState {
    phase: 'mount' | 'rise' | 'fadeout' | 'fadein' | 'land' | 'done';
    pokemonId: number;
    pokemonSprite: HTMLImageElement | null;
    timer: number;
    spriteScale: number;
    spriteAlpha: number;
    fadeAlpha: number;
    destMapId: string;
    destX: number;
    destY: number;
    spriteOffsetY: number;
    teleported: boolean;
  }
  let flyAnim: FlyAnimState | null = null;

  // Surf state
  let isCurrentlySurfing = false;
  let surfPokemonId: number | null = null;

  // Fishing state
  let fishingPhase: 'casting' | 'waiting' | 'bite' | null = null;
  let fishingTimer = 0;
  let fishingWaitDuration = 0;
  let fishingBobberOffset = 0;
  let fishingWaterGridX = 0;
  let fishingWaterGridY = 0;

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
  let pendingLOSBattle = false; // true when LOS-approach dialogue is showing; use flash transition in onDialogueEnd

  // Gate-guard approach state
  interface GateGuardApproachState {
    guard: import('../systems/npc.js').GateGuardData;
    phase: 'exclamation';
    timer: number;
  }
  let gateGuardApproach: GateGuardApproachState | null = null;

  // Party-guard approach state (NPC with despawnWhenParty that blocks until party is ready)
  interface PartyGuardApproachState {
    npc: NPCData;
    phase: 'exclamation';
    timer: number;
  }
  let partyGuardApproach: PartyGuardApproachState | null = null;
  let pendingPartyBack: { pushDx: number; pushDy: number } | null = null;

  // Cutscene: hide player sprite
  let playerHidden = false;
  let playerCutscenePathQueue: CutscenePathDir[] = [];
  let playerCutsceneWalking = false;

  // Pending push-back after gate scene dismissal without passing
  let pendingGateBack: { pushDx: number; pushDy: number; gateId: string } | null = null;

  // Blocks all input while an NPC math-question overlay is running
  let npcOverlayActive = false;

  // NPC facing restore: saves original facing when NPC turns toward player during dialogue
  const npcSavedFacing = new Map<string, string>();

  /** Returns the opposite direction (what an NPC should face to look at the player). */
  function oppositeDir(dir: string): string {
    switch (dir) {
      case 'up':
      case 'ArrowUp':
        return 'down';
      case 'down':
      case 'ArrowDown':
        return 'up';
      case 'left':
      case 'ArrowLeft':
        return 'right';
      case 'right':
      case 'ArrowRight':
        return 'left';
      default:
        return 'down';
    }
  }

  /** Build bilingual count lines for a mapClearBlocker NPC — one line per category (trainers / wild Pokémon). */
  function buildMapClearCountLines(locale: string): string[] {
    const mapId = getCurrentMapId();
    if (!mapId) return [];
    const mapData = getCachedMap(mapId);
    if (!mapData?.npcs) return [];
    const pd = getPlayerData();
    const lines: string[] = [];

    const trainerNpcs = mapData.npcs.filter((npc) => npc.type === 'trainer' && !npc.excludeFromMapClear);
    const trainerDefeated = trainerNpcs.filter((npc) => pd.flags[`trainer-${npc.id}-defeated`]).length;
    const trainerRemaining = trainerNpcs.length - trainerDefeated;
    if (trainerNpcs.length > 0 && trainerRemaining > 0) {
      lines.push(
        locale === 'he'
          ? `${trainerRemaining} מתוך ${trainerNpcs.length} מאמנים עדיין עומדים.`
          : `${trainerRemaining} of ${trainerNpcs.length} trainers still standing.`,
      );
    }

    const wildNpcs = mapData.npcs.filter((npc) => npc.type === 'wild-pokemon' && !npc.excludeFromMapClear);
    const wildDefeated = wildNpcs.filter((npc) => pd.flags[`trainer-${npc.id}-defeated`]).length;
    const wildRemaining = wildNpcs.length - wildDefeated;
    if (wildNpcs.length > 0 && wildRemaining > 0) {
      lines.push(
        locale === 'he'
          ? `${wildRemaining} מתוך ${wildNpcs.length} פוקימוני בר חוסמים את הדרך.`
          : `${wildRemaining} of ${wildNpcs.length} wild Pokémon blocking the path.`,
      );
    }

    return lines;
  }

  /** Turn an NPC to face the player, saving its original facing for later restore. */
  function turnNPCToPlayer(npc: NPCData): void {
    const st = getNpcState(npc);
    npcSavedFacing.set(npc.id, st.facing);
    const toward = oppositeDir(player.facing);
    st.facing = toward;
    npc.facing = toward as NPCData['facing'];
  }

  /** Restore an NPC's facing to what it was before dialogue. */
  function restoreNPCFacing(npc: NPCData): void {
    const saved = npcSavedFacing.get(npc.id);
    if (saved) {
      const st = getNpcState(npc);
      st.facing = saved;
      npc.facing = saved as NPCData['facing'];
      npcSavedFacing.delete(npc.id);
    }
  }

  // NPC animation + auto-walk runtime state (keyed by NPC id)
  interface NPCRuntimeState {
    walkFrame: number; // 0=stand, 1=walk-1, 2=walk-2
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
    // Pattern-based auto-walk state
    patternIndex: number; // current step in pattern
    stepsTaken: number; // steps taken in current pattern step
    patternWaiting: boolean; // waiting delay between pattern steps
    patternTimer: number; // delay timer
    patternDone: boolean; // true if non-looping pattern finished
    // Spawn/despawn phase patterns
    wasPreviouslyVisible: boolean; // tracks visibility changes
    // afterSpawn phase: plays once when NPC first becomes visible (persisted in flags)
    afterSpawnDone: boolean;
    afterSpawnIdx: number;
    afterSpawnSteps: number;
    afterSpawnWaiting: boolean;
    afterSpawnTimer: number;
    // beforeDespawn phase: plays once when despawn conditions first met (persisted in flags)
    isPreDespawning: boolean;
    beforeDespawnIdx: number;
    beforeDespawnSteps: number;
    beforeDespawnWaiting: boolean;
    beforeDespawnTimer: number;
    // Cutscene-driven path walking (animated, one tile per frame)
    cutscenePathQueue: Array<'up' | 'down' | 'left' | 'right'>;
    cutsceneWalking: boolean;
  }
  const npcStates = new Map<string, NPCRuntimeState>();

  function getNpcState(npc: NPCData): NPCRuntimeState {
    let st = npcStates.get(npc.id);
    if (!st) {
      const _initFlags = hasActiveGame() ? (getPlayerData().flags ?? {}) : {};
      st = {
        walkFrame: 0,
        walkTimer: 0,
        moving: false,
        pixelX: npc.x * TILE_SIZE,
        pixelY: npc.y * TILE_SIZE,
        startPixelX: npc.x * TILE_SIZE,
        startPixelY: npc.y * TILE_SIZE,
        targetPixelX: npc.x * TILE_SIZE,
        targetPixelY: npc.y * TILE_SIZE,
        moveProgress: 0,
        facing: npc.facing,
        patternIndex: 0,
        stepsTaken: 0,
        patternWaiting: false,
        patternTimer: 0,
        patternDone: false,
        wasPreviouslyVisible: isNPCVisible(npc, _initFlags, hasActiveGame() ? getPlayerData().party : undefined),
        // afterSpawnDone: persisted in flags so re-entering the map doesn't replay it
        afterSpawnDone: !!_initFlags[`npc-afterSpawn-done-${npc.id}`] || !npc.autoWalk?.afterSpawnPattern?.length,
        afterSpawnIdx: 0,
        afterSpawnSteps: 0,
        afterSpawnWaiting: false,
        afterSpawnTimer: 0,
        // If NPC is already invisible on scene init but beforeDespawn hasn't run yet
        // (e.g. returning from a trainer battle that just set the defeat flag),
        // start the beforeDespawn walk immediately rather than waiting for the
        // visible→invisible transition which will never fire on a fresh scene.
        // Guard: only apply if the NPC was actually spawnable (spawnAfter flag was set),
        // not when the NPC was simply never spawned yet (spawnAfter flag not set).
        isPreDespawning:
          !isNPCVisible(npc, _initFlags, hasActiveGame() ? getPlayerData().party : undefined) &&
          !_initFlags[`npc-beforeDespawn-done-${npc.id}`] &&
          !!npc.autoWalk?.beforeDespawnPattern?.length &&
          (!npc.spawnAfter || !!_initFlags[npc.spawnAfter]),
        beforeDespawnIdx: 0,
        beforeDespawnSteps: 0,
        beforeDespawnWaiting: false,
        beforeDespawnTimer: 0,
        cutscenePathQueue: [],
        cutsceneWalking: false,
      };
      npcStates.set(npc.id, st);
    }
    return st;
  }

  function initPlayer(sx: number, sy: number): PlayerState {
    return {
      gridX: sx,
      gridY: sy,
      pixelX: sx * TILE_SIZE,
      pixelY: sy * TILE_SIZE,
      moving: false,
      targetGridX: sx,
      targetGridY: sy,
      startPixelX: sx * TILE_SIZE,
      startPixelY: sy * TILE_SIZE,
      moveProgress: 0,
      facing: 'ArrowDown',
      walkFrame: 0,
      walkTimer: 0,
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

  function deriveBattleBackground(): BattleBackgroundId | null {
    return tileMap ? tileMap.getBattleBackground(player.gridX, player.gridY) : null;
  }

  function startEncounterTransition(wildPokemon: Pokemon): void {
    encounterTriggered = true;
    flashTimer = 0;
    flashPhase = 'flash';
    const playerData = getPlayerData();
    // Apply map infection → glitch chance
    const mapInfection = playerData.story?.mapInfection[getCurrentMapId() as MapId];
    if (mapInfection) {
      const glitchRate = INFECTION_GLITCH_RATE[mapInfection] ?? 0;
      if (Math.random() < glitchRate) wildPokemon.isGlitched = true;
    }
    const playerPokemon = playerData.party.find((p) => p.hp > 0);
    if (playerPokemon) setBattleData(playerPokemon, wildPokemon, deriveBattleContext(), deriveBattleBackground());
  }

  /** Check if the player's current tile triggers a map transition. */
  function checkTransition(): boolean {
    if (!currentMapData?.transitions) return false;
    for (const tr of currentMapData.transitions) {
      if (tr.fromX === player.gridX && tr.fromY === player.gridY) {
        if (currentMapData.id && hasActiveGame()) {
          fireStoryTrigger({ type: 'map-exit', mapId: currentMapData.id as MapId });
        }
        transitionState = 'fade-out';
        transitionTimer = 0;
        if (tr.returnToPrevious && previousMapReturn) {
          // Use saved return destination (e.g. exiting Pokemon Center)
          transitionTarget = { ...previousMapReturn };
        } else {
          // Save return point one step back from the transition tile
          // (so the player doesn't land on the transition again and loop)
          if (currentMapData.id) {
            const backVec = DIR_VECTORS[player.facing] || { dx: 0, dy: 0 };
            previousMapReturn = {
              mapId: currentMapData.id,
              x: player.gridX - backVec.dx,
              y: player.gridY - backVec.dy,
            };
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
    const npc = interactingNPC;

    if (npc.type === 'healer') {
      showChoice((idx) => {
        if (idx === 0) {
          healParty();
          audio.playSFX('pokecenter-heal');
          // Record this Pokemon Center as the respawn point
          if (previousMapReturn) {
            updateLastPokemonCenter(previousMapReturn.mapId, previousMapReturn.x, previousMapReturn.y);
          } else if (currentMapData?.id) {
            // Fallback: use current map position
            updateLastPokemonCenter(currentMapData.id, player.gridX, player.gridY);
          }
          autoSave();
          activeTextBox = createTextBox(
            [t('npc.nurse.done')],
            isRTL(),
            npc.name ? getLocalizedName(npc.name) : undefined,
          );
          restoreNPCFacing(npc);
          interactingNPC = null;
          // Process reward after healing (first interaction only)
          if (npc.reward && hasActiveGame()) {
            giveNPCReward(npc, npc.reward);
          }
        } else {
          restoreNPCFacing(npc);
          interactingNPC = null;
        }
      });
    } else if (npc.type === 'shopkeeper') {
      showChoice((idx) => {
        if (idx === 0) {
          // Process reward before opening shop (first interaction only)
          if (npc.reward && hasActiveGame()) {
            giveNPCReward(npc, npc.reward);
          }
          openShop(shop);
          hideHUD();
          restoreNPCFacing(npc);
          interactingNPC = null;
        } else {
          restoreNPCFacing(npc);
          interactingNPC = null;
        }
      });
    } else if (npc.type === 'trainer') {
      const trainer = npc as unknown as TrainerData;
      restoreNPCFacing(npc);
      interactingNPC = null;
      if (hasActiveGame()) {
        const trainerQ = (trainer as unknown as Record<string, unknown>).questions as
          | { count: number; types?: string[]; repeated?: boolean }
          | undefined;
        const flags = getPlayerData().flags;

        const runQuestionsOverlay = (onComplete: () => void) => {
          const appContainer = document.getElementById('app');
          if (appContainer && trainerQ && trainerQ.count > 0) {
            npcOverlayActive = true;
            const gradeId = gradeFromBirthYear(getPlayerBirthYear());
            mountInputMathOverlay({
              count: trainerQ.count,
              types: trainerQ.types as SimpleOpType[] | undefined,
              gradeId,
              birthYear: getPlayerBirthYear(),
              container: appContainer,
            }).then(() => {
              npcOverlayActive = false;
              onComplete();
            });
          } else {
            onComplete();
          }
        };

        if (!flags[`trainer-${trainer.id}-defeated`]) {
          // First encounter — run questions (if any) then start battle
          runQuestionsOverlay(() => {
            const trainerBattleData = buildTrainerBattleData(trainer, 0);
            const playerData = getPlayerData();
            const playerPokemon = playerData.party.find((p) => p.hp > 0);
            if (playerPokemon) {
              setTrainerBattleData(playerPokemon, trainerBattleData, deriveBattleContext(), deriveBattleBackground());
              if (pendingLOSBattle) {
                // LOS-initiated: use flash transition to match the trainer-spotted feel
                pendingLOSBattle = false;
                encounterTriggered = true;
                flashTimer = 0;
                flashPhase = 'flash';
              } else {
                stateMachine.change('BATTLE');
              }
            }
          });
        } else {
          // Already defeated — check re-encounter eligibility
          const status = getReencounterStatus(trainer);
          if (status.eligible) {
            const reencounterParty = buildReencounterParty(trainer, status.encounterIndex);
            const reencounterData = buildTrainerBattleData(trainer, status.encounterIndex, reencounterParty);
            const playerData = getPlayerData();
            const playerPokemon = playerData.party.find((p) => p.hp > 0);
            if (playerPokemon) {
              setTrainerBattleData(playerPokemon, reencounterData, deriveBattleContext(), deriveBattleBackground());
              stateMachine.change('BATTLE');
            }
          }
          // else: postFlagDialogue/default message already handled at interaction time — do nothing
        }
      }
    } else if (npc.type === 'wild-pokemon') {
      startWildNpcBattle(npc as unknown as WildPokemonData);
    } else if (npc.type === 'gate-guard') {
      // Blocking dialogue finished — launch the gate scene
      const guard = npc as unknown as GateGuardData;
      restoreNPCFacing(npc);
      interactingNPC = null;
      setActiveGate(guard.gateId);
      stateMachine.push('GATE');
    } else {
      // Dialogue / generic NPC
      restoreNPCFacing(npc);
      interactingNPC = null;
      if (!hasActiveGame()) return;

      const npcQ = (npc as unknown as Record<string, unknown>).questions as
        | { count: number; types?: string[]; repeated?: boolean }
        | undefined;
      const rewardedFlag = npc.reward?.flag ?? `npc-${npc.id}-rewarded`;
      const alreadyRewarded = !!getPlayerData().flags[rewardedFlag];

      // Already rewarded: only re-ask questions if repeated=true, then stop
      if (alreadyRewarded) {
        if (npcQ && npcQ.count > 0 && npcQ.repeated) {
          const appContainer = document.getElementById('app');
          if (appContainer) {
            npcOverlayActive = true;
            const gradeId = gradeFromBirthYear(getPlayerBirthYear());
            mountInputMathOverlay({
              count: npcQ.count,
              types: npcQ.types as SimpleOpType[] | undefined,
              gradeId,
              birthYear: getPlayerBirthYear(),
              container: appContainer,
            }).then(() => {
              npcOverlayActive = false;
              if (hasActiveGame()) fireStoryTrigger({ type: 'npc-interact', npcId: npc.id });
            });
            return;
          }
        }
        if (hasActiveGame()) fireStoryTrigger({ type: 'npc-interact', npcId: npc.id });
        return;
      }

      // Not yet rewarded: run questions (if any), then check condition, reward
      const resolveInteractionAndReward = () => {
        if (!npc.interaction) {
          giveNPCReward(npc, npc.reward ?? {});
          if (hasActiveGame()) fireStoryTrigger({ type: 'npc-interact', npcId: npc.id });
          return;
        }

        const rtl = isRTL();
        const npcSpeaker = npc.name ? getLocalizedName(npc.name) : undefined;
        const interaction = npc.interaction;

        if (interaction.kind === 'swap-pokemon') {
          // Step 1: show the request text immediately after dialogue/questions
          activeTextBox = createTextBox(
            [
              t('npc.interaction.swap.request', {
                want: getPokemonDisplayName(interaction.wantsId),
                offer: getPokemonDisplayName(interaction.offersId),
              }),
            ],
            rtl,
            npcSpeaker,
          );

          // Step 2: after request dismissed → auto-check party
          pendingDialogueCallback = () => {
            const pd = getPlayerData();
            const party = pd.party;
            const partyIdx = party.findIndex((p) => p.id === interaction.wantsId);

            if (partyIdx < 0) {
              const wantedName = getPokemonDisplayName(interaction.wantsId);
              activeTextBox = createTextBox([t('npc.interaction.swap.missing', { name: wantedName })], rtl);
              pendingDialogueCallback = () => {
                if (hasActiveGame()) fireStoryTrigger({ type: 'npc-interact', npcId: npc.id });
              };
              return;
            }

            // Step 3: player has it — show permanent-warning confirmation
            const yourPokemon = getPokemonDisplayName(party[partyIdx].id);
            const offerPokemon = getPokemonDisplayName(interaction.offersId);
            activeTextBox = createTextBox([t('npc.interaction.swap.confirm', { yourPokemon, offerPokemon })], rtl);

            pendingDialogueCallback = () => {
              showChoice((idx) => {
                if (idx === 0) {
                  const givenName = getPokemonDisplayName(party[partyIdx].id);
                  party.splice(partyIdx, 1);
                  const offerData = getPokemon(interaction.offersId);
                  if (offerData) {
                    const newPokemon = createPokemonFromData(offerData, interaction.level);
                    party.push(newPokemon);
                    const receivedName = getPokemonDisplayName(interaction.offersId);
                    activeTextBox = createTextBox(
                      [t('npc.interaction.swap.done', { given: givenName, received: receivedName })],
                      rtl,
                    );
                    pendingDialogueCallback = () => {
                      giveNPCReward(npc, npc.reward ?? {});
                      if (hasActiveGame()) fireStoryTrigger({ type: 'npc-interact', npcId: npc.id });
                    };
                  }
                } else {
                  if (hasActiveGame()) fireStoryTrigger({ type: 'npc-interact', npcId: npc.id });
                }
              });
            };
          };
        } else {
          // show-pokemon, show-types, trade-evolution: auto-check party, no request dialogue
          const conditionMet = checkNpcInteraction(npc);
          pendingDialogueCallback = () => {
            if (conditionMet) {
              giveNPCReward(npc, npc.reward ?? {});
            }
            if (hasActiveGame()) fireStoryTrigger({ type: 'npc-interact', npcId: npc.id });
          };
          // trade-evolution success has no dialogue — skip to callback immediately
          if (!activeTextBox) {
            const cb = pendingDialogueCallback;
            pendingDialogueCallback = null;
            cb();
          }
        }
      };

      if (npcQ && npcQ.count > 0) {
        const appContainer = document.getElementById('app');
        if (appContainer) {
          npcOverlayActive = true;
          const gradeId = gradeFromBirthYear(getPlayerBirthYear());
          mountInputMathOverlay({
            count: npcQ.count,
            types: npcQ.types as SimpleOpType[] | undefined,
            gradeId,
            birthYear: getPlayerBirthYear(),
            container: appContainer,
          }).then(() => {
            npcOverlayActive = false;
            resolveInteractionAndReward();
          });
          return;
        }
      }

      resolveInteractionAndReward();
    }
  }

  /**
   * Check if the NPC's interaction condition is met.
   * Shows the appropriate success/failure dialogue.
   * Returns true if the condition is met (caller should give reward), false otherwise.
   * Returns true when no interaction is defined.
   */
  function checkNpcInteraction(npc: NPCData): boolean {
    const interaction = npc.interaction;
    if (!interaction || !hasActiveGame()) return true;

    const pd = getPlayerData();
    const party = pd.party;
    const rtl = isRTL();

    switch (interaction.kind) {
      case 'show-pokemon': {
        const missing = interaction.pokemonIds.filter((id) => !party.some((p) => p.id === id));
        if (missing.length > 0) {
          const missingNames = missing.map((id) => getPokemonDisplayName(id)).join(', ');
          activeTextBox = createTextBox([t('npc.interaction.showPokemon.missing', { names: missingNames })], rtl);
          return false;
        }
        const presentNames = interaction.pokemonIds.map((id) => getPokemonDisplayName(id)).join(', ');
        activeTextBox = createTextBox([t('npc.interaction.showPokemon.success', { names: presentNames })], rtl);
        return true;
      }
      case 'show-types': {
        const matchCount = party.filter((p) => {
          const data = getPokemon(p.id);
          return data && data.types.some((type) => interaction.types.includes(type));
        }).length;
        const typesStr = interaction.types.map((tp) => getTypeName(tp as PokemonType)).join(', ');
        if (matchCount < interaction.count) {
          activeTextBox = createTextBox(
            [t('npc.interaction.showTypes.missing', { count: interaction.count, types: typesStr, has: matchCount })],
            rtl,
          );
          return false;
        }
        activeTextBox = createTextBox(
          [t('npc.interaction.showTypes.success', { count: interaction.count, types: typesStr, has: matchCount })],
          rtl,
        );
        return true;
      }
      case 'trade-evolution': {
        for (const pokemon of party) {
          const evo = getNextEvolution(pokemon.id);
          if (evo && evo.trigger === 'trade') {
            setEvolutionData(pokemon, evo);
            stateMachine.push('EVOLUTION');
            return true;
          }
        }
        activeTextBox = createTextBox([t('npc.interaction.tradeEvo.nothing')], rtl);
        return false;
      }
      case 'swap-pokemon':
        return false;
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
      audio.playItemFound();
      for (const ri of reward.items) {
        pd.items[ri.itemId] = (pd.items[ri.itemId] || 0) + ri.quantity;
        const itemDef = getItem(ri.itemId);
        const displayName = itemDef ? getLocalizedName(itemDef.name) : ri.itemId;
        lines.push(t('npc.reward.item', { item: displayName, qty: ri.quantity }));
        // Key items auto-set their flag when received
        if (itemDef?.keyFlag) {
          setFlag(pd, itemDef.keyFlag);
        }
      }
    }

    // Give money
    if (reward.money && reward.money > 0) {
      pd.money += reward.money;
      lines.push(t('npc.reward.money', { money: reward.money }));
    }

    // Award badge
    if (reward.badge !== undefined && reward.badge >= 1 && reward.badge <= 8) {
      pd.badges |= 1 << (reward.badge - 1);
      lines.push(t('npc.reward.badge', { badge: reward.badge }));
    }

    // Set story event flag
    if (reward.storyEvent) {
      setFlag(pd, reward.storyEvent);
    }

    // Mark as given
    setFlag(pd, flagKey);
    void fireStoryTrigger({ type: 'flag-set', flag: flagKey });
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

    audio.playTrainerSpot();
    exclamationFlashTimer = 0;
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

  /** Build the CutsceneContext used by the cutscene runner to poke overworld state. */
  function buildCutsceneContext(): CutsceneContext {
    return {
      getNPCById(id) {
        return npcManager?.getNPCs().find((n) => n.id === id);
      },
      setNPCFacing(npc, dir) {
        npc.facing = dir as 'up' | 'down' | 'left' | 'right';
        getNpcState(npc).facing = dir;
      },
      setNPCHidden(id, hidden) {
        const npc = npcManager?.getNPCs().find((n) => n.id === id);
        if (npc) npc.hidden = hidden;
        if (hasActiveGame()) {
          const pd = getPlayerData();
          if (hidden) {
            setFlag(pd, `npc-hidden-${id}`);
          } else {
            delete pd.flags[`npc-hidden-${id}`];
          }
        }
      },
      setPlayerHidden(hidden) {
        playerHidden = hidden;
      },
      moveNPCAlongPath(npc, path) {
        const st = getNpcState(npc);
        st.cutscenePathQueue = [...path];
        st.cutsceneWalking = path.length > 0;
        if (path.length > 0) {
          npc.facing = path[0];
          st.facing = path[0];
        }
      },
      isNPCWalking(id) {
        const npc = npcManager?.getNPCs().find((n) => n.id === id);
        if (!npc) return false;
        return getNpcState(npc).cutsceneWalking;
      },
      movePlayerAlongPath(path) {
        playerCutscenePathQueue = [...path];
        playerCutsceneWalking = path.length > 0;
        if (path.length > 0) {
          player.facing = CUTSCENE_DIR_TO_FACING[path[0]];
        }
      },
      isPlayerWalking() {
        return playerCutsceneWalking || player.moving;
      },
      snapCamera(x, y) {
        if (camera && tileMap) camera.snapTo(x, y, tileMap.width * TILE_SIZE, tileMap.height * TILE_SIZE);
      },
      panCamera(x, y, _durationMs) {
        if (camera && tileMap) camera.snapTo(x, y, tileMap.width * TILE_SIZE, tileMap.height * TILE_SIZE);
      },
      playMusic(id) {
        audio.playMusic(id);
      },
      stopMusic() {
        audio.stopMusic?.();
      },
      playSFX(id) {
        audio.playSFX(id);
      },
      executeStoryAction(action) {
        if (!hasActiveGame()) return;
        const pd = getPlayerData();
        switch (action.type) {
          case 'set-flag':
            pd.flags[action.flag] = action.value ?? true;
            break;
          case 'give-item':
            pd.items[action.itemId] = (pd.items[action.itemId] || 0) + action.quantity;
            break;
          case 'give-money':
            pd.money += action.amount;
            break;
          case 'set-quest':
            if (pd.story) {
              const prevQuestId = pd.story.activeQuestId;
              pd.story.activeQuestId = action.questId;
              if (action.questId && action.questId !== prevQuestId) {
                setHUDTab(2);
                updateHUD(buildHUDData());
              }
            }
            break;
          case 'complete-quest':
            if (pd.story) {
              if (!pd.story.completedQuestIds.includes(action.questId)) {
                pd.story.completedQuestIds.push(action.questId);
              }
              if (pd.story.activeQuestId === action.questId) {
                pd.story.activeQuestId = null;
              }
            }
            break;
          case 'start-cutscene':
            activateCutscene(action.cutsceneId);
            break;
          case 'play-music':
            audio.playMusic(action.musicId);
            break;
          // Other actions deferred to story-engine
        }
      },
      getFlag(flag) {
        if (!hasActiveGame()) return false;
        return !!getPlayerData().flags[flag];
      },
      startScene(sceneId) {
        stateMachine.change(sceneId as import('../types/index.js').SceneId);
      },
    };
  }

  /** Start gate-guard approach: show "!" bubble, then dialogue, then gate scene. */
  function startGateGuardApproach(guard: import('../systems/npc.js').GateGuardData): void {
    audio.playTrainerSpot();
    exclamationFlashTimer = 0;
    gateGuardApproach = { guard, phase: 'exclamation', timer: 0 };
  }

  /** Map NPC spriteType to Showdown trainer sprite name. */
  const NPC_TO_TRAINER_SPRITE: Record<string, string> = {
    'trainer-m': 'youngster',
    'trainer-f': 'lass',
  };

  /** Build TrainerBattleData from a TrainerData NPC.
   * @param encounterIndex 0 = first fight, 1+ = rematch
   * @param prebuiltParty  optional pre-scaled party (from buildReencounterParty)
   */
  function buildTrainerBattleData(
    trainer: TrainerData,
    encounterIndex = 0,
    prebuiltParty?: import('../types/index.js').Pokemon[],
  ): TrainerBattleData {
    let party: import('../types/index.js').Pokemon[];
    if (prebuiltParty) {
      party = prebuiltParty;
    } else if (trainer.party.length > 6) {
      // Pool mode: separate forced slots from random pool, then pick 6
      type PartyMember = typeof trainer.party[0];
      const forcedSlots: (PartyMember | null)[] = [null, null, null, null, null, null];
      const pool: PartyMember[] = [];

      for (const m of trainer.party) {
        const slot = (m as { mustInclude?: number | null }).mustInclude;
        if (slot != null && slot >= 0 && slot <= 5) forcedSlots[slot] = m;
        else pool.push(m);
      }

      const slotsNeeded = forcedSlots.filter(Boolean).length < 6
        ? 6 - forcedSlots.filter(Boolean).length
        : 0;

      // Shuffle pool and pick type-diverse members for remaining slots
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const picked: PartyMember[] = [];
      const seenTypes = new Set<string>();
      for (const m of shuffled) {
        if (picked.length >= slotsNeeded) break;
        const data = getPokemon(m.pokemonId);
        const memberTypes = data?.types ?? [];
        if (memberTypes.some((t) => !seenTypes.has(t))) {
          picked.push(m);
          memberTypes.forEach((t) => seenTypes.add(t));
        }
      }
      // Fill any remaining slots regardless of type
      for (const m of shuffled) {
        if (picked.length >= slotsNeeded) break;
        if (!picked.includes(m)) picked.push(m);
      }

      // Build final 6-slot array: forced slots at their positions, pool fills gaps
      const finalSlots: (PartyMember | null)[] = [...forcedSlots];
      let pi = 0;
      for (let s = 0; s < 6; s++) {
        if (!finalSlots[s] && pi < picked.length) finalSlots[s] = picked[pi++];
      }

      party = finalSlots
        .filter((m): m is PartyMember => m !== null)
        .map((p) => {
          const data = getPokemon(p.pokemonId);
          const pokemon = data
            ? createPokemonFromData(data, p.level, p.moves)
            : createPokemonFromData(getPokemon(19)!, p.level);
          if (trainer.isGlitched) pokemon.isGlitched = true;
          return pokemon;
        });
    } else {
      party = trainer.party.map((p) => {
        const data = getPokemon(p.pokemonId);
        const pokemon = data
          ? createPokemonFromData(data, p.level, p.moves)
          : createPokemonFromData(getPokemon(19)!, p.level);
        if (trainer.isGlitched) pokemon.isGlitched = true;
        return pokemon;
      });
    }

    // Register phone contact after first defeat (called lazily when building re-encounter data)
    if (encounterIndex === 0 && trainer.reencounter) {
      // We'll do this in battle.ts after win — see recordTrainerDefeat
      // But proactively register if trainer has phone config
    }

    return {
      trainerName: trainer.name ??
        (charactersManifest.characters as Record<string, { name?: { en: string; he: string } }>)[trainer.spriteType]
          ?.name ?? { en: trainer.id, he: trainer.id },
      trainerId: trainer.id,
      party,
      reward: normalizeReward(trainer.reward),
      trainerSprite: NPC_TO_TRAINER_SPRITE[trainer.spriteType],
      postBattleDialogue: trainer.postBattleDialogue,
      postFlagDialogue: trainer.postFlagDialogue,
      reencounterIndex: encounterIndex,
      hasReencounter: !!trainer.reencounter,
      locationEn: trainer.location?.en,
      locationHe: trainer.location?.he,
      aiLevel: trainer.aiLevel,
      bagItems: trainer.bagItems,
      trainerSpriteType: trainer.spriteType,
    };
  }

  /** Start a wild Pokémon NPC battle (no trainer intro, catch allowed, flee possible). */
  function startWildNpcBattle(npc: WildPokemonData): void {
    if (!hasActiveGame()) return;
    const flags = getPlayerData().flags;
    if (flags[`trainer-${npc.id}-defeated`]) return; // already despawned

    const data = getPokemon(npc.pokemonId);
    if (!data) return;
    const wildPokemon = createPokemonFromData(data, npc.level, npc.moves);
    wildPokemon.isGlitched = npc.isGlitched ?? false;

    const playerData = getPlayerData();
    const playerPokemon = playerData.party.find((p) => p.hp > 0);
    if (!playerPokemon) return;

    setTrainerBattleData(
      playerPokemon,
      {
        trainerName: npc.name ?? { en: npc.id, he: npc.id },
        trainerId: npc.id,
        party: [wildPokemon],
        reward: { money: 0 },
        isWildNpc: true,
        fleeAfterTurns: npc.fleeAfterTurns,
        fleeAtHpPct: npc.fleeAtHpPct,
      },
      deriveBattleContext(),
      deriveBattleBackground(),
    );
    stateMachine.change('BATTLE');
  }

  /** Draw cut slash effect. */
  function drawCutSlash(ctx: CanvasRenderingContext2D, cx: number, cy: number, progress: number): void {
    if (progress <= 0) return;
    const len = TILE_SIZE * progress;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.beginPath();
    ctx.moveTo(cx - len, cy - len);
    ctx.lineTo(cx + len, cy + len);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + len, cy - len);
    ctx.lineTo(cx - len, cy + len);
    ctx.stroke();
    ctx.restore();
  }

  /** Draw strength stomp/impact effect. */
  function drawStrengthEffect(ctx: CanvasRenderingContext2D, cx: number, cy: number, progress: number): void {
    if (progress <= 0) return;
    ctx.save();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.max(0, 1 - progress);
    const r = TILE_SIZE * progress;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /** Start the HM animation sequence. */
  function startHMAnimation(
    hmName: string,
    pokemon: import('../types/index.js').Pokemon,
    obsX: number,
    obsY: number,
  ): void {
    const flipSprite = player.facing === 'ArrowRight';

    // Try to step back one tile (opposite of facing)
    const faceVec = DIR_VECTORS[player.facing];
    if (faceVec) {
      const backX = player.gridX - faceVec.dx;
      const backY = player.gridY - faceVec.dy;
      const _hmPd = hasActiveGame() ? getPlayerData() : null;
      if (
        tileMap &&
        tileMap.isWalkable(backX, backY) &&
        !npcManager?.isVisibleNPCAt(backX, backY, _hmPd?.flags ?? {}, _hmPd?.party)
      ) {
        player.gridX = backX;
        player.gridY = backY;
        player.pixelX = backX * TILE_SIZE;
        player.pixelY = backY * TILE_SIZE;
        player.targetGridX = backX;
        player.targetGridY = backY;
        player.moving = false;
      }
    }

    const spritePath = `/sprites/pokemon/front/${pokemon.id}.png`;

    hmAnim = {
      phase: 'pokemon-out',
      pokemonId: pokemon.id,
      pokemonSprite: getCachedImage(spritePath),
      obstacleX: obsX,
      obstacleY: obsY,
      playerFacing: player.facing,
      timer: 0,
      flipSprite,
      spritePixelX: obsX * TILE_SIZE,
      spritePixelY: obsY * TILE_SIZE,
      spriteAlpha: 0,
      flashAlpha: 0,
      hmName,
      slashProgress: 0,
      pendingTileRemoval: () => {
        // Remove the object from the map
        if (currentMapData?.objects) {
          const objIdx = currentMapData.objects.findIndex((o) => o.x === obsX && o.y === obsY);
          if (objIdx >= 0) currentMapData.objects.splice(objIdx, 1);
        }
        // Persist the removal via flags so it survives map reload
        if (hasActiveGame()) {
          const pd = getPlayerData();
          setFlag(pd, `${hmName}-${obsX}-${obsY}`);
          autoSave();
        }
      },
    };

    // Start loading sprite if not cached yet
    loadImage(spritePath)
      .then((img) => {
        if (hmAnim && hmAnim.pokemonId === pokemon.id) {
          hmAnim.pokemonSprite = img;
        }
      })
      .catch(() => {
        /* sprite load failure is non-fatal */
      });
  }

  /** Start the Fly animation sequence. */
  function startFlyAnimation(pokemon: import('../types/index.js').Pokemon, destMapId: string): void {
    const destSpawn = getCachedMap(destMapId)?.spawn ?? { x: 5, y: 5 };
    const spritePath = `/sprites/pokemon/front/${pokemon.id}.png`;
    flyAnim = {
      phase: 'mount',
      pokemonId: pokemon.id,
      pokemonSprite: getCachedImage(spritePath),
      timer: 0,
      spriteScale: 1,
      spriteAlpha: 0,
      fadeAlpha: 0,
      destMapId,
      destX: destSpawn.x,
      destY: destSpawn.y,
      spriteOffsetY: 0,
      teleported: false,
    };
    loadImage(spritePath)
      .then((img) => {
        if (flyAnim && flyAnim.pokemonId === pokemon.id) flyAnim.pokemonSprite = img;
      })
      .catch(() => {
        /* non-fatal */
      });
  }

  /** Start surfing on a Pokemon — moves player onto the facing water tile. */
  function startSurfing(pokemon: import('../types/index.js').Pokemon, skipFlash = false): void {
    isCurrentlySurfing = true;
    surfPokemonId = pokemon.id;
    audio.playSFX('splash');
    if (!skipFlash) surfFlashTimer = 0.35;

    // Step player forward onto the water tile they were facing
    const faceVec = DIR_VECTORS[player.facing];
    if (faceVec) {
      player.gridX += faceVec.dx;
      player.gridY += faceVec.dy;
      player.pixelX = player.gridX * TILE_SIZE;
      player.pixelY = player.gridY * TILE_SIZE;
      player.targetGridX = player.gridX;
      player.targetGridY = player.gridY;
      player.moving = false;
    }

    // Persist so surf survives battle transitions (enter() re-runs on return from battle)
    if (hasActiveGame()) {
      const pd = getPlayerData();
      pd.surfing = true;
      pd.surfingPokemonId = pokemon.id;
      pd.position.x = player.gridX;
      pd.position.y = player.gridY;
    }
  }

  /** Stop surfing (dismount) — clears runtime surf state. */
  function stopSurfing(): void {
    isCurrentlySurfing = false;
    surfPokemonId = null;
    surfWaveTimer = 0;
  }

  /** Start the surf mount animation — Pokemon appears at water tile, then dives in as surf activates. */
  function startSurfMountAnimation(pokemon: import('../types/index.js').Pokemon, waterX: number, waterY: number): void {
    const spritePath = `/sprites/pokemon/front/${pokemon.id}.png`;
    surfMountAnim = {
      phase: 'pokemon-out',
      pokemonId: pokemon.id,
      pokemonSprite: getCachedImage(spritePath),
      waterGridX: waterX,
      waterGridY: waterY,
      timer: 0,
      alpha: 0,
      scale: 1,
      capturedPokemon: pokemon,
    };
    loadImage(spritePath)
      .then((img) => {
        if (surfMountAnim?.pokemonId === pokemon.id) surfMountAnim.pokemonSprite = img;
      })
      .catch(() => {
        /* non-fatal */
      });
  }

  /** Returns true only if the tile itself is categorised as water (category === 'water').
   *  Walkable ground tiles (beach sand, cave sand) that happen to have water encounter
   *  types are NOT fishing tiles — the player must face real water to cast a line. */
  function isTileWater(gx: number, gy: number): boolean {
    return tileMap?.getTileCategory(gx, gy) === 'water';
  }

  /** Attempt to start fishing — validates rod, bait, and facing direction. */
  function tryStartFishing(): void {
    if (!tileMap || !currentMapData) return;
    const pd = getPlayerData();
    const dir = DIR_VECTORS[player.facing] || { dx: 0, dy: 1 };
    const wx = player.gridX + dir.dx;
    const wy = player.gridY + dir.dy;
    const onWater = isTileWater(player.gridX, player.gridY);
    const adjWater = isTileWater(wx, wy);

    if (!onWater && !adjWater) {
      activeTextBox = createTextBox([t('fishing.noWater')], isRTL());
      return;
    }
    if (!pd.items['fishing-rod'] || pd.items['fishing-rod'] <= 0) {
      activeTextBox = createTextBox([t('fishing.noRod')], isRTL());
      return;
    }
    if (!pd.items['fishing-bait'] || pd.items['fishing-bait'] <= 0) {
      activeTextBox = createTextBox([t('fishing.noBait')], isRTL());
      return;
    }

    pd.items['fishing-bait']--;
    if (pd.items['fishing-bait'] <= 0) delete pd.items['fishing-bait'];
    autoSave();

    if (adjWater) {
      fishingWaterGridX = wx;
      fishingWaterGridY = wy;
    } else {
      fishingWaterGridX = player.gridX;
      fishingWaterGridY = player.gridY;
    }
    fishingPhase = 'casting';
    fishingTimer = 0;
    fishingWaitDuration = 1.5 + Math.random() * 2.5;
    fishingBobberOffset = 0;
  }

  /** Advance fishing state machine each frame. */
  function updateFishing(dt: number): void {
    if (!fishingPhase) return;
    fishingTimer += dt;

    if (fishingPhase === 'casting') {
      if (fishingTimer >= 0.8) {
        fishingPhase = 'waiting';
        fishingTimer = 0;
      }
      return;
    }

    if (fishingPhase === 'waiting') {
      fishingBobberOffset = Math.sin(fishingTimer * 3.5) * 2;
      const FISHING_RANDOMNESS = 0.5; // adjust to make bites more or less frequent
      if (fishingTimer >= fishingWaitDuration) {
        if (Math.random() < FISHING_RANDOMNESS) {
          fishingPhase = 'bite';
          fishingTimer = 0;
          activeTextBox = createTextBox([t('fishing.bite')], isRTL());
          pendingHMAction = () => {
            const encId = (currentMapData?.encounterTableId ?? currentMapData?.id) || 'test-map';
            const wild = generateWildEncounter(encId, ['water']);
            fishingPhase = null;
            if (wild) {
              startEncounterTransition(wild);
            } else {
              activeTextBox = createTextBox([t('fishing.escaped')], isRTL());
            }
          };
        } else {
          fishingPhase = null;
          activeTextBox = createTextBox([t('fishing.escaped')], isRTL());
        }
      }
    }
  }

  /** Load a map and set up the scene. */
  async function loadAndSetMap(mapId: string, spawnX?: number, spawnY?: number): Promise<void> {
    const data = await loadMap(mapId);
    currentMapData = data;
    const tileset = data.tileset ? getTileset(data.tileset) : null;

    // Filter out collected item objects and already-cut/moved obstacles
    if (data.objects && tileset && hasActiveGame()) {
      const flags = getPlayerData().flags;
      data.objects = data.objects.filter((obj) => {
        const def = tileset.getTile(obj.key);
        if (def?.interactType?.id === 'item') {
          const flagKey = obj.interactArgs?.flag || `obj-${mapId}-${obj.key}-${obj.x}-${obj.y}-collected`;
          return !flags[flagKey];
        }
        // Remove already-cut trees or already-moved boulders
        if (flags[`cut-${obj.x}-${obj.y}`] || flags[`strength-${obj.x}-${obj.y}`]) {
          return false;
        }
        return true;
      });
    }

    tileMap = createTileMap(data as TileMapData, tileset);
    setCurrentMapId(mapId);

    // Load character spritesheets
    await loadCharacterSprites();

    // Load NPCs from map data
    npcManager = createNPCManager((data.npcs as NPCData[]) || []);
    // mapClearBlocker: implicit blocker + despawnAfter all-trainers-defeated-{mapId}
    {
      const _clearFlag = allTrainersDefeatedFlag(mapId);
      for (const npc of npcManager.getNPCs()) {
        if ((npc as unknown as Record<string, unknown>).mapClearBlocker) {
          if (!npc.blocker) npc.blocker = true;
          if (!npc.despawnAfter) npc.despawnAfter = _clearFlag;
        }
      }
    }
    npcStates.clear(); // reset runtime states for new map
    npcSavedFacing.clear();

    // Replay completed cutscene steps (move-npc, hide-npc) on every map load so
    // NPCs stay at their post-cutscene positions/visibility after transitions.
    if (hasActiveGame()) {
      applyCompletedEventNpcPositions(
        (id) => {
          const npc = npcManager?.getNPCs().find((n) => n.id === id) ?? null;
          return npc ? { x: npc.x, y: npc.y } : null;
        },
        (id, x, y) => {
          const npc = npcManager?.getNPCs().find((n) => n.id === id);
          if (npc) {
            npc.x = x;
            npc.y = y;
          }
        },
        (id) => {
          const npc = npcManager?.getNPCs().find((n) => n.id === id);
          if (npc) npc.hidden = true;
        },
      );
    }

    // Detect whether this is a same-map re-entry (battle return) vs. a real map change
    const _prevMapId = hasActiveGame() ? getPlayerData().position.mapId : null;
    const _isSameMapEntry = _prevMapId !== null && _prevMapId === mapId;

    if (!_isSameMapEntry) {
      setHUDTab(0);
    }

    player = initPlayer(spawnX ?? data.spawn.x, spawnY ?? data.spawn.y);
    _playerRef = player;
    camera = createCamera(SCREEN_W, SCREEN_H);
    const cx = player.pixelX + TILE_SIZE / 2;
    const cy = player.pixelY + TILE_SIZE / 2;
    camera.snapTo(cx, cy, tileMap.width * TILE_SIZE, tileMap.height * TILE_SIZE);

    // Play map music
    audio.playMusic(currentMapData.music || 'town');

    // Fire map-enter story trigger
    if (currentMapData.id) fireStoryTrigger({ type: 'map-enter', mapId: currentMapData.id as MapId });

    // Reset interaction state
    activeTextBox = null;
    interactingNPC = null;
    choiceState = null;
    healTextBox = null;
    trainerApproach = null;
    pendingLOSBattle = false;
    gateGuardApproach = null;
    pendingGateBack = null;
    partyGuardApproach = null;
    pendingPartyBack = null;
    playerHidden = false;
    hmAnim = null;
    pendingHMAction = null;
    surfReturnAnim = null;
    surfMountAnim = null;

    // Clear runtime surf state (will be restored below if same-map re-entry on water)
    stopSurfing();
    if (!_isSameMapEntry && hasActiveGame()) {
      // Real map change — clear surf persistence too
      const _mcPd = getPlayerData();
      _mcPd.surfing = false;
      _mcPd.surfingPokemonId = null;
    }

    // Restore surf state when returning from battle (same map, player still on water tile)
    if (_isSameMapEntry && hasActiveGame()) {
      const _rsPd = getPlayerData();
      if (_rsPd.surfing && (_rsPd.surfingPokemonId ?? null) !== null && isTileWater(player.gridX, player.gridY)) {
        isCurrentlySurfing = true;
        surfPokemonId = _rsPd.surfingPokemonId!;
      } else if (_rsPd.surfing) {
        // Was surfing but not on water anymore (edge case) — clear
        _rsPd.surfing = false;
        _rsPd.surfingPokemonId = null;
      }
    }

    // Auto-save on area entry
    if (hasActiveGame()) {
      const pd = getPlayerData();
      pd.position.x = player.gridX;
      pd.position.y = player.gridY;
      pd.position.mapId = mapId;
      pd.previousMapReturn = previousMapReturn;

      // Track city visits for Fly destination list
      if (FLY_DESTINATIONS.includes(mapId)) {
        setFlag(pd, `visited-${mapId}`);
      }

      autoSave();
    }
  }

  /** Build the data payload for the HTML HUD overlay. */
  function buildHUDData() {
    const pd = hasActiveGame() ? getPlayerData() : null;
    const p0 = pd?.party[0];
    return {
      mapName: currentMapData?.label,
      // Snapshot primitive values so the change-detector in updateHUD
      // can see differences — passing the live object reference means
      // lastData.lead.hp mutates in place and the comparison always ties.
      lead: p0 ? { id: p0.id, level: p0.level, hp: p0.hp, maxHp: p0.maxHp } : null,
      questId: pd?.story?.activeQuestId ?? null,
    };
  }

  return {
    enter(): void {
      initHUD();
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
      pendingLOSBattle = false;
      hmAnim = null;
      pendingHMAction = null;
      flyAnim = null;
      surfReturnAnim = null;
      surfMountAnim = null;
      surfFlashTimer = 0;
      surfWaveTimer = 0;
      // Reset runtime surf state only — pd.surfing is preserved so loadAndSetMap can restore it
      isCurrentlySurfing = false;
      surfPokemonId = null;
      mapLoading = true;

      // Determine which map to load
      let mapId = 'zeroville/zeroville';
      let spawnX = 15;
      let spawnY = 12;

      if (hasActiveGame()) {
        const pd = getPlayerData();
        mapId = pd.position.mapId || 'zeroville/zeroville';
        spawnX = pd.position.x;
        spawnY = pd.position.y;
        previousMapReturn = pd.previousMapReturn ?? null;
      }

      loadAndSetMap(mapId, spawnX, spawnY)
        .then(() => {
          mapLoading = false;
          // Check for a cutscene event interrupted by a page refresh and re-run it.
          // Pass a callback to restore the player's in-scene grid position without
          // creating a circular import between overworld and story-engine.
          void checkAndRecoverInterruptedEvent((x, y) => teleportPlayerTo(x, y));
        })
        .catch((err) => {
          console.error('Failed to load map, falling back to test-map:', err);
          loadAndSetMap('test-map', 10, 10).then(() => {
            mapLoading = false;
          });
        });
    },

    exit(): void {
      console.log('Exiting overworld, saving game...');
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
      if (mapLoading || !tileMap) {
        return;
      }

      // console.log(stateMachine.currentId());
      // if (stateMachine.currentId() === 'OVERWORLD') {
      //   showHUD();
      // } else {
      //   hideHUD();
      // }

      // ── Cutscene runner: takes full control of input ──
      if (isCutsceneActive()) {
        // hideHUD();
        updateCutscene(dt, input, buildCutsceneContext());

        if (player.moving) {
          player.moveProgress += dt / MOVE_DURATION;
          player.walkTimer += dt;
          if (player.walkTimer >= 0.1) {
            player.walkTimer = 0;
            player.walkFrame = player.walkFrame === 1 ? 2 : 1;
          }

          if (player.moveProgress >= 1) {
            player.moveProgress = 1;
            player.gridX = player.targetGridX;
            player.gridY = player.targetGridY;
            player.pixelX = player.gridX * TILE_SIZE;
            player.pixelY = player.gridY * TILE_SIZE;
            player.moving = false;
            player.walkFrame = 0;
            if (hasActiveGame()) {
              const _stepPd = getPlayerData();
              _stepPd.position.x = player.gridX;
              _stepPd.position.y = player.gridY;
            }
            if (playerCutscenePathQueue.length === 0) {
              playerCutsceneWalking = false;
            }
          } else {
            player.pixelX =
              player.startPixelX + (player.targetGridX * TILE_SIZE - player.startPixelX) * player.moveProgress;
            player.pixelY =
              player.startPixelY + (player.targetGridY * TILE_SIZE - player.startPixelY) * player.moveProgress;
          }
        }

        if (playerCutsceneWalking && !player.moving && playerCutscenePathQueue.length > 0) {
          const dir = playerCutscenePathQueue.shift()!;
          const vec = CUTSCENE_DIR_TO_VEC[dir];

          player.facing = CUTSCENE_DIR_TO_FACING[dir];
          player.moving = true;
          player.targetGridX = player.gridX + vec.dx;
          player.targetGridY = player.gridY + vec.dy;
          player.startPixelX = player.pixelX;
          player.startPixelY = player.pixelY;
          player.moveProgress = 0;
          player.walkTimer = 0;
          player.walkFrame = 1;
        }

        if (playerCutsceneWalking && !player.moving && playerCutscenePathQueue.length === 0) {
          playerCutsceneWalking = false;
        }

        // Advance NPC cutscene walk animations so move-npc steps can complete.
        // The main NPC update loop is skipped during cutscenes, so we run only
        // the walk-progress and cutscene-path-queue parts here.
        if (npcManager) {
          const _csFlags = hasActiveGame() ? getPlayerData().flags : {};
          const _csParty = hasActiveGame() ? getPlayerData().party : undefined;
          for (const npc of npcManager.getNPCs()) {
            const st = getNpcState(npc);
            // Track when an NPC becomes visible during a cutscene (flag set via
            // action step). Without this, wasPreviouslyVisible stays false, so
            // the main loop never detects the visible→invisible transition when
            // the cutscene ends, and beforeDespawnPattern never fires.
            if (!st.wasPreviouslyVisible && isNPCVisible(npc, _csFlags, _csParty)) {
              st.wasPreviouslyVisible = true;
            }
            // An NPC in isPreDespawning that isn't yet moving will never advance
            // its walk pattern during a cutscene (the main loop is paused). Mark
            // it done immediately so it stays hidden and doesn't reappear on re-entry.
            if (st.isPreDespawning && !st.moving) {
              st.isPreDespawning = false;
              if (hasActiveGame() && !getPlayerData().flags[`npc-beforeDespawn-done-${npc.id}`]) {
                setFlag(getPlayerData(), `npc-beforeDespawn-done-${npc.id}`);
                autoSave();
              }
              continue;
            }
            if (!st.cutsceneWalking && !st.moving) continue;
            if (st.moving) {
              st.moveProgress += dt / MOVE_DURATION;
              st.walkTimer += dt;
              if (st.walkTimer >= 0.1) {
                st.walkTimer = 0;
                st.walkFrame = st.walkFrame === 1 ? 2 : 1;
              }
              if (st.moveProgress >= 1) {
                st.moveProgress = 1;
                st.pixelX = st.targetPixelX;
                st.pixelY = st.targetPixelY;
                npc.x = Math.round(st.pixelX / TILE_SIZE);
                npc.y = Math.round(st.pixelY / TILE_SIZE);
                st.moving = false;
                st.walkFrame = 0;
                if (st.cutscenePathQueue.length === 0) st.cutsceneWalking = false;
              } else {
                st.pixelX = st.startPixelX + (st.targetPixelX - st.startPixelX) * st.moveProgress;
                st.pixelY = st.startPixelY + (st.targetPixelY - st.startPixelY) * st.moveProgress;
              }
            }
            if (st.cutsceneWalking && !st.moving && st.cutscenePathQueue.length > 0) {
              const dir = st.cutscenePathQueue.shift()!;
              const dx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
              const dy = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
              npc.facing = dir;
              st.facing = dir;
              st.startPixelX = st.pixelX;
              st.startPixelY = st.pixelY;
              st.targetPixelX = (npc.x + dx) * TILE_SIZE;
              st.targetPixelY = (npc.y + dy) * TILE_SIZE;
              st.moveProgress = 0;
              st.moving = true;
            }
          }
        }
        return;
      }

      // Check for pending cutscene queued by story engine.
      // Guard: only activate once the map is fully visible (transition + fly done),
      // otherwise the cutscene's return short-circuits the transition timer and
      // the black fade-in overlay freezes on screen indefinitely.
      if (transitionState === 'none' && !flyAnim) {
        const pendingCutsceneId = consumePendingCutscene();
        if (pendingCutsceneId) {
          activateCutscene(pendingCutsceneId);
          return;
        }
      }

      // Check for pending message queued by story engine (show-message action)
      const pendingMsg = consumePendingMessage();
      if (pendingMsg && !activeTextBox) {
        activeTextBox = createTextBox(
          pendingMsg.map((l) => (getLocale() === 'he' ? l.he : l.en)),
          isRTL(),
        );
        return;
      }

      // Check for stolen Pokemon restoration notifications
      if (!activeTextBox) {
        const restoreNotifs = consumeRestoreNotifications();
        if (restoreNotifs.length > 0) {
          const lines = restoreNotifs.map((n) =>
            n.sentToBox
              ? t('battle.pokemonRestoredBox', { name: n.pokemonName })
              : t('battle.pokemonRestored', { name: n.pokemonName }),
          );
          activeTextBox = createTextBox(lines, isRTL());
          return;
        }
      }

      // NPC question overlay blocks all game input while active
      if (npcOverlayActive) return;

      // Fishing scheduled from the start menu
      if (_pendingFishing && !fishingPhase) {
        _pendingFishing = false;
        tryStartFishing();
        return;
      }

      // Shop overlay takes priority
      if (shop.open) {
        updateShop(shop, input, dt);
        if (!shop.open) showHUD(); // shop just closed
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
          if (pendingHMAction) {
            const action = pendingHMAction;
            pendingHMAction = null;
            action();
          } else if (pendingDialogueCallback) {
            const cb = pendingDialogueCallback;
            pendingDialogueCallback = null;
            cb();
          } else if (interactingNPC) {
            onDialogueEnd();
          }
        }
        return;
      }

      // Fishing animation — freeze movement while casting / waiting
      if (fishingPhase === 'casting' || fishingPhase === 'waiting') {
        if (input.isKeyPressed('Escape')) {
          fishingPhase = null;
        } else {
          updateFishing(dt);
          return;
        }
      }

      // Fly animation update — blocks all other input
      if (flyAnim) {
        const fa = flyAnim;
        fa.timer += dt;
        if (fa.phase === 'mount') {
          // 0.4s: Pokemon sprite fades in beside player
          fa.spriteAlpha = Math.min(1, fa.timer / 0.3);
          if (fa.timer >= 0.4) {
            fa.phase = 'rise';
            fa.timer = 0;
          }
        } else if (fa.phase === 'rise') {
          // 0.6s: rises up, scales down
          const progress = Math.min(fa.timer / 0.6, 1);
          fa.spriteOffsetY = -progress * TILE_SIZE * 4;
          fa.spriteScale = 1 - progress * 0.7; // 1 → 0.3
          if (fa.timer >= 0.6) {
            fa.phase = 'fadeout';
            fa.timer = 0;
          }
        } else if (fa.phase === 'fadeout') {
          // 0.3s: screen fades to black + pokemon fades out
          const progress = Math.min(fa.timer / 0.3, 1);
          fa.fadeAlpha = progress;
          fa.spriteAlpha = 1 - progress;
          if (!fa.teleported && fa.timer >= 0.15) {
            // Teleport mid-fade so it's invisible
            fa.teleported = true;
            mapLoading = true;
            loadAndSetMap(fa.destMapId, fa.destX, fa.destY)
              .then(() => {
                mapLoading = false;
              })
              .catch((err) => {
                console.error('Fly teleport failed:', err);
                mapLoading = false;
                flyAnim = null;
              });
          }
          if (fa.timer >= 0.3) {
            fa.phase = 'fadein';
            fa.timer = 0;
            fa.fadeAlpha = 1;
            fa.spriteAlpha = 0;
            fa.spriteScale = 0.3;
            fa.spriteOffsetY = -TILE_SIZE * 4;
          }
        } else if (fa.phase === 'fadein') {
          // 0.3s: screen fades from black to visible
          fa.fadeAlpha = Math.max(0, 1 - fa.timer / 0.3);
          if (fa.timer >= 0.3) {
            fa.phase = 'land';
            fa.timer = 0;
            fa.fadeAlpha = 0;
          }
        } else if (fa.phase === 'land') {
          // 0.5s: Pokemon descends, scale grows 0.3 → 1, fades in
          const progress = Math.min(fa.timer / 0.5, 1);
          fa.spriteOffsetY = -TILE_SIZE * 4 * (1 - progress);
          fa.spriteScale = 0.3 + progress * 0.7; // 0.3 → 1
          fa.spriteAlpha = progress;
          if (fa.timer >= 0.5) {
            fa.phase = 'done';
          }
        } else if (fa.phase === 'done') {
          flyAnim = null;
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
            loadAndSetMap(transitionTarget.mapId, transitionTarget.x, transitionTarget.y)
              .then(() => {
                mapLoading = false;
                transitionState = 'fade-in';
                transitionTimer = 0;
              })
              .catch((err) => {
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
        if (flashPhase === 'flash' && flashTimer >= 0.4) {
          flashPhase = 'black';
          flashTimer = 0;
        }
        if (flashPhase === 'black' && flashTimer >= 0.3) {
          encounterTriggered = false;
          flashPhase = 'none';
          stateMachine.change('BATTLE');
        }
        return;
      }

      // Push player back after gate dismissal without passing
      if (pendingGateBack) {
        const pb = pendingGateBack;
        pendingGateBack = null;
        if (!isGateUnlocked(pb.gateId)) {
          const bx = player.gridX + pb.pushDx;
          const by = player.gridY + pb.pushDy;
          const _gbPd = hasActiveGame() ? getPlayerData() : null;
          if (
            tileMap &&
            tileMap.isWalkable(bx, by) &&
            !npcManager?.isVisibleNPCAt(bx, by, _gbPd?.flags ?? {}, _gbPd?.party)
          ) {
            player.moving = true;
            player.targetGridX = bx;
            player.targetGridY = by;
            player.startPixelX = player.pixelX;
            player.startPixelY = player.pixelY;
            player.moveProgress = 0;
            player.walkTimer = 0;
            player.walkFrame = 1;
          }
        }
      }

      // Push player back after party-guard blocks them
      if (pendingPartyBack) {
        const pb = pendingPartyBack;
        pendingPartyBack = null;
        const bx = player.gridX + pb.pushDx;
        const by = player.gridY + pb.pushDy;
        const _pbPd = hasActiveGame() ? getPlayerData() : null;
        if (
          tileMap &&
          tileMap.isWalkable(bx, by) &&
          !npcManager?.isVisibleNPCAt(bx, by, _pbPd?.flags ?? {}, _pbPd?.party)
        ) {
          player.moving = true;
          player.targetGridX = bx;
          player.targetGridY = by;
          player.startPixelX = player.pixelX;
          player.startPixelY = player.pixelY;
          player.moveProgress = 0;
          player.walkTimer = 0;
          player.walkFrame = 1;
        }
      }

      // Tick exclamation flash overlay
      if (exclamationFlashTimer >= 0) exclamationFlashTimer += dt;

      // Party-guard approach animation (exclamation → dialogue → push back)
      if (partyGuardApproach) {
        const pga = partyGuardApproach;
        pga.timer += dt;
        if (pga.phase === 'exclamation' && pga.timer >= 0.8) {
          partyGuardApproach = null;
          turnNPCToPlayer(pga.npc);
          // Store push-back direction (opposite of player's current facing)
          const facingVec = DIR_VECTORS[player.facing];
          if (facingVec) {
            pendingPartyBack = { pushDx: -facingVec.dx, pushDy: -facingVec.dy };
          }
          interactingNPC = pga.npc;
          activeTextBox = createTextBox(
            resolveDialogue(pga.npc.dialogue, getLocale()),
            isRTL(),
            pga.npc.name ? getLocalizedName(pga.npc.name) : undefined,
          );
        }
        return;
      }

      // Gate-guard approach animation (exclamation → dialogue → gate scene)
      if (gateGuardApproach) {
        const ga = gateGuardApproach;
        ga.timer += dt;
        if (ga.phase === 'exclamation' && ga.timer >= 0.8) {
          gateGuardApproach = null;
          // Face guard toward player
          turnNPCToPlayer(ga.guard);
          // Store push-back direction (opposite of player's facing)
          const facingVec = DIR_VECTORS[player.facing];
          if (facingVec) {
            pendingGateBack = { gateId: ga.guard.gateId, pushDx: -facingVec.dx, pushDy: -facingVec.dy };
          }
          // Show blocking dialogue → onDialogueEnd will push GATE scene
          interactingNPC = ga.guard;
          activeTextBox = createTextBox(
            resolveDialogue(ga.guard.dialogue, getLocale()),
            isRTL(),
            ga.guard.name ? getLocalizedName(ga.guard.name) : undefined,
          );
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
            audio.playTrainerStep();
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
          // Push player back 1 step (opposite of facing direction) before dialogue/battle
          const _tbFaceVec = DIR_VECTORS[player.facing];
          if (_tbFaceVec) {
            const _tbBackX = player.gridX - _tbFaceVec.dx;
            const _tbBackY = player.gridY - _tbFaceVec.dy;
            const _tbPd = hasActiveGame() ? getPlayerData() : null;
            if (
              tileMap &&
              tileMap.isWalkable(_tbBackX, _tbBackY) &&
              !npcManager?.isVisibleNPCAt(_tbBackX, _tbBackY, _tbPd?.flags ?? {}, _tbPd?.party)
            ) {
              player.gridX = _tbBackX;
              player.gridY = _tbBackY;
              player.pixelX = _tbBackX * TILE_SIZE;
              player.pixelY = _tbBackY * TILE_SIZE;
              player.targetGridX = _tbBackX;
              player.targetGridY = _tbBackY;
              player.moving = false;
            }
          }
          // Reset trainer to original tile
          ta.trainer.x = ta.originalX;
          ta.trainer.y = ta.originalY;
          trainerApproach = null;

          // Fire npc-interact story trigger (mirrors player-initiated flow)
          if (hasActiveGame()) {
            fireStoryTrigger({ type: 'npc-interact', npcId: ta.trainer.id });
          }

          const _taTrainer = ta.trainer as unknown as NPCData;
          const playerData = getPlayerData();
          const playerPokemon = playerData.party.find((p) => p.hp > 0);
          if (_taTrainer.dialogue.length > 0 && hasActiveGame()) {
            // Show trainer's pre-battle dialogue; onDialogueEnd will handle questions + flash + battle
            turnNPCToPlayer(_taTrainer);
            interactingNPC = _taTrainer;
            pendingLOSBattle = true;
            activeTextBox = createTextBox(
              resolveDialogue(_taTrainer.dialogue, getLocale()),
              isRTL(),
              _taTrainer.name ? getLocalizedName(_taTrainer.name) : undefined,
            );
          } else if (playerPokemon) {
            // No dialogue — start battle directly with flash transition
            setTrainerBattleData(
              playerPokemon,
              buildTrainerBattleData(ta.trainer, 0),
              deriveBattleContext(),
              deriveBattleBackground(),
            );
            encounterTriggered = true;
            flashTimer = 0;
            flashPhase = 'flash';
          }
        }
        return;
      }

      // HM animation update
      if (hmAnim) {
        const anim: HMAnimState = hmAnim;
        anim.timer += dt;
        const animPhase = anim.phase;
        if (animPhase === 'pokemon-out') {
          anim.spriteAlpha = Math.min(1, anim.timer / 0.3);
          if (anim.timer >= 0.4) {
            anim.phase = 'action';
            anim.timer = 0;
          }
        } else if (animPhase === 'action') {
          anim.slashProgress = anim.timer / 0.5;
          anim.flashAlpha = Math.max(0, 1 - anim.timer / 0.15);
          if (anim.timer >= 0.5) {
            anim.pendingTileRemoval?.();
            anim.pendingTileRemoval = null;
            audio.playSFX(anim.hmName === 'surf' ? 'splash' : 'hit');
            anim.phase = 'return';
            anim.timer = 0;
          }
        } else if (animPhase === 'return') {
          anim.spriteAlpha = Math.max(0, 1 - anim.timer / 0.3);
          if (anim.timer >= 0.4) {
            anim.phase = 'done';
          }
        } else if (animPhase === 'done') {
          hmAnim = null;
        }
        return;
      }

      // Surf mount animation — Pokemon appears at water tile then dives in
      if (surfMountAnim) {
        const ma = surfMountAnim;
        ma.timer += dt;
        if (ma.phase === 'pokemon-out') {
          ma.alpha = Math.min(1, ma.timer / 0.4);
          if (ma.timer >= 0.5) {
            ma.phase = 'dive';
            ma.timer = 0;
            startSurfing(ma.capturedPokemon, true); // snap player to water tile, skip flash
          }
        } else if (ma.phase === 'dive') {
          const t = ma.timer / 0.35;
          ma.alpha = Math.max(0, 1 - t);
          ma.scale = Math.max(0.05, 1 - t * 0.95);
          if (ma.timer >= 0.35) ma.phase = 'done';
        } else {
          surfMountAnim = null;
        }
        // Camera follows player even during the animation (player snaps to water tile mid-anim)
        if (tileMap) {
          const _maCx = player.pixelX + TILE_SIZE / 2;
          const _maCy = player.pixelY + TILE_SIZE / 2;
          camera.follow(_maCx, _maCy, tileMap.width * TILE_SIZE, tileMap.height * TILE_SIZE, dt);
        }
        return;
      }

      // Surf return animation tick (Pokemon fading back into its Poké Ball)
      if (surfReturnAnim) {
        surfReturnAnim.timer += dt;
        surfReturnAnim.alpha = Math.max(0, 1 - surfReturnAnim.timer / 0.5);
        if (surfReturnAnim.timer >= 0.5) surfReturnAnim = null;
      }

      // Surf transition flash + wave timer
      if (surfFlashTimer > 0) surfFlashTimer = Math.max(0, surfFlashTimer - dt);
      if (isCurrentlySurfing) surfWaveTimer += dt;
      else surfWaveTimer = 0;

      if (player.moving) {
        player.moveProgress += dt / MOVE_DURATION;
        // Walk animation
        player.walkTimer += dt;
        if (player.walkTimer >= 0.1) {
          player.walkTimer = 0;
          player.walkFrame = player.walkFrame === 1 ? 2 : 1;
        }
        if (player.moveProgress >= 1) {
          player.moveProgress = 1;
          player.gridX = player.targetGridX;
          player.gridY = player.targetGridY;
          player.pixelX = player.gridX * TILE_SIZE;
          player.pixelY = player.gridY * TILE_SIZE;
          player.moving = false;
          player.walkFrame = 0;

          // Keep pd.position in sync so checkpoint saves capture the real position.
          if (hasActiveGame()) {
            const _stepPd = getPlayerData();
            _stepPd.position.x = player.gridX;
            _stepPd.position.y = player.gridY;
          }

          // Check for map transition first
          if (checkTransition()) return;

          // Auto-dismount surf when stepping onto a non-water tile (category check, not encounter types)
          if (isCurrentlySurfing && !isTileWater(player.gridX, player.gridY)) {
            const dismountId = surfPokemonId;
            stopSurfing();
            if (hasActiveGame()) {
              const _dmPd = getPlayerData();
              _dmPd.surfing = false;
              _dmPd.surfingPokemonId = null;
            }
            if (dismountId !== null) {
              const spritePath = `/sprites/pokemon/front/${dismountId}.png`;
              surfReturnAnim = {
                timer: 0,
                pokemonId: dismountId,
                pokemonSprite: getCachedImage(spritePath),
                alpha: 1,
              };
              loadImage(spritePath)
                .then((img) => {
                  if (surfReturnAnim?.pokemonId === dismountId) surfReturnAnim.pokemonSprite = img;
                })
                .catch(() => {
                  /* non-fatal */
                });
              activeTextBox = createTextBox(
                [t('hm.surf.returned', { name: getPokemonDisplayName(dismountId) })],
                isRTL(),
              );
              audio.playSFX('pokeball-return');
            }
          }

          const tileEncTypes = tileMap.getEncounterTypes(player.gridX, player.gridY);
          if (tileEncTypes) {
            const encounterId = (currentMapData?.encounterTableId ?? currentMapData?.id) || 'test-map';
            const repelActive = hasActiveGame() && getPlayerData().repelStepsRemaining > 0;
            if (!repelActive && Math.random() < getEncounterRate(encounterId)) {
              // Pass water encounter filter when surfing
              const encFilter = isCurrentlySurfing ? ['water'] : tileEncTypes;
              const wild = generateWildEncounter(encounterId, encFilter);
              if (wild) {
                startEncounterTransition(wild);
                return;
              }
            }
          }

          // Decrement repel counter AFTER encounter check (so the last step still has protection)
          if (hasActiveGame()) {
            const _repPd = getPlayerData();
            _repPd.totalSteps++;
            if (_repPd.repelStepsRemaining > 0) {
              _repPd.repelStepsRemaining--;
              if (_repPd.repelStepsRemaining === 0) {
                activeTextBox = createTextBox([t('repel.woreOff')], isRTL());
                autoSave();
              }
            }
          }

          // Check trainer line-of-sight after each step
          if (npcManager && hasActiveGame()) {
            const trainers = npcManager.getTrainers();
            const _losPd = getPlayerData();
            const spotter = checkTrainerLineOfSight(trainers, player.gridX, player.gridY, _losPd.flags, _losPd.party);
            if (spotter) {
              startTrainerApproach(spotter);
              return;
            }
          }

          // Check wild Pokémon NPC collision — battle starts on same tile
          if (npcManager && hasActiveGame() && !encounterTriggered) {
            const flags = getPlayerData().flags;
            const _wParty = getPlayerData().party;
            for (const npc of npcManager.getNPCs()) {
              if (npc.type !== 'wild-pokemon') continue;
              if (!isNPCVisible(npc, flags, _wParty)) continue;
              if (flags[`trainer-${npc.id}-defeated`]) continue;
              if (npc.x === player.gridX && npc.y === player.gridY) {
                interactingNPC = npc;
                startWildNpcBattle(npc as unknown as WildPokemonData);
                return;
              }
            }
          }

          // Check gate-guard line-of-sight after each step
          if (npcManager && hasActiveGame() && !gateGuardApproach) {
            const guardFacingVecs: Record<string, { dx: number; dy: number }> = {
              up: { dx: 0, dy: -1 },
              down: { dx: 0, dy: 1 },
              left: { dx: -1, dy: 0 },
              right: { dx: 1, dy: 0 },
            };
            const flags = getPlayerData().flags;
            const _gParty = getPlayerData().party;
            for (const npc of npcManager.getNPCs()) {
              if (npc.type !== 'gate-guard') continue;
              if (!isNPCVisible(npc, flags, _gParty)) continue;
              const guard = npc as unknown as import('../systems/npc.js').GateGuardData;
              if (isGateUnlocked(guard.gateId)) continue;
              const vec = guardFacingVecs[guard.facing];
              if (!vec) continue;
              const range = guard.lineOfSight ?? 3;
              for (let d = 1; d <= range; d++) {
                if (guard.x + vec.dx * d === player.gridX && guard.y + vec.dy * d === player.gridY) {
                  startGateGuardApproach(guard);
                  return;
                }
              }
            }
          }

          // Check blocker NPC line-of-sight (NPCs with blocker:true that block until despawn conditions are met)
          if (npcManager && hasActiveGame() && !partyGuardApproach && !gateGuardApproach) {
            const _pgPd = getPlayerData();
            const pgFacingVecs: Record<string, { dx: number; dy: number }> = {
              up: { dx: 0, dy: -1 },
              down: { dx: 0, dy: 1 },
              left: { dx: -1, dy: 0 },
              right: { dx: 1, dy: 0 },
            };
            for (const npc of npcManager.getNPCs()) {
              if (!npc.blocker) continue;
              // If all conditions met the NPC is invisible — skip
              if (!isNPCVisible(npc, _pgPd.flags, _pgPd.party)) continue;
              const vec = pgFacingVecs[npc.facing];
              if (!vec) continue;
              const range = npc.lineOfSight ?? 3;
              for (let d = 1; d <= range; d++) {
                if (npc.x + vec.dx * d === player.gridX && npc.y + vec.dy * d === player.gridY) {
                  audio.playTrainerSpot();
                  exclamationFlashTimer = 0;
                  partyGuardApproach = { npc, phase: 'exclamation', timer: 0 };
                  return;
                }
              }
            }
          }
        } else {
          player.pixelX =
            player.startPixelX + (player.targetGridX * TILE_SIZE - player.startPixelX) * player.moveProgress;
          player.pixelY =
            player.startPixelY + (player.targetGridY * TILE_SIZE - player.startPixelY) * player.moveProgress;
        }
      }

      // ── NPC auto-walk + animation update ──
      if (npcManager) {
        const _pd1 = hasActiveGame() ? getPlayerData() : null;
        const flags = _pd1?.flags ?? {};

        /** Execute one frame of a walk pattern (shared between main, afterSpawn, afterDespawn). */
        const runPattern = (
          npc: NPCData,
          st: NPCRuntimeState,
          pattern: import('../systems/npc.js').WalkStep[],
          loop: boolean,
          idx: number,
          steps: number,
          waiting: boolean,
          timer: number,
        ): { idx: number; steps: number; waiting: boolean; timer: number; done: boolean } => {
          if (waiting) {
            timer += dt;
            const step = pattern[idx];
            if (timer >= step.delay) {
              waiting = false;
              timer = 0;
              idx++;
              steps = 0;
              if (idx >= pattern.length) {
                if (loop) {
                  idx = 0;
                } else {
                  return { idx, steps, waiting, timer, done: true };
                }
              }
            }
          } else {
            const step = pattern[idx];
            // steps=0: face the direction without moving, then wait the delay
            if (step.steps === 0) {
              st.facing = step.dir;
              npc.facing = step.dir;
              waiting = true;
              timer = 0;
            } else {
              const dx = step.dir === 'right' ? 1 : step.dir === 'left' ? -1 : 0;
              const dy = step.dir === 'down' ? 1 : step.dir === 'up' ? -1 : 0;
              const nextX = npc.x + dx;
              const nextY = npc.y + dy;
              const blocked =
                (nextX === player.gridX && nextY === player.gridY) ||
                npcManager!.isVisibleNPCAt(nextX, nextY, flags, _pd1?.party) ||
                !tileMap ||
                !tileMap.isWalkable(nextX, nextY);
              if (!blocked && steps < step.steps) {
                st.startPixelX = st.pixelX;
                st.startPixelY = st.pixelY;
                st.targetPixelX = nextX * TILE_SIZE;
                st.targetPixelY = nextY * TILE_SIZE;
                st.moveProgress = 0;
                st.moving = true;
                st.facing = step.dir;
                npc.facing = step.dir;
                steps++;
                if (steps >= step.steps) {
                  waiting = true;
                  timer = 0;
                }
              } else if (steps > 0) {
                // Blocked mid-step: wait the delay then advance to next step
                waiting = true;
                timer = 0;
              }
              // Blocked at step 0: retry next frame (don't advance pattern)
            }
          }
          return { idx, steps, waiting, timer, done: false };
        };

        for (const npc of npcManager.getNPCs()) {
          const isVis = isNPCVisible(npc, flags, _pd1?.party);
          const st = getNpcState(npc);

          // ── Detect visibility transition: visible → invisible (start beforeDespawn) ──
          if (!isVis && st.wasPreviouslyVisible && !st.isPreDespawning) {
            const aw = npc.autoWalk;
            const alreadyDespawnDone = hasActiveGame() && getPlayerData().flags[`npc-beforeDespawn-done-${npc.id}`];
            if (!alreadyDespawnDone && aw?.beforeDespawnPattern && aw.beforeDespawnPattern.length > 0) {
              st.isPreDespawning = true;
              st.beforeDespawnIdx = 0;
              st.beforeDespawnSteps = 0;
              st.beforeDespawnWaiting = false;
              st.beforeDespawnTimer = 0;
            }
            st.wasPreviouslyVisible = false;
          }

          // ── Skip truly invisible NPCs not in beforeDespawn walk ──
          if (!isVis && !st.isPreDespawning) continue;

          // ── Update walk animation (shared for all phases) ──
          if (st.moving) {
            st.moveProgress += dt / MOVE_DURATION;
            st.walkTimer += dt;
            if (st.walkTimer >= 0.1) {
              st.walkTimer = 0;
              st.walkFrame = st.walkFrame === 1 ? 2 : 1;
            }
            if (st.moveProgress >= 1) {
              st.moveProgress = 1;
              st.pixelX = st.targetPixelX;
              st.pixelY = st.targetPixelY;
              npc.x = Math.round(st.pixelX / TILE_SIZE);
              npc.y = Math.round(st.pixelY / TILE_SIZE);
              st.moving = false;
              st.walkFrame = 0;
              if (st.cutscenePathQueue.length === 0) st.cutsceneWalking = false;
            } else {
              st.pixelX = st.startPixelX + (st.targetPixelX - st.startPixelX) * st.moveProgress;
              st.pixelY = st.startPixelY + (st.targetPixelY - st.startPixelY) * st.moveProgress;
            }
          }

          // ── Cutscene-driven path queue: animate one tile at a time ──
          if (st.cutsceneWalking) {
            if (!st.moving && st.cutscenePathQueue.length > 0) {
              const dir = st.cutscenePathQueue.shift()!;
              const dx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
              const dy = dir === 'down' ? 1 : dir === 'up' ? -1 : 0;
              npc.facing = dir;
              st.facing = dir;
              st.startPixelX = st.pixelX;
              st.startPixelY = st.pixelY;
              st.targetPixelX = (npc.x + dx) * TILE_SIZE;
              st.targetPixelY = (npc.y + dy) * TILE_SIZE;
              st.moveProgress = 0;
              st.moving = true;
            }
            continue;
          }

          // ── beforeDespawn phase: plays once when despawn conditions first met ──
          if (st.isPreDespawning) {
            const aw = npc.autoWalk;
            if (aw?.beforeDespawnPattern && aw.beforeDespawnPattern.length > 0 && !st.moving) {
              const r = runPattern(
                npc,
                st,
                aw.beforeDespawnPattern,
                aw.beforeDespawnLoop ?? false,
                st.beforeDespawnIdx,
                st.beforeDespawnSteps,
                st.beforeDespawnWaiting,
                st.beforeDespawnTimer,
              );
              st.beforeDespawnIdx = r.idx;
              st.beforeDespawnSteps = r.steps;
              st.beforeDespawnWaiting = r.waiting;
              st.beforeDespawnTimer = r.timer;
              if (r.done) {
                st.isPreDespawning = false;
                // Persist so re-entering the map doesn't replay it
                if (hasActiveGame()) {
                  setFlag(getPlayerData(), `npc-beforeDespawn-done-${npc.id}`);
                  autoSave();
                }
              }
            } else if (!st.moving) {
              st.isPreDespawning = false;
            }
            continue;
          }

          // ── NPC is visible — detect first-time spawn ──
          if (!st.wasPreviouslyVisible) {
            st.wasPreviouslyVisible = true;
            const aw = npc.autoWalk;
            // Only trigger afterSpawn if not already done (persisted in flags)
            const alreadySpawnDone = hasActiveGame() && getPlayerData().flags[`npc-afterSpawn-done-${npc.id}`];
            if (!alreadySpawnDone && aw?.afterSpawnPattern && aw.afterSpawnPattern.length > 0) {
              st.afterSpawnDone = false;
              st.afterSpawnIdx = 0;
              st.afterSpawnSteps = 0;
              st.afterSpawnWaiting = false;
              st.afterSpawnTimer = 0;
            } else {
              st.afterSpawnDone = true;
            }
          }

          // ── afterSpawn phase: plays once when NPC first becomes visible ──
          if (!st.afterSpawnDone) {
            const aw = npc.autoWalk;
            if (aw?.afterSpawnPattern && aw.afterSpawnPattern.length > 0 && !st.moving) {
              const r = runPattern(
                npc,
                st,
                aw.afterSpawnPattern,
                aw.afterSpawnLoop ?? false,
                st.afterSpawnIdx,
                st.afterSpawnSteps,
                st.afterSpawnWaiting,
                st.afterSpawnTimer,
              );
              st.afterSpawnIdx = r.idx;
              st.afterSpawnSteps = r.steps;
              st.afterSpawnWaiting = r.waiting;
              st.afterSpawnTimer = r.timer;
              if (r.done) {
                st.afterSpawnDone = true;
                // Persist so re-entering the map doesn't replay it
                if (hasActiveGame()) {
                  setFlag(getPlayerData(), `npc-afterSpawn-done-${npc.id}`);
                  autoSave();
                }
              }
            } else if (!st.moving) {
              st.afterSpawnDone = true;
            }
            continue;
          }

          // ── Main pattern-based auto-walk logic ──
          const aw = npc.autoWalk;
          if (aw && aw.pattern.length > 0 && !st.moving && !trainerApproach && !st.patternDone) {
            const step = aw.pattern[st.patternIndex];

            if (st.patternWaiting) {
              st.patternTimer += dt;
              if (st.patternTimer >= step.delay) {
                st.patternWaiting = false;
                st.patternTimer = 0;
                st.patternIndex++;
                st.stepsTaken = 0;
                if (st.patternIndex >= aw.pattern.length) {
                  if (aw.loop !== false) {
                    st.patternIndex = 0;
                  } else {
                    st.patternDone = true;
                  }
                }
              }
            } else {
              // steps=0: face direction only, no movement
              if (step.steps === 0) {
                st.facing = step.dir;
                npc.facing = step.dir;
                st.patternWaiting = true;
                st.patternTimer = 0;
              } else {
                const dx = step.dir === 'right' ? 1 : step.dir === 'left' ? -1 : 0;
                const dy = step.dir === 'down' ? 1 : step.dir === 'up' ? -1 : 0;
                const nextX = npc.x + dx;
                const nextY = npc.y + dy;
                const blocked =
                  (nextX === player.gridX && nextY === player.gridY) ||
                  npcManager!.isVisibleNPCAt(nextX, nextY, flags, _pd1?.party) ||
                  !tileMap ||
                  !tileMap.isWalkable(nextX, nextY);
                if (!blocked && st.stepsTaken < step.steps) {
                  st.startPixelX = st.pixelX;
                  st.startPixelY = st.pixelY;
                  st.targetPixelX = nextX * TILE_SIZE;
                  st.targetPixelY = nextY * TILE_SIZE;
                  st.moveProgress = 0;
                  st.moving = true;
                  st.facing = step.dir;
                  npc.facing = step.dir;
                  st.stepsTaken++;
                  if (st.stepsTaken >= step.steps) {
                    st.patternWaiting = true;
                    st.patternTimer = 0;
                  }
                } else if (st.stepsTaken > 0) {
                  // Blocked mid-step: wait delay then advance; if blocked at step 0, retry next frame
                  st.patternWaiting = true;
                  st.patternTimer = 0;
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
          const _iPd = hasActiveGame() ? getPlayerData() : null;
          const iFlags = _iPd?.flags ?? {};
          if (npc && npc.dialogue.length > 0 && isNPCVisible(npc, iFlags, _iPd?.party)) {
            // Defeated trainers: show re-encounter dialogue or "already beaten" message
            if (npc.type === 'trainer' && hasActiveGame()) {
              const flags = getPlayerData().flags;
              if (flags[`trainer-${npc.id}-defeated`]) {
                const trainer = npc as unknown as TrainerData;
                const status = getReencounterStatus(trainer);
                turnNPCToPlayer(npc);
                interactingNPC = npc;
                const _trainerName = npc.name ? getLocalizedName(npc.name) : undefined;
                if (status.eligible) {
                  activeTextBox = createTextBox([t('trainer.reencounter.ready')], isRTL(), _trainerName);
                } else if (status.reason === 'cooldown') {
                  const cooldownMsg =
                    status.minutesLeft != null
                      ? t('trainer.reencounter.cooldownMin', { minutes: status.minutesLeft })
                      : t('trainer.reencounter.cooldown', { hours: status.hoursLeft ?? 1 });
                  activeTextBox = createTextBox([cooldownMsg], isRTL(), _trainerName);
                } else if (status.reason === 'max-reached') {
                  activeTextBox = createTextBox([t('trainer.reencounter.maxReached')], isRTL(), _trainerName);
                } else {
                  // No reencounter — show postFlagDialogue (with questions before it if configured)
                  const pfd = trainer.postFlagDialogue;
                  if (pfd && pfd.dialogue.length > 0) {
                    const trainerQ = (trainer as unknown as Record<string, unknown>).questions as
                      | { count: number; types?: string[]; repeated?: boolean }
                      | undefined;
                    const showPFD = () => {
                      activeTextBox = createTextBox(resolveDialogue(pfd.dialogue, getLocale()), isRTL(), _trainerName);
                    };
                    if (trainerQ && trainerQ.count > 0) {
                      const appContainer = document.getElementById('app');
                      if (appContainer) {
                        npcOverlayActive = true;
                        const gradeId = gradeFromBirthYear(getPlayerBirthYear());
                        mountInputMathOverlay({
                          count: trainerQ.count,
                          types: trainerQ.types as SimpleOpType[] | undefined,
                          gradeId,
                          birthYear: getPlayerBirthYear(),
                          container: appContainer,
                        }).then(() => {
                          npcOverlayActive = false;
                          showPFD();
                        });
                      } else {
                        showPFD();
                      }
                    } else {
                      showPFD();
                    }
                  } else {
                    activeTextBox = createTextBox([t('trainer.defeated.dialogue')], isRTL(), _trainerName);
                  }
                }
                return;
              }
            }
            // Gate-guard: check if gate is already passed before showing dialogue
            if (npc.type === 'gate-guard' && hasActiveGame()) {
              const guard = npc as unknown as GateGuardData;
              turnNPCToPlayer(npc);
              const npcName = npc.name ? getLocalizedName(npc.name) : undefined;
              if (isGateUnlocked(guard.gateId)) {
                // Gate already passed — show passedDialogue or default
                const passed =
                  guard.passedDialogue && guard.passedDialogue.length > 0
                    ? resolveDialogue(guard.passedDialogue, getLocale())
                    : [getLocale() === 'he' ? 'תעבור, בבקשה!' : 'You may pass!'];
                activeTextBox = createTextBox(passed, isRTL(), npcName);
              } else {
                // Gate locked — show blocking dialogue, then launch gate scene on dismiss
                interactingNPC = npc;
                activeTextBox = createTextBox(resolveDialogue(npc.dialogue, getLocale()), isRTL(), npcName);
              }
              return;
            }

            // Fire npc-interact before trainer dialogue starts (first encounter only)
            if (npc.type === 'trainer' && hasActiveGame()) {
              fireStoryTrigger({ type: 'npc-interact', npcId: npc.id });
            }
            // Use postFlagDialogue when present and its flag is set
            const pfd = npc.postFlagDialogue;
            const dialogueLines =
              pfd && pfd.flag && hasActiveGame() && getPlayerData().flags[pfd.flag] ? pfd.dialogue : npc.dialogue;
            const locale = getLocale();
            const resolvedLines = resolveDialogue(dialogueLines, locale);
            if (npc.mapClearBlocker && hasActiveGame()) {
              resolvedLines.push(...buildMapClearCountLines(locale));
            }
            activeTextBox = createTextBox(resolvedLines, isRTL(), npc.name ? getLocalizedName(npc.name) : undefined);
            interactingNPC = npc;
            turnNPCToPlayer(npc);
            return;
          }
        }

        // Object interaction: check facing tile for interactive placed objects
        if (tileMap) {
          const vec = DIR_VECTORS[player.facing];
          if (vec) {
            const targetX = player.gridX + vec.dx;
            const targetY = player.gridY + vec.dy;
            const obj = tileMap.getInteractableAt(targetX, targetY);
            if (obj) {
              const tileDef = tileMap.getObjectTileDef(obj);
              const tileRef = tileDef?.interactType;
              if (!tileRef) {
                /* not interactive */
              } else {
                // Merge: tile defaults → tile args → map-level interactiveItems → per-instance args
                const resolved = resolveInteract(tileRef);
                if (!resolved) {
                  /* unknown type */
                } else {
                  // Merge: tile defaults → interactiveItems map override → per-instance args
                  const mapOverride = tileMap.getInteractOverride(obj);
                  const inst = obj.interactArgs;
                  const dialogue = inst?.dialogue && inst.dialogue.length > 0 ? inst.dialogue : resolved.dialogue;
                  const itemId =
                    inst?.itemId !== undefined ? inst.itemId : mapOverride ? mapOverride.itemId : resolved.itemId;
                  const itemQty =
                    inst?.itemQty !== undefined ? inst.itemQty : mapOverride ? mapOverride.itemQty : resolved.itemQty;
                  const flag = inst?.flag !== undefined ? inst.flag : resolved.flag;

                  if (resolved.id === 'pc') {
                    if (hasActiveGame()) {
                      stateMachine.push('PC');
                    }
                    return;
                  } else if (resolved.id === 'sign') {
                    if (dialogue.length > 0) {
                      activeTextBox = createTextBox(resolveDialogue(dialogue, getLocale()), isRTL());
                    }
                    return;
                  } else if (resolved.id === 'item') {
                    if (itemId && hasActiveGame()) {
                      const pd = getPlayerData();
                      const flagKey = flag || `obj-${currentMapData?.id}-${obj.key}-${obj.x}-${obj.y}-collected`;
                      if (!pd.flags[flagKey]) {
                        const qty = itemQty || 1;
                        pd.items[itemId] = (pd.items[itemId] || 0) + qty;
                        setFlag(pd, flagKey);
                        // Remove from map so it disappears immediately
                        if (currentMapData?.objects) {
                          const idx = currentMapData.objects.indexOf(obj);
                          if (idx >= 0) currentMapData.objects.splice(idx, 1);
                        }
                        audio.playItemFound();
                        const itemDef = getItem(itemId);
                        const displayName = itemDef ? getLocalizedName(itemDef.name) : itemId;
                        activeTextBox = createTextBox([t('npc.reward.item', { item: displayName, qty })], isRTL());
                        autoSave();
                      }
                    }
                    return;
                  } else if (resolved.id === 'cut' || resolved.id === 'strength') {
                    if (!hasActiveGame()) return;
                    const pd = getPlayerData();
                    const hmName = resolved.id;
                    const hmUser = findHMUser(hmName, pd.party);

                    if (!hmUser) {
                      activeTextBox = createTextBox([t(`hm.cannotUse.${hmName}`)], isRTL());
                      return;
                    }

                    const pokemonName = getPokemonDisplayName(hmUser.id);
                    const tileName =
                      resolveDialogue(dialogue, getLocale())[0] ?? (hmName === 'cut' ? 'tree' : 'boulder');
                    const actionKey = hmName === 'cut' ? 'hm.cut.action' : 'hm.strength.action';
                    const dialogueLine = t('hm.chooseYou', {
                      name: pokemonName,
                      action: t(actionKey),
                      tileName,
                    });

                    activeTextBox = createTextBox([dialogueLine], isRTL());
                    const capturedHmName = hmName;
                    const capturedHmUser = hmUser;
                    // Use the object's origin coords (obj.x/obj.y), NOT the player-facing tile.
                    // If the tree/boulder spans multiple tiles and the player faces a non-origin cell,
                    // targetX/Y won't match obj.x/obj.y, causing findIndex to return -1 and the cut to silently fail.
                    const capturedTargetX = obj.x;
                    const capturedTargetY = obj.y;
                    pendingHMAction = () => {
                      startHMAnimation(capturedHmName, capturedHmUser, capturedTargetX, capturedTargetY);
                    };
                    return;
                  } else if (resolved.id === 'gate') {
                    const effectiveGateId = inst?.gateId !== undefined ? inst.gateId : resolved.gateId;
                    if (!effectiveGateId) {
                      // No gate configured — show default dialogue
                      if (dialogue.length > 0) {
                        activeTextBox = createTextBox(resolveDialogue(dialogue, getLocale()), isRTL());
                      }
                      return;
                    }
                    if (!hasActiveGame()) return;
                    // Check if gate is already unlocked (timed pass still active)
                    if (isGateUnlocked(effectiveGateId)) {
                      // Already passed — show brief confirmation and allow through
                      const locale = getLocale();
                      const msg = locale === 'he' ? 'המסלול פתוח.' : 'The path is open.';
                      activeTextBox = createTextBox([msg], isRTL());
                      return;
                    }
                    setActiveGate(effectiveGateId);
                    stateMachine.push('GATE');
                    return;
                  }
                }
              }
            }
          }
        }

        // Surf: face water tile + Space only (Enter is reserved for the start menu)
        if (tileMap && hasActiveGame() && !isCurrentlySurfing && input.isKeyPressed(' ')) {
          const surfVec = DIR_VECTORS[player.facing];
          if (surfVec && isTileWater(player.gridX + surfVec.dx, player.gridY + surfVec.dy)) {
            const pd = getPlayerData();
            const check = checkSurfEligibility(pd.party);

            if (check.eligible.length === 0) {
              let msg: string;
              if (check.failReason === 'no-surf-move') {
                msg = t('hm.cannotUse.surf');
              } else {
                const single = check.failPokemon.length === 1;
                const names = check.failPokemon.map((p) => getPokemonDisplayName(p.id)).join(', ');
                if (check.failReason === 'level') {
                  msg = t(single ? 'hm.surf.failLevel.one' : 'hm.surf.failLevel.many', {
                    names,
                    level: check.minLevel,
                  });
                } else if (check.failReason === 'height') {
                  const height = (check.minHeight ?? 0).toFixed(1);
                  msg = t(single ? 'hm.surf.failHeight.one' : 'hm.surf.failHeight.many', { names, height });
                } else {
                  const weight = (check.minWeight ?? 0).toFixed(1);
                  msg = t(single ? 'hm.surf.failWeight.one' : 'hm.surf.failWeight.many', { names, weight });
                }
              }
              activeTextBox = createTextBox([msg], isRTL());
            } else {
              const surfUser = check.eligible[Math.floor(Math.random() * check.eligible.length)];
              const pokeName = getPokemonDisplayName(surfUser.id);
              activeTextBox = createTextBox([t('hm.surf.prompt', { name: pokeName })], isRTL());
              const capturedUser = surfUser;
              const capturedWX = player.gridX + surfVec.dx;
              const capturedWY = player.gridY + surfVec.dy;
              pendingHMAction = () => {
                showChoice((idx) => {
                  if (idx === 0) {
                    const chooseText = t('hm.surf.chooseYou', { name: getPokemonDisplayName(capturedUser.id) });
                    activeTextBox = createTextBox([chooseText], isRTL());
                    pendingHMAction = () => {
                      startSurfMountAnimation(capturedUser, capturedWX, capturedWY);
                    };
                  }
                });
              };
            }
            return;
          }
        }

        // No interaction found — Enter opens the start menu
        if (input.isKeyPressed('Enter') && hasActiveGame()) {
          stateMachine.push('START_MENU');
          return;
        }
      }

      // P key → Party
      if (input.isKeyPressed('p') || input.isKeyPressed('P')) {
        setPartyMode('overworld');
        stateMachine.push('PARTY');
        // hideHUD();
        return;
      }

      // D key → Pokedex
      if (input.isKeyPressed('d') || input.isKeyPressed('D')) {
        stateMachine.push('POKEDEX');
        // hideHUD();
        return;
      }

      // B key → Bag
      if (input.isKeyPressed('b') || input.isKeyPressed('B')) {
        setBagMode('overworld');
        stateMachine.push('BAG');
        // hideHUD();
        return;
      }

      // W key → World Map (with Fly if available)
      if (input.isKeyPressed('w') || input.isKeyPressed('W')) {
        if (hasActiveGame()) {
          const pd = getPlayerData();
          const flyUser = canUseHM('fly', pd.party) ? findHMUser('fly', pd.party) : null;
          if (flyUser) {
            const capturedFlyUser = flyUser;
            setFlyCallback((destMapId: string) => {
              startFlyAnimation(capturedFlyUser, destMapId);
            });
          } else {
            setFlyCallback(null);
          }
        } else {
          setFlyCallback(null);
        }
        stateMachine.push('WORLD_MAP');
        return;
      }

      // T key → Phone (trainer contact list)
      if (input.isKeyPressed('t') || input.isKeyPressed('T')) {
        if (hasActiveGame()) {
          stateMachine.push('PHONE');
          return;
        }
      }

      // S key → Save game (open save slot picker)
      if (input.isKeyPressed('s') || input.isKeyPressed('S')) {
        if (hasActiveGame()) {
          openSaveSlots('save');
          stateMachine.push('SAVE_SLOTS');
          return;
        }
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
          hideHUD();
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

      // G key → Admin Map Teleport (dev-only, admin-only)
      if (import.meta.env.DEV && (input.isKeyPressed('g') || input.isKeyPressed('G'))) {
        if (hasActiveGame() && getPlayerData().name === ADMIN_NAME) {
          import('../admin/map-teleport').then(({ openAdminMapTeleport }) => {
            openAdminMapTeleport(loadAndSetMap);
          });
          return;
        }
      }

      // K key → Toggle keyboard legend
      if (input.isKeyPressed('k') || input.isKeyPressed('K')) {
        _legendVisible = !_legendVisible;
        return;
      }

      // F key → Fish (requires Fishing Rod + Bait, water tile nearby)
      if (input.isKeyPressed('f') || input.isKeyPressed('F')) {
        if (hasActiveGame() && !fishingPhase) {
          tryStartFishing();
          return;
        }
      }

      // 1/2/3 keys → switch HUD tab (map / leader / story)
      if (input.isKeyPressed('Digit1')) {
        setHUDTab(0);
        updateHUD(buildHUDData());
        input.consumeKey('Digit1');
      }
      if (input.isKeyPressed('Digit2')) {
        setHUDTab(1);
        updateHUD(buildHUDData());
        input.consumeKey('Digit2');
      }
      if (input.isKeyPressed('Digit3')) {
        setHUDTab(2);
        updateHUD(buildHUDData());
        input.consumeKey('Digit3');
      }

      if (!player.moving) {
        for (const [key, dir] of Object.entries(DIR_VECTORS)) {
          if (input.isKeyDown(key)) {
            player.facing = key;
            const nx = player.gridX + dir.dx;
            const ny = player.gridY + dir.dy;

            // Check walkability — water is walkable while surfing
            const baseWalkable = tileMap.isWalkable(nx, ny);
            let walkable = baseWalkable;

            if (!walkable && isCurrentlySurfing) {
              // While surfing, water tiles become walkable
              const encTypes = tileMap.getEncounterTypes(nx, ny);
              const isWater = encTypes?.some(
                (et) => et === 'water' || et.startsWith('water') || et.includes('/water') || et === '*',
              );
              if (isWater) walkable = true;
            }

            if (!walkable && input.isKeyPressed(key)) {
              // Bump into non-walkable tile — play once per keypress, not every frame
              audio.playSFX('bump-wall');
            }

            const _movPd = hasActiveGame() ? getPlayerData() : null;
            if (walkable && !npcManager?.isVisibleNPCAt(nx, ny, _movPd?.flags ?? {}, _movPd?.party)) {
              player.moving = true;
              player.targetGridX = nx;
              player.targetGridY = ny;
              player.startPixelX = player.pixelX;
              player.startPixelY = player.pixelY;
              player.moveProgress = 0;
              player.walkTimer = 0;
              player.walkFrame = 1;
            } else if (
              walkable &&
              npcManager?.isVisibleNPCAt(nx, ny, _movPd?.flags ?? {}, _movPd?.party) &&
              input.isKeyPressed(key)
            ) {
              // Bump into NPC — play once per keypress
              audio.playSFX('bump-wall');
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
      interface Renderable {
        y: number;
        render: () => void;
        zOffset?: number;
        order?: number;
      }

      const compareRenderables = (a: Renderable, b: Renderable): number => {
        const aHasZ = typeof a.zOffset === 'number';
        const bHasZ = typeof b.zOffset === 'number';
        if (aHasZ !== bHasZ) return aHasZ ? 1 : -1;
        if (aHasZ && bHasZ && a.zOffset !== b.zOffset) {
          return (a.zOffset ?? 0) - (b.zOffset ?? 0);
        }
        if (a.y !== b.y) return a.y - b.y;
        return (a.order ?? 0) - (b.order ?? 0);
      };

      const compareLayerRenderables = (a: Renderable, b: Renderable): number => {
        const aHasZ = typeof a.zOffset === 'number';
        const bHasZ = typeof b.zOffset === 'number';
        if (aHasZ !== bHasZ) return aHasZ ? 1 : -1;
        if (aHasZ && bHasZ && a.zOffset !== b.zOffset) {
          return (a.zOffset ?? 0) - (b.zOffset ?? 0);
        }
        return (a.order ?? 0) - (b.order ?? 0);
      };
      const renderables: Renderable[] = [];

      // Placed objects split into ground/body/above passes
      const objRenderables = tileMap.getObjectRenderables(ctx, camera.x, camera.y);
      // Ground-level objects (carpet, sand edges) render right after ground tiles
      objRenderables.ground.sort(compareLayerRenderables);
      for (const r of objRenderables.ground) r.render();
      // Body objects (trees, buildings) participate in Y-sort
      renderables.push(...objRenderables.body);

      // Player (hidden during cutscenes that call hide-player)
      const psx = Math.floor(player.pixelX - camera.x);
      const psy = Math.floor(player.pixelY - camera.y);
      renderables.push({
        y: player.pixelY,
        render: () => {
          if (playerHidden) return;
          // Surfing: show hero surf sprite with gentle bob
          if (isCurrentlySurfing) {
            const heroId = hasActiveGame() ? getPlayerData().heroCharacterId : '';
            const facingDir = player.facing.replace('Arrow', '').toLowerCase();
            const surfHeroFrame = heroId ? getCharacterFrame(`${heroId}-surf`, facingDir, 'stand') : null;
            if (surfHeroFrame) {
              const bob = Math.round(Math.sin(surfWaveTimer * 3.5) * 1.5);
              ctx.imageSmoothingEnabled = false;
              ctx.drawImage(
                surfHeroFrame.image,
                surfHeroFrame.sx,
                surfHeroFrame.sy,
                surfHeroFrame.w,
                surfHeroFrame.h,
                psx,
                psy + bob,
                TILE_SIZE,
                TILE_SIZE,
              );
            }
            // Blue-white flash overlay during sprite transition
            if (surfFlashTimer > 0) {
              ctx.save();
              ctx.globalAlpha = (surfFlashTimer / 0.35) * 0.6;
              ctx.fillStyle = '#88ddff';
              ctx.fillRect(psx - TILE_SIZE / 2, psy - TILE_SIZE / 2, TILE_SIZE * 2, TILE_SIZE * 2);
              ctx.restore();
            }
            return;
          }

          const poses = ['stand', 'walk-1', 'walk-2'];
          const pose = poses[player.walkFrame % poses.length] || 'stand';
          const facingDir = player.facing.replace('Arrow', '').toLowerCase();
          const heroId = hasActiveGame() ? getPlayerData().heroCharacterId : '';
          let heroFrame = heroId ? getCharacterFrame(heroId, facingDir, pose) : null;
          if (!heroFrame && heroId && pose !== 'stand') {
            heroFrame = getCharacterFrame(heroId, facingDir, 'stand');
          }

          // Hide player sprite during fly mount/rise/land phases
          if (flyAnim && (flyAnim.phase === 'mount' || flyAnim.phase === 'rise' || flyAnim.phase === 'land')) {
            return;
          }

          if (heroFrame) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
              heroFrame.image,
              heroFrame.sx,
              heroFrame.sy,
              heroFrame.w,
              heroFrame.h,
              psx,
              psy,
              TILE_SIZE,
              TILE_SIZE,
            );
            return;
          }

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
        const _visPd = hasActiveGame() ? getPlayerData() : null;
        const visFlags = _visPd?.flags ?? {};
        for (const npc of npcManager.getNPCs()) {
          const npcSt = getNpcState(npc);
          const _npcVis = isNPCVisible(npc, visFlags, _visPd?.party);
          // Render if visible, OR in beforeDespawn phase (NPC still rendered while playing exit walk)
          if (!_npcVis && !npcSt.isPreDespawning) continue;

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
            // Scale destination proportionally: 32×32 source = 1 tile (16×16).
            // Larger frames (e.g. wild Pokémon at 48×48) render at proportional size.
            const destW = Math.round((charFrame.w / 32) * TILE_SIZE);
            const destH = Math.round((charFrame.h / 32) * TILE_SIZE);
            // Center horizontally on the tile; anchor bottom to the tile bottom row.
            const nx = Math.floor(npcPixelX - camera.x) - Math.floor((destW - TILE_SIZE) / 2);
            const ny = Math.floor(npcPixelY - camera.y) - (destH - TILE_SIZE);

            renderables.push({
              y: renderY,
              render: () => {
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(
                  charFrame.image,
                  charFrame.sx,
                  charFrame.sy,
                  charFrame.w,
                  charFrame.h,
                  nx,
                  ny,
                  destW,
                  destH,
                );
                // "!" exclamation during trainer, gate-guard, or party-guard approach
                const showExclamation =
                  (trainerApproach && trainerApproach.trainer === npc && trainerApproach.phase === 'exclamation') ||
                  (gateGuardApproach && gateGuardApproach.guard === npc && gateGuardApproach.phase === 'exclamation') ||
                  (partyGuardApproach && partyGuardApproach.npc === npc && partyGuardApproach.phase === 'exclamation');
                if (showExclamation) {
                  let excT = 0;
                  if (trainerApproach?.trainer === npc && trainerApproach.phase === 'exclamation')
                    excT = trainerApproach.timer;
                  else if (gateGuardApproach?.guard === npc) excT = gateGuardApproach.timer;
                  else if (partyGuardApproach?.npc === npc) excT = partyGuardApproach.timer;
                  const scl = excT < 0.12 ? (excT / 0.12) * 1.3 : excT < 0.22 ? 1.3 - ((excT - 0.12) / 0.1) * 0.3 : 1.0;
                  ctx.save();
                  ctx.translate(nx + Math.floor(destW / 2), ny - 7);
                  ctx.scale(scl, scl);
                  fillRect(ctx, -4, -5, 8, 10, '#ffffff');
                  drawText(ctx, '!', -3, -4, { size: 8, color: '#ff0000', font: 'monospace' });
                  ctx.restore();
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
                const showExclamationFb =
                  (trainerApproach && trainerApproach.trainer === npc && trainerApproach.phase === 'exclamation') ||
                  (gateGuardApproach && gateGuardApproach.guard === npc && gateGuardApproach.phase === 'exclamation') ||
                  (partyGuardApproach && partyGuardApproach.npc === npc && partyGuardApproach.phase === 'exclamation');
                if (showExclamationFb) {
                  let excT = 0;
                  if (trainerApproach?.trainer === npc && trainerApproach.phase === 'exclamation')
                    excT = trainerApproach.timer;
                  else if (gateGuardApproach?.guard === npc) excT = gateGuardApproach.timer;
                  else if (partyGuardApproach?.npc === npc) excT = partyGuardApproach.timer;
                  const scl = excT < 0.12 ? (excT / 0.12) * 1.3 : excT < 0.22 ? 1.3 - ((excT - 0.12) / 0.1) * 0.3 : 1.0;
                  ctx.save();
                  ctx.translate(nx + 8, ny - 7);
                  ctx.scale(scl, scl);
                  fillRect(ctx, -4, -5, 8, 10, '#ffffff');
                  drawText(ctx, '!', -3, -4, { size: 8, color: '#ff0000', font: 'monospace' });
                  ctx.restore();
                }
              },
            });
          }
        }
      }

      // Sort by Y and render
      renderables.sort(compareRenderables);
      for (const r of renderables) r.render();

      // ── Fishing rod world overlay ──
      if (fishingPhase && !playerHidden) {
        const fpsx = Math.floor(player.pixelX - camera.x);
        const fpsy = Math.floor(player.pixelY - camera.y);
        const wsx = Math.floor(fishingWaterGridX * TILE_SIZE - camera.x);
        const wsy = Math.floor(fishingWaterGridY * TILE_SIZE - camera.y);

        let handX: number;
        let handY: number;
        const facing = player.facing;
        if (facing === 'ArrowDown') {
          handX = fpsx + TILE_SIZE * 0.65;
          handY = fpsy + TILE_SIZE * 0.6;
        } else if (facing === 'ArrowUp') {
          handX = fpsx + TILE_SIZE * 0.65;
          handY = fpsy + TILE_SIZE * 0.35;
        } else if (facing === 'ArrowRight') {
          handX = fpsx + TILE_SIZE * 0.9;
          handY = fpsy + TILE_SIZE * 0.5;
        } else {
          handX = fpsx + TILE_SIZE * 0.1;
          handY = fpsy + TILE_SIZE * 0.5;
        }

        const bobberX = wsx + TILE_SIZE * 0.5;
        const bobberY = wsy + TILE_SIZE * 0.55 + fishingBobberOffset;
        const lineProgress = fishingPhase === 'casting' ? Math.min(1, fishingTimer / 0.8) : 1;
        const lineEndX = handX + (bobberX - handX) * lineProgress;
        const lineEndY = handY + (bobberY - handY) * lineProgress;
        const arcCX = (handX + lineEndX) / 2;
        const arcCY = Math.min(handY, lineEndY) - 5;

        const dist = Math.sqrt((bobberX - handX) ** 2 + (bobberY - handY) ** 2) || 1;
        const rdx = ((bobberX - handX) / dist) * 3;
        const rdy = ((bobberY - handY) / dist) * 3;

        ctx.save();
        ctx.strokeStyle = '#7B4A2D';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(handX - rdx, handY - rdy);
        ctx.lineTo(handX + rdx * 1.5, handY + rdy * 1.5);
        ctx.stroke();

        ctx.strokeStyle = '#b8d0b0';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(handX + rdx * 1.5, handY + rdy * 1.5);
        ctx.quadraticCurveTo(arcCX, arcCY, lineEndX, lineEndY);
        ctx.stroke();

        if (lineProgress >= 1) {
          ctx.beginPath();
          ctx.moveTo(bobberX, bobberY);
          ctx.arc(bobberX, bobberY, 2, Math.PI, 0, false);
          ctx.closePath();
          ctx.fillStyle = '#e03020';
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(bobberX, bobberY);
          ctx.arc(bobberX, bobberY, 2, 0, Math.PI, false);
          ctx.closePath();
          ctx.fillStyle = '#f0f0f0';
          ctx.fill();
          ctx.strokeStyle = '#404040';
          ctx.lineWidth = 0.4;
          ctx.beginPath();
          ctx.arc(bobberX, bobberY, 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Render above layer (tree canopies, roof overhangs) on top of sprites
      tileMap.renderAbove(ctx, camera.x, camera.y);
      // Render placed object above rows (e.g. roof overhangs)
      objRenderables.above.sort(compareLayerRenderables);
      for (const r of objRenderables.above) r.render();

      // HM animation overlay
      if (hmAnim && hmAnim.spriteAlpha > 0) {
        const worldX = hmAnim.obstacleX * TILE_SIZE;
        const worldY = hmAnim.obstacleY * TILE_SIZE;
        const screenX = worldX - camera.x;
        const screenY = worldY - camera.y;

        if (hmAnim.pokemonSprite) {
          ctx.save();
          ctx.globalAlpha = hmAnim.spriteAlpha;
          const spriteSize = TILE_SIZE * 2;
          if (hmAnim.flipSprite) {
            ctx.translate(screenX + spriteSize / 2, screenY);
            ctx.scale(-1, 1);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(hmAnim.pokemonSprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
          } else {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
              hmAnim.pokemonSprite,
              screenX - spriteSize / 4,
              screenY - spriteSize / 2,
              spriteSize,
              spriteSize,
            );
          }
          ctx.restore();
        }

        // Draw effect during action and return phases
        if (hmAnim.phase === 'action' || (hmAnim.phase === 'return' && hmAnim.slashProgress >= 1)) {
          const cx = screenX + TILE_SIZE / 2;
          const cy = screenY + TILE_SIZE / 2;
          if (hmAnim.hmName === 'cut') {
            drawCutSlash(ctx, cx, cy, hmAnim.slashProgress);
          } else {
            drawStrengthEffect(ctx, cx, cy, hmAnim.slashProgress);
          }
        }

        // White flash at start of action phase
        if (hmAnim.flashAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = hmAnim.flashAlpha * 0.7;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(screenX - TILE_SIZE / 2, screenY - TILE_SIZE, TILE_SIZE * 2, TILE_SIZE * 2);
          ctx.restore();
        }
      }

      // Fly animation overlay
      if (flyAnim && flyAnim.spriteAlpha > 0 && flyAnim.pokemonSprite) {
        const flyScreenX = psx; // player screen position
        const flyScreenY = psy + flyAnim.spriteOffsetY;
        const flySize = TILE_SIZE * 2 * flyAnim.spriteScale;
        ctx.save();
        ctx.globalAlpha = flyAnim.spriteAlpha;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(flyAnim.pokemonSprite, flyScreenX - flySize / 2, flyScreenY - flySize / 2, flySize, flySize);
        ctx.restore();
      }

      // Fly fade overlay (black screen fade in/out)
      if (flyAnim && flyAnim.fadeAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = flyAnim.fadeAlpha;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        ctx.restore();
      }

      // Surf mount animation — Pokemon appears at water tile then dives in
      if (surfMountAnim && surfMountAnim.pokemonSprite && surfMountAnim.alpha > 0) {
        const wx = surfMountAnim.waterGridX * TILE_SIZE - camera.x;
        const wy = surfMountAnim.waterGridY * TILE_SIZE - camera.y;
        const spriteSize = TILE_SIZE * 2 * surfMountAnim.scale;
        ctx.save();
        ctx.globalAlpha = surfMountAnim.alpha;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(surfMountAnim.pokemonSprite, wx - spriteSize / 4, wy - spriteSize / 2, spriteSize, spriteSize);
        // Expanding splash ring during dive phase
        if (surfMountAnim.phase === 'dive') {
          const progress = surfMountAnim.timer / 0.35;
          ctx.globalAlpha = (1 - progress) * 0.75;
          ctx.strokeStyle = '#88ccff';
          ctx.lineWidth = 2;
          const r = TILE_SIZE * 0.3 + TILE_SIZE * progress;
          ctx.beginPath();
          ctx.ellipse(wx + TILE_SIZE / 2, wy + TILE_SIZE * 0.65, r, r * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Surf return animation — Pokemon shrinks/fades back into its Poké Ball
      if (surfReturnAnim && surfReturnAnim.alpha > 0 && surfReturnAnim.pokemonSprite) {
        const scale = surfReturnAnim.alpha;
        const spriteSize = TILE_SIZE * 2 * scale;
        ctx.save();
        ctx.globalAlpha = surfReturnAnim.alpha;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(surfReturnAnim.pokemonSprite, psx - spriteSize / 2, psy - spriteSize / 2, spriteSize, spriteSize);
        ctx.restore();
      }

      // Water wake — periodic ripple ring at player tile while surfing
      if (isCurrentlySurfing) {
        const wakePhase = (surfWaveTimer % 1.2) / 1.2;
        ctx.save();
        ctx.globalAlpha = (1 - wakePhase) * 0.45;
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 1;
        const r = TILE_SIZE * 0.2 + TILE_SIZE * wakePhase * 1.1;
        ctx.beginPath();
        ctx.ellipse(psx + TILE_SIZE / 2, psy + TILE_SIZE, r, r * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // HUD — HTML overlay (updated every frame, skips DOM write if unchanged)
      updateHUD(buildHUDData());

      // Keyboard legend bar (bottom of screen, behind dialogues)
      if (
        _legendVisible &&
        !activeTextBox &&
        !choiceState &&
        !healTextBox &&
        !shop.open &&
        !encounterTriggered &&
        transitionState === 'none'
      ) {
        const barY = SCREEN_H - 11;
        fillRect(ctx, 0, barY, SCREEN_W, 11, '#00000088');
        const _lpd = hasActiveGame() ? getPlayerData() : null;
        const _isAdmin = _lpd?.name === ADMIN_NAME;
        const _hasFish = (_lpd?.items['fishing-rod'] ?? 0) > 0;
        const _lparts = [
          `P:${t('legend.party')}`,
          `D:${t('legend.dex')}`,
          `B:${t('legend.bag')}`,
          `W:${t('legend.map')}`,
        ];
        if (_hasFish) _lparts.push(`F:${t('legend.fish')}`);
        _lparts.push(`M:${t('legend.mute')}`, `K:${t('legend.keys')}`, `ENTER:${t('legend.menu')}`);
        if (_isAdmin) _lparts.push(`N:${t('legend.shop')}`, `H:${t('legend.heal')}`, 'G:Teleport');
        drawText(ctx, _lparts.join(' '), SCREEN_W / 2, barY + 2, {
          size: 6,
          color: '#aaaaaa',
          align: 'center',
          direction: 'ltr',
        });
      }

      // Fishing status bar (non-interactive, shown during casting / waiting)
      if (fishingPhase === 'casting' || fishingPhase === 'waiting') {
        const fbY = SCREEN_H - 36;
        ctx.fillStyle = '#181820';
        ctx.fillRect(0, fbY, SCREEN_W, 36);
        ctx.strokeStyle = '#585858';
        ctx.lineWidth = 1;
        ctx.strokeRect(1, fbY + 1, SCREEN_W - 2, 34);
        ctx.strokeStyle = '#383848';
        ctx.strokeRect(0, fbY, SCREEN_W, 36);
        const dots = '.'.repeat(1 + (Math.floor(fishingTimer * 2) % 3));
        const fishMsg = fishingPhase === 'casting' ? t('fishing.cast') : t('fishing.waiting') + dots;
        drawText(ctx, fishMsg, isRTL() ? SCREEN_W - 8 : 8, fbY + 6, {
          size: 8,
          color: '#f8f8f8',
          direction: isRTL() ? 'rtl' : 'ltr',
          align: isRTL() ? 'right' : 'left',
          maxWidth: SCREEN_W - 16,
          lineHeight: 12,
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
            fillRect(ctx, optX - 6, optY - 2, 44, 14, '#384088');
          }
          drawText(ctx, choiceState.options[i], optX, optY, {
            size: 8,
            color: selected ? '#f8f8f8' : '#a0a0a0',
            font: 'monospace',
          });
        }
      }

      // Exclamation spotlight flash (brief white fade when NPC spots player)
      if (exclamationFlashTimer >= 0 && exclamationFlashTimer < 0.3) {
        const alpha = (1 - exclamationFlashTimer / 0.3) * 0.45;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
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

      // Cutscene overlay (dialogue + fade — drawn last so it sits above everything)
      renderCutscene(ctx);
    },
  };
}
