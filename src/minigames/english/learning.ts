/**
 * Word learning — pure (no React, no saving). Every English mode shares one record per word:
 *
 *   box 0–3   a right first-try answer moves the word up one box, at most once per day (repetition on
 *             different days is what makes a word stick); a wrong answer drops it back to box 0
 *   known     reached box KNOWN_BOX once — stays known (it's a Word Dex card) even if later missed
 *   picking   new words and words the player got wrong come often, known words come back now and then;
 *             the word of the day (`focusDay` = today) comes first until it is answered right today
 *
 * Saved in `pd.miniGames['unown-words'].data.words` (the library's home game) — see useWords.ts.
 */

import { localDateKey } from '../progress.js';
import type { Rng } from './random.js';
import type { Word } from './words.js';

export const KNOWN_BOX = 3;

export interface WordStat {
  box: number;
  /** Times answered. */
  seen: number;
  /** Times answered right on the first try. */
  right: number;
  /** Day (YYYY-MM-DD) the word last moved up a box. */
  upDay?: string;
  /** Day it was last answered. */
  day?: string;
  /** Day it was last answered right on the first try. */
  rightDay?: string;
  known?: boolean;
  /** Day it was the word of the day (see wordOfTheDay). */
  focusDay?: string;
}

export type WordStats = Record<string, WordStat>;

/** One answered word: right = on the first try. */
export interface WordAnswer {
  wordId: string;
  right: boolean;
}

export function todayKey(now = new Date()): string {
  return localDateKey(now);
}

/** Reads saved stats, tolerating missing or malformed data. */
export function readWordStats(raw: unknown): WordStats {
  if (!raw || typeof raw !== 'object') return {};
  const out: WordStats = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const s = v as Partial<WordStat>;
    out[id] = {
      box: typeof s.box === 'number' ? Math.max(0, Math.min(KNOWN_BOX, s.box)) : 0,
      seen: typeof s.seen === 'number' ? s.seen : 0,
      right: typeof s.right === 'number' ? s.right : 0,
      upDay: typeof s.upDay === 'string' ? s.upDay : undefined,
      day: typeof s.day === 'string' ? s.day : undefined,
      rightDay: typeof s.rightDay === 'string' ? s.rightDay : undefined,
      known: s.known === true || undefined,
      focusDay: typeof s.focusDay === 'string' ? s.focusDay : undefined,
    };
  }
  return out;
}

/** Applies a round's answers. A word answered twice in a round counts once (the first answer). */
export function recordAnswers(stats: WordStats, answers: readonly WordAnswer[], today: string): WordStats {
  const out: WordStats = { ...stats };
  const done = new Set<string>();
  for (const { wordId, right } of answers) {
    if (done.has(wordId)) continue;
    done.add(wordId);
    const prev = out[wordId] ?? { box: 0, seen: 0, right: 0 };
    const next: WordStat = { ...prev, seen: prev.seen + 1, day: today };
    if (right) {
      next.right = prev.right + 1;
      next.rightDay = today;
      if (prev.upDay !== today && prev.box < KNOWN_BOX) {
        next.box = prev.box + 1;
        next.upDay = today;
      }
      if (next.box >= KNOWN_BOX) next.known = true;
    } else {
      next.box = 0;
    }
    out[wordId] = next;
  }
  return out;
}

/** Weight of the word of the day until it's answered right today — far above the rest, so a round that can ask it does. */
export const FOCUS_WEIGHT = 40;

/** How much a word wants to be asked now (higher = sooner). */
export function wordWeight(stat: WordStat | undefined, today: string): number {
  if (!stat) return 3; // new
  if (stat.focusDay === today && stat.rightDay !== today) return FOCUS_WEIGHT; // word of the day, not yet right
  if (stat.box === 0) return 5; // missed / just met
  const fresh = stat.day === today;
  if (stat.box >= KNOWN_BOX) return fresh ? 0.3 : 1;
  return fresh ? 1.5 : 4 - stat.box;
}

/** New words a round may bring (each gets a learning card first). */
export const MAX_NEW_PER_ROUND = 4;

/**
 * `count` distinct words, weighted by `wordWeight`, with at most `maxNew` never-met words — when the
 * pool runs out of met words, more new ones are allowed so the round is still full.
 */
export function pickWords(
  rng: Rng,
  pool: readonly Word[],
  stats: WordStats,
  count: number,
  today: string,
  maxNew = MAX_NEW_PER_ROUND,
): Word[] {
  const isNew = (w: Word) => !stats[w.id];
  const met = pool.filter((w) => !isNew(w)).length;
  const allowNew = Math.max(maxNew, count - met);
  let newCount = 0;
  const left = pool.map((w) => ({ w, weight: wordWeight(stats[w.id], today) }));
  const out: Word[] = [];
  while (out.length < count && left.length > 0) {
    if (newCount >= allowNew) {
      for (let k = left.length - 1; k >= 0; k--) if (isNew(left[k].w)) left.splice(k, 1);
      if (left.length === 0) break;
    }
    const total = left.reduce((n, x) => n + x.weight, 0);
    let r = rng() * total;
    let i = 0;
    while (i < left.length - 1 && r >= left[i].weight) r -= left[i++].weight;
    if (isNew(left[i].w)) newCount++;
    out.push(left[i].w);
    left.splice(i, 1);
  }
  return out;
}

export function knownCount(stats: WordStats): number {
  return Object.values(stats).filter((s) => s.known).length;
}

/** Words answered right (first try) at least STRONG_RIGHTS times — what moves a child up the English ladder. */
export const STRONG_RIGHTS = 2;

export function strongCount(stats: WordStats, ids?: readonly string[]): number {
  const list = ids ? ids.map((id) => stats[id]) : Object.values(stats);
  return list.filter((s) => s && s.right >= STRONG_RIGHTS).length;
}

/** Words shown on a learning card: they now have a record (box 0), so they count as met and come back soon. */
export function markShown(stats: WordStats, wordIds: readonly string[], today: string): WordStats {
  const out: WordStats = { ...stats };
  for (const id of wordIds) out[id] ??= { box: 0, seen: 0, right: 0, day: today };
  return out;
}

/**
 * The word of the day: once chosen it stays all day (`focusDay`, saved by setWordOfTheDay). Otherwise one the child
 * has met but doesn't know yet (else any met word), from the date — so it can come up in the games they play.
 * A child who met no word yet gets an easy (tier 1–2) word that isn't saved.
 */
export function wordOfTheDay(words: readonly Word[], stats: WordStats, today: string): Word {
  const focused = words.find((w) => stats[w.id]?.focusDay === today);
  if (focused) return focused;
  const met = words.filter((w) => stats[w.id]);
  const learning = met.filter((w) => !stats[w.id].known);
  const pool = learning.length > 0 ? learning : met.length > 0 ? met : words.filter((w) => w.tier <= 2);
  let h = 0;
  for (const ch of today) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}

/** Saves `wordId` as today's word (only a met word — a record is what makes a word "met"). */
export function setWordOfTheDay(stats: WordStats, wordId: string, today: string): WordStats {
  const s = stats[wordId];
  if (!s || s.focusDay === today) return stats;
  return { ...stats, [wordId]: { ...s, focusDay: today } };
}
