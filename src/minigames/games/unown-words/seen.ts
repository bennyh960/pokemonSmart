/**
 * Learned letters / words, kept in `pd.miniGames['unown-words'].data.seen` (later feeds the
 * Sprint 11 progressive-English system). Pure helpers; the component does the mutate().
 */

import type { Learned } from './questions.js';

export interface SeenData {
  letters: string[];
  words: string[];
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Reads `data.seen`, tolerating a missing or malformed value. */
export function readSeen(data: Record<string, unknown> | undefined): SeenData {
  const raw = data?.seen as Partial<Record<keyof SeenData, unknown>> | undefined;
  return { letters: strings(raw?.letters), words: strings(raw?.words) };
}

/** Adds what was learned (lower-cased, de-duplicated, sorted). */
export function mergeSeen(prev: SeenData, learned: readonly Learned[]): SeenData {
  const letters = new Set(prev.letters);
  const words = new Set(prev.words);
  for (const l of learned) {
    l.letters.forEach((x) => letters.add(x.toLowerCase()));
    l.words.forEach((x) => words.add(x.toLowerCase()));
  }
  return { letters: [...letters].sort(), words: [...words].sort() };
}
