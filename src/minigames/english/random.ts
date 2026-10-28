/** Small seeded RNG helpers so a round can be reproduced from its seed (and tested). */

export type Rng = () => number;

/** mulberry32 — tiny, fast, good enough for shuffling questions. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[randInt(rng, list.length)];
}

/** Fisher–Yates on a copy. */
export function shuffle<T>(rng: Rng, list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** `count` distinct elements (fewer if the list is shorter). */
export function sample<T>(rng: Rng, list: readonly T[], count: number): T[] {
  return shuffle(rng, list).slice(0, Math.min(count, list.length));
}
