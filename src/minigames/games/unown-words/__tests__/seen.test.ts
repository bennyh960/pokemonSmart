import { describe, expect, it } from 'vitest';
import { mergeSeen, readSeen } from '../seen.js';

describe('unown-words seen data', () => {
  it('reads safely and merges without duplicates', () => {
    expect(readSeen(undefined)).toEqual({ letters: [], words: [] });
    expect(readSeen({ seen: { letters: ['a', 3], words: 'x' } })).toEqual({ letters: ['a'], words: [] });
    const merged = mergeSeen({ letters: ['b'], words: ['fire'] }, [{ letters: ['A', 'b'], words: ['Fire', 'water'] }]);
    expect(merged).toEqual({ letters: ['a', 'b'], words: ['fire', 'water'] });
  });
});
