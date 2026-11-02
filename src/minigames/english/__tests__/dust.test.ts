import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../auth/supabase-client.js', () => ({ supabase: {} }));
vi.mock('../../../services/pokemon-data.js', async (orig) => (await import('./moves-mock.js')).withMoves(orig));

import type { MiniGamesSave } from '../../types.js';
import { isMastered, RECENT_RESULTS, recordEnglishResult, reviewRounds } from '../ambush.js';
import { dustBonusPrize } from '../board.js';
import { ageShine, DUST_CLEAN_STARS, DUST_MS, DUST_REVIEW_WEIGHT, isDusty, recordDust } from '../dust.js';
import { dustyRounds, ENGLISH_LADDER, ladderRound, setLadderStep } from '../ladder.js';
import { createRng } from '../random.js';

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const at = (...values: number[]) => () => values.shift() ?? 0;

function onStep(step: number): MiniGamesSave {
  const save: MiniGamesSave = {};
  setLadderStep(save, step);
  return save;
}

describe('dusty levels', () => {
  it('a level never played has no dust; a played one gets dusty after DUST_MS', () => {
    const save: MiniGamesSave = {};
    expect(isDusty(save, 'unown-words', 1, NOW + 100 * DAY)).toBe(false);
    recordDust(save, 'unown-words', 1, 1, NOW);
    expect(isDusty(save, 'unown-words', 1, NOW + DUST_MS - 1)).toBe(false);
    expect(isDusty(save, 'unown-words', 1, NOW + DUST_MS)).toBe(true);
  });

  it('any round keeps a clean level clean; only DUST_CLEAN_STARS cleans a dusty one', () => {
    const save: MiniGamesSave = {};
    expect(recordDust(save, 'unown-words', 1, 1, NOW)).toBe('clean');
    expect(recordDust(save, 'unown-words', 1, 1, NOW + 5 * DAY)).toBe('clean');
    expect(isDusty(save, 'unown-words', 1, NOW + 11 * DAY)).toBe(false); // 6 days after the last play

    const later = NOW + 5 * DAY + DUST_MS;
    expect(recordDust(save, 'unown-words', 1, 2, later)).toBe('dusty');
    expect(isDusty(save, 'unown-words', 1, later)).toBe(true);
    expect(recordDust(save, 'unown-words', 1, DUST_CLEAN_STARS, later)).toBe('cleaned');
    expect(isDusty(save, 'unown-words', 1, later)).toBe(false);
  });

  it('a dusty level is never mastered, and weighs DUST_REVIEW_WEIGHT× in an ambush', () => {
    const save = onStep(3);
    const { gameId, level } = ENGLISH_LADDER[0].play[0];
    for (let n = 0; n < RECENT_RESULTS; n++) recordEnglishResult(save, gameId, level, 3);
    recordDust(save, gameId, level, 3, NOW);
    expect(isMastered(save, gameId, level, NOW)).toBe(true);
    expect(isMastered(save, gameId, level, NOW + DUST_MS)).toBe(false);
    const review = reviewRounds(save, NOW + DUST_MS).find((r) => r.round.gameId === gameId && r.round.level === level);
    expect(review?.weight).toBe(DUST_REVIEW_WEIGHT); // all 3★ → weight 1, × dust
  });

  it('practice rounds go to a dusty level below the current step', () => {
    const save = onStep(4);
    const { gameId, level } = ENGLISH_LADDER[1].play[0];
    recordDust(save, gameId, level, 3, NOW);
    const later = NOW + DUST_MS;
    expect(dustyRounds(save, later, 4)).toEqual([{ gameId, level, stepIndex: 1, playIndex: 0 }]);
    // 0.1 → a practice round (one step below); 0 → take the dusty level; 0 → the first dusty one
    expect(ladderRound(save, at(0.1, 0, 0), later)).toMatchObject({ gameId, level, stepIndex: 1 });
    // 0.99 → the current step: dust doesn't take those rounds
    expect(ladderRound(save, at(0.99, 0), later).stepIndex).toBe(4);
  });

  it('ageShine makes every played level dusty', () => {
    const save: MiniGamesSave = {};
    recordDust(save, 'memory-match', 1, 3, NOW);
    ageShine(save, DUST_MS);
    expect(isDusty(save, 'memory-match', 1, NOW)).toBe(true);
  });

  it('the cleaning bonus is a step prize, never common', () => {
    for (let i = 0; i < ENGLISH_LADDER.length; i++)
      for (let seed = 1; seed <= 30; seed++) {
        const p = dustBonusPrize(i, 8, createRng(seed));
        expect(p?.kind).toBe('dust');
        expect(p?.rarity).not.toBe('common');
      }
  });
});
