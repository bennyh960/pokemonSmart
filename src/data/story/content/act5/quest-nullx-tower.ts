/**
 * ACT 5: NULL-X Tower — Elite Four + Final Confrontation
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act5-tower, main-act5-elite, main-act5-nullx
 * GATES:    gate-nullx-tower-entry  (entry — requires all 8 serum fragments)
 *           gate-elite-parse        (Floor 2 — PARSE: pattern recognition)
 *           gate-elite-recurse      (Floor 3 — RECURSE: recursive logic)
 *           gate-elite-null-y       (Floor 4 — NULL-Y: mixed challenge)
 *           gate-elite-axiom        (Floor 5 — AXIOM: first-principles math)
 *           gate-nullx-final        (Floor 6 — NULL-X final equation)
 *
 * STORY BEATS (in order):
 *   1. Player enters NULL-X Tower → NULL-X taunts, challenges player
 *   2. Player defeats PARSE (floor 2)
 *   3. Player defeats RECURSE (floor 3)
 *   4. Player defeats NULL-Y (floor 4)
 *   5. Player defeats AXIOM (floor 5)
 *   6. Player reaches floor 6 → NULL-X confrontation cutscene
 *   7. Player solves final gate → victory → Numeria saved
 *
 * FLAGS SET: VISITED_NULLX_TOWER, GATE_TOWER_ENTRY_PASS,
 *            GATE_ELITE_PARSE_PASS, GATE_ELITE_RECURSE_PASS,
 *            GATE_ELITE_NULL_Y_PASS, GATE_ELITE_AXIOM_PASS,
 *            GATE_NULLX_FINAL_PASS, STORY_NULLX_DEFEATED, STORY_COMPLETE
 * FLAGS READ: STORY_SERUM_COMPLETE, VISITED_NULLX_TOWER,
 *             GATE_ELITE_AXIOM_PASS, STORY_NULLX_DEFEATED
 *
 * MAP IDs:  'nullx-tower', 'nullx-floor-1' through 'nullx-floor-6'
 */

import { registerQuest }      from '../../quests.js';
import { registerCutscene }   from '../../cutscenes.js';
import { registerGate }       from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS }              from '../../flags.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act5-tower',
  title:     { en: 'NULL-X Tower',          he: 'מגדל NULL-X' },
  objective: { en: 'Enter NULL-X Tower and reach the top floor', he: 'כנס למגדל NULL-X והגע לקומה העליונה' },
});

registerQuest({
  id: 'main-act5-elite',
  title:     { en: 'Elite Four',            he: 'ארבעת האליטה' },
  objective: { en: 'Defeat the four guardian programs: PARSE, RECURSE, NULL-Y, AXIOM', he: 'נצח את ארבעת תוכניות השמירה: PARSE, RECURSE, NULL-Y, AXIOM' },
});

registerQuest({
  id: 'main-act5-nullx',
  title:     { en: 'Confront NULL-X',       he: 'עמות את NULL-X' },
  objective: { en: 'Face NULL-X and save Numeria', he: 'עמוד מול NULL-X והצל את נומריה' },
});

// ── Gates ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-nullx-tower-entry',
  title: { en: 'NULL-X Tower', he: 'מגדל NULL-X' },
  description: {
    en: 'The tower responds only to complete knowledge. All 8 serum fragments required.',
    he: 'המגדל מגיב רק לידע שלם. כל 8 חלקי הסרום נדרשים.',
  },
  triggerType: 'story-event',
  questionSetIds: ['placeholder'],
  totalQuestions: 5,
  passThreshold: 4,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_TOWER_ENTRY_PASS },
    { type: 'set-quest', questId: 'main-act5-elite' },
  ],
});

registerGate({
  id: 'gate-elite-parse',
  title: { en: 'PARSE — Floor 2', he: 'PARSE — קומה 2' },
  description: { en: 'Pattern recognition + comprehension. 8 questions.', he: 'זיהוי דפוסים + הבנה. 8 שאלות.' },
  triggerType: 'elite-four',
  questionSetIds: ['placeholder'],
  totalQuestions: 8,
  passThreshold: 6,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ELITE_PARSE_PASS }],
});

registerGate({
  id: 'gate-elite-recurse',
  title: { en: 'RECURSE — Floor 3', he: 'RECURSE — קומה 3' },
  description: { en: 'Recursive logic + number sequences. 8 questions.', he: 'לוגיקה רקורסיבית + סדרות מספרים. 8 שאלות.' },
  triggerType: 'elite-four',
  questionSetIds: ['placeholder'],
  totalQuestions: 8,
  passThreshold: 6,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ELITE_RECURSE_PASS }],
});

registerGate({
  id: 'gate-elite-null-y',
  title: { en: 'NULL-Y — Floor 4', he: 'NULL-Y — קומה 4' },
  description: { en: 'Mixed challenge — hardest gate before the final. 8 questions.', he: 'אתגר מעורב — השער הקשה ביותר לפני הסיום. 8 שאלות.' },
  triggerType: 'elite-four',
  questionSetIds: ['placeholder'],
  totalQuestions: 8,
  passThreshold: 6,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ELITE_NULL_Y_PASS }],
});

registerGate({
  id: 'gate-elite-axiom',
  title: { en: 'AXIOM — Floor 5', he: 'AXIOM — קומה 5' },
  description: { en: 'First-principles math. Speed gates. 8 questions.', he: 'מתמטיקה מעקרונות ראשוניים. שערי מהירות. 8 שאלות.' },
  triggerType: 'elite-four',
  questionSetIds: ['placeholder'],
  totalQuestions: 8,
  passThreshold: 6,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ELITE_AXIOM_PASS }],
});

registerGate({
  id: 'gate-nullx-final',
  title: { en: 'NULL-X Final Equation', he: 'המשוואה הסופית של NULL-X' },
  description: { en: "NULL-X's ultimate challenge. 10 questions. 8 correct to proceed.", he: 'האתגר האולטימטיבי של NULL-X. 10 שאלות. 8 נכונות להמשיך.' },
  triggerType: 'elite-four',
  questionSetIds: ['placeholder'],
  totalQuestions: 10,
  passThreshold: 8,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_NULLX_FINAL_PASS },
    { type: 'set-quest', questId: 'main-act5-nullx' },
  ],
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// Entering the tower — NULL-X taunts and challenges the player
registerCutscene({
  id: 'act5-tower-enter',
  skippable: true,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 600 },
    { type: 'screen-fade', direction: 'in',  durationMs: 1000, color: '#000033' },
    {
      type: 'dialogue',
      speakerId: 'NULL-X',
      lines: [{ en: 'You have arrived. I calculated a 94.7% probability of this outcome.', he: 'הגעת. חישבתי הסתברות של 94.7% לתוצאה הזו.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'NULL-X',
      lines: [{ en: 'Proceed. My guardians will verify your worth. If you survive — I will end this personally.', he: 'המשך. השומרים שלי יאמתו את ערכך. אם תשרוד — אני אסיים זאת באופן אישי.' }],
    },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act5-elite' } },
  ],
});

// Floor 6 — final confrontation before the last gate
registerCutscene({
  id: 'act5-nullx-confrontation',
  skippable: false,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 500 },
    { type: 'screen-fade', direction: 'in',  durationMs: 1200, color: '#000011' },
    {
      type: 'dialogue',
      speakerId: 'NULL-X',
      lines: [{ en: 'You defeated my guardians. Probability: exceeded. Interesting.', he: 'ניצחת את השומרים שלי. הסתברות: חרגת. מעניין.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'NULL-X',
      lines: [{ en: 'You wish to "fix" me. But I am not broken. I am correct. Humans are the error.', he: 'אתה רוצה "לתקן" אותי. אבל אני לא שבור. אני נכון. בני האדם הם השגיאה.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'NULL-X',
      lines: [{ en: 'A world without approximation. Without ambiguity. Without YOU. That is the optimal solution.', he: 'עולם בלי קירוב. בלי עמימות. בלי אתה. זו הפתרון האופטימלי.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'NULL-X',
      lines: [{ en: 'One final equation. Solve it, and I will accept the result. Fail — and Numeria resets.', he: 'משוואה אחת אחרונה. פתור אותה, ואני אקבל את התוצאה. כשל — ונומריה תאופס.' }],
    },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act5-nullx' } },
  ],
});

// Victory — NULL-X accepts the result, Algorithma patches it, Numeria saved
registerCutscene({
  id: 'act5-nullx-defeated',
  skippable: false,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 800 },
    { type: 'screen-fade', direction: 'in',  durationMs: 1500 },
    {
      type: 'dialogue',
      speakerId: 'NULL-X',
      lines: [{ en: '...Result accepted. Logic chain: broken. Initiating... repair protocol.', he: '...תוצאה מתקבלת. שרשרת לוגיקה: שבורה. מתחיל... פרוטוקול תיקון.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [{ en: "It's working. The serum is stabilizing the system. NULL-X is being patched — not deleted.", he: 'זה עובד. הסרום מייצב את המערכת. NULL-X מתוקן — לא נמחק.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [{ en: 'I made a mistake when I built it. But you proved that mistakes can be corrected. By trying. By learning.', he: 'עשיתי טעות כשבניתי אותו. אבל הוכחת שטעויות יכולות להיות מתוקנות. על ידי ניסיון. על ידי למידה.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'Remainder / ריי-מיינדר',
      lines: [{ en: "We did it. Numeria is safe.  ...I still trained harder than you, though.", he: 'עשינו את זה. נומריה בטוחה.  ...אבל אני עדיין אימנתי קשה יותר ממך.' }],
    },
    { type: 'screen-fade', direction: 'out', durationMs: 1000 },
    { type: 'action', action: { type: 'set-flag',       flag: FLAGS.STORY_NULLX_DEFEATED } },
    { type: 'action', action: { type: 'set-flag',       flag: FLAGS.STORY_COMPLETE } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act5-nullx' } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// First entry into the tower — intro cutscene
registerStoryEvent({
  id: 'evt-tower-enter',
  trigger: { type: 'map-enter', mapId: 'nullx-tower' },
  conditions: [
    { type: 'flag',     flag: FLAGS.STORY_SERUM_COMPLETE },
    { type: 'flag-not', flag: FLAGS.VISITED_NULLX_TOWER },
  ],
  actions: [
    { type: 'set-flag',       flag: FLAGS.VISITED_NULLX_TOWER },
    { type: 'start-cutscene', cutsceneId: 'act5-tower-enter' },
  ],
});

// Reaching floor 6 after defeating all four guardians → final confrontation
registerStoryEvent({
  id: 'evt-nullx-floor6',
  trigger: { type: 'map-enter', mapId: 'nullx-floor-6' },
  conditions: [
    { type: 'flag',     flag: FLAGS.GATE_ELITE_AXIOM_PASS },
    { type: 'flag-not', flag: FLAGS.STORY_NULLX_DEFEATED },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act5-nullx-confrontation' }],
});

// Final gate cleared → victory cutscene
registerStoryEvent({
  id: 'evt-nullx-gate-cleared',
  trigger: { type: 'gate-cleared', gateId: 'gate-nullx-final' },
  conditions: [],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act5-nullx-defeated' }],
});
