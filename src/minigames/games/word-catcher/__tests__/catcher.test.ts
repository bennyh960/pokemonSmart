import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../../auth/supabase-client.js', () => ({ supabase: {} }));
vi.mock('../../../../services/pokemon-data.js', async (orig) =>
  (await import('../../../english/__tests__/moves-mock.js')).withMoves(orig),
);

import { createRng } from '../../../english/random.js';
import def from '../index.js';
import { catcherStars, currentTarget, newCatcher, stepCatcher, type CatcherConfig } from '../catcher.js';

const DT = 1 / 60;

/** Plays a round: `reaction` = seconds before the bot starts flying to the target. */
function play(cfg: CatcherConfig, seed: number, reaction: number, grabWrong = false) {
  const rng = createRng(seed);
  const s = newCatcher(cfg, rng, {}, 'd1');
  let seenFor = 0;
  let lastTarget = -1;
  for (let t = 0; t < cfg.seconds && !s.over; t += DT) {
    if (s.target !== lastTarget) {
      lastTarget = s.target;
      seenFor = 0;
    }
    seenFor += DT;
    const target = s.bubbles.find((b) => b.word.id === currentTarget(s).id);
    const wrong = s.bubbles.find((b) => b.word.id !== currentTarget(s).id);
    const goal = grabWrong && wrong ? wrong.x : seenFor >= reaction && target ? target.x : null;
    stepCatcher(s, cfg, rng, DT, { dir: 0, goalX: goal });
  }
  return s;
}

describe('Word Catcher', () => {
  it('the target word is always on screen soon after a new target', () => {
    const cfg = def.levels[4].config;
    const rng = createRng(3);
    const s = newCatcher(cfg, rng, {}, 'd1');
    for (let t = 0; t < 2; t += DT) stepCatcher(s, cfg, rng, DT, { dir: 0, goalX: null });
    expect(s.bubbles.some((b) => b.word.id === currentTarget(s).id)).toBe(true);
  });

  it('a quick player can get 3★ and a slow one still clears every level', () => {
    for (const lvl of def.levels) {
      for (let seed = 1; seed <= 5; seed++) {
        const quick = play(lvl.config, seed, 0.3);
        expect(catcherStars(quick.catches, lvl.config), `L${lvl.number} quick seed ${seed}`).toBe(3);
        const slow = play(lvl.config, seed, 2.5);
        expect(catcherStars(slow.catches, lvl.config), `L${lvl.number} slow seed ${seed}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('catching wrong words costs hearts and ends the round at zero', () => {
    const s = play(def.levels[0].config, 1, 0, true);
    expect(s.hearts).toBe(0);
    expect(s.over).toBe(true);
    expect(s.answers.every((a) => a.wordId)).toBe(true);
  });
});
