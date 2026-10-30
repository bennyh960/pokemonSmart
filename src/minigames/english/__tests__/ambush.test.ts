import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../auth/supabase-client.js', () => ({ supabase: {} }));
vi.mock('../../../services/pokemon-data.js', async (orig) => (await import('./moves-mock.js')).withMoves(orig));

import type { MiniGamesSave } from '../../types.js';
import {
  AMBUSH_COOLDOWN_STEPS,
  AMBUSH_RETRY_STEPS,
  ambushChance,
  ambushPrizes,
  endAmbush,
  forceAmbush,
  isMastered,
  pickAmbushRound,
  RECENT_RESULTS,
  recordEnglishResult,
  resetAmbush,
  reviewRounds,
  rollAmbush,
  takeDueAmbush,
} from '../ambush.js';
import { ENGLISH_LADDER, setLadderStep } from '../ladder.js';
import { createRng } from '../random.js';

function onStep(step: number): MiniGamesSave {
  const save: MiniGamesSave = {};
  setLadderStep(save, step);
  return save;
}

const keyOf = (r: { gameId: string; level: number }) => `${r.gameId}:${r.level}`;
const firstPlay = (step: number) => ENGLISH_LADDER[step].play[0] as { gameId: 'unown-words'; level: number };

describe('Unown ambush — what to review', () => {
  it('keeps the last RECENT_RESULTS stars of a level; mastered = all of them 3★', () => {
    const save: MiniGamesSave = {};
    for (let n = 0; n < RECENT_RESULTS; n++) recordEnglishResult(save, 'unown-words', 1, 3);
    expect(isMastered(save, 'unown-words', 1)).toBe(true);
    recordEnglishResult(save, 'unown-words', 1, 1);
    expect(isMastered(save, 'unown-words', 1)).toBe(false);
    for (let n = 0; n < RECENT_RESULTS; n++) recordEnglishResult(save, 'unown-words', 1, 3);
    expect(isMastered(save, 'unown-words', 1)).toBe(true);
  });

  it('a new player has nothing to review', () => {
    expect(reviewRounds({})).toEqual([]);
    expect(pickAmbushRound({}, createRng(1))).toBeNull();
  });

  it('reviews lower steps and played levels of the current step, never mastered ones', () => {
    const save = onStep(2);
    const keys = () => reviewRounds(save).map((r) => keyOf(r.round));
    expect(keys()).toEqual([keyOf(firstPlay(0)), keyOf(firstPlay(1))]);

    const current = firstPlay(2);
    recordEnglishResult(save, current.gameId, current.level as number, 2);
    expect(keys()).toContain(keyOf(current));

    const letters = firstPlay(0);
    for (let n = 0; n < RECENT_RESULTS; n++) recordEnglishResult(save, letters.gameId, letters.level, 3);
    expect(keys()).not.toContain(keyOf(letters));
  });

  it('weaker levels come more often', () => {
    const save = onStep(2);
    const [weak, strong] = [firstPlay(0), firstPlay(1)];
    recordEnglishResult(save, weak.gameId, weak.level, 0);
    recordEnglishResult(save, strong.gameId, strong.level, 3);
    const rng = createRng(5);
    let weakCount = 0;
    for (let n = 0; n < 2000; n++) if (keyOf(pickAmbushRound(save, rng)!) === keyOf(weak)) weakCount++;
    expect(weakCount / 2000).toBeGreaterThan(0.7);
  });
});

describe('Unown ambush — prizes and chance', () => {
  it('one common prize on a clear, nothing without one', () => {
    const rng = createRng(3);
    expect(ambushPrizes(0, 0, 0, rng)).toEqual([]);
    for (const stars of [1, 2, 3] as const) {
      const prizes = ambushPrizes(4, stars, 0, rng);
      expect(prizes).toHaveLength(1);
      expect(prizes[0].rarity).toBe('common');
    }
  });

  it('never in a city; always after a glitched wild-Pokémon NPC; 10% on a critical map', () => {
    expect(ambushChance('wild-npc', 'critical', true)).toBe(0);
    expect(ambushChance('wild-npc', undefined, false)).toBe(1);
    expect(ambushChance('wild', 'critical', false)).toBe(0.1);
    expect(ambushChance('wild', 'high', false)).toBe(0);
    expect(ambushChance('wild', undefined, false)).toBe(0);
  });
});

describe('Unown ambush — trigger', () => {
  beforeEach(resetAmbush);
  const save = onStep(2);

  it('springs once, then waits for the cooldown', () => {
    expect(rollAmbush(save, 100, 1)).toBe(true);
    expect(takeDueAmbush(100)).not.toBeNull();
    expect(takeDueAmbush(100)).toBeNull(); // running
    endAmbush(true, 110);
    expect(rollAmbush(save, 110 + AMBUSH_COOLDOWN_STEPS - 1, 1)).toBe(false);
    expect(rollAmbush(save, 110 + AMBUSH_COOLDOWN_STEPS, 1)).toBe(true);
  });

  it('a round left uncleared comes back after AMBUSH_RETRY_STEPS steps, same game', () => {
    rollAmbush(save, 0, 1);
    const first = takeDueAmbush(0)!.round;
    endAmbush(false, 50);
    expect(takeDueAmbush(50 + AMBUSH_RETRY_STEPS - 1)).toBeNull();
    const again = takeDueAmbush(50 + AMBUSH_RETRY_STEPS)!;
    expect(again.retry).toBe(true);
    expect(again.round).toEqual(first);
  });

  it('no ambush without the chance or without anything to review', () => {
    expect(rollAmbush(save, 0, 0)).toBe(false);
    expect(rollAmbush({}, 0, 1)).toBe(false);
    expect(forceAmbush({}, 0)).toBe(false);
    expect(forceAmbush(save, 0)).toBe(true);
  });
});
