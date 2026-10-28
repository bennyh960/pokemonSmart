/**
 * Test-only "players" that drive the simulation — used to check every level stays solvable
 * and to tune the star thresholds (a careless kid should reach 1★, a sharp one 3★).
 */

import type { SnackConfig } from '../config.js';
import {
  BERRY_R,
  MOUTH_Y,
  PLAYER_HALF_W,
  createSim,
  finisherValue,
  mulberry32,
  stepSim,
  usefulValues,
  type Berry,
  type SimEvent,
  type SimInput,
  type SimState,
} from '../sim.js';

export interface BotProfile {
  /** Seconds between decisions (reaction time). */
  think: number;
  /** Chance a decision picks any random berry instead of a good one. */
  sloppy: number;
  /** Steps aside when a bad berry is about to land on Snorlax. */
  dodge: boolean;
}

export const KID: BotProfile = { think: 0.7, sloppy: 0.35, dodge: false };
export const GOOD: BotProfile = { think: 0.35, sloppy: 0.1, dodge: true };
export const SHARP: BotProfile = { think: 0.15, sloppy: 0, dodge: true };

function landTime(b: Berry): number {
  return (MOUTH_Y - b.y) / b.vy;
}

function goodScore(s: SimState, b: Berry): number {
  if (b.kind === 'golden') return 3;
  if (b.kind === 'rotten') return -1;
  if (b.value === finisherValue(s)) return 2;
  return usefulValues(s).includes(b.value) ? 1 : -1;
}

export function playRound(
  config: SnackConfig,
  seed: number,
  bot: BotProfile,
  dt = 1 / 60,
): { state: SimState; events: SimEvent[]; unsolvableSeconds: number } {
  const s = createSim(config, seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const events: SimEvent[] = [];
  let goal: number | null = null;
  let nextThink = 0;
  let unsolvable = 0;
  while (s.time < config.roundSeconds && !s.over) {
    if (s.time >= nextThink) {
      nextThink = s.time + bot.think;
      const falling = s.berries.filter((b) => b.y < MOUTH_Y - 0.02);
      const reachable = falling.filter((b) => Math.abs(b.x - s.playerX) / 1.35 < landTime(b));
      let choice: Berry | undefined;
      if (rng() < bot.sloppy) choice = reachable[Math.floor(rng() * reachable.length)];
      else {
        const ranked = reachable
          .map((b) => ({ b, g: goodScore(s, b) }))
          .filter((r) => r.g > 0)
          .sort((a, c) => c.g - a.g || landTime(a.b) - landTime(c.b));
        choice = ranked[0]?.b;
      }
      goal = choice ? choice.x : null;
    }
    // Hold the arrow key towards the goal — careful bots dodge a bad berry about to land on Snorlax
    const d = goal === null ? 0 : goal - s.playerX;
    let dir: -1 | 0 | 1 = Math.abs(d) < 0.02 ? 0 : d < 0 ? -1 : 1;
    if (bot.dodge) {
      const danger = s.berries.find(
        (b) =>
          goodScore(s, b) < 0 &&
          b.y < MOUTH_Y &&
          landTime(b) < 0.3 &&
          Math.abs(b.x - s.playerX) < PLAYER_HALF_W + BERRY_R + 0.02,
      );
      if (danger) dir = danger.x > s.playerX ? -1 : 1;
    }
    const input: SimInput = { dir, goalX: null };
    events.push(...stepSim(s, dt, input));
    if (usefulValues(s).length === 0 || !s.berries.some((b) => usefulValues(s).includes(b.value))) unsolvable += dt;
  }
  return { state: s, events, unsolvableSeconds: unsolvable };
}

export function averageScore(config: SnackConfig, bot: BotProfile, runs = 40): number {
  let total = 0;
  for (let i = 0; i < runs; i++) total += playRound(config, 1000 + i, bot).state.score;
  return total / runs;
}
