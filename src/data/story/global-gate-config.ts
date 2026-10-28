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
import type { AutoGateMapOverride } from '../../systems/story-engine.js';
import { registerAutoGateMap } from '../../systems/story-engine.js';
import { getPlayerData } from '../../systems/game-state.js';
import { MapId } from '../maps/map-ids.js';

// ─── Player grade resolution ──────────────────────────────────────────────────

/**
 * Returns the player's birth year from saved data.
 * Falls back to PLAYER_BIRTH_YEAR (2018) if data is not yet loaded.
 */
export function getPlayerBirthYear(): number {
  /** Fallback birth year if player has not set one. */
  const PLAYER_BIRTH_YEAR = 2018;
  try {
    return getPlayerData()?.birthYear ?? PLAYER_BIRTH_YEAR;
  } catch {
    return PLAYER_BIRTH_YEAR;
  }
}

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
  rewardThreshold: 0.8, // ≥ 80% correct → earn rewards
  penaltyThreshold: 0.5, // < 50% correct → money penalty
  penaltyAmount: 500, // 500 PokeCoins deducted on penalty
  rewards: [
    { type: 'money', amount: 1500 },
    { type: 'item', itemId: 'pokeball', quantity: 3 },
  ],
  bonusEnabled: true,
  bonusMultiplier: 3,
  timeLimitPerQuestion: 0, // default to no time limit (override per location)
};

// ─── Per-service configs ──────────────────────────────────────────────────────
const isProd = import.meta.env.MODE === 'production';
/** How many correct answers are required for each service type. Configurable globally. */
export const AUTO_GATE_QUESTION_COUNTS = {
  pokecenter: isProd ? 5 : 1,
  pokemarket: isProd ? 10 : 1,
  gym: isProd ? 15 : 1,
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
  gym: 90 * 60 * 1000, // 60 minutes (use gym when preparing for badge)
  lab: 30 * 60 * 1000,
} as const;

/** Rewards per service type. */
export const AUTO_GATE_REWARDS: Record<string, GateReward[]> = {
  pokecenter: [{ type: 'money', amount: 500 }],
  pokemarket: [{ type: 'money', amount: 1000 }],
  gym: [
    { type: 'money', amount: 5000 },
    { type: 'item', itemId: '45', quantity: 3 }, // hp-up
    { type: 'item', itemId: '46', quantity: 3 }, //protein
    { type: 'item', itemId: '48', quantity: 3 }, //carbos
    { type: 'item', itemId: '49', quantity: 3 }, // calcium
    { type: 'item', itemId: '47', quantity: 3 }, // iron
    { type: 'item', itemId: '52', quantity: 3 }, // zinc
  ],
};

// ─── Random verification dialogues ───────────────────────────────────────────

/** Shown before the question session starts. One is chosen at random. */
export const VERIFICATION_DIALOGUES = {
  pokecenter: [
    {
      en: "Nurse Joy: Welcome! A quick check before we heal your Pokémon — answer a few questions!",
      he: "האחות ג'וי: ברוך הבא! בדיקה קטנה לפני שנרפא את הפוקימונים שלך — ענה על כמה שאלות!",
    },
    {
      en: "Beep beep! The door scanner wants to make sure you're a real trainer, not NULL-X!",
      he: 'ביפ ביפ! סורק הדלת רוצה לוודא שאתה מאמן אמיתי ולא NULL-X!',
    },
    {
      en: 'Your Pokémon need a rest! Solve these and come right in.',
      he: 'הפוקימונים שלך צריכים מנוחה! פתור את אלה ותיכנס מיד.',
    },
  ],
  pokemarket: [
    {
      en: 'Clerk: Hi there! NULL-X tried to sneak into our shop. Answer a few questions and shop all you want!',
      he: 'המוכר: היי! NULL-X ניסה להתגנב לחנות שלנו. ענה על כמה שאלות ותקנה כמה שתרצה!',
    },
    {
      en: 'Beep! The shop alarm is on. Smart trainers turn it off by solving questions!',
      he: 'ביפ! האזעקה של החנות דולקת. מאמנים חכמים מכבים אותה כשהם פותרים שאלות!',
    },
    {
      en: "Shopping time! But first, show the shop you're a real trainer.",
      he: 'זמן קניות! אבל קודם, תראה לחנות שאתה מאמן אמיתי.',
    },
  ],
  gym: [
    {
      en: 'Gym Guide: Want to battle the Gym Leader? First we train the brain!',
      he: 'מדריך המכון: רוצה להילחם במנהיג המכון? קודם מאמנים את המוח!',
    },
    {
      en: "Only smart trainers get in! NULL-X can't solve these — can you?",
      he: 'רק מאמנים חכמים נכנסים! NULL-X לא מצליח לפתור את אלה — ואתה?',
    },
    {
      en: "The Gym Leader is watching! Show what you've got.",
      he: 'מנהיג המכון צופה בך! תראה מה אתה יודע.',
    },
  ],
  /** Gate guards and gate tiles on roads. */
  guard: [
    {
      en: 'Halt, trainer! Answer my questions and the road is yours!',
      he: 'עצור, מאמן! ענה על השאלות שלי והדרך שלך!',
    },
    {
      en: "NULL-X glitches can't do math. Show me you can!",
      he: "הגליצ'ים של NULL-X לא יודעים חשבון. תראה לי שאתה כן!",
    },
    {
      en: 'Checkpoint! A few quick questions and you can go on.',
      he: 'מחסום! כמה שאלות קצרות ותוכל להמשיך.',
    },
  ],
};

/** Labs play a mini-game instead — one line is shown on its intro card. */
export const MINI_GAME_GATE_LINES = {
  lab: [
    {
      en: 'Only a real trainer can think it through. Solve the puzzle to come in!',
      he: 'רק מאמן אמיתי יודע לחשוב עד הסוף. פתור את החידה כדי להיכנס!',
    },
    {
      en: "NULL-X can't solve puzzles. Can you? The lab door is waiting.",
      he: 'NULL-X לא מסוגל לפתור חידות. ואתה? דלת המעבדה מחכה.',
    },
  ],
};

// ─── Register global auto-gate defs ──────────────────────────────────────────

registerGate({
  id: 'auto-pokecenter',
  title: { en: 'Pokémon Center Check', he: 'בדיקה במרכז הפוקימונים' },
  description: {
    en: 'Prove you are not NULL-X to access healing services.',
    he: 'הוכח שאינך NULL-X כדי לגשת לשירותי ריפוי.',
  },
  triggerType: 'auto-pokecenter',
  questionSetIds: ['*'],
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
  title: { en: 'Poké Mart Check', he: 'בדיקה בחנות' },
  description: { en: 'Market security requires identity verification.', he: 'אבטחת השוק דורשת אימות זהות.' },
  triggerType: 'auto-pokemarket',
  questionSetIds: ['*'],
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
  title: { en: 'Gym Entrance Check', he: 'בדיקה בכניסה למכון' },
  description: {
    en: 'The gym only admits verified, non-glitched trainers.',
    he: 'המכון מקבל רק מאמנים מאומתים - אמצעי זהירות כנגד צוות רוקט.',
  },
  triggerType: 'auto-gym-entrance',
  questionSetIds: ['*'],
  reopenCooldownMs: AUTO_GATE_COOLDOWNS.gym,
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: AUTO_GATE_QUESTION_COUNTS.gym,
    timeLimitPerQuestion: AUTO_GATE_TIME_LIMITS.gym,
    rewards: AUTO_GATE_REWARDS.gym,
    penaltyAmount: 0, // no money penalty at gym — you just can't enter
    inputQuestions: { count: 5, types: ['+', '-', '×', '÷'] }, // gym requires manual input questions
  },
});

// ─── Service map registrations ────────────────────────────────────────────────

// Pokecenter interiors
registerAutoGateMap(MapId.SHARED_POKECENTER_MART_INTERIOR, 'pokecenter');
registerAutoGateMap(MapId.SHARED_POKECENTER_2, 'pokecenter');
registerAutoGateMap(MapId.MULTIPLIA_POKECENTER, 'pokecenter');

// Pokemart interiors
registerAutoGateMap(MapId.SHARED_MART_INTERIOR, 'pokemarket');

// Gym interiors
const GYM_AUTO_GATE_OVERRIDES: Record<string, AutoGateMapOverride> = {
  [MapId.SUMVILLE_GYM]: {
    questionSetIds: ['+'],
    sessionConfig: {
      inputQuestions: { count: 5, types: ['+'] },
      rewards: [{ type: 'money', amount: 4500 }],
    },
  },
  [MapId.MINUSBURG_GYM]: {
    questionSetIds: ['-'],
    sessionConfig: {
      inputQuestions: { count: 5, types: ['-'] },
    },
  },
  [MapId.MULTIPLIA_GYM]: {
    questionSetIds: ['×'],
    sessionConfig: {
      inputQuestions: { count: 8, types: ['×'] },
      questionsRequired: 15,
      timeLimitPerQuestion: 180,
    },
  },
  [MapId.DIVIDIA_GYM]: {
    questionSetIds: ['÷'],
    sessionConfig: {
      inputQuestions: { count: 8, types: ['÷'] },
      questionsRequired: 20,
      timeLimitPerQuestion: 210,
    },
  },
  [MapId.FRACTALIS_GYM]: {
    questionSetIds: ['+', '-', '×', '÷'],
    sessionConfig: {
      inputQuestions: { count: 10, types: ['+', '-', '×', '÷'] },
      questionsRequired: 25,
      timeLimitPerQuestion: 180,
    },
  },
  [MapId.SYMMETRIKA_GYM]: {
    questionSetIds: ['+', '-', '×', '÷'],
    sessionConfig: {
      inputQuestions: { count: 10, types: ['+', '-', '×', '÷'] },
      questionsRequired: 25,
      timeLimitPerQuestion: 150,
    },
  },
};

registerAutoGateMap(MapId.SUMVILLE_GYM, 'gym', GYM_AUTO_GATE_OVERRIDES[MapId.SUMVILLE_GYM]);
registerAutoGateMap(MapId.MINUSBURG_GYM, 'gym', GYM_AUTO_GATE_OVERRIDES[MapId.MINUSBURG_GYM]);
registerAutoGateMap(MapId.MULTIPLIA_GYM, 'gym', GYM_AUTO_GATE_OVERRIDES[MapId.MULTIPLIA_GYM]);
registerAutoGateMap(MapId.DIVIDIA_GYM, 'gym', GYM_AUTO_GATE_OVERRIDES[MapId.DIVIDIA_GYM]);
registerAutoGateMap(MapId.FRACTALIS_GYM, 'gym', GYM_AUTO_GATE_OVERRIDES[MapId.FRACTALIS_GYM]);
registerAutoGateMap(MapId.SYMMETRIKA_GYM, 'gym', GYM_AUTO_GATE_OVERRIDES[MapId.SYMMETRIKA_GYM]);

// Labs — a mini-game instead of questions (the level follows the trainer rank).
// Libraries have no entry gate: kids play English at the Word Board because they want to.
registerGate({
  id: 'auto-lab',
  title: { en: 'Lab Logic Check', he: 'בדיקת היגיון במעבדה' },
  triggerType: 'auto-lab',
  questionSetIds: [],
  reopenCooldownMs: AUTO_GATE_COOLDOWNS.lab,
  sessionConfig: { ...DEFAULT_SESSION_CONFIG, questionsRequired: 0 },
  miniGame: { category: 'logic' },
});

registerAutoGateMap(MapId.SUMVILLE_LAB, 'lab');
registerAutoGateMap(MapId.PERCENTILE_LAB, 'lab');
registerAutoGateMap(MapId.ZEROVILLE_ALGORITHMA_LAB, 'lab');
