/**
 * BattleScene - Turn-based battle with math challenges, type effectiveness, and XP.
 */

import type { Scene, Pokemon, PokemonType, Move } from '../../types/index.js';
import { GLITCH_DAMAGE_BONUS_MIN, GLITCH_DAMAGE_BONUS_MAX } from '../../engine/config.js';
import type { BattleStatId, MoveBattleEffectId, WeatherConditionId } from '../../types/battle-metadata.js';
import { getMapWeather, isDaytime, renderNightOverlay } from '../../systems/weather-system.js';
import { getCurrentMapId, getCachedMap } from '../../systems/map-manager.js';
import type { InputManager } from '../../engine/input';
import type { StateMachine } from '../../engine/state-machine.js';
import type { AudioManager } from '../../audio/audio-manager.js';
import { clearScreen, fillRect, drawText } from '../../engine/renderer.js';
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
} from '../../ui/hp-bar.js';
import {
  createBattleMenu,
  showMainMenu,
  showMoveMenu,
  updateBattleMenu,
  renderBattleMenu,
} from '../../ui/battle-menu.js';
import type { MainMenuChoice } from '../../ui/battle-menu.js';
import { resolveBattleBackgroundPath, type BattleBackgroundId } from '../../data/battle-backgrounds.js';
import { BTL } from '../../data/battle-constants.js';
import { createTextBox, updateTextBox, renderTextBox } from '../../ui/text-box.js';
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
  renderWeatherOverlay,
} from '../../ui/battle-animations';
import {
  createBattleAnimationDirector,
  callStep,
  parallelStep,
  sequenceStep,
  tweenActorStep,
  waitStep,
} from '../../ui/battle-animation-director.js';
import { drawPokeballIcon } from '../../ui/item-icons.js';
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
  computePokemonSize,
  getAllMoves,
  type EvolutionStep,
} from '../../services/pokemon-data.js';
import {
  createPokemonFromData,
  calculateXpGain,
  checkAndApplyLevelUp,
  type StatGains,
} from '../../systems/encounter.js';
import {
  activateSwitchingOutAbilities,
  calcAbilityDamageTakenMultiplier,
  getDefenderAbilityActivationMsg,
} from '../../systems/ability-processor.js';
import { sendCaughtToBox } from '../../systems/pc-storage.js';
import { recordTrainerDefeat } from '../../systems/reencounter.js';
import { getPlayerData, hasActiveGame, autoSave, setFlag } from '../../systems/game-state.js';
import { loadImage, getCachedImage } from '../../engine/sprite-loader.js';
import { getBattleBackground } from '.././../engine/asset-generator.js';
import { t, isRTL, getLocale } from '../../i18n/i18n.js';
import { applyHeldItemEffectInBattle, getItem } from '../../data/items.js';
import { applyItemEffect, consumeItem } from '../../systems/item-effects.js';
import { resolveDialogue, type TrainerReward, type BilingualText, type ReencounterConfig } from '../../systems/npc.js';
import { setBagMode, pendingItem as bagPendingItem, clearPendingItem } from '../../scenes/bag.js';
import { selectedPartyIndex, clearSelectedPartyIndex } from '.././party';
import { setEvolutionData } from '.././evolution.js';
import {
  calcHappiness,
  getReturnPower,
  getFrustrationPower,
  getHappinessCritBonus,
  RETURN_MOVE_ID,
  FRUSTRATION_MOVE_ID,
} from '../../systems/happiness.js';
import { getAttackAnimationProfile } from '../../systems/move-animation.js';
import { fireStoryTrigger } from '../../systems/story-engine.js';
import {
  createMoveLearningSession,
  getMoveLearningAnnouncementLines,
  getMoveLearningResolutionMessage,
  type LevelUpMoveResult,
  type MoveLearningResolution,
} from '../../systems/move-learning.js';
import { calculateCaptureChance } from '../../systems/capture.js';
import type {
  BattlePokemonRuntimeState,
  BattleSideRuntimeState,
  BattleStatModifiers,
  WeatherState,
} from '../../systems/battle-state.js';
import {
  BATTLE_STAT_PERCENT_STEP,
  applyBattleStatDelta,
  createBattleSideRuntimeState,
  createEmptyBattleStatModifiers,
} from '../../systems/battle-state.js';
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
  SLEEP_USABLE_MOVE_IDS,
  rollCriticalHit,
  startChargingMove,
  tryApplyFlinch,
  applyRestEffect,
  applyHealPercent,
  applyEntryHazards,
  clearEntryHazards,
  clearScreens,
  getWeightTargetPower,
  getWeightRatioPower,
  applyWeatherDamage,
  type EntryHazardResult,
  applyGhostCurseEffect,
} from '../../systems/battle-system.js';
import charactersManifest from '../../data/sprites/characters.json';

// TRAINER_CINEMATIC phase imports
import { createCinematicState, type CinematicState } from './phases/trainer_cinematic';
import { renderTrainerCinematic } from './phases/trainer_cinematic';
import { updateTrainerCinematic } from './phases/trainer_cinematic';
import { playAttackAnimation, type BattleAnimationContext } from './animations/play-attack-animation.js';
import { runMoveLifecycle } from './animations/move-lifecycle.js';
import { createPartyReactScene } from '../../scenesReact/party/index.js';
import { createPokedexReactScene } from '../../scenesReact/pokedex/index.js';
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
  justSwitchedIn: boolean;
  seenPokemonIds: Set<string>;
}

/** Randomness factors per AI level: higher = more random suboptimal picks. */
const AI_RANDOMNESS: [number, number, number, number, number] = [0.45, 0.35, 0.25, 0.15, 0.06];

// Moves excluded from Metronome's random pool (recursive/special selection moves)
const METRONOME_EXCLUDED_MOVE_IDS = new Set([118, 119, 214, 274, 383]); // Metronome, Mirror Move, Sleep Talk, Assist, Copycat

// Moves excluded from Assist's random pool
const ASSIST_EXCLUDED_MOVE_IDS = new Set([118, 119, 214, 274, 383]); // same exclusion list

function getCharacterRoles(spriteType: string): string[] {
  const chars = (charactersManifest as any).characters as Record<string, { roles?: string[] }>;
  return chars[spriteType]?.roles ?? [];
}

function computeAiLevel(spriteType: string, explicit?: AiLevel): AiLevel {
  if (explicit) return explicit;
  const roles = getCharacterRoles(spriteType);

  if (roles.includes('elite-4') || roles.includes('champion')) return 5;
  if (roles.includes('gym-leader') || roles.includes('league3')) return Math.random() < 0.5 ? 4 : 5;
  if (roles.includes('story') || roles.includes('rival') || roles.includes('league2')) {
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
    return ['max-potion', 'max-potion', 'full-restore', 'full-heal', 'full-heal', 'x-defense', 'x-sp-def'];
  if (level >= 4) return ['hyper-potion', 'full-heal', 'x-attack', 'x-defense'];
  return [];
}

function addHeldItemsToAiParty(party: Pokemon[], level: AiLevel) {
  if (level < 2) return;
  const itemsToUse = [
    // special
    'life-orb',
    'leftovers',
    'wide-lens',
    // type-boosting
    'soft-sand',
    'hard-stone',
    'miracle-seed',
    'black-glasses',
    'black-belt',
    'magnet',
    'mystic-water',
    'sharp-beak',
    'poison-barb',
    'never-melt-ice',
    'spell-tag',
    'twisted-spoon',
    'charcoal',
    'dragon-fang',
    'silk-scarf',
  ];

  const itemsData = itemsToUse.map((slug) => getItem(slug));
  let maxLeftoversAssigned = level; //
  let maxZoomLensAssigned = level - 2; //
  let maxLifeOrb = Math.floor(level / 2); //

  function getDominantMoveType(pokemon: Pokemon) {
    const typeCounts: Record<string, number> = {};
    pokemon.moves
      .map((m) => getMove(m.id))
      .filter((m) => m?.power && m.power > 0)
      .forEach((m) => {
        if (!m) return;
        typeCounts[m.type] = (typeCounts[m.type] ?? 0) + 1;
      });

    if (Object.keys(typeCounts).length === 0) return null;

    return Object.entries(typeCounts).reduce((best, [type, count]) => (count > best[1] ? [type, count] : best));
  }

  party.forEach((p) => {
    if (p.heldItemId) return; // don't overwrite existing held items
    const dominantMoveType = getDominantMoveType(p);
    const typeBoostItem = itemsData.find(
      (i) =>
        i?.effect.type === 'battle' &&
        dominantMoveType &&
        dominantMoveType[1] >= 2 &&
        dominantMoveType[0] === i.effect.config.moveTypeBoost?.moveType,
    );

    if (typeBoostItem) {
      p.heldItemId = typeBoostItem.id;
    } else if (maxLeftoversAssigned > 0) {
      p.heldItemId = 'leftovers';
      maxLeftoversAssigned--;
    } else if (maxZoomLensAssigned > 0) {
      p.heldItemId = 'zoom-lens';
      maxZoomLensAssigned--;
    } else if (maxLifeOrb > 0) {
      p.heldItemId = 'life-orb';
      maxLifeOrb--;
    }
  });
}

const STRUGGLE_MOVE: Move = {
  accuracy: 100,
  power: 50,
  pp: 9999,
  type: 'struggle',
  currentPp: 9999,
  name: 'Struggle',
  id: -1,
};

export type BattlePhase =
  | 'TRAINER_CINEMATIC'
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
  postBattleDialogue?: BilingualText[]; // Dialogue shown after defeat
  postFlagDialogue?: { flag?: string; dialogue: BilingualText[] }; // Shown immediately after first defeat (flag just set)
  reencounterIndex?: number; // 0 = first fight, 1+ = rematch (items skipped on rematch)
  reencounter?: ReencounterConfig; // true if trainer has re-encounter config (for phone registration)
  locationEn?: string; // trainer location for phone display
  locationHe?: string;
  aiLevel?: 1 | 2 | 3 | 4 | 5;
  bagItems?: string[];
  trainerSpriteType?: string; // used to auto-compute AI level from role
  /** Wild Pokémon NPC battle — no trainer intro, catches allowed, flee possible. */
  isWildNpc?: boolean;
  fleeAfterTurns?: number;
  fleeAtHpPct?: number;
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

  //private case of  applyHeldItemEffectInBattle
  const atkHeldItem = atkState.heldItem ?? null;

  if (atkHeldItem?.effect.config.moveTypeBoost) {
    const moveTypeBoost = atkHeldItem.effect.config.moveTypeBoost;
    if (moveTypeBoost.moveType === moveType || moveTypeBoost.moveType === 'all') {
      power = Math.floor(power * moveTypeBoost.boost);
    }
  }

  const isSpecial = damageClass === 'special';
  const burnMultiplier = damageClass === 'physical' && atk.status === 'burn' ? 0.5 : 1;
  const attackStat = attackStatOverride ?? getModifiedStatValue(atk, atkState, isSpecial ? 'specialAttack' : 'attack');
  const defenseStat = getModifiedStatValue(def, defState, isSpecial ? 'specialDefense' : 'defense');
  let defenderMultiplier = 1;
  if (def.abilityId !== null) {
    defenderMultiplier *= calcAbilityDamageTakenMultiplier(def, getAbilityBattleEffects(def.abilityId), moveType);
  }
  defenderMultiplier *= getSideDamageTakenMultiplier(defSideState, damageClass);
  const lf = (2 * atk.level) / 5 + 2;
  const base = (lf * power * ((attackStat * burnMultiplier) / defenseStat)) / 50 + 2;
  const eff = getCombinedTypeEffectiveness(moveType, def.types);
  if (eff === 0) return 0;
  const stab = atk.types.includes(moveType) ? 1.5 : 1;
  const critMultiplier = criticalHit ? 1.5 : 1;
  const rand = 0.7 + Math.random() * 0.3;
  let damage = Math.max(1, Math.floor(base * eff * stab * critMultiplier * defenderMultiplier * rand));
  if (atk.isGlitched)
    damage = Math.ceil(
      damage * (1 + GLITCH_DAMAGE_BONUS_MIN + Math.random() * (GLITCH_DAMAGE_BONUS_MAX - GLITCH_DAMAGE_BONUS_MIN)),
    );
  if (def.isGlitched)
    damage = Math.floor(
      damage * (1 - (GLITCH_DAMAGE_BONUS_MIN + Math.random() * (GLITCH_DAMAGE_BONUS_MAX - GLITCH_DAMAGE_BONUS_MIN))),
    );
  return Math.max(1, damage);
}

function effText(mt: PokemonType, dt: PokemonType[]): string | null {
  const e = getCombinedTypeEffectiveness(mt, dt);
  if (e >= 2) return t('battle.superEffective');
  if (e > 0 && e < 1) return t('battle.notVeryEffective');
  if (e === 0) return t('battle.noEffect');
  return null;
}

function getWeatherPowerMultiplier(moveType: PokemonType, weatherType: WeatherConditionId): number {
  if (weatherType === 'rain') {
    if (moveType === 'water' || moveType === 'electric') return 1.25;
    if (moveType === 'fire') return 0.75;
  } else if (weatherType === 'sun') {
    if (moveType === 'fire' || moveType === 'grass') return 1.25;
    if (moveType === 'water' || moveType === 'steel' || moveType === 'ice') return 0.75;
  } else if (weatherType === 'sandstorm') {
    if (moveType === 'water' || moveType === 'fire') return 0.75;
  } else if (weatherType === 'hail') {
    if (moveType === 'ice') return 1.25;
  }
  return 1;
}

function getWeatherAccuracyOverride(moveId: number, weatherType: WeatherConditionId): number | null {
  if (weatherType === 'rain' && (moveId === 87 || moveId === 542)) return 0; // Thunder, Hurricane
  if (weatherType === 'hail' && moveId === 59) return 0; // Blizzard
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

function getMoveEffectAppliedLine(name: string, effectId: MoveBattleEffectId): string {
  switch (effectId) {
    case 'confusion':
      return t('battle.confused', { name });
    case 'leech-seed':
      return t('battle.leechSeeded', { name });
    case 'trap':
      return t('battle.trapped', { name });
    case 'curse':
      return t('battle.cursed', { name });
    default:
      return '';
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
  let cinematicState: CinematicState | null = null;

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
  let lastMoveUsedInBattle: number | null = null; // for Copycat
  let trainerPartyIndex = 0;
  let isWildNpcBattle = false;
  let wildNpcFleeAfterTurns: number | null = null;
  let wildNpcFleeAtHpPct: number | null = null;
  let pendingWildNpcEntrance = false;
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
  let battleWeather: WeatherState | null = null;
  let mapWeatherBase: WeatherConditionId | null = null;
  let battleIsOutdoor = false;
  const animationDirector = createBattleAnimationDirector();

  const battleAnimationContext: BattleAnimationContext = {
    // --- Reactive UI and Visual States (Getters + Setters) ---
    get attackFx() {
      return attackFx;
    },
    set attackFx(v) {
      attackFx = v;
    },
    get flash() {
      return flash;
    },
    set flash(v) {
      flash = v;
    },
    get shake() {
      return shake;
    },
    set shake(v) {
      shake = v;
    },
    get textBox() {
      return textBox;
    },
    set textBox(v) {
      textBox = v;
    },
    get phase() {
      return phase;
    },
    set phase(v) {
      phase = v;
    },
    get phaseTimer() {
      return phaseTimer;
    },
    set phaseTimer(v) {
      phaseTimer = v;
    },

    // --- Live Dynamic Game Core Data (Getters) ---
    get player() {
      return player;
    },
    get enemy() {
      return enemy;
    },
    get playerBattleState() {
      return playerBattleState;
    },
    get enemyBattleState() {
      return enemyBattleState;
    },
    get playerHpBar() {
      return playerHpBar;
    },
    get enemyHpBar() {
      return enemyHpBar;
    },

    // --- Core Infrastructure Engines ---
    animationDirector,
    audio,
    rtl: isRTL(),
  };

  function getWeatherStartedLine(weatherType: WeatherConditionId): string {
    switch (weatherType) {
      case 'sandstorm':
        return t('battle.sandstormStarted');
      case 'rain':
        return t('battle.rainStarted');
      case 'sun':
        return t('battle.sunStarted');
      case 'hail':
        return t('battle.hailStarted');
    }
  }

  function getWeatherEndedLine(weatherType: WeatherConditionId): string {
    switch (weatherType) {
      case 'sandstorm':
        return t('battle.sandstormEnded');
      case 'rain':
        return t('battle.rainEnded');
      case 'sun':
        return t('battle.sunEnded');
      case 'hail':
        return t('battle.hailEnded');
    }
  }

  function getWeatherDisplayName(weatherType: WeatherConditionId): string {
    const keyMap: Record<WeatherConditionId, string> = {
      sandstorm: 'battle.weatherName.sandstorm',
      rain: 'battle.weatherName.rain',
      sun: 'battle.weatherName.sun',
      hail: 'battle.weatherName.hail',
    };
    return t(keyMap[weatherType]);
  }

  const WEATHER_BOOST_TYPES: Record<WeatherConditionId, PokemonType[]> = {
    sandstorm: ['ground', 'rock'],
    rain: ['grass', 'water'],
    hail: ['ice'],
    sun: ['fire'],
  };

  const WEATHER_BOOSTED_STATS: Record<WeatherConditionId, BattleStatId[]> = {
    sandstorm: ['evasion', 'specialDefense', 'speed'],
    hail: ['defense', 'specialDefense'],
    sun: ['specialAttack', 'speed'],
    rain: ['speed', 'specialDefense'],
  };

  function applyWeatherStatBoost(
    state: BattlePokemonRuntimeState,
    pokemon: Pokemon,
    weatherType: WeatherConditionId,
  ): void {
    const matchingTypes = WEATHER_BOOST_TYPES[weatherType];
    if (!pokemon.types.some((t) => matchingTypes.includes(t))) return;
    for (const stat of WEATHER_BOOSTED_STATS[weatherType]) {
      state.statModifiers[stat] = applyBattleStatDelta(state.statModifiers[stat], 1);
    }
    state.hasWeatherStatBoost = true;
  }

  function revertWeatherStatBoost(state: BattlePokemonRuntimeState): void {
    if (!state.hasWeatherStatBoost) return;
    state.statModifiers = createEmptyBattleStatModifiers();
    state.hasWeatherStatBoost = false;
  }

  function activateWeather(
    newWeatherType: WeatherConditionId,
    setter: 'player' | 'enemy',
    turnsOverride?: number,
  ): string[] {
    revertWeatherStatBoost(playerBattleState);
    revertWeatherStatBoost(enemyBattleState);
    const turns = turnsOverride ?? Math.floor(Math.random() * 5) + 2;
    battleWeather = { type: newWeatherType, turnsRemaining: turns, setter };
    if (menu) menu.activeWeather = newWeatherType;
    applyWeatherStatBoost(playerBattleState, player, newWeatherType);
    applyWeatherStatBoost(enemyBattleState, enemy, newWeatherType);
    const msgs: string[] = [];
    if (playerBattleState.hasWeatherStatBoost) {
      msgs.push(t('battle.weatherStatBoost', { name: getPokemonDisplayName(player.id) }));
    }
    if (enemyBattleState.hasWeatherStatBoost) {
      msgs.push(t('battle.weatherStatBoost', { name: getPokemonDisplayName(enemy.id) }));
    }
    return msgs;
  }

  function applyWeatherEntryBoost(state: BattlePokemonRuntimeState, pokemon: Pokemon): string[] {
    if (!battleWeather || state.hasWeatherStatBoost) return [];
    applyWeatherStatBoost(state, pokemon, battleWeather.type);
    if (state.hasWeatherStatBoost) {
      return [t('battle.weatherStatBoost', { name: getPokemonDisplayName(pokemon.id) })];
    }
    return [];
  }

  function checkWeatherSummonAbility(pokemon: Pokemon, side: 'player' | 'enemy'): string[] {
    const msgs: string[] = [];
    if (!pokemon.abilityId) return msgs;
    const effects = getAbilityBattleEffects(pokemon.abilityId);
    const summonEffect = effects.find((e) => e.kind === 'weatherSummon') as
      | { kind: 'weatherSummon'; weather: WeatherConditionId }
      | undefined;
    if (!summonEffect) return msgs;
    const pokemonName = getPokemonDisplayName(pokemon.id);
    // Refresh if same weather already active
    if (battleWeather?.type === summonEffect.weather) {
      battleWeather.turnsRemaining = 5;
      return msgs;
    }
    const prevWeatherType = battleWeather?.type ?? null;
    if (prevWeatherType) {
      msgs.push(
        t('battle.weatherOverride', {
          new: getWeatherDisplayName(summonEffect.weather),
          old: getWeatherDisplayName(prevWeatherType),
        }),
      );
    }
    const boostMsgs = activateWeather(summonEffect.weather, side, 5);
    const keyMap: Record<WeatherConditionId, string> = {
      sandstorm: 'battle.sandStreamSummon',
      rain: 'battle.drizzleSummon',
      sun: 'battle.droughtSummon',
      hail: 'battle.snowWarningSummon',
    };
    msgs.push(t(keyMap[summonEffect.weather], { name: pokemonName }));
    msgs.push(...boostMsgs);
    return msgs;
  }

  function checkSwitchInStatAbility(
    entering: Pokemon,
    enteringState: BattlePokemonRuntimeState,
    opponent: Pokemon,
    opponentState: BattlePokemonRuntimeState,
  ): string[] {
    const msgs: string[] = [];
    if (!entering.abilityId) return msgs;
    const enteringName = getPokemonDisplayName(entering.id);
    for (const effect of getAbilityBattleEffects(entering.abilityId)) {
      if (effect.kind !== 'onSwitchInStatChange') continue;
      const isOpponent = effect.target === 'opponent';
      const targetState = isOpponent ? opponentState : enteringState;
      const targetName = getPokemonDisplayName(isOpponent ? opponent.id : entering.id);
      const current = targetState.statModifiers[effect.stat];
      const next = applyBattleStatDelta(current, effect.stages);
      if (next === current) continue;
      targetState.statModifiers[effect.stat] = next;
      if (effect.messageKey) {
        msgs.push(t(effect.messageKey, { attacker: enteringName, target: targetName }));
      }
      const stat = getBattleStatLabel(effect.stat);
      const sharply = Math.abs(effect.stages) >= 2;
      msgs.push(
        effect.stages > 0
          ? t(sharply ? 'battle.statRoseSharply' : 'battle.statRose', { name: targetName, stat })
          : t(sharply ? 'battle.statFellHarshly' : 'battle.statFell', { name: targetName, stat }),
      );
    }
    return msgs;
  }

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
      if (isTrainerBattle && !isWildNpcBattle) {
        textBox = createTextBox([t('battle.cantCatchTrainer')], isRTL());
        phase = 'USE_ITEM';
        phaseTimer = 0;
        return;
      }
      if (enemy.isGlitched) {
        textBox = createTextBox([t('battle.glitchedCantCatch')], isRTL());
        phase = 'USE_ITEM';
        phaseTimer = 0;
        return;
      }
      consumeItem(pd.items, itemId);
      const random = Math.random();
      const calcScore = getCaptureChance(def.effect.rate);
      startCaptureSequence(itemId, random < calcScore);
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

  function calculateAIPokemonScore(candidate: Pokemon): number {
    let score = 0;

    for (const pType of player.types) {
      const eff = getCombinedTypeEffectiveness(pType as any, candidate.types as any);
      if (eff < 1) score += 200;
      else if (eff > 1) score -= 100;
    }
    for (const cType of candidate.types) {
      const eff = getCombinedTypeEffectiveness(cType as any, player.types as any);
      if (eff > 1) score += 150;
    }

    score += (candidate.hp / candidate.maxHp) * 50;

    const candidateIsFaster = (candidate.speed ?? 0) > (player.speed ?? 0);
    const hasSuperEffectiveMove = candidate.moves?.some(
      (move) => getCombinedTypeEffectiveness(move.type as any, player.types as any) > 1,
    );

    if (candidateIsFaster && (hasSuperEffectiveMove || player.hp / player.maxHp < 0.3)) score += 100;
    else if (!candidateIsFaster && hasSuperEffectiveMove && enemy.hp / enemy.maxHp > 0.5) score += 30;
    else if (!candidateIsFaster && !hasSuperEffectiveMove) score -= 50;

    return score;
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
      const score = calculateAIPokemonScore(candidate);
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
    trainerAIState!.justSwitchedIn = true;
    trainerAIState!.seenPokemonIds.add(enemy.uuid);

    enemyBattleState = createBattleRuntimeStateForPokemon(enemy);
    enemySelectedMoveIndex = -1;
    // Update enemy types for battle helper display
    if (menu) menu.enemyTypes = (enemy.types ?? []) as import('../../types/index.js').PokemonType[];
    enemyAlreadyAttacked = false;
    enemyHpBar = createHPBar(enemy.id, enemy.level, enemy.hp, enemy.maxHp, BTL.OPP_BAR.x, BTL.OPP_BAR.y, false);
    setStatus(enemyHpBar, enemy.status ?? '');
    setVolatileStatuses(enemyHpBar, [
      ...getDisplayedVolatileStatuses(enemyBattleState),
      ...getDisplayedSideStatuses(enemySideState),
    ]);
    loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
    if (hasActiveGame()) {
      const pd = getPlayerData();
      if (!pd.pokedex[enemy.id]) {
        pd.pokedex[enemy.id] = 'seen';
      }
    }
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
          setFlag(pd, `story-badge-${reward.badge}`);
          audio.playBadgeEarned();
          fireStoryTrigger({ type: 'badge-earned', badge: reward.badge });
        }
        if (reward.storyEvent) {
          setFlag(pd, reward.storyEvent);
        }
        setFlag(pd, `trainer-${td.trainerId}-defeated`);
        fireStoryTrigger({ type: 'trainer-defeated', trainerId: td.trainerId });
      } else if (reward.storyEvent) {
        // rare-case , basicly design for leauge -> we clear the story event but we can let rematcher set flag again for reapet leauge
        setFlag(pd, reward.storyEvent);
      }
      // Always record the defeat for re-encounter tracking
      recordTrainerDefeat(td.trainerId);
      // Register phone contact on first defeat if trainer supports re-encounters
      if (!isRematch && td.reencounter?.addToPhone) {
        if (!pd.phoneContacts.some((c) => c.npcId === td.trainerId)) {
          pd.phoneContacts.push({
            npcId: td.trainerId,
            mapId: getCurrentMapId() || '',
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
    // Append postFlagDialogue immediately on first defeat (flag was just set above)
    if (!isRematch && td.postFlagDialogue && td.postFlagDialogue.dialogue.length > 0) {
      lines.push(...resolveDialogue(td.postFlagDialogue.dialogue, getLocale()));
    }

    textBox = createTextBox(lines, isRTL());
    phase = 'XP_GAIN';
    trainerData = null;
  }

  function init(): void {
    isTrainerBattle = false;
    isWildNpcBattle = false;
    wildNpcFleeAfterTurns = null;
    wildNpcFleeAtHpPct = null;
    pendingWildNpcEntrance = false;
    trainerData = null;
    trainerPartyIndex = 0;
    showTrainerSprite = false;

    if (pendingTrainerBattle) {
      isTrainerBattle = true;
      trainerData = pendingTrainerBattle;
      trainerPartyIndex = 0;
      isWildNpcBattle = pendingTrainerBattle.isWildNpc ?? false;
      wildNpcFleeAfterTurns = pendingTrainerBattle.fleeAfterTurns ?? null;
      wildNpcFleeAtHpPct = pendingTrainerBattle.fleeAtHpPct ?? null;
      showTrainerSprite = !isWildNpcBattle; // No trainer intro for wild NPC
      pendingTrainerBattle = null;
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
    menu.enemyTypes = (enemy.types ?? []) as import('../../types/index.js').PokemonType[];
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
    mapWeatherBase = null;
    battleIsOutdoor = false;
    const _mapId = getCurrentMapId();
    if (_mapId) {
      const _mapData = getCachedMap(_mapId);
      if (_mapData?.outside != null) {
        battleIsOutdoor = true;
        if (typeof _mapData.outside === 'object') {
          mapWeatherBase = getMapWeather(_mapId, _mapData.outside);
        }
      }
    }
    battleWeather = mapWeatherBase ? { type: mapWeatherBase, turnsRemaining: Infinity, setter: null } : null;
    if (menu) menu.activeWeather = mapWeatherBase ?? null;
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
    // Wild NPC: player uses full 6-slot roster (behaves like wild encounter)
    maxRosterSize = isTrainerBattle && !isWildNpcBattle && trainerData ? trainerData.party.length : 6;
    activeBallId = null;
    pendingCaptureOutcome = null;
    // Wild NPC: skip Pokeball-throw animation, use scale-up entrance instead
    pendingEnemySendOutAnimation = isTrainerBattle && !isWildNpcBattle;
    pendingWildNpcEntrance = isWildNpcBattle;
    pendingPlayerSendOutAnimation = true;
    pendingPlayerEntryHazard = false;
    // Trainer/wildNPC battles: animation callback sets this. Regular wild encounters: enemy is
    // already on field, so entry effects (weather boost, ability summon) must fire immediately.
    pendingEnemyEntryHazard = !isTrainerBattle;
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
            justSwitchedIn: false,
            seenPokemonIds: new Set([trainerData.party[0].uuid]),
          }
        : null;

    if (isTrainerBattle && trainerData) {
      addHeldItemsToAiParty(trainerData.party, trainerAIState?.level ?? 3);
    }

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
    if (chargingMoveId !== null) return findMoveIndexById(player, chargingMoveId);
    if (playerBattleState.lockedInMoveId !== null) {
      return findMoveIndexById(player, playerBattleState.lockedInMoveId);
    }
    return null;
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
    // Prefer the defensive boost that counters the player's dominant attack type
    const playerIsPhysical = player.attack > player.specialAttack * 1.1;
    const defPreferred = playerIsPhysical ? 'x-defense' : 'x-sp-def';
    const defAlternate = playerIsPhysical ? 'x-sp-def' : 'x-defense';
    for (const id of [preferred, defPreferred, defAlternate, 'x-speed']) {
      if (bagItems.includes(id)) return id;
    }
    return null;
  }

  function countPlayerAliveParty(): number {
    if (!hasActiveGame()) return 1;
    return getPlayerData().party.filter((p) => p.hp > 0).length;
  }

  /** Estimate the best damage the player can deal to the current enemy this turn. */
  function estimatePlayerBestDamageToEnemy(): number {
    let best = 0;
    for (const pm of player.moves) {
      if (pm.currentPp <= 0 || pm.power <= 0) continue;
      const moveFullData = getMove(pm.id);
      const battleData = getMoveBattleData(pm.id);

      const isOhkoMove = battleData?.behaviorTags?.includes('ohko');
      const isCharging = battleData?.behaviorTags?.includes('requires-charge-turn') ?? false;
      const isFutureSight = battleData?.behaviorTags?.includes('future-sight') ?? false;
      const hasTurns = battleData?.minTurns && battleData?.minTurns > 1;

      if (isOhkoMove || isCharging || hasTurns || isFutureSight) continue;

      const base = calcDamage(
        player,
        playerBattleState,
        enemy,
        enemyBattleState,
        enemySideState,
        pm.power,
        pm.type,
        moveFullData?.damageClass ?? 'physical',
        false,
      );

      best = Math.max(best, base);
    }
    if (best === 0) {
      const atk = Math.max(player.attack, player.specialAttack);
      const def = player.attack >= player.specialAttack ? enemy.defense : enemy.specialDefense;
      best = (((2 * player.level) / 5 + 2) * 80 * atk) / def / 50 + 2;
    }
    return best;
  }

  /**
   * Returns true when using a stat-boost item makes strategic sense.
   * Checks: player status, incoming damage pressure, type/level advantage.
   */
  function shouldUseBoostItem(): boolean {
    const enemyHpRatio = enemy.hp / enemy.maxHp;

    const playerStatus = playerBattleState.majorStatus;

    // Player can't attack — perfect window to boost
    if (playerStatus === 'sleep' || playerStatus === 'freeze') return true;

    // Don't boost when almost fainted — we won't survive long enough to benefit
    if (enemyHpRatio < 0.85) return false;

    // Paralyzed player: boost if there are more matchups ahead (extended battle)
    if (playerStatus === 'paralyze') {
      const playerRemaining = countPlayerAliveParty();
      return playerRemaining > 1;
    }

    // Burned physical attacker: their main damage is halved — safe to boost
    if (playerStatus === 'burn' && player.attack > player.specialAttack * 1.1 && player.level > enemy.level * 0.9)
      return true;

    // If player deals heavy damage, we risk being KO'd before the boost pays off
    const estIncoming = estimatePlayerBestDamageToEnemy();
    if (estIncoming >= enemy.hp * 0.65 && enemy.hp < enemy.maxHp * 0.85) return false;

    // Boost when AI has type advantage AND level parity — we can afford the setup turn
    const hasTypeAdv = enemy.types.some(
      (t) =>
        getCombinedTypeEffectiveness(
          t as import('../../types/index.js').PokemonType,
          player.types as import('../../types/index.js').PokemonType[],
        ) > 1,
    );
    return hasTypeAdv && enemy.level >= player.level;
  }

  function checkTrainerItemUse(): { itemId: string; itemName: string } | null {
    const ai = trainerAIState;
    if (!ai || ai.level < 4) return null;
    if (isWildNpcBattle && !enemy.isGlitched) return null;
    const remaining = trainerData ? trainerData.party.filter((_, i) => i >= trainerPartyIndex).length : 0;
    if (ai.level >= 4 && remaining > 3) return null;

    const idx = trainerPartyIndex;
    const usedByThis = ai.itemsUsedByPartyIdx.get(idx) ?? new Set<string>();
    // Use explicit bag items if provided, otherwise use level-based defaults
    const bag = trainerData?.bagItems?.length ? trainerData.bagItems : getDefaultBagItems(ai.level);
    if (!bag.length) return null;

    const def = (id: string) => {
      const d = getItem(id);
      return d ? getLocalizedName(d.name) : id;
    };

    // Priority 1: stat boost — only when strategically sound (not when HP low, player is dominating, etc.)
    if (!usedByThis.has('boost') && shouldUseBoostItem()) {
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
    if (ai.justSwitchedIn) return null; // 👈 no switching turn you came in

    // Only switch when player has type advantage
    let playerHasAdvantage = false;
    for (const pType of player.types) {
      if (getCombinedTypeEffectiveness(pType as any, enemy.types as any) > 1) {
        playerHasAdvantage = true;
        break;
      }
    }
    if (!playerHasAdvantage) return null;

    // Don't switch away if current has net positive stat boosts
    const statSum = Object.values(enemyBattleState.statModifiers).reduce((a, b) => a + b, 0);
    if (statSum > 0) return null;

    // Don't switch away if current HP is low and enemy is slower (stay and finish)
    const enemyIsFaster = (enemy.speed ?? 0) > (player.speed ?? 0);
    if (enemy.hp / enemy.maxHp < 0.3 && !enemyIsFaster) return null;

    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = trainerPartyIndex + 1; i < trainerData.party.length; i++) {
      const candidate = trainerData.party[i];
      if (!candidate || candidate.hp <= 0) continue;
      const score = calculateAIPokemonScore(candidate);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const SWITCH_THRESHOLD = 150;
    return bestIdx >= 0 && bestScore > SWITCH_THRESHOLD ? bestIdx : null;
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
    party[targetPartyIdx] = current;
    party[trainerPartyIndex] = target;
    // Now party[trainerPartyIndex] = target, party[trainerPartyIndex+1] = current (withdrawn, available later)

    enemy = party[trainerPartyIndex];
    trainerAIState!.seenPokemonIds.add(enemy.uuid);

    enemyBattleState = createBattleRuntimeStateForPokemon(enemy);
    enemySelectedMoveIndex = -1;
    if (menu) menu.enemyTypes = (enemy.types ?? []) as import('../../types/index.js').PokemonType[];
    enemyAlreadyAttacked = false;
    enemyHpBar = createHPBar(enemy.id, enemy.level, enemy.hp, enemy.maxHp, BTL.OPP_BAR.x, BTL.OPP_BAR.y, false);
    setStatus(enemyHpBar, enemy.status ?? '');
    setVolatileStatuses(enemyHpBar, [
      ...getDisplayedVolatileStatuses(enemyBattleState),
      ...getDisplayedSideStatuses(enemySideState),
    ]);
    loadImage(`/sprites/pokemon/front/${enemy.id}.png`).catch(() => {});
    if (hasActiveGame()) {
      const pd = getPlayerData();
      if (!pd.pokedex[enemy.id]) {
        pd.pokedex[enemy.id] = 'seen';
      }
    }

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
    trainerAIState!.justSwitchedIn = true;

    phase = 'TRAINER_VOLUNTARY_SWITCH';
    enemyGoesFirst = true; // Player attacks after switch animation resolves
  }

  function handleTrainerTurnPriority(): boolean {
    if (!isTrainerBattle || !trainerAIState) return false;

    const itemAction = checkTrainerItemUse();
    if (itemAction) {
      executeTrainerItemUse(itemAction.itemId, itemAction.itemName);
      enemyBattleState.lastMoveUsedId = null; // Clear last move to avoid confusion with item use like life orb . but it clear the effect of choise
      return true;
    }

    if (trainerAIState.level >= 3) {
      const switchTarget = findBestSwitchTarget();
      if (switchTarget !== null) {
        executeTrainerVoluntarySwitch(switchTarget);
        return true;
      }
    }
    // enemyBattleState.lastMoveUsedId = null; // Clear last move to avoid confusion with item use

    return false;
  }

  function scoreMoveForEnemy(moveIndex: number): number {
    const move = enemy.moves[moveIndex];
    if (!move) return -Infinity;
    if (move.currentPp <= 0) {
      return -Infinity;
    }
    if (move.id === enemyBattleState.disabledMoveId) return -Infinity;

    const movePower = move.power ?? 0;
    const battleData = getMoveBattleData(move.id);

    const bayPassImmunity = battleData?.effects.find((e) => e.bayPassImuunity);
    const effectivenessScore = getCombinedTypeEffectiveness(move.type, player.types);
    const effectiveness = effectivenessScore === 0 && bayPassImmunity ? 1 : effectivenessScore;
    if (effectiveness === 0) return -Infinity;

    const moveFullData = getMove(move.id);
    const damageClass = moveFullData?.damageClass ?? (movePower > 0 ? 'physical' : 'status');
    const isOhko = battleData?.behaviorTags?.includes('ohko') ?? false;
    const isCharging = battleData?.behaviorTags?.includes('requires-charge-turn') ?? false;
    const isRest = battleData?.behaviorTags?.includes('rest') ?? false;
    const isSelfHeal = (battleData?.healingPercent ?? 0) > 0 && battleData?.target === 'user';
    const isReversal = battleData?.behaviorTags?.includes('reversal') ?? false;
    const leaveUserAtOneHp = battleData?.behaviorTags?.includes('leave-user-at-1-hp') ?? false;
    const isDreamEaterEnemy = battleData?.behaviorTags?.includes('dream-eater') ?? false;
    const isBellyDrumEnemy = battleData?.behaviorTags?.includes('belly-drum') ?? false;

    if (isReversal) {
      const power = Math.max(1, player.maxHp - player.hp);
      move.power = power;
    }

    const ai = trainerAIState;
    const enemyHpRatio = enemy.hp / enemy.maxHp;
    const playerHpRatio = player.hp / player.maxHp;

    // Get Player remaining slots
    const playerParty = getPlayerData().party;
    const confirmedAlive = [...battleRoster].filter((i) => playerParty[i].hp > 0).length;
    const unseenSlots = maxRosterSize - battleRoster.size;
    const estimatedRemaining = confirmedAlive + unseenSlots;
    const playerPartyRemainingScore = estimatedRemaining / maxRosterSize;

    // dream eater works only on sleeping targets — worthless otherwise
    if (isDreamEaterEnemy) {
      if (playerBattleState.majorStatus !== 'sleep') {
        return -Infinity;
      }
    }

    // belly drum works only when enough HP — worthless otherwise
    if (isBellyDrumEnemy) {
      if (enemyHpRatio <= 0.85 || enemyBattleState.statModifiers.attack >= 3) {
        return -Infinity;
      }
    }

    // self destruct /explosion
    if (leaveUserAtOneHp) {
      if (enemyHpRatio > 0.5) {
        return -Infinity;
      } else if (playerHpRatio < 0.3 && playerPartyRemainingScore > 0.5) {
        return -Infinity;
      }
    }

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
    if (
      (ai?.level ?? 0 > 3) ||
      (isCharging && enemyBattleState.chargingMoveId === null && (ai?.chargingMovesStarted ?? 0) >= 2)
    )
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
      return (1 - enemyHpRatio) * 700;
    }

    let score = 0;

    if (movePower > 0) {
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
      if (playerHpRatio < 0.45) {
        const accuracy = moveFullData?.accuracy ?? 100;
        if (accuracy < 100) score -= (100 - accuracy) * 5;
      }
    } else {
      // Status / utility move
      const ailment = battleData?.ailment ?? null;
      const effects = battleData?.effects ?? [];

      // Disable: only useful if player has used a move and has no disabled move yet
      const isDisableMove = battleData?.behaviorTags?.includes('disable') ?? false;
      if (isDisableMove) {
        if (playerBattleState.disabledMoveId !== null) return -Infinity;
        if (playerBattleState.lastMoveUsedId === null) return -Infinity;
        return 300;
      }

      const isSafeGuardActive = isSafeguardActive(playerSideState);

      if (playerBattleState.substituteActive || isSafeGuardActive) {
        const ailmentTargetsOpponent = battleData?.ailment?.target === 'target';
        const hasTargetedEffects = effects.some((e) => e.target === 'target');
        const hasTargetedStatDrop =
          battleData?.statChanges?.some((sc) => sc.target === 'target' && sc.stages < 0) ?? false;

        // Substitute blocks: ailments, targeted effects, and targeted stat drops
        if (playerBattleState.substituteActive) {
          if (ailmentTargetsOpponent || hasTargetedEffects || hasTargetedStatDrop) {
            return -Infinity;
          }
        }

        // Safeguard blocks: ailments and targeted effects (NOT stat drops — those bypass Safeguard)
        if (isSafeGuardActive) {
          if (ailmentTargetsOpponent || hasTargetedEffects) {
            return -Infinity;
          }
        }
      }

      // Entry hazard moves — set up once, never repeat
      // Check both the live side-state AND the planned flag (set when move is chosen, before animation fires)
      const isEntryHazardSR = battleData?.behaviorTags?.includes('stealth-rock') ?? false;
      const isEntryHazardSpikes = battleData?.behaviorTags?.includes('spikes') ?? false;
      const isEntryHazardToxicSpikes = battleData?.behaviorTags?.includes('toxic-spikes') ?? false;
      if (isEntryHazardSR) {
        if (playerSideState.stealthRockActive) return -Infinity;
        return 400 * playerPartyRemainingScore;
      }
      if (isEntryHazardSpikes) {
        if (playerSideState.spikesLayers >= 3) return -Infinity;
        return 350 * playerPartyRemainingScore;
      }
      if (isEntryHazardToxicSpikes) {
        if (playerSideState.toxicSpikesLayers >= 2) return -Infinity;
        return 300 * playerPartyRemainingScore;
      }

      // Screen moves (Reflect / Light Screen) — only worthwhile at good HP vs the right attacker type
      const screenEffect = battleData?.sideEffects?.find((se) => se.id === 'reflect' || se.id === 'light-screen');
      if (screenEffect) {
        if (playerPartyRemainingScore <= 1 / maxRosterSize) return -Infinity; // Too low HP to benefit
        if (enemyHpRatio < 0.25 && playerPartyRemainingScore < 0.5) return -Infinity; // Too low HP to benefit
        if (screenEffect.id === 'reflect' && enemySideState.reflectTurnsRemaining > 0) return -Infinity;
        if (screenEffect.id === 'light-screen' && enemySideState.lightScreenTurnsRemaining > 0) return -Infinity;
        // Reflect only helps vs physical attackers; Light Screen only vs special attackers
        if (screenEffect.id === 'reflect' && player.specialAttack > player.attack * 1.2) return -Infinity;
        if (screenEffect.id === 'light-screen' && player.attack > player.specialAttack * 1.2) return -Infinity;
        // Don't set up a screen when player can KO us this turn
        const estIncomingScreen = estimatePlayerBestDamageToEnemy();
        if (estIncomingScreen >= enemy.hp && playerPartyRemainingScore <= 0.5) return -Infinity;
        let screenScore = 250;
        if (playerBattleState.majorStatus === 'sleep' || playerBattleState.majorStatus === 'freeze') screenScore += 400; // Free turns to let the screen pay off
        return screenScore * playerPartyRemainingScore;
      }

      // Self stat-boost moves (Swords Dance, Calm Mind, Dragon Dance, etc.)
      // Only worthwhile when the player is weakened, slowed, or at a disadvantage
      const selfBoosts = battleData?.statChanges?.filter((sc) => sc.target === 'user' && sc.stages > 0) ?? [];
      const playerStatesReduce = battleData?.statChanges?.filter((sc) => sc.target === 'target' && sc.stages > 0) ?? [];
      let trainerBoostedScore = 0;
      let playerReducedScore = 0;

      if (selfBoosts.length > 0) {
        selfBoosts.forEach(
          (sc) => (trainerBoostedScore += enemyBattleState.statModifiers[sc.stat as keyof BattleStatModifiers]),
        );
        playerStatesReduce.forEach(
          (sc) => (playerReducedScore -= playerBattleState.statModifiers[sc.stat as keyof BattleStatModifiers]),
        );

        // ? Dont delete - this is good debug
        // 'if (moveFullData && ['Double Team'].includes(moveFullData?.name.en)) {
        //   console.debug(`Evaluating self-boost move ${moveFullData?.name.en}:`, {
        //     selfBoosts,
        //     playerStatesReduce,
        //     battleData,
        //     score,
        //     rosterSize: battleRoster.size,
        //     maxRosterSize,
        //     trainerBoostedScore,
        //     playerReducedScore,
        //   });
        // }'
        if (trainerBoostedScore > 50 || playerReducedScore < 0) return -Infinity; // Already boosted — don't boost again
        if (enemyHpRatio < 0.5) return -Infinity;
        const estIncomingBoost = estimatePlayerBestDamageToEnemy();
        if (estIncomingBoost >= enemy.hp * 0.65 && enemy.hp < enemy.maxHp * 0.85) return -Infinity; // Too risky to set up
        const playerStatus = playerBattleState.majorStatus;
        let setupScore = trainerBoostedScore / 2;
        if (playerStatus === 'sleep' || playerStatus === 'freeze') {
          setupScore = 500; // Multiple free turns — ideal setup window
        } else if (playerStatus === 'paralyze') {
          setupScore = 300;
        } else if (playerStatus === 'burn') {
          // Burn is most disruptive to physical attackers
          setupScore = player.attack > player.specialAttack * 1.1 ? 350 : 80;
        } else {
          // No status — only set up if we have type advantage or level advantage
          const hasTypeAdv = enemy.types.some(
            (t) =>
              getCombinedTypeEffectiveness(
                t as import('../../types/index.js').PokemonType,
                player.types as import('../../types/index.js').PokemonType[],
              ) > 1,
          );

          if (!hasTypeAdv && enemy.level / player.level < 0.8) return -Infinity;
          if (enemy.level / player.level < 0.6) return -Infinity;
          setupScore = hasTypeAdv ? 220 : 150;
        }
        return setupScore;
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

      // Major status ailment moves — more valuable when we have type/level advantage
      if (ailment !== null) {
        if (player.status !== null) return -Infinity; // Already statused
        if (isTargetImmuneToStatusEffectFromMoveType(player, move.type, ailment)) return -Infinity; // Type immune
        const hasTypeAdv = enemy.types.some(
          (t) =>
            getCombinedTypeEffectiveness(
              t as import('../../types/index.js').PokemonType,
              player.types as import('../../types/index.js').PokemonType[],
            ) > 1,
        );
        const hasLevelAdv = enemy.level >= player.level;
        if (enemyHpRatio > 0.5) {
          score += hasTypeAdv && hasLevelAdv ? 380 : 250;
        } else {
          score += 80; // Low HP — risky to spend a turn on status
        }
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
    if (enemyBattleState.lockedInMoveId !== null) {
      const lockedIndex = findMoveIndexById(enemy, enemyBattleState.lockedInMoveId);
      if (lockedIndex !== null) return lockedIndex;
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
      // console.debug(`Enemy move ${i} (${getMove(enemy.moves[i].id)?.name.en}): score ${s}`);
    }

    // If all moves are -Infinity, fall back to random selection
    if (bestIndex === -1 || bestScore === -Infinity) {
      return chooseEnemyMoveIndex(enemy);
    }

    // Track charging move initiatio-ns to enforce the cap
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

    // Wild NPC flee check
    if (isWildNpcBattle && trainerData) {
      const fleeTurnsHit = wildNpcFleeAfterTurns !== null && turnNumber >= wildNpcFleeAfterTurns;
      const fleeHpHit = wildNpcFleeAtHpPct !== null && enemy.hp / enemy.maxHp <= wildNpcFleeAtHpPct;
      if (fleeTurnsHit || fleeHpHit) {
        if (hasActiveGame()) {
          const pd = getPlayerData();
          setFlag(pd, `trainer-${trainerData.trainerId}-defeated`);
          void fireStoryTrigger({ type: 'trainer-defeated', trainerId: trainerData.trainerId });
          autoSave();
        }
        textBox = createTextBox([t('battle.wildNpcFled', { name: enemy.name })], isRTL());
        phase = 'RUN';
        return;
      }
    }

    pendingForcedPlayerMoveIndex = getForcedPlayerMoveIndex();
    if (playerBattleState.turnFlags.mustRecharge || pendingForcedPlayerMoveIndex !== null) {
      resolveForcedPlayerTurn();
      return;
    }

    // We have several of disabling moves : disable move from oponnent, choice item , struggle
    // softLockedInMovesId for choice items ,disabledMoveId from disable move , and struggle used the disabledMoveIds
    if (playerBattleState.softLockedInMovesId?.length) {
      menu.disabledMoveIds = playerBattleState.softLockedInMovesId;
    }
    if (playerBattleState.disabledMoveId !== null && menu.disabledMoveIds.length > 0) {
      menu.disabledMoveIds.push(playerBattleState.disabledMoveId);
    } else if (playerBattleState.disabledMoveId !== null) {
      menu.disabledMoveIds = [playerBattleState.disabledMoveId];
    }

    if (player.moves.every((m) => m.currentPp <= 0)) {
      menu.isStruggleMode = true;
      playerBattleState.isStruggleMode = true;
    } else {
      menu.isStruggleMode = false;
      playerBattleState.isStruggleMode = false;
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
      doAttack({ actor: 'enemy' });
      return;
    }

    const forcedMoveIndex = pendingForcedPlayerMoveIndex;
    pendingForcedPlayerMoveIndex = null;
    doAttack({ forcedMoveIndex: forcedMoveIndex ?? undefined, actor: 'player' });
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
        return Math.max(10000, Math.floor(currentMoney / 5));
      case 'wild-whiteout':
        return Math.max(15000, Math.floor(currentMoney / 3));
      case 'trainer-roster':
        return trainerData ? Math.min(currentMoney, trainerData.reward.money * trainerData.party.length) : 1000;
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
      if (isWildNpcBattle && trainerData) {
        setFlag(pd, `trainer-${trainerData.trainerId}-defeated`);
        void fireStoryTrigger({ type: 'trainer-defeated', trainerId: trainerData.trainerId });
      }
      enemy.caughtBall = outcome.itemId;
      if (!pd.pokedex[enemy.id]) {
        pd.pokedex[enemy.id] = 'caught';
      }
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

      autoSave(true);
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

  function startWildNpcEntranceAnimation(): void {
    const target = getBallTargetPoint();
    pendingWildNpcEntrance = false;
    sendOutFx = null;
    animationDirector.clear();
    animationDirector.setActorState('enemy', {
      x: 0,
      y: 0,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      rotation: 0,
      visible: true,
    });
    animationDirector.play(
      sequenceStep(
        tweenActorStep('enemy', { scaleX: 1.08, scaleY: 1.08, alpha: 1 }, 0.22, 'easeOut'),
        tweenActorStep('enemy', { scaleX: 1, scaleY: 1 }, 0.08, 'easeInOut'),
        callStep(() => {
          audio.playCry(enemy.id);
          sendOutFx = createSendOutEffect(target.x, target.y - 2, '#b060ff', '#e8d0ff');
          pendingEnemyEntryHazard = true;
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
    player.status = null;
    playerBattleState.majorStatus = null;
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

      const curseResult = applyGhostCurseEffect(player, playerBattleState);
      if (curseResult.applied) {
        queueStatusTurnEffect('player', 'curse');
        lines.push(t('battle.curseDamage', { name: getPokemonDisplayName(player.id) }));
      }
    }
    if (enemy.hp > 0) {
      const leechSeedResult = applyLeechSeedEffect(enemy, enemyBattleState, player);
      if (leechSeedResult.applied) {
        queueStatusTurnEffect('enemy', 'seed');
        lines.push(t('battle.leechSeedDrain', { name: getPokemonDisplayName(enemy.id) }));
      }

      const curseResult = applyGhostCurseEffect(enemy, enemyBattleState);
      if (curseResult.applied) {
        queueStatusTurnEffect('enemy', 'curse');
        lines.push(t('battle.curseDamage', { name: getPokemonDisplayName(enemy.id) }));
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

    if (playerSideState.futureSightTurnsRemaining > 0) {
      playerSideState.futureSightTurnsRemaining--;
      if (playerSideState.futureSightTurnsRemaining === 0 && enemy.hp > 0) {
        enemy.hp = Math.max(0, enemy.hp - playerSideState.futureSightDamage);
        playerSideState.futureSightDamage = 0;
        lines.push(t('battle.futureSightHit', { name: getPokemonDisplayName(enemy.id) }));
      }
    }
    if (enemySideState.futureSightTurnsRemaining > 0) {
      enemySideState.futureSightTurnsRemaining--;
      if (enemySideState.futureSightTurnsRemaining === 0 && player.hp > 0) {
        player.hp = Math.max(0, player.hp - enemySideState.futureSightDamage);
        enemySideState.futureSightDamage = 0;
        lines.push(t('battle.futureSightHit', { name: getPokemonDisplayName(player.id) }));
      }
    }

    for (const effectId of advanceSideEffectTurns(playerSideState)) {
      lines.push(getSideEffectEndedLine(getPokemonDisplayName(player.id), effectId));
    }
    for (const effectId of advanceSideEffectTurns(enemySideState)) {
      lines.push(getSideEffectEndedLine(getPokemonDisplayName(enemy.id), effectId));
    }

    // Disable timer countdown
    if (playerBattleState.disabledMoveTurnsRemaining > 0) {
      playerBattleState.disabledMoveTurnsRemaining--;
      if (playerBattleState.disabledMoveTurnsRemaining <= 0 && playerBattleState.disabledMoveId !== null) {
        lines.push(
          t('battle.disableMoveEnd', {
            name: getPokemonDisplayName(player.id),
            move: getMoveDisplayName(playerBattleState.disabledMoveId),
          }),
        );
        playerBattleState.disabledMoveId = null;
        menu.disabledMoveIds = menu.disabledMoveIds.filter((id) => id !== playerBattleState.disabledMoveId);
      }
    }
    if (enemyBattleState.disabledMoveTurnsRemaining > 0) {
      enemyBattleState.disabledMoveTurnsRemaining--;
      if (enemyBattleState.disabledMoveTurnsRemaining <= 0 && enemyBattleState.disabledMoveId !== null) {
        lines.push(
          t('battle.disableMoveEnd', {
            name: getPokemonDisplayName(enemy.id),
            move: getMoveDisplayName(enemyBattleState.disabledMoveId),
          }),
        );
        enemyBattleState.disabledMoveId = null;
        // menu.disabledMoveIds = menu.disabledMoveIds.filter((id) => id !== enemyBattleState.disabledMoveId);
      }
    }

    // End Of turn held items effect
    applyHeldItemEffectInBattle({
      pokemon: player,
      runtimeState: playerBattleState,
      actor: 'player',
      when: 'endOfTurn',
      lines,
      queueStatusTurnEffect,
    });

    applyHeldItemEffectInBattle({
      pokemon: enemy,
      runtimeState: enemyBattleState,
      actor: 'enemy',
      when: 'endOfTurn',
      lines,
      queueStatusTurnEffect,
    });

    // Weather end-of-turn: damage + decrement
    if (battleWeather) {
      if (player.hp > 0) {
        const wr = applyWeatherDamage(player, battleWeather.type);
        if (!wr.immune) {
          if (wr.damage > 0) {
            queueStatusTurnEffect('player', battleWeather.type);
            lines.push(
              t(battleWeather.type === 'sandstorm' ? 'battle.sandstormDamage' : 'battle.hailDamage', {
                name: getPokemonDisplayName(player.id),
              }),
            );
          } else if (wr.healed > 0) {
            lines.push(t('battle.weatherHeal', { name: getPokemonDisplayName(player.id) }));
          }
        }
      }
      if (enemy.hp > 0) {
        const wr = applyWeatherDamage(enemy, battleWeather.type);
        if (!wr.immune) {
          if (wr.damage > 0) {
            queueStatusTurnEffect('enemy', battleWeather.type);
            lines.push(
              t(battleWeather.type === 'sandstorm' ? 'battle.sandstormDamage' : 'battle.hailDamage', {
                name: getPokemonDisplayName(enemy.id),
              }),
            );
          } else if (wr.healed > 0) {
            lines.push(t('battle.weatherHeal', { name: getPokemonDisplayName(enemy.id) }));
          }
        }
      }
      battleWeather.turnsRemaining--;
      if (battleWeather.turnsRemaining <= 0) {
        lines.push(getWeatherEndedLine(battleWeather.type));
        revertWeatherStatBoost(playerBattleState);
        revertWeatherStatBoost(enemyBattleState);
        if (mapWeatherBase) {
          battleWeather = { type: mapWeatherBase, turnsRemaining: Infinity, setter: null };
          lines.push(getWeatherStartedLine(mapWeatherBase));
          applyWeatherStatBoost(playerBattleState, player, mapWeatherBase);
          applyWeatherStatBoost(enemyBattleState, enemy, mapWeatherBase);
        } else {
          battleWeather = null;
        }
        if (menu) menu.activeWeather = mapWeatherBase ?? null;
      }
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
    const result = checkAndApplyLevelUp(player, hasActiveGame() ? getPlayerData().party : [player]);
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

    const session = createMoveLearningSession(activePartyIndex, prompt, (resolution) => {
      pendingMoveLearningResolution = resolution;
    });
    phase = 'WAITING_MOVE_LEARN';
    const partyScene = createPartyReactScene(stateMachine, { kind: 'move-learning', session });
    stateMachine.pushDirect('PARTY', partyScene);

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
    skipAnimation = false,
  ): void {
    if (pokemon.status && !skipAnimation) {
      queueStatusTurnEffect(actor, pokemon.status);
    }
    const skipEndOFTurnVolatileStatuses = ['seed', 'curse', 'trap'];
    for (const effectId of getDisplayedVolatileStatuses(runtimeState)) {
      if (skipEndOFTurnVolatileStatuses.includes(effectId)) continue;
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
    console.log({ profile });

    if (move.power > 0 || resolvedDamage > 0) {
      const absorbEffect =
        move.power > 0 && defender.abilityId
          ? getAbilityBattleEffects(defender.abilityId).find((effect) => {
              return effect.kind === 'typeAbsorbHeal' && effect.moveTypes.includes(move.type);
            })
          : undefined;
      if (absorbEffect?.kind === 'typeAbsorbHeal') {
        const healAmount = Math.floor((defender.maxHp * absorbEffect.healPercent) / 100);
        if (healAmount > 0) {
          const healed = Math.max(0, Math.min(defender.maxHp, defender.hp + healAmount) - defender.hp);
          defender.hp = Math.min(defender.maxHp, defender.hp + healAmount);
          setHP(targetBar, defender.hp);
          spawnDamageNumber(`+${healed}`, popupX, popupY, '#48d870');
          audio.playSFX('heal');
        }
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
        audio.playMoveSFX(move.name);
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

    //todo : consider handle it in group way -  psyh up move
    const isPsychUp = moveBattleData.behaviorTags.includes('psych-up');
    if (isPsychUp) {
      Object.entries(defenderState.statModifiers).forEach(([stat, stage]) => {
        moveBattleData.statChanges.push({
          stat: stat as BattleStatId,
          stages: stage / 50, // stage is -200 to +200, convert to -4 to +4 for stat change application
          target: 'user',
          chance: 100,
        });
      });
    }

    const userStatChanges = applyStatChanges(
      attackerState,
      moveBattleData.statChanges,
      'user',
      Math.random,
      attackerHasContrary,
      moveBattleData.groupedStatChance,
    );
    for (const change of userStatChanges) {
      lines.push(getStatChangeLine(attackerName, change));
    }

    if (moveBattleData.ailment?.target === 'user') {
      const statusResult = applyMajorStatus(attacker, attackerState, moveBattleData.ailment);
      if (statusResult.applied) {
        const statusLine = getStatusAppliedLine(attackerName, statusResult.status);
        if (statusLine) lines.push(statusLine);
        if (statusResult.lines) lines.push(...statusResult.lines);
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
            const statusResult = applyMajorStatus(
              defender,
              defenderState,
              moveBattleData.ailment,
              () => Math.random(),
              attacker,
              attackerState,
            );
            if (statusResult.applied) {
              const statusLine = getStatusAppliedLine(defenderName, statusResult.status);
              if (statusLine) lines.push(statusLine);
              if (statusResult.lines) lines.push(...statusResult.lines);
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

  // try to combine do attack and enemy turn
  function doAttack({ forcedMoveIndex, actor }: { forcedMoveIndex?: number; actor: 'player' | 'enemy' }): void {
    const attackerBattleState = actor === 'player' ? playerBattleState : enemyBattleState;
    const defenderBattleState = actor === 'player' ? enemyBattleState : playerBattleState;
    const syncAttackerBar = actor === 'player' ? syncPlayerBar : syncEnemyBar;
    const syncDefenderBar = actor === 'player' ? syncEnemyBar : syncPlayerBar;
    const defenderActor: 'player' | 'enemy' = actor === 'player' ? 'enemy' : 'player';
    const attacker = actor === 'player' ? player : enemy;
    const defender = actor === 'player' ? enemy : player;

    const attackerSideState = actor === 'player' ? playerSideState : enemySideState;
    const defenderSideState = actor === 'player' ? enemySideState : playerSideState;
    const attackerHpBar = actor === 'player' ? playerHpBar : enemyHpBar;
    const defenderHpBar = actor === 'player' ? enemyHpBar : playerHpBar;

    const attackerSprite = actor === 'player' ? BTL.PLY_SPRITE : BTL.OPP_SPRITE;
    const defenderSprite = actor === 'player' ? BTL.OPP_SPRITE : BTL.PLY_SPRITE;
    const attackerPhase = actor === 'player' ? 'PLAYER_ATTACK' : 'ENEMY_TURN';

    // Clear Destiny Bond from defender when attacker acts (bond expires on user's next turn)
    if (defenderBattleState.destinyBonded) {
      defenderBattleState.destinyBonded = false;
      syncDefenderBar();
    }
    const rtl = isRTL();
    const attackerName = getPokemonDisplayName(attacker.id);

    let moveIndex: number;
    if (actor === 'player') {
      moveIndex = forcedMoveIndex ?? selMove;
    } else {
      moveIndex = enemySelectedMoveIndex >= 0 ? enemySelectedMoveIndex : getPlannedEnemyMoveIndex();
      enemySelectedMoveIndex = -1;
    }
    let m = attacker.moves[moveIndex];
    if (!m || attackerBattleState.isStruggleMode) {
      m = { ...STRUGGLE_MOVE };
    }

    // Track last move used (for Copycat / Mirror Move also for choice item)
    attackerBattleState.lastMoveUsedId = m.id;
    lastMoveUsedInBattle = m.id;

    const pendingChargeMoveId = getChargingMoveId(attackerBattleState);
    const forcedChargeRelease =
      forcedMoveIndex !== undefined &&
      pendingChargeMoveId !== null &&
      attacker.moves[forcedMoveIndex]?.id === pendingChargeMoveId;

    const startResult = processBeforeMoveEffects(attacker, attackerBattleState, Math.random, m.id);

    const turnEffectLines = startResult.events
      .map((event) => getTurnEffectLine(attackerName, event))
      .filter((line): line is string => line !== null);

    // problematic due to paralyze should not render effect unless is fully paralyze. also flinch
    triggerStatusTurnEffects(actor, attacker, attackerBattleState, startResult.skipAnimation);

    syncAttackerBar();
    if (startResult.selfDamage > 0) {
      flash = createFlash('#fff29a', 0.12);
      shake = createShake(1.4, 0.18);

      spawnDamageNumber(
        `-${startResult.selfDamage}`,
        attackerSprite.x + attackerSprite.w / 2,
        attackerSprite.y + 10,
        '#f8d858',
      );
      audio.playSFX('hit');
    }

    if (!startResult.canAct) {
      // Player releases via forcedChargeRelease; enemy has no forced index, so detect a charge release directly
      if (forcedChargeRelease || (actor === 'enemy' && pendingChargeMoveId !== null && pendingChargeMoveId === m.id)) {
        clearChargingMove(attackerBattleState);
      }
      textBox = createTextBox(turnEffectLines.length > 0 ? turnEffectLines : [t('battle.nothingHappened')], rtl);
      phase = attackerPhase;
      phaseTimer = 0;
      return;
    }

    if (m.id === attackerBattleState.disabledMoveId || attackerBattleState.softLockedInMovesId?.includes(m.id)) {
      const msgs = [...turnEffectLines];
      msgs.push(
        t('battle.moveCantUseDisabled', { name: getPokemonDisplayName(attacker.id), move: getMoveDisplayName(m.id) }),
      );
      textBox = createTextBox(msgs, rtl);
      phase = attackerPhase;
      phaseTimer = 0;
      return;
    }

    // ZzZ effect for sleep-usable moves used while asleep
    if (SLEEP_USABLE_MOVE_IDS.has(m.id) && startResult.events.includes('fast-asleep')) {
      const sx = attackerSprite.x + attackerSprite.w / 2;
      const sy = attackerSprite.y - 4;
      spawnDamageNumber('Z', sx - 5, sy, '#b088ff');
      spawnDamageNumber('z', sx + 2, sy - 7, '#9060e0');
      spawnDamageNumber('Z', sx + 9, sy - 14, '#b088ff');
    }

    const defenderName = getPokemonDisplayName(defender.id);
    const attackerParty = actor === 'player' ? getPlayerData().party : (trainerData?.party ?? []);

    let moveBattleData = getMoveBattleData(m.id);

    // --- Move Redirection (Sleep Talk / Metronome / Assist / Copycat / Mirror Move) ---
    const originalMoveName = getMoveDisplayName(m.id);
    const redirectTag =
      moveBattleData?.behaviorTags?.find(
        (tag) =>
          tag === 'sleep-talk' || tag === 'metronome' || tag === 'assist' || tag === 'copycat' || tag === 'mirror-move',
      ) ?? null;
    let isRedirected = false;
    let redirectMsg: string | null = null;

    if (redirectTag !== null) {
      if (m.currentPp > 0) {
        if (defender.abilityId === 46) {
          m.currentPp--; // Pressure ability: additional PP reduction on foe's move
        }
        m.currentPp--;
      }
      let redirectId: number | null = null;

      if (redirectTag === 'sleep-talk') {
        if (attackerBattleState.majorStatus !== 'sleep') {
          const msgs = [
            ...turnEffectLines,
            t('battle.usedMove', { name: attackerName, move: originalMoveName }),
            t('battle.nothingHappened'),
          ];
          textBox = createTextBox(msgs, rtl);
          phase = attackerPhase;
          phaseTimer = 0;
          return;
        }
        const eligible = attacker.moves.filter((pm) => pm.id !== m.id && pm.currentPp > 0);
        if (eligible.length > 0) redirectId = eligible[Math.floor(Math.random() * eligible.length)].id;
      } else if (redirectTag === 'metronome') {
        const eligible = getAllMoves().filter((mv) => !METRONOME_EXCLUDED_MOVE_IDS.has(mv.id));
        if (eligible.length > 0) {
          redirectId = eligible[Math.floor(Math.random() * eligible.length)].id;
          flash = createFlash('#e080ff', 0.22);
        }
      } else if (redirectTag === 'assist') {
        if (actor === 'player') {
          const eligible: number[] = [];
          for (let i = 0; i < attackerParty.length; i++) {
            if (actor === 'player' && i === activePartyIndex) continue;
            for (const pm of attackerParty[i].moves) {
              if (!ASSIST_EXCLUDED_MOVE_IDS.has(pm.id) && pm.currentPp > 0) eligible.push(pm.id);
            }
          }
          if (eligible.length > 0) redirectId = eligible[Math.floor(Math.random() * eligible.length)];
        }
        // enemy has no party — redirectId stays null, fails gracefully
      } else if (redirectTag === 'copycat') {
        redirectId = lastMoveUsedInBattle;
      } else if (redirectTag === 'mirror-move') {
        redirectId = defenderBattleState.lastMoveUsedId;
      }

      if (redirectId === null) {
        const msgs = [
          ...turnEffectLines,
          t('battle.usedMove', { name: attackerName, move: originalMoveName }),
          t('battle.noMoveToCall'),
        ];
        textBox = createTextBox(msgs, rtl);
        phase = attackerPhase;
        phaseTimer = 0;
        return;
      }

      const rmd = getMove(redirectId);
      if (rmd) {
        m = {
          ...m,
          id: redirectId,
          name: rmd.name.en,
          type: rmd.type as PokemonType,
          power: rmd.power ?? 0,
          accuracy: rmd.accuracy ?? 0,
        };
      }
      moveBattleData = getMoveBattleData(redirectId);
      if (redirectTag === 'copycat') {
        redirectMsg = t('battle.copiedMove', { name: attackerName, move: getMoveDisplayName(redirectId) });
      } else if (redirectTag === 'mirror-move') {
        redirectMsg = t('battle.mirroredMove', { name: attackerName, move: getMoveDisplayName(redirectId) });
      } else {
        redirectMsg = t('battle.calledMove', { move: getMoveDisplayName(redirectId) });
      }
      isRedirected = true;
    }

    // --- End Redirection ---

    const isChargeRelease = !isRedirected && pendingChargeMoveId !== null && pendingChargeMoveId === m.id;
    const isCurse = moveBattleData?.behaviorTags?.includes('curse') ?? false;
    const requiresChargeTurn = moveBattleData?.behaviorTags?.includes('requires-charge-turn') ?? false;
    const isChargeStart = requiresChargeTurn && !isChargeRelease && !isRedirected;
    const isTwoTurnFly = moveBattleData?.behaviorTags?.includes('two-turn-fly') ?? false;
    const isTwoTurnDig = moveBattleData?.behaviorTags?.includes('two-turn-dig') ?? false;
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
    const isBellyDrum = moveBattleData?.behaviorTags?.includes('belly-drum') ?? false;
    const isMagnitude = moveBattleData?.behaviorTags?.includes('magnitude') ?? false;
    // TODO : isBatonPass didnt checked yet on enemy
    const isBatonPass = moveBattleData?.behaviorTags?.includes('baton-pass') ?? false;
    const isCounter = moveBattleData?.behaviorTags?.includes('counter') ?? false;
    const isMirrorCoat = moveBattleData?.behaviorTags?.includes('mirror-coat') ?? false;
    const isMagicCoat = moveBattleData?.behaviorTags?.includes('magic-coat') ?? false;
    const isDestinyBond = moveBattleData?.behaviorTags?.includes('destiny-bond') ?? false;
    const isFutureSight = moveBattleData?.behaviorTags?.includes('future-sight') ?? false;
    const isWeightTarget = moveBattleData?.behaviorTags?.includes('weight-target') ?? false;
    const isWeightRatio = moveBattleData?.behaviorTags?.includes('weight-ratio') ?? false;
    const isDisable = moveBattleData?.behaviorTags?.includes('disable') ?? false;
    const isHaze = moveBattleData?.behaviorTags?.includes('haze') ?? false;
    const isNightShade = moveBattleData?.behaviorTags?.includes('night-shade') ?? false;
    const isSuperFang = moveBattleData?.behaviorTags?.includes('super-fang') ?? false;
    const isSandstormMove = moveBattleData?.behaviorTags?.includes('sandstorm') ?? false;
    const isRainDanceMove = moveBattleData?.behaviorTags?.includes('rain') ?? false;
    const isSunnyDayMove = moveBattleData?.behaviorTags?.includes('sun') ?? false;
    const isHailMove = moveBattleData?.behaviorTags?.includes('hail') ?? false;
    const isWeatherMove = isSandstormMove || isRainDanceMove || isSunnyDayMove || isHailMove;
    const healPercent = moveBattleData?.healingPercent ?? null;
    const hitCount = (() => {
      const min = moveBattleData?.minHits ?? null;
      const max = moveBattleData?.maxHits ?? null;
      if (min !== null && max !== null) return Math.floor(Math.random() * (max - min + 1)) + min;
      return 1;
    })();

    const selfCostAmount = leaveUserAtOneHp && attacker.hp ? Math.max(0, attacker.hp - 1) : 0;

    if (!isRedirected && !isChargeRelease && m.currentPp > 0) {
      m.currentPp--;
    }

    if (isCurse && attacker.types.includes('ghost')) {
      if (defenderBattleState.curseActive) {
        textBox = createTextBox([t('battle.alreadyCursed', { name: defenderName })], rtl);
        m.currentPp++;
        phase = attackerPhase;
        phaseTimer = 0;
        return;
      }
      moveBattleData!.statChanges = [];
      attacker.hp = Math.max(1, attacker.hp - attacker.maxHp / 2);
      defenderBattleState.curseActive = true;
      textBox = createTextBox([t('battle.curseGhost', { attacker: attackerName, target: defenderName })], rtl);
      phase = attackerPhase;
      phaseTimer = 0;
      return;
    }

    // Lock-in behavior tags
    const isLockInOutrage = moveBattleData?.behaviorTags?.includes('lock-in-outrage') ?? false;
    const isLockInRollout = moveBattleData?.behaviorTags?.includes('lock-in-rollout') ?? false;
    const isLockInRage = moveBattleData?.behaviorTags?.includes('lock-in-rage') ?? false;
    const isLockInUproar = moveBattleData?.behaviorTags?.includes('lock-in-uproar') ?? false;
    if (isLockInOutrage) {
      if (attackerBattleState.lockedInMoveId === null) {
        attackerBattleState.lockedInMoveId = m.id;
        attackerBattleState.lockInTurnsRemaining = Math.floor(Math.random() * 2) + 1;
      } else {
        attackerBattleState.lockInTurnsRemaining--;
      }
    }
    if (isLockInRollout) {
      if (attackerBattleState.lockedInMoveId === null) {
        attackerBattleState.lockedInMoveId = m.id;
        attackerBattleState.rolloutTurnsActive = 1;
      } else {
        attackerBattleState.rolloutTurnsActive = Math.min(5, attackerBattleState.rolloutTurnsActive + 1);
      }
      m = { ...m, power: Math.round(30 * Math.pow(2, attackerBattleState.rolloutTurnsActive - 1)) };
    }
    if (isLockInRage && attackerBattleState.lockedInMoveId === null) {
      attackerBattleState.lockedInMoveId = m.id;
      attackerBattleState.rageActive = true;
    }
    if (isLockInUproar) {
      if (attackerBattleState.lockedInMoveId === null) {
        attackerBattleState.lockedInMoveId = m.id;
        attackerBattleState.uproarTurnsRemaining = Math.floor(Math.random() * 3) + 2; // 2-4 remaining = 3-5 total
      } else {
        attackerBattleState.uproarTurnsRemaining--;
      }
    }
    const lockInOutrageFinalTurn = isLockInOutrage && attackerBattleState.lockInTurnsRemaining === 0;
    const lockInRolloutFinalTurn = isLockInRollout && attackerBattleState.rolloutTurnsActive >= 5;
    const lockInUproarFinalTurn = isLockInUproar && attackerBattleState.uproarTurnsRemaining === 0;

    const moveData = getMove(m.id);
    if (isChargeStart) {
      startChargingMove(attackerBattleState, m.id);
      if (isTwoTurnFly) {
        attackerBattleState.invulnerableState = 'airborne';
      } else if (isTwoTurnDig) {
        attackerBattleState.invulnerableState = 'underground';
      }
      const attackerHasContrary = attacker.abilityId
        ? getAbilityBattleEffects(attacker.abilityId).some((e) => e.kind === 'contraryStatChanges')
        : false;
      const chargeStatChanges = applyStatChanges(
        attackerBattleState,
        moveBattleData?.chargeStatChanges ?? [],
        'user',
        Math.random,
        attackerHasContrary,
      );
      const msgs = [...turnEffectLines, getChargingLine(attackerName, getMoveDisplayName(m.id))];
      for (const change of chargeStatChanges) {
        msgs.push(getStatChangeLine(attackerName, change));
      }
      syncAttackerBar();
      textBox = createTextBox(msgs, rtl);
      phase = attackerPhase;
      phaseTimer = 0;
      if (isTwoTurnFly) {
        animationDirector.play(
          sequenceStep(
            callStep(() => {
              attackFx = createAttackEffect({
                kind: 'fly-vanish',
                sourceX: attackerSprite.x + attackerSprite.w / 2,
                sourceY: attackerSprite.y + attackerSprite.h / 2,
                targetX: attackerSprite.x + attackerSprite.w / 2,
                targetY: attackerSprite.y + attackerSprite.h / 2,
                color: '#a8d8ff',
                accentColor: '#ffffff',
                duration: 0.7,
              });
            }),
            tweenActorStep(actor, { y: -20, scaleX: 0.18, scaleY: 0.18, alpha: 0 }, 0.7, 'easeIn'),
          ),
        );
      } else if (isTwoTurnDig) {
        animationDirector.play(
          sequenceStep(
            callStep(() => {
              attackFx = createAttackEffect({
                kind: 'dig-vanish',
                sourceX: attackerSprite.x + attackerSprite.w / 2,
                sourceY: attackerSprite.y + attackerSprite.h / 2,
                targetX: attackerSprite.x + attackerSprite.w / 2,
                targetY: attackerSprite.y + attackerSprite.h / 2,
                color: '#a07840',
                accentColor: '#c89850',
                duration: 0.5,
              });
            }),
            tweenActorStep(actor, { y: 8, scaleX: 0.1, scaleY: 0.1, alpha: 0 }, 0.5, 'easeIn'),
          ),
        );
      }
      return;
    }

    if (isFutureSight) {
      const usedMove = getMoveDisplayName(m.id);
      const msgs = [...turnEffectLines, t('battle.usedMove', { name: attackerName, move: usedMove })];
      if (attackerSideState.futureSightTurnsRemaining > 0) {
        msgs.push(t('battle.futureSightAlreadyActive'));
      } else {
        const damage = calcDamage(
          attacker,
          attackerBattleState,
          defender,
          defenderBattleState,
          defenderSideState,
          120,
          'psychic',
          'special',
        );
        attackerSideState.futureSightTurnsRemaining = 2;
        attackerSideState.futureSightDamage = damage;
        msgs.push(t('battle.futureSightSet', { name: attackerName }));
      }
      textBox = createTextBox(msgs, rtl);
      phase = attackerPhase;
      phaseTimer = 0;
      return;
    }

    // Disable: disables the defender's last used move for 3-6 turns
    if (isDisable) {
      const usedMove = getMoveDisplayName(m.id);
      const msgs = [...turnEffectLines, t('battle.usedMove', { name: attackerName, move: usedMove })];
      if (defenderBattleState.disabledMoveId !== null || defenderBattleState.lastMoveUsedId === null) {
        msgs.push(t('battle.nothingHappened'));
      } else {
        const disabledMoveName = getMoveDisplayName(defenderBattleState.lastMoveUsedId);
        defenderBattleState.disabledMoveId = defenderBattleState.lastMoveUsedId;
        defenderBattleState.disabledMoveTurnsRemaining = Math.floor(Math.random() * 4) + 3;
        msgs.push(t('battle.disableSuccess', { name: getPokemonDisplayName(defender.id), move: disabledMoveName }));
      }
      textBox = createTextBox(msgs, rtl);
      phase = attackerPhase;
      phaseTimer = 0;
      return;
    }

    if (isHaze) {
      const moveName = getMoveDisplayName(m.id);

      runMoveLifecycle({
        move: m,
        attackerActor: actor,
        defenderActor,
        context: battleAnimationContext,
        hitTarget: true,
        overrideNextPhase: attackerPhase,

        onImpact: () => {
          attackerBattleState.statModifiers = createEmptyBattleStatModifiers();
          defenderBattleState.statModifiers = createEmptyBattleStatModifiers();

          syncAttackerBar();
          syncDefenderBar();

          return {
            endMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.hazeCleared'),
            ],
          };
        },
      });
      return;
    }

    if (isChargeRelease) {
      clearChargingMove(attackerBattleState);
      if (attackerBattleState.invulnerableState !== null) {
        attackerBattleState.invulnerableState = null;
        animationDirector.setActorState(actor, { x: 0, y: 0, alpha: 1, scaleX: 1, scaleY: 1, rotation: 0 });
      }
    }
    applyPostMoveTurnFlags(attackerBattleState, m.id);

    // Snore: fails if not asleep (move ID 173)
    if (m.id === 173 && attackerBattleState.majorStatus !== 'sleep') {
      const msgs = [
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
        t('battle.nothingHappened'),
      ];
      textBox = createTextBox(msgs, rtl);
      phase = attackerPhase;
      phaseTimer = 0;
      return;
    }

    // Focus Punch: fails if the attacker took damage this turn
    if (isFocusPunch && attackerBattleState.turnFlags.tookDamageThisTurn) {
      const msgs = [
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
        t('battle.focusPunchFailed', { name: attackerName }),
      ];
      textBox = createTextBox(msgs, rtl);
      phase = attackerPhase;
      phaseTimer = 0;
      return;
    }

    // Substitute: attacker creates a doll at 1/4 max HP cost
    if (isSubstitute) {
      const cost = Math.floor(attacker.maxHp / 4);

      runMoveLifecycle({
        move: m,
        attackerActor: actor,
        defenderActor,
        context: battleAnimationContext,
        hitTarget: false,
        overrideNextPhase: attackerPhase,

        canExecute: () => {
          if (attackerBattleState.substituteActive) {
            audio.playSFX('menu-cancel');
            return {
              success: false,
              errorMessages: [
                ...turnEffectLines,
                t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
                t('battle.substituteAlreadyActive', { name: attackerName }),
              ],
            };
          }
          if (attacker.hp <= cost) {
            audio.playSFX('menu-cancel');
            return {
              success: false,
              errorMessages: [
                ...turnEffectLines,
                t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
                t('battle.substituteTooWeak', { name: attackerName }),
              ],
            };
          }
          return null;
        },

        // All state updates and UI bar refreshes execute cleanly on impact
        onImpact: () => {
          attacker.hp -= cost;
          setHP(attackerHpBar, attacker.hp);
          attackerBattleState.substituteActive = true;
          attackerBattleState.substituteHitsAbsorbed = 0;

          syncAttackerBar();

          return {
            endMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
              t('battle.substituteCreated', { name: attackerName }),
            ],
          };
        },
      });
      return;
    }

    // spite
    const isCutPP = moveBattleData?.behaviorTags?.includes('cut-pp') ?? false;

    if (isCutPP) {
      const moveName = getMoveDisplayName(m.id);
      const lastMoveUsedId = defenderBattleState.lastMoveUsedId;
      const lastMove = defender.moves.find((mv) => mv.id === lastMoveUsedId);

      runMoveLifecycle({
        move: m,
        attackerActor: actor,
        defenderActor,
        context: battleAnimationContext,
        hitTarget: true,
        overrideNextPhase: attackerPhase,
        canExecute: () => {
          if (lastMoveUsedId !== null || (lastMove && lastMove.currentPp > 0)) {
            return null;
          }

          return {
            success: false,
            errorMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.noMoveToCut'),
            ],
          };
        },
        onImpact: () => {
          if (!lastMove || lastMove.currentPp <= 0) return { endMessages: [] };
          const cutAmount = Math.min(4, lastMove!.currentPp);
          lastMove.currentPp -= cutAmount;
          return {
            endMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.cutPP', { name: defenderName, move: getMoveDisplayName(lastMove.id), amount: cutAmount }),
            ],
          };
        },
      });
      return;
    }

    // Belly Drum: costs 50% max HP, raises Attack to max — fails if HP ≤ 50%
    if (isBellyDrum) {
      const cost = Math.floor(attacker.maxHp / 2);
      const moveName = getMoveDisplayName(m.id);

      runMoveLifecycle({
        move: m,
        attackerActor: actor,
        defenderActor,
        context: battleAnimationContext,
        hitTarget: false,
        overrideNextPhase: attackerPhase,
        canExecute: () => {
          if (attacker.hp <= cost) {
            audio.playSFX('menu-cancel');

            return {
              success: false,
              errorMessages: [
                ...turnEffectLines,
                t('battle.usedMove', { name: attackerName, move: moveName }),
                t('battle.bellyDrumTooWeak', { name: attackerName }),
              ],
            };
          }
          return null;
        },

        onImpact: () => {
          // 1. Deduct HP and update UI elements
          attacker.hp = Math.max(1, attacker.hp - cost);
          setHP(attackerHpBar, attacker.hp);
          syncAttackerBar();

          // 2. Compute ability effects and apply stat modifications
          const attackerHasContrary = attacker.abilityId
            ? getAbilityBattleEffects(attacker.abilityId).some((e) => e.kind === 'contraryStatChanges')
            : false;

          const statChanges = applyStatChanges(
            attackerBattleState,
            moveBattleData!.statChanges,
            'user',
            Math.random,
            attackerHasContrary,
          );

          // 3. Trigger immediate floating text feedback
          spawnDamageNumber(`-${cost}`, attackerSprite.x + attackerSprite.w / 2, attackerSprite.y + 10, '#f8d858');

          // 4. Trigger visual screen feedback
          flash = createFlash('#fff29a', 0.12);
          shake = createShake(1.4, 0.18);

          // 5. Return array of final UI text lines to progress to the attacker phase
          return {
            endMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.bellyDrumCost', { name: attackerName }),
              ...statChanges.map((c) => getStatChangeLine(attackerName, c)),
            ],
          };
        },
      });
      return;
    }

    // Baton Pass: save substitute state for incoming Pokemon
    // !TODO: baton pass on the enemy side is not yet verified — test enemy carryover
    if (isBatonPass) {
      if (attackerBattleState.substituteActive) {
        pendingSubstituteCarryover = {
          active: true,
          hitsAbsorbed: attackerBattleState.substituteHitsAbsorbed,
        };
        attackerBattleState.substituteActive = false;
      }
      const msgs = [...turnEffectLines, t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) })];
      textBox = createTextBox(msgs, rtl);
      phase = attackerPhase;
      phaseTimer = 0;
      return;
    }

    // Magic Coat: attacker cloaks themselves to reflect status moves this turn
    if (isMagicCoat) {
      const moveName = getMoveDisplayName(m.id);

      runMoveLifecycle({
        move: m,
        attackerActor: actor,
        defenderActor,
        context: battleAnimationContext,
        hitTarget: false,
        overrideNextPhase: attackerPhase,
        onImpact: () => {
          attackerBattleState.turnFlags.magicCoatActive = true;
          return {
            endMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.magicCoatActive', { name: attackerName }),
            ],
          };
        },
      });
      return;
    }

    // Destiny Bond: mark the defender with the bond — if defender kills attacker before attacker acts again, defender also faints
    if (isDestinyBond) {
      const moveName = getMoveDisplayName(m.id);

      runMoveLifecycle({
        move: m,
        attackerActor: actor,
        defenderActor,
        context: battleAnimationContext,
        hitTarget: false,
        overrideNextPhase: attackerPhase,

        onImpact: () => {
          defenderBattleState.destinyBonded = true;
          syncDefenderBar();

          return {
            endMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              t('battle.destinyBondActive', { name: defenderName }),
            ],
          };
        },
      });
      return;
    }

    if (isProtect || isEndure) {
      const moveName = getMoveDisplayName(m.id);

      runMoveLifecycle({
        move: m,
        attackerActor: actor,
        defenderActor,
        context: battleAnimationContext,
        hitTarget: false,
        overrideNextPhase: attackerPhase,

        onImpact: () => {
          if (isProtect) {
            attackerBattleState.turnFlags.protected = true;
            syncAttackerBar();
          }
          if (isEndure) {
            attackerBattleState.turnFlags.endured = true;
          }

          return {
            endMessages: [
              ...turnEffectLines,
              t('battle.usedMove', { name: attackerName, move: moveName }),
              isProtect ? t('battle.protected', { name: attackerName }) : t('battle.endured', { name: attackerName }),
            ],
          };
        },
      });
      return;
    }

    // Defender is protected — block the attack entirely
    if (doesMoveTargetOpponent(moveBattleData) && defenderBattleState.turnFlags.protected) {
      const msgs = [
        ...turnEffectLines,
        t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }),
        t('battle.protectedBlock', { name: defenderName }),
      ];
      textBox = createTextBox(msgs, rtl);
      phase = attackerPhase;
      phaseTimer = 0;
      return;
    }

    if (isCounter || isMirrorCoat) {
      const moveName = getMoveDisplayName(m.id);
      const counterDamage = isCounter
        ? attackerBattleState.turnFlags.physicalDamageTakenThisTurn * 2
        : attackerBattleState.turnFlags.specialDamageTakenThisTurn * 2;

      runMoveLifecycle({
        move: m,
        attackerActor: actor,
        defenderActor,
        context: battleAnimationContext,
        hitTarget: true,
        overrideNextPhase: attackerPhase,

        canExecute: () => {
          if (counterDamage <= 0 || defender.hp <= 0) {
            audio.playSFX('menu-cancel');
            return {
              success: false,
              errorMessages: [
                ...turnEffectLines,
                t('battle.usedMove', { name: attackerName, move: moveName }),
                t('battle.counterFailed', { name: attackerName }),
              ],
            };
          }
          return null;
        },

        onImpact: () => {
          applyMoveImpact(
            defender,
            m,
            defenderHpBar,
            defenderSprite.x + defenderSprite.w / 2,
            defenderSprite.y + 10,
            counterDamage,
            false,
          );

          return {
            endMessages: [...turnEffectLines, t('battle.usedMove', { name: attackerName, move: moveName })],
          };
        },
      });
      return;
    }

    const damageClass = moveData?.damageClass ?? (m.power > 0 ? 'physical' : 'status');
    const weatherAccOverride = battleWeather ? getWeatherAccuracyOverride(m.id, battleWeather.type) : null;
    let hitResult = doesMoveTargetOpponent(moveBattleData)
      ? doesMoveHit(weatherAccOverride ?? m.accuracy, attackerBattleState, defenderBattleState)
      : { hit: true, chance: 100 };
    // Invulnerability check (Fly / Dig charge turn) — only for moves that target opponent
    if (hitResult.hit && doesMoveTargetOpponent(moveBattleData) && defenderBattleState.invulnerableState !== null) {
      const isDigBypass = m.id === 89 || m.id === 90 || isMagnitude; // Earthquake, Fissure, Magnitude
      const neverMisses = m.accuracy <= 0 || m.accuracy === null;
      const bothAirborne =
        attackerBattleState.invulnerableState === 'airborne' && defenderBattleState.invulnerableState === 'airborne';
      if (!neverMisses && !(defenderBattleState.invulnerableState === 'underground' && isDigBypass) && !bothAirborne) {
        hitResult = { hit: false, chance: 0 };
      }
    }

    const hasBypassImmunity = moveBattleData?.effects?.find((effect) => effect.bayPassImuunity) ?? false;
    const targetTypeImmune =
      hitResult.hit &&
      doesMoveTargetOpponent(moveBattleData) &&
      isTargetImmuneToMoveType(defender, m.type) &&
      !hasBypassImmunity;
    let magnitudeLevel = 0;
    if (isMagnitude) {
      const roll = Math.random() * 100;
      if (roll < 20) {
        magnitudeLevel = 1;
        m = { ...m, power: 20 };
      } else if (roll < 35) {
        magnitudeLevel = 2;
        m = { ...m, power: 30 };
      } else if (roll < 75) {
        magnitudeLevel = 3;
        m = { ...m, power: 60 };
      } else if (roll < 95) {
        magnitudeLevel = 4;
        m = { ...m, power: 90 };
      } else {
        magnitudeLevel = 5;
        m = { ...m, power: 120 };
      }
    }

    const isReversal = moveBattleData?.behaviorTags?.includes('reversal') ?? false;
    if (isReversal) {
      const power = Math.max(1, attacker.maxHp - attacker.hp);
      m = { ...m, power };
    }

    // Return / Frustration: power derived from happiness (enemy has no party — uses itself)
    if (m.id === RETURN_MOVE_ID || m.id === FRUSTRATION_MOVE_ID) {
      const h =
        actor === 'player' ? calcHappiness(attacker, getPlayerData().party) : calcHappiness(attacker, [attacker]);
      m = { ...m, power: m.id === RETURN_MOVE_ID ? getReturnPower(h) : getFrustrationPower(h) };
    }
    const movePower = isWeightTarget
      ? getWeightTargetPower(computePokemonSize(defender).weightKg)
      : isWeightRatio
        ? getWeightRatioPower(computePokemonSize(attacker).weightKg, computePokemonSize(defender).weightKg)
        : m.power;
    const absorbed = hitResult.hit && !targetTypeImmune && movePower > 0 && doesAbilityAbsorbMove(defender, m.type);
    // Dream Eater: blocked if target is not asleep
    const dreamEaterBlocked = isDreamEater && defender.status !== 'sleep';
    const attackerHappiness =
      actor === 'player'
        ? hasActiveGame()
          ? calcHappiness(attacker, getPlayerData().party)
          : 0
        : calcHappiness(attacker, [attacker]);
    const criticalHit =
      hitResult.hit && !targetTypeImmune && !dreamEaterBlocked && movePower > 0 && !absorbed
        ? rollCriticalHit(m.id, defender, Math.random, attackerBattleState, getHappinessCritBonus(attackerHappiness))
        : false;
    // Facade: double power when user has a status condition
    const facadeActive =
      isFacadeBoost && attacker.status !== null && ['burn', 'paralyze', 'poison'].includes(attacker.status as string);
    const rawPower = facadeActive ? movePower * 2 : movePower;
    const digPowerBoost =
      rawPower > 0 &&
      defenderBattleState.invulnerableState === 'underground' &&
      (m.id === 89 || m.id === 90 || isMagnitude)
        ? 2
        : 1;
    const effectivePower =
      (battleWeather && rawPower > 0
        ? Math.max(1, Math.round(rawPower * getWeatherPowerMultiplier(m.type, battleWeather.type)))
        : rawPower) * digPowerBoost;
    // Foul Play: use target's attack stat
    const foulPlayAttackStat = isFoulPlay ? getModifiedStatValue(defender, defenderBattleState, 'attack') : undefined;
    // Compute animation profile to determine suppressAudio for multi-hit
    const atkAnimProfile = (() => {
      const md = moveData;
      return getAttackAnimationProfile({
        name: md?.name ?? { en: m.name, he: m.name },
        type: m.type,
        power: m.power,
        damageClass: md?.damageClass ?? (m.power > 0 ? 'physical' : 'status'),
        speciesId: attacker.id,
      });
    })();
    const suppressHitAudio = hitCount > 1 && atkAnimProfile.family === 'lunge';
    const plannedDamage = (() => {
      if (!hitResult.hit || targetTypeImmune || absorbed || dreamEaterBlocked) return 0;
      if (isOhko) return defender.hp;
      if (isNightShade) return attacker.level;
      if (isSuperFang) return Math.max(1, Math.floor(defender.hp / 2));
      if (effectivePower <= 0) return 0;
      const base = calcDamage(
        attacker,
        attackerBattleState,
        defender,
        defenderBattleState,
        defenderSideState,
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
      ((!isOhko && effectivePower <= 0) || plannedDamage < defender.hp);
    const targetCanStillAct = actor === 'player' ? !enemyAlreadyAttacked : enemyGoesFirst;
    const resolvedEffectLines = hitResult.hit
      ? applyResolvedMoveEffects(
          attacker,
          attackerBattleState,
          attackerSideState,
          attackerName,
          defender,
          defenderBattleState,
          defenderSideState,
          defenderName,
          m,
          allowTargetEffects,
          targetCanStillAct,
          defenderBattleState.turnFlags.magicCoatActive,
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
    if (isRedirected) {
      msgs.push(t('battle.usedMove', { name: attackerName, move: originalMoveName }));
      if (redirectMsg) msgs.push(redirectMsg);
    }
    msgs.push(t('battle.usedMove', { name: attackerName, move: getMoveDisplayName(m.id) }));
    if (isMagnitude && magnitudeLevel > 0) {
      msgs.push(t('battle.magnitudeLevel', { level: magnitudeLevel, power: m.power }));
    }
    // Weather effect on this move
    if (battleWeather && doesMoveTargetOpponent(moveBattleData)) {
      const wName = getWeatherDisplayName(battleWeather.type);
      const wMult = getWeatherPowerMultiplier(m.type, battleWeather.type);
      if (rawPower > 0 && wMult > 1)
        msgs.push(t('battle.weatherPowerBoosted', { weather: wName, move: getMoveDisplayName(m.id) }));
      else if (rawPower > 0 && wMult < 1)
        msgs.push(t('battle.weatherPowerReduced', { weather: wName, move: getMoveDisplayName(m.id) }));
      if (weatherAccOverride === 0)
        msgs.push(t('battle.weatherAccuracyMax', { weather: wName, move: getMoveDisplayName(m.id) }));
    }

    if (effectivePower > 0) {
      if (dreamEaterBlocked) {
        msgs.push(t('battle.dreamEaterFailed'));
        audio.playSFX('menu-cancel');
      } else if (!hitResult.hit) {
        const messages = [
          { msg: 'battle.moveMissed', name: attackerName },
          { msg: 'battle.targetDogged', name: defenderName },
        ];
        const randomIndex = Math.random() > 0.5 ? 0 : 1;
        msgs.push(t(messages[randomIndex].msg, { name: messages[randomIndex].name }));
      } else {
        if (criticalHit) {
          msgs.push(t('battle.criticalHit'));
        }
        const et = effText(m.type, defender.types);
        if (et) msgs.push(et);
        if (plannedDamage > 0 && defender.abilityId !== null) {
          const abilityMsg = getDefenderAbilityActivationMsg(
            defender,
            defenderBattleState,
            getAbilityBattleEffects(defender.abilityId),
            m.type,
            defenderName,
          );
          if (abilityMsg) msgs.push(abilityMsg);
        }
        if (isWeightTarget || isWeightRatio) {
          const moveName = getMoveDisplayName(m.id);
          if (isWeightTarget) {
            const wStr = computePokemonSize(defender).weightKg.toFixed(1);
            if (movePower <= 40)
              msgs.push(t('battle.weightTargetWeak', { target: defenderName, weight: wStr, move: moveName }));
            else if (movePower <= 80)
              msgs.push(t('battle.weightTargetMedium', { target: defenderName, weight: wStr, move: moveName }));
            else msgs.push(t('battle.weightTargetStrong', { target: defenderName, weight: wStr, move: moveName }));
          } else {
            if (movePower <= 40) msgs.push(t('battle.weightRatioWeak', { move: moveName }));
            else if (movePower <= 80)
              msgs.push(t('battle.weightRatioMedium', { attacker: attackerName, move: moveName }));
            else
              msgs.push(
                t('battle.weightRatioStrong', { attacker: attackerName, target: defenderName, move: moveName }),
              );
          }
        }
      }
    } else if (isOhko && hitResult.hit && !targetTypeImmune) {
      msgs.push(t('battle.ohkoHit'));
    } else if ((isSuperFang || isNightShade) && hitResult.hit && !targetTypeImmune) {
      if (isSuperFang) msgs.push(t('battle.superFangHit'));
    } else if (!hitResult.hit) {
      const messages = [
        { msg: 'battle.moveMissed', name: attackerName },
        { msg: 'battle.targetDogged', name: defenderName },
      ];
      const randomIndex = Math.random() > 0.5 ? 0 : 1;
      msgs.push(t(messages[randomIndex].msg, { name: messages[randomIndex].name }));
    } else if (targetTypeImmune) {
      msgs.push(t('battle.noEffect'));
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
      if (!defenderSideState.stealthRockActive) {
        msgs.push(t('battle.stealthRockSet'));
      } else {
        msgs.push(t('battle.hazardAlreadySet'));
      }
    } else if (isSpikes) {
      if (defenderSideState.spikesLayers < 3) {
        msgs.push(t('battle.spikesSet'));
      } else {
        msgs.push(t('battle.hazardAlreadySet'));
      }
    } else if (isToxicSpikes) {
      if (defenderSideState.toxicSpikesLayers < 2) {
        msgs.push(t('battle.toxicSpikesSet'));
      } else {
        msgs.push(t('battle.hazardAlreadySet'));
      }
    } else if (isWeatherMove) {
      const newWeatherType: WeatherConditionId = isSandstormMove
        ? 'sandstorm'
        : isRainDanceMove
          ? 'rain'
          : isSunnyDayMove
            ? 'sun'
            : 'hail';
      if (battleWeather?.type === newWeatherType) {
        const alreadyActiveKeys: Record<WeatherConditionId, string> = {
          sandstorm: 'battle.sandstormAlreadyActive',
          rain: 'battle.rainAlreadyActive',
          sun: 'battle.sunAlreadyActive',
          hail: 'battle.hailAlreadyActive',
        };
        msgs.push(t(alreadyActiveKeys[newWeatherType]));
      } else {
        const prevWeatherType = battleWeather?.type ?? null;
        if (prevWeatherType) {
          msgs.push(
            t('battle.weatherOverride', {
              new: getWeatherDisplayName(newWeatherType),
              old: getWeatherDisplayName(prevWeatherType),
            }),
          );
        }
        const boostMsgs = activateWeather(newWeatherType, actor);
        msgs.push(getWeatherStartedLine(newWeatherType));
        msgs.push(...boostMsgs);
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

    // Lock-in teardown messages
    if (lockInOutrageFinalTurn) {
      msgs.push(t('battle.lockInOutrageStopped', { name: attackerName }));
    }
    if (lockInUproarFinalTurn) {
      msgs.push(t('battle.lockInUproarStopped', { name: attackerName }));
    }
    // Defender Rage: if defender is raging and was hit, its Attack rises
    const defenderRageBoost = hitResult.hit && plannedDamage > 0 && defenderBattleState.rageActive;
    if (defenderRageBoost) {
      msgs.push(t('battle.lockInRageBoost', { name: defenderName }));
    }

    // Brick Break: will shatter defender screens on impact
    if (isBrickBreak && hitResult.hit && plannedDamage > 0) {
      const hadScreens = defenderSideState.reflectTurnsRemaining > 0 || defenderSideState.lightScreenTurnsRemaining > 0;
      if (hadScreens) {
        msgs.push(t('battle.brickBreakShatter'));
      }
    }
    // Rapid Spin: will clear own hazards + leech seed on impact
    if (isRapidSpinClear && hitResult.hit && plannedDamage > 0) {
      const hadHazards =
        attackerSideState.stealthRockActive ||
        attackerSideState.spikesLayers > 0 ||
        attackerSideState.toxicSpikesLayers > 0;
      const hadSeed = attackerBattleState.leechSeeded;
      if (hadHazards || hadSeed) {
        msgs.push(t('battle.rapidSpinClear', { name: attackerName }));
      }
    }
    // Defog: will clear all hazards and screens
    if (isDefog) {
      msgs.push(t('battle.defogClear'));
    }

    // Contact ability: defender ability may inflict status or recoil on attacker when hit by physical move
    const contactEffectsOnAttacker: Array<{ status: import('../../types/battle-metadata.js').MajorStatusId }> = [];
    let attackerContactRecoil = 0;
    if (hitResult.hit && damageClass === 'physical' && plannedDamage > 0 && defender.abilityId !== null) {
      const defenderAbilityEffects = getAbilityBattleEffects(defender.abilityId);
      for (const effect of defenderAbilityEffects) {
        if (effect.kind === 'contactStatusChance' && !attacker.status && Math.random() * 100 < effect.chance) {
          contactEffectsOnAttacker.push({ status: effect.status });
          const statusLine = getStatusAppliedLine(attackerName, effect.status);
          if (statusLine) msgs.push(statusLine);
        }
        if (effect.kind === 'contactRecoilDamage') {
          attackerContactRecoil += Math.max(1, Math.floor((attacker.maxHp * effect.damagePercent) / 100));
        }
      }
    }

    // Substitute: precompute message based on planned damage (only for damaging moves)
    if (
      hitResult.hit &&
      plannedDamage > 0 &&
      doesMoveTargetOpponent(moveBattleData) &&
      defenderBattleState.substituteActive
    ) {
      const attackerMoveName = moveData?.name?.en ?? m.name;
      if (!isSubstituteBypass(attackerMoveName, attacker.abilityId)) {
        const subThreshold = Math.floor(defender.maxHp / 4);
        if (plannedDamage >= subThreshold) {
          msgs.push(t('battle.substituteDestroyed'));
        } else {
          msgs.push(t('battle.substituteAbsorbed'));
        }
      } else if (plannedDamage > 0) {
        msgs.push(t('battle.substituteBypassed'));
      }
    }

    // Entry hazards: update state (Magic Coat redirects hazards back to attacker's side)
    const hazardReflectedByDefender =
      defenderBattleState.turnFlags.magicCoatActive && m.power <= 0 && (isStealthRock || isSpikes || isToxicSpikes);
    const hazardTargetState = hazardReflectedByDefender ? attackerSideState : defenderSideState;
    const syncHazardBar = hazardReflectedByDefender ? syncAttackerBar : syncDefenderBar;
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
      attacker,
      actor,
      defenderActor,
      m,
      animationDirector,
      audio,
      battleAnimationContext,
      () => {
        // Rest: full heal + sleep 2 turns + all PP restored
        if (isRest) {
          applyRestEffect(attacker, attackerBattleState);
          setHP(attackerHpBar, attacker.hp);
          setStatus(attackerHpBar, attacker.status ?? '');
          spawnDamageNumber(
            `+${attacker.maxHp}`,
            attackerSprite.x + attackerSprite.w / 2,
            attackerSprite.y + 10,
            '#48d870',
          );
          audio.playSFX('heal');
        }
        // Heal % moves (Recover, Roost, Milk Drink, etc.)
        if (healPercent !== null) {
          const tags = moveBattleData?.behaviorTags;

          const healed = applyHealPercent(attacker, healPercent, tags);
          if (healed > 0) {
            setHP(attackerHpBar, attacker.hp);
            spawnDamageNumber(`+${healed}`, attackerSprite.x + attackerSprite.w / 2, attackerSprite.y + 10, '#48d870');
            audio.playSFX('heal');
          }
        }
        // Focus Energy: boost crit rate for all future moves
        if (isFocusEnergy) {
          attackerBattleState.critBoost = true;
        }
        if (hitResult.hit) {
          let totalActualDamage = 0;
          const attackerMoveName = moveData?.name?.en ?? m.name;
          const attackerBypassesSub = isSubstituteBypass(attackerMoveName, attacker.abilityId);
          for (let hit = 0; hit < hitCount; hit++) {
            if (defender.hp <= 0) break;
            const popupY = defenderSprite.y + 10 - hit * 5;
            if (
              plannedDamage > 0 &&
              defenderBattleState.substituteActive &&
              !attackerBypassesSub &&
              doesMoveTargetOpponent(moveBattleData)
            ) {
              const threshold = Math.floor(defender.maxHp / 4);
              if (plannedDamage >= threshold) {
                defenderBattleState.substituteActive = false;
                defenderBattleState.substituteHitsAbsorbed = 0;
                substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: defenderActor };
              } else {
                defenderBattleState.substituteHitsAbsorbed++;
                substituteDollFlash = { timer: 0, duration: 0.3, color: '#ffffff', side: defenderActor };
                if (defenderBattleState.substituteHitsAbsorbed >= 2) {
                  defenderBattleState.substituteActive = false;
                  defenderBattleState.substituteHitsAbsorbed = 0;
                  substituteDollFlash = { timer: 0, duration: 0.4, color: '#ff4040', side: defenderActor };
                }
              }
              continue;
            }
            totalActualDamage += applyMoveImpact(
              defender,
              m,
              defenderHpBar,
              defenderSprite.x + defenderSprite.w / 2,
              popupY,
              plannedDamage,
              suppressHitAudio,
            );
          }
          // Endure: defender survives lethal hit at 1 HP
          if (defender.hp <= 0 && defenderBattleState.turnFlags.endured) {
            defender.hp = 1;
            setHP(defenderHpBar, 1);
          }
          const actualDamage = totalActualDamage;
          if (actualDamage > 0) {
            defenderBattleState.turnFlags.tookDamageThisTurn = true;
            if (damageClass === 'physical') defenderBattleState.turnFlags.physicalDamageTakenThisTurn += actualDamage;
            else if (damageClass === 'special')
              defenderBattleState.turnFlags.specialDamageTakenThisTurn += actualDamage;
            // Rage: defender is in Rage and was hit — boost its Attack
            if (defenderRageBoost) {
              defenderBattleState.statModifiers.attack = applyBattleStatDelta(
                defenderBattleState.statModifiers.attack,
                1,
              );
            }
            const drained = applyDrainHealing(attacker, actualDamage, moveBattleData?.drainPercent ?? null);
            if (drained > 0) {
              setHP(attackerHpBar, attacker.hp);
              spawnDamageNumber(
                `+${drained}`,
                attackerSprite.x + attackerSprite.w / 2,
                attackerSprite.y + 10,
                '#48d870',
              );
              audio.playSFX('heal');
            }

            const recoil = applyRecoilDamage(attacker, actualDamage, moveBattleData?.recoilPercent ?? null);
            if (recoil.damage > 0) {
              setHP(attackerHpBar, attacker.hp);
              spawnDamageNumber(
                `-${recoil.damage}`,
                attackerSprite.x + attackerSprite.w / 2,
                attackerSprite.y + 10,
                '#f8d858',
              );
              flash = createFlash('#fff29a', 0.12);
              shake = createShake(1.4, 0.18);
              audio.playSFX('hit');
            }

            // Apply contact ability status effects to the attacker
            for (const contactEffect of contactEffectsOnAttacker) {
              applyMajorStatus(attacker, attackerBattleState, {
                status: contactEffect.status,
                chance: 100,
                target: 'user',
              });
              setStatus(attackerHpBar, attacker.status ?? '');
            }
            // Apply contact recoil damage to the attacker (Rough Skin, Iron Barbs)
            if (attackerContactRecoil > 0 && attacker.hp > 0) {
              attacker.hp = Math.max(0, attacker.hp - attackerContactRecoil);
              setHP(attackerHpBar, attacker.hp);
              spawnDamageNumber(
                `-${attackerContactRecoil}`,
                attackerSprite.x + attackerSprite.w / 2,
                attackerSprite.y + 10,
                '#f84038',
              );
              audio.playSFX('hit');
            }
          }
        }
        if (leaveUserAtOneHp) {
          const selfCost = applyLeaveUserAtOneHpCost(attacker);
          if (selfCost.damage > 0) {
            setHP(attackerHpBar, attacker.hp);
            spawnDamageNumber(
              `-${selfCost.damage}`,
              attackerSprite.x + attackerSprite.w / 2,
              attackerSprite.y + 10,
              '#f8d858',
            );
            flash = createFlash('#fff29a', 0.12);
            shake = createShake(1.4, 0.18);
            audio.playSFX('hit');
          }
        }
        // Destiny Bond: if attacker killed defender and attacker has the bond (defender set it), attacker also faints
        if (defender.hp <= 0 && attackerBattleState.destinyBonded) {
          attackerBattleState.destinyBonded = false;
          attacker.hp = 0;
          setHP(attackerHpBar, 0);
          pendingDestinyBondMsg = t('battle.destinyBondTrigger', { name: attackerName });
        }
        // Brick Break: clear defender screens after hitting
        if (isBrickBreak) {
          clearScreens(defenderSideState);
          syncDefenderBar();
        }
        // Rapid Spin: clear own entry hazards and leech seed after hitting
        if (isRapidSpinClear) {
          clearEntryHazards(attackerSideState);
          attackerBattleState.leechSeeded = false;
          syncAttackerBar();
        }
        // Defog: clear all hazards and screens on both sides
        if (isDefog) {
          clearEntryHazards(attackerSideState);
          clearEntryHazards(defenderSideState);
          clearScreens(attackerSideState);
          clearScreens(defenderSideState);
          syncAttackerBar();
          syncDefenderBar();
        }
        // Lock-in teardown after move completes
        if (lockInOutrageFinalTurn) {
          attackerBattleState.lockedInMoveId = null;
          attackerBattleState.lockInTurnsRemaining = 0;
          attackerBattleState.confusionTurnsRemaining = Math.floor(Math.random() * 4) + 2;
        }
        if (isLockInRollout) {
          if (lockInRolloutFinalTurn || !hitResult.hit) {
            attackerBattleState.lockedInMoveId = null;
            attackerBattleState.rolloutTurnsActive = 0;
          }
        }
        if (lockInUproarFinalTurn) {
          attackerBattleState.lockedInMoveId = null;
          attackerBattleState.uproarTurnsRemaining = 0;
        }
      },
      hitResult.hit && !absorbed && plannedDamage > 0,
      hitCount,
    );
    phase = attackerPhase;
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
          clearSelectedPartyIndex();
          previousLeadId = player.id;
          waitingForParty = true;
          phase = 'WAITING_PARTY';
          const partyScene = createPartyReactScene(stateMachine, {
            kind: 'battle',
            roster: battleRoster,
            maxSize: maxRosterSize,
            inBattleUUID: player.uuid,
          });
          stateMachine.pushDirect('PARTY', partyScene);
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
          const pokedexScene = createPokedexReactScene(stateMachine, {
            kind: 'battle',
            pokemonId: enemy.id,
            tab: 'battle',
          });
          waitingForPokedex = true;
          phase = 'WAITING_POKEDEX';
          stateMachine.pushDirect('POKEDEX', pokedexScene);
        }
      } else {
        textBox = createTextBox([t('battle.cantDoThat')], isRTL());
        phase = 'INTRO';
      }
    } else if (choice === 'RUN') {
      if (isWildNpcBattle) {
        textBox = createTextBox([t('battle.wildNpcCantRun', { name: getPokemonDisplayName(enemy.id) })], isRTL());
        phase = 'INTRO';
      } else if (isTrainerBattle) {
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
    virtualControls: {
      numbers: true,
    },
    enter(): void {
      init();
      // Mark enemy Pokemon as seen in Pokedex
      if (hasActiveGame()) {
        const pd = getPlayerData();
        if (!pd.pokedex[enemy.id]) {
          pd.pokedex[enemy.id] = 'seen';
        }
        if (trainerData) {
          const playerMovesNames = player.moves.map((m) => m.name);
          const trainerMovesNames = trainerData.party.map((p) => p.moves.map((m) => m.name)).flat();
          audio.preloadMoveSFX([...playerMovesNames, ...trainerMovesNames]);
        }
      }

      audio.playMusic('battle');
      if (isTrainerBattle && trainerData && !isWildNpcBattle) {
        // Cinematic intro: challenger music continues playing; textBox + battle music created after animation
        cinematicState = createCinematicState(trainerData);
        // Preload trainer sprite if available

        phase = 'TRAINER_CINEMATIC';
      } else {
        if (isWildNpcBattle) {
          textBox = createTextBox([t('battle.wildAppeared', { name: getPokemonDisplayName(enemy.id) })], isRTL());
        } else if (isTrainerBattle && trainerData) {
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
      }
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
        case 'TRAINER_CINEMATIC': {
          if (!cinematicState || !trainerData) break;
          const trainerCinematicResule = updateTrainerCinematic(cinematicState, dt, trainerData, textBox, input);
          textBox = trainerCinematicResule.textBox;

          if (trainerCinematicResule.done) {
            cinematicState = null;
            if (isTrainerBattle && trainerData) {
              textBox = createTextBox([t('battle.trainerSentOut', { name: getPokemonDisplayName(enemy.id) })], isRTL());
            }
            phase = 'INTRO';
            audio.playMusic('battle');
          }
          break;
        }
        case 'INTRO': {
          if (textBox && updateTextBox(textBox, input, dt)) {
            textBox = null;
            showTrainerSprite = false;
          }

          // held items on switch out
          if (player.heldItemId && player.hp > 0) {
            applyHeldItemEffectInBattle({
              pokemon: player,
              runtimeState: playerBattleState,
              actor: 'player',
              when: 'onSwitchOut',
              lines: [],
              queueStatusTurnEffect: () => {},
            });
          }
          if (enemy.heldItemId && enemy.hp > 0) {
            applyHeldItemEffectInBattle({
              pokemon: enemy,
              runtimeState: enemyBattleState,
              actor: 'enemy',
              when: 'onSwitchOut',
              lines: [],
              queueStatusTurnEffect: () => {},
            });
          }

          if (!textBox) {
            if (pendingEnemySendOutAnimation) {
              if (!animationDirector.isBusy()) startEnemySendOutAnimation();
              break;
            }
            if (pendingWildNpcEntrance) {
              if (!animationDirector.isBusy()) startWildNpcEntranceAnimation();
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
              const weatherSummonMsgs = checkWeatherSummonAbility(player, 'player');
              const weatherEntryBoostMsgs = applyWeatherEntryBoost(playerBattleState, player);
              const switchInStatMsgs = checkSwitchInStatAbility(player, playerBattleState, enemy, enemyBattleState);
              const hazardResult = applyEntryHazards(player, playerBattleState, playerSideState);
              const hazardMsgs = buildHazardMessages(hazardResult, getPokemonDisplayName(player.id), playerSideState);
              const entryMsgs = [...weatherSummonMsgs, ...weatherEntryBoostMsgs, ...switchInStatMsgs, ...hazardMsgs];
              if (entryMsgs.length > 0) {
                setHP(playerHpBar, player.hp);
                setStatus(playerHpBar, player.status ?? '');
                syncPlayerBar();
                textBox = createTextBox(entryMsgs, isRTL());
                break;
              }
            }
            if (pendingEnemyEntryHazard) {
              pendingEnemyEntryHazard = false;
              const weatherSummonMsgs = checkWeatherSummonAbility(enemy, 'enemy');
              const weatherEntryBoostMsgs = applyWeatherEntryBoost(enemyBattleState, enemy);
              const switchInStatMsgs = checkSwitchInStatAbility(enemy, enemyBattleState, player, playerBattleState);
              const hazardResult = applyEntryHazards(enemy, enemyBattleState, enemySideState);
              const hazardMsgs = buildHazardMessages(hazardResult, getPokemonDisplayName(enemy.id), enemySideState);
              const entryMsgs = [...weatherSummonMsgs, ...weatherEntryBoostMsgs, ...switchInStatMsgs, ...hazardMsgs];
              if (entryMsgs.length > 0) {
                setHP(enemyHpBar, enemy.hp);
                setStatus(enemyHpBar, enemy.status ?? '');
                syncEnemyBar();
                textBox = createTextBox(entryMsgs, isRTL());
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

              if (m.currentPp <= 0 && !playerBattleState.isStruggleMode) {
                textBox = createTextBox([t('battle.noPP')], isRTL());
                phase = 'INTRO';
              } else if (m.id === playerBattleState.disabledMoveId) {
                textBox = createTextBox([t('battle.moveIsDisabled', { move: getMoveDisplayName(m.id) })], isRTL());
                phase = 'INTRO';
              } else {
                if (!handleTrainerTurnPriority()) {
                  if (trainerAIState) trainerAIState.justSwitchedIn = false;
                  enemySelectedMoveIndex = getPlannedEnemyMoveIndex();
                  const enemyMove = enemy.moves[enemySelectedMoveIndex] ?? enemy.moves[0];
                  const turnOrder = determineTurnOrder(
                    player,
                    playerBattleState,
                    m.id,
                    enemy,
                    enemyBattleState,
                    enemyMove.id,
                    Math.random,
                    battleWeather?.type,
                  );
                  enemyGoesFirst = turnOrder.enemyActsFirst;
                  if (enemyGoesFirst) {
                    // enemyTurn();
                    doAttack({ actor: 'enemy' });
                  } else {
                    doAttack({ actor: 'player' });
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
            playerBattleState.heldItem?.effect.config?.condition?.({
              runtimeState: playerBattleState,
              pokemon: player,
            });
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
              // doAttack(forcedMoveIndex ?? undefined);
              doAttack({ forcedMoveIndex: forcedMoveIndex ?? undefined, actor: 'player' });
            } else {
              pendingForcedPlayerMoveIndex = null;
              startEndTurnStatusPhase();
            }
          }
          break;
        }
        case 'CHECK_WIN': {
          if (enemy.hp <= 0) {
            enemy.status = null;
            enemyBattleState.majorStatus = null;
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
            // } else enemyTurn();
          } else doAttack({ actor: 'enemy' });
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
              const weatherSummonMsgs = checkWeatherSummonAbility(enemy, 'enemy');
              const weatherEntryBoostMsgs = applyWeatherEntryBoost(enemyBattleState, enemy);
              const switchInStatMsgs = checkSwitchInStatAbility(enemy, enemyBattleState, player, playerBattleState);
              const hazardResult = applyEntryHazards(enemy, enemyBattleState, enemySideState);
              const hazardMsgs = buildHazardMessages(hazardResult, getPokemonDisplayName(enemy.id), enemySideState);
              const entryMsgs = [...weatherSummonMsgs, ...weatherEntryBoostMsgs, ...switchInStatMsgs, ...hazardMsgs];
              if (entryMsgs.length > 0) {
                setHP(enemyHpBar, enemy.hp);
                setStatus(enemyHpBar, enemy.status ?? '');
                syncEnemyBar();
                textBox = createTextBox(entryMsgs, isRTL());
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
            clearSelectedPartyIndex();
            previousLeadId = player.id;
            waitingForParty = true;
            isForcedFaintSwitch = true; // don't give enemy a free attack after faint switch
            phase = 'WAITING_PARTY';
            const partyScene = createPartyReactScene(stateMachine, {
              kind: 'battle',
              maxSize: maxRosterSize,
              roster: battleRoster,
              inBattleUUID: null,
            });
            stateMachine.pushDirect('PARTY', partyScene);
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

          // quick actions buttons - on consume it continues to the next phase (switch or cancel)
          if (bagPendingItem) {
            console.info('Bag item selected while in PARTY phase, switching to WAITING_BAG');
            waitingForBag = true;
            phase = 'WAITING_BAG';
            return;
          }

          if (selectedPartyIndex >= 0 && hasActiveGame() && !bagPendingItem) {
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
                // activate abilities of switching out such as regenerator or refresh
                const switchOutMsgs = activateSwitchingOutAbilities(prevPokemon);
                switchMsgs.push(...switchOutMsgs);
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
              clearSelectedPartyIndex();
              waitingForParty = true;
              isForcedFaintSwitch = true;
              const partyScene = createPartyReactScene(stateMachine, {
                kind: 'battle',
                maxSize: maxRosterSize,
                roster: battleRoster,
                inBattleUUID: null,
              });
              stateMachine.pushDirect('PARTY', partyScene);
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
              const weatherSummonMsgs = checkWeatherSummonAbility(player, 'player');
              const weatherEntryBoostMsgs = applyWeatherEntryBoost(playerBattleState, player);
              const switchInStatMsgs = checkSwitchInStatAbility(player, playerBattleState, enemy, enemyBattleState);
              const hazardResult = applyEntryHazards(player, playerBattleState, playerSideState);
              const hazardMsgs = buildHazardMessages(hazardResult, getPokemonDisplayName(player.id), playerSideState);
              const entryMsgs = [...weatherSummonMsgs, ...weatherEntryBoostMsgs, ...switchInStatMsgs, ...hazardMsgs];
              if (entryMsgs.length > 0) {
                setHP(playerHpBar, player.hp);
                setStatus(playerHpBar, player.status ?? '');
                syncPlayerBar();
                textBox = createTextBox(entryMsgs, isRTL());
                break;
              }
            }
            if (isForcedFaintSwitch) {
              isForcedFaintSwitch = false;
              enterSelectMovePhase();
            } else {
              enemySelectedMoveIndex = -1;
              // enemyTurn();
              doAttack({ actor: 'enemy' });
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
          if (!textBox && !isHPAnimating(playerHpBar)) doAttack({ actor: 'enemy' });
          playerBattleState.lastMoveUsedId = null;
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

      // ── Trainer cinematic intro ──
      if (phase === 'TRAINER_CINEMATIC') {
        if (cinematicState) {
          renderTrainerCinematic(ctx, cinematicState, trainerData);
        }
        if (textBox) {
          renderTextBox(ctx, textBox);
        }
        return;
      }

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
      const showingTrainer = showTrainerSprite && isTrainerBattle;

      // ── Enemy Pokemon sprite (right side) ──
      if (!showingTrainer) {
        const enemySprite = getCachedImage(`/sprites/pokemon/front/${enemy.id}.png`);
        if (enemySprite) {
          if (enemyBattleState?.substituteActive) ctx.globalAlpha = 0.45;
          const glitchFlicker = enemy.isGlitched && Date.now() % 1800 < 90;
          if (glitchFlicker) {
            ctx.save();
            ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3);
          }
          renderActorImage(
            ctx,
            'enemy',
            enemySprite,
            BTL.OPP_SPRITE.x,
            BTL.OPP_SPRITE.y,
            BTL.OPP_SPRITE.w,
            BTL.OPP_SPRITE.h,
          );
          if (glitchFlicker) ctx.restore();
          ctx.globalAlpha = 1;
          // Persistent glitch tint
          if (enemy.isGlitched) {
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#7b00ff';
            ctx.fillRect(BTL.OPP_SPRITE.x, BTL.OPP_SPRITE.y, BTL.OPP_SPRITE.w, BTL.OPP_SPRITE.h);
            ctx.restore();
          }
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

      // Night overlay — covers battle field only, not HP bars / menu below
      if (battleIsOutdoor && !isDaytime()) {
        renderNightOverlay(ctx, 240, BTL.FIELD_H);
      }

      // ── Info panels ──
      setXP(playerHpBar, player.xp, player.xpToNext);
      const playerParty = hasActiveGame() ? getPlayerData().party : null;
      renderHPBar(
        ctx,
        enemyHpBar,
        isTrainerBattle && trainerData
          ? {
              party: trainerData.party,
              totalSlots: trainerData.party.length,
              revealedCount: trainerAIState?.seenPokemonIds.size ?? 0,
            }
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

    // Weather overlay (rendered first, underneath everything else)
    if (battleWeather) {
      renderWeatherOverlay(ctx, battleWeather.type, now);
    }

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
