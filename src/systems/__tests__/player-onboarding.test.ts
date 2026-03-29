import { describe, expect, it } from 'vitest';
import {
  appendToPlayerNameDraft,
  finalizePlayerName,
  PLAYER_NAME_MAX_LENGTH,
  removeLastPlayerNameChar,
} from '../player-onboarding.js';

describe('player onboarding name helpers', () => {
  it('preserves Hebrew and English text while respecting the max length', () => {
    const draft = appendToPlayerNameDraft('', 'אבגABC123456789');

    expect(draft).toBe('אבגABC123456');
    expect(draft.length).toBe(PLAYER_NAME_MAX_LENGTH);
  });

  it('removes the last character from the draft', () => {
    expect(removeLastPlayerNameChar('Numeria')).toBe('Numeri');
  });

  it('falls back when the finalized name is blank', () => {
    expect(finalizePlayerName('   ', 'Player')).toBe('Player');
  });
});
