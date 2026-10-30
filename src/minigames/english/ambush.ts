/**
 * Unown ambush — a review round of English the child already played, sprung in the wild.
 *
 *   trigger:  after a battle with a glitched Pokémon — always for a wild-Pokémon NPC, AMBUSH_CHANCE_BY_INFECTION
 *             for a random wild one (by the map's infection). Never in a city (map-manifest cities), at most once
 *             every AMBUSH_COOLDOWN_STEPS steps.
 *   round:    one game level of a step the child reached (`reviewRounds()`): steps below the current one, and
 *             levels of the current step played at least once (a recent result, or a clear saved before). A level is skipped while it is mastered — its last
 *             RECENT_RESULTS rounds all 3★ (`recordEnglishResult()`, any English round). Weaker levels come more.
 *   forced:   no lock — a round left before it is cleared comes back after AMBUSH_RETRY_STEPS steps (same game).
 *   prizes:   one common prize of the step on a clear; no ladder points.
 *
 * Pure logic (no React, no audio, no saving) except the pending ambush and the cooldown, which live in memory only.
 */

import type { InfectionLevel } from '../../types/index.js';
import { ensureGameProgress, getLevelProgress, highestUnlockedLevel, resolvePrize, type AwardedPrize } from '../progress.js';
import { getMiniGame } from '../registry.js';
import type { MiniGameId, MiniGamesSave, Stars } from '../types.js';
import { boardStep, unlockedStep } from './board.js';
import { ENGLISH_LADDER, readLadder } from './ladder.js';
import { pick, type Rng } from './random.js';
import { WORDS_HOME } from './useWords.js';

/** Results kept per game level to tell a mastered one. */
export const RECENT_RESULTS = 3;

/** Chance of an ambush after a battle with a random glitched wild Pokémon, by the map's infection. */
export const AMBUSH_CHANCE_BY_INFECTION: Readonly<Partial<Record<InfectionLevel, number>>> = { critical: 0.1 };

/** Steps between two ambushes. */
export const AMBUSH_COOLDOWN_STEPS = 150;

/** Steps before a round left uncleared comes back. */
export const AMBUSH_RETRY_STEPS = 25;

/** A game level to review, and the step whose prizes it pays (the first step that plays it). */
export interface AmbushRound {
  gameId: MiniGameId;
  level: number;
  stepIndex: number;
}

type RecentResults = Record<string, Stars[]>;

const roundKey = (gameId: MiniGameId, level: number) => `${gameId}:${level}`;

function recentOf(save: MiniGamesSave): RecentResults {
  const raw = save[WORDS_HOME]?.data?.recent;
  return raw && typeof raw === 'object' ? (raw as RecentResults) : {};
}

/** Remembers a finished English round's stars, the last RECENT_RESULTS per game level (mutates `save`). */
export function recordEnglishResult(save: MiniGamesSave, gameId: MiniGameId, level: number, stars: Stars): void {
  const data = (ensureGameProgress(save, WORDS_HOME).data ??= {});
  const recent = { ...recentOf(save) };
  recent[roundKey(gameId, level)] = [...(recent[roundKey(gameId, level)] ?? []), stars].slice(-RECENT_RESULTS);
  data.recent = recent;
}

/** A level is mastered while its last RECENT_RESULTS rounds were all 3★. */
export function isMastered(save: MiniGamesSave, gameId: MiniGameId, level: number): boolean {
  const results = recentOf(save)[roundKey(gameId, level)] ?? [];
  return results.length >= RECENT_RESULTS && results.every((s) => s === 3);
}

/** Every game level the child can review, each with its weight (weaker → more): mastered ones are left out. */
export function reviewRounds(save: MiniGamesSave): { round: AmbushRound; weight: number }[] {
  const current = readLadder(save).step;
  const recent = recentOf(save);
  const seen = new Set<string>();
  const out: { round: AmbushRound; weight: number }[] = [];
  for (let stepIndex = 0; stepIndex <= current; stepIndex++) {
    for (const play of ENGLISH_LADDER[stepIndex].play) {
      const level = play.level === 'best' ? highestUnlockedLevel(save, getMiniGame(play.gameId)) : play.level;
      const key = roundKey(play.gameId, level);
      if (seen.has(key)) continue;
      seen.add(key);
      const results = recent[key] ?? [];
      // Played = a recent result, or a clear saved before results were kept
      const saved = getLevelProgress(save, play.gameId, level);
      if (stepIndex === current && results.length === 0 && saved.clears === 0) continue; // nothing to review yet
      if (isMastered(save, play.gameId, level)) continue;
      // Average stars of the last rounds (else the level's best, else middle): 3★ → weight 1, 0★ → weight 4
      const avg = results.length
        ? results.reduce<number>((s, n) => s + n, 0) / results.length
        : saved.clears > 0
          ? saved.stars
          : 1.5;
      out.push({ round: { gameId: play.gameId, level, stepIndex }, weight: 4 - avg });
    }
  }
  return out;
}

/** A review round to play, weighted by `reviewRounds()` (null = nothing to review). */
export function pickAmbushRound(save: MiniGamesSave, rng: Rng): AmbushRound | null {
  const rounds = reviewRounds(save);
  let r = rng() * rounds.reduce((s, x) => s + x.weight, 0);
  for (const x of rounds) {
    r -= x.weight;
    if (r < 0) return x.round;
  }
  return rounds.at(-1)?.round ?? null;
}

/** Prizes of a finished ambush round: one common prize of its step (what `badges` open). Nothing when not cleared. */
export function ambushPrizes(stepIndex: number, stars: Stars, badges: number, rng: Rng): AwardedPrize[] {
  if (stars < 1) return [];
  const commons = unlockedStep(boardStep(stepIndex), badges).prizes.filter((p) => p.rarity === 'common');
  return commons.length ? [{ kind: 'board', ...resolvePrize(pick(rng, commons), rng) }] : [];
}

// ── Trigger (memory only) ───────────────────────────────────────────────────

export type AmbushSource = 'wild-npc' | 'wild';

/** Chance of an ambush after a battle with a glitched Pokémon (0 in a city). */
export function ambushChance(source: AmbushSource, infection: InfectionLevel | undefined, inCity: boolean): number {
  if (inCity) return 0;
  if (source === 'wild-npc') return 1;
  return (infection && AMBUSH_CHANCE_BY_INFECTION[infection]) ?? 0;
}

interface PendingAmbush {
  round: AmbushRound;
  /** The ambush springs once the player has walked this many steps. */
  atStep: number;
  retry: boolean;
  /** Sprung and not closed yet (its cutscene or game is on). */
  running: boolean;
}

let pending: PendingAmbush | null = null;
let lastAmbushStep = -Infinity;

/** Test hook: forget the pending ambush and the cooldown. */
export function resetAmbush(): void {
  pending = null;
  lastAmbushStep = -Infinity;
}

function setPending(round: AmbushRound, atStep: number): void {
  pending = { round, atStep, retry: false, running: false };
}

/**
 * Rolls an ambush after a battle with a glitched Pokémon (`totalSteps` = the player's step count).
 * Returns true when one is now pending.
 */
export function rollAmbush(
  save: MiniGamesSave,
  totalSteps: number,
  chance: number,
  rng: Rng = Math.random,
): boolean {
  if (pending || totalSteps - lastAmbushStep < AMBUSH_COOLDOWN_STEPS || rng() >= chance) return false;
  const round = pickAmbushRound(save, rng);
  if (!round) return false;
  setPending(round, totalSteps);
  lastAmbushStep = totalSteps;
  return true;
}

/** Admin: an ambush now, ignoring chance and cooldown (false when there is nothing to review). */
export function forceAmbush(save: MiniGamesSave, totalSteps: number, rng: Rng = Math.random): boolean {
  const round = pickAmbushRound(save, rng);
  if (!round) return false;
  setPending(round, totalSteps);
  return true;
}

/** Springs the pending ambush once it is due: returns it, then nothing until `endAmbush`. */
export function takeDueAmbush(totalSteps: number): { round: AmbushRound; retry: boolean } | null {
  if (!pending || pending.running || totalSteps < pending.atStep) return null;
  pending.running = true;
  return pending;
}

/** The ambush round closed: cleared → done; otherwise it comes back after AMBUSH_RETRY_STEPS steps. */
export function endAmbush(cleared: boolean, totalSteps: number): void {
  if (!pending) return;
  if (cleared) pending = null;
  else pending = { ...pending, atStep: totalSteps + AMBUSH_RETRY_STEPS, retry: true, running: false };
  lastAmbushStep = totalSteps;
}
