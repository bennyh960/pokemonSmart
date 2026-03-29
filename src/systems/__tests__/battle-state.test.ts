import { describe, expect, it } from 'vitest';
import {
  applyBattleStatDelta,
  createBattlePokemonRuntimeState,
  createEmptyBattleStatModifiers,
  ensurePersistentBattleFields,
} from '../battle-state.js';

describe('battle state helpers', () => {
  it('creates empty runtime state from a persistent Pokemon status', () => {
    const runtime = createBattlePokemonRuntimeState({ status: 'sleep' });

    expect(runtime.majorStatus).toBe('sleep');
    expect(runtime.sleepTurnsRemaining).toBe(0);
    expect(runtime.freezeTurnsRemaining).toBe(0);
    expect(runtime.badlyPoisonTurns).toBe(0);
    expect(runtime.statModifiers).toEqual(createEmptyBattleStatModifiers());
    expect(runtime.turnFlags).toEqual({
      flinched: false,
      mustRecharge: false,
      protected: false,
      charging: false,
      skipTurn: false,
    });
  });

  it('normalizes persistent Pokemon statuses during migration', () => {
    const pokemon: Record<string, unknown> = { status: 'paralysis' };
    const freshPokemon: Record<string, unknown> = {};

    ensurePersistentBattleFields(pokemon);
    ensurePersistentBattleFields(freshPokemon);

    expect(pokemon.status).toBe('paralyze');
    expect(freshPokemon.status).toBeNull();
  });

  it('caps battle stat modifier percentages at the configured bounds', () => {
    expect(applyBattleStatDelta(150, 2)).toBe(200);
    expect(applyBattleStatDelta(-150, -2)).toBe(-200);
    expect(applyBattleStatDelta(0, 1)).toBe(50);
  });
});
