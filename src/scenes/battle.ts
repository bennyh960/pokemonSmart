/**
 * BattleScene - Turn-based battle with math challenges, type effectiveness, and XP.
 */

import type { Scene, Pokemon, PokemonType } from '../types/index.js';
import type { BattleStatId } from '../types/battle-metadata.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { clearScreen, fillRect, drawText } from '../engine/renderer.js';
import {
  createHPBar,
  updateHPBar,
  renderHPBar,
  setHP,
  setXP,
  setDisplayedXP,
  setStatus,
  setVolatileStatuses,
  isHPAnimating,
  isXPAnimating,
} from '../ui/hp-bar.js';
import { createBattleMenu, showMainMenu, showMoveMenu, updateBattleMenu, renderBattleMenu } from '../ui/battle-menu.js';
import type { MainMenuChoice } from '../ui/battle-menu.js';
import { resolveBattleBackgroundPath, type BattleBackgroundId } from '../data/battle-backgrounds.js';
import { BTL } from '../data/battle-constants.js';
import { createTextBox, updateTextBox, renderTextBox } from '../ui/text-box.js';
import {
  createFlash,
  updateFlash,
  renderFlash,
  createShake,
  updateShake,
  applyShake,
  resetShake,
  createFade,
  updateFade,
  renderFade,
  spawnDamageNumber,
  updatePopups,
  renderPopups,
  clearAllPopups,
  createLevelUpEffect,
  updateLevelUpEffect,
  renderLevelUpEffect,
  createCaptureSuccessEffect,
  updateCaptureSuccessEffect,
  renderCaptureSuccessEffect,
  createSendOutEffect,
  updateSendOutEffect,
  renderSendOutEffect,
  createAttackEffect,
  updateAttackEffect,
  renderAttackEffect,
  createStatusTurnEffect,
  updateStatusTurnEffect,
  renderStatusTurnEffect,
} from '../ui/battle-animations.js';
import {
  createBattleAnimationDirector,
  callStep,
  parallelStep,
  sequenceStep,
  tweenActorStep,
  waitStep,
  type BattleAnimationStep,
} from '../ui/battle-animation-director.js';
import { drawPokeballIcon } from '../ui/item-icons.js';
import {
  getCombinedTypeEffectiveness,
  getAbilityBattleEffects,
  getMoveBattleData,
  getPokemonCatchRate,
  getPokemonDisplayName,
  getMoveDisplayName,
  getMove,
  getPokemon,
  getLocalizedName,
  type EvolutionStep,
} from '../services/pokemon-data.js';
import { createPokemonFromData, calculateXpGain, checkAndApplyLevelUp, type StatGains } from '../systems/encounter.js';
import { sendCaughtToBox } from '../systems/pc-storage.js';
import { recordTrainerDefeat } from '../systems/reencounter.js';
import { getPlayerData, hasActiveGame, autoSave, setFlag } from '../systems/game-state.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { getBattleBackground } from '../engine/asset-generator.js';
import { t, isRTL, getLocale } from '../i18n/i18n.js';
import { getItem } from '../data/items.js';
import { applyItemEffect, consumeItem } from '../systems/item-effects.js';
import { resolveDialogue, type TrainerReward, type BilingualText } from '../systems/npc.js';
import { setBagMode, pendingItem as bagPendingItem, clearPendingItem } from '../scenes/bag.js';
import { setPokedexFocus } from '../scenes/pokedex.js';
import { setPartyMode, selectedPartyIndex, clearSelectedPartyIndex } from '../scenes/party.js';
import { setEvolutionData } from './evolution.js';
import { getAttackAnimationProfile } from '../systems/move-animation.js';
import { fireStoryTrigger } from '../systems/story-engine.js';
import {
  createMoveLearningSession,
  getMoveLearningAnnouncementLines,
  getMoveLearningResolutionMessage,
  setMoveLearningSession,
  type LevelUpMoveResult,
  type MoveLearningResolution,
} from '../systems/move-learning.js';
import { calculateCaptureChance } from '../systems/capture.js';
import type { BattlePokemonRuntimeState, BattleSideRuntimeState } from '../systems/battle-state.js';
import { BATTLE_STAT_PERCENT_STEP, createBattleSideRuntimeState } from '../systems/battle-state.js';
import {
  advanceSideEffectTurns,
  applyDrainHealing,
  applyEndOfTurnStatusEffects,
  applyLeechSeedEffect,
  applyLeaveUserAtOneHpCost,
  applyPostMoveTurnFlags,
  applySideEffects,
  applyTrapEndOfTurnEffect,
  applyStatChanges,
  applyMajorStatus,
  applyRecoilDamage,
  applyVolatileMoveEffects,
  calculateMoveHpEffectAmount,
  clearEndOfTurnFlags,
  clearMajorStatus,
  isSubstituteBypass,
  chooseEnemyMoveIndex,
  createBattleRuntimeStateForPokemon,
  clearChargingMove,
  determineTurnOrder,
  doesMoveHit,
  getChargingMoveId,
  getDisplayedSideStatuses,
  getDisplayedVolatileStatuses,
  getDisplayedStatChanges,
  getSideDamageTakenMultiplier,
  getModifiedStatValue,
  isMistActive,
  isBattlePokemonTrapped,
  isSafeguardActive,
  isTargetImmuneToMoveType,
  isTargetImmuneToStatusEffectFromMoveType,
  isTargetImmuneToVolatileEffectFromMoveType,
  processBeforeMoveEffects,
  processStartOfTurnStatus,
  rollCriticalHit,
  startChargingMove,
  tryApplyFlinch,
  applyRestEffect,
  applyHealPercent,
  applyEntryHazards,
  clearEntryHazards,
  clearScreens,
  type EntryHazardResult,
} from '../systems/battle-system.js';
import charactersManifest from '../data/sprites/characters.json';

export type BattleContext = 'grass' | 'water' | 'cave' | 'city' | 'gym' | 'elite' | 'route';
type LossOutcome = 'wild-whiteout' | 'trainer-whiteout' | 'trainer-roster';
type AiLevel = 1 | 2 | 3 | 4 | 5;

interface TrainerAIState {
  level: AiLevel;
  switchesUsed: number;
  chargingMovesStarted: number;
  itemsUsedByPartyIdx: Map<number, Set<string>>;
  itemUsesTotalHeal: number;
  itemUsesTotalCure: number;
}

/** Randomness factors per AI level: higher = more random suboptimal picks. */
const AI_RANDOMNESS: [number, number, number, number, number] = [0.65, 0.45, 0.28, 0.15, 0.06];

function getCharacterRoles(spriteType: string): string[] {
  const chars = (charactersManifest as any).characters as Record<string, { roles?: string[] }>;
  return chars[spriteType]?.roles ?? [];
}

function computeAiLevel(spriteType: string, explicit?: AiLevel): AiLevel {
  if (explicit) return explicit;
  const roles = getCharacterRoles(spriteType);
  // console.log({ spriteType, explicit, roles });

  if (roles.includes('elite-4') || roles.includes('champion')) return 5;
  if (roles.includes('gym-leader')) return Math.random() < 0.5 ? 4 : 5;
  if (roles.includes('story') || roles.includes('rival')) {
    const r = Math.random();
    if (r < 0.333) return 3;
    if (r < 0.667) return 4;
    return 5;
  }
  if (roles.includes('villain')) {
    const r = Math.random();
    if (r < 0.25) return 2;
    if (r < 0.5) return 3;
    if (r < 0.75) return 4;
    return 5;
  }

  // Fallback: check sprite name patterns for unnamed/custom sprites
  const s = spriteType.toLowerCase();
  if (s.includes('elite') || s.includes('champion')) return 5;
  if (s.startsWith('gym-')) return Math.random() < 0.5 ? 4 : 5;
  if (s.includes('rocket') || s.includes('villain') || s.includes('null-x')) {
    const r = Math.random();
    if (r < 0.25) return 2;
    if (r < 0.5) return 3;
    if (r < 0.75) return 4;
    return 5;
  }

  const r = Math.random();
  if (r < 0.1) return 1;
  if (r < 0.4) return 2;
  if (r < 0.75) return 3;
  if (r < 0.95) return 4;
  return 5;
}

function getDefaultBagItems(level: AiLevel): string[] {
  if (level >= 5)
    return ['max-potion', 'max-potion', 'full-restore', 'full-heal', 'full-heal', 'x-attack', 'x-special'];
  if (level >= 4) return ['hyper-potion', 'full-heal', 'x-attack'];
  return [];
}

type BattlePhase =
  | 'INTRO'
  | 'SELECT_ACTION'
  | 'SELECT_MOVE'
  | 'PLAYER_ATTACK'
  | 'ENEMY_TURN'
  | 'CHECK_WIN'
  | 'WIN'
  | 'XP_GAIN'
  | 'LEVEL_UP'
  | 'LEVEL_UP_MOVES'
  | 'LOSE'
  | 'RUN'
  | 'USE_ITEM'
  | 'TRAINER_NEXT_POKEMON'
  | 'TRAINER_NEXT_XP'
  | 'TRAINER_NEXT_LEVEL_UP'
  | 'TRAINER_NEXT_LEVEL_UP_MOVES'
  | 'TRAINER_REWARD'
  | 'TRAINER_REWARD_LEVEL_UP'
  | 'TRAINER_REWARD_LEVEL_UP_MOVES'
  | 'WAITING_BAG'
  | 'WAITING_PARTY'
  | 'WAITING_POKEDEX'
  | 'WAITING_MOVE_LEARN'
  | 'SWITCH_POKEMON'
  | 'CAPTURE_ANIM'
  | 'PLAYER_FAINT_SWITCH'
  | 'TRAINER_LOSS'
  | 'END_TURN_STATUS'
  | 'TRAINER_VOLUNTARY_SWITCH';

let pendingPlayer: Pokemon | null = null;
let pendingEnemy: Pokemon | null = null;
let pendingTrainerBattle: TrainerBattleData | null = null;
let pendingBattleContext: BattleContext = 'grass';
let pendingBattleBackground: BattleBackgroundId | null = null;

export interface TrainerBattleData {
  trainerName: { en: string; he: string };
  trainerId: string;
  party: Pokemon[];
  reward: TrainerReward;
  trainerSprite?: string; // e.g., 'youngster', 'lass'
  postBattleDialogue?: BilingualText[]; // Dialogue shown after defeat
  reencounterIndex?: number; // 0 = first fight, 1+ = rematch (items skipped on rematch)
  hasReencounter?: boolean; // true if trainer has re-encounter config (for phone registration)
  locationEn?: string; // trainer location for phone display
  locationHe?: string;
  aiLevel?: 1 | 2 | 3 | 4 | 5;
  bagItems?: string[];
  trainerSpriteType?: string; // used to auto-compute AI level from role
}

export function setBattleData(
  playerPokemon: Pokemon,
  enemyPokemon: Pokemon,
  context: BattleContext = 'grass',
  battleBackground: BattleBackgroundId | null = null,
): void {
  pendingPlayer = playerPokemon;
  pendingEnemy = enemyPokemon;
  pendingTrainerBattle = null;
  pendingBattleContext = context;
  pendingBattleBackground = battleBackground;
}

export function setTrainerBattleData(
  playerPokemon: Pokemon,
  trainerData: TrainerBattleData,
  context: BattleContext = 'grass',
  battleBackground: BattleBackgroundId | null = null,
): void {
  pendingPlayer = playerPokemon;
  pendingEnemy = trainerData.party[0];
  pendingTrainerBattle = trainerData;
  pendingBattleContext = context;
  pendingBattleBackground = battleBackground;
}

function calcDamage(
  atk: Pokemon,
  atkState: BattlePokemonRuntimeState,
  def: Pokemon,
  defState: BattlePokemonRuntimeState,
  defSideState: BattleSideRuntimeState,
  power: number,
  moveType: PokemonType,
  damageClass: string,
  criticalHit = false,
  attackStatOverride?: number,
): number {
  if (power <= 0) return 0;
  const isSpecial = damageClass === 'special';
  const burnMultiplier = damageClass === 'physical' && atk.status === 'burn' ? 0.5 : 1;
  const attackStat = attackStatOverride ?? getModifiedStatValue(atk, atkState, isSpecial ? 'specialAttack' : 'attack');
  const defenseStat = getModifiedStatValue(def, defState, isSpecial ? 'specialDefense' : 'defense');
  let defenderMultiplier = 1;
  if (def.abilityId) {
    for (const effect of getAbilityBattleEffects(def.abilityId)) {
      if (effect.kind === 'damageTakenMultiplier' && effect.moveTypes.includes(moveType)) {
        defenderMultiplier *= effect.multiplier;
      }
    }
  }
  defenderMultiplier *= getSideDamageTakenMultiplier(defSideState, damageClass);
  const lf = (2 * atk.level) / 5 + 2;
  const base = (lf * power * ((attackStat * burnMultiplier) / defenseStat)) / 50 + 2;
  const eff = getCombinedTypeEffectiveness(moveType, def.types);
  if (eff === 0) return 0;
  const stab = atk.types.includes(moveType) ? 1.5 : 1;
  const critMultiplier = criticalHit ? 1.5 : 1;
  const rand = 0.7 + Math.random() * 0.3;
  return Math.max(1, Math.floor(base * eff * stab * critMultiplier * defenderMultiplier * rand));
}

function effText(mt: PokemonType, dt: PokemonType[]): string | null {
  const e = getCombinedTypeEffectiveness(mt, dt);
  if (e >= 2) return t('battle.superEffective');
  if (e > 0 && e < 1) return t('battle.notVeryEffective');
  if (e === 0) return t('battle.noEffect');
  return null;
}

function doesMoveTargetOpponent(moveBattleData: ReturnType<typeof getMoveBattleData> | undefined): boolean {
  const target = moveBattleData?.target ?? 'selected-pokemon';
  return target !== 'user' && target !== 'users-field' && target !== 'ally' && target !== 'user-or-ally';
}

function getEffectImmuneLine(name: string): string {
  return t('battle.effectImmune', { name });
}

function getChargingLine(name: string, move: string): string {
  return t('battle.beganChargingMove', { name, move });
}

function getStatusAppliedLine(name: string, status: Pokemon['status']): string | null {
  switch (status) {
    case 'poison':
      return t('battle.statusPoison', { name });
    case 'burn':
      return t('battle.statusBurn', { name });
    case 'paralyze':
      return t('battle.statusParalyze', { name });
    case 'sleep':
      return t('battle.statusSleep', { name });
    case 'freeze':
      return t('battle.statusFreeze', { name });
    default:
      return null;
  }
}

function getTurnStatusLine(name: string, event: ReturnType<typeof processStartOfTurnStatus>['event']): string | null {
  switch (event) {
    case 'woke-up':
      return t('battle.wokeUp', { name });
    case 'fast-asleep':
      return t('battle.fastAsleep', { name });
    case 'thawed-out':
      return t('battle.thawedOut', { name });
    case 'frozen-solid':
      return t('battle.frozenSolid', { name });
    case 'fully-paralyzed':
      return t('battle.fullyParalyzed', { name });
    default:
      return null;
  }
}

function getTurnEffectLine(
  name: string,
  event: ReturnType<typeof processBeforeMoveEffects>['events'][number],
): string | null {
  switch (event) {
    case 'woke-up':
    case 'fast-asleep':
    case 'thawed-out':
    case 'frozen-solid':
    case 'fully-paralyzed':
      return getTurnStatusLine(name, event);
    case 'confused':
      return t('battle.confused', { name });
    case 'snapped-out':
      return t('battle.snappedOut', { name });
    case 'hurt-itself-confusion':
      return t('battle.hurtItselfConfusion', { name });
    case 'must-recharge':
      return t('battle.mustRecharge', { name });
    case 'flinched':
      return t('battle.flinched', { name });
    default:
      return null;
  }
}

function getMoveEffectAppliedLine(name: string, effectId: 'confusion' | 'leech-seed' | 'trap'): string {
  switch (effectId) {
    case 'confusion':
      return t('battle.confused', { name });
    case 'leech-seed':
      return t('battle.leechSeeded', { name });
    case 'trap':
      return t('battle.trapped', { name });
  }
}

function getSideEffectAppliedLine(name: string, effectId: 'reflect' | 'light-screen' | 'mist' | 'safeguard'): string {
  switch (effectId) {
    case 'reflect':
      return t('battle.reflectApplied', { name });
    case 'light-screen':
      return t('battle.lightScreenApplied', { name });
    case 'mist':
      return t('battle.mistApplied', { name });
    case 'safeguard':
      return t('battle.safeguardApplied', { name });
  }
}

function getSideEffectEndedLine(name: string, effectId: 'reflect' | 'light-screen' | 'mist' | 'safeguard'): string {
  switch (effectId) {
    case 'reflect':
      return t('battle.reflectEnded', { name });
    case 'light-screen':
      return t('battle.lightScreenEnded', { name });
    case 'mist':
      return t('battle.mistEnded', { name });
    case 'safeguard':
      return t('battle.safeguardEnded', { name });
  }
}

function getBattleStatLabel(stat: BattleStatId): string {
  if (isRTL()) {
    switch (stat) {
      case 'attack':
        return 'התקפה';
      case 'defense':
        return 'הגנה';
      case 'specialAttack':
        return 'התקפה מיוחדת';
      case 'specialDefense':
        return 'הגנה מיוחדת';
      case 'speed':
        return 'מהירות';
      case 'accuracy':
        return 'דיוק';
      case 'evasion':
        return 'התחמקות';
    }
  }

  switch (stat) {
    case 'attack':
      return 'Attack';
    case 'defense':
      return 'Defense';
    case 'specialAttack':
      return 'Sp. Atk';
    case 'specialDefense':
      return 'Sp. Def';
    case 'speed':
      return 'Speed';
    case 'accuracy':
      return 'Accuracy';
    case 'evasion':
      return 'Evasion';
  }

  return stat;
}

function getStatChangeLine(name: string, change: ReturnType<typeof applyStatChanges>[number]): string {
  const stat = getBattleStatLabel(change.stat);
  if (change.direction === 'rose') {
    return t(change.sharply ? 'battle.statRoseSharply' : 'battle.statRose', { name, stat });
  }
  return t(change.sharply ? 'battle.statFellHarshly' : 'battle.statFell', { name, stat });
}

function getMistBlockedLine(name: string): string {
  return t('battle.mistBlocked', { name });
}

function getSafeguardBlockedLine(name: string): string {
  return t('battle.safeguardBlocked', { name });
}

function normalizeBattleItemStat(stat: string): BattleStatId | null {
  switch (stat) {
    case 'attack':
    case 'defense':
    case 'specialAttack':
    case 'specialDefense':
    case 'speed':
    case 'accuracy':
    case 'evasion':
      return stat;
    default:
      return null;
  }
}

function doesAbilityAbsorbMove(target: Pokemon, moveType: PokemonType): boolean {
  if (!target.abilityId) return false;
  return getAbilityBattleEffects(target.abilityId).some((effect) => {
    return effect.kind === 'typeAbsorbHeal' && effect.moveTypes.includes(moveType);
  });
}

function buildHazardMessages(
  result: EntryHazardResult,
  pokemonName: string,
  sideState: BattleSideRuntimeState,
): string[] {
  const msgs: string[] = [];
  if (result.stealthRockDamage > 0) {
    msgs.push(t('battle.hazardStealthRockHit', { name: pokemonName }));
  } else if (result.stealthRockImmune && sideState.stealthRockActive) {
    msgs.push(t('battle.hazardNoEffect', { name: pokemonName, hazard: t('battle.hazardNameStealthRock') }));
  }
  if (result.spikesDamage > 0) {
    msgs.push(t('battle.hazardSpikesHit', { name: pokemonName }));
  } else if (result.spikesImmune && sideState.spikesLayers > 0) {
    msgs.push(t('battle.hazardNoEffect', { name: pokemonName, hazard: t('battle.hazardNameSpikes') }));
  }
  if (result.toxicSpikesAbsorbed) {
    msgs.push(t('battle.hazardToxicSpikesAbsorbed', { name: pokemonName }));
  } else if (result.statusApplied === 'poison' || result.statusApplied === 'badly-poison') {
    msgs.push(t('battle.hazardToxicSpikesPoison', { name: pokemonName }));
  } else if (result.toxicSpikesImmune && sideState.toxicSpikesLayers > 0) {
    msgs.push(t('battle.hazardNoEffect', { name: pokemonName, hazard: t('battle.hazardNameToxicSpikes') }));
  }
  return msgs;
}

export function createBattleScene(
  input: InputManager,
  stateMachine: StateMachine,
  _canvas: HTMLCanvasElement,
  audio: AudioManager,
): Scene {
  let phase: BattlePhase = 'INTRO';
  let player: Pokemon;
  let enemy: Pokemon;
  let playerHpBar: ReturnType<typeof createHPBar>;
  let enemyHpBar: ReturnType<typeof createHPBar>;
  let playerBattleState: BattlePokemonRuntimeState;
  let enemyBattleState: BattlePokemonRuntimeState;
  let playerSideState: BattleSideRuntimeState;
  let enemySideState: BattleSideRuntimeState;
  let menu: ReturnType<typeof createBattleMenu>;
  let textBox: ReturnType<typeof createTextBox> | null = null;
  let selMove = 0;
  let flash: ReturnType<typeof createFlash> | null = null;
  let shake: ReturnType<typeof createShake> | null = null;
  let fade: ReturnType<typeof createFade> | null = null;
  let phaseTimer = 0;
  let xpGained = 0;
  let levelUpFx: ReturnType<typeof createLevelUpEffect> | null = null;
  let statGainsPopup: StatGains | null = null;
  let captureSuccessFx: ReturnType<typeof createCaptureSuccessEffect> | null = null;
  let sendOutFx: ReturnType<typeof createSendOutEffect> | null = null;
  let attackFx: ReturnType<typeof createAttackEffect> | null = null;
  let statusTurnFx: Array<ReturnType<typeof createStatusTurnEffect>> = [];
  let pendingNewMoves: LevelUpMoveResult[] = [];
  let activeMoveLearningPrompt: LevelUpMoveResult | null = null;
  let pendingMoveLearningResolution: MoveLearningResolution | null = null;
  let pendingMoveLearningPhase: BattlePhase | null = null;
  let pendingEvolution: EvolutionStep | null = null;
  let waitingForBag = false;
  let waitingForParty = false;
  let waitingForPokedex = false;
  let previousLeadId: number | null = null;
  // True when the switch was forced by a faint — enemy does NOT get a free attack
  let isForcedFaintSwitch = false;
  let activePartyIndex = 0; // Index of the active Pokemon in the player's party
  let battleRoster = new Set<number>(); // Party indices that have entered this battle
  let battleTurnCounts = new Map<number, number>(); // Active turns per party slot this battle
  let pendingTurnCredit = false; // Whether to credit a turn to active Pokemon after phase resolves
  let maxRosterSize = 0; // Max Pokemon player can use (= trainer's party size, or 6 for wild)
  let isTrainerBattle = false;
  let trainerData: TrainerBattleData | null = null;
  let trainerPartyIndex = 0;
  let battleContext: BattleContext = 'grass';
  let battleBackground: BattleBackgroundId | null = null;
  let bgImage: HTMLImageElement | null = null;
  let showTrainerSprite = false; // Show trainer sprite during intro
  let enemyGoesFirst = false;
  let enemySelectedMoveIndex = -1;
  let enemyAlreadyAttacked = false;
  let pendingForcedPlayerMoveIndex: number | null = null;
  let turnNumber = 0;
  let lossDialogueShown = false;
  let pendingLossOutcome: LossOutcome | null = null;
  let soloOpeningSwitchUsed = false;
  let activeBallId: string | null = null;
  let pendingCaptureOutcome: { itemId: string; caught: boolean } | null = null;
  let pendingEnemySendOutAnimation = false;
  let trainerAIState: TrainerAIState | null = null;
  let pendingPlayerSendOutAnimation = false;
  let pendingPlayerEntryHazard = false;
  let pendingEnemyEntryHazard = false;
  let pendingSubstituteCarryover: { active: boolean; hitsAbsorbed: number } | null = null;
  let pendingDestinyBondMsg: string | null = null;
  let substituteDollFlash: { timer: number; duration: number; color: string; side: 'player' | 'enemy' } | null = null;
  const animationDirector = createBattleAnimationDirector();

  function useItem(itemId: string): void {
    const pd = getPlayerData();
    const def = getItem(itemId);
    if (!def) return;

    // Stat-boost items: modify temporary battle stages
    if (def.effect.type === 'stat-boost') {
      const stat = normalizeBattleItemStat(def.effect.stat);
      if (!stat) {
        textBox = createTextBox([t('battle.cantDoThat')], isRTL());
        phase = 'USE_ITEM';
        phaseTimer = 0;
        return;
      }

      const applied = applyStatChanges(
        playerBattleState,
        [
          {
            stat,
            stages: def.effect.stages,
            target: 'user',
            chance: 100,
          },
        ],
        'user',
      );

      if (applied.length === 0) {
        textBox = createTextBox([t('battle.statWontGoHigher')], isRTL());
        phase = 'USE_ITEM';
        phaseTimer = 0;
        return;
      }

      consumeItem(pd.items, itemId);
      syncPlayerBar();
      audio.playSFX('heal');
      textBox = createTextBox(
        [
          t('battle.usedItem', { item: getLocalizedName(def.name), name: getPokemonDisplayName(player.id) }),
          ...applied.map((change) => getStatChangeLine(getPokemonDisplayName(player.id), change)),
        ],
        isRTL(),
      );
      phase = 'USE_ITEM';
      phaseTimer = 0;
      return;
    }

    // Capture items (pokeballs)
    if (def.effect.type === 'capture') {
      if (isTrainerBattle) {
        textBox = createTextBox([t('battle.cantCatchTrainer')], isRTL());
        phase = 'USE_ITEM';
        phaseTimer = 0;
        return;
      }
      consumeItem(pd.items, itemId);
      const random = Math.random();
      // console.log({ random });
      startCaptureSequence(itemId, random < getCaptureChance(def.effect.rate));
      phaseTimer = 0;
      return;
    }

    // All other items: centralized effect system
    const result = applyItemEffect(itemId, player);
    if (result.success) {
      consumeItem(pd.items, itemId);
      // If the item cleared the status, also clear the battle runtime state
      // (which is what processStartOfTurnStatus reads for PAR/FRZ/SLP/PSN effects)
      if (player.status === null) {
        playerBattleState.majorStatus = null;
        playerBattleState.sleepTurnsRemaining = 0;
        playerBattleState.freezeTurnsRemaining = 0;
        playerBattleState.badlyPoisonTurns = 0;
      }
      setHP(playerHpBar, player.hp);
      setStatus(playerHpBar, player.status ?? '');
      audio.playSFX('heal');
    }
    textBox = createTextBox(
      [t('battle.usedItem', { item: getLocalizedName(def.name), name: getPokemonDisplayName(player.id) })],
      isRTL(),
    );
    phase = 'USE_ITEM';
    phaseTimer = 0;
  }

  function arrangeNextTrainerPokemon(): void {
    if (!trainerData || !trainerAIState || trainerAIState.level < 3) return;
    const party = trainerData.party;
    const nextIdx = trainerPartyIndex + 1;
    if (nextIdx >= party.length) return;

    let bestIdx = nextIdx;
    let bestScore = -Infinity;
    for (let i = nextIdx; i < party.length; i++) {
      const candidate = party[i];
      if (!candidate || candidate.hp <= 0) continue;
      let score = 0;
      for (const pType of player.types) {
        const eff = getCombinedTypeEffectiveness(
          pType as import('../types/index.js').PokemonType,
          candidate.types as import('../types/index.js').PokemonType[],
        );
        if (eff < 1) score += 200;
        else if (eff > 1) score -= 100;
      }
      for (const cType of candidate.types) {
        const eff = getCombinedTypeEffectiveness(
          cType as import('../types/index.js').PokemonType,
          player.types as import('../types/index.js').PokemonType[],
        );
        if (eff > 1) score += 150;
      }
      score += (candidate.hp / candidate.maxHp) * 50;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx !== nextIdx) {
      const temp = party[nextIdx];
      party[nextIdx] = party[bestIdx];
      party[bestIdx] = temp;
    }
  }

  function sendOutNextTrainerPokemon(): void {
    arrangeNextTrainerPokemon();
    trainerPartyIndex++;
    enemy = trainerData!.party[trainerPartyIndex];
    enemyBattleState = createBattleRuntimeStateForPokemon(enemy);
    enemySelectedMoveIndex = -1;
    // Update enemy types for battle helper display
    if (menu) menu.enemyTypes = (enemy.types ?? []) as import('../types/index.js').PokemonType[];
    enemyAlreadyAttacked = false;
    enemyHpBar = createHPBar(enemy.id, enemy.level, enemy.hp, enemy.maxHp, BTL.OPP_BAR.x, BTL.OPP_BAR.y, false);
    setStatus(enemyHpBar, enemy.status ?? '');
    setVolatileStatuses(enemyHpBar, [
      ...getDisplayedVolatileStatuses(enemyBattleState),
      ...getDisplayedSideStatuses(enemySideState),
    ]);
    loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
    if (hasActiveGame()) getPlayerData().pokedex[enemy.id] = true;
    pendingEnemySendOutAnimation = true;
    animationDirector.setActorState('enemy', {
      x: 26,
      y: -8,
      scaleX: 0.55,
      scaleY: 0.55,
      alpha: 0,
      rotation: -0.2,
      visible: false,
    });
    textBox = createTextBox([t('battle.trainerSentOut', { name: getPokemonDisplayName(enemy.id) })], isRTL());
    phase = 'INTRO';
  }

  function awardTrainerReward(): void {
    const td = trainerData!;
    const isRematch = (td.reencounterIndex ?? 0) > 0;
    if (hasActiveGame()) {
      const pd = getPlayerData();
      const reward = td.reward;
      pd.money += reward.money;
      // Items only on the first encounter
      if (!isRematch && reward.items) {
        audio.playItemFound();
        for (const ri of reward.items) {
          pd.items[ri.itemId] = (pd.items[ri.itemId] || 0) + ri.quantity;
        }
      }
      // Badge + story events only on first encounter
      if (!isRematch) {
        if (reward.badge !== undefined && reward.badge >= 1 && reward.badge <= 8) {
          pd.badges |= 1 << (reward.badge - 1);
          audio.playBadgeEarned();
          fireStoryTrigger({ type: 'badge-earned', badge: reward.badge });
        }
        if (reward.storyEvent) {
          setFlag(pd, reward.storyEvent);
        }
        setFlag(pd, `trainer-${td.trainerId}-defeated`);
        fireStoryTrigger({ type: 'trainer-defeated', trainerId: td.trainerId });
      }
      // Always record the defeat for re-encounter tracking
      recordTrainerDefeat(td.trainerId);
      // Register phone contact on first defeat if trainer supports re-encounters
      if (!isRematch && td.hasReencounter) {
        if (!pd.phoneContacts.some((c) => c.trainerId === td.trainerId)) {
          pd.phoneContacts.push({
            trainerId: td.trainerId,
            trainerName: td.trainerName,
            locationEn: td.locationEn ?? '',
            locationHe: td.locationHe ?? '',
          });
        }
      }
      autoSave();
    }

    // Build reward message lines
    const lines: string[] = [t('battle.trainerReward', { money: td.reward.money })];
    if (!isRematch && td.reward.items) {
      for (const ri of td.reward.items) {
        const itemDef = getItem(ri.itemId);
        const itemName = itemDef ? getLocalizedName(itemDef.name) : ri.itemId;
        lines.push(t('battle.trainerRewardItem', { item: itemName, qty: ri.quantity }));
      }
    }
    if (!isRematch && td.reward.badge !== undefined) {
      lines.push(t('battle.trainerRewardBadge', { badge: td.reward.badge }));
    }
    // Append post-battle dialogue if present (resolved to current locale)
    if (td.postBattleDialogue && td.postBattleDialogue.length > 0) {
      lines.push(...resolveDialogue(td.postBattleDialogue, getLocale()));
    }

    textBox = createTextBox(lines, isRTL());
    phase = 'XP_GAIN';
    trainerData = null;
  }

  function init(): void {
    isTrainerBattle = false;
    trainerData = null;
    trainerPartyIndex = 0;
    showTrainerSprite = false;

    if (pendingTrainerBattle) {
      isTrainerBattle = true;
      trainerData = pendingTrainerBattle;
      trainerPartyIndex = 0;
      showTrainerSprite = true; // Show trainer sprite during initial intro
      pendingTrainerBattle = null;
      // Preload trainer sprite if available
      if (trainerData.trainerSprite) {
        loadImage(`/sprites/trainers/${trainerData.trainerSprite}.png`).catch(() => {});
      }
    }

    if (pendingPlayer && pendingEnemy) {
      player = pendingPlayer;
      enemy = pendingEnemy;
      // Determine which party index this player Pokemon corresponds to
      if (hasActiveGame()) {
        const pd = getPlayerData();
        const idx = pd.party.findIndex((p) => p === player);
        activePartyIndex = idx >= 0 ? idx : 0;
      } else {
        activePartyIndex = 0;
      }
      pendingPlayer = null;
      pendingEnemy = null;
    } else {
      player = (hasActiveGame() && getPlayerData().party[0]) || fallbackPlayer();
      enemy = fallbackEnemy();
    }
    battleContext = pendingBattleContext;
    battleBackground = pendingBattleBackground;
    pendingBattleContext = 'grass';
    pendingBattleBackground = null;
    // V2 layout: opponent bar at (136,12), player bar position computed dynamically
    enemyHpBar = createHPBar(enemy.id, enemy.level, enemy.hp, enemy.maxHp, BTL.OPP_BAR.x, BTL.OPP_BAR.y, false);
    playerHpBar = createHPBar(
      player.id,
      player.level,
      player.hp,
      player.maxHp,
      BTL.PLY_BAR_X,
      BTL.PLY_BAR_BOTTOM - 18,
      true,
      player.xp,
      player.xpToNext,
    );
    playerBattleState = createBattleRuntimeStateForPokemon(player);
    enemyBattleState = createBattleRuntimeStateForPokemon(enemy);
    playerSideState = createBattleSideRuntimeState();
    enemySideState = createBattleSideRuntimeState();
    setStatus(enemyHpBar, enemy.status ?? '');
    setStatus(playerHpBar, player.status ?? '');
    setVolatileStatuses(enemyHpBar, [
      ...getDisplayedVolatileStatuses(enemyBattleState),
      ...getDisplayedSideStatuses(enemySideState),
    ]);
    setVolatileStatuses(playerHpBar, [
      ...getDisplayedVolatileStatuses(playerBattleState),
      ...getDisplayedSideStatuses(playerSideState),
    ]);
    menu = createBattleMenu(player.moves);
    menu.playerPokemon = player;
    menu.party = hasActiveGame() ? getPlayerData().party : [player];
    menu.enemyTypes = (enemy.types ?? []) as import('../types/index.js').PokemonType[];
    // Consume one Battle Helper charge if enabled
    if (hasActiveGame()) {
      const pd = getPlayerData();
      if (pd.battleHelperEnabled && pd.battleHelperBattles > 0) {
        pd.battleHelperBattles--;
        menu.battleHelperActive = true;
        if (pd.battleHelperBattles === 0) pd.battleHelperEnabled = false;
      } else {
        menu.battleHelperActive = false;
      }
    }
    textBox = null;
    flash = null;
    shake = null;
    levelUpFx = null;
    statGainsPopup = null;
    captureSuccessFx = null;
    sendOutFx = null;
    attackFx = null;
    statusTurnFx = [];
    waitingForBag = false;
    waitingForParty = false;
    waitingForPokedex = false;
    previousLeadId = null;
    pendingNewMoves = [];
    activeMoveLearningPrompt = null;
    pendingMoveLearningResolution = null;
    pendingMoveLearningPhase = null;
    enemyGoesFirst = false;
    enemySelectedMoveIndex = -1;
    enemyAlreadyAttacked = false;
    turnNumber = 0;
    pendingTurnCredit = false;
    lossDialogueShown = false;
    pendingLossOutcome = null;
    soloOpeningSwitchUsed = false;
    // Initialize battle roster: player's first Pokemon is automatically registered
    battleRoster = new Set<number>([activePartyIndex]);
    battleTurnCounts = new Map<number, number>([[activePartyIndex, 0]]);
    maxRosterSize = isTrainerBattle && trainerData ? trainerData.party.length : 6;
    activeBallId = null;
    pendingCaptureOutcome = null;
    pendingEnemySendOutAnimation = isTrainerBattle;
    pendingPlayerSendOutAnimation = true;
    pendingPlayerEntryHazard = false;
    pendingEnemyEntryHazard = false;
    pendingSubstituteCarryover = null;
    substituteDollFlash = null;
    trainerAIState =
      isTrainerBattle && trainerData
        ? {
            level: computeAiLevel(trainerData.trainerSpriteType ?? '', trainerData.aiLevel),
            switchesUsed: 0,
            chargingMovesStarted: 0,
            itemsUsedByPartyIdx: new Map(),
            itemUsesTotalHeal: 0,
            itemUsesTotalCure: 0,
          }
        : null;
    animationDirector.clear();
    animationDirector.resetActors();
    animationDirector.setActorState('ball', { visible: false });
    animationDirector.setActorState('player', {
      x: -24,
      y: 8,
      scaleX: 0.6,
      scaleY: 0.6,
      alpha: 0,
      rotation: 0.14,
      visible: false,
    });
    if (isTrainerBattle) {
      animationDirector.setActorState('enemy', {
        x: 26,
        y: -8,
        scaleX: 0.55,
        scaleY: 0.55,
        alpha: 0,
        rotation: -0.2,
        visible: false,
      });
    }
    fade = createFade(true, 0.5);
    clearAllPopups();
    pendingEvolution = null;
    phase = 'INTRO';
    phaseTimer = 0;
    xpGained = 0;
    // Preload Pokemon sprites
    loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
    loadImage(`/sprites/pokemon/back/${player.id}.png`).catch(() => {});
    // Try to load tile-selected or context-mapped background image
    bgImage = null;
    const bgPath = resolveBattleBackgroundPath(battleBackground, battleContext);
    if (bgPath) {
      loadImage(bgPath)
        .then((img) => {
          bgImage = img;
        })
        .catch(() => {
          bgImage = null;
        });
    }
  }

  /** Trigger level-up sparkle + jingle. Uses player sprite center for the effect. */
  function triggerLevelUpFx(): void {
    const barX = BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2;
    const barY = BTL.PLY_SPRITE.y;
    levelUpFx = createLevelUpEffect(barX, barY);
    audio.playLevelUp();
  }

  function recordBattleTurn(partyIndex: number): void {
    battleTurnCounts.set(partyIndex, (battleTurnCounts.get(partyIndex) ?? 0) + 1);
  }

  function findMoveIndexById(pokemon: Pokemon, moveId: number): number | null {
    const moveIndex = pokemon.moves.findIndex((move) => move.id === moveId);
    return moveIndex >= 0 ? moveIndex : null;
  }

  function getForcedPlayerMoveIndex(): number | null {
    const chargingMoveId = getChargingMoveId(playerBattleState);
    if (chargingMoveId === null) return null;
    return findMoveIndexById(player, chargingMoveId);
  }

  // --- Trainer AI item helpers ---

  function isHealItem(id: string): boolean {
    return ['max-potion', 'hyper-potion', 'super-potion', 'full-restore'].includes(id);
  }

  function isCureItem(id: string): boolean {
    return ['full-heal', 'antidote', 'full-restore', 'awakening', 'ice-heal', 'burn-heal', 'parlyz-heal'].includes(id);
  }

  function isStatBoostItem(id: string): boolean {
    return ['x-attack', 'x-defense', 'x-speed', 'x-special', 'x-sp-def'].includes(id);
  }

  function getStatBoostStat(id: string): BattleStatId | null {
    const map: Record<string, BattleStatId> = {
      'x-attack': 'attack',
      'x-defense': 'defense',
      'x-speed': 'speed',
      'x-special': 'specialAttack',
      'x-sp-def': 'specialDefense',
    };
    return (map[id] as BattleStatId) ?? null;
  }

  function getBestBoostItemId(bagItems: string[]): string | null {
    const preferred = enemy.attack >= enemy.specialAttack ? 'x-attack' : 'x-special';
    for (const id of [preferred, 'x-defense', 'x-sp-def', 'x-speed']) {
      if (bagItems.includes(id)) return id;
    }
    return null;
  }

  function checkTrainerItemUse(): { itemId: string; itemName: string } | null {
    const ai = trainerAIState;
    if (!ai || ai.level < 4) return null;
    const remaining = trainerData ? trainerData.party.filter((_, i) => i >= trainerPartyIndex).length : 0;
    if (ai.level === 4 && remaining > 3) return null;

    const idx = trainerPartyIndex;
    const usedByThis = ai.itemsUsedByPartyIdx.get(idx) ?? new Set<string>();
    // Use explicit bag items if provided, otherwise use level-based defaults
    const bag = trainerData?.bagItems?.length ? trainerData.bagItems : getDefaultBagItems(ai.level);
    if (!bag.length) return null;

    const def = (id: string) => {
      const d = getItem(id);
      return d ? getLocalizedName(d.name) : id;
    };

    // Priority 1: stat boost on this Pokemon's first trainer action
    if (!usedByThis.has('boost')) {
      const boostId = getBestBoostItemId(bag);
      if (boostId) return { itemId: boostId, itemName: def(boostId) };
    }

    // Priority 2: status cure (up to 2 total)
    if (enemyBattleState.majorStatus !== null && ai.itemUsesTotalCure < 2 && !usedByThis.has('cure')) {
      const cureId = bag.find((id) => isCureItem(id));
      if (cureId) return { itemId: cureId, itemName: def(cureId) };
    }

    // Priority 3: heal when HP < 45% (up to 2 total)
    if (enemy.hp / enemy.maxHp < 0.45 && ai.itemUsesTotalHeal < 2 && !usedByThis.has('heal')) {
      const healId = bag.find((id) => isHealItem(id));
      if (healId) return { itemId: healId, itemName: def(healId) };
    }

    return null;
  }

  function applyTrainerItemEffect(itemId: string): void {
    const ai = trainerAIState!;
    const idx = trainerPartyIndex;
    const usedByThis = ai.itemsUsedByPartyIdx.get(idx) ?? new Set<string>();

    if (isStatBoostItem(itemId)) {
      const stat = getStatBoostStat(itemId);
      if (stat) {
        const current = enemyBattleState.statModifiers[stat];
        enemyBattleState.statModifiers[stat] = Math.max(-200, Math.min(200, current + BATTLE_STAT_PERCENT_STEP));
      }
      usedByThis.add('boost');
    } else if (isCureItem(itemId)) {
      if (itemId === 'full-restore') {
        enemy.hp = enemy.maxHp;
        setHP(enemyHpBar, enemy.hp);
      }
      clearMajorStatus(enemy, enemyBattleState);
      setStatus(enemyHpBar, '');
      usedByThis.add('cure');
      ai.itemUsesTotalCure++;
    } else if (isHealItem(itemId)) {
      if (itemId === 'full-restore') {
        enemy.hp = enemy.maxHp;
        clearMajorStatus(enemy, enemyBattleState);
        setStatus(enemyHpBar, '');
      } else if (itemId === 'max-potion') {
        enemy.hp = enemy.maxHp;
      } else if (itemId === 'hyper-potion') {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + 200);
      } else {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + 50);
      }
      setHP(enemyHpBar, enemy.hp);
      usedByThis.add('heal');
      ai.itemUsesTotalHeal++;
    }

    ai.itemsUsedByPartyIdx.set(idx, usedByThis);
  }

  function findBestSwitchTarget(): number | null {
    const ai = trainerAIState;
    if (!ai || !isTrainerBattle || !trainerData) return null;
    const maxSwitches = ai.level >= 5 ? 3 : ai.level >= 4 ? 2 : 1;
    if (ai.switchesUsed >= maxSwitches) return null;

    // Only switch when player has type advantage against current enemy
    let playerHasAdvantage = false;
    for (const pType of player.types) {
      if (
        getCombinedTypeEffectiveness(
          pType as import('../types/index.js').PokemonType,
          enemy.types as import('../types/index.js').PokemonType[],
        ) > 1
      ) {
        playerHasAdvantage = true;
        break;
      }
    }
    if (!playerHasAdvantage) return null;

    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = trainerPartyIndex + 1; i < trainerData.party.length; i++) {
      const candidate = trainerData.party[i];
      if (!candidate || candidate.hp <= 0) continue;
      let score = 0;
      for (const pType of player.types) {
        const eff = getCombinedTypeEffectiveness(
          pType as import('../types/index.js').PokemonType,
          candidate.types as import('../types/index.js').PokemonType[],
        );
        if (eff < 1) score += 200;
        else if (eff > 1) score -= 100;
      }
      for (const cType of candidate.types) {
        const eff = getCombinedTypeEffectiveness(
          cType as import('../types/index.js').PokemonType,
          player.types as import('../types/index.js').PokemonType[],
        );
        if (eff > 1) score += 150;
      }
      score += (candidate.hp / candidate.maxHp) * 50;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx >= 0 && bestScore > 0 ? bestIdx : null;
  }

  function executeTrainerItemUse(itemId: string, itemName: string): void {
    applyTrainerItemEffect(itemId);
    const trainerName = getLocalizedName(trainerData!.trainerName);
    const pokemonName = getPokemonDisplayName(enemy.id);
    textBox = createTextBox(
      [t('battle.trainerUsedItem', { trainer: trainerName, item: itemName, name: pokemonName })],
      isRTL(),
    );
    phase = 'ENEMY_TURN';
    enemyGoesFirst = true; // Player attacks after this text resolves
  }

  function executeTrainerVoluntarySwitch(targetPartyIdx: number): void {
    const party = trainerData!.party;
    const current = party[trainerPartyIndex];
    const target = party[targetPartyIdx];

    // Rearrange party: insert target at current position, shift current to right after
    party.splice(targetPartyIdx, 1);
    party.splice(trainerPartyIndex, 0, target);
    // Now party[trainerPartyIndex] = target, party[trainerPartyIndex+1] = current (withdrawn, available later)

    enemy = party[trainerPartyIndex];
    enemyBattleState = createBattleRuntimeStateForPokemon(enemy);
    enemySelectedMoveIndex = -1;
    if (menu) menu.enemyTypes = (enemy.types ?? []) as import('../types/index.js').PokemonType[];
    enemyAlreadyAttacked = false;
    enemyHpBar = createHPBar(enemy.id, enemy.level, enemy.hp, enemy.maxHp, BTL.OPP_BAR.x, BTL.OPP_BAR.y, false);
    setStatus(enemyHpBar, enemy.status ?? '');
    setVolatileStatuses(enemyHpBar, [
      ...getDisplayedVolatileStatuses(enemyBattleState),
      ...getDisplayedSideStatuses(enemySideState),
    ]);
    loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
    if (hasActiveGame()) getPlayerData().pokedex[enemy.id] = true;

    trainerAIState!.switchesUsed++;
    // Clear item-use tracking for this slot so new Pokemon gets fresh item access
    trainerAIState!.itemsUsedByPartyIdx.delete(trainerPartyIndex);

    pendingEnemySendOutAnimation = true;
    animationDirector.setActorState('enemy', {
      x: 26,
      y: -8,
      scaleX: 0.55,
      scaleY: 0.55,
      alpha: 0,
      rotation: -0.2,
      visible: false,
    });

    const trainerName = getLocalizedName(trainerData!.trainerName);
    textBox = createTextBox(
      [
        t('battle.trainerWithdrew', { trainer: trainerName, name: getPokemonDisplayName(current.id) }),
        t('battle.trainerSentOut', { name: getPokemonDisplayName(enemy.id) }),
      ],
      isRTL(),
    );

    phase = 'TRAINER_VOLUNTARY_SWITCH';
    enemyGoesFirst = true; // Player attacks after switch animation resolves
  }

  function handleTrainerTurnPriority(): boolean {
    if (!isTrainerBattle || !trainerAIState) return false;

    const itemAction = checkTrainerItemUse();
    if (itemAction) {
      executeTrainerItemUse(itemAction.itemId, itemAction.itemName);
      return true;
    }

    if (trainerAIState.level >= 3) {
      const switchTarget = findBestSwitchTarget();
      if (switchTarget !== null) {
        executeTrainerVoluntarySwitch(switchTarget);
        return true;
      }
    }

    return false;
  }

  function scoreMoveForEnemy(moveIndex: number): number {
    const move = enemy.moves[moveIndex];
    if (!move) return -Infinity;
    if (move.currentPp <= 0) return -Infinity;

    const movePower = move.power ?? 0;
    const battleData = getMoveBattleData(move.id);
    const moveFullData = getMove(move.id);
    const damageClass = moveFullData?.damageClass ?? (movePower > 0 ? 'physical' : 'status');
    const isOhko = battleData?.behaviorTags?.includes('ohko') ?? false;
    const isCharging = battleData?.behaviorTags?.includes('requires-charge-turn') ?? false;
    const isRest = battleData?.behaviorTags?.includes('rest') ?? false;
    const isSelfHeal = (battleData?.healingPercent ?? 0) > 0 && battleData?.target === 'user';

    const ai = trainerAIState;
    const enemyHpRatio = enemy.hp / enemy.maxHp;
    const playerHpRatio = player.hp / player.maxHp;

    // --- OHKO moves (Horn Drill, Fissure, etc.): gamble — only worthwhile on a healthy opponent ---
    if (isOhko) {
      if (playerHpRatio < 0.7) return -Infinity;
      // Effective accuracy considering stat modifiers (base ~30%)
      const accMod = enemyBattleState.statModifiers.accuracy;
      const evaMod = playerBattleState.statModifiers.evasion;
      const effectiveAcc = (30 * (1 + accMod / 100)) / Math.max(0.01, 1 + Math.max(0, evaMod) / 100);
      return effectiveAcc * 15;
    }

    // --- Charging moves: cap at 2 initiations ---
    if (isCharging && enemyBattleState.chargingMoveId === null && (ai?.chargingMovesStarted ?? 0) >= 2)
      return -Infinity;

    // --- Rest: only when very low HP ---
    if (isRest) {
      if (enemyHpRatio > 0.33) return -Infinity;
      let s = (1 - enemyHpRatio) * 800;
      if (enemyBattleState.majorStatus !== null) s += 300;
      return s;
    }

    // --- Other self-heal moves (Recover, Roost): only below 50% HP ---
    if (isSelfHeal) {
      if (enemyHpRatio >= 0.5) return -Infinity;
      return (1 - enemyHpRatio) * 600;
    }

    let score = 0;

    if (movePower > 0) {
      const effectiveness = getCombinedTypeEffectiveness(move.type, player.types);
      if (effectiveness === 0) return -Infinity;

      const stab = enemy.types.includes(move.type) ? 1.5 : 1;

      // Physical/Special preference
      const physicalBias = enemy.attack > enemy.specialAttack * 1.2;
      const specialBias = enemy.specialAttack > enemy.attack * 1.2;
      let statBias = 1.0;
      if (physicalBias && damageClass === 'physical') statBias = 1.3;
      else if (physicalBias && damageClass === 'special') statBias = 0.7;
      else if (specialBias && damageClass === 'special') statBias = 1.3;
      else if (specialBias && damageClass === 'physical') statBias = 0.7;

      score += movePower * effectiveness * stab * statBias;

      // KO bonus: scaled by how much HP the player has left
      const attackStat =
        damageClass === 'physical'
          ? getModifiedStatValue(enemy, enemyBattleState, 'attack')
          : getModifiedStatValue(enemy, enemyBattleState, 'specialAttack');
      const defenseStat =
        damageClass === 'physical'
          ? getModifiedStatValue(player, playerBattleState, 'defense')
          : getModifiedStatValue(player, playerBattleState, 'specialDefense');
      const estimatedDamage =
        ((((2 * enemy.level) / 5 + 2) * movePower * attackStat) / defenseStat / 50 + 2) * stab * effectiveness;
      if (estimatedDamage >= player.hp) {
        if (playerHpRatio > 0.3) score += 10000;
        else if (playerHpRatio > 0.15) score += 3000;
        // Below 15%: any move can finish — no bonus needed
      }

      // Prefer higher accuracy moves when player is nearly dead
      if (playerHpRatio < 0.3) {
        const accuracy = moveFullData?.accuracy ?? 100;
        if (accuracy < 100) score -= (100 - accuracy) * 5;
      }
    } else {
      // Status / utility move
      const ailment = battleData?.ailment ?? null;
      const effects = battleData?.effects ?? [];

      // Evasion-raising moves
      const raisesEvasion =
        battleData?.statChanges?.some((sc) => sc.stat === 'evasion' && sc.target === 'user' && sc.stages > 0) ?? false;
      if (raisesEvasion) {
        if (enemyBattleState.statModifiers.evasion >= 100) return -Infinity; // Already +2 stages
        score += 350;
      }

      // Substitute blocks all opponent-targeting effects — skip moves that would be completely wasted
      if (playerBattleState.substituteActive) {
        const ailment = battleData?.ailment ?? null;
        const hasOpponentTarget =
          (ailment !== null && ailment.target === 'target') ||
          effects.some((e) => e.target === 'target') ||
          (battleData?.statChanges?.some((sc) => sc.target === 'target' && sc.stages < 0) ?? false);
        if (hasOpponentTarget) return -Infinity;
      }

      // Entry hazard moves — set up once, never repeat
      // Check both the live side-state AND the planned flag (set when move is chosen, before animation fires)
      const isEntryHazardSR = battleData?.behaviorTags?.includes('stealth-rock') ?? false;
      const isEntryHazardSpikes = battleData?.behaviorTags?.includes('spikes') ?? false;
      const isEntryHazardToxicSpikes = battleData?.behaviorTags?.includes('toxic-spikes') ?? false;
      if (isEntryHazardSR) {
        if (playerSideState.stealthRockActive) return -Infinity;
        return 400;
      }
      if (isEntryHazardSpikes) {
        if (playerSideState.spikesLayers >= 3) return -Infinity;
        return 350;
      }
      if (isEntryHazardToxicSpikes) {
        if (playerSideState.toxicSpikesLayers >= 2) return -Infinity;
        return 300;
      }

      // Volatile status (confusion, leech-seed, trap) — don't reapply, and respect type immunity
      const appliesConfusion = effects.some((e) => e.id === 'confusion' && e.target === 'target');
      const appliesLeechSeed = effects.some((e) => e.id === 'leech-seed' && e.target === 'target');
      const appliesTrap = effects.some((e) => e.id === 'trap' && e.target === 'target');
      if (appliesConfusion && playerBattleState.confusionTurnsRemaining > 0) return -Infinity;
      if (appliesLeechSeed) {
        if (playerBattleState.leechSeeded) return -Infinity;
        if (player.types.includes('grass')) return -Infinity; // Grass types immune to leech seed
      }
      if (appliesTrap && playerBattleState.trappedTurnsRemaining > 0) return -Infinity;

      if (appliesConfusion || appliesLeechSeed || appliesTrap) {
        score += 300; // Volatile statuses are valuable
      }

      // Major status ailment moves — check type immunity before scoring
      if (ailment !== null) {
        if (player.status !== null) return -Infinity; // Already statused
        if (isTargetImmuneToStatusEffectFromMoveType(player, move.type, ailment)) return -Infinity; // Type immune
        if (enemyHpRatio > 0.5) score += 250;
        else score += 100; // Lower priority when enemy is struggling
      }
    }

    return score;
  }

  function getPlannedEnemyMoveIndex(): number {
    const chargingMoveId = getChargingMoveId(enemyBattleState);
    if (chargingMoveId !== null) {
      const chargingMoveIndex = findMoveIndexById(enemy, chargingMoveId);
      if (chargingMoveIndex !== null) return chargingMoveIndex;
    }

    // Randomness: AI level determines how often a random move is chosen instead of optimal
    if (trainerAIState) {
      const randomChance = AI_RANDOMNESS[trainerAIState.level - 1];
      if (Math.random() < randomChance) return chooseEnemyMoveIndex(enemy);
    }

    // Score each move and pick the best one
    let bestIndex = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < enemy.moves.length; i++) {
      const s = scoreMoveForEnemy(i);
      if (s > bestScore) {
        bestScore = s;
        bestIndex = i;
      }
    }

    // If all moves are -Infinity, fall back to random selection
    if (bestIndex === -1 || bestScore === -Infinity) {
      return chooseEnemyMoveIndex(enemy);
    }

    // Track charging move initiations to enforce the cap
    if (trainerAIState && bestIndex >= 0) {
      const selectedMove = enemy.moves[bestIndex];
      if (selectedMove) {
        const selectedData = getMoveBattleData(selectedMove.id);
        if (selectedData?.behaviorTags.includes('requires-charge-turn') && enemyBattleState.chargingMoveId === null) {
          trainerAIState.chargingMovesStarted++;
        }
      }
    }

    return bestIndex;
  }

  function enterSelectMovePhase(): void {
    if (pendingTurnCredit) {
      recordBattleTurn(activePartyIndex);
      pendingTurnCredit = false;
    }

    pendingForcedPlayerMoveIndex = getForcedPlayerMoveIndex();
    if (playerBattleState.turnFlags.mustRecharge || pendingForcedPlayerMoveIndex !== null) {
      resolveForcedPlayerTurn();
      return;
    }
    phase = 'SELECT_MOVE';
    showMoveMenu(menu);
  }

  function resolveForcedPlayerTurn(): void {
    enemySelectedMoveIndex = getPlannedEnemyMoveIndex();
    const enemyMove = enemy.moves[enemySelectedMoveIndex] ?? enemy.moves[0];
    const playerMoveId =
      pendingForcedPlayerMoveIndex !== null ? (player.moves[pendingForcedPlayerMoveIndex]?.id ?? 0) : 0;
    const turnOrder = determineTurnOrder(
      player,
      playerBattleState,
      playerMoveId,
      enemy,
      enemyBattleState,
      enemyMove.id,
    );
    enemyGoesFirst = turnOrder.enemyActsFirst;
    if (enemyGoesFirst) {
      enemyTurn(true);
      return;
    }

    const forcedMoveIndex = pendingForcedPlayerMoveIndex;
    pendingForcedPlayerMoveIndex = null;
    doAttack(forcedMoveIndex ?? undefined);
  }

  function getCaptureXpReward(): number {
    return calculateXpGain(enemy) * 2;
  }

  function getDefeatXpReward(): number {
    return calculateXpGain(enemy, { trainerBattle: isTrainerBattle });
  }

  function getConsolationXpReward(partyIndex: number): number {
    const winXp = getDefeatXpReward();
    const turns = Math.max(1, battleTurnCounts.get(partyIndex) ?? 0);
    const maxBonus = Math.max(1, Math.floor(winXp * 0.25));
    const perTurnBonus = Math.max(1, Math.floor(winXp * 0.05));
    return Math.min(maxBonus, perTurnBonus * turns);
  }

  function awardConsolationXp(pokemon: Pokemon, partyIndex: number): number {
    const bonusXp = getConsolationXpReward(partyIndex);
    const before = pokemon.xp;
    pokemon.xp = Math.min(pokemon.xp + bonusXp, pokemon.xpToNext - 1);
    return pokemon.xp - before;
  }

  function getLossPenalty(outcome: LossOutcome, currentMoney: number): number {
    switch (outcome) {
      case 'trainer-whiteout':
      case 'wild-whiteout':
        return Math.floor(currentMoney / 2);
      case 'trainer-roster':
        return trainerData ? Math.min(currentMoney, trainerData.reward.money * 3) : 0;
    }
  }

  function buildLossDialogue(outcome: LossOutcome): string[] {
    const lines: string[] = [];
    if (outcome === 'trainer-roster') {
      lines.push(t('battle.lostTrainerBattle'));
    } else {
      lines.push(t('battle.whiteout'));
    }

    if (hasActiveGame()) {
      const penalty = getLossPenalty(outcome, getPlayerData().money);
      if (penalty > 0) lines.push(t('battle.moneyPenalty', { amount: penalty }));
    }

    lines.push(outcome === 'trainer-roster' ? t('battle.trainerWaitsRecover') : t('battle.recoverMessage'));
    return lines;
  }

  function beginLoss(outcome: LossOutcome): void {
    pendingLossOutcome = outcome;
    lossDialogueShown = false;
    fade = null;
    phase = 'LOSE';
  }

  function canUseOpeningSoloSwitch(partyIndex: number): boolean {
    return (
      isTrainerBattle &&
      maxRosterSize === 1 &&
      turnNumber === 1 &&
      !soloOpeningSwitchUsed &&
      partyIndex !== activePartyIndex
    );
  }

  function getBallStartPoint(): { x: number; y: number } {
    return {
      x: BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w - 6,
      y: BTL.PLY_SPRITE.y + 18,
    };
  }

  function getBallTargetPoint(): { x: number; y: number } {
    return {
      x: BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
      y: BTL.OPP_SPRITE.y + BTL.OPP_SPRITE.h - 8,
    };
  }

  function getTrainerBallStartPoint(): { x: number; y: number } {
    return {
      x: 224,
      y: 42,
    };
  }

  function getPlayerBallStartPoint(): { x: number; y: number } {
    return {
      x: 92,
      y: 72,
    };
  }

  function getPlayerBallTargetPoint(): { x: number; y: number } {
    return {
      x: BTL.PLY_SPRITE.x + 24,
      y: BTL.PLY_SPRITE.y + 28,
    };
  }

  function getPlayerBallId(): string {
    return player.caughtBall ?? 'poke-ball';
  }

  function getEnemyCaptureStatus(): string | null {
    return (enemy.status ?? enemyHpBar.status) || null;
  }

  function getCaptureChance(ballRate: number): number {
    // Sum all negative stat-stage values (each stage = BATTLE_STAT_PERCENT_STEP) to get total stages reduced
    const statStagesReduced = Object.values(enemyBattleState.statModifiers)
      .filter((v) => v < 0)
      .reduce((sum, v) => sum + Math.abs(v) / BATTLE_STAT_PERCENT_STEP, 0);

    return calculateCaptureChance({
      ballRate,
      // caughtBall: enemy.caughtBall,
      speciesCatchRate: getPokemonCatchRate(enemy.id),
      currentHp: enemy.hp,
      maxHp: enemy.maxHp,
      playerLevel: player.level,
      wildLevel: enemy.level,
      turnNumber,
      status: getEnemyCaptureStatus(),
      statStagesReduced,
    });
  }

  function createBallShakeStep(targetX: number, targetY: number): ReturnType<typeof sequenceStep> {
    return sequenceStep(
      tweenActorStep('ball', { x: targetX + 3, y: targetY, rotation: 0.22 }, 0.08, 'easeInOut'),
      tweenActorStep('ball', { x: targetX - 3, y: targetY, rotation: -0.22 }, 0.08, 'easeInOut'),
      tweenActorStep('ball', { x: targetX, y: targetY, rotation: 0 }, 0.08, 'easeInOut'),
      waitStep(0.05),
    );
  }

  function resetCaptureActors(): void {
    animationDirector.setActorState('enemy', {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.setActorState('ball', {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: false,
    });
  }

  function finishCaptureAnimation(): void {
    if (!pendingCaptureOutcome) return;

    const outcome = pendingCaptureOutcome;
    const pd = getPlayerData();
    pendingCaptureOutcome = null;

    if (outcome.caught) {
      animationDirector.setActorState('enemy', {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        alpha: 0,
        rotation: 0,
        visible: false,
      });
      enemy.caughtBall = outcome.itemId;
      pd.pokedex[enemy.id] = true;
      xpGained = getCaptureXpReward();
      player.xp += xpGained;

      const catchMessages: string[] = [t('battle.caught', { name: getPokemonDisplayName(enemy.id) })];
      if (pd.party.length < 6) {
        pd.party.push({ ...enemy });
      } else {
        const boxNum = sendCaughtToBox(enemy);
        if (boxNum > 0) {
          catchMessages.push(t('battle.partyFull', { name: getPokemonDisplayName(enemy.id), box: boxNum }));
        }
      }
      catchMessages.push(t('battle.gainedXP', { name: getPokemonDisplayName(player.id), xp: xpGained }));

      autoSave();
      textBox = createTextBox(catchMessages, isRTL());
      audio.playMusic('victory');
      phase = 'XP_GAIN';
      return;
    }

    activeBallId = null;
    resetCaptureActors();
    textBox = createTextBox([t('battle.brokeFreeBall', { name: getPokemonDisplayName(enemy.id) })], isRTL());
    phase = 'USE_ITEM';
  }

  function startEnemyFaintAnimation(): void {
    animationDirector.clear();
    animationDirector.setActorState('enemy', {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.play(
      sequenceStep(
        callStep(() => audio.playCry(enemy.id)),
        parallelStep(
          tweenActorStep('enemy', { y: 10, alpha: 0 }, 0.28, 'easeInOut'),
          tweenActorStep('enemy', { scaleX: 1.08, scaleY: 0.08 }, 0.28, 'easeInOut'),
        ),
        callStep(() => {
          animationDirector.setActorState('enemy', {
            y: 10,
            alpha: 0,
            scaleX: 1.08,
            scaleY: 0.08,
            visible: false,
          });
        }),
      ),
    );
  }

  function startPlayerFaintAnimation(): void {
    animationDirector.clear();
    animationDirector.setActorState('player', {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.play(
      sequenceStep(
        callStep(() => audio.playCry(player.id)),
        parallelStep(
          tweenActorStep('player', { y: 12, alpha: 0 }, 0.28, 'easeInOut'),
          tweenActorStep('player', { scaleX: 1.04, scaleY: 0.08 }, 0.28, 'easeInOut'),
        ),
        callStep(() => {
          animationDirector.setActorState('player', {
            y: 12,
            alpha: 0,
            scaleX: 1.04,
            scaleY: 0.08,
            visible: false,
          });
        }),
      ),
    );
  }

  function startPlayerRetreatAnimation(): void {
    animationDirector.clear();
    animationDirector.setActorState('player', {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.play(
      sequenceStep(
        parallelStep(
          tweenActorStep('player', { x: -26, y: 10, alpha: 0 }, 0.22, 'easeInOut'),
          tweenActorStep('player', { scaleX: 0.72, scaleY: 0.72 }, 0.22, 'easeInOut'),
        ),
        callStep(() => {
          animationDirector.setActorState('player', {
            x: -26,
            y: 10,
            alpha: 0,
            scaleX: 0.72,
            scaleY: 0.72,
            visible: false,
          });
        }),
      ),
    );
  }

  function startEnemySendOutAnimation(): void {
    const start = getTrainerBallStartPoint();
    const target = getBallTargetPoint();
    pendingEnemySendOutAnimation = false;
    activeBallId = 'poke-ball';
    sendOutFx = null;
    animationDirector.clear();
    animationDirector.setActorState('ball', {
      x: start.x,
      y: start.y,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.setActorState('enemy', {
      x: 26,
      y: -8,
      scaleX: 0.55,
      scaleY: 0.55,
      alpha: 0,
      rotation: -0.2,
      visible: false,
    });
    animationDirector.play(
      sequenceStep(
        callStep(() => audio.playSFX('menu-select')),
        tweenActorStep(
          'ball',
          {
            x: start.x + (target.x - start.x) * 0.58,
            y: target.y - 26,
            rotation: -0.4,
          },
          0.14,
          'easeOut',
        ),
        tweenActorStep(
          'ball',
          {
            x: target.x,
            y: target.y,
            rotation: 0,
          },
          0.12,
          'easeInOut',
        ),
        callStep(() => {
          audio.playSFX('hit');
          flash = createFlash('#ff6a6a', 0.14);
          sendOutFx = createSendOutEffect(target.x, target.y - 2, '#ff6a6a', '#ffd6d6');
          activeBallId = null;
          animationDirector.setActorState('ball', {
            alpha: 0,
            visible: false,
          });
          animationDirector.setActorState('enemy', {
            visible: true,
          });
        }),
        waitStep(0.04),
        callStep(() => audio.playCry(enemy.id)),
        tweenActorStep(
          'enemy',
          {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            rotation: 0,
            visible: true,
          },
          0.26,
          'easeOut',
        ),
        callStep(() => {
          activeBallId = null;
          pendingEnemyEntryHazard = true;
          animationDirector.setActorState('ball', {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            rotation: 0,
            visible: false,
          });
        }),
      ),
    );
  }

  function startPlayerSendOutAnimation(): void {
    const start = getPlayerBallStartPoint();
    const target = getPlayerBallTargetPoint();
    pendingPlayerSendOutAnimation = false;
    activeBallId = getPlayerBallId();
    sendOutFx = null;
    animationDirector.clear();
    animationDirector.setActorState('ball', {
      x: start.x,
      y: start.y,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      rotation: 0,
      visible: true,
    });
    animationDirector.setActorState('player', {
      x: -24,
      y: 8,
      scaleX: 0.6,
      scaleY: 0.6,
      alpha: 0,
      rotation: 0.14,
      visible: false,
    });
    animationDirector.play(
      sequenceStep(
        callStep(() => audio.playSFX('menu-select')),
        tweenActorStep(
          'ball',
          {
            x: start.x - (start.x - target.x) * 0.58,
            y: target.y - 22,
            rotation: 0.38,
          },
          0.14,
          'easeOut',
        ),
        tweenActorStep(
          'ball',
          {
            x: target.x,
            y: target.y,
            rotation: 0,
          },
          0.12,
          'easeInOut',
        ),
        callStep(() => {
          audio.playSFX('hit');
          flash = createFlash('#d6ecff', 0.12);
          sendOutFx = createSendOutEffect(target.x, target.y - 2, '#80b8ff', '#e8f4ff');
          activeBallId = null;
          animationDirector.setActorState('ball', {
            alpha: 0,
            visible: false,
          });
          animationDirector.setActorState('player', {
            visible: true,
          });
        }),
        waitStep(0.03),
        callStep(() => audio.playCry(player.id)),
        tweenActorStep(
          'player',
          {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            rotation: 0,
            visible: true,
          },
          0.24,
          'easeOut',
        ),
        callStep(() => {
          activeBallId = null;
          pendingPlayerEntryHazard = true;
          if (pendingSubstituteCarryover) {
            playerBattleState.substituteActive = pendingSubstituteCarryover.active;
            playerBattleState.substituteHitsAbsorbed = pendingSubstituteCarryover.hitsAbsorbed;
            pendingSubstituteCarryover = null;
          }
          animationDirector.setActorState('ball', {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            rotation: 0,
            visible: false,
          });
        }),
      ),
    );
  }

  function startCaptureSequence(itemId: string, caught: boolean): void {
    const start = getBallStartPoint();
    const target = getBallTargetPoint();

    activeBallId = itemId;
    pendingCaptureOutcome = { itemId, caught };
    textBox = null;
    captureSuccessFx = null;
    animationDirector.clear();
    resetCaptureActors();
    animationDirector.setActorState('ball', {
      x: start.x,
      y: start.y,
      visible: true,
    });

    const absorbStep = parallelStep(
      tweenActorStep(
        'enemy',
        {
          scaleX: 0.15,
          scaleY: 0.15,
          alpha: 0,
        },
        0.16,
        'easeInOut',
      ),
      sequenceStep(
        tweenActorStep('ball', { scaleX: 1.2, scaleY: 1.2 }, 0.08, 'easeOut'),
        tweenActorStep('ball', { scaleX: 1, scaleY: 1 }, 0.08, 'easeInOut'),
      ),
    );

    const throwAndTrapStep = sequenceStep(
      callStep(() => audio.playSFX('menu-select')),
      tweenActorStep(
        'ball',
        {
          x: start.x + (target.x - start.x) * 0.55,
          y: target.y - 30,
          rotation: 0.45,
        },
        0.16,
        'easeOut',
      ),
      tweenActorStep(
        'ball',
        {
          x: target.x,
          y: target.y,
          rotation: 0,
        },
        0.14,
        'easeInOut',
      ),
      callStep(() => audio.playSFX('hit')),
      absorbStep,
      callStep(() => {
        animationDirector.setActorState('enemy', {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          rotation: 0,
          visible: false,
        });
      }),
      waitStep(0.12),
    );

    const successSequence = sequenceStep(
      createBallShakeStep(target.x, target.y),
      createBallShakeStep(target.x, target.y),
      createBallShakeStep(target.x, target.y),
      callStep(() => {
        flash = createFlash('#fff5a8', 0.16);
        captureSuccessFx = createCaptureSuccessEffect(target.x, target.y - 1);
        audio.playCaptureSuccess();
      }),
      waitStep(0.22),
    );

    const brokeFreeSequence = sequenceStep(
      createBallShakeStep(target.x, target.y),
      createBallShakeStep(target.x, target.y),
      callStep(() => audio.playCry(enemy.id)),
      callStep(() => {
        animationDirector.setActorState('enemy', {
          scaleX: 0.15,
          scaleY: 0.15,
          alpha: 0,
          visible: true,
        });
      }),
      parallelStep(
        tweenActorStep(
          'enemy',
          {
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            visible: true,
          },
          0.16,
          'easeOut',
        ),
        sequenceStep(
          tweenActorStep('ball', { scaleX: 1.35, scaleY: 1.35, alpha: 0.15 }, 0.1, 'easeOut'),
          tweenActorStep('ball', { alpha: 0, scaleX: 0.9, scaleY: 0.9 }, 0.12, 'easeInOut'),
        ),
      ),
      waitStep(0.06),
    );

    animationDirector.play(sequenceStep(throwAndTrapStep, caught ? successSequence : brokeFreeSequence));
    phase = 'CAPTURE_ANIM';
  }

  function syncPlayerBar(resetDisplayedXp = false): void {
    playerHpBar.pokemonId = player.id;
    playerHpBar.level = player.level;
    playerHpBar.maxHp = player.maxHp;
    playerHpBar.currentHp = Math.max(0, Math.min(player.hp, player.maxHp));
    playerHpBar.statChanges = getDisplayedStatChanges(playerBattleState);
    setVolatileStatuses(playerHpBar, [
      ...getDisplayedVolatileStatuses(playerBattleState),
      ...getDisplayedSideStatuses(playerSideState),
    ]);
    setStatus(playerHpBar, player.status ?? '');
    if (playerHpBar.displayHp > playerHpBar.maxHp) {
      playerHpBar.displayHp = playerHpBar.maxHp;
    }
    setXP(playerHpBar, player.xp, player.xpToNext);
    if (resetDisplayedXp) {
      setDisplayedXP(playerHpBar, 0);
    }
    menu.playerPokemon = player;
  }

  function syncEnemyBar(): void {
    enemyHpBar.pokemonId = enemy.id;
    enemyHpBar.level = enemy.level;
    enemyHpBar.maxHp = enemy.maxHp;
    enemyHpBar.currentHp = Math.max(0, Math.min(enemy.hp, enemy.maxHp));
    enemyHpBar.statChanges = getDisplayedStatChanges(enemyBattleState);
    setVolatileStatuses(enemyHpBar, [
      ...getDisplayedVolatileStatuses(enemyBattleState),
      ...getDisplayedSideStatuses(enemySideState),
    ]);
    setStatus(enemyHpBar, enemy.status ?? '');
    if (enemyHpBar.displayHp > enemyHpBar.maxHp) {
      enemyHpBar.displayHp = enemyHpBar.maxHp;
    }
  }

  function handlePlayerFaintAfterAction(consolationXp = 0): void {
    enemyGoesFirst = false;
    startPlayerFaintAnimation();
    const faintLines = [t('battle.fainted', { name: getPokemonDisplayName(player.id) })];
    if (consolationXp > 0) {
      faintLines.push(t('battle.gainedXP', { name: getPokemonDisplayName(player.id), xp: consolationXp }));
    }
    textBox = createTextBox(faintLines, isRTL());
    if (hasUsablePartyPokemon()) {
      phase = 'PLAYER_FAINT_SWITCH';
      return;
    }

    const pd = hasActiveGame() ? getPlayerData() : null;
    const allPartyFainted = pd ? pd.party.every((p) => p.hp <= 0) : true;
    if (isTrainerBattle && !allPartyFainted) {
      beginLoss('trainer-roster');
    } else {
      beginLoss(isTrainerBattle ? 'trainer-whiteout' : 'wild-whiteout');
    }
  }

  function startEndTurnStatusPhase(): void {
    const lines: string[] = [];
    clearEndOfTurnFlags(playerBattleState);
    clearEndOfTurnFlags(enemyBattleState);
    const playerResult = applyEndOfTurnStatusEffects(player, playerBattleState);
    const enemyResult = applyEndOfTurnStatusEffects(enemy, enemyBattleState);

    if (playerResult.message === 'poison') {
      lines.push(t('battle.hurtByPoison', { name: getPokemonDisplayName(player.id) }));
    } else if (playerResult.message === 'burn') {
      lines.push(t('battle.hurtByBurn', { name: getPokemonDisplayName(player.id) }));
    }

    if (enemyResult.message === 'poison') {
      lines.push(t('battle.hurtByPoison', { name: getPokemonDisplayName(enemy.id) }));
    } else if (enemyResult.message === 'burn') {
      lines.push(t('battle.hurtByBurn', { name: getPokemonDisplayName(enemy.id) }));
    }

    if (player.hp > 0) {
      const leechSeedResult = applyLeechSeedEffect(player, playerBattleState, enemy);
      if (leechSeedResult.applied) {
        queueStatusTurnEffect('player', 'seed');
        lines.push(t('battle.leechSeedDrain', { name: getPokemonDisplayName(player.id) }));
      }
    }
    if (enemy.hp > 0) {
      const leechSeedResult = applyLeechSeedEffect(enemy, enemyBattleState, player);
      if (leechSeedResult.applied) {
        queueStatusTurnEffect('enemy', 'seed');
        lines.push(t('battle.leechSeedDrain', { name: getPokemonDisplayName(enemy.id) }));
      }
    }

    if (player.hp > 0) {
      const trapResult = applyTrapEndOfTurnEffect(player, playerBattleState);
      if (trapResult.applied) {
        queueStatusTurnEffect('player', 'trap');
        lines.push(t('battle.trapDamage', { name: getPokemonDisplayName(player.id) }));
      }
    }
    if (enemy.hp > 0) {
      const trapResult = applyTrapEndOfTurnEffect(enemy, enemyBattleState);
      if (trapResult.applied) {
        queueStatusTurnEffect('enemy', 'trap');
        lines.push(t('battle.trapDamage', { name: getPokemonDisplayName(enemy.id) }));
      }
    }

    for (const effectId of advanceSideEffectTurns(playerSideState)) {
      lines.push(getSideEffectEndedLine(getPokemonDisplayName(player.id), effectId));
    }
    for (const effectId of advanceSideEffectTurns(enemySideState)) {
      lines.push(getSideEffectEndedLine(getPokemonDisplayName(enemy.id), effectId));
    }

    syncPlayerBar();
    syncEnemyBar();

    if (lines.length > 0) {
      textBox = createTextBox(lines, isRTL());
      phase = 'END_TURN_STATUS';
      phaseTimer = 0;
      return;
    }

    if (enemy.hp <= 0) {
      phase = 'CHECK_WIN';
      return;
    }
    if (player.hp <= 0) {
      handlePlayerFaintAfterAction();
      return;
    }

    pendingTurnCredit = true;
    turnNumber++;
    menu.turnNumber = turnNumber;
    enterSelectMovePhase();
  }

  function waitForXpResolution(): boolean {
    setXP(playerHpBar, player.xp, player.xpToNext);
    if (player.xp >= player.xpToNext) {
      return playerHpBar.displayXp < playerHpBar.xpToNext - 0.5;
    }
    return isXPAnimating(playerHpBar);
  }

  function startLevelUp(levelPhase: BattlePhase): boolean {
    const result = checkAndApplyLevelUp(player);
    if (!result.leveledUp) return false;

    syncPlayerBar(true);
    triggerLevelUpFx();
    pendingNewMoves = result.newMoves || [];
    activeMoveLearningPrompt = null;
    pendingEvolution = result.evolution ?? null;
    statGainsPopup = result.statGains ?? null;
    textBox = createTextBox(
      [t('battle.levelUp', { name: getPokemonDisplayName(player.id), level: player.level })],
      isRTL(),
    );
    phase = levelPhase;
    return true;
  }

  function startPendingEvolution(nextPhase: BattlePhase): boolean {
    if (!pendingEvolution) return false;
    const evolution = pendingEvolution;
    pendingEvolution = null;
    phase = nextPhase;
    setEvolutionData(player, evolution, () => {
      syncPlayerBar();
      menu.playerPokemon = player;
      loadImage(`/sprites/pokemon/back/${player.id}.png`).catch(() => {});
    });
    stateMachine.push('EVOLUTION');
    return true;
  }

  function refreshPlayerMoveState(): void {
    syncPlayerBar();
    const prevHelperActive = menu?.battleHelperActive ?? false;
    const prevEnemyTypes = menu?.enemyTypes ?? [];
    menu = createBattleMenu(player.moves);
    menu.playerPokemon = player;
    menu.party = hasActiveGame() ? getPlayerData().party : [player];
    menu.battleHelperActive = prevHelperActive;
    menu.enemyTypes = prevEnemyTypes;
  }

  function startMoveLearning(phaseAfterResolution: BattlePhase): boolean {
    if (!activeMoveLearningPrompt || !hasActiveGame()) return false;

    const prompt = activeMoveLearningPrompt;
    activeMoveLearningPrompt = null;
    pendingMoveLearningResolution = null;
    pendingMoveLearningPhase = phaseAfterResolution;
    setPartyMode('move-learning');
    setMoveLearningSession(
      createMoveLearningSession(activePartyIndex, prompt, (resolution) => {
        pendingMoveLearningResolution = resolution;
      }),
    );
    phase = 'WAITING_MOVE_LEARN';
    stateMachine.push('PARTY');
    return true;
  }

  /** Show the next move-learning text box from pendingNewMoves. Returns true if a message was shown. */
  function showNextLearnedMove(movesPhase: BattlePhase): boolean {
    if (pendingNewMoves.length === 0) return false;
    activeMoveLearningPrompt = pendingNewMoves.shift()!;
    const lines = getMoveLearningAnnouncementLines(player.id, activeMoveLearningPrompt);
    textBox = createTextBox(lines, isRTL());
    phase = movesPhase;
    return true;
  }

  function getAttackAnchor(actor: 'player' | 'enemy'): { x: number; y: number } {
    const state = animationDirector.getActorState(actor);
    if (actor === 'player') {
      return {
        x: BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w * 0.62 + state.x,
        y: BTL.PLY_SPRITE.y + BTL.PLY_SPRITE.h * 0.36 + state.y,
      };
    }
    return {
      x: BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w * 0.38 + state.x,
      y: BTL.OPP_SPRITE.y + BTL.OPP_SPRITE.h * 0.44 + state.y,
    };
  }

  function getActorStatusBounds(actor: 'player' | 'enemy'): {
    centerX: number;
    centerY: number;
    width: number;
    height: number;
  } {
    const sprite = actor === 'player' ? BTL.PLY_SPRITE : BTL.OPP_SPRITE;
    const state = animationDirector.getActorState(actor);
    return {
      centerX: sprite.x + sprite.w / 2 + state.x,
      centerY: sprite.y + sprite.h / 2 + state.y,
      width: sprite.w * Math.abs(state.scaleX),
      height: sprite.h * Math.abs(state.scaleY),
    };
  }

  function queueStatusTurnEffect(actor: 'player' | 'enemy', effectId: string): void {
    const bounds = getActorStatusBounds(actor);
    statusTurnFx.push(createStatusTurnEffect(effectId, bounds.centerX, bounds.centerY, bounds.width, bounds.height));
  }

  function triggerStatusTurnEffects(
    actor: 'player' | 'enemy',
    pokemon: Pokemon,
    runtimeState: BattlePokemonRuntimeState,
  ): void {
    if (pokemon.status) {
      queueStatusTurnEffect(actor, pokemon.status);
    }
    for (const effectId of getDisplayedVolatileStatuses(runtimeState)) {
      queueStatusTurnEffect(actor, effectId);
    }
  }

  function applyMoveImpact(
    defender: Pokemon,
    move: Pokemon['moves'][number],
    targetBar: ReturnType<typeof createHPBar>,
    popupX: number,
    popupY: number,
    resolvedDamage = 0,
    suppressAudio = false,
  ): number {
    const moveData = getMove(move.id);
    const damageClass = moveData?.damageClass ?? (move.power > 0 ? 'physical' : 'status');
    const profile = getAttackAnimationProfile({
      name: moveData?.name ?? { en: move.name, he: move.name },
      type: move.type,
      power: move.power,
      damageClass,
    });

    if (move.power > 0 || resolvedDamage > 0) {
      const absorbEffect =
        move.power > 0 && defender.abilityId
          ? getAbilityBattleEffects(defender.abilityId).find((effect) => {
              return effect.kind === 'typeAbsorbHeal' && effect.moveTypes.includes(move.type);
            })
          : undefined;
      if (absorbEffect?.kind === 'typeAbsorbHeal') {
        const healAmount = Math.max(1, Math.floor((defender.maxHp * absorbEffect.healPercent) / 100));
        const healed = Math.max(0, Math.min(defender.maxHp, defender.hp + healAmount) - defender.hp);
        defender.hp = Math.min(defender.maxHp, defender.hp + healAmount);
        setHP(targetBar, defender.hp);
        spawnDamageNumber(`+${healed}`, popupX, popupY, '#48d870');
        audio.playSFX('heal');
        return 0;
      }

      const dmg = Math.max(0, Math.min(defender.hp, resolvedDamage));
      if (dmg <= 0) return 0;
      defender.hp = Math.max(0, defender.hp - dmg);
      setHP(targetBar, defender.hp);
      spawnDamageNumber(`-${dmg}`, popupX, popupY, '#f84038');
      if (!suppressAudio) {
        flash = createFlash(profile.flashColor, 0.15);
        shake = createShake(profile.shakeIntensity, 0.22);
        audio.playSFX('hit');
      }
      return dmg;
    }

    return 0;
  }

  function applyResolvedMoveEffects(
    attacker: Pokemon,
    attackerState: BattlePokemonRuntimeState,
    attackerSideState: BattleSideRuntimeState,
    attackerName: string,
    defender: Pokemon,
    defenderState: BattlePokemonRuntimeState,
    defenderSideState: BattleSideRuntimeState,
    defenderName: string,
    move: Pokemon['moves'][number],
    allowTargetEffects: boolean,
    targetCanStillAct: boolean,
    magicCoatActive = false,
  ): string[] {
    const moveBattleData = getMoveBattleData(move.id);
    if (!moveBattleData) return [];

    const attackerHasContrary = attacker.abilityId
      ? getAbilityBattleEffects(attacker.abilityId).some((e) => e.kind === 'contraryStatChanges')
      : false;
    const defenderHasContrary = defender.abilityId
      ? getAbilityBattleEffects(defender.abilityId).some((e) => e.kind === 'contraryStatChanges')
      : false;
    const isReflectable =
      move.power <= 0 &&
      (moveBattleData.ailment?.target === 'target' ||
        moveBattleData.statChanges.some((c) => c.target === 'target') ||
        moveBattleData.effects.some((e) => e.target === 'target') ||
        moveBattleData.behaviorTags.some((tag) =>
          (['stealth-rock', 'spikes', 'toxic-spikes'] as string[]).includes(tag),
        ));
    const reflected = magicCoatActive && isReflectable;

    const lines: string[] = [];
    if (reflected) {
      lines.push(t('battle.magicCoatReflect', { name: defenderName }));
    }

    const userStatChanges = applyStatChanges(
      attackerState,
      moveBattleData.statChanges,
      'user',
      Math.random,
      attackerHasContrary,
    );
    for (const change of userStatChanges) {
      lines.push(getStatChangeLine(attackerName, change));
    }

    if (moveBattleData.ailment?.target === 'user') {
      const statusResult = applyMajorStatus(attacker, attackerState, moveBattleData.ailment);
      if (statusResult.applied) {
        const statusLine = getStatusAppliedLine(attackerName, statusResult.status);
        if (statusLine) lines.push(statusLine);
      } else if (statusResult.reason === 'immune') {
        lines.push(getEffectImmuneLine(attackerName));
      }
    }

    const userVolatileEffects = applyVolatileMoveEffects(attacker, attackerState, moveBattleData.effects, 'user');
    for (const effectResult of userVolatileEffects) {
      if (effectResult.applied) {
        lines.push(getMoveEffectAppliedLine(attackerName, effectResult.id));
      } else if (effectResult.reason === 'immune') {
        lines.push(getEffectImmuneLine(attackerName));
      }
    }

    const userSideEffects = applySideEffects(attackerSideState, moveBattleData.sideEffects, 'user');
    for (const effectResult of userSideEffects) {
      if (effectResult.applied) {
        lines.push(getSideEffectAppliedLine(attackerName, effectResult.id));
      }
    }

    if (allowTargetEffects) {
      if (reflected) {
        // Magic Coat: redirect all target-aimed effects back to the attacker
        const reflectedStatChanges = applyStatChanges(
          attackerState,
          moveBattleData.statChanges,
          'target',
          Math.random,
          attackerHasContrary,
        );
        for (const change of reflectedStatChanges) {
          lines.push(getStatChangeLine(attackerName, change));
        }
        if (moveBattleData.ailment?.target === 'target') {
          const statusResult = applyMajorStatus(attacker, attackerState, moveBattleData.ailment);
          if (statusResult.applied) {
            const statusLine = getStatusAppliedLine(attackerName, statusResult.status);
            if (statusLine) lines.push(statusLine);
          } else if (statusResult.reason === 'immune') {
            lines.push(getEffectImmuneLine(attackerName));
          }
        }
        for (const effect of moveBattleData.effects) {
          if (effect.target !== 'target') continue;
          const [effectResult] = applyVolatileMoveEffects(attacker, attackerState, [effect], 'target');
          if (!effectResult) continue;
          if (effectResult.applied) {
            lines.push(getMoveEffectAppliedLine(attackerName, effectResult.id));
          } else if (effectResult.reason === 'immune') {
            lines.push(getEffectImmuneLine(attackerName));
          }
        }
        // Entry hazards reflected to attacker's side — handled in scene code via `reflected` return value
      } else {
        // Normal target effects
        const effectiveStage = (stages: number) => (defenderHasContrary ? -stages : stages);
        const targetStatChanges = isMistActive(defenderSideState)
          ? applyStatChanges(
              defenderState,
              moveBattleData.statChanges.filter(
                (change) => change.target !== 'target' || effectiveStage(change.stages) >= 0,
              ),
              'target',
              Math.random,
              defenderHasContrary,
            )
          : applyStatChanges(defenderState, moveBattleData.statChanges, 'target', Math.random, defenderHasContrary);
        for (const change of targetStatChanges) {
          lines.push(getStatChangeLine(defenderName, change));
        }
        if (
          isMistActive(defenderSideState) &&
          moveBattleData.statChanges.some((change) => change.target === 'target' && effectiveStage(change.stages) < 0)
        ) {
          lines.push(getMistBlockedLine(defenderName));
        }

        if (moveBattleData.ailment?.target === 'target') {
          const substituteBlocksStatus =
            defenderState.substituteActive && !isSubstituteBypass(move.name, attacker.abilityId);
          if (substituteBlocksStatus) {
            // substitute silently blocks foe-caused status — Infiltrator ability bypasses this
          } else if (isSafeguardActive(defenderSideState)) {
            lines.push(getSafeguardBlockedLine(defenderName));
          } else if (isTargetImmuneToStatusEffectFromMoveType(defender, move.type, moveBattleData.ailment)) {
            lines.push(getEffectImmuneLine(defenderName));
          } else {
            const statusResult = applyMajorStatus(defender, defenderState, moveBattleData.ailment);
            if (statusResult.applied) {
              const statusLine = getStatusAppliedLine(defenderName, statusResult.status);
              if (statusLine) lines.push(statusLine);
            } else if (statusResult.reason === 'immune') {
              lines.push(getEffectImmuneLine(defenderName));
            }
          }
        }

        const targetSideEffects = applySideEffects(defenderSideState, moveBattleData.sideEffects, 'target');
        for (const effectResult of targetSideEffects) {
          if (effectResult.applied) {
            lines.push(getSideEffectAppliedLine(defenderName, effectResult.id));
          }
        }

        const substituteBlocksVolatile =
          defenderState.substituteActive && !isSubstituteBypass(move.name, attacker.abilityId);
        for (const effect of moveBattleData.effects) {
          if (effect.target !== 'target') continue;
          if (substituteBlocksVolatile) continue; // Substitute silently blocks volatile effects
          if (isTargetImmuneToVolatileEffectFromMoveType(defender, move.type, effect)) {
            lines.push(getEffectImmuneLine(defenderName));
            continue;
          }

          const [effectResult] = applyVolatileMoveEffects(defender, defenderState, [effect], 'target');
          if (!effectResult) continue;
          if (effectResult.applied) {
            lines.push(getMoveEffectAppliedLine(defenderName, effectResult.id));
          } else if (effectResult.reason === 'immune') {
            lines.push(getEffectImmuneLine(defenderName));
          }
        }

        if (tryApplyFlinch(defenderState, moveBattleData.flinchChance ?? null, targetCanStillAct)) {
          lines.push(t('battle.flinched', { name: defenderName }));
        }

        // Burning Jealousy: burn target if they currently have any positive stat modifier
        if (moveBattleData.behaviorTags?.includes('burning-jealousy')) {
          const hasBoost = Object.values(defenderState.statModifiers).some((v) => v > 0);
          if (hasBoost && !isSafeguardActive(defenderSideState)) {
            const burnResult = applyMajorStatus(defender, defenderState, {
              status: 'burn',
              chance: 100,
              target: 'target',
            });
            if (burnResult.applied) {
              const statusLine = getStatusAppliedLine(defenderName, 'burn');
              if (statusLine) lines.push(statusLine);
            }
          }
        }
      }
    }

    syncPlayerBar();
    syncEnemyBar();
    return lines;
  }

  // Families that create the effect at animation start (not at impact time)
  const START_FX_FAMILIES = new Set([
    'projectile',
    'beam',
    'dragon-aura',
    'flamethrower',
    'leaf-spray',
    'water-flow',
    'psychic-wave',
    'rock-throw',
    'rock-slide',
    'fire-blast',
    'giga-drain',
    'lightning',
    'vine-whip',
    'heal-pulse',
    'double-team',
    'solar-beam',
    'rapid-spin',
    'twister-spin',
    'icy-wind',
    'electroweb',
    'protect-shield',
  ]);

  function playAttackAnimation(
    attackerActor: 'player' | 'enemy',
    defenderActor: 'player' | 'enemy',
    move: Pokemon['moves'][number],
    onImpact: () => void,
    hitTarget = true,
    hitCount = 1,
  ): void {
    const moveData = getMove(move.id);
    const attackerPokemon = attackerActor === 'player' ? player : enemy;
    const profile = getAttackAnimationProfile({
      name: moveData?.name ?? { en: move.name, he: move.name },
      type: move.type,
      power: move.power,
      damageClass: moveData?.damageClass ?? (move.power > 0 ? 'physical' : 'status'),
      speciesId: attackerPokemon.id,
    });

    const attackerStart = { ...animationDirector.getActorState(attackerActor) };
    const defenderStart = { ...animationDirector.getActorState(defenderActor) };
    const source = getAttackAnchor(attackerActor);
    const target = profile.selfTarget ? getAttackAnchor(attackerActor) : getAttackAnchor(defenderActor);
    const lungeOffset = attackerActor === 'player' ? 12 : -12;
    const recoilOffset = defenderActor === 'player' ? -6 : 6;
    const recoveryDuration = Math.max(0.12, profile.duration - profile.impactTime);

    attackFx = null;

    // --- Multi-hit lunge: repeat lunge+sfx N times, then call onImpact ---
    if (hitCount > 1 && profile.family === 'lunge') {
      const hitTime = Math.max(0.07, profile.impactTime * 0.6);
      const steps: BattleAnimationStep[] = [];
      for (let i = 0; i < hitCount; i++) {
        const isLastHit = i === hitCount - 1;
        steps.push(
          tweenActorStep(
            attackerActor,
            {
              x: attackerStart.x + lungeOffset,
              y: attackerStart.y - 2,
              rotation: attackerStart.rotation + (attackerActor === 'player' ? -0.06 : 0.06),
            },
            hitTime,
            'easeInOut',
          ),
        );
        const capturedIsLast = isLastHit;
        steps.push(
          callStep(() => {
            if (hitTarget) {
              flash = createFlash(profile.flashColor, 0.1);
              shake = createShake(profile.shakeIntensity * 0.75, 0.15);
              audio.playSFX('hit');
            }
            if (capturedIsLast) onImpact();
          }),
        );
        steps.push(
          parallelStep(
            hitTarget
              ? sequenceStep(
                  tweenActorStep(defenderActor, { x: defenderStart.x + recoilOffset }, 0.06, 'easeInOut'),
                  tweenActorStep(defenderActor, defenderStart, 0.07, 'easeInOut'),
                )
              : waitStep(0.13),
            tweenActorStep(attackerActor, attackerStart, 0.09, 'easeInOut'),
          ),
        );
      }
      animationDirector.play(sequenceStep(...steps));
      return;
    }

    // --- Special: Rapid Spin — attacker pokemon spins fast ---
    if (profile.family === 'rapid-spin') {
      animationDirector.play(
        sequenceStep(
          callStep(() => {
            attackFx = createAttackEffect({
              kind: 'rapid-spin',
              sourceX: source.x,
              sourceY: source.y,
              targetX: target.x,
              targetY: target.y,
              color: profile.color,
              accentColor: profile.accentColor,
              duration: profile.duration,
            });
          }),
          parallelStep(
            tweenActorStep(
              attackerActor,
              {
                scaleX: attackerStart.scaleX * 0.82,
                scaleY: attackerStart.scaleY * 0.82,
                rotation: attackerStart.rotation + Math.PI * 6,
              },
              profile.impactTime,
              'linear',
            ),
          ),
          callStep(() => {
            onImpact();
          }),
          parallelStep(
            hitTarget
              ? sequenceStep(
                  tweenActorStep(defenderActor, { x: defenderStart.x + recoilOffset }, 0.07, 'easeInOut'),
                  tweenActorStep(defenderActor, defenderStart, 0.1, 'easeInOut'),
                )
              : waitStep(0.17),
            tweenActorStep(attackerActor, { ...attackerStart, rotation: attackerStart.rotation }, 0.15, 'easeOut'),
          ),
        ),
      );
      return;
    }

    // --- Special: Twister Spin — target pokemon spins, vortex effect ---
    if (profile.family === 'twister-spin') {
      animationDirector.play(
        sequenceStep(
          callStep(() => {
            attackFx = createAttackEffect({
              kind: 'twister-spin',
              sourceX: source.x,
              sourceY: source.y,
              targetX: target.x,
              targetY: target.y,
              color: profile.color,
              accentColor: profile.accentColor,
              duration: profile.duration,
            });
          }),
          parallelStep(
            tweenActorStep(
              defenderActor,
              {
                scaleX: defenderStart.scaleX * 0.85,
                scaleY: defenderStart.scaleY * 0.85,
                rotation: defenderStart.rotation + Math.PI * 4,
              },
              profile.impactTime,
              'linear',
            ),
          ),
          callStep(() => {
            onImpact();
          }),
          tweenActorStep(defenderActor, { ...defenderStart, rotation: defenderStart.rotation }, 0.18, 'easeOut'),
        ),
      );
      return;
    }

    // --- Special: Double Team — ghost clone burst, attacker briefly fades ---
    if (profile.family === 'double-team') {
      animationDirector.play(
        sequenceStep(
          callStep(() => {
            attackFx = createAttackEffect({
              kind: 'double-team',
              sourceX: source.x,
              sourceY: source.y,
              targetX: source.x,
              targetY: source.y,
              color: profile.color,
              accentColor: profile.accentColor,
              duration: profile.duration,
            });
          }),
          parallelStep(tweenActorStep(attackerActor, { alpha: 0.45 }, 0.18, 'easeInOut')),
          tweenActorStep(attackerActor, attackerStart, 0.2, 'easeInOut'),
          callStep(() => {
            onImpact();
          }),
          waitStep(0.15),
        ),
      );
      return;
    }

    animationDirector.play(
      sequenceStep(
        callStep(() => {
          if (START_FX_FAMILIES.has(profile.family)) {
            attackFx = createAttackEffect({
              kind: profile.family as Parameters<typeof createAttackEffect>[0]['kind'],
              sourceX: source.x,
              sourceY: source.y,
              targetX: target.x,
              targetY: target.y,
              color: profile.color,
              accentColor: profile.accentColor,
              duration: profile.duration,
              variant: profile.variant,
            });
          }
        }),
        profile.family === 'lunge'
          ? tweenActorStep(
              attackerActor,
              {
                x: attackerStart.x + lungeOffset,
                y: attackerStart.y - 2,
                rotation: attackerStart.rotation + (attackerActor === 'player' ? -0.08 : 0.08),
              },
              profile.impactTime,
              'easeInOut',
            )
          : waitStep(profile.impactTime),
        callStep(() => {
          if (profile.family === 'pulse' || profile.family === 'burst' || profile.family === 'lunge') {
            attackFx = createAttackEffect({
              kind: profile.family === 'lunge' ? 'burst' : profile.family,
              sourceX: source.x,
              sourceY: source.y,
              targetX: target.x,
              targetY: target.y,
              color: profile.color,
              accentColor: profile.accentColor,
              duration: profile.family === 'lunge' ? 0.2 : undefined,
            });
          }
          onImpact();
        }),
        parallelStep(
          move.power > 0 && hitTarget && !profile.selfTarget
            ? sequenceStep(
                tweenActorStep(defenderActor, { x: defenderStart.x + recoilOffset }, 0.07, 'easeInOut'),
                tweenActorStep(defenderActor, defenderStart, 0.1, 'easeInOut'),
              )
            : waitStep(0.17),
          profile.family === 'lunge'
            ? tweenActorStep(attackerActor, attackerStart, recoveryDuration, 'easeInOut')
            : waitStep(recoveryDuration),
        ),
      ),
    );
  }

  function doAttack(forcedMoveIndex?: number): void {
    // Clear Destiny Bond from enemy when player acts (bond expires on user's next turn)
    if (enemyBattleState.destinyBonded) {
      enemyBattleState.destinyBonded = false;
      syncEnemyBar();
    }
    const rtl = isRTL();
    const attackerName = getPokemonDisplayName(player.id);
    const pendingChargeMoveId = getChargingMoveId(playerBattleState);
    const forcedChargeRelease =
      forcedMoveIndex !== undefined &&
      pendingChargeMoveId !== null &&
      player.moves[forcedMoveIndex]?.id === pendingChargeMoveId;
    triggerStatusTurnEffects('player', player, playerBattleState);
    const startResult = processBeforeMoveEffects(player, playerBattleState);
    const turnEffectLines = startResult.events
      .map((event) => getTurnEffectLine(attackerName, event))
      .filter((line): line is string => line !== null);
    syncPlayerBar();
    if (startResult.selfDamage > 0) {
      flash = createFlash('#fff29a', 0.12);
      shake = createShake(1.4, 0.18);
      spawnDamageNumber(
        `-${startResult.selfDamage}`,
        BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
        BTL.PLY_SPRITE.y + 10,
        '#f8d858',
      );
      audio.playSFX('hit');
    }

    if (!startResult.canAct) {
      if (forcedChargeRelease) {
        clearChargingMove(playerBattleState);
      }
      textBox = createTextBox(turnEffectLines.length > 0 ? turnEffectLines : [t('battle.nothingHappened')], rtl);
      phase = 'PLAYER_ATTACK';
      phaseTimer = 0;
      return;
    }

    const moveIndex = forcedMoveIndex ?? selMove;
    const m = player.moves[moveIndex];
    const defenderName = getPokemonDisplayName(enemy.id);
    const moveBattleData = getMoveBattleData(m.id);
    const isChargeRelease = pendingChargeMoveId !== null && pendingChargeMoveId === m.id;
    const requiresChargeTurn = moveBattleData?.behaviorTags?.includes('requires-charge-turn') ?? false;
    const isChargeStart = requiresChargeTurn && !isChargeRelease;
    const leaveUserAtOneHp = moveBattleData?.behaviorTags?.includes('leave-user-at-1-hp') ?? false;
    const isRest = moveBattleData?.behaviorTags?.includes('rest') ?? false;
    const isFocusEnergy = moveBattleData?.behaviorTags?.includes('focus-energy') ?? false;
    const isFacadeBoost = moveBattleData?.behaviorTags?.includes('facade-boost') ?? false;
    const isFoulPlay = moveBattleData?.behaviorTags?.includes('foul-play') ?? false;
    const isDreamEater = moveBattleData?.behaviorTags?.includes('dream-eater') ?? false;
    const isFocusPunch = moveBattleData?.behaviorTags?.includes('focus-punch') ?? false;
    const isOhko = moveBattleData?.behaviorTags?.includes('ohko') ?? false;
    const isProtect = moveBattleData?.behaviorTags?.includes('protect') ?? false;
    const isEndure = moveBattleData?.behaviorTags?.includes('endure') ?? false;
    const isBrickBreak = moveBattleData?.behaviorTags?.includes('brick-break') ?? false;
    const isDefog = moveBattleData?.behaviorTags?.includes('defog') ?? false;
    const isStealthRock = moveBattleData?.behaviorTags?.includes('stealth-rock') ?? false;
    const isSpikes = moveBattleData?.behaviorTags?.includes('spikes') ?? false;
    const isToxicSpikes = moveBattleData?.behaviorTags?.includes('toxic-spikes') ?? false;
    const isRapidSpinClear = moveBattleData?.behaviorTags?.includes('rapid-spin-clear') ?? false;
    const isSubstitute = moveBattleData?.behaviorTags?.includes('substitute') ?? false;
    const isBatonPass = moveBattleData?.behaviorTags?.includes('baton-pass') ?? false;
    const isCounter = moveBattleData?.behaviorTags?.includes('counter') ?? false;
    const isMirrorCoat = moveBattleData?.behaviorTags?.includes('mirror-coat') ?? false;
    const isMagicCoat = moveBattleData?.behaviorTags?.includes('magic-coat') ?? false;
    const isDestinyBond = moveBattleData?.behaviorTags?.includes('destiny-bond') ?? false;
    const healPercent = moveBattleData?.healingPercent ?? null;
    const hitCount = (() => {
      const min = moveBattleData?.minHits ?? null;
      const max = moveBattleData?.maxHits ?? null;
      if (min !== null && max !== null) return Math.floor(Math.random() * (max - min + 1)) + min;
      return 1;
    })();
    const selfCostAmount = leaveUserAtOneHp ? Math.max(0, player.hp - 1) : 0;

    if (!isChargeRelease && m.currentPp > 0) {
      m.currentPp--;
    }

    const moveData = getMove(m.id);
    if (isChargeStart) {
      startChargingMove(playerBattleState, m.id);
      const playerHasContrary = player.abilityId
        ? getAbilityBattleEffects(player.abilityId).some((e) => e.kind === 'contraryStatChanges')
        : false;
      const chargeStatChanges = applyStatChanges(
        playerBattleState,
        moveBattleData?.chargeStatChanges ?? [],
        'user',
        Math.random,
        playerHasContrary,
      );
      const msgs = [...turnEffectLines, getChargingLine(attackerName, getMoveDisplayName(m.id))];
      for (const change of chargeStatChanges) {
        msgs.push(getStatChangeLine(attackerName, change));
      }
      syncPlayerBar();
      textBox = createTextBox(msgs, rtl);
      phase = 'PLAYER_ATTACK';
      phaseTimer = 0;
      return;
    }

    if (isChargeRelease) {
      clearChargingMove(playerBattleState);
    }
    applyPostMoveTurnFlags(playerBattleState, m.id);

    // Focus Punch: fails if the player took damage this turn
    if (isFocusPunch && playerBattleState.turnFlags.tookDamageThisTurn) {
      const msgs = [
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
        t('battle.focusPunchFailed', { name: attackerName }),
      ];
      textBox = createTextBox(msgs, rtl);
      phase = 'PLAYER_ATTACK';
      phaseTimer = 0;
      return;
    }

    // Substitute: player creates a doll at 1/4 max HP cost
    if (isSubstitute) {
      const cost = Math.floor(player.maxHp / 4);
      if (playerBattleState.substituteActive) {
        const msgs = [
          ...turnEffectLines,
          t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
          t('battle.substituteAlreadyActive', { name: attackerName }),
        ];
        audio.playSFX('menu-cancel');
        textBox = createTextBox(msgs, rtl);
        phase = 'PLAYER_ATTACK';
        phaseTimer = 0;
        return;
      }
      if (player.hp <= cost) {
        const msgs = [
          ...turnEffectLines,
          t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
          t('battle.substituteTooWeak', { name: attackerName }),
        ];
        audio.playSFX('menu-cancel');
        textBox = createTextBox(msgs, rtl);
        phase = 'PLAYER_ATTACK';
        phaseTimer = 0;
        return;
      }
      playAttackAnimation(
        'player',
        'enemy',
        m,
        () => {
          player.hp -= cost;
          setHP(playerHpBar, player.hp);
          playerBattleState.substituteActive = true;
          playerBattleState.substituteHitsAbsorbed = 0;
          syncPlayerBar();
          const msgs = [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
            t('battle.substituteCreated', { name: attackerName }),
          ];
          textBox = createTextBox(msgs, rtl);
          phase = 'PLAYER_ATTACK';
          phaseTimer = 0;
        },
        false,
      );
      return;
    }

    // Baton Pass: save substitute state for incoming Pokemon
    if (isBatonPass) {
      if (playerBattleState.substituteActive) {
        pendingSubstituteCarryover = {
          active: true,
          hitsAbsorbed: playerBattleState.substituteHitsAbsorbed,
        };
        playerBattleState.substituteActive = false;
      }
      const msgs = [...turnEffectLines, t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) })];
      textBox = createTextBox(msgs, rtl);
      phase = 'PLAYER_ATTACK';
      phaseTimer = 0;
      return;
    }

    // Magic Coat: player cloaks themselves to reflect status moves this turn
    if (isMagicCoat) {
      playAttackAnimation(
        'player',
        'enemy',
        m,
        () => {
          playerBattleState.turnFlags.magicCoatActive = true;
          const msgs = [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
            t('battle.magicCoatActive', { name: attackerName }),
          ];
          textBox = createTextBox(msgs, rtl);
          phase = 'PLAYER_ATTACK';
          phaseTimer = 0;
        },
        false,
      );
      return;
    }

    // Destiny Bond: mark the enemy with the bond — if enemy kills player before player acts again, enemy also faints
    if (isDestinyBond) {
      playAttackAnimation(
        'player',
        'enemy',
        m,
        () => {
          enemyBattleState.destinyBonded = true;
          syncEnemyBar();
          const msgs = [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
            t('battle.destinyBondActive', { name: defenderName }),
          ];
          textBox = createTextBox(msgs, rtl);
          phase = 'PLAYER_ATTACK';
          phaseTimer = 0;
        },
        false,
      );
      return;
    }

    // Protect / Endure: player sets its own shield flag for this turn
    if (isProtect || isEndure) {
      playAttackAnimation(
        'player',
        'enemy',
        m,
        () => {
          if (isProtect) {
            playerBattleState.turnFlags.protected = true;
            syncPlayerBar();
          }
          if (isEndure) {
            playerBattleState.turnFlags.endured = true;
          }
          const msgs = [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
            isProtect ? t('battle.protected', { name: attackerName }) : t('battle.endured', { name: attackerName }),
          ];
          textBox = createTextBox(msgs, rtl);
          phase = 'PLAYER_ATTACK';
          phaseTimer = 0;
        },
        false,
      );
      return;
    }

    // Enemy is protected — block the player attack entirely
    if (doesMoveTargetOpponent(moveBattleData) && enemyBattleState.turnFlags.protected) {
      const msgs = [
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
        t('battle.protectedBlock', { name: defenderName }),
      ];
      textBox = createTextBox(msgs, rtl);
      phase = 'PLAYER_ATTACK';
      phaseTimer = 0;
      return;
    }

    // Counter / Mirror Coat: deal 2× the damage received this turn of the matching class
    if (isCounter || isMirrorCoat) {
      const counterDamage = isCounter
        ? playerBattleState.turnFlags.physicalDamageTakenThisTurn * 2
        : playerBattleState.turnFlags.specialDamageTakenThisTurn * 2;
      const msgsBase = [
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
      ];
      if (counterDamage <= 0 || enemy.hp <= 0) {
        audio.playSFX('menu-cancel');
        textBox = createTextBox([...msgsBase, t('battle.counterFailed', { name: attackerName })], rtl);
        phase = 'PLAYER_ATTACK';
        phaseTimer = 0;
        return;
      }
      playAttackAnimation(
        'player',
        'enemy',
        m,
        () => {
          applyMoveImpact(
            enemy,
            m,
            enemyHpBar,
            BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
            BTL.OPP_SPRITE.y + 10,
            counterDamage,
            false,
          );
          textBox = createTextBox(msgsBase, rtl);
          phase = 'PLAYER_ATTACK';
          phaseTimer = 0;
        },
        true,
      );
      return;
    }

    const damageClass = moveData?.damageClass ?? (m.power > 0 ? 'physical' : 'status');
    const hitResult = doesMoveHit(m.accuracy, playerBattleState, enemyBattleState);
    const targetTypeImmune =
      hitResult.hit && doesMoveTargetOpponent(moveBattleData) && isTargetImmuneToMoveType(enemy, m.type);
    const absorbed = hitResult.hit && !targetTypeImmune && m.power > 0 && doesAbilityAbsorbMove(enemy, m.type);
    // Dream Eater: blocked if target is not asleep
    const dreamEaterBlocked = isDreamEater && enemy.status !== 'sleep';
    const criticalHit =
      hitResult.hit && !targetTypeImmune && !dreamEaterBlocked && m.power > 0 && !absorbed
        ? rollCriticalHit(m.id, enemy, Math.random, playerBattleState)
        : false;
    // Facade: double power when user has a status condition
    const facadeActive =
      isFacadeBoost && player.status !== null && ['burn', 'paralyze', 'poison'].includes(player.status as string);
    const effectivePower = facadeActive ? m.power * 2 : m.power;
    // Foul Play: use target's attack stat
    const foulPlayAttackStat = isFoulPlay ? getModifiedStatValue(enemy, enemyBattleState, 'attack') : undefined;
    // Compute animation profile to determine suppressAudio for multi-hit
    const atkAnimProfile = (() => {
      const md = moveData;
      return getAttackAnimationProfile({
        name: md?.name ?? { en: m.name, he: m.name },
        type: m.type,
        power: m.power,
        damageClass: md?.damageClass ?? (m.power > 0 ? 'physical' : 'status'),
        speciesId: player.id,
      });
    })();
    const suppressHitAudio = hitCount > 1 && atkAnimProfile.family === 'lunge';
    const plannedDamage = (() => {
      if (!hitResult.hit || targetTypeImmune || absorbed || dreamEaterBlocked) return 0;
      if (isOhko) return enemy.hp;
      if (effectivePower <= 0) return 0;
      const base = calcDamage(
        player,
        playerBattleState,
        enemy,
        enemyBattleState,
        enemySideState,
        effectivePower,
        m.type,
        damageClass,
        criticalHit,
        foulPlayAttackStat,
      );
      const min = moveBattleData?.minimumDamage ?? null;
      return min !== null ? Math.max(min, base) : base;
    })();
    const allowTargetEffects =
      hitResult.hit &&
      !targetTypeImmune &&
      !absorbed &&
      !dreamEaterBlocked &&
      ((!isOhko && effectivePower <= 0) || plannedDamage < enemy.hp);
    const targetCanStillAct = !enemyAlreadyAttacked;
    const resolvedEffectLines = hitResult.hit
      ? applyResolvedMoveEffects(
          player,
          playerBattleState,
          playerSideState,
          attackerName,
          enemy,
          enemyBattleState,
          enemySideState,
          defenderName,
          m,
          allowTargetEffects,
          targetCanStillAct,
          enemyBattleState.turnFlags.magicCoatActive,
        )
      : [];
    const plannedHpEffectAmount = hitResult.hit
      ? calculateMoveHpEffectAmount(
          plannedDamage,
          moveBattleData?.drainPercent ?? moveBattleData?.recoilPercent ?? null,
        )
      : 0;
    const msgs: string[] = [];
    msgs.push(...turnEffectLines);
    msgs.push(t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }));

    if (m.power > 0) {
      if (!hitResult.hit) {
        msgs.push(t('battle.moveMissed', { name: attackerName }));
      } else {
        if (criticalHit) {
          msgs.push(t('battle.criticalHit'));
        }
        const et = effText(m.type, enemy.types);
        if (et) msgs.push(et);
      }
    } else if (isOhko && hitResult.hit && !targetTypeImmune) {
      msgs.push(t('battle.ohkoHit'));
    } else if (!hitResult.hit) {
      msgs.push(t('battle.moveMissed', { name: attackerName }));
    } else if (targetTypeImmune) {
      msgs.push(t('battle.noEffect'));
    } else if (dreamEaterBlocked) {
      msgs.push(t('battle.dreamEaterFailed'));
      audio.playSFX('menu-cancel');
    } else if (isRest) {
      msgs.push(t('battle.restSleep', { name: attackerName }));
    } else if (isFocusEnergy) {
      msgs.push(t('battle.focusEnergy', { name: attackerName }));
    } else if (isProtect || isEndure) {
      msgs.push(
        isProtect ? t('battle.protected', { name: attackerName }) : t('battle.endured', { name: attackerName }),
      );
    } else if (healPercent !== null) {
      msgs.push(t('battle.healedHp', { name: attackerName }));
    } else if (isStealthRock) {
      if (!enemySideState.stealthRockActive) {
        msgs.push(t('battle.stealthRockSet'));
      } else {
        msgs.push(t('battle.hazardAlreadySet'));
      }
    } else if (isSpikes) {
      if (enemySideState.spikesLayers < 3) {
        msgs.push(t('battle.spikesSet'));
      } else {
        msgs.push(t('battle.hazardAlreadySet'));
      }
    } else if (isToxicSpikes) {
      if (enemySideState.toxicSpikesLayers < 2) {
        msgs.push(t('battle.toxicSpikesSet'));
      } else {
        msgs.push(t('battle.hazardAlreadySet'));
      }
    } else if (resolvedEffectLines.length === 0) {
      msgs.push(t('battle.nothingHappened'));
      audio.playSFX('menu-cancel');
    }
    if (hitCount > 1 && hitResult.hit && !targetTypeImmune && !dreamEaterBlocked) {
      msgs.push(t('battle.multiHit', { count: hitCount }));
    }
    if (plannedHpEffectAmount > 0) {
      if (moveBattleData?.drainPercent) {
        msgs.push(t('battle.drainHeal', { name: attackerName, amount: plannedHpEffectAmount }));
      }
      if (moveBattleData?.recoilPercent) {
        msgs.push(t('battle.recoilHit', { name: attackerName, amount: plannedHpEffectAmount }));
      }
    }
    if (selfCostAmount > 0) {
      msgs.push(t('battle.recoilHit', { name: attackerName, amount: selfCostAmount }));
    }
    msgs.push(...resolvedEffectLines);

    // Brick Break: will shatter enemy screens on impact
    if (isBrickBreak && hitResult.hit && plannedDamage > 0) {
      const hadScreens = enemySideState.reflectTurnsRemaining > 0 || enemySideState.lightScreenTurnsRemaining > 0;
      if (hadScreens) {
        msgs.push(t('battle.brickBreakShatter'));
      }
    }
    // Rapid Spin: will clear own hazards + leech seed on impact
    if (isRapidSpinClear && hitResult.hit && plannedDamage > 0) {
      const hadHazards =
        playerSideState.stealthRockActive || playerSideState.spikesLayers > 0 || playerSideState.toxicSpikesLayers > 0;
      const hadSeed = playerBattleState.leechSeeded;
      if (hadHazards || hadSeed) {
        msgs.push(t('battle.rapidSpinClear', { name: attackerName }));
      }
    }
    // Defog: will clear all hazards and screens
    if (isDefog) {
      msgs.push(t('battle.defogClear'));
    }

    // Contact ability: enemy ability may inflict status on player when hit by physical move
    const contactEffectsOnPlayer: Array<{ status: import('../types/battle-metadata.js').MajorStatusId }> = [];
    if (
      hitResult.hit &&
      damageClass === 'physical' &&
      plannedDamage > 0 &&
      !player.status &&
      enemy.abilityId !== null
    ) {
      const enemyAbilityEffects = getAbilityBattleEffects(enemy.abilityId);
      for (const effect of enemyAbilityEffects) {
        if (effect.kind === 'contactStatusChance' && Math.random() * 100 < effect.chance) {
          contactEffectsOnPlayer.push({ status: effect.status });
          const statusLine = getStatusAppliedLine(attackerName, effect.status);
          if (statusLine) msgs.push(statusLine);
        }
      }
    }

    // Substitute: precompute message based on planned damage (only for damaging moves)
    if (
      hitResult.hit &&
      plannedDamage > 0 &&
      doesMoveTargetOpponent(moveBattleData) &&
      enemyBattleState.substituteActive
    ) {
      const playerMoveName2 = moveData?.name?.en ?? m.name;
      if (!isSubstituteBypass(playerMoveName2, player.abilityId)) {
        const subThreshold = Math.floor(enemy.maxHp / 4);
        if (plannedDamage >= subThreshold) {
          msgs.push(t('battle.substituteDestroyed'));
        } else {
          msgs.push(t('battle.substituteAbsorbed'));
        }
      } else if (plannedDamage > 0) {
        msgs.push(t('battle.substituteBypassed'));
      }
    }

    // Entry hazards: update state (Magic Coat redirects hazards back to player's side)
    const hazardReflectedByEnemy =
      enemyBattleState.turnFlags.magicCoatActive && m.power <= 0 && (isStealthRock || isSpikes || isToxicSpikes);
    const hazardTargetState = hazardReflectedByEnemy ? playerSideState : enemySideState;
    const syncHazardBar = hazardReflectedByEnemy ? syncPlayerBar : syncEnemyBar;
    if (isStealthRock && !hazardTargetState.stealthRockActive) {
      hazardTargetState.stealthRockActive = true;
      syncHazardBar();
    }
    if (isSpikes && hazardTargetState.spikesLayers < 3) {
      hazardTargetState.spikesLayers++;
      syncHazardBar();
    }
    if (isToxicSpikes && hazardTargetState.toxicSpikesLayers < 2) {
      hazardTargetState.toxicSpikesLayers++;
      syncHazardBar();
    }

    textBox = createTextBox(msgs, rtl);
    playAttackAnimation(
      'player',
      'enemy',
      m,
      () => {
        // Rest: full heal + sleep 2 turns + all PP restored
        if (isRest) {
          applyRestEffect(player, playerBattleState);
          setHP(playerHpBar, player.hp);
          setStatus(playerHpBar, player.status ?? '');
          spawnDamageNumber(
            `+${player.maxHp}`,
            BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
            BTL.PLY_SPRITE.y + 10,
            '#48d870',
          );
          audio.playSFX('heal');
        }
        // Heal % moves (Recover, Roost, Milk Drink, etc.)
        if (healPercent !== null) {
          const healed = applyHealPercent(player, healPercent);
          if (healed > 0) {
            setHP(playerHpBar, player.hp);
            spawnDamageNumber(`+${healed}`, BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2, BTL.PLY_SPRITE.y + 10, '#48d870');
            audio.playSFX('heal');
          }
        }
        // Focus Energy: boost crit rate for all future moves
        if (isFocusEnergy) {
          playerBattleState.critBoost = true;
        }
        if (hitResult.hit) {
          let totalActualDamage = 0;
          const playerMoveName = moveData?.name?.en ?? m.name;
          const playerBypassesSub = isSubstituteBypass(playerMoveName, player.abilityId);
          for (let hit = 0; hit < hitCount; hit++) {
            if (enemy.hp <= 0) break;
            const popupY = BTL.OPP_SPRITE.y + 10 - hit * 5;
            if (
              plannedDamage > 0 &&
              enemyBattleState.substituteActive &&
              !playerBypassesSub &&
              doesMoveTargetOpponent(moveBattleData)
            ) {
              const threshold = Math.floor(enemy.maxHp / 4);
              if (plannedDamage >= threshold) {
                enemyBattleState.substituteActive = false;
                enemyBattleState.substituteHitsAbsorbed = 0;
                substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: 'enemy' };
                audio.playSFX('hit');
              } else {
                enemyBattleState.substituteHitsAbsorbed++;
                substituteDollFlash = { timer: 0, duration: 0.3, color: '#ffffff', side: 'enemy' };
                audio.playSFX('hit');
                if (enemyBattleState.substituteHitsAbsorbed >= 2) {
                  enemyBattleState.substituteActive = false;
                  enemyBattleState.substituteHitsAbsorbed = 0;
                  substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: 'enemy' };
                }
              }
              continue;
            }
            totalActualDamage += applyMoveImpact(
              enemy,
              m,
              enemyHpBar,
              BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
              popupY,
              plannedDamage,
              suppressHitAudio,
            );
          }
          // Endure: enemy survives lethal hit at 1 HP
          if (enemy.hp <= 0 && enemyBattleState.turnFlags.endured) {
            enemy.hp = 1;
            setHP(enemyHpBar, 1);
          }
          const actualDamage = totalActualDamage;
          if (actualDamage > 0) {
            enemyBattleState.turnFlags.tookDamageThisTurn = true;
            if (damageClass === 'physical') enemyBattleState.turnFlags.physicalDamageTakenThisTurn += actualDamage;
            else if (damageClass === 'special') enemyBattleState.turnFlags.specialDamageTakenThisTurn += actualDamage;
            const drained = applyDrainHealing(player, actualDamage, moveBattleData?.drainPercent ?? null);
            if (drained > 0) {
              setHP(playerHpBar, player.hp);
              spawnDamageNumber(
                `+${drained}`,
                BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
                BTL.PLY_SPRITE.y + 10,
                '#48d870',
              );
              audio.playSFX('heal');
            }

            const recoil = applyRecoilDamage(player, actualDamage, moveBattleData?.recoilPercent ?? null);
            if (recoil.damage > 0) {
              setHP(playerHpBar, player.hp);
              spawnDamageNumber(
                `-${recoil.damage}`,
                BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
                BTL.PLY_SPRITE.y + 10,
                '#f8d858',
              );
              flash = createFlash('#fff29a', 0.12);
              shake = createShake(1.4, 0.18);
              audio.playSFX('hit');
            }

            // Apply contact ability status effects to the attacking player
            for (const contactEffect of contactEffectsOnPlayer) {
              applyMajorStatus(player, playerBattleState, {
                status: contactEffect.status,
                chance: 100,
                target: 'user',
              });
              setStatus(playerHpBar, player.status ?? '');
            }
          }
        }
        if (leaveUserAtOneHp) {
          const selfCost = applyLeaveUserAtOneHpCost(player);
          if (selfCost.damage > 0) {
            setHP(playerHpBar, player.hp);
            spawnDamageNumber(
              `-${selfCost.damage}`,
              BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
              BTL.PLY_SPRITE.y + 10,
              '#f8d858',
            );
            flash = createFlash('#fff29a', 0.12);
            shake = createShake(1.4, 0.18);
            audio.playSFX('hit');
          }
        }
        // Destiny Bond: if player killed enemy and player has the bond (enemy set it), player also faints
        if (enemy.hp <= 0 && playerBattleState.destinyBonded) {
          playerBattleState.destinyBonded = false;
          player.hp = 0;
          setHP(playerHpBar, 0);
          pendingDestinyBondMsg = t('battle.destinyBondTrigger', { name: attackerName });
        }
        // Brick Break: clear enemy screens after hitting
        if (isBrickBreak) {
          clearScreens(enemySideState);
          syncEnemyBar();
        }
        // Rapid Spin: clear own entry hazards and leech seed after hitting
        if (isRapidSpinClear) {
          clearEntryHazards(playerSideState);
          playerBattleState.leechSeeded = false;
          syncPlayerBar();
        }
        // Defog: clear all hazards and screens on both sides
        if (isDefog) {
          clearEntryHazards(playerSideState);
          clearEntryHazards(enemySideState);
          clearScreens(playerSideState);
          clearScreens(enemySideState);
          syncPlayerBar();
          syncEnemyBar();
        }
      },
      hitResult.hit && !absorbed && plannedDamage > 0,
      hitCount,
    );
    phase = 'PLAYER_ATTACK';
    phaseTimer = 0;
  }

  function enemyTurn(showFasterMsg = false): void {
    // Clear Destiny Bond from player when enemy acts (bond expires on user's next turn)
    if (playerBattleState.destinyBonded) {
      playerBattleState.destinyBonded = false;
      syncPlayerBar();
    }
    const mi = enemySelectedMoveIndex >= 0 ? enemySelectedMoveIndex : getPlannedEnemyMoveIndex();
    enemySelectedMoveIndex = -1;
    const m = enemy.moves[mi];
    const rtl = isRTL();
    const attackerName = getPokemonDisplayName(enemy.id);
    const defenderName = getPokemonDisplayName(player.id);
    const moveBattleData = getMoveBattleData(m.id);
    const chargingMoveId = getChargingMoveId(enemyBattleState);
    const isChargeRelease = chargingMoveId !== null && chargingMoveId === m.id;
    const requiresChargeTurn = moveBattleData?.behaviorTags?.includes('requires-charge-turn') ?? false;
    const isChargeStart = requiresChargeTurn && !isChargeRelease;
    const leaveUserAtOneHp = moveBattleData?.behaviorTags?.includes('leave-user-at-1-hp') ?? false;
    const isRestEnemy = moveBattleData?.behaviorTags?.includes('rest') ?? false;
    const isFocusEnergyEnemy = moveBattleData?.behaviorTags?.includes('focus-energy') ?? false;
    const isFacadeBoostEnemy = moveBattleData?.behaviorTags?.includes('facade-boost') ?? false;
    const isFoulPlayEnemy = moveBattleData?.behaviorTags?.includes('foul-play') ?? false;
    const isDreamEaterEnemy = moveBattleData?.behaviorTags?.includes('dream-eater') ?? false;
    const isFocusPunchEnemy = moveBattleData?.behaviorTags?.includes('focus-punch') ?? false;
    const isOhkoEnemy = moveBattleData?.behaviorTags?.includes('ohko') ?? false;
    const isProtectEnemy = moveBattleData?.behaviorTags?.includes('protect') ?? false;
    const isEndureEnemy = moveBattleData?.behaviorTags?.includes('endure') ?? false;
    const isBrickBreakEnemy = moveBattleData?.behaviorTags?.includes('brick-break') ?? false;
    const isDefogEnemy = moveBattleData?.behaviorTags?.includes('defog') ?? false;
    const isStealthRockEnemy = moveBattleData?.behaviorTags?.includes('stealth-rock') ?? false;
    const isSpikesEnemy = moveBattleData?.behaviorTags?.includes('spikes') ?? false;
    const isToxicSpikesEnemy = moveBattleData?.behaviorTags?.includes('toxic-spikes') ?? false;
    const isRapidSpinClearEnemy = moveBattleData?.behaviorTags?.includes('rapid-spin-clear') ?? false;
    const isSubstituteEnemy = moveBattleData?.behaviorTags?.includes('substitute') ?? false;
    const isCounterEnemy = moveBattleData?.behaviorTags?.includes('counter') ?? false;
    const isMirrorCoatEnemy = moveBattleData?.behaviorTags?.includes('mirror-coat') ?? false;
    const isMagicCoatEnemy = moveBattleData?.behaviorTags?.includes('magic-coat') ?? false;
    const isDestinyBondEnemy = moveBattleData?.behaviorTags?.includes('destiny-bond') ?? false;
    const healPercentEnemy = moveBattleData?.healingPercent ?? null;
    const hitCountEnemy = (() => {
      const min = moveBattleData?.minHits ?? null;
      const max = moveBattleData?.maxHits ?? null;
      if (min !== null && max !== null) return Math.floor(Math.random() * (max - min + 1)) + min;
      return 1;
    })();
    const selfCostAmount = leaveUserAtOneHp ? Math.max(0, enemy.hp - 1) : 0;
    triggerStatusTurnEffects('enemy', enemy, enemyBattleState);
    const startResult = processBeforeMoveEffects(enemy, enemyBattleState);
    const turnEffectLines = startResult.events
      .map((event) => getTurnEffectLine(attackerName, event))
      .filter((line): line is string => line !== null);
    syncEnemyBar();
    if (startResult.selfDamage > 0) {
      flash = createFlash('#fff29a', 0.12);
      shake = createShake(1.4, 0.18);
      spawnDamageNumber(
        `-${startResult.selfDamage}`,
        BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
        BTL.OPP_SPRITE.y + 10,
        '#f8d858',
      );
      audio.playSFX('hit');
    }
    const prefix: string[] = showFasterMsg ? [t('battle.enemyMovesFirst', { name: attackerName })] : [];

    if (!startResult.canAct) {
      if (isChargeRelease) {
        clearChargingMove(enemyBattleState);
      }
      const msgs = [...prefix];
      msgs.push(...(turnEffectLines.length > 0 ? turnEffectLines : [t('battle.nothingHappened')]));
      textBox = createTextBox(msgs, rtl);
      phase = 'ENEMY_TURN';
      phaseTimer = 0;
      return;
    }

    if (!isChargeRelease && m.currentPp > 0) {
      m.currentPp--;
    }

    const moveData = getMove(m.id);
    if (isChargeStart) {
      startChargingMove(enemyBattleState, m.id);
      const enemyHasContrary = enemy.abilityId
        ? getAbilityBattleEffects(enemy.abilityId).some((e) => e.kind === 'contraryStatChanges')
        : false;
      const chargeStatChanges = applyStatChanges(
        enemyBattleState,
        moveBattleData?.chargeStatChanges ?? [],
        'user',
        Math.random,
        enemyHasContrary,
      );
      const msgs = [...prefix, ...turnEffectLines, getChargingLine(attackerName, getMoveDisplayName(m.id))];
      for (const change of chargeStatChanges) {
        msgs.push(getStatChangeLine(attackerName, change));
      }
      syncEnemyBar();
      textBox = createTextBox(msgs, rtl);
      phase = 'ENEMY_TURN';
      phaseTimer = 0;
      return;
    }

    if (isChargeRelease) {
      clearChargingMove(enemyBattleState);
    }
    applyPostMoveTurnFlags(enemyBattleState, m.id);

    // Focus Punch: fails if enemy took damage this turn
    if (isFocusPunchEnemy && enemyBattleState.turnFlags.tookDamageThisTurn) {
      const msgs = [
        ...prefix,
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
        t('battle.focusPunchFailed', { name: attackerName }),
      ];
      textBox = createTextBox(msgs, rtl);
      phase = 'ENEMY_TURN';
      phaseTimer = 0;
      return;
    }

    // Substitute: enemy creates a doll at 1/4 max HP cost
    if (isSubstituteEnemy) {
      const cost = Math.floor(enemy.maxHp / 4);
      if (enemyBattleState.substituteActive) {
        const msgs = [
          ...prefix,
          ...turnEffectLines,
          t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
          t('battle.substituteAlreadyActive', { name: attackerName }),
        ];
        textBox = createTextBox(msgs, rtl);
        phase = 'ENEMY_TURN';
        phaseTimer = 0;
        return;
      }
      if (enemy.hp <= cost) {
        const msgs = [
          ...prefix,
          ...turnEffectLines,
          t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
          t('battle.substituteTooWeak', { name: attackerName }),
        ];
        textBox = createTextBox(msgs, rtl);
        phase = 'ENEMY_TURN';
        phaseTimer = 0;
        return;
      }
      playAttackAnimation(
        'enemy',
        'player',
        m,
        () => {
          enemy.hp -= cost;
          setHP(enemyHpBar, enemy.hp);
          enemyBattleState.substituteActive = true;
          enemyBattleState.substituteHitsAbsorbed = 0;
          syncEnemyBar();
          const msgs = [
            ...prefix,
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
            t('battle.substituteCreated', { name: attackerName }),
          ];
          textBox = createTextBox(msgs, rtl);
          phase = 'ENEMY_TURN';
          phaseTimer = 0;
        },
        false,
      );
      return;
    }

    // Magic Coat: enemy cloaks itself to reflect status moves this turn
    if (isMagicCoatEnemy) {
      playAttackAnimation(
        'enemy',
        'player',
        m,
        () => {
          enemyBattleState.turnFlags.magicCoatActive = true;
          const msgs = [
            ...prefix,
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
            t('battle.magicCoatActive', { name: attackerName }),
          ];
          textBox = createTextBox(msgs, rtl);
          phase = 'ENEMY_TURN';
          phaseTimer = 0;
        },
        false,
      );
      return;
    }

    // Destiny Bond: mark the player with the bond — if player kills enemy before enemy acts again, player also faints
    if (isDestinyBondEnemy) {
      playAttackAnimation(
        'enemy',
        'player',
        m,
        () => {
          playerBattleState.destinyBonded = true;
          syncPlayerBar();
          const msgs = [
            ...prefix,
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
            t('battle.destinyBondActive', { name: defenderName }),
          ];
          textBox = createTextBox(msgs, rtl);
          phase = 'ENEMY_TURN';
          phaseTimer = 0;
        },
        false,
      );
      return;
    }

    // Protect / Endure: enemy sets its own shield flag for this turn
    if (isProtectEnemy || isEndureEnemy) {
      if (isProtectEnemy) {
        enemyBattleState.turnFlags.protected = true;
        syncEnemyBar();
      }
      if (isEndureEnemy) {
        enemyBattleState.turnFlags.endured = true;
      }
      const msgs = [
        ...prefix,
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
        isProtectEnemy ? t('battle.protected', { name: attackerName }) : t('battle.endured', { name: attackerName }),
      ];
      playAttackAnimation(
        'enemy',
        'player',
        m,
        () => {
          textBox = createTextBox(msgs, rtl);
          phase = 'ENEMY_TURN';
          phaseTimer = 0;
        },
        false,
      );
      return;
    }

    // Player is protected — block the enemy attack entirely
    if (doesMoveTargetOpponent(moveBattleData) && playerBattleState.turnFlags.protected) {
      const msgs = [
        ...prefix,
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
        t('battle.protectedBlock', { name: getPokemonDisplayName(player.id) }),
      ];
      textBox = createTextBox(msgs, rtl);
      phase = 'ENEMY_TURN';
      phaseTimer = 0;
      return;
    }

    // Counter / Mirror Coat: enemy deals 2× the damage it received this turn
    if (isCounterEnemy || isMirrorCoatEnemy) {
      const counterDamage = isCounterEnemy
        ? enemyBattleState.turnFlags.physicalDamageTakenThisTurn * 2
        : enemyBattleState.turnFlags.specialDamageTakenThisTurn * 2;
      const msgsBase = [
        ...prefix,
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
      ];
      if (counterDamage <= 0 || player.hp <= 0) {
        audio.playSFX('menu-cancel');
        textBox = createTextBox([...msgsBase, t('battle.counterFailed', { name: attackerName })], rtl);
        phase = 'ENEMY_TURN';
        phaseTimer = 0;
        return;
      }
      playAttackAnimation(
        'enemy',
        'player',
        m,
        () => {
          applyMoveImpact(
            player,
            m,
            playerHpBar,
            BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
            BTL.PLY_SPRITE.y + 10,
            counterDamage,
            false,
          );
          textBox = createTextBox(msgsBase, rtl);
          phase = 'ENEMY_TURN';
          phaseTimer = 0;
        },
        true,
      );
      return;
    }

    const damageClass = moveData?.damageClass ?? (m.power > 0 ? 'physical' : 'status');
    const hitResult = doesMoveHit(m.accuracy, enemyBattleState, playerBattleState);
    const targetTypeImmune =
      hitResult.hit && doesMoveTargetOpponent(moveBattleData) && isTargetImmuneToMoveType(player, m.type);
    const absorbed = hitResult.hit && !targetTypeImmune && m.power > 0 && doesAbilityAbsorbMove(player, m.type);
    const dreamEaterBlockedEnemy = isDreamEaterEnemy && player.status !== 'sleep';
    const criticalHit =
      hitResult.hit && !targetTypeImmune && !dreamEaterBlockedEnemy && m.power > 0 && !absorbed
        ? rollCriticalHit(m.id, player, Math.random, enemyBattleState)
        : false;
    const facadeActiveEnemy =
      isFacadeBoostEnemy && enemy.status !== null && ['burn', 'paralyze', 'poison'].includes(enemy.status as string);
    const effectivePowerEnemy = facadeActiveEnemy ? m.power * 2 : m.power;
    const foulPlayAttackStatEnemy = isFoulPlayEnemy
      ? getModifiedStatValue(player, playerBattleState, 'attack')
      : undefined;
    const atkAnimProfileEnemy = (() => {
      const md = moveData;
      return getAttackAnimationProfile({
        name: md?.name ?? { en: m.name, he: m.name },
        type: m.type,
        power: m.power,
        damageClass: md?.damageClass ?? (m.power > 0 ? 'physical' : 'status'),
        speciesId: enemy.id,
      });
    })();
    const suppressHitAudioEnemy = hitCountEnemy > 1 && atkAnimProfileEnemy.family === 'lunge';
    const plannedDamage = (() => {
      if (!hitResult.hit || targetTypeImmune || absorbed || dreamEaterBlockedEnemy) return 0;
      if (isOhkoEnemy) return player.hp;
      if (effectivePowerEnemy <= 0) return 0;
      const base = calcDamage(
        enemy,
        enemyBattleState,
        player,
        playerBattleState,
        playerSideState,
        effectivePowerEnemy,
        m.type,
        damageClass,
        criticalHit,
        foulPlayAttackStatEnemy,
      );
      const min = moveBattleData?.minimumDamage ?? null;
      return min !== null ? Math.max(min, base) : base;
    })();
    const allowTargetEffects =
      hitResult.hit &&
      !targetTypeImmune &&
      !absorbed &&
      !dreamEaterBlockedEnemy &&
      ((!isOhkoEnemy && effectivePowerEnemy <= 0) || plannedDamage < player.hp);
    const targetCanStillAct = enemyGoesFirst;
    const resolvedEffectLines = hitResult.hit
      ? applyResolvedMoveEffects(
          enemy,
          enemyBattleState,
          enemySideState,
          attackerName,
          player,
          playerBattleState,
          playerSideState,
          defenderName,
          m,
          allowTargetEffects,
          targetCanStillAct,
          playerBattleState.turnFlags.magicCoatActive,
        )
      : [];
    const plannedHpEffectAmount = hitResult.hit
      ? calculateMoveHpEffectAmount(
          plannedDamage,
          moveBattleData?.drainPercent ?? moveBattleData?.recoilPercent ?? null,
        )
      : 0;
    const msgs = [...prefix];
    msgs.push(...turnEffectLines);
    msgs.push(t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }));

    if (m.power > 0) {
      if (!hitResult.hit) {
        msgs.push(t('battle.moveMissed', { name: attackerName }));
      } else {
        if (criticalHit) {
          msgs.push(t('battle.criticalHit'));
        }
        const et = effText(m.type, player.types);
        if (et) msgs.push(et);
      }
    } else if (isOhkoEnemy && hitResult.hit && !targetTypeImmune) {
      msgs.push(t('battle.ohkoHit'));
    } else if (!hitResult.hit) {
      msgs.push(t('battle.moveMissed', { name: attackerName }));
    } else if (targetTypeImmune) {
      msgs.push(t('battle.noEffect'));
    } else if (dreamEaterBlockedEnemy) {
      msgs.push(t('battle.dreamEaterFailed'));
      audio.playSFX('menu-cancel');
    } else if (isRestEnemy) {
      msgs.push(t('battle.restSleep', { name: attackerName }));
    } else if (isFocusEnergyEnemy) {
      msgs.push(t('battle.focusEnergy', { name: attackerName }));
    } else if (healPercentEnemy !== null) {
      msgs.push(t('battle.healedHp', { name: attackerName }));
    } else if (isStealthRockEnemy) {
      if (!playerSideState.stealthRockActive) {
        msgs.push(t('battle.stealthRockSet'));
      } else {
        msgs.push(t('battle.hazardAlreadySet'));
      }
    } else if (isSpikesEnemy) {
      if (playerSideState.spikesLayers < 3) {
        msgs.push(t('battle.spikesSet'));
      } else {
        msgs.push(t('battle.hazardAlreadySet'));
      }
    } else if (isToxicSpikesEnemy) {
      if (playerSideState.toxicSpikesLayers < 2) {
        msgs.push(t('battle.toxicSpikesSet'));
      } else {
        msgs.push(t('battle.hazardAlreadySet'));
      }
    } else if (resolvedEffectLines.length === 0) {
      audio.playSFX('menu-cancel');
      msgs.push(t('battle.nothingHappened'));
    }
    if (hitCountEnemy > 1 && hitResult.hit && !targetTypeImmune && !dreamEaterBlockedEnemy) {
      msgs.push(t('battle.multiHit', { count: hitCountEnemy }));
    }
    if (plannedHpEffectAmount > 0) {
      if (moveBattleData?.drainPercent) {
        msgs.push(t('battle.drainHeal', { name: attackerName, amount: plannedHpEffectAmount }));
      }
      if (moveBattleData?.recoilPercent) {
        msgs.push(t('battle.recoilHit', { name: attackerName, amount: plannedHpEffectAmount }));
      }
    }
    if (selfCostAmount > 0) {
      msgs.push(t('battle.recoilHit', { name: attackerName, amount: selfCostAmount }));
    }
    msgs.push(...resolvedEffectLines);

    // Brick Break: will shatter player screens on impact
    if (isBrickBreakEnemy && hitResult.hit && plannedDamage > 0) {
      const hadScreens = playerSideState.reflectTurnsRemaining > 0 || playerSideState.lightScreenTurnsRemaining > 0;
      if (hadScreens) {
        msgs.push(t('battle.brickBreakShatter'));
      }
    }
    // Rapid Spin: will clear own hazards + leech seed on impact
    if (isRapidSpinClearEnemy && hitResult.hit && plannedDamage > 0) {
      const hadHazards =
        enemySideState.stealthRockActive || enemySideState.spikesLayers > 0 || enemySideState.toxicSpikesLayers > 0;
      const hadSeed = enemyBattleState.leechSeeded;
      if (hadHazards || hadSeed) {
        msgs.push(t('battle.rapidSpinClear', { name: attackerName }));
      }
    }
    // Defog: will clear all hazards and screens
    if (isDefogEnemy) {
      msgs.push(t('battle.defogClear'));
    }

    // Contact ability: player ability may inflict status on enemy when enemy uses physical move
    const contactEffectsOnEnemy: Array<{ status: import('../types/battle-metadata.js').MajorStatusId }> = [];
    if (
      hitResult.hit &&
      damageClass === 'physical' &&
      plannedDamage > 0 &&
      !enemy.status &&
      player.abilityId !== null
    ) {
      const playerAbilityEffects = getAbilityBattleEffects(player.abilityId);
      for (const effect of playerAbilityEffects) {
        if (effect.kind === 'contactStatusChance' && Math.random() * 100 < effect.chance) {
          contactEffectsOnEnemy.push({ status: effect.status });
          const statusLine = getStatusAppliedLine(attackerName, effect.status);
          if (statusLine) msgs.push(statusLine);
        }
      }
    }

    // Substitute: precompute message based on planned damage (only for damaging moves)
    if (
      hitResult.hit &&
      plannedDamage > 0 &&
      doesMoveTargetOpponent(moveBattleData) &&
      playerBattleState.substituteActive
    ) {
      const enemyMoveName = moveData?.name?.en ?? m.name;
      if (!isSubstituteBypass(enemyMoveName, enemy.abilityId)) {
        const subThreshold = Math.floor(player.maxHp / 4);
        if (plannedDamage >= subThreshold) {
          msgs.push(t('battle.substituteDestroyed'));
        } else {
          msgs.push(t('battle.substituteAbsorbed'));
        }
      } else if (plannedDamage > 0) {
        msgs.push(t('battle.substituteBypassed'));
      }
    }

    // Entry hazards: update state (Magic Coat redirects hazards back to enemy's side)
    const hazardReflectedByPlayer =
      playerBattleState.turnFlags.magicCoatActive &&
      m.power <= 0 &&
      (isStealthRockEnemy || isSpikesEnemy || isToxicSpikesEnemy);
    const enemyHazardTargetState = hazardReflectedByPlayer ? enemySideState : playerSideState;
    const syncEnemyHazardBar = hazardReflectedByPlayer ? syncEnemyBar : syncPlayerBar;
    if (isStealthRockEnemy && !enemyHazardTargetState.stealthRockActive) {
      enemyHazardTargetState.stealthRockActive = true;
      syncEnemyHazardBar();
    }
    if (isSpikesEnemy && enemyHazardTargetState.spikesLayers < 3) {
      enemyHazardTargetState.spikesLayers++;
      syncEnemyHazardBar();
    }
    if (isToxicSpikesEnemy && enemyHazardTargetState.toxicSpikesLayers < 2) {
      enemyHazardTargetState.toxicSpikesLayers++;
      syncEnemyHazardBar();
    }

    textBox = createTextBox(msgs, rtl);
    playAttackAnimation(
      'enemy',
      'player',
      m,
      () => {
        // Rest: full heal + sleep 2 turns + all PP restored
        if (isRestEnemy) {
          applyRestEffect(enemy, enemyBattleState);
          setHP(enemyHpBar, enemy.hp);
          setStatus(enemyHpBar, enemy.status ?? '');
          spawnDamageNumber(
            `+${enemy.maxHp}`,
            BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
            BTL.OPP_SPRITE.y + 10,
            '#48d870',
          );
          audio.playSFX('heal');
        }
        // Heal % moves (Recover, Roost, Milk Drink, etc.)
        if (healPercentEnemy !== null) {
          const healed = applyHealPercent(enemy, healPercentEnemy);
          if (healed > 0) {
            setHP(enemyHpBar, enemy.hp);
            spawnDamageNumber(`+${healed}`, BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2, BTL.OPP_SPRITE.y + 10, '#48d870');
            audio.playSFX('heal');
          }
        }
        // Focus Energy: boost crit rate for all future moves
        if (isFocusEnergyEnemy) {
          enemyBattleState.critBoost = true;
        }
        if (hitResult.hit) {
          let totalActualDamageEnemy = 0;
          const enemyMoveName2 = moveData?.name?.en ?? m.name;
          const enemyBypassesSub = isSubstituteBypass(enemyMoveName2, enemy.abilityId);
          for (let hit = 0; hit < hitCountEnemy; hit++) {
            if (player.hp <= 0) break;
            const popupY = BTL.PLY_SPRITE.y + 10 - hit * 5;
            if (
              plannedDamage > 0 &&
              playerBattleState.substituteActive &&
              !enemyBypassesSub &&
              doesMoveTargetOpponent(moveBattleData)
            ) {
              const threshold = Math.floor(player.maxHp / 4);
              if (plannedDamage >= threshold) {
                playerBattleState.substituteActive = false;
                playerBattleState.substituteHitsAbsorbed = 0;
                substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: 'player' };
                audio.playSFX('hit');
              } else {
                playerBattleState.substituteHitsAbsorbed++;
                substituteDollFlash = { timer: 0, duration: 0.3, color: '#ffffff', side: 'player' };
                audio.playSFX('hit');
                if (playerBattleState.substituteHitsAbsorbed >= 2) {
                  playerBattleState.substituteActive = false;
                  playerBattleState.substituteHitsAbsorbed = 0;
                  substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: 'player' };
                }
              }
              continue;
            }
            totalActualDamageEnemy += applyMoveImpact(
              player,
              m,
              playerHpBar,
              BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2,
              popupY,
              plannedDamage,
              suppressHitAudioEnemy,
            );
          }
          // Endure: survive lethal hit at 1 HP
          if (player.hp <= 0 && playerBattleState.turnFlags.endured) {
            player.hp = 1;
            setHP(playerHpBar, 1);
          }
          const actualDamage = totalActualDamageEnemy;
          if (actualDamage > 0) {
            playerBattleState.turnFlags.tookDamageThisTurn = true;
            if (damageClass === 'physical') playerBattleState.turnFlags.physicalDamageTakenThisTurn += actualDamage;
            else if (damageClass === 'special') playerBattleState.turnFlags.specialDamageTakenThisTurn += actualDamage;
            const drained = applyDrainHealing(enemy, actualDamage, moveBattleData?.drainPercent ?? null);
            if (drained > 0) {
              setHP(enemyHpBar, enemy.hp);
              spawnDamageNumber(
                `+${drained}`,
                BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
                BTL.OPP_SPRITE.y + 10,
                '#48d870',
              );
              audio.playSFX('heal');
            }

            const recoil = applyRecoilDamage(enemy, actualDamage, moveBattleData?.recoilPercent ?? null);
            if (recoil.damage > 0) {
              setHP(enemyHpBar, enemy.hp);
              spawnDamageNumber(
                `-${recoil.damage}`,
                BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
                BTL.OPP_SPRITE.y + 10,
                '#f8d858',
              );
              flash = createFlash('#fff29a', 0.12);
              shake = createShake(1.4, 0.18);
              audio.playSFX('hit');
            }

            // Apply contact ability status effects to the attacking enemy
            for (const contactEffect of contactEffectsOnEnemy) {
              applyMajorStatus(enemy, enemyBattleState, { status: contactEffect.status, chance: 100, target: 'user' });
              setStatus(enemyHpBar, enemy.status ?? '');
            }
          }
        }
        if (leaveUserAtOneHp) {
          const selfCost = applyLeaveUserAtOneHpCost(enemy);
          if (selfCost.damage > 0) {
            setHP(enemyHpBar, enemy.hp);
            spawnDamageNumber(
              `-${selfCost.damage}`,
              BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2,
              BTL.OPP_SPRITE.y + 10,
              '#f8d858',
            );
            flash = createFlash('#fff29a', 0.12);
            shake = createShake(1.4, 0.18);
            audio.playSFX('hit');
          }
        }
        // Destiny Bond: if enemy killed player and enemy has the bond (player set it), enemy also faints
        if (player.hp <= 0 && enemyBattleState.destinyBonded) {
          enemyBattleState.destinyBonded = false;
          enemy.hp = 0;
          setHP(enemyHpBar, 0);
          pendingDestinyBondMsg = t('battle.destinyBondTrigger', { name: attackerName });
        }
        // Brick Break: clear player screens after hitting
        if (isBrickBreakEnemy) {
          clearScreens(playerSideState);
          syncPlayerBar();
        }
        // Rapid Spin: clear own entry hazards and leech seed after hitting
        if (isRapidSpinClearEnemy) {
          clearEntryHazards(enemySideState);
          enemyBattleState.leechSeeded = false;
          syncEnemyBar();
        }
        // Defog: clear all hazards and screens on both sides
        if (isDefogEnemy) {
          clearEntryHazards(playerSideState);
          clearEntryHazards(enemySideState);
          clearScreens(playerSideState);
          clearScreens(enemySideState);
          syncPlayerBar();
          syncEnemyBar();
        }
      },
      hitResult.hit && !absorbed && plannedDamage > 0,
      hitCountEnemy,
    );
    phase = 'ENEMY_TURN';
    phaseTimer = 0;
  }

  function goBack(): void {
    autoSave();
    stateMachine.change('OVERWORLD');
  }

  function handleLoss(): void {
    const outcome = pendingLossOutcome ?? (isTrainerBattle ? 'trainer-whiteout' : 'wild-whiteout');
    if (hasActiveGame()) {
      const pd = getPlayerData();
      const penalty = getLossPenalty(outcome, pd.money);
      pd.money = Math.max(0, pd.money - penalty);

      if (outcome === 'trainer-whiteout' || outcome === 'wild-whiteout') {
        for (const p of pd.party) {
          p.hp = p.maxHp;
          p.status = null;
          for (const mv of p.moves) mv.currentPp = mv.pp;
        }
        const center = pd.lastPokemonCenter;
        pd.position.mapId = center.mapId;
        pd.position.x = center.x;
        pd.position.y = center.y;
      }
    }
    pendingLossOutcome = null;
    autoSave();
    stateMachine.change('OVERWORLD');
  }

  /** Check if the player can still send out a Pokemon (roster member alive OR roster not full) */
  function hasUsablePartyPokemon(): boolean {
    if (!hasActiveGame()) return false;
    const pd = getPlayerData();
    // Check if any roster Pokemon (other than current) is still alive
    for (const idx of battleRoster) {
      if (idx !== activePartyIndex && pd.party[idx] && pd.party[idx].hp > 0) return true;
    }
    // Check if roster can grow and there's a healthy non-roster Pokemon
    if (battleRoster.size < maxRosterSize) {
      return pd.party.some((p, i) => !battleRoster.has(i) && p.hp > 0);
    }
    return false;
  }

  /** Check if a party index is eligible for switching into battle */
  function canSwitchTo(partyIndex: number): boolean {
    if (canUseOpeningSoloSwitch(partyIndex)) return true;
    if (isTrainerBattle && maxRosterSize === 1) return false;
    if (battleRoster.has(partyIndex)) return true; // Already in roster
    return battleRoster.size < maxRosterSize; // New slot available
  }

  function handleMainChoice(choice: MainMenuChoice): void {
    audio.playSFX('menu-select');
    if (choice === 'FIGHT') {
      enterSelectMovePhase();
    } else if (choice === 'BAG') {
      setBagMode('battle');
      clearPendingItem();
      waitingForBag = true;
      phase = 'WAITING_BAG';
      stateMachine.push('BAG');
    } else if (choice === 'POKEMON') {
      if (player.hp > 0 && isBattlePokemonTrapped(playerBattleState)) {
        textBox = createTextBox([t('battle.cantSwitchTrapped', { name: getPokemonDisplayName(player.id) })], isRTL());
        phase = 'INTRO';
      } else if (hasActiveGame()) {
        const pd = getPlayerData();
        const hasOther = pd.party.some((p, i) => i !== activePartyIndex && p.hp > 0 && canSwitchTo(i));
        if (!hasOther) {
          textBox = createTextBox([t('battle.noOtherPokemon')], isRTL());
          phase = 'INTRO';
        } else {
          setPartyMode('battle');
          clearSelectedPartyIndex();
          previousLeadId = player.id;
          waitingForParty = true;
          phase = 'WAITING_PARTY';
          stateMachine.push('PARTY');
        }
      } else {
        textBox = createTextBox([t('battle.cantDoThat')], isRTL());
        phase = 'INTRO';
      }
    } else if (choice === 'POKEDEX') {
      if (hasActiveGame()) {
        const pd = getPlayerData();
        if (pd.pokedexBatteryCharges <= 0) {
          textBox = createTextBox(
            ['פוקדקס ריק! תטען במרכז פוקימון.', 'Pokedex battery empty! Recharge at PokeCenter.'],
            isRTL(),
          );
          phase = 'INTRO';
        } else {
          pd.pokedexBatteryCharges--;
          autoSave();
          setPokedexFocus(enemy.id, true, 'type', 'battle');
          waitingForPokedex = true;
          phase = 'WAITING_POKEDEX';
          stateMachine.push('POKEDEX');
        }
      } else {
        textBox = createTextBox([t('battle.cantDoThat')], isRTL());
        phase = 'INTRO';
      }
    } else if (choice === 'RUN') {
      if (isTrainerBattle) {
        textBox = createTextBox([t('battle.cantRunTrainer')], isRTL());
        phase = 'INTRO';
      } else if (player.hp > 0 && isBattlePokemonTrapped(playerBattleState)) {
        textBox = createTextBox([t('battle.cantEscapeTrapped', { name: getPokemonDisplayName(player.id) })], isRTL());
        phase = 'INTRO';
      } else {
        startPlayerRetreatAnimation();
        textBox = createTextBox([t('battle.gotAway')], isRTL());
        phase = 'RUN';
      }
    } else {
      textBox = createTextBox([t('battle.cantDoThat')], isRTL());
      phase = 'INTRO';
    }
  }

  return {
    enter(): void {
      init();
      // Mark enemy Pokemon as seen in Pokedex
      if (hasActiveGame()) {
        getPlayerData().pokedex[enemy.id] = true;
      }
      if (isTrainerBattle && trainerData) {
        textBox = createTextBox(
          [
            t('battle.trainerWantsBattle', { name: getLocalizedName(trainerData.trainerName) }),
            t('battle.trainerSentOut', { name: getPokemonDisplayName(enemy.id) }),
          ],
          isRTL(),
        );
      } else {
        textBox = createTextBox([t('battle.wildAppeared', { name: getPokemonDisplayName(enemy.id) })], isRTL());
      }
      phase = 'INTRO';
      audio.playMusic('battle');
    },
    exit(): void {
      clearAllPopups();
    },
    update(dt: number): void {
      phaseTimer += dt;
      if (flash) updateFlash(flash, dt);
      if (shake) updateShake(shake, dt);
      if (substituteDollFlash) {
        substituteDollFlash.timer += dt;
        if (substituteDollFlash.timer >= substituteDollFlash.duration) {
          substituteDollFlash = null;
        }
      }
      if (fade) updateFade(fade, dt);
      if (levelUpFx) updateLevelUpEffect(levelUpFx, dt);
      if (captureSuccessFx) updateCaptureSuccessEffect(captureSuccessFx, dt);
      if (sendOutFx) updateSendOutEffect(sendOutFx, dt);
      if (attackFx) {
        updateAttackEffect(attackFx, dt);
        if (!attackFx.active) attackFx = null;
      }
      if (statusTurnFx.length > 0) {
        for (const effect of statusTurnFx) {
          updateStatusTurnEffect(effect, dt);
        }
        statusTurnFx = statusTurnFx.filter((effect) => effect.active);
      }
      animationDirector.update(dt);
      updateHPBar(playerHpBar, dt);
      updateHPBar(enemyHpBar, dt);
      updatePopups(dt);

      switch (phase) {
        case 'INTRO': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            showTrainerSprite = false;
          }
          if (!textBox) {
            if (pendingEnemySendOutAnimation) {
              if (!animationDirector.isBusy()) startEnemySendOutAnimation();
              break;
            }
            if (pendingPlayerSendOutAnimation) {
              if (!animationDirector.isBusy()) startPlayerSendOutAnimation();
              break;
            }
            if (animationDirector.isBusy()) {
              break;
            }
            if (pendingPlayerEntryHazard) {
              pendingPlayerEntryHazard = false;
              const hazardResult = applyEntryHazards(player, playerBattleState, playerSideState);
              const hazardMsgs = buildHazardMessages(hazardResult, getPokemonDisplayName(player.id), playerSideState);
              if (hazardMsgs.length > 0) {
                setHP(playerHpBar, player.hp);
                setStatus(playerHpBar, player.status ?? '');
                syncPlayerBar();
                textBox = createTextBox(hazardMsgs, isRTL());
                break;
              }
            }
            if (pendingEnemyEntryHazard) {
              pendingEnemyEntryHazard = false;
              const hazardResult = applyEntryHazards(enemy, enemyBattleState, enemySideState);
              const hazardMsgs = buildHazardMessages(hazardResult, getPokemonDisplayName(enemy.id), enemySideState);
              if (hazardMsgs.length > 0) {
                setHP(enemyHpBar, enemy.hp);
                setStatus(enemyHpBar, enemy.status ?? '');
                syncEnemyBar();
                textBox = createTextBox(hazardMsgs, isRTL());
                break;
              }
            }
            turnNumber++;
            menu.turnNumber = turnNumber;
            menu.playerPokemon = player;
            if (hasActiveGame()) menu.party = getPlayerData().party;
            pendingTurnCredit = true;
            enterSelectMovePhase();
          }
          break;
        }
        case 'SELECT_ACTION': {
          const r = updateBattleMenu(menu, input);
          if (r?.type === 'main') {
            handleMainChoice(r.choice);
          }
          break;
        }
        case 'SELECT_MOVE': {
          const r = updateBattleMenu(menu, input);
          if (r?.type === 'main') {
            // Number shortcut (2=switch, 3=bag) pressed from move grid
            handleMainChoice(r.choice);
          } else if (r?.type === 'move') {
            if (r.index === -1) {
              phase = 'SELECT_ACTION';
              showMainMenu(menu);
            } else {
              selMove = r.index;
              pendingForcedPlayerMoveIndex = null;
              const m = player.moves[selMove];
              if (m.currentPp <= 0) {
                textBox = createTextBox([t('battle.noPP')], isRTL());
                phase = 'INTRO';
              } else {
                if (!handleTrainerTurnPriority()) {
                  enemySelectedMoveIndex = getPlannedEnemyMoveIndex();
                  const enemyMove = enemy.moves[enemySelectedMoveIndex] ?? enemy.moves[0];
                  const turnOrder = determineTurnOrder(
                    player,
                    playerBattleState,
                    m.id,
                    enemy,
                    enemyBattleState,
                    enemyMove.id,
                  );
                  enemyGoesFirst = turnOrder.enemyActsFirst;
                  if (enemyGoesFirst) {
                    enemyTurn(true);
                  } else {
                    doAttack();
                  }
                }
              }
            }
          }
          break;
        }
        case 'PLAYER_ATTACK': {
          if (textBox && updateTextBox(textBox, input, dt)) textBox = null;
          if (
            !textBox &&
            !animationDirector.isBusy() &&
            !attackFx &&
            !isHPAnimating(enemyHpBar) &&
            !isHPAnimating(playerHpBar)
          ) {
            if (pendingDestinyBondMsg) {
              textBox = createTextBox([pendingDestinyBondMsg], isRTL());
              pendingDestinyBondMsg = null;
            } else {
              phase = 'CHECK_WIN';
            }
          }
          break;
        }
        case 'ENEMY_TURN': {
          if (textBox && updateTextBox(textBox, input, dt)) textBox = null;
          if (
            !textBox &&
            !animationDirector.isBusy() &&
            !attackFx &&
            !isHPAnimating(playerHpBar) &&
            !isHPAnimating(enemyHpBar)
          ) {
            if (pendingDestinyBondMsg) {
              textBox = createTextBox([pendingDestinyBondMsg], isRTL());
              pendingDestinyBondMsg = null;
            } else if (enemy.hp <= 0) {
              // Enemy fainted (e.g. Destiny Bond triggered)
              phase = 'CHECK_WIN';
            } else if (player.hp <= 0) {
              const consolationXp = awardConsolationXp(player, activePartyIndex);
              handlePlayerFaintAfterAction(consolationXp);
            } else if (enemyGoesFirst) {
              // Enemy went first, now player attacks with pre-selected move
              enemyGoesFirst = false;
              enemyAlreadyAttacked = true;
              const forcedMoveIndex = pendingForcedPlayerMoveIndex;
              pendingForcedPlayerMoveIndex = null;
              doAttack(forcedMoveIndex ?? undefined);
            } else {
              pendingForcedPlayerMoveIndex = null;
              startEndTurnStatusPhase();
            }
          }
          break;
        }
        case 'CHECK_WIN': {
          if (enemy.hp <= 0) {
            startEnemyFaintAnimation();
            if (isTrainerBattle && trainerData && trainerPartyIndex + 1 < trainerData.party.length) {
              // Trainer has more Pokemon
              textBox = createTextBox([t('battle.fainted', { name: getPokemonDisplayName(enemy.id) })], isRTL());
              phase = 'TRAINER_NEXT_POKEMON';
            } else {
              // Wild win or trainer's last Pokemon fainted
              const msgs = [t('battle.fainted', { name: getPokemonDisplayName(enemy.id) }), t('battle.youWon')];
              textBox = createTextBox(msgs, isRTL());
              audio.playMusic('victory');
              phase = 'WIN';
            }
          } else if (player.hp <= 0) {
            const consolationXp = awardConsolationXp(player, activePartyIndex);
            handlePlayerFaintAfterAction(consolationXp);
          } else if (enemyAlreadyAttacked) {
            // Enemy already attacked this turn
            enemyAlreadyAttacked = false;
            startEndTurnStatusPhase();
          } else enemyTurn();
          break;
        }
        case 'END_TURN_STATUS': {
          if (textBox && updateTextBox(textBox, input, dt)) textBox = null;
          if (
            !textBox &&
            !animationDirector.isBusy() &&
            !attackFx &&
            !isHPAnimating(playerHpBar) &&
            !isHPAnimating(enemyHpBar)
          ) {
            if (enemy.hp <= 0) {
              phase = 'CHECK_WIN';
            } else if (player.hp <= 0) {
              handlePlayerFaintAfterAction();
            } else {
              turnNumber++;
              menu.turnNumber = turnNumber;
              pendingTurnCredit = true;
              enterSelectMovePhase();
            }
          }
          break;
        }
        case 'TRAINER_VOLUNTARY_SWITCH': {
          // Trainer withdrew one Pokemon and sent out another — wait for text + send-out animation
          if (textBox && updateTextBox(textBox, input, dt)) textBox = null;
          if (!textBox) {
            if (pendingEnemySendOutAnimation) {
              if (!animationDirector.isBusy()) startEnemySendOutAnimation();
              break;
            }
            if (animationDirector.isBusy()) break;
            // Apply entry hazards to the newly switched-in enemy Pokemon
            if (pendingEnemyEntryHazard) {
              pendingEnemyEntryHazard = false;
              const hazardResult = applyEntryHazards(enemy, enemyBattleState, enemySideState);
              const hazardMsgs = buildHazardMessages(hazardResult, getPokemonDisplayName(enemy.id), enemySideState);
              if (hazardMsgs.length > 0) {
                setHP(enemyHpBar, enemy.hp);
                setStatus(enemyHpBar, enemy.status ?? '');
                syncEnemyBar();
                textBox = createTextBox(hazardMsgs, isRTL());
                break;
              }
            }
            // Transition to ENEMY_TURN; since enemyGoesFirst=true, player will attack the new Pokemon
            phase = 'ENEMY_TURN';
          }
          break;
        }
        case 'TRAINER_NEXT_POKEMON': {
          // Shows "fainted" text, then transitions to XP phase
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
          }
          if (!textBox && !animationDirector.isBusy()) {
            xpGained = getDefeatXpReward();
            player.xp += xpGained;
            textBox = createTextBox(
              [t('battle.gainedXP', { name: getPokemonDisplayName(player.id), xp: xpGained })],
              isRTL(),
            );
            phase = 'TRAINER_NEXT_XP';
          }
          break;
        }
        case 'TRAINER_NEXT_XP': {
          // Shows XP gained text, then checks for level up or sends next Pokemon
          if (textBox) {
            if (updateTextBox(textBox, input, dt)) {
              textBox = null;
            } else {
              break;
            }
          }
          if (waitForXpResolution()) break;
          if (!startLevelUp('TRAINER_NEXT_LEVEL_UP')) {
            sendOutNextTrainerPokemon();
          }
          break;
        }
        case 'TRAINER_NEXT_LEVEL_UP': {
          // Shows level-up text, then shows learned moves or sends next Pokemon
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            statGainsPopup = null;
            if (!showNextLearnedMove('TRAINER_NEXT_LEVEL_UP_MOVES')) {
              if (startPendingEvolution('TRAINER_NEXT_XP')) break;
              if (player.xp > 0) {
                phase = 'TRAINER_NEXT_XP';
              } else {
                sendOutNextTrainerPokemon();
              }
            }
          }
          break;
        }
        case 'TRAINER_NEXT_LEVEL_UP_MOVES': {
          // Shows "learned move" text one by one, then sends next Pokemon
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (startMoveLearning('TRAINER_NEXT_LEVEL_UP_MOVES')) break;
            if (!showNextLearnedMove('TRAINER_NEXT_LEVEL_UP_MOVES')) {
              if (startPendingEvolution('TRAINER_NEXT_XP')) break;
              if (player.xp > 0) {
                phase = 'TRAINER_NEXT_XP';
              } else {
                sendOutNextTrainerPokemon();
              }
            }
          }
          break;
        }
        case 'WIN': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
          }
          if (!textBox && !animationDirector.isBusy()) {
            xpGained = getDefeatXpReward();
            player.xp += xpGained;
            textBox = createTextBox(
              [t('battle.gainedXP', { name: getPokemonDisplayName(player.id), xp: xpGained })],
              isRTL(),
            );
            if (isTrainerBattle && trainerData) {
              phase = 'TRAINER_REWARD';
            } else {
              phase = 'XP_GAIN';
            }
          }
          break;
        }
        case 'TRAINER_REWARD': {
          // Shows XP gained text (from WIN phase), then checks level up
          if (textBox) {
            if (updateTextBox(textBox, input, dt)) {
              textBox = null;
            } else {
              break;
            }
          }
          if (waitForXpResolution()) break;
          if (!startLevelUp('TRAINER_REWARD_LEVEL_UP')) {
            awardTrainerReward();
          }
          break;
        }
        case 'TRAINER_REWARD_LEVEL_UP': {
          // Shows level-up text, then shows learned moves or awards trainer reward
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            statGainsPopup = null;
            if (!showNextLearnedMove('TRAINER_REWARD_LEVEL_UP_MOVES')) {
              if (startPendingEvolution('TRAINER_REWARD')) break;
              if (player.xp > 0) {
                phase = 'TRAINER_REWARD';
              } else {
                awardTrainerReward();
              }
            }
          }
          break;
        }
        case 'TRAINER_REWARD_LEVEL_UP_MOVES': {
          // Shows "learned move" text one by one, then awards trainer reward
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (startMoveLearning('TRAINER_REWARD_LEVEL_UP_MOVES')) break;
            if (!showNextLearnedMove('TRAINER_REWARD_LEVEL_UP_MOVES')) {
              if (startPendingEvolution('TRAINER_REWARD')) break;
              if (player.xp > 0) {
                phase = 'TRAINER_REWARD';
              } else {
                awardTrainerReward();
              }
            }
          }
          break;
        }
        case 'XP_GAIN': {
          if (textBox) {
            if (updateTextBox(textBox, input, dt)) {
              textBox = null;
            } else {
              break;
            }
          }
          if (waitForXpResolution()) break;
          if (!startLevelUp('LEVEL_UP')) {
            fade = createFade(false, 0.5);
            phase = 'RUN';
          }
          break;
        }
        case 'LEVEL_UP': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            statGainsPopup = null;
            if (!showNextLearnedMove('LEVEL_UP_MOVES')) {
              if (startPendingEvolution('XP_GAIN')) break;
              if (player.xp > 0) {
                phase = 'XP_GAIN';
              } else {
                fade = createFade(false, 0.5);
                phase = 'RUN';
              }
            }
          }
          break;
        }
        case 'LEVEL_UP_MOVES': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (startMoveLearning('LEVEL_UP_MOVES')) break;
            if (!showNextLearnedMove('LEVEL_UP_MOVES')) {
              if (startPendingEvolution('XP_GAIN')) break;
              if (player.xp > 0) {
                phase = 'XP_GAIN';
              } else {
                fade = createFade(false, 0.5);
                phase = 'RUN';
              }
            }
          }
          break;
        }
        case 'RUN': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
          }
          if (!textBox && !animationDirector.isBusy() && !fade) {
            fade = createFade(false, 0.5);
          }
          if (!textBox && fade && !fade.active) goBack();
          break;
        }
        case 'LOSE': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
          }
          if (!textBox && !animationDirector.isBusy() && !fade) {
            if (!lossDialogueShown) {
              const outcome = pendingLossOutcome ?? (isTrainerBattle ? 'trainer-whiteout' : 'wild-whiteout');
              textBox = createTextBox(buildLossDialogue(outcome), isRTL());
              lossDialogueShown = true;
            } else {
              fade = createFade(false, 0.5);
            }
          }
          if (!textBox && fade && !fade.active) handleLoss();
          break;
        }
        case 'PLAYER_FAINT_SWITCH': {
          // Active Pokemon fainted but roster has usable Pokemon — force switch
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
          }
          if (!textBox && !animationDirector.isBusy()) {
            setPartyMode('battle');
            clearSelectedPartyIndex();
            previousLeadId = player.id;
            waitingForParty = true;
            isForcedFaintSwitch = true; // don't give enemy a free attack after faint switch
            phase = 'WAITING_PARTY';
            stateMachine.push('PARTY');
          }
          break;
        }
        case 'TRAINER_LOSS': {
          if (!pendingLossOutcome) beginLoss('trainer-roster');
          phase = 'LOSE';
          break;
        }
        case 'WAITING_BAG': {
          // Battle is in this phase while the BAG scene is pushed on top.
          // Once the BAG scene pops, the battle scene's update() runs again.
          if (!waitingForBag) break;
          waitingForBag = false;
          if (bagPendingItem) {
            // An item was selected in the bag
            const itemDef = bagPendingItem;
            clearPendingItem();
            if (itemDef.itemId) {
              useItem(itemDef.itemId);
            } else {
              enterSelectMovePhase();
            }
          } else {
            // No item selected (user pressed Esc in bag)
            enterSelectMovePhase();
          }
          break;
        }
        case 'WAITING_PARTY': {
          // Battle is in this phase while the PARTY scene is pushed on top.
          if (!waitingForParty) break;
          waitingForParty = false;
          if (selectedPartyIndex >= 0 && hasActiveGame()) {
            const pd = getPlayerData();
            const chosenIndex = selectedPartyIndex;
            const chosen = pd.party[chosenIndex];
            clearSelectedPartyIndex();
            // Validate the switch
            if (!chosen || chosen.hp <= 0) {
              textBox = createTextBox([t('battle.pokemonFainted')], isRTL());
              phase = 'INTRO';
            } else if (chosenIndex === activePartyIndex) {
              textBox = createTextBox([t('battle.alreadyActive')], isRTL());
              phase = 'INTRO';
            } else if (!canSwitchTo(chosenIndex)) {
              textBox = createTextBox([t('battle.rosterFull')], isRTL());
              phase = 'INTRO';
            } else {
              const isSoloOpeningSwitch = canUseOpeningSoloSwitch(chosenIndex);
              if (isSoloOpeningSwitch) {
                battleRoster = new Set([chosenIndex]);
                soloOpeningSwitchUsed = true;
              } else {
                battleRoster.add(chosenIndex);
              }
              if (!battleTurnCounts.has(chosenIndex)) battleTurnCounts.set(chosenIndex, 0);
              activePartyIndex = chosenIndex;
              player = pd.party[activePartyIndex];
              playerBattleState = createBattleRuntimeStateForPokemon(player);
              playerHpBar = createHPBar(
                player.id,
                player.level,
                player.hp,
                player.maxHp,
                BTL.PLY_BAR_X,
                BTL.PLY_BAR_BOTTOM - 18,
                true,
                player.xp,
                player.xpToNext,
              );
              setStatus(playerHpBar, player.status ?? '');
              setVolatileStatuses(playerHpBar, [
                ...getDisplayedVolatileStatuses(playerBattleState),
                ...getDisplayedSideStatuses(playerSideState),
              ]);
              menu = createBattleMenu(player.moves);
              menu.playerPokemon = player;
              menu.party = hasActiveGame() ? getPlayerData().party : [player];
              loadImage(`/sprites/pokemon/back/${player.id}.png`).catch(() => {});
              animationDirector.setActorState('player', {
                x: -24,
                y: 8,
                scaleX: 0.6,
                scaleY: 0.6,
                alpha: 0,
                rotation: 0.14,
                visible: false,
              });
              const switchMsgs: string[] = [];
              // Only say "come back" if the previous Pokemon isn't fainted
              const prevPokemon = pd.party.find((p) => p.id === previousLeadId);
              if (prevPokemon && prevPokemon.hp > 0) {
                switchMsgs.push(t('battle.comeBack', { name: getPokemonDisplayName(previousLeadId!) }));
              }
              switchMsgs.push(t('battle.goName', { name: getPokemonDisplayName(player.id) }));
              textBox = createTextBox(switchMsgs, isRTL());
              pendingPlayerSendOutAnimation = true;
              phase = 'SWITCH_POKEMON';
            }
          } else {
            clearSelectedPartyIndex();
            if (player.hp <= 0) {
              // Active Pokemon is fainted — must switch, can't cancel
              setPartyMode('battle');
              clearSelectedPartyIndex();
              waitingForParty = true;
              isForcedFaintSwitch = true;
              stateMachine.push('PARTY');
            } else {
              // No selection (user pressed Esc in party)
              enterSelectMovePhase();
            }
          }
          previousLeadId = null;
          break;
        }
        case 'WAITING_POKEDEX': {
          // Battle is in this phase while the POKEDEX scene is pushed on top.
          // Pokedex does NOT consume a turn — just resume action selection.
          if (!waitingForPokedex) break;
          waitingForPokedex = false;
          enterSelectMovePhase();
          break;
        }
        case 'SWITCH_POKEMON': {
          // Show the switch text, then:
          //   - voluntary switch → enemy gets a turn (they also acted this turn)
          //   - forced faint switch → start a fresh turn (enemy already attacked this turn)
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            if (pendingPlayerSendOutAnimation) {
              startPlayerSendOutAnimation();
            }
          }
          if (!textBox && !animationDirector.isBusy()) {
            // Apply entry hazards to the newly switched-in player Pokemon
            if (pendingPlayerEntryHazard) {
              pendingPlayerEntryHazard = false;
              const hazardResult = applyEntryHazards(player, playerBattleState, playerSideState);
              const hazardMsgs = buildHazardMessages(hazardResult, getPokemonDisplayName(player.id), playerSideState);
              if (hazardMsgs.length > 0) {
                setHP(playerHpBar, player.hp);
                setStatus(playerHpBar, player.status ?? '');
                syncPlayerBar();
                textBox = createTextBox(hazardMsgs, isRTL());
                break;
              }
            }
            if (isForcedFaintSwitch) {
              isForcedFaintSwitch = false;
              enterSelectMovePhase();
            } else {
              enemySelectedMoveIndex = -1;
              enemyTurn();
            }
          }
          break;
        }
        case 'WAITING_MOVE_LEARN': {
          if (!pendingMoveLearningResolution || !pendingMoveLearningPhase) break;
          const resolution = pendingMoveLearningResolution;
          const resumePhase = pendingMoveLearningPhase;
          pendingMoveLearningResolution = null;
          pendingMoveLearningPhase = null;
          refreshPlayerMoveState();
          const followUpText = getMoveLearningResolutionMessage(player.id, resolution);
          if (followUpText) {
            textBox = createTextBox([followUpText], isRTL());
            phase = resumePhase;
          } else if (!showNextLearnedMove(resumePhase)) {
            if (resumePhase === 'TRAINER_NEXT_LEVEL_UP_MOVES') {
              if (startPendingEvolution('TRAINER_NEXT_XP')) break;
              if (player.xp > 0) {
                phase = 'TRAINER_NEXT_XP';
              } else {
                sendOutNextTrainerPokemon();
              }
            } else if (resumePhase === 'TRAINER_REWARD_LEVEL_UP_MOVES') {
              if (startPendingEvolution('TRAINER_REWARD')) break;
              if (player.xp > 0) {
                phase = 'TRAINER_REWARD';
              } else {
                awardTrainerReward();
              }
            } else if (resumePhase === 'LEVEL_UP_MOVES') {
              if (startPendingEvolution('XP_GAIN')) break;
              if (player.xp > 0) {
                phase = 'XP_GAIN';
              } else {
                fade = createFade(false, 0.5);
                phase = 'RUN';
              }
            }
          }
          break;
        }
        case 'USE_ITEM': {
          if (textBox && updateTextBox(textBox, input, dt)) textBox = null;
          if (!textBox && !isHPAnimating(playerHpBar)) enemyTurn();
          break;
        }
        case 'CAPTURE_ANIM': {
          if (!animationDirector.isBusy()) finishCaptureAnimation();
          break;
        }
      }
    },
    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, BTL.COLORS.bg);
      if (shake) applyShake(ctx, shake);
      ctx.imageSmoothingEnabled = false;

      // ── Battle field background (y=0..83) ──
      if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
        ctx.drawImage(bgImage, 0, 0, 240, BTL.FIELD_H);
      } else {
        const bgImg = getBattleBackground();
        if (bgImg.complete && bgImg.naturalWidth > 0) {
          ctx.drawImage(bgImg, 0, 0, 240, BTL.FIELD_H);
        } else {
          // Fallback v2 gradient
          const BG = BTL.BG;
          // Sky gradient
          const skyGrad = ctx.createLinearGradient(0, BG.SKY.y, 0, BG.SKY.y + BG.SKY.h);
          skyGrad.addColorStop(0, BG.SKY.from);
          skyGrad.addColorStop(0.5, BG.SKY.mid);
          skyGrad.addColorStop(1, BG.SKY.to);
          ctx.fillStyle = skyGrad;
          ctx.fillRect(BG.SKY.x, BG.SKY.y, BG.SKY.w, BG.SKY.h);
          // Ground gradient
          const gndGrad = ctx.createLinearGradient(0, BG.GROUND.y, 0, BG.GROUND.y + BG.GROUND.h);
          gndGrad.addColorStop(0, BG.GROUND.from);
          gndGrad.addColorStop(0.4, BG.GROUND.mid1);
          gndGrad.addColorStop(0.7, BG.GROUND.mid2);
          gndGrad.addColorStop(1, BG.GROUND.to);
          ctx.fillStyle = gndGrad;
          ctx.fillRect(BG.GROUND.x, BG.GROUND.y, BG.GROUND.w, BG.GROUND.h);
          // Subtle ground lines
          for (const line of BG.LINES) {
            fillRect(ctx, 0, line.y, 240, 1, `rgba(100,80,50,${line.alpha})`);
          }
        }
      }

      // ── Trainer sprites on sides (trainer battles) ──
      const showingTrainer = showTrainerSprite && isTrainerBattle && trainerData?.trainerSprite;
      if (isTrainerBattle && trainerData?.trainerSprite) {
        const tImg = getCachedImage(`/sprites/trainers/${trainerData.trainerSprite}.png`);
        if (tImg) {
          if (showingTrainer) {
            renderActorImage(ctx, 'trainer', tImg, BTL.OPP_SPRITE.x, 4, 48, 68);
          } else {
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.drawImage(tImg, 222, 28, 16, 32);
            ctx.restore();
          }
        }
      }

      // ── Enemy Pokemon sprite (right side) ──
      if (!showingTrainer) {
        const enemySprite = getCachedImage(`/sprites/pokemon/front/${enemy.id}.png`);
        if (enemySprite) {
          if (enemyBattleState?.substituteActive) ctx.globalAlpha = 0.45;
          renderActorImage(
            ctx,
            'enemy',
            enemySprite,
            BTL.OPP_SPRITE.x,
            BTL.OPP_SPRITE.y,
            BTL.OPP_SPRITE.w,
            BTL.OPP_SPRITE.h,
          );
          ctx.globalAlpha = 1;
        }
      }

      // ── Player Pokemon sprite (left side) ──
      const playerSprite = getCachedImage(`/sprites/pokemon/back/${player.id}.png`);
      if (playerSprite) {
        if (playerBattleState?.substituteActive) ctx.globalAlpha = 0.45;
        renderActorImage(
          ctx,
          'player',
          playerSprite,
          BTL.PLY_SPRITE.x,
          BTL.PLY_SPRITE.y,
          BTL.PLY_SPRITE.w,
          BTL.PLY_SPRITE.h,
        );
        ctx.globalAlpha = 1;
      }

      renderArenaEffects(ctx);
      renderBallActor(ctx);
      if (attackFx) {
        renderAttackEffect(ctx, attackFx);
      }
      for (const effect of statusTurnFx) {
        renderStatusTurnEffect(ctx, effect);
      }

      // ── Info panels ──
      setXP(playerHpBar, player.xp, player.xpToNext);
      const playerParty = hasActiveGame() ? getPlayerData().party : null;
      renderHPBar(
        ctx,
        enemyHpBar,
        isTrainerBattle && trainerData
          ? { party: trainerData.party, totalSlots: trainerData.party.length, revealedCount: trainerPartyIndex }
          : undefined,
      );
      renderHPBar(ctx, playerHpBar, playerParty ? { party: playerParty, totalSlots: 6 } : undefined);

      // ── Effects ──
      if (levelUpFx) renderLevelUpEffect(ctx, levelUpFx);
      if (captureSuccessFx) renderCaptureSuccessEffect(ctx, captureSuccessFx);
      if (sendOutFx) renderSendOutEffect(ctx, sendOutFx);
      if (shake) resetShake(ctx, shake);
      renderPopups(ctx);
      if (flash) renderFlash(ctx, flash);

      // ── Stat gains popup (shown while level-up textBox is visible) ──
      if (statGainsPopup && textBox) {
        renderStatGainsPopup(ctx, statGainsPopup);
      }

      // ── Menu / text area ──
      if (textBox) {
        // Fill lower area background before text box
        fillRect(ctx, 0, BTL.DIVIDER_Y, 240, 160 - BTL.DIVIDER_Y, BTL.COLORS.bg);
        fillRect(ctx, 0, BTL.DIVIDER_Y, 240, 1, BTL.COLORS.divider);
        renderTextBox(ctx, textBox);
      } else if (phase === 'SELECT_ACTION' || phase === 'SELECT_MOVE') {
        renderBattleMenu(ctx, menu);
      }
      if (fade) renderFade(ctx, fade);
    },
  };

  function renderStatGainsPopup(ctx: CanvasRenderingContext2D, gains: StatGains): void {
    const rtl = isRTL();
    const PW = 128;
    const PH = 74;
    const PX = Math.round((240 - PW) / 2);
    const PY = 6;
    const PAD = 5;

    // Background panel
    fillRect(ctx, PX, PY, PW, PH, 'rgba(16,24,32,0.92)');
    // Border
    ctx.save();
    ctx.strokeStyle = '#f8d030';
    ctx.lineWidth = 1;
    ctx.strokeRect(PX + 0.5, PY + 0.5, PW - 1, PH - 1);
    ctx.restore();

    // Title
    drawText(ctx, t('party.baseStats'), PX + PW / 2, PY + PAD, {
      size: 6,
      color: '#f8d030',
      font: 'monospace',
      align: 'center',
    });

    // Stat rows: [label, gain, color]
    const statRows: [string, number, string][] = [
      [t('party.stats.hp'), gains.hp, '#20d860'],
      [t('party.stats.attack'), gains.attack, '#f08030'],
      [t('party.stats.defense'), gains.defense, '#6890f0'],
      [t('party.stats.spAtk'), gains.specialAttack, '#a040a0'],
      [t('party.stats.spDef'), gains.specialDefense, '#f8d030'],
      [t('party.stats.speed'), gains.speed, '#f85888'],
    ];

    const ROW_H = 10;
    const startY = PY + PAD + 8;
    for (let i = 0; i < statRows.length; i++) {
      const [label, gain, color] = statRows[i];
      const rowY = startY + i * ROW_H;
      const gainStr = `+${gain}`;
      if (rtl) {
        // RTL: gain on left, label on right
        drawText(ctx, gainStr, PX + PAD + 16, rowY, { size: 6, color, font: 'monospace', align: 'right' });
        drawText(ctx, label, PX + PW - PAD, rowY, { size: 6, color: '#e8e8e8', font: 'monospace', align: 'right' });
      } else {
        // LTR: label on left, gain on right
        drawText(ctx, label, PX + PAD, rowY, { size: 6, color: '#e8e8e8', font: 'monospace' });
        drawText(ctx, gainStr, PX + PW - PAD, rowY, { size: 6, color, font: 'monospace', align: 'right' });
      }
    }
  }

  function renderActorImage(
    ctx: CanvasRenderingContext2D,
    actor: 'player' | 'enemy' | 'trainer',
    image: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const state = animationDirector.getActorState(actor);
    if (!state.visible || state.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha *= state.alpha;
    ctx.translate(x + w / 2 + state.x, y + h / 2 + state.y);
    ctx.rotate(state.rotation);
    ctx.scale(state.scaleX, state.scaleY);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function renderBallActor(ctx: CanvasRenderingContext2D): void {
    if (!activeBallId) return;

    const state = animationDirector.getActorState('ball');
    if (!state.visible || state.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha *= state.alpha;
    ctx.translate(state.x, state.y);
    ctx.rotate(state.rotation);
    ctx.scale(state.scaleX, state.scaleY);
    drawPokeballIcon(ctx, activeBallId, -7, -7, 14);
    ctx.restore();
  }

  function renderArenaEffects(ctx: CanvasRenderingContext2D): void {
    const now = Date.now() / 1000;

    const screenY = 34;
    const screenH = 50;
    const screenW = 50;

    // Player's side screens (right half of field)
    const playerScreenX = 70;
    if (playerSideState.reflectTurnsRemaining > 0) {
      renderScreenWall(ctx, playerScreenX, screenY, screenW, screenH, '#ff6040', now);
    }
    if (playerSideState.lightScreenTurnsRemaining > 0) {
      renderScreenWall(ctx, playerScreenX, screenY, screenW, screenH, '#40c0ff', now);
    }

    // Enemy's side screens (left of enemy)
    const enemyScreenX = 130;
    if (enemySideState.reflectTurnsRemaining > 0) {
      renderScreenWall(ctx, enemyScreenX, screenY, screenW, screenH, '#ff6040', now);
    }
    if (enemySideState.lightScreenTurnsRemaining > 0) {
      renderScreenWall(ctx, enemyScreenX, screenY, screenW, screenH, '#40c0ff', now);
    }

    // Enemy side hazards
    const enemyHazardX = BTL.OPP_SPRITE.x + BTL.OPP_SPRITE.w / 2;
    const enemyHazardY = BTL.OPP_SPRITE.y + BTL.OPP_SPRITE.h;
    if (enemySideState.stealthRockActive) {
      renderStealthRocks(ctx, enemyHazardX, enemyHazardY, now);
    }
    if (enemySideState.spikesLayers > 0) {
      renderSpikes(ctx, enemyHazardX, enemyHazardY + 4, enemySideState.spikesLayers, '#c8d8a0', now);
    }
    if (enemySideState.toxicSpikesLayers > 0) {
      renderSpikes(ctx, enemyHazardX, enemyHazardY + 4, enemySideState.toxicSpikesLayers, '#c060e0', now);
    }

    // Player side hazards
    const playerHazardX = BTL.PLY_SPRITE.x + BTL.PLY_SPRITE.w / 2;
    const playerHazardY = BTL.PLY_SPRITE.y + BTL.PLY_SPRITE.h;
    if (playerSideState.stealthRockActive) {
      renderStealthRocks(ctx, playerHazardX, playerHazardY, now);
    }
    if (playerSideState.spikesLayers > 0) {
      renderSpikes(ctx, playerHazardX, playerHazardY + 4, playerSideState.spikesLayers, '#c8d8a0', now);
    }
    if (playerSideState.toxicSpikesLayers > 0) {
      renderSpikes(ctx, playerHazardX, playerHazardY + 4, playerSideState.toxicSpikesLayers, '#c060e0', now);
    }

    // Substitute dolls
    if (playerBattleState?.substituteActive) {
      const dollX = BTL.PLY_SPRITE.x + 30;
      const dollY = BTL.PLY_SPRITE.y + 38 + Math.sin(now * 2.5) * 1;
      renderSubstituteDoll(ctx, dollX, dollY);
    }
    if (enemyBattleState?.substituteActive) {
      const dollX = BTL.OPP_SPRITE.x + 16;
      const dollY = BTL.OPP_SPRITE.y + 30 + Math.sin(now * 2.5 + 1) * 1;
      renderSubstituteDoll(ctx, dollX, dollY);
    }

    // Substitute doll flash
    if (substituteDollFlash) {
      const flashT = substituteDollFlash.timer / substituteDollFlash.duration;
      const flashAlpha = (1 - flashT) * 0.8;
      const flashSide = substituteDollFlash.side;
      const flashX = flashSide === 'player' ? BTL.PLY_SPRITE.x + 30 : BTL.OPP_SPRITE.x + 16;
      const flashY = flashSide === 'player' ? BTL.PLY_SPRITE.y + 38 : BTL.OPP_SPRITE.y + 30;
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = substituteDollFlash.color;
      ctx.beginPath();
      ctx.arc(flashX, flashY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function renderSubstituteDoll(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.save();
    ctx.fillStyle = '#e8d8a0';
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#d4b870';
    ctx.fillRect(cx - 2.5, cy - 4, 5, 7);
    ctx.strokeRect(cx - 2.5, cy - 4, 5, 7);
    ctx.strokeStyle = '#c8a860';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 2.5, cy - 2);
    ctx.lineTo(cx - 6, cy + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 2.5, cy - 2);
    ctx.lineTo(cx + 6, cy + 1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 1, cy + 3);
    ctx.lineTo(cx - 2, cy + 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 1, cy + 3);
    ctx.lineTo(cx + 2, cy + 7);
    ctx.stroke();
    ctx.fillStyle = '#5a3a00';
    ctx.beginPath();
    ctx.arc(cx - 1.5, cy - 9, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 1.5, cy - 9, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function renderScreenWall(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    time: number,
  ): void {
    ctx.save();
    const pulse = 0.07 + Math.sin(time * 2.5) * 0.03;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);

    ctx.globalAlpha = pulse * 1.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    const gridSize = 8;
    for (let gx = x; gx < x + w; gx += gridSize) {
      for (let gy = y; gy < y + h; gy += gridSize) {
        ctx.strokeRect(gx, gy, gridSize, gridSize);
      }
    }

    ctx.globalAlpha = pulse * 3;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
    ctx.restore();
  }

  function renderStealthRocks(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number): void {
    ctx.save();
    const rocks = [
      { dx: -8, dy: -3, r: 3 },
      { dx: 4, dy: -1, r: 2.5 },
      { dx: 0, dy: 3, r: 2 },
    ];
    for (let i = 0; i < rocks.length; i++) {
      const rock = rocks[i];
      const bobY = Math.sin(time * 1.5 + i * 1.2) * 1;
      const rx = cx + rock.dx;
      const ry = cy + rock.dy + bobY;
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#888080';
      ctx.beginPath();
      ctx.ellipse(rx, ry, rock.r * 1.2, rock.r * 0.8, 0.3 + i * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#c0a880';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function renderSpikes(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    count: number,
    color: string,
    _time: number,
  ): void {
    ctx.save();
    const spacing = 7;
    const startX = cx - ((count - 1) * spacing) / 2;
    for (let i = 0; i < count; i++) {
      const sx = startX + i * spacing;
      const sy = cy;
      const sh = 6;
      const sw = 3;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(sx, sy - sh);
      ctx.lineTo(sx - sw, sy + sh * 0.3);
      ctx.lineTo(sx + sw, sy + sh * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function fallbackPlayer(): Pokemon {
  const data = getPokemon(1); // Bulbasaur
  return data ? createPokemonFromData(data, 5) : createPokemonFromData(getPokemon(1)!, 5);
}

function fallbackEnemy(): Pokemon {
  const data = getPokemon(16); // Pidgey
  return data ? createPokemonFromData(data, 3) : createPokemonFromData(getPokemon(16)!, 3);
}
