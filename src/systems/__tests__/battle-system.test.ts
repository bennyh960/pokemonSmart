import { describe, expect, it } from 'vitest';
import type { Pokemon } from '../../types/index.js';
import type { MoveStatusEffect } from '../../types/battle-metadata.js';
import { getMoveByName } from '../../services/pokemon-data.js';
import {
  applyEndOfTurnStatusEffects,
  applyMajorStatus,
  createBattleRuntimeStateForPokemon,
  determineTurnOrder,
  getEffectiveSpeed,
  processStartOfTurnStatus,
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
});
