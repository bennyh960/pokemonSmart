/**
 * Snack Attack — pure simulation (no DOM, no React), shared by every skin (Snorlax's berries,
 * Squirtle's bubbles, Pikachu's bolts…). A "berry" is any falling item; the player is the Pokémon at the bottom.
 *
 * World coordinates are normalized: x 0..1 (left → right), y 0..1 (top → bottom).
 * The component owns the rAF loop and calls `stepSim(state, dt, input)` each frame; the step mutates the
 * state and returns the events of that frame (eat / burp / ache / rotten / fever…) for juice + HUD.
 *
 * Rules
 * - Every target has a start value (the belly) and a target. Berries move the belly by their value
 *   (blue berries are negative). Landing exactly on the target = BURP. Jumping past it = tummy ache
 *   (belly back to the start, combo 0). For "take away" targets (start above target) jumping below is the ache.
 * - times: the target is a product; eat 2 berries whose product is the target. A first berry that can't be one
 *   of the 2 factors, or a wrong second berry, is a tummy ache.
 * - Rotten berries cost a heart, Golden berries start Fever (score ×2, faster spawns).
 *
 * Solvability: the spawner keeps at least one "useful" berry (a value that moves the belly toward the target
 * without passing it, or the missing factor) in the reachable upper part of the screen at all times.
 */

import type { SnackConfig } from './config.js';

// ── Tuning ──────────────────────────────────────────────────────────────────

export const PLAYER_Y = 0.86; // centre of the player Pokémon
export const MOUTH_Y = 0.76; // berries are eaten when they reach this line
export const PLAYER_HALF_W = 0.085;
export const PLAYER_MIN_X = 0.1;
export const PLAYER_MAX_X = 0.9;
export const BERRY_R = 0.042;
/** Berries above this line can still be reached from anywhere (the player crosses the screen in < 1 s). */
export const REACHABLE_Y = 0.5;

const MOVE_SPEED = 1.35; // widths per second (keys)
const POINTER_SPEED = 2.6; // widths per second (towards a drag / tap point)
const FEVER_SECONDS = 5;
const FEVER_SPAWN_FACTOR = 0.6;
const MAX_COMBO_MULT = 5;
const BASE_POINTS = 10;
const MAX_BERRIES = 7;
/** Minimum time between two forced (solution) spawns. */
const FORCED_GAP = 0.35;

export const SPEEDS = {
  slow: { fall: 0.2, spawn: 1.25, rotten: 0.07 },
  medium: { fall: 0.26, spawn: 1.0, rotten: 0.1 },
  fast: { fall: 0.3, spawn: 0.95, rotten: 0.12 },
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export type BerryKind = 'normal' | 'minus' | 'rotten' | 'golden';

export interface Berry {
  id: number;
  kind: BerryKind;
  /** Signed value (minus berries < 0). 0 for rotten / golden. */
  value: number;
  x: number;
  y: number;
  vy: number;
  /** Small per-berry tilt for the look (degrees). */
  tilt: number;
}

export interface SimInput {
  /** -1 left, 0 none, 1 right (held keys). Clears the pointer goal. */
  dir: -1 | 0 | 1;
  /** Drag / tap target x (0..1), or null. */
  goalX: number | null;
}

export type SimEvent =
  | { type: 'eat'; berry: Berry; belly: number }
  | { type: 'burp'; berry: Berry; points: number; combo: number; fever: boolean; target: number }
  | { type: 'ache'; berry: Berry }
  | { type: 'rotten'; berry: Berry; hearts: number }
  | { type: 'golden'; berry: Berry }
  | { type: 'fever-end' }
  | { type: 'new-target'; target: number; start: number }
  | { type: 'game-over' };

export interface SimState {
  config: SnackConfig;
  rng: () => number;
  time: number;
  berries: Berry[];
  nextId: number;
  playerX: number;
  /** -1 / 1 last move direction (sprite facing). */
  facing: -1 | 1;
  /** Belly value (add modes) — for times this is the product of the eaten factors (1 before any). */
  belly: number;
  start: number;
  target: number;
  /** times mode: factors eaten for the current target. */
  factors: number[];
  combo: number;
  bestCombo: number;
  score: number;
  hearts: number;
  maxHearts: number;
  burps: number;
  aches: number;
  /** Seconds of Fever left (0 = off). */
  fever: number;
  spawnTimer: number;
  goldenTimer: number;
  lastForced: number;
  over: boolean;
}

// ── RNG ─────────────────────────────────────────────────────────────────────

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)];
}

// ── Targets ─────────────────────────────────────────────────────────────────

/** All factor pairs [a, b] (a ≤ b) a times target can use for this config. */
export function factorPairs(config: SnackConfig, target: number): [number, number][] {
  const pairs: [number, number][] = [];
  for (let a = config.berryMin; a <= config.berryMax; a++) {
    if (target % a !== 0) continue;
    const b = target / a;
    if (b >= a && b >= config.berryMin && b <= config.berryMax) pairs.push([a, b]);
  }
  return pairs;
}

/** The products a times level asks for: table 2..maxTable × 2..berryMax, inside targetMin..targetMax. */
export function timesTargets(config: SnackConfig): number[] {
  const maxTable = config.maxTable ?? config.berryMax;
  const set = new Set<number>();
  for (let a = 2; a <= maxTable; a++) {
    for (let b = 2; b <= config.berryMax; b++) {
      const p = a * b;
      if (p >= config.targetMin && p <= config.targetMax) set.add(p);
    }
  }
  return [...set].sort((x, y) => x - y);
}

/** Picks the next { start, target } — never the same target twice in a row. */
export function pickTarget(
  config: SnackConfig,
  rng: () => number,
  previous?: number,
): { start: number; target: number } {
  for (let tries = 0; tries < 20; tries++) {
    let start = 0;
    let target: number;
    if (config.math === 'times') {
      target = pick(rng, timesTargets(config));
      start = 1;
    } else {
      target = randInt(rng, config.targetMin, config.targetMax);
      // add-sub: half the targets start with a full belly — eat blue berries to come down to the target
      if (config.math === 'add-sub' && rng() < 0.5) start = target + randInt(rng, 3, Math.min(12, config.berryMax * 2));
    }
    if (target !== previous || tries === 19) return { start, target };
  }
  /* c8 ignore next */
  return { start: 0, target: config.targetMin };
}

/** Signed berry values that are a correct next bite right now. */
export function usefulValues(s: Pick<SimState, 'config' | 'belly' | 'start' | 'target' | 'factors'>): number[] {
  const { config } = s;
  if (config.math === 'times') {
    if (s.factors.length === 0) {
      const vals = new Set<number>();
      for (const [a, b] of factorPairs(config, s.target)) vals.add(a).add(b);
      return [...vals];
    }
    const need = s.target / s.factors[0];
    return Number.isInteger(need) && need >= config.berryMin && need <= config.berryMax ? [need] : [];
  }
  const rest = s.target - s.belly;
  const sign = Math.sign(rest);
  const out: number[] = [];
  for (let v = config.berryMin; v <= Math.min(config.berryMax, Math.abs(rest)); v++) out.push(sign * v);
  return out;
}

/** The value that finishes the target in one bite, if a berry can carry it. */
export function finisherValue(s: Pick<SimState, 'config' | 'belly' | 'start' | 'target' | 'factors'>): number | null {
  const vals = usefulValues(s);
  if (s.config.math === 'times') return s.factors.length === 1 ? (vals[0] ?? null) : null;
  const rest = s.target - s.belly;
  return vals.includes(rest) ? rest : null;
}

/** 0..1 — how full the meter is for the current target. */
export function bellyFill(s: Pick<SimState, 'config' | 'belly' | 'start' | 'target' | 'factors'>): number {
  if (s.config.math === 'times') return s.factors.length / 2;
  const span = s.target - s.start;
  if (span === 0) return 1;
  return Math.max(0, Math.min(1, (s.belly - s.start) / span));
}

// ── Creation ────────────────────────────────────────────────────────────────

export function createSim(config: SnackConfig, seed: number): SimState {
  const rng = mulberry32(seed);
  const { start, target } = pickTarget(config, rng);
  return {
    config,
    rng,
    time: 0,
    berries: [],
    nextId: 1,
    playerX: 0.5,
    facing: 1,
    belly: start,
    start,
    target,
    factors: [],
    combo: 0,
    bestCombo: 0,
    score: 0,
    hearts: 3,
    maxHearts: 3,
    burps: 0,
    aches: 0,
    fever: 0,
    spawnTimer: 0.4,
    goldenTimer: goldenDelay(config, rng),
    lastForced: -Infinity,
    over: false,
  };
}

function goldenDelay(config: SnackConfig, rng: () => number): number {
  return config.feverOften ? 6 + rng() * 3 : 13 + rng() * 6;
}

// ── Spawning ────────────────────────────────────────────────────────────────

function isUsefulBerry(b: Berry, useful: number[]): boolean {
  return (b.kind === 'normal' || b.kind === 'minus') && useful.includes(b.value);
}

/** True when a berry the player can still reach is a correct next bite. */
export function hasReachableSolution(s: SimState): boolean {
  const useful = usefulValues(s);
  return s.berries.some((b) => b.y <= REACHABLE_Y && isUsefulBerry(b, useful));
}

function spawnX(s: SimState): number {
  let best = 0.5;
  let bestDist = -1;
  for (let i = 0; i < 6; i++) {
    const x = 0.08 + s.rng() * 0.84;
    const near = s.berries.filter((b) => b.y < 0.25);
    const dist = near.length ? Math.min(...near.map((b) => Math.abs(b.x - x))) : 1;
    if (dist > 0.15) return x;
    if (dist > bestDist) {
      bestDist = dist;
      best = x;
    }
  }
  return best;
}

function addBerry(s: SimState, kind: BerryKind, value: number): Berry {
  const fall = SPEEDS[s.config.speed].fall * (s.config.fallScale ?? 1);
  const ramp = 1 + Math.min(1, s.time / s.config.roundSeconds) * 0.15; // a little faster as the round goes on
  const berry: Berry = {
    id: s.nextId++,
    kind,
    value,
    x: spawnX(s),
    y: -BERRY_R,
    vy: fall * ramp * (0.88 + s.rng() * 0.24),
    tilt: (s.rng() - 0.5) * 30,
  };
  s.berries.push(berry);
  return berry;
}

function kindFor(value: number): BerryKind {
  return value < 0 ? 'minus' : 'normal';
}

/** A random distractor value (any value the level uses). */
function randomValue(s: SimState): number {
  const v = randInt(s.rng, s.config.berryMin, s.config.berryMax);
  return s.config.math === 'add-sub' && s.rng() < 0.45 ? -v : v;
}

/** Spawns one berry that is a correct next bite (the finisher half the time, when one exists). */
export function spawnUseful(s: SimState): Berry | null {
  const useful = usefulValues(s);
  if (useful.length === 0) return null;
  const fin = finisherValue(s);
  const value = fin !== null && s.rng() < 0.5 ? fin : pick(s.rng, useful);
  return addBerry(s, kindFor(value), value);
}

/** One regular spawn: golden (when due), rotten, a useful bite or a distractor. */
export function spawnRegular(s: SimState): Berry {
  if (s.goldenTimer <= 0 && s.fever <= 0 && !s.berries.some((b) => b.kind === 'golden')) {
    s.goldenTimer = goldenDelay(s.config, s.rng);
    return addBerry(s, 'golden', 0);
  }
  if (s.rng() < SPEEDS[s.config.speed].rotten * (s.config.hazardScale ?? 1)) return addBerry(s, 'rotten', 0);
  if (s.rng() < 0.45) {
    const b = spawnUseful(s);
    if (b) return b;
  }
  const value = randomValue(s);
  return addBerry(s, kindFor(value), value);
}

// ── Eating ──────────────────────────────────────────────────────────────────

function nextTarget(s: SimState, events: SimEvent[]): void {
  const { start, target } = pickTarget(s.config, s.rng, s.target);
  s.start = start;
  s.target = target;
  s.belly = start;
  s.factors = [];
  events.push({ type: 'new-target', target, start });
}

function burp(s: SimState, berry: Berry, events: SimEvent[]): void {
  s.combo++;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  s.burps++;
  const points = BASE_POINTS * Math.min(s.combo, MAX_COMBO_MULT) * (s.fever > 0 ? 2 : 1);
  s.score += points;
  events.push({ type: 'burp', berry, points, combo: s.combo, fever: s.fever > 0, target: s.target });
  nextTarget(s, events);
}

function ache(s: SimState, berry: Berry, events: SimEvent[]): void {
  s.combo = 0;
  s.aches++;
  s.belly = s.start;
  s.factors = [];
  events.push({ type: 'ache', berry });
}

/** Applies one eaten berry to the belly. Exported for tests. */
export function eatBerry(s: SimState, berry: Berry, events: SimEvent[] = []): SimEvent[] {
  if (berry.kind === 'rotten') {
    s.hearts = Math.max(0, s.hearts - 1);
    events.push({ type: 'rotten', berry, hearts: s.hearts });
    if (s.hearts === 0 && !s.over) {
      s.over = true;
      events.push({ type: 'game-over' });
    }
    return events;
  }
  if (berry.kind === 'golden') {
    s.fever = FEVER_SECONDS;
    events.push({ type: 'golden', berry });
    return events;
  }

  if (s.config.math === 'times') {
    const ok = usefulValues(s).includes(berry.value);
    if (!ok) {
      ache(s, berry, events);
      return events;
    }
    s.factors.push(berry.value);
    s.belly = s.factors.reduce((p, v) => p * v, 1);
    events.push({ type: 'eat', berry, belly: s.belly });
    if (s.factors.length === 2) burp(s, berry, events);
    return events;
  }

  const dirBefore = Math.sign(s.target - s.belly);
  const next = Math.max(0, s.belly + berry.value);
  if (next === s.target) {
    s.belly = next;
    events.push({ type: 'eat', berry, belly: next });
    burp(s, berry, events);
    return events;
  }
  const dirAfter = Math.sign(s.target - next);
  if (dirAfter !== dirBefore) {
    ache(s, berry, events);
    return events;
  }
  s.belly = next;
  events.push({ type: 'eat', berry, belly: next });
  return events;
}

// ── Step ────────────────────────────────────────────────────────────────────

export function stepSim(s: SimState, dt: number, input: SimInput): SimEvent[] {
  const events: SimEvent[] = [];
  if (s.over) return events;
  dt = Math.min(dt, 0.05); // tab hiccups never teleport berries through the player
  s.time += dt;

  // Move the player
  if (input.dir !== 0) {
    s.playerX += input.dir * MOVE_SPEED * dt;
    s.facing = input.dir;
  } else if (input.goalX !== null) {
    const d = input.goalX - s.playerX;
    const stepMax = POINTER_SPEED * dt;
    if (Math.abs(d) > 0.002) s.facing = d < 0 ? -1 : 1;
    s.playerX += Math.abs(d) <= stepMax ? d : Math.sign(d) * stepMax;
  }
  s.playerX = Math.max(PLAYER_MIN_X, Math.min(PLAYER_MAX_X, s.playerX));

  // Fever
  if (s.fever > 0) {
    s.fever = Math.max(0, s.fever - dt);
    if (s.fever === 0) events.push({ type: 'fever-end' });
  }

  // Fall + eat
  const remaining: Berry[] = [];
  for (const b of s.berries) {
    const prevY = b.y;
    b.y += b.vy * dt;
    if (prevY < MOUTH_Y && b.y >= MOUTH_Y && Math.abs(b.x - s.playerX) <= PLAYER_HALF_W + BERRY_R) {
      eatBerry(s, b, events);
      if (s.over) {
        s.berries = remaining;
        return events;
      }
      continue;
    }
    if (b.y < 1 + BERRY_R) remaining.push(b);
  }
  s.berries = remaining;

  // Spawn
  s.goldenTimer -= dt;
  s.spawnTimer -= dt * (s.fever > 0 ? 1 / FEVER_SPAWN_FACTOR : 1);
  const solvable = hasReachableSolution(s);
  if (s.spawnTimer <= 0) {
    s.spawnTimer += SPEEDS[s.config.speed].spawn;
    // If nothing useful is falling, this spawn is the solution — never a wasted slot
    if (!solvable && spawnUseful(s)) s.lastForced = s.time;
    else if (s.berries.length < MAX_BERRIES) spawnRegular(s);
  } else if (!solvable && s.time - s.lastForced >= FORCED_GAP) {
    // A berry was just eaten / missed and the way forward left the screen: drop a solution now
    // (ignores the berry cap, so a screen full of distractors can never block the round)
    if (spawnUseful(s)) s.lastForced = s.time;
  }
  return events;
}

// ── Stars ───────────────────────────────────────────────────────────────────

export function starsFor(score: number, thresholds: readonly [number, number, number]): 0 | 1 | 2 | 3 {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}
