/**
 * Mini-game progress — pure logic over `pd.miniGames` (no React, no audio, no saving).
 *
 *   - level N+1 unlocks with ≥ UNLOCK_STARS on level N — or, when level N sets `unlockWins`, with that many 3★
 *     wins on it; level 1 is always open
 *   - recordResult() keeps the best stars / score, counts clears and picks the prizes:
 *       firstClear — once, the first clear with the level's `prizeStars` (default 1★)
 *       threeStar  — once, the first time the level reaches 3★
 *       replay     — a clear that earned neither, capped REPLAY_DAILY_CAP per game per day
 */

import { TRAINER_RANKS } from '../data/trainer-ranks.js';
import type {
  AnyMiniGameDef,
  DialogueReward,
  MiniGameId,
  MiniGameLevelProgress,
  MiniGameLevel,
  MiniGamePrizeDef,
  MiniGamePrizeSlot,
  MiniGameProgress,
  MiniGameResult,
  MiniGamesSave,
  PrizeKind,
  PrizeRarity,
  Stars,
} from './types.js';

export const UNLOCK_STARS = 2;
export const REPLAY_DAILY_CAP = 5;

const EMPTY_LEVEL: Readonly<MiniGameLevelProgress> = Object.freeze({ stars: 0, best: 0, clears: 0 });

/**
 * Level of a fixed round (care round, building gate) from the trainer rank index (`getTrainerRank(pd).index`),
 * spread evenly over the game's levels: lowest rank → first level, highest rank → last level. Ignores unlocks.
 */
export function levelForRank(rankIndex: number, def: AnyMiniGameDef): number {
  const steps = Math.max(1, TRAINER_RANKS.length - 1);
  const i = Math.round((Math.max(0, Math.min(steps, rankIndex)) * (def.levels.length - 1)) / steps);
  return def.levels[i]?.number ?? 1;
}

/** Local calendar date as YYYY-MM-DD (the replay cap resets at local midnight). */
export function localDateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Read-only progress for a game (undefined if never played). */
export function getGameProgress(save: MiniGamesSave, gameId: MiniGameId): MiniGameProgress | undefined {
  return save[gameId];
}

/** Progress for a game, created if missing. Use inside a mutate() recipe. */
export function ensureGameProgress(save: MiniGamesSave, gameId: MiniGameId): MiniGameProgress {
  return (save[gameId] ??= { levels: {} });
}

export function getLevelProgress(
  save: MiniGamesSave,
  gameId: MiniGameId,
  levelNumber: number,
): Readonly<MiniGameLevelProgress> {
  return save[gameId]?.levels[levelNumber] ?? EMPTY_LEVEL;
}

/** 3★ rounds won on a level (older saves only know whether it ever got 3★). */
export function threeStarWins(lp: Readonly<MiniGameLevelProgress>): number {
  return lp.threeStars ?? (lp.stars === 3 ? 1 : 0);
}

/** How far level `levelNumber` is toward opening the next one: best stars, or 3★ wins when it sets `unlockWins`. */
export function unlockProgress(
  save: MiniGamesSave,
  def: AnyMiniGameDef,
  levelNumber: number,
): { kind: 'stars' | 'wins'; have: number; need: number } {
  const lp = getLevelProgress(save, def.id, levelNumber);
  const wins = def.levels.find((l) => l.number === levelNumber)?.unlockWins;
  if (wins) return { kind: 'wins', have: Math.min(wins, threeStarWins(lp)), need: wins };
  return { kind: 'stars', have: lp.stars, need: UNLOCK_STARS };
}

export function isLevelUnlocked(save: MiniGamesSave, def: AnyMiniGameDef, levelNumber: number): boolean {
  if (levelNumber <= 1) return true;
  const p = unlockProgress(save, def, levelNumber - 1);
  return p.have >= p.need;
}

/** Highest unlocked level number of a game. */
export function highestUnlockedLevel(save: MiniGamesSave, def: AnyMiniGameDef): number {
  let best = def.levels[0]?.number ?? 1;
  for (const lvl of def.levels) if (isLevelUnlocked(save, def, lvl.number)) best = lvl.number;
  return best;
}

/** Sum of best stars over all levels of a game, and the maximum possible. */
export function totalStars(save: MiniGamesSave, def: AnyMiniGameDef): { stars: number; max: number } {
  let stars = 0;
  for (const lvl of def.levels) stars += getLevelProgress(save, def.id, lvl.number).stars;
  return { stars, max: def.levels.length * 3 };
}

/** Replay prizes still available today for a game. */
export function replayPrizesLeft(save: MiniGamesSave, gameId: MiniGameId, now: Date): number {
  const day = save[gameId]?.replayDay;
  const used = day && day.date === localDateKey(now) ? day.count : 0;
  return Math.max(0, REPLAY_DAILY_CAP - used);
}

/** Every prize of a slot (one prize, or a list to pick from). */
export function slotPrizes(slot: MiniGamePrizeSlot): readonly MiniGamePrizeDef[] {
  return Array.isArray(slot) ? slot : [slot as MiniGamePrizeDef];
}

/** Fewest stars that earn a prize on this level. */
export function prizeStarsOf(level: Pick<MiniGameLevel, 'prizeStars'>): Stars {
  return level.prizeStars ?? 1;
}

/** Turns a prize slot into a concrete reward (a random pick for a list, then for `oneOf`). */
export function resolvePrize(
  slot: MiniGamePrizeSlot,
  rng: () => number = Math.random,
): {
  rarity: PrizeRarity;
  reward: DialogueReward;
} {
  const all = slotPrizes(slot);
  const def = all[Math.min(all.length - 1, Math.floor(rng() * all.length))];
  if ('oneOf' in def) {
    const i = Math.min(def.oneOf.length - 1, Math.floor(rng() * def.oneOf.length));
    return { rarity: def.rarity, reward: def.oneOf[i] };
  }
  return { rarity: def.rarity, reward: def.reward };
}

export interface AwardedPrize {
  kind: PrizeKind;
  rarity: PrizeRarity;
  reward: DialogueReward;
}

export interface RecordOutcome {
  /** Level progress before this round (EMPTY when never played). */
  previous: Readonly<MiniGameLevelProgress>;
  /** Level progress after this round. */
  level: Readonly<MiniGameLevelProgress>;
  stars: Stars;
  cleared: boolean;
  /** Beat a previous score (never true on the very first round). */
  newRecord: boolean;
  /** Level number that this round unlocked, if any. */
  unlockedLevel?: number;
  /** Prizes to grant, in reveal order. */
  prizes: AwardedPrize[];
  /** English ladder round only (set by the shell): points earned, and the new level number if the bar filled. */
  ladder?: { gained: number; newLevel?: number };
}

export interface RecordOptions {
  now?: Date;
  rng?: () => number;
  /** false = record stars / score only, no level prizes (care rounds give their own). Default true. */
  levelPrizes?: boolean;
}

/**
 * Record a finished round in `save` (mutates it) and return what changed + the prizes to grant.
 * Granting the prizes is the caller's job (see `systems/rewards.ts`).
 */
export function recordResult(
  save: MiniGamesSave,
  def: AnyMiniGameDef,
  levelNumber: number,
  result: MiniGameResult,
  options: RecordOptions = {},
): RecordOutcome {
  const now = options.now ?? new Date();
  const rng = options.rng ?? Math.random;
  const levelDef = def.levels.find((l) => l.number === levelNumber);
  if (!levelDef) throw new Error(`Mini-game ${def.id} has no level ${levelNumber}`);

  const game = ensureGameProgress(save, def.id);
  const hadEntry = game.levels[levelNumber] !== undefined;
  const previous: MiniGameLevelProgress = { ...(game.levels[levelNumber] ?? EMPTY_LEVEL) };
  const stars = clampStars(result.stars);
  const score = Math.max(0, Math.floor(result.score));
  const cleared = stars >= 1;
  const wasUnlocked = isLevelUnlocked(save, def, levelNumber + 1);

  const level: MiniGameLevelProgress = {
    stars: Math.max(previous.stars, stars) as Stars,
    best: Math.max(previous.best, score),
    clears: previous.clears + (cleared ? 1 : 0),
    threeStars: threeStarWins(previous) + (stars === 3 ? 1 : 0),
  };
  game.levels[levelNumber] = level;
  game.lastPlayed = now.toISOString();

  const prizes: AwardedPrize[] = [];
  const need = prizeStarsOf(levelDef);
  if (stars >= need && options.levelPrizes !== false) {
    if (previous.stars < need) prizes.push({ kind: 'firstClear', ...resolvePrize(levelDef.rewards.firstClear, rng) });
    if (stars === 3 && previous.stars < 3) {
      prizes.push({ kind: 'threeStar', ...resolvePrize(levelDef.rewards.threeStar, rng) });
    }
    if (prizes.length === 0 && replayPrizesLeft(save, def.id, now) > 0) {
      const today = localDateKey(now);
      const count = game.replayDay?.date === today ? game.replayDay.count : 0;
      game.replayDay = { date: today, count: count + 1 };
      prizes.push({ kind: 'replay', ...resolvePrize(levelDef.rewards.replay, rng) });
    }
  }

  const hasNext = def.levels.some((l) => l.number === levelNumber + 1);
  const unlockedLevel =
    hasNext && !wasUnlocked && isLevelUnlocked(save, def, levelNumber + 1) ? levelNumber + 1 : undefined;

  return {
    previous,
    level,
    stars,
    cleared,
    newRecord: hadEntry && score > previous.best,
    unlockedLevel,
    prizes,
  };
}

function clampStars(n: number): Stars {
  return Math.max(0, Math.min(3, Math.floor(n))) as Stars;
}
