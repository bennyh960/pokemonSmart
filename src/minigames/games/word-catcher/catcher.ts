/**
 * Word Catcher — pure simulation. English words fall in bubbles; a flying Pokémon moves left / right and
 * catches them. Catch the word that matches the target picture → next target; catch a wrong one → lose a heart.
 * Field coordinates are 0–1 on both axes (y grows downward).
 */

import type { HebrewHelp } from '../../english/help.js';
import { pickWords, type WordAnswer, type WordStats } from '../../english/learning.js';
import { pick, type Rng } from '../../english/random.js';
import { wordsFor, type Word, type WordTier } from '../../english/words.js';
import type { Stars } from '../../types.js';

export interface CatcherConfig {
  seconds: number;
  /** Fall speed in field heights per second. */
  speed: number;
  /** Bubbles on screen at once. */
  bubbles: number;
  maxTier: WordTier;
  hebrewHelp: HebrewHelp;
  /** Catches needed for 1★ / 2★ / 3★. */
  starCatches: [number, number, number];
}

export const CATCHER_Y = 0.84;
export const CATCHER_HALF_WIDTH = 0.11;
export const CATCHER_SPEED = 1.1;
export const HEARTS = 3;
/** Seconds between bubbles appearing. */
const SPAWN_GAP = 0.9;
/** How many targets a round prepares (more than anyone catches in time). */
const TARGETS = 30;

export interface Bubble {
  id: number;
  word: Word;
  x: number;
  y: number;
}

export interface CatcherState {
  targets: Word[];
  pool: Word[];
  target: number;
  bubbles: Bubble[];
  catcherX: number;
  nextId: number;
  spawnIn: number;
  hearts: number;
  catches: number;
  /** A wrong catch happened while the current target was up. */
  targetMissed: boolean;
  answers: WordAnswer[];
  over: boolean;
}

export type CatcherEvent = { kind: 'catch'; bubble: Bubble } | { kind: 'wrong'; bubble: Bubble } | { kind: 'out' };

export function newCatcher(cfg: CatcherConfig, rng: Rng, stats: WordStats, today: string): CatcherState {
  const pool = wordsFor('all', cfg.maxTier);
  return {
    targets: pickWords(rng, pool, stats, TARGETS, today),
    pool,
    target: 0,
    bubbles: [],
    catcherX: 0.5,
    nextId: 1,
    spawnIn: 0,
    hearts: HEARTS,
    catches: 0,
    targetMissed: false,
    answers: [],
    over: false,
  };
}

export function currentTarget(s: CatcherState): Word {
  return s.targets[s.target % s.targets.length];
}

/** Spawn x that keeps bubbles from overlapping the newest one. */
function spawnX(rng: Rng, s: CatcherState): number {
  const last = s.bubbles[s.bubbles.length - 1];
  for (let i = 0; i < 6; i++) {
    const x = 0.1 + rng() * 0.8;
    if (!last || Math.abs(x - last.x) > 0.22) return x;
  }
  return 0.1 + rng() * 0.8;
}

export interface CatcherInput {
  /** -1 left, 1 right, 0 none (keys). */
  dir: number;
  /** Pointer position to fly to (0–1), or null. */
  goalX: number | null;
}

/** Advance `dt` seconds. Mutates `s`, returns what happened (for sound / score / floats). */
export function stepCatcher(
  s: CatcherState,
  cfg: CatcherConfig,
  rng: Rng,
  dt: number,
  input: CatcherInput,
): CatcherEvent[] {
  if (s.over) return [];
  const events: CatcherEvent[] = [];

  // Move the catcher
  const move = CATCHER_SPEED * dt;
  if (input.dir !== 0) s.catcherX += input.dir * move;
  else if (input.goalX !== null) s.catcherX += Math.max(-move, Math.min(move, input.goalX - s.catcherX));
  s.catcherX = Math.max(CATCHER_HALF_WIDTH, Math.min(1 - CATCHER_HALF_WIDTH, s.catcherX));

  // Spawn — the target word is always on screen
  s.spawnIn -= dt;
  const target = currentTarget(s);
  const hasTarget = s.bubbles.some((b) => b.word.id === target.id);
  if (s.spawnIn <= 0 && (s.bubbles.length < cfg.bubbles || !hasTarget)) {
    const word = hasTarget ? pick(rng, s.pool.filter((w) => w.id !== target.id)) : target;
    s.bubbles.push({ id: s.nextId++, word, x: spawnX(rng, s), y: -0.08 });
    s.spawnIn = SPAWN_GAP;
  }

  // Fall, catch, fall out
  const keep: Bubble[] = [];
  for (const b of s.bubbles) {
    const prevY = b.y;
    b.y += cfg.speed * dt;
    const crossing = prevY < CATCHER_Y && b.y >= CATCHER_Y;
    if (crossing && Math.abs(b.x - s.catcherX) <= CATCHER_HALF_WIDTH) {
      if (b.word.id === currentTarget(s).id) {
        s.answers.push({ wordId: b.word.id, right: !s.targetMissed });
        s.catches++;
        s.target++;
        s.targetMissed = false;
        s.spawnIn = 0; // the next target drops right away
        events.push({ kind: 'catch', bubble: b });
      } else {
        s.hearts--;
        s.targetMissed = true;
        events.push({ kind: 'wrong', bubble: b });
        if (s.hearts <= 0) {
          s.over = true;
          events.push({ kind: 'out' });
        }
      }
      continue;
    }
    if (b.y < 1.08) keep.push(b);
  }
  s.bubbles = keep;
  return events;
}

export function catcherStars(catches: number, cfg: CatcherConfig): Stars {
  const [one, two, three] = cfg.starCatches;
  if (catches >= three) return 3;
  if (catches >= two) return 2;
  if (catches >= one) return 1;
  return 0;
}
