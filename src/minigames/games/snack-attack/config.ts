/** The kinds of sum a target can be (see sim.ts `pickTarget`). */
export type SnackOp = 'add' | 'sub' | 'times' | 'div';

/** Per-level settings of the Snack Attack games (the shell never reads them). */
export interface SnackConfig {
  /**
   * The sums this level asks — each target picks one:
   * add: catch items up to the target · sub: start above it, minus items take away ·
   * times: catch 2 factors of the target · div: start at a product, catch the number that divides it to the target.
   */
  ops: SnackOp[];
  /** add / sub targets. */
  targetMin: number;
  targetMax: number;
  /** Item values (absolute — minus items carry the minus). */
  berryMin: number;
  berryMax: number;
  /** Share of the top speed, MIN_PACE..1: fall speed, spawn rate and hazard chance — see `speedOf` in sim.ts. */
  pace: number;
  /** Multiplies the fall speed (e.g. Squirtle swims faster). Default 1. */
  fallScale?: number;
  /** Multiplies the hazard (rotten / rock…) chance. Default 1. */
  hazardScale?: number;
  roundSeconds: number;
  /** Score needed for 1★ / 2★ / 3★. */
  starScores: [number, number, number];
  /** times / div: the highest table used (sums = 2..maxTable × 2..berryMax). */
  maxTable?: number;
  /** Golden items every ~6–9 s instead of ~13–19 s. */
  feverOften?: boolean;
}
