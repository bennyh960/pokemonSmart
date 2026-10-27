import { beforeEach, describe, expect, it, vi } from 'vitest';

// game-state touches `window` in dev mode and save.ts creates a Supabase client — stub both for node
vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../auth/supabase-client.js', () => ({ supabase: {} }));
import { createNewPlayerData } from '../game-state.js';
import {
  calcRankXp,
  describeActivePerks,
  describeRankPerks,
  getEarnedRankIndex,
  getPerkValue,
  getRank,
  getRankIndex,
  getRankStats,
  hasRank,
  isShopItemUnlocked,
  rankAdviceLines,
  rankFlag,
  takeUnannouncedRanks,
  updateTrainerRank,
} from '../trainer-rank.js';
import { checkObedience, OBEDIENCE_EARNED_FLAG } from '../obedience.js';
import { recordHallOfFame } from '../hall-of-fame.js';
import { HALL_OF_FAME_MAX, OBEDIENCE } from '../../data/trainer-ranks.js';
import type { PlayerData, Pokemon } from '../../types/index.js';

const mon = (uuid: string, level: number) => ({ uuid, id: 4, level, heldItemId: null, abilityId: null }) as Pokemon;

let pd: PlayerData;
beforeEach(() => {
  pd = createNewPlayerData();
  takeUnannouncedRanks();
});

describe('trainer rank', () => {
  it('starts as Rookie with no perks beyond the base ones', () => {
    expect(getEarnedRankIndex(pd)).toBe(0);
    expect(isShopItemUnlocked(pd, 'ultra-ball')).toBe(false);
    expect(isShopItemUnlocked(pd, 'antidote')).toBe(false);
    expect(isShopItemUnlocked(pd, 'potion')).toBe(true);
  });

  it('XP follows the source table (playtime seconds, steps per 100)', () => {
    pd.playtime = 900.7;
    pd.totalSteps = 250;
    expect(calcRankXp(getRankStats(pd))).toBe(900 + 2);
  });

  it('reaching Amateur sets the flag, queues the call and unlocks shop items', () => {
    pd.playtime = 1000;
    updateTrainerRank(pd);
    expect(pd.flags[rankFlag('amateur')]).toBe(true);
    expect(takeUnannouncedRanks().map((r) => r.id)).toEqual(['amateur']);
    expect(isShopItemUnlocked(pd, 'ultra-ball')).toBe(true);
    expect(isShopItemUnlocked(pd, 'full-heal')).toBe(true);
    expect(isShopItemUnlocked(pd, 'x-attack')).toBe(false);
  });

  it('XP alone is not enough when requirements are missing', () => {
    pd.playtime = 9000; // past Pro's XP, but no badges / catches
    updateTrainerRank(pd);
    expect(hasRank(pd, 'amateur')).toBe(true);
    expect(hasRank(pd, 'pro')).toBe(false);
  });

  it('ranks are permanent once earned', () => {
    pd.playtime = 1000;
    updateTrainerRank(pd);
    pd.playtime = 0;
    updateTrainerRank(pd);
    expect(hasRank(pd, 'amateur')).toBe(true);
  });

  it('numeric perks use the highest earned rank that defines them', () => {
    expect(getPerkValue(pd, 'catchBonus')).toBe(1);
    pd.flags[rankFlag('expert')] = true;
    expect(getPerkValue(pd, 'catchBonus')).toBe(getRank('expert').perks.catchBonus);
    expect(getPerkValue(pd, 'obeyLevel')).toBe(Infinity);
  });

  it('perk text is generated from data in both languages', () => {
    const lines = describeRankPerks(getRank('amateur'));
    expect(lines[0].en).toContain('Rarer items');
    expect(lines.every((l) => l.he.length > 0)).toBe(true);
    expect(describeRankPerks(getRank('pro')).map((l) => l.en)).toContain('Powerful Pokémon will trust you more');
  });

  it('active perks keep one line per perk (latest wording)', () => {
    const lines = describeActivePerks(getRankIndex('pro')).map((l) => l.en);
    expect(lines.filter((l) => l.includes('items')).length).toBe(1);
    expect(lines).toContain('Even rarer items are now available for you in stores');
    expect(lines).not.toContain('Your Pokémon will trust you more');
  });

  it('lab advisor lists only what is still missing for the next rank', () => {
    pd.flags[rankFlag('amateur')] = true;
    pd.playtime = 9000;
    pd.badges = 0b1111; // Pro needs 4 badges — already met
    const text = rankAdviceLines(pd).map((l) => l.en).join('\n');
    expect(text).toContain('Amateur trainer');
    expect(text).toContain(`${getRank('pro').requires!.caught} more Pokémon caught`);
    expect(text).not.toContain('more badges');
    expect(text).not.toContain('more rank XP');
    expect(text).toContain('every League win');
  });

  it('lab advisor at the top rank', () => {
    pd.flags[rankFlag('legendary')] = true;
    expect(rankAdviceLines(pd).at(-1)!.en).toContain('highest rank');
  });
});

describe('hall of fame', () => {
  it('counts as League wins and is capped', () => {
    pd.party = [mon('a', 50)];
    expect(recordHallOfFame(pd)).toBe(1);
    expect(getRankStats(pd).leagueWins).toBe(1);
    for (let i = 0; i < HALL_OF_FAME_MAX + 5; i++) recordHallOfFame(pd);
    expect(pd.hallOfFame.length).toBe(HALL_OF_FAME_MAX);
  });
});

describe('obedience', () => {
  it('Pokémon at or below the rank obey level always obey', () => {
    pd.party = [mon('a', 30), mon('b', 5)];
    expect(checkObedience(pd, pd.party[0]).disobeyChance).toBe(0);
  });

  it('chance grows with the gap to the strongest other Pokémon', () => {
    pd.party = [mon('a', 36), mon('b', 30)]; // gap 20%
    const half = checkObedience(pd, pd.party[0]);
    expect(half.disobeyChance).toBeCloseTo(0.2 / OBEDIENCE.fullDisobeyGap);
    expect(half.obeyRank?.id).toBe('pro');
    pd.party = [mon('a', 36), mon('b', 20)]; // gap 80%
    expect(checkObedience(pd, pd.party[0]).disobeyChance).toBe(1);
  });

  it('Pro raises the obey level to 40', () => {
    pd.flags[rankFlag('pro')] = true;
    pd.party = [mon('a', 38), mon('b', 10)];
    expect(checkObedience(pd, pd.party[0]).disobeyChance).toBe(0);
  });

  it('two Pokémon at the trusted level end disobedience for good', () => {
    pd.party = [mon('a', 60), mon('b', OBEDIENCE.trustedLevel)];
    expect(checkObedience(pd, pd.party[0]).disobeyChance).toBe(0);
    expect(pd.flags[OBEDIENCE_EARNED_FLAG]).toBe(true);
    pd.party = [mon('a', 60), mon('c', 5)]; // released the second one
    expect(checkObedience(pd, pd.party[0]).disobeyChance).toBe(0);
  });
});
