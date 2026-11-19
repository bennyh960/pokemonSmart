import type { Pokemon } from '../types/index.js';
import type {
  BattleStatId,
  MajorStatusId,
  MoveBattleSideEffectId,
  WeatherConditionId,
} from '../types/battle-metadata.js';
import { normalizeMajorStatusId } from '../types/battle-metadata.js';
import type { HeldItemDef } from '../data/item-defs.js';

export interface WeatherState {
  type: WeatherConditionId;
  turnsRemaining: number;
  setter: 'player' | 'enemy' | null;
}

export const BATTLE_STAT_PERCENT_STEP = 50;
export const MIN_BATTLE_STAT_PERCENT = -200;
export const MAX_BATTLE_STAT_PERCENT = 200;

export type BattleStatModifiers = Record<BattleStatId, number>;

export interface BattleTurnFlags {
  flinched: boolean;
  mustRecharge: boolean;
  protected: boolean;
  endured: boolean;
  charging: boolean;
  skipTurn: boolean;
  tookDamageThisTurn: boolean;
  physicalDamageTakenThisTurn: number;
  specialDamageTakenThisTurn: number;
  magicCoatActive: boolean;
  /** Switched in by choice this turn (Pursuit hits it ×2). */
  switchedInThisTurn: boolean;
}

export interface BattlePokemonRuntimeState {
  majorStatus: MajorStatusId | null;
  sleepTurnsRemaining: number;
  freezeTurnsRemaining: number;
  badlyPoisonTurns: number;
  confusionTurnsRemaining: number;
  /** uuid of the Pokémon this one is infatuated with (Attract). Ends when that Pokémon leaves battle. */
  infatuatedWith: string | null;
  leechSeeded: boolean;
  curseActive: boolean;
  trappedTurnsRemaining: number;
  trapDamagePercent: number | null;
  chargingMoveId: number | null;
  invulnerableState: 'airborne' | 'underground' | null;
  lockedInMoveId: number | null;
  softLockedInMovesId: number[] | null; // e.g. choice spec
  lockInTurnsRemaining: number;
  rolloutTurnsActive: number;
  rageActive: boolean;
  /** Bide: storing turns left (0 = not biding) and damage taken from moves while storing. */
  bideTurnsRemaining: number;
  bideDamage: number;
  /** Nightmare: loses 1/4 max HP each turn while asleep. */
  nightmare: boolean;
  /** Mean Look: uuid of the Pokémon that blocks this one from switching / running (ends when it leaves). */
  blockedBy: string | null;
  /** Taunt: turns left in which status moves can't be used. */
  tauntTurnsRemaining: number;
  /** Held item knocked out of use (Thief, Knock Off) or thrown (Fling) — for the rest of this battle. */
  heldItemDisabled: boolean;
  /** Perish Song: turns until this Pokémon faints (0 = not affected). Switching out clears it. */
  perishCount: number;
  /** Encore: move it must repeat, and turns left. */
  encoreMoveId: number | null;
  encoreTurnsRemaining: number;
  /** Laser Focus / Lock-On: the next attack (until the end of next turn) is a sure crit / sure hit. */
  laserFocusTurns: number;
  lockOnTurns: number;
  /** Smack Down: knocked to the ground — Ground moves hit it even if it flies. */
  grounded: boolean;
  /** Charge: the next Electric move has double power. */
  chargedUp: boolean;
  /** Wish: heals `wishHeal` HP when the count reaches 0 (end of next turn). */
  wishTurns: number;
  wishHeal: number;
  /** Aqua Ring: heals 1/16 max HP every turn end. */
  aquaRing: boolean;
  /** Yawn: falls asleep when the count reaches 0 (end of next turn). */
  drowsyTurns: number;
  /** Water Sport: Fire moves against / from this Pokémon do half damage. */
  waterSportTurns: number;
  /** Moves used since it came in (Last Resort). */
  movesUsed: number[];
  uproarTurnsRemaining: number;
  statModifiers: BattleStatModifiers;
  isStruggleMode: boolean;
  turnFlags: BattleTurnFlags;
  critBoost: boolean;
  substituteActive: boolean;
  substituteHitsAbsorbed: number;
  destinyBonded: boolean;
  weatherEvasionBonus: number;
  hasWeatherStatBoost: boolean;
  lastMoveUsedId: number | null;
  /** Mimic: the foe's move this Pokémon copied — every later Mimic uses it, until it switches out. */
  mimickedMoveId: number | null;
  disabledMoveId: number | null;
  disabledMoveTurnsRemaining: number;
  abilityActivationCount: number;
  heldItem: HeldItemDef | null;
}

export interface BattleSideRuntimeState {
  reflectTurnsRemaining: number;
  lightScreenTurnsRemaining: number;
  mistTurnsRemaining: number;
  safeguardTurnsRemaining: number;
  stealthRockActive: boolean;
  spikesLayers: number; // 0–3
  toxicSpikesLayers: number; // 0–2
  futureSightTurnsRemaining: number;
  futureSightDamage: number;
}

export function createEmptyBattleStatModifiers(): BattleStatModifiers {
  return {
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
    accuracy: 0,
    evasion: 0,
  };
}

export function createBattleTurnFlags(): BattleTurnFlags {
  return {
    flinched: false,
    mustRecharge: false,
    protected: false,
    endured: false,
    charging: false,
    skipTurn: false,
    tookDamageThisTurn: false,
    physicalDamageTakenThisTurn: 0,
    specialDamageTakenThisTurn: 0,
    magicCoatActive: false,
    switchedInThisTurn: false,
  };
}

export function clampBattleStatModifier(percent: number): number {
  return Math.max(MIN_BATTLE_STAT_PERCENT, Math.min(MAX_BATTLE_STAT_PERCENT, percent));
}

export function applyBattleStatDelta(currentPercent: number, stageDelta: number): number {
  return clampBattleStatModifier(currentPercent + stageDelta * BATTLE_STAT_PERCENT_STEP);
}

export function createBattlePokemonRuntimeState(pokemon: Pick<Pokemon, 'status'>): BattlePokemonRuntimeState {
  return {
    majorStatus: pokemon.status,
    curseActive: false,
    sleepTurnsRemaining: 0,
    freezeTurnsRemaining: 0,
    badlyPoisonTurns: 0,
    confusionTurnsRemaining: 0,
    infatuatedWith: null,
    softLockedInMovesId: null,
    leechSeeded: false,
    trappedTurnsRemaining: 0,
    trapDamagePercent: null,
    chargingMoveId: null,
    invulnerableState: null,
    lockedInMoveId: null,
    lockInTurnsRemaining: 0,
    rolloutTurnsActive: 0,
    rageActive: false,
    bideTurnsRemaining: 0,
    bideDamage: 0,
    nightmare: false,
    blockedBy: null,
    tauntTurnsRemaining: 0,
    heldItemDisabled: false,
    perishCount: 0,
    encoreMoveId: null,
    encoreTurnsRemaining: 0,
    laserFocusTurns: 0,
    lockOnTurns: 0,
    grounded: false,
    chargedUp: false,
    wishTurns: 0,
    wishHeal: 0,
    aquaRing: false,
    drowsyTurns: 0,
    waterSportTurns: 0,
    movesUsed: [],
    uproarTurnsRemaining: 0,
    statModifiers: createEmptyBattleStatModifiers(),
    turnFlags: createBattleTurnFlags(),
    critBoost: false,
    substituteActive: false,
    substituteHitsAbsorbed: 0,
    destinyBonded: false,
    weatherEvasionBonus: 0,
    hasWeatherStatBoost: false,
    lastMoveUsedId: null,
    mimickedMoveId: null,
    disabledMoveId: null,
    disabledMoveTurnsRemaining: 0,
    abilityActivationCount: 0,
    isStruggleMode: false,
    heldItem: null,
  };
}

export function createBattleSideRuntimeState(): BattleSideRuntimeState {
  return {
    reflectTurnsRemaining: 0,
    lightScreenTurnsRemaining: 0,
    mistTurnsRemaining: 0,
    safeguardTurnsRemaining: 0,
    stealthRockActive: false,
    spikesLayers: 0,
    toxicSpikesLayers: 0,
    futureSightTurnsRemaining: 0,
    futureSightDamage: 0,
  };
}

export function getBattleSideEffectTurnsRemaining(
  runtimeState: BattleSideRuntimeState,
  effectId: MoveBattleSideEffectId,
): number {
  switch (effectId) {
    case 'reflect':
      return runtimeState.reflectTurnsRemaining;
    case 'light-screen':
      return runtimeState.lightScreenTurnsRemaining;
    case 'mist':
      return runtimeState.mistTurnsRemaining;
    case 'safeguard':
      return runtimeState.safeguardTurnsRemaining;
  }
}

export function setBattleSideEffectTurnsRemaining(
  runtimeState: BattleSideRuntimeState,
  effectId: MoveBattleSideEffectId,
  turnsRemaining: number,
): void {
  switch (effectId) {
    case 'reflect':
      runtimeState.reflectTurnsRemaining = turnsRemaining;
      break;
    case 'light-screen':
      runtimeState.lightScreenTurnsRemaining = turnsRemaining;
      break;
    case 'mist':
      runtimeState.mistTurnsRemaining = turnsRemaining;
      break;
    case 'safeguard':
      runtimeState.safeguardTurnsRemaining = turnsRemaining;
      break;
  }
}

export function normalizePersistentPokemonStatus(status: unknown): MajorStatusId | null {
  return typeof status === 'string' ? normalizeMajorStatusId(status) : null;
}

/** Undo a battle Transform: put the Pokémon's own types, stats and moves back. True if it was transformed. */
export function revertTransform(pokemon: Pokemon | null | undefined): boolean {
  if (!pokemon?.transform) return false;
  Object.assign(pokemon, pokemon.transform.original);
  delete pokemon.transform;
  return true;
}

export function ensurePersistentBattleFields(pokemon: Record<string, any> | null | undefined): void {
  if (!pokemon) return;
  pokemon.status = normalizePersistentPokemonStatus(pokemon.status);
}

export function canCurePersistentStatus(currentStatus: MajorStatusId | null, cureStatus: string | 'all'): boolean {
  if (!currentStatus) return false;
  if (cureStatus === 'all') return true;
  return normalizeMajorStatusId(cureStatus) === currentStatus;
}
