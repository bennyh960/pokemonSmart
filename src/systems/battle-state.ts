import type { Pokemon } from '../types/index.js';
import type { BattleStatId, MajorStatusId, MoveBattleSideEffectId } from '../types/battle-metadata.js';
import { normalizeMajorStatusId } from '../types/battle-metadata.js';

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
}

export interface BattlePokemonRuntimeState {
  majorStatus: MajorStatusId | null;
  sleepTurnsRemaining: number;
  freezeTurnsRemaining: number;
  badlyPoisonTurns: number;
  confusionTurnsRemaining: number;
  leechSeeded: boolean;
  trappedTurnsRemaining: number;
  trapDamagePercent: number | null;
  chargingMoveId: number | null;
  statModifiers: BattleStatModifiers;
  turnFlags: BattleTurnFlags;
  critBoost: boolean;
  substituteActive: boolean;
  substituteHitsAbsorbed: number;
}

export interface BattleSideRuntimeState {
  reflectTurnsRemaining: number;
  lightScreenTurnsRemaining: number;
  mistTurnsRemaining: number;
  safeguardTurnsRemaining: number;
  stealthRockActive: boolean;
  spikesLayers: number;      // 0–3
  toxicSpikesLayers: number; // 0–2
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
  };
}

export function clampBattleStatModifier(percent: number): number {
  return Math.max(MIN_BATTLE_STAT_PERCENT, Math.min(MAX_BATTLE_STAT_PERCENT, percent));
}

export function applyBattleStatDelta(currentPercent: number, stageDelta: number): number {
  return clampBattleStatModifier(currentPercent + (stageDelta * BATTLE_STAT_PERCENT_STEP));
}

export function createBattlePokemonRuntimeState(pokemon: Pick<Pokemon, 'status'>): BattlePokemonRuntimeState {
  return {
    majorStatus: pokemon.status,
    sleepTurnsRemaining: 0,
    freezeTurnsRemaining: 0,
    badlyPoisonTurns: 0,
    confusionTurnsRemaining: 0,
    leechSeeded: false,
    trappedTurnsRemaining: 0,
    trapDamagePercent: null,
    chargingMoveId: null,
    statModifiers: createEmptyBattleStatModifiers(),
    turnFlags: createBattleTurnFlags(),
    critBoost: false,
    substituteActive: false,
    substituteHitsAbsorbed: 0,
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

export function ensurePersistentBattleFields(pokemon: Record<string, any> | null | undefined): void {
  if (!pokemon) return;
  pokemon.status = normalizePersistentPokemonStatus(pokemon.status);
}

export function canCurePersistentStatus(
  currentStatus: MajorStatusId | null,
  cureStatus: string | 'all',
): boolean {
  if (!currentStatus) return false;
  if (cureStatus === 'all') return true;
  return normalizeMajorStatusId(cureStatus) === currentStatus;
}
