import { describe, expect, it } from 'vitest';
import {
  appendToPlayerNameDraft,
  checkPlayerRename,
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

  describe('checkPlayerRename', () => {
    it('accepts a fixed typo, trimmed and capped', () => {
      expect(checkPlayerRename('  Dani  ', 'Dnai', 'adminX')).toEqual({ ok: true, name: 'Dani' });
      expect(checkPlayerRename('אבגדהוזחטיכלמנ', 'Dnai', 'adminX')).toEqual({ ok: true, name: 'אבגדהוזחטיכל' });
    });

    it('rejects blank and unchanged names', () => {
      expect(checkPlayerRename('   ', 'Dani', 'adminX')).toEqual({ ok: false, reason: 'empty' });
      expect(checkPlayerRename('Dani ', 'Dani', 'adminX')).toEqual({ ok: false, reason: 'same' });
    });

    it('keeps the admin name reserved for the admin', () => {
      expect(checkPlayerRename('ADMINx', 'Dani', 'adminX')).toEqual({ ok: false, reason: 'reserved' });
      expect(checkPlayerRename('Boss', 'adminX', 'adminX')).toEqual({ ok: true, name: 'Boss' });
    });
  });
});
