import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../auth/supabase-client.js', () => ({ supabase: {} }));
vi.mock('../../../services/pokemon-data.js', async (orig) => (await import('./moves-mock.js')).withMoves(orig));

import { MINI_GAME_LIST, getMiniGame } from '../../registry.js';
import type { MiniGamesSave } from '../../types.js';
import { BOARD_POKEMON } from '../board.js';
import {
  addLadderPoints,
  ENGLISH_LADDER,
  firstStepOf,
  isOpenOnLadder,
  ladderProgress,
  ladderRound,
  ladderStep,
  PRACTICE_ODDS,
  roundStep,
  setLadderStep,
  STAR_POINTS,
} from '../ladder.js';
import { createRng } from '../random.js';

const onStep = (step: number, points = 0): MiniGamesSave => ({
  'unown-words': { levels: {}, data: { ladder: { step, points } } },
});

describe('English ladder', () => {
  it('plays only English games at levels that exist, and every English game is on it', () => {
    for (const step of ENGLISH_LADDER) {
      for (const p of step.play) {
        const def = getMiniGame(p.gameId);
        expect(def.category, p.gameId).toBe('english');
        if (p.level !== 'best')
          expect(
            def.levels.some((l) => l.number === p.level),
            `${p.gameId} L${p.level}`,
          ).toBe(true);
      }
      const ids = step.rarePokemon?.ids;
      if (Array.isArray(ids)) for (const id of ids) expect(BOARD_POKEMON, step.name.en).toContain(id);
    }
    for (const g of MINI_GAME_LIST.filter((x) => x.category === 'english'))
      expect(firstStepOf(g.id), g.id).toBeGreaterThanOrEqual(0);
    ENGLISH_LADDER.slice(0, -1).forEach((s) => expect(s.pointsToNext, s.name.en).toBeGreaterThan(0));
    expect(ENGLISH_LADDER[ENGLISH_LADDER.length - 1].pointsToNext).toBeUndefined();
  });

  it('1 star earns nothing, 2 stars a little, 3 stars more', () => {
    expect(STAR_POINTS[0]).toBe(0);
    expect(STAR_POINTS[1]).toBe(0);
    expect(STAR_POINTS[2]).toBeGreaterThan(0);
    expect(STAR_POINTS[3]).toBeGreaterThan(STAR_POINTS[2]);
  });

  it('points fill the bar; a full bar climbs one step and starts again', () => {
    const save: MiniGamesSave = {};
    expect(ladderStep(save)).toBe(0);
    expect(addLadderPoints(save, 1)).toEqual({ gained: 0, leveledUp: false });
    expect(ladderProgress(save)).toEqual({ have: 0, need: ENGLISH_LADDER[0].pointsToNext });
    addLadderPoints(save, 2);
    expect(ladderProgress(save)!.have).toBe(STAR_POINTS[2]);
    let ups = 0;
    while (ladderStep(save) === 0) if (addLadderPoints(save, 3).leveledUp) ups++;
    expect(ups).toBe(1);
    expect(ladderStep(save)).toBe(1);
    expect(ladderProgress(save)!.have).toBe(0);
  });

  it('the top step has no bar and never climbs further', () => {
    const top = ENGLISH_LADDER.length - 1;
    const save = onStep(top);
    expect(ladderProgress(save)).toBeNull();
    expect(addLadderPoints(save, 3).leveledUp).toBe(false);
    expect(ladderStep(save)).toBe(top);
  });

  it('setLadderStep jumps to any step, clamped to the ladder and its bar', () => {
    const save: MiniGamesSave = {};
    setLadderStep(save, 2, 1);
    expect(ladderStep(save)).toBe(2);
    expect(ladderProgress(save)!.have).toBe(1);
    setLadderStep(save, 0, 999);
    expect(ladderProgress(save)!.have).toBe(ENGLISH_LADDER[0].pointsToNext! - 1);
    setLadderStep(save, 999, 5);
    expect(ladderStep(save)).toBe(ENGLISH_LADDER.length - 1);
    setLadderStep(save, -3);
    expect(ladderStep(save)).toBe(0);
  });

  it('a round plays a game of the step it picks; later games stay locked', () => {
    const s = onStep(2);
    const round = ladderRound(s, createRng(1));
    expect(round.stepIndex).toBeLessThanOrEqual(2);
    expect(ENGLISH_LADDER[round.stepIndex].play.map((p) => p.gameId)).toContain(round.gameId);
    expect(isOpenOnLadder('memory-match', s)).toBe(true);
    expect(isOpenOnLadder('word-catcher', s)).toBe(false);
  });
});

describe('practice rounds', () => {
  const at = (...values: number[]) => () => values.shift()!;

  it('PRACTICE_ODDS sum to 1', () => {
    expect(PRACTICE_ODDS.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('picks the current step or one of the 3 below it by the odds', () => {
    // [current 55%, -1 20%, -2 15%, -3 10%] laid out as -1, -2, -3, then current
    expect(roundStep(4, at(0.1))).toBe(3);
    expect(roundStep(4, at(0.25))).toBe(2);
    expect(roundStep(4, at(0.4))).toBe(1);
    expect(roundStep(4, at(0.5))).toBe(4);
    expect(roundStep(4, at(0.99))).toBe(4);
  });

  it('missing lower steps give their chance to the current step', () => {
    expect(roundStep(0, at(0.1))).toBe(0);
    expect(roundStep(1, at(0.1))).toBe(0);
    expect(roundStep(1, at(0.25))).toBe(1);
  });

  it('a practice round is played on the lower step', () => {
    const round = ladderRound(onStep(4), at(0.1, 0));
    expect(round.stepIndex).toBe(3);
    expect(round.gameId).toBe(ENGLISH_LADDER[3].play[0].gameId);
  });
});
