import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../auth/supabase-client.js', () => ({ supabase: {} }));
vi.mock('../../../services/pokemon-data.js', async (orig) => (await import('./moves-mock.js')).withMoves(orig));

import {
  cardDays,
  cardState,
  claimableMilestones,
  DEX_MILESTONES,
  dexPrizeWaiting,
  readDex,
  wordOfDayClaimable,
} from '../dex.js';
import { WORDS_HOME } from '../useWords.js';
import type { WordStats } from '../learning.js';
import type { Word } from '../words.js';

const knownStats = (n: number): WordStats =>
  Object.fromEntries(Array.from({ length: n }, (_, i) => [`w${i}`, { box: 3, seen: 3, right: 3, known: true }]));

const word: Word = {
  id: 'jump',
  en: 'jump',
  he: 'לקפוץ',
  say: 'ג׳ַמְפּ',
  theme: 'actions',
  tier: 1,
  picture: { kind: 'emoji', emoji: '🤸' },
};

describe('Word Dex', () => {
  it('milestones open as words become known and are claimed once', () => {
    expect(claimableMilestones(knownStats(9), readDex(undefined))).toEqual([]);
    expect(claimableMilestones(knownStats(30), readDex(undefined)).map((m) => m.known)).toEqual([10, 25]);
    expect(claimableMilestones(knownStats(30), { claimed: [10] }).map((m) => m.known)).toEqual([25]);
    expect(DEX_MILESTONES.map((m) => m.known)).toEqual([...DEX_MILESTONES.map((m) => m.known)].sort((a, b) => a - b));
  });

  it('the word-of-the-day prize needs a right answer today and comes once a day', () => {
    const stats: WordStats = { jump: { box: 1, seen: 1, right: 1, rightDay: 'd2' } };
    expect(wordOfDayClaimable(stats, word, { claimed: [] }, 'd2')).toBe(true);
    expect(wordOfDayClaimable(stats, word, { claimed: [], wordOfDayClaimed: 'd2' }, 'd2')).toBe(false);
    expect(wordOfDayClaimable(stats, word, { claimed: [] }, 'd3')).toBe(false);
  });

  it('cards: new until met, learning until known', () => {
    expect(cardState({}, 'jump')).toBe('new');
    expect(cardState({ jump: { box: 1, seen: 1, right: 1 } }, 'jump')).toBe('learning');
    expect(cardState(knownStats(1), 'w0')).toBe('known');
  });

  it('learning cards show their days: a miss empties them', () => {
    expect(cardDays({ a: { box: 2, seen: 3, right: 2 } }, 'a')).toEqual({ have: 2, need: 3 });
    expect(cardDays({ a: { box: 0, seen: 3, right: 2 } }, 'a').have).toBe(0);
  });

  it('a prize waits when a milestone is reached and not taken', () => {
    const words: Record<string, { box: number; seen: number; right: number; known: boolean }> = {};
    for (let i = 0; i < DEX_MILESTONES[0].known; i++) words[`w${i}`] = { box: 3, seen: 3, right: 3, known: true };
    const save = { [WORDS_HOME]: { levels: {}, data: { words } } };
    expect(dexPrizeWaiting(save, 'd1')).toBe(true);
    const claimed = { [WORDS_HOME]: { levels: {}, data: { words, dex: { claimed: [DEX_MILESTONES[0].known] } } } };
    expect(dexPrizeWaiting(claimed, 'd1')).toBe(false);
  });

  it('reads bad saved data safely', () => {
    expect(readDex('x')).toEqual({ claimed: [], wordOfDayClaimed: undefined });
    expect(readDex({ claimed: [10, 'a'] }).claimed).toEqual([10]);
  });
});
