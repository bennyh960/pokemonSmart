import { describe, expect, it } from 'vitest';
import type { Pokemon } from '../../types/index.js';
import type { MoveStatusEffect } from '../../types/battle-metadata.js';
import { getMoveByName } from '../../services/pokemon-data.js';
import {
  applyEndOfTurnStatusEffects,
  applyDrainHealing,
  applyLeechSeedEffect,
  applyMajorStatus,
  applyPostMoveTurnFlags,
  applyTrapEndOfTurnEffect,
  applyRecoilDamage,
  applyStatChanges,
  applyVolatileMoveEffects,
  calculateMoveHpEffectAmount,
  clearEndOfTurnFlags,
  createBattleRuntimeStateForPokemon,
  determineTurnOrder,
  doesMoveHit,
  getDisplayedStatChanges,
  getDisplayedVolatileStatuses,
  getEffectiveSpeed,
  getModifiedStatValue,
  isBattlePokemonTrapped,
  isTargetImmuneToMoveType,
  isTargetImmuneToStatusEffectFromMoveType,
  isTargetImmuneToVolatileEffectFromMoveType,
  processBeforeMoveEffects,
  processStartOfTurnStatus,
  rollCriticalHit,
  tryApplyFlinch,
} from '../battle-system.js';

function createTestPokemon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    id: 25,
    name: 'Pikachu',
    level: 20,
    hp: 80,
    maxHp: 80,
    attack: 40,
    defense: 35,
    specialAttack: 50,
    specialDefense: 40,
    speed: 60,
    types: ['electric'],
    moves: [],
    xp: 0,
    xpToNext: 100,
    isGlitched: false,
    abilityId: null,
    natureId: null,
    heldItemId: null,
    status: null,
    ...overrides,
  };
}

describe('battle system helpers', () => {
  it('uses move priority before speed when deciding turn order', () => {
    const player = createTestPokemon({ speed: 100 });
    const enemy = createTestPokemon({ id: 143, name: 'Snorlax', speed: 20, types: ['normal'] });
    const quickAttack = getMoveByName('quick attack');
    const tackle = getMoveByName('tackle');

    expect(quickAttack).toBeDefined();
    expect(tackle).toBeDefined();

    const result = determineTurnOrder(
      player,
      createBattleRuntimeStateForPokemon(player),
      tackle!.id,
      enemy,
      createBattleRuntimeStateForPokemon(enemy),
      quickAttack!.id,
      () => 0,
    );

    expect(result.enemyActsFirst).toBe(true);
    expect(result.enemyPriority).toBe(1);
    expect(result.playerPriority).toBe(0);
  });

  it('cuts paralysis speed and can block the turn', () => {
    const player = createTestPokemon({ status: 'paralyze', speed: 80 });
    const runtime = createBattleRuntimeStateForPokemon(player);

    expect(getEffectiveSpeed(player, runtime)).toBe(40);

    const blocked = processStartOfTurnStatus(player, runtime, () => 0.1);
    expect(blocked).toEqual({ canAct: false, event: 'fully-paralyzed' });

    const allowed = processStartOfTurnStatus(player, runtime, () => 0.9);
    expect(allowed).toEqual({ canAct: true, event: null });
  });

  it('blocks sleep turns and then wakes the pokemon up', () => {
    const player = createTestPokemon({ status: 'sleep' });
    const runtime = createBattleRuntimeStateForPokemon(player, () => 0);
    runtime.sleepTurnsRemaining = 1;

    const result = processStartOfTurnStatus(player, runtime, () => 0);

    expect(result).toEqual({ canAct: true, event: 'woke-up' });
    expect(player.status).toBeNull();
    expect(runtime.majorStatus).toBeNull();
  });

  it('respects status immunities and status chance checks', () => {
    const poisonEffect: MoveStatusEffect = {
      status: 'poison',
      chance: 100,
      target: 'target',
    };
    const paralyzeEffect: MoveStatusEffect = {
      status: 'paralyze',
      chance: 25,
      target: 'target',
    };

    const immuneTarget = createTestPokemon({ id: 66, name: 'Machop', abilityId: 7 });
    const immuneResult = applyMajorStatus(
      immuneTarget,
      createBattleRuntimeStateForPokemon(immuneTarget),
      paralyzeEffect,
      () => 0,
    );
    expect(immuneResult.reason).toBe('immune');

    const normalTarget = createTestPokemon({ id: 133, name: 'Eevee' });
    const chanceFailResult = applyMajorStatus(
      normalTarget,
      createBattleRuntimeStateForPokemon(normalTarget),
      paralyzeEffect,
      () => 0.9,
    );
    expect(chanceFailResult.reason).toBe('chance-failed');

    const appliedResult = applyMajorStatus(
      normalTarget,
      createBattleRuntimeStateForPokemon(normalTarget),
      poisonEffect,
      () => 0,
    );
    expect(appliedResult).toMatchObject({ applied: true, status: 'poison', reason: 'applied' });
    expect(normalTarget.status).toBe('poison');
  });

  it('uses the type chart for full move immunities', () => {
    expect(isTargetImmuneToMoveType(createTestPokemon({ types: ['ground'] }), 'electric')).toBe(true);
    expect(isTargetImmuneToMoveType(createTestPokemon({ types: ['flying'] }), 'ground')).toBe(true);
    expect(isTargetImmuneToMoveType(createTestPokemon({ types: ['dark'] }), 'psychic')).toBe(true);
    expect(isTargetImmuneToMoveType(createTestPokemon({ types: ['ghost'] }), 'normal')).toBe(true);
    expect(isTargetImmuneToMoveType(createTestPokemon({ types: ['ghost'] }), 'fighting')).toBe(true);
    expect(isTargetImmuneToMoveType(createTestPokemon({ types: ['steel'] }), 'poison')).toBe(true);
  });

  it('blocks same-type major-status effects without blocking damage by itself', () => {
    expect(isTargetImmuneToStatusEffectFromMoveType(
      createTestPokemon({ types: ['fire'] }),
      'fire',
      { status: 'burn', chance: 10, target: 'target' },
    )).toBe(true);
    expect(isTargetImmuneToStatusEffectFromMoveType(
      createTestPokemon({ types: ['ice'] }),
      'ice',
      { status: 'freeze', chance: 10, target: 'target' },
    )).toBe(true);
    expect(isTargetImmuneToStatusEffectFromMoveType(
      createTestPokemon({ types: ['electric'] }),
      'electric',
      { status: 'paralyze', chance: 10, target: 'target' },
    )).toBe(true);
    expect(isTargetImmuneToStatusEffectFromMoveType(
      createTestPokemon({ types: ['grass'] }),
      'grass',
      { status: 'sleep', chance: 100, target: 'target' },
    )).toBe(true);
    expect(isTargetImmuneToStatusEffectFromMoveType(
      createTestPokemon({ types: ['water'] }),
      'fire',
      { status: 'burn', chance: 10, target: 'target' },
    )).toBe(false);
  });

  it('applies poison and burn chip damage at end of turn', () => {
    const poisoned = createTestPokemon({ maxHp: 80, hp: 80, status: 'poison' });
    const poisonedRuntime = createBattleRuntimeStateForPokemon(poisoned);
    const poisonResult = applyEndOfTurnStatusEffects(poisoned, poisonedRuntime);

    expect(poisonResult.damage).toBe(10);
    expect(poisoned.hp).toBe(70);
    expect(poisonResult.message).toBe('poison');

    const burned = createTestPokemon({ maxHp: 80, hp: 80, status: 'burn' });
    const burnedRuntime = createBattleRuntimeStateForPokemon(burned);
    const burnResult = applyEndOfTurnStatusEffects(burned, burnedRuntime);

    expect(burnResult.damage).toBe(10);
    expect(burned.hp).toBe(70);
    expect(burnResult.message).toBe('burn');
  });

  it('applies battle-only stat stages and exposes them for UI display', () => {
    const player = createTestPokemon({ attack: 40, speed: 60 });
    const runtime = createBattleRuntimeStateForPokemon(player);

    const changes = applyStatChanges(runtime, [
      { stat: 'attack', stages: 1, target: 'user', chance: 100 },
      { stat: 'speed', stages: -2, target: 'user', chance: 100 },
    ], 'user', () => 0);

    expect(changes).toHaveLength(2);
    expect(getModifiedStatValue(player, runtime, 'attack')).toBe(60);
    expect(getEffectiveSpeed(player, runtime)).toBe(30);
    expect(getDisplayedStatChanges(runtime)).toEqual([
      { stat: 'attack', stages: 1 },
      { stat: 'speed', stages: -2 },
    ]);
  });

  it('uses accuracy and evasion stages when checking move hit chance', () => {
    const attacker = createBattleRuntimeStateForPokemon(createTestPokemon());
    const defender = createBattleRuntimeStateForPokemon(createTestPokemon());

    applyStatChanges(attacker, [{ stat: 'accuracy', stages: 1, target: 'user', chance: 100 }], 'user', () => 0);
    applyStatChanges(defender, [{ stat: 'evasion', stages: 1, target: 'user', chance: 100 }], 'user', () => 0);

    const boostedHit = doesMoveHit(80, attacker, createBattleRuntimeStateForPokemon(createTestPokemon()), () => 0.79);
    expect(boostedHit).toEqual({ hit: true, chance: 100 });

    const reducedHit = doesMoveHit(80, createBattleRuntimeStateForPokemon(createTestPokemon()), defender, () => 0.6);
    expect(reducedHit.hit).toBe(false);
    expect(reducedHit.chance).toBeLessThan(80);
  });

  it('exposes volatile statuses for battle ui indicators', () => {
    const runtime = createBattleRuntimeStateForPokemon(createTestPokemon());
    runtime.confusionTurnsRemaining = 2;
    runtime.leechSeeded = true;

    expect(getDisplayedVolatileStatuses(runtime)).toEqual(['confuse', 'seed']);
  });

  it('applies flinch only when the target still has a turn left', () => {
    const target = createTestPokemon();
    const runtime = createBattleRuntimeStateForPokemon(target);

    expect(tryApplyFlinch(runtime, 30, true, () => 0)).toBe(true);

    const flinchResult = processBeforeMoveEffects(target, runtime, () => 0.9);
    expect(flinchResult).toEqual({
      canAct: false,
      events: ['flinched'],
      selfDamage: 0,
    });
    expect(runtime.turnFlags.flinched).toBe(false);

    expect(tryApplyFlinch(runtime, 30, false, () => 0)).toBe(false);
    clearEndOfTurnFlags(runtime);
    expect(runtime.turnFlags.flinched).toBe(false);
  });

  it('forces a recharge turn after must-recharge moves are used', () => {
    const user = createTestPokemon();
    const runtime = createBattleRuntimeStateForPokemon(user);
    const hyperBeam = getMoveByName('hyper beam');

    expect(hyperBeam).toBeDefined();
    applyPostMoveTurnFlags(runtime, hyperBeam!.id);
    expect(runtime.turnFlags.mustRecharge).toBe(true);

    const rechargeResult = processBeforeMoveEffects(user, runtime, () => 0.9);
    expect(rechargeResult).toEqual({
      canAct: false,
      events: ['must-recharge'],
      selfDamage: 0,
    });
    expect(runtime.turnFlags.mustRecharge).toBe(false);
  });

  it('applies drain healing and recoil from actual damage dealt', () => {
    const drainingAttacker = createTestPokemon({ hp: 30, maxHp: 80 });
    const drained = applyDrainHealing(drainingAttacker, 20, 50);
    expect(calculateMoveHpEffectAmount(20, 50)).toBe(10);
    expect(drained).toBe(10);
    expect(drainingAttacker.hp).toBe(40);

    const recoilingAttacker = createTestPokemon({ hp: 18, maxHp: 80 });
    const recoilResult = applyRecoilDamage(recoilingAttacker, 20, 25);
    expect(recoilResult).toEqual({ damage: 5, fainted: false });
    expect(recoilingAttacker.hp).toBe(13);
  });

  it('prevents critical hits when the defender has Battle Armor', () => {
    const defender = createTestPokemon({ id: 95, name: 'Onix', abilityId: 4 });
    const slash = getMoveByName('slash');

    expect(slash).toBeDefined();
    expect(rollCriticalHit(slash!.id, defender, () => 0)).toBe(false);
    expect(rollCriticalHit(slash!.id, createTestPokemon({ id: 1, name: 'Bulbasaur' }), () => 0)).toBe(true);
  });

  it('applies confusion as a battle-only volatile effect', () => {
    const target = createTestPokemon();
    const runtime = createBattleRuntimeStateForPokemon(target);

    const result = applyVolatileMoveEffects(target, runtime, [
      { id: 'confusion', target: 'target', chance: 100, minTurns: 2, maxTurns: 5 },
    ], 'target', () => 0);

    expect(result).toEqual([
      { id: 'confusion', target: 'target', applied: true, reason: 'applied' },
    ]);
    expect(runtime.confusionTurnsRemaining).toBe(2);
  });

  it('processes confusion turns, self-hit, and snap out correctly', () => {
    const target = createTestPokemon({ hp: 80, maxHp: 80, attack: 40, defense: 35 });
    const runtime = createBattleRuntimeStateForPokemon(target);
    runtime.confusionTurnsRemaining = 2;

    const hurtResult = processBeforeMoveEffects(target, runtime, () => 0);
    expect(hurtResult.canAct).toBe(false);
    expect(hurtResult.events).toEqual(['confused', 'hurt-itself-confusion']);
    expect(hurtResult.selfDamage).toBeGreaterThan(0);
    expect(target.hp).toBeLessThan(80);
    expect(runtime.confusionTurnsRemaining).toBe(1);

    const snappedOutResult = processBeforeMoveEffects(target, runtime, () => 0);
    expect(snappedOutResult).toEqual({
      canAct: true,
      events: ['snapped-out'],
      selfDamage: 0,
    });
    expect(runtime.confusionTurnsRemaining).toBe(0);
  });

  it('applies leech seed only to valid targets and drains hp at end of turn', () => {
    const seeded = createTestPokemon({ id: 7, name: 'Squirtle', types: ['water'], hp: 64, maxHp: 80 });
    const seededState = createBattleRuntimeStateForPokemon(seeded);
    const seeder = createTestPokemon({ id: 1, name: 'Bulbasaur', types: ['grass'], hp: 30, maxHp: 80 });

    const applyResult = applyVolatileMoveEffects(seeded, seededState, [
      { id: 'leech-seed', target: 'target', chance: 100 },
    ], 'target', () => 0);

    expect(applyResult).toEqual([
      { id: 'leech-seed', target: 'target', applied: true, reason: 'applied' },
    ]);
    expect(seededState.leechSeeded).toBe(true);

    const drainResult = applyLeechSeedEffect(seeded, seededState, seeder);
    expect(drainResult).toEqual({
      applied: true,
      damage: 10,
      healed: 10,
      fainted: false,
    });
    expect(seeded.hp).toBe(54);
    expect(seeder.hp).toBe(40);
  });

  it('treats grass types as immune to leech seed', () => {
    const grassTarget = createTestPokemon({ id: 1, name: 'Bulbasaur', types: ['grass'] });
    const runtime = createBattleRuntimeStateForPokemon(grassTarget);

    const result = applyVolatileMoveEffects(grassTarget, runtime, [
      { id: 'leech-seed', target: 'target', chance: 100 },
    ], 'target', () => 0);

    expect(result).toEqual([
      { id: 'leech-seed', target: 'target', applied: false, reason: 'immune' },
    ]);
    expect(runtime.leechSeeded).toBe(false);
  });

  it('blocks same-type volatile effects like grass leech seed on grass targets', () => {
    expect(isTargetImmuneToVolatileEffectFromMoveType(
      createTestPokemon({ types: ['grass'] }),
      'grass',
      { id: 'leech-seed', target: 'target', chance: 100 },
    )).toBe(true);
    expect(isTargetImmuneToVolatileEffectFromMoveType(
      createTestPokemon({ types: ['water'] }),
      'grass',
      { id: 'leech-seed', target: 'target', chance: 100 },
    )).toBe(false);
  });

  it('applies trapping as a battle-only volatile effect and chips hp each end turn', () => {
    const target = createTestPokemon({ types: ['water'], hp: 64, maxHp: 80 });
    const runtime = createBattleRuntimeStateForPokemon(target);

    const result = applyVolatileMoveEffects(target, runtime, [
      { id: 'trap', target: 'target', chance: 100, minTurns: 2, maxTurns: 5, damagePercent: 6.25 },
    ], 'target', () => 0);

    expect(result).toEqual([
      { id: 'trap', target: 'target', applied: true, reason: 'applied' },
    ]);
    expect(isBattlePokemonTrapped(runtime)).toBe(true);
    expect(getDisplayedVolatileStatuses(runtime)).toEqual(['trap']);

    const firstTick = applyTrapEndOfTurnEffect(target, runtime);
    expect(firstTick).toEqual({ applied: true, damage: 5, fainted: false, ended: false });
    expect(target.hp).toBe(59);
    expect(runtime.trappedTurnsRemaining).toBe(1);

    const secondTick = applyTrapEndOfTurnEffect(target, runtime);
    expect(secondTick).toEqual({ applied: true, damage: 5, fainted: false, ended: true });
    expect(target.hp).toBe(54);
    expect(runtime.trappedTurnsRemaining).toBe(0);
    expect(runtime.trapDamagePercent).toBeNull();
    expect(isBattlePokemonTrapped(runtime)).toBe(false);
  });
});
