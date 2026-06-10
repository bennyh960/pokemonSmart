import type { Pokemon, PokemonType } from '../types/index.js';
import type {
  BattleStatId,
  MajorStatusId,
  MoveBattleBehaviorTag,
  MoveBattleEffect,
  MoveBattleSideEffect,
  MoveBattleSideEffectId,
  MoveStatChange,
  MoveStatusEffect,
  WeatherConditionId,
} from '../types/battle-metadata.js';
import type { BattlePokemonRuntimeState, BattleSideRuntimeState } from './battle-state.js';
import {
  applyBattleStatDelta,
  createBattlePokemonRuntimeState,
  getBattleSideEffectTurnsRemaining,
  setBattleSideEffectTurnsRemaining,
} from './battle-state.js';
import {
  getAbilityBattleEffects,
  getCombinedTypeEffectiveness,
  getMoveBattleData,
  getPokemonDisplayName,
} from '../services/pokemon-data.js';
import { getItem } from '../data/items.js';
import { t } from '../i18n/i18n.js';
import type { HeldItemDef } from '../data/item-defs.js';

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

export interface BeforeMoveEffectResult {
  canAct: boolean;
  events: Array<
    | 'woke-up'
    | 'fast-asleep'
    | 'thawed-out'
    | 'frozen-solid'
    | 'fully-paralyzed'
    | 'must-recharge'
    | 'flinched'
    | 'confused'
    | 'snapped-out'
    | 'hurt-itself-confusion'
  >;
  selfDamage: number;
}

export interface StatusApplicationResult {
  applied: boolean;
  status: MajorStatusId | null;
  reason: 'applied' | 'already-has-status' | 'immune' | 'chance-failed' | 'no-status';
  lines?: string[];
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

export interface AppliedVolatileEffect {
  id: MoveBattleEffect['id'];
  target: 'user' | 'target';
  applied: boolean;
  reason: 'applied' | 'already-active' | 'immune' | 'chance-failed';
}

export interface LeechSeedResult {
  applied: boolean;
  damage: number;
  healed: number;
  fainted: boolean;
}

export interface RecoilResult {
  damage: number;
  fainted: boolean;
}

export interface TrapEffectResult {
  applied: boolean;
  damage: number;
  fainted: boolean;
  ended: boolean;
}

export interface AppliedSideEffect {
  id: MoveBattleSideEffectId;
  target: 'user' | 'target';
  applied: boolean;
  reason: 'applied' | 'already-active';
}

const SAME_TYPE_STATUS_IMMUNITY_BY_MOVE_TYPE: Partial<Record<MajorStatusId, PokemonType>> = {
  burn: 'fire',
  freeze: 'ice',
  paralyze: 'electric',
  poison: 'poison',
};

function randomTurnCount(minTurns: number, maxTurns: number, random: () => number): number {
  return Math.floor(random() * (maxTurns - minTurns + 1)) + minTurns;
}

function getStatusDurationRange(effect: MoveStatusEffect | null): { min: number; max: number } {
  return {
    min: effect?.minTurns ?? 2,
    max: effect?.maxTurns ?? 5,
  };
}

function hasStatusImmunity(pokemon: Pokemon, status: MajorStatusId): boolean {
  const immuneType = SAME_TYPE_STATUS_IMMUNITY_BY_MOVE_TYPE[status];
  if (immuneType && pokemon.types.includes(immuneType)) return true;
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

  if (pokemon.heldItemId) {
    const itemData = getItem(pokemon.heldItemId);

    if (itemData?.category === 'held' && itemData.effect.type === 'battle') {
      state.heldItem = itemData as HeldItemDef;
      const { stats } = state.heldItem.effect.config;
      if (stats) {
        for (const [stat, stages] of Object.entries(stats)) {
          const statId = stat as BattleStatId;
          state.statModifiers[statId] = applyBattleStatDelta(state.statModifiers[statId], stages);
        }
        // lock is happens in the end of the turn, so we don't need to track it here in the runtime state
      }
    }
  }

  return state;
}

export function chooseEnemyMoveIndex(enemy: Pokemon, random: () => number = Math.random): number {
  const usableMoves = enemy.moves.map((move, index) => ({ move, index })).filter(({ move }) => move.currentPp > 0);
  if (usableMoves.length === 0) return -2; // signal to use struggle
  return usableMoves[Math.floor(random() * usableMoves.length)].index;
}

export function getEffectiveSpeed(
  pokemon: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
  weatherType?: WeatherConditionId | null,
): number {
  let effectiveSpeed = Math.max(1, pokemon.speed * getBattleStatMultiplier(runtimeState.statModifiers.speed));
  if (runtimeState.majorStatus === 'paralyze') {
    effectiveSpeed = Math.max(1, effectiveSpeed * 0.5);
  }
  if (weatherType && pokemon.abilityId) {
    const hasWeatherSpeedBoost = getAbilityBattleEffects(pokemon.abilityId).some(
      (e) => e.kind === 'weatherSpeedBoost' && e.weather === weatherType,
    );
    if (hasWeatherSpeedBoost) {
      effectiveSpeed *= 2;
    }
  }
  return effectiveSpeed;
}

export function getBattleStatMultiplier(percent: number): number {
  if (percent >= 0) {
    return 1 + percent / 100;
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

export function getDisplayedVolatileStatuses(runtimeState: BattlePokemonRuntimeState): string[] {
  const effects: string[] = [];
  if (runtimeState.confusionTurnsRemaining > 0) {
    effects.push('confuse');
  }
  if (runtimeState.leechSeeded) {
    effects.push('seed');
  }
  if (runtimeState.trappedTurnsRemaining > 0) {
    effects.push('trap');
  }
  if (runtimeState.critBoost) {
    effects.push('focus');
  }
  if (runtimeState.destinyBonded) {
    effects.push('bond');
  }
  if (runtimeState.disabledMoveId !== null) {
    effects.push('disable');
  }
  return effects;
}

export function getDisplayedSideStatuses(runtimeState: BattleSideRuntimeState): string[] {
  const effects: string[] = [];
  if (runtimeState.reflectTurnsRemaining > 0) {
    effects.push('reflect');
  }
  if (runtimeState.lightScreenTurnsRemaining > 0) {
    effects.push('light-screen');
  }
  if (runtimeState.mistTurnsRemaining > 0) {
    effects.push('mist');
  }
  if (runtimeState.safeguardTurnsRemaining > 0) {
    effects.push('safeguard');
  }
  return effects;
}

export function isBattlePokemonTrapped(runtimeState: BattlePokemonRuntimeState): boolean {
  return runtimeState.trappedTurnsRemaining > 0;
}

export function getChargingMoveId(runtimeState: BattlePokemonRuntimeState): number | null {
  return runtimeState.turnFlags.charging ? runtimeState.chargingMoveId : null;
}

export function startChargingMove(runtimeState: BattlePokemonRuntimeState, moveId: number): void {
  runtimeState.turnFlags.charging = true;
  runtimeState.chargingMoveId = moveId;
}

export function clearChargingMove(runtimeState: BattlePokemonRuntimeState): void {
  runtimeState.turnFlags.charging = false;
  runtimeState.chargingMoveId = null;
}

const SOUND_MOVE_NAMES = new Set([
  'bug buzz',
  'hyper voice',
  'supersonic',
  'uproar',
  'torch song',
  'roar',
  'whirlwind',
  'snore',
  'screech',
  'sing',
  'boomburst',
  'chatter',
  'echoed voice',
  'round',
  'relic song',
  'sparkling aria',
  'noble roar',
  'disarming voice',
  'parting shot',
  'confide',
  'snarl',
]);

export function isSubstituteBypass(moveName: string, attackerAbilityId: number | null | undefined): boolean {
  return SOUND_MOVE_NAMES.has(moveName.toLowerCase()) || attackerAbilityId === 151;
}

export function clearEndOfTurnFlags(runtimeState: BattlePokemonRuntimeState): void {
  runtimeState.turnFlags.flinched = false;
  runtimeState.turnFlags.protected = false;
  runtimeState.turnFlags.endured = false;
  runtimeState.turnFlags.skipTurn = false;
  runtimeState.turnFlags.tookDamageThisTurn = false;
  runtimeState.turnFlags.physicalDamageTakenThisTurn = 0;
  runtimeState.turnFlags.specialDamageTakenThisTurn = 0;
  runtimeState.turnFlags.magicCoatActive = false;
}

export function tryApplyFlinch(
  runtimeState: BattlePokemonRuntimeState,
  chance: number | null,
  targetCanStillAct: boolean,
  random: () => number = Math.random,
): boolean {
  if (!targetCanStillAct || !chance || chance <= 0) return false;
  if (runtimeState.turnFlags.flinched) return false;
  if (random() * 100 >= chance) return false;
  runtimeState.turnFlags.flinched = true;
  return true;
}

export function applyPostMoveTurnFlags(runtimeState: BattlePokemonRuntimeState, moveId: number): void {
  const behaviorTags = getMoveBattleData(moveId)?.behaviorTags ?? [];
  if (behaviorTags.includes('must-recharge')) {
    runtimeState.turnFlags.mustRecharge = true;
  }
}

export function calculateMoveHpEffectAmount(baseAmount: number, percent: number | null): number {
  if (!percent || percent <= 0 || baseAmount <= 0) return 0;
  return Math.max(1, Math.floor((baseAmount * percent) / 100));
}

export function applyDrainHealing(pokemon: Pokemon, damageDealt: number, percent: number | null): number {
  const rawHealing = calculateMoveHpEffectAmount(damageDealt, percent);
  if (rawHealing <= 0) return 0;
  const healed = Math.max(0, Math.min(pokemon.maxHp, pokemon.hp + rawHealing) - pokemon.hp);
  pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + rawHealing);
  return healed;
}

export function applyLeaveUserAtOneHpCost(pokemon: Pokemon): RecoilResult {
  if (pokemon.hp <= 1) {
    return { damage: 0, fainted: false };
  }
  const damage = pokemon.hp - 1;
  pokemon.hp = 1;
  return { damage, fainted: false };
}

export function applyRecoilDamage(pokemon: Pokemon, damageDealt: number, percent: number | null): RecoilResult {
  const rawDamage = calculateMoveHpEffectAmount(damageDealt, percent);
  if (rawDamage <= 0) {
    return { damage: 0, fainted: pokemon.hp <= 0 };
  }
  const damage = Math.min(pokemon.hp, rawDamage);
  pokemon.hp = Math.max(0, pokemon.hp - rawDamage);
  return { damage, fainted: pokemon.hp <= 0 };
}

export function applySideEffects(
  runtimeState: BattleSideRuntimeState,
  effects: MoveBattleSideEffect[],
  effectTarget: 'user' | 'target',
): AppliedSideEffect[] {
  const applied: AppliedSideEffect[] = [];

  for (const effect of effects) {
    if (effect.target !== effectTarget) continue;
    if (getBattleSideEffectTurnsRemaining(runtimeState, effect.id) > 0) {
      applied.push({ id: effect.id, target: effect.target, applied: false, reason: 'already-active' });
      continue;
    }
    setBattleSideEffectTurnsRemaining(runtimeState, effect.id, effect.turns ?? 5);
    applied.push({ id: effect.id, target: effect.target, applied: true, reason: 'applied' });
  }

  return applied;
}

export function isMistActive(runtimeState: BattleSideRuntimeState): boolean {
  return runtimeState.mistTurnsRemaining > 0;
}

export function isSafeguardActive(runtimeState: BattleSideRuntimeState): boolean {
  return runtimeState.safeguardTurnsRemaining > 0;
}

export function getSideDamageTakenMultiplier(runtimeState: BattleSideRuntimeState, damageClass: string): number {
  if (damageClass === 'physical' && runtimeState.reflectTurnsRemaining > 0) {
    return 0.5;
  }
  if (damageClass === 'special' && runtimeState.lightScreenTurnsRemaining > 0) {
    return 0.5;
  }
  return 1;
}

export function advanceSideEffectTurns(runtimeState: BattleSideRuntimeState): MoveBattleSideEffectId[] {
  const ended: MoveBattleSideEffectId[] = [];
  const sideEffects: MoveBattleSideEffectId[] = ['reflect', 'light-screen', 'mist', 'safeguard'];

  for (const effectId of sideEffects) {
    const turnsRemaining = getBattleSideEffectTurnsRemaining(runtimeState, effectId);
    if (turnsRemaining <= 0) continue;
    const nextTurns = turnsRemaining - 1;
    setBattleSideEffectTurnsRemaining(runtimeState, effectId, nextTurns);
    if (nextTurns <= 0) {
      ended.push(effectId);
    }
  }

  return ended;
}

export function applyStatChanges(
  runtimeState: BattlePokemonRuntimeState,
  statChanges: MoveStatChange[],
  target: 'user' | 'target',
  random: () => number = Math.random,
  contraryActive = false,
  groupedChance: number | null = null,
): AppliedStatChange[] {
  const relevant = statChanges.filter((c) => c.target === target);
  if (relevant.length === 0) return [];

  // Grouped stat chance: roll once — all changes succeed or none do
  if (groupedChance !== null && random() * 100 >= groupedChance) return [];

  const applied: AppliedStatChange[] = [];

  for (const change of statChanges) {
    if (change.target !== target) continue;
    if (groupedChance === null && random() * 100 >= change.chance) continue;

    const stages = contraryActive ? -change.stages : change.stages;
    const current = runtimeState.statModifiers[change.stat];
    const next = applyBattleStatDelta(current, stages);
    if (next === current) continue;

    runtimeState.statModifiers[change.stat] = next;
    applied.push({
      stat: change.stat,
      stages,
      newPercent: next,
      target,
      direction: stages > 0 ? 'rose' : 'fell',
      sharply: Math.abs(stages) >= 2,
    });
  }

  return applied;
}

/** Low Kick / Grass Knot — power based on target's weight. */
export function getWeightTargetPower(weightKg: number): number {
  if (weightKg >= 200) return 120;
  if (weightKg >= 100) return 100;
  if (weightKg >= 50) return 80;
  if (weightKg >= 25) return 60;
  if (weightKg >= 10) return 40;
  return 20;
}

/** Heavy Slam / Heat Crash — power based on how much heavier the attacker is. */
export function getWeightRatioPower(attackerKg: number, targetKg: number): number {
  if (targetKg <= 0) return 40;
  const ratio = attackerKg / targetKg;
  if (ratio >= 5) return 120;
  if (ratio >= 4) return 100;
  if (ratio >= 3) return 80;
  if (ratio >= 2) return 60;
  return 40;
}

export function doesMoveHit(
  moveAccuracy: number | null,
  attackerState: BattlePokemonRuntimeState,
  defenderState: BattlePokemonRuntimeState,
  random: () => number = Math.random,
): MoveHitResult {
  if (!moveAccuracy || moveAccuracy <= 0) {
    return { hit: true, chance: 100 };
  }

  const accuracyMultiplier = getBattleStatMultiplier(attackerState.statModifiers.accuracy);
  const evasionMultiplier = getBattleStatMultiplier(defenderState.statModifiers.evasion);
  const chance = Math.max(1, Math.min(100, moveAccuracy * (accuracyMultiplier / evasionMultiplier)));
  // my extra
  const AttkcerspeedMultiplier = getBattleStatMultiplier(attackerState.statModifiers.speed);
  const DefenderspeedMultiplier = getBattleStatMultiplier(defenderState.statModifiers.speed);

  const MAX_SPEED_EFFECT = 0.1;
  const speedDeltaFactor =
    (MAX_SPEED_EFFECT * (AttkcerspeedMultiplier - DefenderspeedMultiplier)) /
    Math.max(AttkcerspeedMultiplier, DefenderspeedMultiplier);
  const finalChance = Math.max(0, Math.min(100, chance + speedDeltaFactor));

  return {
    hit: random() * 100 < finalChance,
    chance: finalChance,
  };
}

export function rollCriticalHit(
  moveId: number,
  defender: Pokemon,
  random: () => number = Math.random,
  attackerState?: BattlePokemonRuntimeState,
  happinessBonus: number = 0,
): boolean {
  if (defender.abilityId) {
    const preventsCrit = getAbilityBattleEffects(defender.abilityId).some(
      (effect) => effect.kind === 'preventCriticalHits',
    );
    if (preventsCrit) return false;
  }

  let itemBoost = 0;

  if (attackerState?.heldItem?.effect.config.category === 'crit-boost') {
    itemBoost = 2;
  }

  const critRate = getMoveBattleData(moveId)?.critRate ?? 0;
  const focusBoost = attackerState?.critBoost ? 1 : 0;
  const effective = critRate + focusBoost + itemBoost;
  const baseChance = effective >= 2 ? 50 : effective >= 1 ? 25 : 6.25;
  return random() * 100 < baseChance + happinessBonus;
}

function getEffectDurationRange(effect: MoveBattleEffect): { min: number; max: number } {
  return {
    min: effect.minTurns ?? 2,
    max: effect.maxTurns ?? 5,
  };
}

function isVolatileEffectImmune(target: Pokemon, effect: MoveBattleEffect): boolean {
  switch (effect.id) {
    case 'leech-seed':
      return target.types.includes('grass');
    default:
      return false;
  }
}

export function isTargetImmuneToMoveType(target: Pokemon, moveType: PokemonType): boolean {
  return getCombinedTypeEffectiveness(moveType, target.types) === 0;
}

export function isTargetImmuneToStatusEffectFromMoveType(
  target: Pokemon,
  moveType: PokemonType,
  effect: MoveStatusEffect | null,
): boolean {
  if (!effect) return false;
  return target.types.includes(moveType);
}

export function isTargetImmuneToVolatileEffectFromMoveType(
  target: Pokemon,
  moveType: PokemonType,
  effect: MoveBattleEffect,
): boolean {
  switch (effect.id) {
    case 'leech-seed':
      return moveType === 'grass' && target.types.includes('grass');
    default:
      return false;
  }
}

export function applyVolatileMoveEffects(
  target: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
  effects: MoveBattleEffect[],
  effectTarget: 'user' | 'target',
  random: () => number = Math.random,
): AppliedVolatileEffect[] {
  const applied: AppliedVolatileEffect[] = [];

  for (const effect of effects) {
    if (effect.target !== effectTarget) continue;
    if (random() * 100 >= effect.chance) {
      applied.push({ id: effect.id, target: effect.target, applied: false, reason: 'chance-failed' });
      continue;
    }
    if (isVolatileEffectImmune(target, effect)) {
      applied.push({ id: effect.id, target: effect.target, applied: false, reason: 'immune' });
      continue;
    }

    switch (effect.id) {
      case 'confusion': {
        if (runtimeState.confusionTurnsRemaining > 0) {
          applied.push({ id: effect.id, target: effect.target, applied: false, reason: 'already-active' });
          break;
        }
        const { min, max } = getEffectDurationRange(effect);
        runtimeState.confusionTurnsRemaining = randomTurnCount(min, max, random);
        applied.push({ id: effect.id, target: effect.target, applied: true, reason: 'applied' });
        break;
      }
      case 'leech-seed': {
        if (runtimeState.leechSeeded) {
          applied.push({ id: effect.id, target: effect.target, applied: false, reason: 'already-active' });
          break;
        }
        runtimeState.leechSeeded = true;
        applied.push({ id: effect.id, target: effect.target, applied: true, reason: 'applied' });
        break;
      }
      case 'trap': {
        if (runtimeState.trappedTurnsRemaining > 0) {
          applied.push({ id: effect.id, target: effect.target, applied: false, reason: 'already-active' });
          break;
        }
        const { min, max } = getEffectDurationRange(effect);
        runtimeState.trappedTurnsRemaining = randomTurnCount(min, max, random);
        runtimeState.trapDamagePercent = effect.damagePercent ?? 6.25;
        applied.push({ id: effect.id, target: effect.target, applied: true, reason: 'applied' });
        break;
      }
    }
  }

  return applied;
}

export function determineTurnOrder(
  player: Pokemon,
  playerRuntimeState: BattlePokemonRuntimeState,
  playerMoveId: number,
  enemy: Pokemon,
  enemyRuntimeState: BattlePokemonRuntimeState,
  enemyMoveId: number,
  random: () => number = Math.random,
  weatherType?: WeatherConditionId | null,
): TurnOrderDecision {
  const playerPriority = getMoveBattleData(playerMoveId)?.priority ?? 0;
  const enemyPriority = getMoveBattleData(enemyMoveId)?.priority ?? 0;
  const playerEffectiveSpeed = getEffectiveSpeed(player, playerRuntimeState, weatherType);
  const enemyEffectiveSpeed = getEffectiveSpeed(enemy, enemyRuntimeState, weatherType);

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

export function clearMajorStatus(pokemon: Pokemon, runtimeState: BattlePokemonRuntimeState): void {
  pokemon.status = null;
  runtimeState.majorStatus = null;
  runtimeState.sleepTurnsRemaining = 0;
  runtimeState.freezeTurnsRemaining = 0;
  runtimeState.badlyPoisonTurns = 0;
}

export function calculateConfusionSelfHitDamage(
  pokemon: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
  random: () => number = Math.random,
): number {
  const burnMultiplier = pokemon.status === 'burn' ? 0.5 : 1;
  const attackStat = getModifiedStatValue(pokemon, runtimeState, 'attack') * burnMultiplier;
  const defenseStat = getModifiedStatValue(pokemon, runtimeState, 'defense');
  const lf = (2 * pokemon.level) / 5 + 2;
  const base = (lf * 40 * (attackStat / defenseStat)) / 50 + 2;
  const rand = 0.85 + random() * 0.15;
  return Math.max(1, Math.floor(base * rand));
}

// Move IDs that can be used while asleep (Snore=173, Sleep Talk=214)
export const SLEEP_USABLE_MOVE_IDS = new Set([173, 214]);

export function processStartOfTurnStatus(
  pokemon: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
  random: () => number = Math.random,
  moveId?: number,
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
      if (moveId !== undefined && SLEEP_USABLE_MOVE_IDS.has(moveId)) {
        return { canAct: true, event: 'fast-asleep' };
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
      return random() < 0.25 ? { canAct: false, event: 'fully-paralyzed' } : { canAct: true, event: null };
    default:
      return { canAct: true, event: null };
  }
}

export function processBeforeMoveEffects(
  pokemon: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
  random: () => number = Math.random,
  moveId?: number,
): BeforeMoveEffectResult {
  const statusResult = processStartOfTurnStatus(pokemon, runtimeState, random, moveId);
  const events: BeforeMoveEffectResult['events'] = [];
  if (statusResult.event) {
    events.push(statusResult.event);
  }
  if (!statusResult.canAct) {
    if (runtimeState.turnFlags.mustRecharge) {
      runtimeState.turnFlags.mustRecharge = false;
    }
    return { canAct: false, events, selfDamage: 0 };
  }

  if (runtimeState.turnFlags.mustRecharge) {
    runtimeState.turnFlags.mustRecharge = false;
    return { canAct: false, events: [...events, 'must-recharge'], selfDamage: 0 };
  }

  if (runtimeState.turnFlags.flinched) {
    runtimeState.turnFlags.flinched = false;
    return { canAct: false, events: [...events, 'flinched'], selfDamage: 0 };
  }

  if (runtimeState.confusionTurnsRemaining > 0) {
    runtimeState.confusionTurnsRemaining--;
    if (runtimeState.confusionTurnsRemaining <= 0) {
      return { canAct: true, events: [...events, 'snapped-out'], selfDamage: 0 };
    }

    events.push('confused');
    if (random() < 1 / 3) {
      const selfDamage = calculateConfusionSelfHitDamage(pokemon, runtimeState, random);
      pokemon.hp = Math.max(0, pokemon.hp - selfDamage);
      events.push('hurt-itself-confusion');
      return { canAct: false, events, selfDamage };
    }
  }

  return { canAct: true, events, selfDamage: 0 };
}

export function applyMajorStatus(
  target: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
  effect: MoveStatusEffect | null,
  random: () => number = Math.random,
  attacker?: Pokemon,
  attackerRuntimeState?: BattlePokemonRuntimeState,
): StatusApplicationResult {
  if (!effect) return { applied: false, status: null, reason: 'no-status' };
  if (target.status || runtimeState.majorStatus) {
    return { applied: false, status: effect.status, reason: 'already-has-status' };
  }
  if (hasStatusImmunity(target, effect.status)) {
    return { applied: false, status: effect.status, reason: 'immune' };
  }
  if (random() * 100 >= effect.chance) {
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
  const lines: string[] = [];
  //  synchronise
  if (attacker && target.abilityId === 28) {
    const attackerName = getPokemonDisplayName(attacker.id);
    const targetName = getPokemonDisplayName(target.id);
    const syncResult = applyMajorStatus(attacker, attackerRuntimeState!, effect, () => 0);
    if (syncResult.applied) {
      const statusName = t(`battle.status${effect.status[0].toUpperCase()}${effect.status.slice(1)}`);
      lines.push(
        t('battle.synchronizeActivated', {
          target: targetName,
          attacker: attackerName,
          status: statusName.replace('{name}', ''),
        }),
      );
    } else {
      lines.push(t('battle.synchronizeFailed', { attacker: attackerName }));
    }
  }

  return { applied: true, status: effect.status, reason: 'applied', lines };
}

export function applyEndOfTurnStatusEffects(
  pokemon: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
): EndOfTurnStatusResult {
  switch (runtimeState.majorStatus) {
    case 'poison': {
      const damage =
        runtimeState.badlyPoisonTurns > 0
          ? Math.max(1, Math.floor((pokemon.maxHp * runtimeState.badlyPoisonTurns) / 16))
          : Math.max(1, Math.floor(pokemon.maxHp / 8));
      pokemon.hp = Math.max(0, pokemon.hp - damage);
      if (runtimeState.badlyPoisonTurns > 0) {
        runtimeState.badlyPoisonTurns++;
      }
      if (pokemon.hp <= 0) pokemon.status = null;
      return { damage, status: 'poison', message: 'poison', fainted: pokemon.hp <= 0 };
    }
    case 'burn': {
      const damage = Math.max(1, Math.floor(pokemon.maxHp / 8));
      pokemon.hp = Math.max(0, pokemon.hp - damage);
      if (pokemon.hp <= 0) pokemon.status = null;
      return { damage, status: 'burn', message: 'burn', fainted: pokemon.hp <= 0 };
    }
    default:
      return { damage: 0, status: runtimeState.majorStatus, message: null, fainted: pokemon.hp <= 0 };
  }
}

export function applyLeechSeedEffect(
  target: Pokemon,
  runtimeState: BattlePokemonRuntimeState,
  recipient: Pokemon,
): LeechSeedResult {
  if (!runtimeState.leechSeeded || target.hp <= 0) {
    return { applied: false, damage: 0, healed: 0, fainted: target.hp <= 0 };
  }

  const damage = Math.max(1, Math.floor(target.maxHp / 8));
  target.hp = Math.max(0, target.hp - damage);
  const healed = Math.max(0, Math.min(recipient.maxHp, recipient.hp + damage) - recipient.hp);
  recipient.hp = Math.min(recipient.maxHp, recipient.hp + damage);
  return { applied: true, damage, healed, fainted: target.hp <= 0 };
}

export function applyRestEffect(pokemon: Pokemon, runtimeState: BattlePokemonRuntimeState): number {
  const healed = pokemon.maxHp - pokemon.hp;
  pokemon.hp = pokemon.maxHp;
  pokemon.status = 'sleep';
  runtimeState.majorStatus = 'sleep';
  runtimeState.sleepTurnsRemaining = 3;
  runtimeState.badlyPoisonTurns = 0;
  for (const move of pokemon.moves) {
    move.currentPp = move.pp;
  }
  return healed;
}

export function applyHealPercent(pokemon: Pokemon, percent: number, tags?: MoveBattleBehaviorTag[]): number {
  const hours = new Date().getHours();
  const isMorning = hours >= 5 && hours < 12;
  const isEvening = hours >= 17 && hours < 21;
  const isNoon = hours >= 10 && hours < 14;

  // moonlight
  if (tags?.includes('moonlight')) {
    if (!isEvening) {
      percent *= 0.5;
    }
  } else if (tags?.includes('synthesis')) {
    if (!isMorning && !isNoon) {
      percent *= 0.5;
    }
  } else if (tags?.includes('morning-sun')) {
    if (!isMorning) {
      percent *= 0.5;
    }
  }

  const healAmount = Math.max(1, Math.floor((pokemon.maxHp * percent) / 100));
  const healed = Math.min(healAmount, pokemon.maxHp - pokemon.hp);
  pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + healAmount);
  return healed;
}

export function applyTrapEndOfTurnEffect(target: Pokemon, runtimeState: BattlePokemonRuntimeState): TrapEffectResult {
  if (runtimeState.trappedTurnsRemaining <= 0 || target.hp <= 0) {
    return { applied: false, damage: 0, fainted: target.hp <= 0, ended: runtimeState.trappedTurnsRemaining <= 0 };
  }

  const damage = calculateMoveHpEffectAmount(target.maxHp, runtimeState.trapDamagePercent ?? 6.25);
  target.hp = Math.max(0, target.hp - damage);
  runtimeState.trappedTurnsRemaining = Math.max(0, runtimeState.trappedTurnsRemaining - 1);
  const ended = runtimeState.trappedTurnsRemaining <= 0;
  if (ended) {
    runtimeState.trapDamagePercent = null;
  }

  return { applied: true, damage, fainted: target.hp <= 0, ended };
}

/** Clear all entry hazards on a side. */
export function clearEntryHazards(sideState: BattleSideRuntimeState): void {
  sideState.stealthRockActive = false;
  sideState.spikesLayers = 0;
  sideState.toxicSpikesLayers = 0;
}

/** Clear defensive screens (Reflect + Light Screen) on a side. */
export function clearScreens(sideState: BattleSideRuntimeState): void {
  sideState.reflectTurnsRemaining = 0;
  sideState.lightScreenTurnsRemaining = 0;
}

const WEATHER_DAMAGE_IMMUNE_TYPES: Partial<Record<WeatherConditionId, PokemonType[]>> = {
  sandstorm: ['rock', 'ground', 'steel'],
  hail: ['ice'],
};

export function isWeatherDamageImmune(pokemon: Pokemon, weather: WeatherConditionId): boolean {
  const immuneTypes = WEATHER_DAMAGE_IMMUNE_TYPES[weather] ?? [];
  if (immuneTypes.some((t) => (pokemon.types as string[]).includes(t))) return true;
  if (!pokemon.abilityId) return false;
  return getAbilityBattleEffects(pokemon.abilityId).some((e) => e.kind === 'weatherImmunity');
}

export interface WeatherDamageResult {
  damage: number;
  healed: number;
  fainted: boolean;
  immune: boolean;
}

export function applyWeatherDamage(pokemon: Pokemon, weather: WeatherConditionId): WeatherDamageResult {
  // Ice Body: heal in hail instead of taking damage
  if (['hail', 'rain'].includes(weather) && pokemon.abilityId) {
    const hasIceBody = getAbilityBattleEffects(pokemon.abilityId).some(
      (e) => e.kind === 'weatherHealInstead' && e.weather === 'hail',
    );
    const hasRainDish = getAbilityBattleEffects(pokemon.abilityId).some(
      (e) => e.kind === 'weatherHealInstead' && e.weather === 'rain',
    );
    if (hasIceBody || hasRainDish) {
      const healed = Math.max(1, Math.floor(pokemon.maxHp / 16));
      pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + healed);
      return { damage: 0, healed, fainted: false, immune: false };
    }
  }

  if (weather !== 'sandstorm' && weather !== 'hail') {
    return { damage: 0, healed: 0, fainted: false, immune: true };
  }

  if (isWeatherDamageImmune(pokemon, weather)) {
    return { damage: 0, healed: 0, fainted: false, immune: true };
  }
  const damage = Math.max(1, Math.floor(pokemon.maxHp / 16));
  pokemon.hp = Math.max(0, pokemon.hp - damage);
  return { damage, healed: 0, fainted: pokemon.hp <= 0, immune: false };
}

export interface EntryHazardResult {
  stealthRockDamage: number;
  spikesDamage: number;
  toxicSpikesAbsorbed: boolean;
  statusApplied: 'poison' | 'badly-poison' | null;
  stealthRockImmune: boolean;
  spikesImmune: boolean;
  toxicSpikesImmune: boolean;
}

/**
 * Calculate and apply entry hazard damage/effects when a Pokemon enters the field.
 */
export function applyEntryHazards(
  pokemon: Pokemon,
  pokemonBattleState: BattlePokemonRuntimeState,
  sideState: BattleSideRuntimeState,
): EntryHazardResult {
  const result: EntryHazardResult = {
    stealthRockDamage: 0,
    spikesDamage: 0,
    toxicSpikesAbsorbed: false,
    statusApplied: null,
    stealthRockImmune: false,
    spikesImmune: false,
    toxicSpikesImmune: false,
  };

  const isFlying = pokemon.types.includes('flying');
  const hasLevitate = pokemon.abilityId === 26;
  const isGrounded = !isFlying && !hasLevitate;
  const isPoisonType = pokemon.types.includes('poison');

  // --- Stealth Rock ---
  if (sideState.stealthRockActive) {
    const eff = getCombinedTypeEffectiveness('rock', pokemon.types as any);
    if (eff === 0) {
      result.stealthRockImmune = true;
    } else {
      const dmg = Math.max(1, Math.floor((pokemon.maxHp / 8) * eff));
      pokemon.hp = Math.max(0, pokemon.hp - dmg);
      result.stealthRockDamage = dmg;
    }
  }

  // --- Spikes (not Flying, not Levitate) ---
  if (sideState.spikesLayers > 0) {
    if (!isGrounded) {
      result.spikesImmune = true;
    } else if (pokemon.types.includes('ghost')) {
      result.spikesImmune = true;
    } else {
      const dmg = Math.max(1, Math.floor((pokemon.maxHp * sideState.spikesLayers) / 8));
      pokemon.hp = Math.max(0, pokemon.hp - dmg);
      result.spikesDamage = dmg;
    }
  }

  // --- Toxic Spikes (not Flying, not Levitate) ---
  if (sideState.toxicSpikesLayers > 0 && isGrounded) {
    if (isPoisonType) {
      sideState.toxicSpikesLayers = 0;
      result.toxicSpikesAbsorbed = true;
    } else if (pokemon.status === null && !hasStatusImmunity(pokemon, 'poison')) {
      if (sideState.toxicSpikesLayers >= 2) {
        pokemon.status = 'poison';
        pokemonBattleState.majorStatus = 'poison';
        pokemonBattleState.badlyPoisonTurns = 1;
        result.statusApplied = 'badly-poison';
      } else {
        pokemon.status = 'poison';
        pokemonBattleState.majorStatus = 'poison';
        pokemonBattleState.badlyPoisonTurns = 0;
        result.statusApplied = 'poison';
      }
    } else {
      result.toxicSpikesImmune = true;
    }
  }

  return result;
}
