import { describe, expect, it, vi } from 'vitest';

// index.ts pulls in the React component → i18n / save modules; stub what they touch in node
vi.hoisted(() => {
  (globalThis as Record<string, unknown>).window ??= globalThis;
});
vi.mock('../../../../auth/supabase-client.js', () => ({ supabase: {} }));

import { snorlaxSnack as def } from '../index.js';
import type { SnackConfig, SnackOp } from '../config.js';
import {
  MIN_PACE,
  MOUTH_Y,
  PLAYER_MAX_X,
  PLAYER_MIN_X,
  createSim,
  eatBerry,
  factorPairs,
  finisherValue,
  hasReachableSolution,
  pickTarget,
  mulberry32,
  starsFor,
  stepSim,
  timesTargets,
  usefulValues,
  type Berry,
  type SimState,
} from '../sim.js';
import { CAREFUL, GOOD, KID, playRound } from './bots.js';

const LEVELS = def.levels;
const cfg = (n: number): SnackConfig => LEVELS[n - 1].config;
const NO_INPUT = { dir: 0 as const, goalX: null };

function berry(value: number, kind: Berry['kind'] = value < 0 ? 'minus' : 'normal', x = 0.5): Berry {
  return { id: 999, kind, value, x, y: 0, vy: 0.3, tilt: 0 };
}

function withTarget(
  s: SimState,
  start: number,
  target: number,
  op: SnackOp = start > target ? 'sub' : 'add',
): SimState {
  s.op = op;
  s.start = start;
  s.belly = start;
  s.target = target;
  s.factors = [];
  return s;
}

describe('targets', () => {
  it.each(LEVELS.map((l) => [l.number, l.config] as const))('level %i picks targets inside its range', (_, config) => {
    const rng = mulberry32(42);
    let prev: number | undefined;
    for (let i = 0; i < 300; i++) {
      const { op, start, target } = pickTarget(config, rng, prev);
      expect(config.ops).toContain(op);
      expect(target).not.toBe(prev);
      if (op === 'times') {
        expect(start).toBe(1);
        expect(factorPairs(config, target).length).toBeGreaterThan(0);
      } else if (op === 'div') {
        const divisor = start / target;
        expect(Number.isInteger(divisor)).toBe(true);
        expect(divisor).toBeGreaterThanOrEqual(2);
        expect(divisor).toBeLessThanOrEqual(config.maxTable!);
        expect(target).toBeLessThanOrEqual(config.berryMax);
      } else {
        expect(target).toBeGreaterThanOrEqual(config.targetMin);
        expect(target).toBeLessThanOrEqual(config.targetMax);
        if (op === 'add') expect(start).toBe(0);
        else expect(start).toBeGreaterThan(target);
      }
      prev = target;
    }
  });

  it('times targets follow the tables: L4 = up to 5×5, L10 = up to 10×10', () => {
    const l4 = timesTargets(cfg(4));
    expect(Math.max(...l4)).toBe(25);
    expect(l4).toContain(4);
    expect(l4).not.toContain(49); // 7×7 is beyond the 5 table
    const l10 = timesTargets(cfg(10));
    expect(Math.max(...l10)).toBe(100);
    expect(l10).toContain(49);
    expect(l10).not.toContain(11); // prime > 10 has no table pair
  });

  it('levels ask exactly their ops: + → − → ± → × → +× → −× → ±× → ÷ → ÷× → all four', () => {
    expect(LEVELS.map((l) => l.config.ops.join(''))).toEqual([
      'add',
      'sub',
      'addsub',
      'times',
      'addtimes',
      'subtimes',
      'addsubtimes',
      'div',
      'divtimes',
      'addsubtimesdiv',
    ]);
    const rng = mulberry32(3);
    for (const l of LEVELS) {
      const ops = new Set(Array.from({ length: 200 }, () => pickTarget(l.config, rng).op));
      expect([...ops].sort()).toEqual([...l.config.ops].sort());
    }
  });

  it('each level is faster than the one before, the last at top speed', () => {
    const paces = LEVELS.map((l) => l.config.pace);
    for (let i = 1; i < paces.length; i++) expect(paces[i]).toBeGreaterThan(paces[i - 1]);
    expect(paces[0]).toBeCloseTo(MIN_PACE);
    expect(paces[paces.length - 1]).toBe(1);
  });

  it('level 1 drops only plus berries, level 2 only minus ones', () => {
    for (const [n, sign] of [
      [1, 1],
      [2, -1],
    ] as const) {
      const s = createSim(cfg(n), 4);
      while (s.time < 20) {
        stepSim(s, 1 / 30, NO_INPUT);
        for (const b of s.berries) if (b.kind === 'normal' || b.kind === 'minus') expect(Math.sign(b.value)).toBe(sign);
      }
    }
  });
});

describe('useful values', () => {
  it('add: any value up to what is left; the finisher closes the gap', () => {
    const s = withTarget(createSim(cfg(1), 1), 0, 7);
    s.belly = 4;
    expect(usefulValues(s)).toEqual([1, 2, 3]);
    expect(finisherValue(s)).toBe(3);
  });

  it('take-away targets need blue (negative) berries', () => {
    const s = withTarget(createSim(cfg(3), 1), 17, 12);
    expect(usefulValues(s)).toEqual([-1, -2, -3, -4, -5]);
    expect(finisherValue(s)).toBe(-5);
  });

  it('times: factors first, then the one partner', () => {
    const s = withTarget(createSim(cfg(7), 1), 1, 12, 'times');
    expect(usefulValues(s).sort((a, b) => a - b)).toEqual([2, 3, 4, 6]);
    expect(finisherValue(s)).toBeNull();
    eatBerry(s, berry(3));
    expect(usefulValues(s)).toEqual([4]);
    expect(finisherValue(s)).toBe(4);
  });
});

describe('eating', () => {
  it('exact hit burps, scores 10 × combo and picks a new target', () => {
    const s = withTarget(createSim(cfg(1), 1), 0, 6);
    eatBerry(s, berry(4));
    expect(s.belly).toBe(4);
    const events = eatBerry(s, berry(2));
    expect(events.map((e) => e.type)).toEqual(['eat', 'burp', 'new-target']);
    expect(s.score).toBe(10);
    expect(s.combo).toBe(1);
    expect(s.belly).toBe(s.start);
    expect(s.target).not.toBe(6);

    withTarget(s, 0, 5);
    eatBerry(s, berry(5));
    expect(s.combo).toBe(2);
    expect(s.score).toBe(30); // 10 + 10×2
  });

  it('combo multiplier caps at ×5', () => {
    const s = withTarget(createSim(cfg(1), 1), 0, 5);
    s.combo = 9;
    eatBerry(s, berry(5));
    expect(s.score).toBe(50);
    expect(s.combo).toBe(10);
  });

  it('going over is a tummy ache: belly back to start, combo 0', () => {
    const s = withTarget(createSim(cfg(1), 1), 0, 6);
    s.combo = 3;
    eatBerry(s, berry(4));
    const events = eatBerry(s, berry(3));
    expect(events.map((e) => e.type)).toEqual(['ache']);
    expect(s.belly).toBe(0);
    expect(s.combo).toBe(0);
    expect(s.aches).toBe(1);
    expect(s.target).toBe(6); // same target, try again
  });

  it('blue berries never take the belly below 0', () => {
    const s = withTarget(createSim(cfg(3), 1), 0, 12);
    eatBerry(s, berry(3));
    eatBerry(s, berry(-5));
    expect(s.belly).toBe(0);
    expect(s.aches).toBe(0);
  });

  it('take-away: dropping below the target is the ache, going up is allowed', () => {
    const s = withTarget(createSim(cfg(3), 1), 15, 12);
    eatBerry(s, berry(4));
    expect(s.belly).toBe(19);
    eatBerry(s, berry(-9));
    expect(s.aches).toBe(1);
    expect(s.belly).toBe(15);
    eatBerry(s, berry(-3));
    expect(s.burps).toBe(1);
  });

  it('div: only the divisor works — it burps in one bite, anything else is an ache', () => {
    const s = withTarget(createSim(cfg(8), 1), 24, 6, 'div');
    expect(usefulValues(s)).toEqual([4]);
    expect(finisherValue(s)).toBe(4);
    eatBerry(s, berry(3));
    expect(s.aches).toBe(1);
    expect(s.belly).toBe(24);
    const events = eatBerry(s, berry(4));
    expect(events.map((e) => e.type)).toEqual(['eat', 'burp', 'new-target']);
  });

  it('times: a wrong first or second berry is an ache, the right pair burps', () => {
    const s = withTarget(createSim(cfg(7), 1), 1, 12, 'times');
    eatBerry(s, berry(5));
    expect(s.aches).toBe(1);
    eatBerry(s, berry(6));
    expect(s.belly).toBe(6);
    eatBerry(s, berry(3));
    expect(s.aches).toBe(2);
    expect(s.factors).toEqual([]);
    eatBerry(s, berry(4));
    const events = eatBerry(s, berry(3));
    expect(events.some((e) => e.type === 'burp')).toBe(true);
  });

  it('rotten berries cost a heart; the third ends the round', () => {
    const s = createSim(cfg(1), 1);
    eatBerry(s, berry(0, 'rotten'));
    eatBerry(s, berry(0, 'rotten'));
    expect(s.hearts).toBe(1);
    expect(s.over).toBe(false);
    const events = eatBerry(s, berry(0, 'rotten'));
    expect(events.map((e) => e.type)).toEqual(['rotten', 'game-over']);
    expect(s.over).toBe(true);
    expect(stepSim(s, 0.016, NO_INPUT)).toEqual([]);
  });

  it('a Pokémon of the hazard type eats it for points: no heart lost, combo and belly stay', () => {
    const s = withTarget(createSim(cfg(1), 1, { hazardFriendly: true }), 0, 7);
    eatBerry(s, berry(3));
    s.combo = 2;
    const events = eatBerry(s, berry(0, 'rotten'));
    expect(events.map((e) => e.type)).toEqual(['hazard-snack']);
    expect(s.hearts).toBe(3);
    expect(s.score).toBeGreaterThan(0);
    expect(s.combo).toBe(2);
    expect(s.belly).toBe(3);
  });

  it('golden berry starts 5 s of Fever: points ×2, then it ends', () => {
    const s = withTarget(createSim(cfg(1), 1), 0, 5);
    eatBerry(s, berry(0, 'golden'));
    expect(s.fever).toBe(5);
    eatBerry(s, berry(5));
    expect(s.score).toBe(20);
    const types: string[] = [];
    for (let t = 0; t < 5.2; t += 0.05) types.push(...stepSim(s, 0.05, NO_INPUT).map((e) => e.type));
    expect(s.fever).toBe(0);
    expect(types).toContain('fever-end');
  });
});

describe('step', () => {
  it('eats a berry that reaches the mouth over Snorlax, ignores one far away', () => {
    const s = withTarget(createSim(cfg(1), 1), 0, 9);
    s.spawnTimer = 99;
    s.goldenTimer = 99;
    s.berries = [
      { ...berry(2, 'normal', 0.5), y: MOUTH_Y - 0.01 },
      { ...berry(3, 'normal', 0.95), id: 2, y: MOUTH_Y - 0.01 },
    ];
    s.lastForced = Infinity; // no forced spawns for this check
    const events = stepSim(s, 0.05, NO_INPUT);
    expect(events.map((e) => e.type)).toEqual(['eat']);
    expect(s.belly).toBe(2);
    expect(s.berries.map((b) => b.value)).toEqual([3]);
    for (let i = 0; i < 40; i++) stepSim(s, 0.05, NO_INPUT);
    expect(s.berries.find((b) => b.value === 3 && b.id === 2)).toBeUndefined(); // fell off the bottom
  });

  it('moves with keys and towards a pointer goal, inside the field', () => {
    const s = createSim(cfg(1), 1);
    for (let i = 0; i < 100; i++) stepSim(s, 0.05, { dir: -1, goalX: null });
    expect(s.playerX).toBe(PLAYER_MIN_X);
    for (let i = 0; i < 100; i++) stepSim(s, 0.05, { dir: 1, goalX: null });
    expect(s.playerX).toBe(PLAYER_MAX_X);
    for (let i = 0; i < 30; i++) stepSim(s, 0.05, { dir: 0, goalX: 0.4 });
    expect(s.playerX).toBeCloseTo(0.4, 5);
  });

  it('is deterministic for a seed', () => {
    const a = playRound(cfg(2), 5, GOOD).state;
    const b = playRound(cfg(2), 5, GOOD).state;
    expect([a.score, a.burps, a.aches]).toEqual([b.score, b.burps, b.aches]);
  });

  it('a huge frame delta cannot skip a berry past Snorlax', () => {
    const s = withTarget(createSim(cfg(1), 1), 0, 9);
    s.berries = [{ ...berry(2), y: MOUTH_Y - 0.01 }];
    stepSim(s, 2, NO_INPUT);
    expect(s.belly).toBe(2);
  });
});

describe('solvable spawner', () => {
  it.each(LEVELS.map((l) => [l.number, l.config] as const))(
    'level %i always keeps a reachable solution falling (idle and playing)',
    (_, config) => {
      for (let seed = 1; seed <= 15; seed++) {
        for (const mode of ['idle', 'play'] as const) {
          const s = createSim(config, seed);
          const rng = mulberry32(seed);
          let gap = 0;
          let worst = 0;
          const dt = 1 / 60;
          while (s.time < config.roundSeconds && !s.over) {
            // "play": wander and eat whatever lands — the belly keeps changing, the spawner must keep up
            const dir = mode === 'idle' ? 0 : (((Math.floor(s.time / 0.8 + rng() * 0.02) % 3) - 1) as -1 | 0 | 1);
            stepSim(s, dt, { dir, goalX: null });
            if (s.over) break;
            gap = hasReachableSolution(s) ? 0 : gap + dt;
            if (s.time > 1) worst = Math.max(worst, gap);
          }
          expect(worst, `seed ${seed} ${mode}`).toBeLessThan(0.5);
        }
      }
    },
  );

  it('spawns rotten and golden berries, and Fever-often levels drop more gold', () => {
    const count = (config: SnackConfig) => {
      const s = createSim(config, 9);
      const seen = new Set<number>();
      let golden = 0;
      let rotten = 0;
      while (s.time < 60 && !s.over) {
        stepSim(s, 1 / 30, NO_INPUT);
        for (const b of s.berries) {
          if (seen.has(b.id)) continue;
          seen.add(b.id);
          if (b.kind === 'golden') golden++;
          if (b.kind === 'rotten') rotten++;
        }
      }
      return { golden, rotten };
    };
    const l9 = count(cfg(9));
    const l10 = count(cfg(10));
    expect(l9.rotten).toBeGreaterThan(0);
    expect(l9.golden).toBeGreaterThan(0);
    expect(l10.golden).toBeGreaterThan(l9.golden);
  });
});

describe('stars', () => {
  it('maps score to thresholds', () => {
    expect(starsFor(0, [60, 200, 350])).toBe(0);
    expect(starsFor(60, [60, 200, 350])).toBe(1);
    expect(starsFor(349, [60, 200, 350])).toBe(2);
    expect(starsFor(350, [60, 200, 350])).toBe(3);
  });

  it.each(LEVELS.map((l) => [l.number, l.config] as const))(
    'level %i: a careless kid usually clears it, a no-mistake player usually gets 3★',
    (_, config) => {
      const runs = 20;
      let kidClears = 0;
      let kidThree = 0;
      let carefulTwo = 0;
      let carefulThree = 0;
      for (let i = 0; i < runs; i++) {
        const kid = starsFor(playRound(config, 500 + i, KID).state.score, config.starScores);
        const careful = starsFor(playRound(config, 500 + i, CAREFUL).state.score, config.starScores);
        if (kid >= 1) kidClears++;
        if (kid === 3) kidThree++;
        if (careful >= 2) carefulTwo++;
        if (careful === 3) carefulThree++;
      }
      expect(kidClears / runs).toBeGreaterThanOrEqual(0.7);
      expect(kidThree / runs).toBeLessThanOrEqual(0.15);
      expect(carefulTwo / runs).toBeGreaterThanOrEqual(0.8);
      expect(carefulThree / runs).toBeGreaterThanOrEqual(0.55);
      expect(config.starScores[0]).toBeLessThan(config.starScores[1]);
      expect(config.starScores[1]).toBeLessThan(config.starScores[2]);
    },
  );
});
