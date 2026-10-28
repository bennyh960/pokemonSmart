/**
 * Clock question — "Your pass ends in N minutes. It's 20:05 now. What time does it end?"
 *
 * Used by the green gate light: a correct answer refills the gate pass.
 * Grades 1–2 pick from 4 choices and get minutes in steps of 5; grades 3+ type HH:MM.
 */

import type { GradeId } from './question-builder/types.js';

export interface ClockTime {
  h: number; // 0–23
  m: number; // 0–59
}

export interface ClockQuestion {
  now: ClockTime;
  minutesLeft: number;
  answer: ClockTime;
  /** 4 shuffled choices (answer included) — or null when the player types the answer. */
  choices: ClockTime[] | null;
}

const MINUTES_PER_DAY = 24 * 60;

function fromMinutes(total: number): ClockTime {
  const t = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return { h: Math.floor(t / 60), m: t % 60 };
}

function toMinutes(t: ClockTime): number {
  return t.h * 60 + t.m;
}

/** "20:05" */
export function formatClock(t: ClockTime): string {
  return `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`;
}

/** Parse what a kid types: "20:25", "20.25", "20 25", "2025", "8:05". Null if it isn't a time. */
export function parseClock(raw: string): ClockTime | null {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2})\s*[:.\s]\s*(\d{2})$/) ?? s.match(/^(\d{1,2})(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

export function sameClock(a: ClockTime, b: ClockTime): boolean {
  return a.h === b.h && a.m === b.m;
}

function usesChoices(grade: GradeId): boolean {
  return grade === 'grade1' || grade === 'grade2';
}

/** Whole minutes to show; young players get steps of 5 (when at least 5 are left). */
function displayedMinutes(remainingMs: number, grade: GradeId): number {
  const whole = Math.max(1, Math.floor(remainingMs / 60_000));
  if (usesChoices(grade) && whole >= 5) return whole - (whole % 5);
  return whole;
}

/** Wrong-but-tempting choices: off by 5/10 minutes, off by an hour, or the time now. */
function distractors(now: ClockTime, answer: ClockTime, minutesLeft: number): ClockTime[] {
  const a = toMinutes(answer);
  const candidates = [a + 5, a - 5, a + 10, a - 10, a + 60, a - 60, toMinutes(now), a + minutesLeft].map(fromMinutes);
  const out: ClockTime[] = [];
  for (const c of candidates.sort(() => Math.random() - 0.5)) {
    if (sameClock(c, answer) || out.some((o) => sameClock(o, c))) continue;
    out.push(c);
    if (out.length === 3) break;
  }
  return out;
}

export function buildClockQuestion(nowDate: Date, remainingMs: number, grade: GradeId): ClockQuestion {
  const now: ClockTime = { h: nowDate.getHours(), m: nowDate.getMinutes() };
  const minutesLeft = displayedMinutes(remainingMs, grade);
  const answer = fromMinutes(toMinutes(now) + minutesLeft);
  const choices = usesChoices(grade)
    ? [answer, ...distractors(now, answer, minutesLeft)].sort(() => Math.random() - 0.5)
    : null;
  return { now, minutesLeft, answer, choices };
}
