// Prints how often each bot reaches 1★/2★/3★ per level. Run with:
//   SNACK_TUNE=1 npx vitest run src/minigames/games/snack-attack/__tests__/tune.test.ts --disableConsoleIntercept
import { it, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../../auth/supabase-client.js', () => ({ supabase: {} }));

import { bulbasaurSun, charmanderFlame, pikachuCharge, snorlaxSnack, squirtleSwim } from '../index.js';
import { starsFor } from '../sim.js';
import { GOOD, KID, SHARP, playRound, type BotProfile } from './bots.js';

function report(lvl: (typeof snorlaxSnack.levels)[number], name: string, bot: BotProfile): string {
  const runs = 40;
  const hits = [0, 0, 0, 0];
  let total = 0;
  for (let i = 0; i < runs; i++) {
    const score = playRound(lvl.config, 1000 + i, bot).state.score;
    total += score;
    hits[starsFor(score, lvl.config.starScores)]++;
  }
  const atLeast = (n: number) => Math.round((hits.slice(n).reduce((a, b) => a + b, 0) / runs) * 100);
  return `${name} avg=${(total / runs).toFixed(0)} ≥1★ ${atLeast(1)}% ≥2★ ${atLeast(2)}% 3★ ${atLeast(3)}%`;
}

it.skipIf(!import.meta.env.SNACK_TUNE)(
  'prints bot star rates',
  () => {
    for (const def of [snorlaxSnack, bulbasaurSun, charmanderFlame, squirtleSwim, pikachuCharge])
      for (const lvl of def.levels) {
        console.log(
          `${def.id} L${lvl.number} [${lvl.config.starScores.join('/')}]  ` +
            [report(lvl, 'kid', KID), report(lvl, 'good', GOOD), report(lvl, 'sharp', SHARP)].join(' | '),
        );
      }
  },
  300_000,
);
