import { describe, expect, it } from 'vitest';
import { getCharactersByRole, getDefaultHeroCharacterId } from '../../engine/character-sprites.js';
import { createNewPlayerData } from '../game-state.js';

describe('new player data hero defaults', () => {
  it('uses the first hero-tagged character as the default player sprite', () => {
    const heroes = getCharactersByRole('hero');

    expect(heroes.length).toBeGreaterThan(0);
    expect(createNewPlayerData().heroCharacterId).toBe(getDefaultHeroCharacterId());
    expect(createNewPlayerData().heroCharacterId).toBe(heroes[0].id);
  });
});
