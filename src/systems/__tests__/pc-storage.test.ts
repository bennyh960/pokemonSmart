import { describe, it, expect, beforeEach } from 'vitest';
import { createNewPlayerData, getPlayerData, startSandboxGame } from '../game-state';
import {
  moveBoxPokemon,
  takeStorageSnapshot,
  restoreStorageSnapshot,
  releaseFromBox,
  depositPokemon,
  releaseFromParty,
  MIN_PARTY_FOR_RELEASE,
} from '../pc-storage';
import type { Pokemon } from '../../types/index.js';

const mon = (id: number) => ({ id, uuid: `u${id}` }) as Pokemon;

beforeEach(() => {
  const pd = createNewPlayerData();
  pd.party = [mon(1), mon(4), mon(7)];
  startSandboxGame(pd);
});

describe('moveBoxPokemon', () => {
  it('moves to an empty slot and swaps with an occupied one', () => {
    const box = getPlayerData().boxes[0].pokemon;
    box[0] = mon(25);
    box[1] = mon(16);
    expect(moveBoxPokemon(0, 0, 0, 5)).toBe(true);
    expect(box[0]).toBeNull();
    expect(box[5]?.id).toBe(25);
    expect(moveBoxPokemon(0, 5, 0, 1)).toBe(true);
    expect(box[1]?.id).toBe(25);
    expect(box[5]?.id).toBe(16);
  });

  it('null target = first empty slot of the other box; refuses a full box or an empty source', () => {
    const pd = getPlayerData();
    pd.boxes[0].pokemon[3] = mon(25);
    pd.boxes[1].pokemon[0] = mon(16);
    expect(moveBoxPokemon(0, 3, 1, null)).toBe(true);
    expect(pd.boxes[1].pokemon[1]?.id).toBe(25);
    expect(moveBoxPokemon(0, 3, 1, null)).toBe(false); // slot now empty
    pd.boxes[2].pokemon.fill(mon(10));
    expect(moveBoxPokemon(1, 0, 2, null)).toBe(false);
  });
});

describe('storage snapshot (undo)', () => {
  it('restores party, boxes and the Pokédex after a release', () => {
    const pd = getPlayerData();
    pd.boxes[0].pokemon[2] = mon(25);
    pd.pokedex[25] = 'caught';
    const snap = takeStorageSnapshot();
    releaseFromBox(0, 2);
    depositPokemon(0, 0, 0);
    expect(pd.pokedex[25]).toBe('release');
    restoreStorageSnapshot(snap);
    expect(pd.boxes[0].pokemon[2]?.id).toBe(25);
    expect(pd.boxes[0].pokemon[0]).toBeNull();
    expect(pd.party.map((p) => p.id)).toEqual([1, 4, 7]);
    expect(pd.pokedex[25]).toBe('caught');
  });
});

describe('releaseFromParty', () => {
  it('keeps more than MIN_PARTY_FOR_RELEASE', () => {
    expect(releaseFromParty(0)?.id).toBe(1);
    expect(getPlayerData().party.length).toBe(MIN_PARTY_FOR_RELEASE);
    expect(releaseFromParty(0)).toBeNull();
  });
});
