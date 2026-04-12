/**
 * Global Auto-Gate Configuration
 *
 * Configures question sessions that fire automatically when entering
 * specific service locations (pokecenter, pokemarket, gym entrance).
 *
 * These are "NULL-X identity verification" checks — the game lore says
 * any player entering a public service must prove they are not the rogue AI.
 *
 * Settings here apply to ALL instances of each service type globally
 * (e.g. every pokecenter uses the same question count and time limit).
 */

import type { GateSessionConfig, GateReward } from './gates.js';
import { registerGate } from './gates.js';
import type { GradeId } from '../../math/question-builder/index.js';
import { registerAutoGateMap } from '../../systems/story-engine.js';

// ─── Player grade resolution ──────────────────────────────────────────────────

/** Constant birth year used until date-of-birth feature is implemented. */
export const PLAYER_BIRTH_YEAR = 2018;

/**
 * Calculate grade ID from a birth year.
 * Formula: grade = currentYear − birthYear − 5  (clamped 1–6)
 * In Israel school system: age 6 starts grade 1.
 * e.g. born 2018, year 2026 → age ~8 → grade 3
 */
export function gradeFromBirthYear(birthYear: number): GradeId {
  const currentYear = new Date().getFullYear();
  const gradeNum = Math.min(6, Math.max(1, currentYear - birthYear - 5));
  return `grade${gradeNum}` as GradeId;
}

// ─── Default session config ───────────────────────────────────────────────────

/** Shared base config — override per location as needed. */
export const DEFAULT_SESSION_CONFIG: Omit<GateSessionConfig, 'questionsRequired'> = {
  birthYear: PLAYER_BIRTH_YEAR,
  rewardThreshold: 0.8, // ≥ 80% correct → earn rewards
  penaltyThreshold: 0.5, // < 50% correct → money penalty
  penaltyAmount: 500, // 500 PokeCoins deducted on penalty
  rewards: [{ type: 'money', amount: 500 }],
  bonusEnabled: true,
  bonusMultiplier: 3,
  timeLimitPerQuestion: 0, // default to no time limit (override per location)
};

// ─── Per-service configs ──────────────────────────────────────────────────────

/** How many correct answers are required for each service type. Configurable globally. */
export const AUTO_GATE_QUESTION_COUNTS = {
  pokecenter: 3,
  pokemarket: 1,
  gym: 15,
} as const;

/** Time limit per question (seconds) for each service type. 0 = no limit. */
export const AUTO_GATE_TIME_LIMITS = {
  pokecenter: 150,
  pokemarket: 90,
  gym: 90,
} as const;

/** Cooldown after passing before the gate re-checks (ms). 0 = permanent unlock. */
export const AUTO_GATE_COOLDOWNS = {
  pokecenter: 30 * 60 * 1000, // 30 minutes
  pokemarket: 15 * 60 * 1000, // 15 minutes
  gym: 0, // permanent (use gym when preparing for badge)
} as const;

/** Rewards per service type. */
export const AUTO_GATE_REWARDS: Record<string, GateReward[]> = {
  pokecenter: [
    { type: 'money', amount: 500 },
    { type: 'item', itemId: '45', quantity: 1 },
    { type: 'item', itemId: '46', quantity: 1 },
  ],
  pokemarket: [{ type: 'money', amount: 800 }],
  gym: [
    { type: 'money', amount: 1500 },
    { type: 'item', itemId: '45', quantity: 3 }, // hp-up
    { type: 'item', itemId: '46', quantity: 3 }, //protein
    { type: 'item', itemId: '48', quantity: 3 }, //carbos
    { type: 'item', itemId: '49', quantity: 3 }, // calcium
    { type: 'item', itemId: '47', quantity: 3 }, // iron
    { type: 'item', itemId: '51', quantity: 3 }, // zinc
  ],
};

// ─── Random verification dialogues ───────────────────────────────────────────

/** Shown before the question session starts. One is chosen at random. */
export const VERIFICATION_DIALOGUES = {
  pokecenter: [
    {
      en: "HALT! Nurse Joy's sensors detected a possible NULL-X signature. Please verify your identity to enter.",
      he: "עצור! חיישני האחות ג'וי זיהו חתימה אפשרית של NULL-X. אנא אמת את זהותך כדי להיכנס.",
    },
    {
      en: 'This pokecenter is protected. Only verified trainers may enter. Prove you are not a glitch.',
      he: 'מרכז הפוקימון מוגן. רק מאמנים מאומתים יכולים להיכנס. הוכח שאינך תקלה.',
    },
    {
      en: "Welcome, trainer! Before we heal your pokemon, we must confirm you're not a NULL-X infiltrator.",
      he: 'ברוך הבא, מאמן! לפני שנרפא את הפוקמונים שלך, עלינו לוודא שאינך מסתנן של NULL-X.',
    },
  ],
  pokemarket: [
    {
      en: 'Shop clerk: The market security system flagged your approach. Answer these questions to shop freely.',
      he: 'פקיד החנות: מערכת האבטחה של השוק סימנה את ההתקרבות שלך. ענה על שאלות אלה כדי לקנות בחופשיות.',
    },
    {
      en: 'Security alert: NULL-X has been known to drain market funds. Identity check required.',
      he: 'התראת אבטחה: ידוע כי NULL-X מרוקן כספי שוק. נדרש בדיקת זהות.',
    },
    {
      en: 'The pokemart requires verification before large purchases. Please solve these to continue.',
      he: 'הפוקמרט דורש אימות לפני רכישות גדולות. אנא פתור את אלה כדי להמשיך.',
    },
  ],
  gym: [
    {
      en: 'GYM GUARD: This gym has been targeted by NULL-X. Prove your intelligence before you may challenge the leader!',
      he: 'שומר הGYM: ה-GYM הזה ממוקד על ידי NULL-X. הוכח את האינטליגנציה שלך לפני שתוכל לאתגר את המנהיג!',
    },
    {
      en: 'Only real trainers may challenge this gym. NULL-X cannot solve these math puzzles. Can you?',
      he: 'רק מאמנים אמיתיים יכולים לאתגר את ה-GYM הזה. NULL-X לא יכול לפתור את חידות המתמטיקה האלה. אתה יכול?',
    },
    {
      en: 'The gym leader will only battle those who have proven their mind is their own. Take the verification test.',
      he: 'מנהיג ה-GYM יתמודד רק עם אלה שהוכיחו שדעתם שייכת להם. קח את מבחן האימות.',
    },
  ],
};

// ─── Register global auto-gate defs ──────────────────────────────────────────

registerGate({
  id: 'auto-pokecenter',
  title: { en: 'Pokecenter Identity Check', he: 'בדיקת זהות מרכז פוקימון' },
  description: {
    en: 'Prove you are not NULL-X to access healing services.',
    he: 'הוכח שאינך NULL-X כדי לגשת לשירותי ריפוי.',
  },
  triggerType: 'auto-pokecenter',
  questionSetIds: ['*'],
  totalQuestions: AUTO_GATE_QUESTION_COUNTS.pokecenter,
  passThreshold: AUTO_GATE_QUESTION_COUNTS.pokecenter,
  reopenCooldownMs: AUTO_GATE_COOLDOWNS.pokecenter,
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: AUTO_GATE_QUESTION_COUNTS.pokecenter,
    timeLimitPerQuestion: AUTO_GATE_TIME_LIMITS.pokecenter,
    rewards: AUTO_GATE_REWARDS.pokecenter,
  },
});

registerGate({
  id: 'auto-pokemarket',
  title: { en: 'Pokemart Security Check', he: 'בדיקת אבטחה פוקמרט' },
  description: { en: 'Market security requires identity verification.', he: 'אבטחת השוק דורשת אימות זהות.' },
  triggerType: 'auto-pokemarket',
  questionSetIds: ['*'],
  totalQuestions: AUTO_GATE_QUESTION_COUNTS.pokemarket,
  passThreshold: AUTO_GATE_QUESTION_COUNTS.pokemarket,
  reopenCooldownMs: AUTO_GATE_COOLDOWNS.pokemarket,
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: AUTO_GATE_QUESTION_COUNTS.pokemarket,
    timeLimitPerQuestion: AUTO_GATE_TIME_LIMITS.pokemarket,
    rewards: AUTO_GATE_REWARDS.pokemarket,
  },
});

registerGate({
  id: 'auto-gym',
  title: { en: 'Gym Entrance Verification', he: 'אימות כניסה לGYM' },
  description: {
    en: 'The gym only admits verified, non-glitched trainers.',
    he: 'ה-GYM מקבל רק מאמנים מאומתים ושאינם תקולים.',
  },
  triggerType: 'auto-gym-entrance',
  questionSetIds: ['*'],
  totalQuestions: AUTO_GATE_QUESTION_COUNTS.gym,
  passThreshold: AUTO_GATE_QUESTION_COUNTS.gym,
  reopenCooldownMs: AUTO_GATE_COOLDOWNS.gym,
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: AUTO_GATE_QUESTION_COUNTS.gym,
    timeLimitPerQuestion: AUTO_GATE_TIME_LIMITS.gym,
    rewards: AUTO_GATE_REWARDS.gym,
    penaltyAmount: 0, // no money penalty at gym — you just can't enter
  },
});

// ─── Service map registrations ────────────────────────────────────────────────

// Pokecenter interiors
registerAutoGateMap('pokecenter-mart-interior', 'pokecenter');
registerAutoGateMap('pokecenter-2', 'pokecenter');
registerAutoGateMap('fake-pokecenter', 'pokecenter');
registerAutoGateMap('multiplia-pokecenter', 'pokecenter');

// Pokemart interiors
registerAutoGateMap('mart-interior', 'pokemarket');

// Gym interiors
registerAutoGateMap('sumville-gym', 'gym');
// Add future gyms here as their map IDs become known, e.g.:
// registerAutoGateMap('minusburg-gym',          'gym');
// registerAutoGateMap('multiplia-gym',          'gym');
