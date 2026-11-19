import { beforeAll, describe, expect, it } from 'vitest';
import { loadHeavyData } from '../../services/__tests__/heavy-data.js';
import type { Pokemon } from '../../types/index.js';
import type { MoveStatusEffect } from '../../types/battle-metadata.js';
import { getMoveByName } from '../../services/pokemon-data.js';
import {
  advanceSideEffectTurns,
  applyEndOfTurnStatusEffects,
  applyDrainHealing,
  applyLeechSeedEffect,
  applyLeaveUserAtOneHpCost,
  applyMajorStatus,
  applyPostMoveTurnFlags,
  applySideEffects,
  applyTrapEndOfTurnEffect,
  applyRecoilDamage,
  applyStatChanges,
  applyVolatileMoveEffects,
  calculateMoveHpEffectAmount,
  clearEndOfTurnFlags,
  clearChargingMove,
  createBattleRuntimeStateForPokemon,
  determineTurnOrder,
  doesMoveHit,
  getChargingMoveId,
  getDisplayedSideStatuses,
  getDisplayedStatChanges,
  getDisplayedVolatileStatuses,
  getEffectiveSpeed,
  getHiddenPowerType,
  neutralizeHeldItem,
  advanceBide,
  applyNightmareEffect,
  doesSuckerPunchSucceed,
  getFuryCutterPower,
  getPsywaveDamage,
  pickTriAttackAilment,
  getSideDamageTakenMultiplier,
  getModifiedStatValue,
  isBattlePokemonTrapped,
  isMistActive,
  isSafeguardActive,
  isTargetImmuneToMoveType,
  isTargetImmuneToStatusEffectFromMoveType,
  isTargetImmuneToVolatileEffectFromMoveType,
  processBeforeMoveEffects,
  processStartOfTurnStatus,
  rollCriticalHit,
  startChargingMove,
  tryApplyFlinch,
} from '../battle-system.js';
import { createBattleSideRuntimeState } from '../battle-state.js';

function createTestPokemon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uuid: crypto.randomUUID(),
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

beforeAll(loadHeavyData);

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
    expect(allowed).toEqual({ canAct: true, event: null, skipAnimation: true });
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

    const normalTarget = createTestPokemon({ id: 133, name: 'Eevee', types: ['normal'] });
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

  it('blocks status effects from same-type moves (target type includes move type)', () => {
    // Same-type → immune regardless of which status
    expect(isTargetImmuneToStatusEffectFromMoveType(
      createTestPokemon({ types: ['fire'] }),
      'fire',
      { status: 'burn', chance: 10, target: 'target' },
    )).toBe(true);
    expect(isTargetImmuneToStatusEffectFromMoveType(
      createTestPokemon({ types: ['electric'] }),
      'electric',
      { status: 'paralyze', chance: 10, target: 'target' },
    )).toBe(true);
    // Grass-type immune to sleep from Grass move (Sleep Powder)
    expect(isTargetImmuneToStatusEffectFromMoveType(
      createTestPokemon({ types: ['grass'] }),
      'grass',
      { status: 'sleep', chance: 100, target: 'target' },
    )).toBe(true);
    // Dual-type: Venusaur (Grass/Poison) immune to Grass-type sleep
    expect(isTargetImmuneToStatusEffectFromMoveType(
      createTestPokemon({ types: ['grass', 'poison'] }),
      'grass',
      { status: 'sleep', chance: 100, target: 'target' },
    )).toBe(true);
    // Different type → not immune
    expect(isTargetImmuneToStatusEffectFromMoveType(
      createTestPokemon({ types: ['grass', 'poison'] }),
      'psychic',
      { status: 'sleep', chance: 100, target: 'target' },
    )).toBe(false);
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

  it('tracks charging moves in battle runtime state', () => {
    const runtime = createBattleRuntimeStateForPokemon(createTestPokemon());

    expect(getChargingMoveId(runtime)).toBeNull();

    startChargingMove(runtime, 76);
    expect(getChargingMoveId(runtime)).toBe(76);
    expect(runtime.turnFlags.charging).toBe(true);

    clearChargingMove(runtime);
    expect(getChargingMoveId(runtime)).toBeNull();
    expect(runtime.turnFlags.charging).toBe(false);
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

  it('can leave self-sacrifice move users at 1 hp', () => {
    const attacker = createTestPokemon({ hp: 80, maxHp: 80 });

    const result = applyLeaveUserAtOneHpCost(attacker);

    expect(result).toEqual({ damage: 79, fainted: false });
    expect(attacker.hp).toBe(1);
  });

  it('prevents critical hits when the defender has Battle Armor', () => {
    const defender = createTestPokemon({ id: 95, name: 'Onix', abilityId: 4 });
    const slash = getMoveByName('slash');

    expect(slash).toBeDefined();
    expect(rollCriticalHit(slash!.id, defender, () => 0)).toBe(false);
    expect(rollCriticalHit(slash!.id, createTestPokemon({ id: 1, name: 'Bulbasaur' }), () => 0)).toBe(true);
  });

  it('Attract infatuates a different species, and the infatuation ends when its source leaves', () => {
    const attacker = createTestPokemon({ id: 133, name: 'Eevee' });
    const target = createTestPokemon();
    const runtime = createBattleRuntimeStateForPokemon(target);
    const attract = { id: 'infatuation' as const, target: 'target' as const, chance: 100 };

    expect(applyVolatileMoveEffects(target, runtime, [attract], 'target', () => 0, attacker)[0]).toMatchObject({
      applied: true,
    });
    expect(runtime.infatuatedWith).toBe(attacker.uuid);
    expect(applyVolatileMoveEffects(target, runtime, [attract], 'target', () => 0, attacker)[0].reason).toBe(
      'already-active',
    );

    const stuck = processBeforeMoveEffects(target, runtime, () => 0.1, undefined, attacker);
    expect(stuck).toMatchObject({ canAct: false, events: ['infatuated', 'immobilized-by-love'] });
    const acts = processBeforeMoveEffects(target, runtime, () => 0.9, undefined, attacker);
    expect(acts).toMatchObject({ canAct: true, events: ['infatuated'] });

    const replacement = createTestPokemon({ id: 1, name: 'Bulbasaur' });
    expect(processBeforeMoveEffects(target, runtime, () => 0.1, undefined, replacement).canAct).toBe(true);
    expect(runtime.infatuatedWith).toBeNull();
  });

  it('Attract fails on the same species', () => {
    const target = createTestPokemon();
    const runtime = createBattleRuntimeStateForPokemon(target);
    const [result] = applyVolatileMoveEffects(
      target,
      runtime,
      [{ id: 'infatuation', target: 'target', chance: 100 }],
      'target',
      () => 0,
      createTestPokemon(),
    );
    expect(result.reason).toBe('immune');
    expect(runtime.infatuatedWith).toBeNull();
  });

  it('Nightmare: only on a sleeping target, 1/4 HP per turn, ends on waking', () => {
    const target = createTestPokemon({ status: 'sleep', hp: 100, maxHp: 100 });
    const runtime = createBattleRuntimeStateForPokemon(target);
    const nightmare = { id: 'nightmare' as const, target: 'target' as const, chance: 100 };
    expect(applyVolatileMoveEffects(target, runtime, [nightmare], 'target', () => 0)[0].applied).toBe(true);
    expect(applyNightmareEffect(target, runtime)).toEqual({ applied: true, damage: 25 });
    expect(target.hp).toBe(75);
    runtime.majorStatus = null;
    target.status = null;
    expect(applyNightmareEffect(target, runtime).applied).toBe(false);
    expect(runtime.nightmare).toBe(false);

    const awake = createTestPokemon();
    const awakeRuntime = createBattleRuntimeStateForPokemon(awake);
    expect(applyVolatileMoveEffects(awake, awakeRuntime, [nightmare], 'target', () => 0)[0].reason).toBe('immune');
  });

  it('Fury Cutter doubles per hit up to 160; Psywave is 0.5-1.5x level; Tri Attack picks one status', () => {
    expect([0, 1, 2, 3, 4].map((n) => getFuryCutterPower(40, n))).toEqual([40, 80, 160, 160, 160]);
    expect(getPsywaveDamage(50, () => 0)).toBe(25);
    expect(getPsywaveDamage(50, () => 0.999)).toBe(74);
    expect(getPsywaveDamage(1, () => 0)).toBe(1);
    expect(pickTriAttackAilment(() => 0).status).toBe('burn');
    expect(pickTriAttackAilment(() => 0.5).status).toBe('paralyze');
    expect(pickTriAttackAilment(() => 0.9)).toMatchObject({ status: 'freeze', chance: 20 });
  });

  it('Sucker Punch needs a target that has not moved yet and chose a damaging move', () => {
    expect(doesSuckerPunchSucceed(80, false)).toBe(true);
    expect(doesSuckerPunchSucceed(0, false)).toBe(false); // status move
    expect(doesSuckerPunchSucceed(null, false)).toBe(false); // switch / item
    expect(doesSuckerPunchSucceed(80, true)).toBe(false); // already attacked
  });

  it('Teleport raises evasion and speed by 1 instead of fleeing', () => {
    expect(getMoveByName('teleport')?.battle.statChanges.map((c) => [c.stat, c.stages, c.target])).toEqual([
      ['evasion', 1, 'user'],
      ['speed', 1, 'user'],
    ]);
  });

  it('Bide stores for 2 turns, then releases 2x the damage taken and unlocks', () => {
    const runtime = createBattleRuntimeStateForPokemon(createTestPokemon());
    const bideId = getMoveByName('bide')!.id;
    expect(getMoveByName('bide')?.battle.behaviorTags).toContain('bide');

    expect(advanceBide(runtime, bideId)).toEqual({ kind: 'store' });
    expect(runtime.lockedInMoveId).toBe(bideId);
    runtime.bideDamage += 12;
    expect(advanceBide(runtime, bideId)).toEqual({ kind: 'store' });
    runtime.bideDamage += 8;
    expect(advanceBide(runtime, bideId)).toEqual({ kind: 'release', damage: 40 });
    expect(runtime.lockedInMoveId).toBeNull();
    expect(runtime.bideTurnsRemaining).toBe(0);

    // A new Bide starts fresh
    expect(advanceBide(runtime, bideId)).toEqual({ kind: 'store' });
    expect(runtime.bideDamage).toBe(0);
  });

  it('Thief neutralizes the held item for the battle (undoing its stat stages) without stealing it', () => {
    const holder = createTestPokemon({ heldItemId: 'choice-band' }); // +1 Attack at battle start
    const runtime = createBattleRuntimeStateForPokemon(holder);
    expect(runtime.heldItem).not.toBeNull();
    const before = runtime.statModifiers.attack;
    runtime.softLockedInMovesId = [1, 2];

    expect(neutralizeHeldItem(runtime)).not.toBeNull();
    expect(runtime.heldItem).toBeNull();
    expect(runtime.softLockedInMovesId).toBeNull();
    expect(runtime.statModifiers.attack).toBeLessThan(before);
    expect(holder.heldItemId).toBe('choice-band');
    expect(neutralizeHeldItem(runtime)).toBeNull();
    expect(getMoveByName('thief')?.battle.behaviorTags).toContain('thief');
  });

  it('Roar / Whirlwind debuff instead of forcing a switch', () => {
    const roar = getMoveByName('roar')!.battle;
    const whirlwind = getMoveByName('whirlwind')!.battle;
    expect(roar.target).toBe('selected-pokemon');
    expect(roar.statChanges.map((c) => [c.stat, c.stages, c.chance])).toEqual([
      ['attack', -2, 100],
      ['specialAttack', -2, 100],
      ['speed', -1, 30],
    ]);
    expect(whirlwind.statChanges.map((c) => [c.stat, c.stages, c.chance])).toEqual([
      ['defense', -2, 100],
      ['specialDefense', -2, 100],
      ['speed', -1, 30],
    ]);
  });

  it('Hidden Power takes the user\'s first type', () => {
    expect(getHiddenPowerType(createTestPokemon({ types: ['fire', 'flying'] }))).toBe('fire');
    expect(getMoveByName('hidden power')?.battle.behaviorTags).toContain('hidden-power');
    expect(getMoveByName('attract')?.battle.effects[0]).toMatchObject({ id: 'infatuation', chance: 100 });
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

  it('applies and expires side-field protections', () => {
    const sideState = createBattleSideRuntimeState();

    const result = applySideEffects(sideState, [
      { id: 'reflect', target: 'user', turns: 5 },
      { id: 'mist', target: 'user', turns: 5 },
    ], 'user');

    expect(result).toEqual([
      { id: 'reflect', target: 'user', applied: true, reason: 'applied' },
      { id: 'mist', target: 'user', applied: true, reason: 'applied' },
    ]);
    expect(getDisplayedSideStatuses(sideState)).toEqual(['reflect', 'mist']);
    expect(getSideDamageTakenMultiplier(sideState, 'physical')).toBe(0.5);
    expect(getSideDamageTakenMultiplier(sideState, 'special')).toBe(1);
    expect(isMistActive(sideState)).toBe(true);
    expect(isSafeguardActive(sideState)).toBe(false);

    for (let i = 0; i < 4; i++) {
      expect(advanceSideEffectTurns(sideState)).toEqual([]);
    }
    expect(advanceSideEffectTurns(sideState)).toEqual(['reflect', 'mist']);
    expect(getDisplayedSideStatuses(sideState)).toEqual([]);
  });
});
