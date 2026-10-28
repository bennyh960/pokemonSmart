import { describe, expect, it } from 'vitest';
import {
  REPLAY_DAILY_CAP,
  getLevelProgress,
  highestUnlockedLevel,
  isLevelUnlocked,
  localDateKey,
  recordResult,
  replayPrizesLeft,
  resolvePrize,
  totalStars,
} from '../progress.js';
import type { AnyMiniGameDef, MiniGameLevel, MiniGamesSave } from '../types.js';

const level = (n: number): MiniGameLevel => ({
  number: n,
  name: { en: `L${n}`, he: `L${n}` },
  rewards: {
    firstClear: { rarity: 'rare', reward: { items: [{ itemId: 'ultra-ball', quantity: n }] } },
    threeStar: { rarity: 'epic', reward: { items: [{ itemId: 'master-ball', quantity: 1 }] } },
    replay: { rarity: 'common', reward: { money: 100 * n } },
  },
  config: {},
});

const def: AnyMiniGameDef = {
  id: 'poke-doku',
  name: { en: 'Test', he: 'Test' },
  tagline: { en: '', he: '' },
  theme: { from: '#000', to: '#fff', accent: '#f00', accentText: '#fff' },
  mascotPokemonId: 54,
  levels: [level(1), level(2), level(3)],
  Component: () => null,
};

const DAY1 = new Date(2026, 9, 27, 10, 0, 0);
const DAY1_LATE = new Date(2026, 9, 27, 23, 59, 0);
const DAY2 = new Date(2026, 9, 28, 0, 1, 0);

describe('mini-game unlocks', () => {
  it('level 1 is always open, level N+1 needs 2 stars on N', () => {
    const save: MiniGamesSave = {};
    expect(isLevelUnlocked(save, 'poke-doku', 1)).toBe(true);
    expect(isLevelUnlocked(save, 'poke-doku', 2)).toBe(false);

    recordResult(save, def, 1, { stars: 1, score: 10 }, { now: DAY1 });
    expect(isLevelUnlocked(save, 'poke-doku', 2)).toBe(false);

    const out = recordResult(save, def, 1, { stars: 2, score: 20 }, { now: DAY1 });
    expect(out.unlockedLevel).toBe(2);
    expect(isLevelUnlocked(save, 'poke-doku', 2)).toBe(true);
    expect(highestUnlockedLevel(save, def)).toBe(2);
  });

  it('reports unlockedLevel only once and never past the last level', () => {
    const save: MiniGamesSave = {};
    expect(recordResult(save, def, 1, { stars: 3, score: 1 }, { now: DAY1 }).unlockedLevel).toBe(2);
    expect(recordResult(save, def, 1, { stars: 3, score: 1 }, { now: DAY1 }).unlockedLevel).toBeUndefined();
    recordResult(save, def, 2, { stars: 2, score: 1 }, { now: DAY1 });
    expect(recordResult(save, def, 3, { stars: 3, score: 1 }, { now: DAY1 }).unlockedLevel).toBeUndefined();
  });
});

describe('recordResult bookkeeping', () => {
  it('keeps best stars and score, counts clears', () => {
    const save: MiniGamesSave = {};
    recordResult(save, def, 1, { stars: 3, score: 50 }, { now: DAY1 });
    recordResult(save, def, 1, { stars: 1, score: 80 }, { now: DAY1 });
    recordResult(save, def, 1, { stars: 0, score: 999 }, { now: DAY1 });
    expect(getLevelProgress(save, 'poke-doku', 1)).toEqual({ stars: 3, best: 999, clears: 2 });
    expect(save['poke-doku']?.lastPlayed).toBe(DAY1.toISOString());
    expect(totalStars(save, def)).toEqual({ stars: 3, max: 9 });
  });

  it('newRecord only when beating an earlier score', () => {
    const save: MiniGamesSave = {};
    expect(recordResult(save, def, 1, { stars: 1, score: 50 }, { now: DAY1 }).newRecord).toBe(false);
    expect(recordResult(save, def, 1, { stars: 1, score: 40 }, { now: DAY1 }).newRecord).toBe(false);
    expect(recordResult(save, def, 1, { stars: 1, score: 51 }, { now: DAY1 }).newRecord).toBe(true);
  });

  it('clamps bad input and rejects unknown levels', () => {
    const save: MiniGamesSave = {};
    const out = recordResult(save, def, 1, { stars: 7 as 3, score: -5.5 }, { now: DAY1 });
    expect(out.stars).toBe(3);
    expect(out.level.best).toBe(0);
    expect(() => recordResult(save, def, 9, { stars: 1, score: 1 })).toThrow();
  });
});

describe('prize selection', () => {
  it('first clear and first 3 stars are given once each', () => {
    const save: MiniGamesSave = {};
    const a = recordResult(save, def, 1, { stars: 1, score: 1 }, { now: DAY1 });
    expect(a.prizes.map((p) => p.kind)).toEqual(['firstClear']);

    const b = recordResult(save, def, 1, { stars: 3, score: 1 }, { now: DAY1 });
    expect(b.prizes.map((p) => p.kind)).toEqual(['threeStar']);
    expect(b.prizes[0].rarity).toBe('epic');

    const c = recordResult(save, def, 1, { stars: 3, score: 1 }, { now: DAY1 });
    expect(c.prizes.map((p) => p.kind)).toEqual(['replay']);
  });

  it('a perfect first round gets both big prizes and no replay prize', () => {
    const save: MiniGamesSave = {};
    const out = recordResult(save, def, 2, { stars: 3, score: 1 }, { now: DAY1 });
    expect(out.prizes.map((p) => p.kind)).toEqual(['firstClear', 'threeStar']);
    expect(replayPrizesLeft(save, 'poke-doku', DAY1)).toBe(REPLAY_DAILY_CAP);
  });

  it('no prizes for a failed round', () => {
    const save: MiniGamesSave = {};
    expect(recordResult(save, def, 1, { stars: 0, score: 100 }, { now: DAY1 }).prizes).toEqual([]);
    // the failed round did not use up the first clear
    expect(recordResult(save, def, 1, { stars: 1, score: 1 }, { now: DAY1 }).prizes[0].kind).toBe('firstClear');
  });

  it('replay prizes are capped per game per local day', () => {
    const save: MiniGamesSave = {};
    recordResult(save, def, 1, { stars: 3, score: 1 }, { now: DAY1 }); // firstClear + threeStar
    for (let i = 0; i < REPLAY_DAILY_CAP; i++) {
      expect(recordResult(save, def, 1, { stars: 1, score: 1 }, { now: DAY1 }).prizes[0].kind).toBe('replay');
    }
    expect(save['poke-doku']!.replayDay).toEqual({ date: localDateKey(DAY1), count: REPLAY_DAILY_CAP });
    expect(recordResult(save, def, 1, { stars: 1, score: 1 }, { now: DAY1_LATE }).prizes).toEqual([]);

    // next day the cap resets
    expect(replayPrizesLeft(save, 'poke-doku', DAY2)).toBe(REPLAY_DAILY_CAP);
    expect(recordResult(save, def, 1, { stars: 1, score: 1 }, { now: DAY2 }).prizes[0].kind).toBe('replay');
    expect(save['poke-doku']!.replayDay).toEqual({ date: localDateKey(DAY2), count: 1 });
  });

  it('the cap is per game', () => {
    const save: MiniGamesSave = {};
    const other: AnyMiniGameDef = { ...def, id: 'snorlax-snack' };
    recordResult(save, def, 1, { stars: 1, score: 1 }, { now: DAY1 });
    while (replayPrizesLeft(save, 'poke-doku', DAY1) > 0)
      recordResult(save, def, 1, { stars: 1, score: 1 }, { now: DAY1 });
    expect(replayPrizesLeft(save, 'snorlax-snack', DAY1)).toBe(REPLAY_DAILY_CAP);
    recordResult(save, other, 1, { stars: 1, score: 1 }, { now: DAY1 });
    expect(recordResult(save, other, 1, { stars: 1, score: 1 }, { now: DAY1 }).prizes[0].kind).toBe('replay');
  });

  it('resolvePrize picks from oneOf with the given rng', () => {
    const choice = { rarity: 'rare' as const, oneOf: [{ money: 1 }, { money: 2 }, { money: 3 }] };
    expect(resolvePrize(choice, () => 0).reward).toEqual({ money: 1 });
    expect(resolvePrize(choice, () => 0.5).reward).toEqual({ money: 2 });
    expect(resolvePrize(choice, () => 0.9999).reward).toEqual({ money: 3 });
    expect(resolvePrize(choice, () => 1).reward).toEqual({ money: 3 });
  });
});
