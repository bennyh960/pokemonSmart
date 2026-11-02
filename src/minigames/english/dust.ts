/**
 * Dusty levels — English levels not played for a while gather dust, so old words come back without losing anything.
 *
 *   shine:  each English game level remembers when it was last played while clean (`shinedAt`, epoch ms). Any round of
 *           a clean level keeps it clean. A level never played has no dust.
 *   dusty:  DUST_DAYS after its shine. The ladder step is never lowered — a dusty level only shows 🕸️ on the board.
 *   clean:  a DUST_CLEAN_STARS round on a dusty level cleans it and pays a bonus prize (`dustBonusPrize`, board.ts).
 *           Fewer stars leave the dust on, with no penalty — try again.
 *   review: dusty levels come back more — Word Board practice rounds pick one DUST_PRACTICE_SHARE of the time
 *           (`ladderRound`) and Unown ambushes weigh them DUST_REVIEW_WEIGHT× (ambush.ts). A dusty level is never
 *           "mastered", so even well-known words come back.
 *
 * Pure logic (no React, no audio, no saving). Saved in `pd.miniGames['unown-words'].data.shinedAt`.
 */

import { ensureGameProgress } from '../progress.js';
import type { MiniGameId, MiniGamesSave, Stars } from '../types.js';
import { WORDS_HOME } from './useWords.js';

/** Days without playing before a level gets dusty. */
export const DUST_DAYS = 7;
/** Stars that clean a dusty level (and pay the bonus prize). */
export const DUST_CLEAN_STARS: Stars = 3;
/** Share of Word Board practice rounds that go to a dusty level, while there is one. */
export const DUST_PRACTICE_SHARE = 0.75;
/** How much more often an Unown ambush picks a dusty level. */
export const DUST_REVIEW_WEIGHT = 3;

const DAY_MS = 24 * 60 * 60 * 1000;
export const DUST_MS = DUST_DAYS * DAY_MS;

export const levelKey = (gameId: MiniGameId, level: number) => `${gameId}:${level}`;

type ShinedAt = Record<string, number>;

function shinedAtOf(save: MiniGamesSave): ShinedAt {
  const raw = save[WORDS_HOME]?.data?.shinedAt;
  return raw && typeof raw === 'object' ? (raw as ShinedAt) : {};
}

export function isDusty(save: MiniGamesSave, gameId: MiniGameId, level: number, now: number): boolean {
  const at = shinedAtOf(save)[levelKey(gameId, level)];
  return typeof at === 'number' && now - at >= DUST_MS;
}

/** What a round did to its level's dust: was clean, cleaned it now (→ bonus prize), or left it dusty. */
export type DustResult = 'clean' | 'cleaned' | 'dusty';

/**
 * A finished English round (mutates `save`): a clean level stays clean, a dusty one is cleaned only with
 * DUST_CLEAN_STARS.
 */
export function recordDust(save: MiniGamesSave, gameId: MiniGameId, level: number, stars: Stars, now: number): DustResult {
  const dusty = isDusty(save, gameId, level, now);
  if (dusty && stars < DUST_CLEAN_STARS) return 'dusty';
  const data = (ensureGameProgress(save, WORDS_HOME).data ??= {});
  data.shinedAt = { ...shinedAtOf(save), [levelKey(gameId, level)]: now };
  return dusty ? 'cleaned' : 'clean';
}

/** Moves every level's shine `ms` into the past (admin: test dust without waiting; mutates `save`). */
export function ageShine(save: MiniGamesSave, ms: number): void {
  const shinedAt = Object.fromEntries(Object.entries(shinedAtOf(save)).map(([k, at]) => [k, at - ms]));
  (ensureGameProgress(save, WORDS_HOME).data ??= {}).shinedAt = shinedAt;
}
