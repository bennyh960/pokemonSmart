import { describe, it, expect } from 'vitest';
import { showsTrueForm } from '../npc.js';
import { FLAGS } from '../../data/story/flags.js';

describe('showsTrueForm (wild-Pokémon NPC with no overworld sheet)', () => {
  const sight = { [FLAGS.GLITCH_SIGHT]: true };
  it('story look: a person until glitch sight', () => {
    expect(showsTrueForm({}, {})).toBe(false);
    expect(showsTrueForm({}, sight)).toBe(true);
  });
  it('its own look always wins', () => {
    expect(showsTrueForm({ look: 'pokemon' }, {})).toBe(true);
    expect(showsTrueForm({ look: 'person' }, sight)).toBe(false);
  });
});
