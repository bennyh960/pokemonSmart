/** Per-level settings of the Snack Attack games (the shell never reads them). */
export interface SnackConfig {
  /** add: items add up · add-sub: minus items take away · times: catch 2 factors of the target. */
  math: 'add' | 'add-sub' | 'times';
  targetMin: number;
  targetMax: number;
  /** Item values (absolute — minus items carry the minus). */
  berryMin: number;
  berryMax: number;
  /** Fall speed / spawn rate / hazard chance — see SPEEDS in sim.ts. */
  speed: 'slow' | 'medium' | 'fast';
  /** Multiplies the fall speed (e.g. Squirtle swims faster). Default 1. */
  fallScale?: number;
  /** Multiplies the hazard (rotten / rock…) chance. Default 1. */
  hazardScale?: number;
  roundSeconds: number;
  /** Score needed for 1★ / 2★ / 3★. */
  starScores: [number, number, number];
  /** times levels: the highest table used (targets = 2..maxTable × 2..berryMax). */
  maxTable?: number;
  /** Golden items every ~6–9 s instead of ~13–19 s. */
  feverOften?: boolean;
}
