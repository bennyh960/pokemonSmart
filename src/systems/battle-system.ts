import type { Pokemon } from '../types/index.js';
import type { BattleStatId, MajorStatusId, MoveStatChange, MoveStatusEffect } from '../types/battle-metadata.js';
import type { BattlePokemonRuntimeState } from './battle-state.js';
import { applyBattleStatDelta, createBattlePokemonRuntimeState } from './battle-state.js';
import { getAbilityBattleEffects, getMoveBattleData } from '../services/pokemon-data.js';

export interface TurnOrderDecision {
  enemyActsFirst: boolean;
  enemyPriority: number;
  playerPriority: number;
  enemyEffectiveSpeed: number;
  playerEffectiveSpeed: number;
}

export interface TurnStartStatusResult {
  canAct: boolean;
  event: 'woke-up' | 'fast-asleep' | 'thawed-out' | 'frozen-solid' | 'fully-paralyzed' | null;
}

export interface StatusApplicationResult {
  applied: boolean;
  status: MajorStatusId | null;
  reason: 'applied' | 'already-has-status' | 'immune' | 'chance-failed' | 'no-status';
}

export interface EndOfTurnStatusResult {
  damage: number;
  status: MajorStatusId | null;
  message: 'poison' | 'burn' | null;
  fainted: boolean;
}

export interface AppliedStatChange {
  stat: BattleStatId;
  stages: number;
  newPercent: number;
  target: 'user' | 'target';
  direction: 'rose' | 'fell';
  sharply: boolean;
}

export interface MoveHitResult {
  hit: boolean;
  chance: number;
}

function randomTurnCount(minTurns: number, maxTurns: number, random: () => number): number {
  return Math.floor(random() * ((maxTurns - minTurns) + 1)) + minTurns;
}

function getStatusDurationRange(effect: MoveStatusEffect | null): { min: number; max: number } {
  return {
    min: effect?.minTurns ?? 2,
    max: effect?.maxTurns ?? 5,
  };
}

function hasStatusImmunity(pokemon: Pokemon, status: MajorStatusId): boolean {
  if (!pokemon.abilityId) return false;
  return getAbilityBattleEffects(pokemon.abilityId).some((effect) => {
    return effect.kind === 'statusImmunity' && effect.statuses.includes(status);
  });
}

export function createBattleRuntimeStateForPokemon(
  pokemon: Pokemon,
  random: () => number = Math.random,
): BattlePokemonRuntimeState {
  const state = createBattlePokemonRuntimeState(pokemon);
  if (state.majorStatus === 'sleep' && state.sleepTurnsRemaining <= 0) {
    state.sleepTurnsRemaining = randomTurnCount(2, 5, random);
  }
  if (state.majorStatus === 'freeze' && state.freezeTurnsRemaining <= 0) {
    state.freezeTurnsRemaining = randomTurnCount(2, 5, random);
  }
  return state;
}

export function chooseEnemyMoveIndex(enemy: Pokemon, random: () => number = Math.random): number {
  const usableMoves = enemy.moves
    .map((move, index) => ({ move, index }))
    .filter(({ move }) => move.currentPp > 0);
  if (usableMoves.length === 0) return 0;
  return usableMoves[Math.floor(random() * usableMoves.length)].index;
}

export function getEffectiveSpeed(pokemon: Pokemon, runtimeState: BattlePokemonRuntimeState): number {
  let effectiveSpeed = Math.max(1, pokemon.speed * getBattleStatMultiplier(runtimeState.statModifiers.speed));
  if (runtimeState.majorStatus === 'paralyze') {
    effectiveSpeed = Math.max(1, effectiveSpeed * 0.5);
  }
  return effectiveSpeed;
}

export function getBattleStatMultiplier(percent: number): number {
  if (percent >= 0) {
    return 1 + (percent / 100);
  }
  return 100 / (100 + Math.abs(percent));
}

export function getModifiedStatValue(
  pokemon: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
  stat: BattleStatId,
): number {
  const baseValue = (() => {
    switch (stat) {
      case 'attack':
        return pokemon.attack;
      case 'defense':
        return pokemon.defense;
      case 'specialAttack':
        return pokemon.specialAttack;
      case 'specialDefense':
        return pokemon.specialDefense;
      case 'speed':
        return pokemon.speed;
      default:
        return 1;
    }
  })();

  if (stat === 'speed') {
    return getEffectiveSpeed(pokemon, runtimeState);
  }

  return Math.max(1, baseValue * getBattleStatMultiplier(runtimeState.statModifiers[stat]));
}

export function getDisplayedStatChanges(
  runtimeState: BattlePokemonRuntimeState,
): Array<{ stat: BattleStatId; stages: number }> {
  return (Object.entries(runtimeState.statModifiers) as Array<[BattleStatId, number]>)
    .filter(([, percent]) => percent !== 0)
    .map(([stat, percent]) => ({ stat, stages: percent / 50 }));
}

export function applyStatChanges(
  runtimeState: BattlePokemonRuntimeState,
  statChanges: MoveStatChange[],
  target: 'user' | 'target',
  random: () => number = Math.random,
): AppliedStatChange[] {
  const applied: AppliedStatChange[] = [];

  for (const change of statChanges) {
    if (change.target !== target) continue;
    if ((random() * 100) >= change.chance) continue;

    const current = runtimeState.statModifiers[change.stat];
    const next = applyBattleStatDelta(current, change.stages);
    if (next === current) continue;

    runtimeState.statModifiers[change.stat] = next;
    applied.push({
      stat: change.stat,
      stages: change.stages,
      newPercent: next,
      target,
      direction: change.stages > 0 ? 'rose' : 'fell',
      sharply: Math.abs(change.stages) >= 2,
    });
  }

  return applied;
}

export function doesMoveHit(
  moveAccuracy: number,
  attackerState: BattlePokemonRuntimeState,
  defenderState: BattlePokemonRuntimeState,
  random: () => number = Math.random,
): MoveHitResult {
  if (moveAccuracy <= 0) {
    return { hit: true, chance: 100 };
  }

  const accuracyMultiplier = getBattleStatMultiplier(attackerState.statModifiers.accuracy);
  const evasionMultiplier = getBattleStatMultiplier(defenderState.statModifiers.evasion);
  const chance = Math.max(1, Math.min(100, moveAccuracy * (accuracyMultiplier / evasionMultiplier)));
  return {
    hit: (random() * 100) < chance,
    chance,
  };
}

export function rollCriticalHit(
  moveId: number,
  defender: Pokemon,
  random: () => number = Math.random,
): boolean {
  if (defender.abilityId) {
    const preventsCrit = getAbilityBattleEffects(defender.abilityId).some(effect => effect.kind === 'preventCriticalHits');
    if (preventsCrit) return false;
  }

  const critRate = getMoveBattleData(moveId)?.critRate ?? 0;
  const chance = critRate >= 1 ? 12.5 : 6.25;
  return (random() * 100) < chance;
}

export function determineTurnOrder(
  player: Pokemon,
  playerRuntimeState: BattlePokemonRuntimeState,
  playerMoveId: number,
  enemy: Pokemon,
  enemyRuntimeState: BattlePokemonRuntimeState,
  enemyMoveId: number,
  random: () => number = Math.random,
): TurnOrderDecision {
  const playerPriority = getMoveBattleData(playerMoveId)?.priority ?? 0;
  const enemyPriority = getMoveBattleData(enemyMoveId)?.priority ?? 0;
  const playerEffectiveSpeed = getEffectiveSpeed(player, playerRuntimeState);
  const enemyEffectiveSpeed = getEffectiveSpeed(enemy, enemyRuntimeState);

  if (enemyPriority !== playerPriority) {
    return {
      enemyActsFirst: enemyPriority > playerPriority,
      enemyPriority,
      playerPriority,
      enemyEffectiveSpeed,
      playerEffectiveSpeed,
    };
  }

  if (enemyEffectiveSpeed !== playerEffectiveSpeed) {
    return {
      enemyActsFirst: enemyEffectiveSpeed > playerEffectiveSpeed,
      enemyPriority,
      playerPriority,
      enemyEffectiveSpeed,
      playerEffectiveSpeed,
    };
  }

  return {
    enemyActsFirst: random() >= 0.5,
    enemyPriority,
    playerPriority,
    enemyEffectiveSpeed,
    playerEffectiveSpeed,
  };
}

function clearMajorStatus(pokemon: Pokemon, runtimeState: BattlePokemonRuntimeState): void {
  pokemon.status = null;
  runtimeState.majorStatus = null;
  runtimeState.sleepTurnsRemaining = 0;
  runtimeState.freezeTurnsRemaining = 0;
  runtimeState.badlyPoisonTurns = 0;
}

export function processStartOfTurnStatus(
  pokemon: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
  random: () => number = Math.random,
): TurnStartStatusResult {
  switch (runtimeState.majorStatus) {
    case 'sleep': {
      if (runtimeState.sleepTurnsRemaining <= 0) {
        runtimeState.sleepTurnsRemaining = randomTurnCount(2, 5, random);
      }
      runtimeState.sleepTurnsRemaining--;
      if (runtimeState.sleepTurnsRemaining <= 0) {
        clearMajorStatus(pokemon, runtimeState);
        return { canAct: true, event: 'woke-up' };
      }
      return { canAct: false, event: 'fast-asleep' };
    }
    case 'freeze': {
      if (runtimeState.freezeTurnsRemaining <= 0) {
        runtimeState.freezeTurnsRemaining = randomTurnCount(2, 5, random);
      }
      runtimeState.freezeTurnsRemaining--;
      if (runtimeState.freezeTurnsRemaining <= 0) {
        clearMajorStatus(pokemon, runtimeState);
        return { canAct: true, event: 'thawed-out' };
      }
      return { canAct: false, event: 'frozen-solid' };
    }
    case 'paralyze':
      return random() < 0.25
        ? { canAct: false, event: 'fully-paralyzed' }
        : { canAct: true, event: null };
    default:
      return { canAct: true, event: null };
  }
}

export function applyMajorStatus(
  target: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
  effect: MoveStatusEffect | null,
  random: () => number = Math.random,
): StatusApplicationResult {
  if (!effect) return { applied: false, status: null, reason: 'no-status' };
  if (target.status || runtimeState.majorStatus) {
    return { applied: false, status: effect.status, reason: 'already-has-status' };
  }
  if (hasStatusImmunity(target, effect.status)) {
    return { applied: false, status: effect.status, reason: 'immune' };
  }
  if ((random() * 100) >= effect.chance) {
    return { applied: false, status: effect.status, reason: 'chance-failed' };
  }

  target.status = effect.status;
  runtimeState.majorStatus = effect.status;
  runtimeState.badlyPoisonTurns = effect.badlyPoisoned ? 1 : 0;

  if (effect.status === 'sleep') {
    const { min, max } = getStatusDurationRange(effect);
    runtimeState.sleepTurnsRemaining = randomTurnCount(min, max, random);
  } else if (effect.status === 'freeze') {
    const { min, max } = getStatusDurationRange(effect);
    runtimeState.freezeTurnsRemaining = randomTurnCount(min, max, random);
  }

  return { applied: true, status: effect.status, reason: 'applied' };
}

export function applyEndOfTurnStatusEffects(
  pokemon: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
): EndOfTurnStatusResult {
  switch (runtimeState.majorStatus) {
    case 'poison': {
      const damage = runtimeState.badlyPoisonTurns > 0
        ? Math.max(1, Math.floor((pokemon.maxHp * runtimeState.badlyPoisonTurns) / 16))
        : Math.max(1, Math.floor(pokemon.maxHp / 8));
      pokemon.hp = Math.max(0, pokemon.hp - damage);
      if (runtimeState.badlyPoisonTurns > 0) {
        runtimeState.badlyPoisonTurns++;
      }
      return { damage, status: 'poison', message: 'poison', fainted: pokemon.hp <= 0 };
    }
    case 'burn': {
      const damage = Math.max(1, Math.floor(pokemon.maxHp / 8));
      pokemon.hp = Math.max(0, pokemon.hp - damage);
      return { damage, status: 'burn', message: 'burn', fainted: pokemon.hp <= 0 };
    }
    default:
      return { damage: 0, status: runtimeState.majorStatus, message: null, fainted: pokemon.hp <= 0 };
  }
}
