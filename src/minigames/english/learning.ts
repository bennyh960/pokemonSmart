/**
 * Word learning — pure (no React, no saving). Every English mode shares one record per word:
 *
 *   box 0–3   a right first-try answer moves the word up one box, at most once per day (repetition on
 *             different days is what makes a word stick); a wrong answer drops it back to box 0
 *   known     reached box KNOWN_BOX once — stays known (it's a Word Dex card) even if later missed
 *   picking   new words and words the player got wrong come often, known words come back now and then
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
  known?: boolean;
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
      known: s.known === true || undefined,
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

/** How much a word wants to be asked now (higher = sooner). */
export function wordWeight(stat: WordStat | undefined, today: string): number {
  if (!stat) return 3; // new
  if (stat.box === 0) return 5; // missed / just met
  const fresh = stat.day === today;
  if (stat.box >= KNOWN_BOX) return fresh ? 0.3 : 1;
  return fresh ? 1.5 : 4 - stat.box;
}

/** `count` distinct words, weighted by `wordWeight` (fewer if the pool is smaller). */
export function pickWords(rng: Rng, pool: readonly Word[], stats: WordStats, count: number, today: string): Word[] {
  const left = pool.map((w) => ({ w, weight: wordWeight(stats[w.id], today) }));
  const out: Word[] = [];
  while (out.length < count && left.length > 0) {
    const total = left.reduce((n, x) => n + x.weight, 0);
    let r = rng() * total;
    let i = 0;
    while (i < left.length - 1 && r >= left[i].weight) r -= left[i++].weight;
    out.push(left[i].w);
    left.splice(i, 1);
  }
  return out;
}

export function knownCount(stats: WordStats): number {
  return Object.values(stats).filter((s) => s.known).length;
}

/** The same word all day for everyone (tier 1–2), from the date. */
export function wordOfTheDay(words: readonly Word[], today: string): Word {
  const pool = words.filter((w) => w.tier <= 2);
  let h = 0;
  for (const ch of today) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
}
