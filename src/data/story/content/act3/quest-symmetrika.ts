/**
 * ACT 3: Route 6 + Symmetrika — NULL-X First Contact + Symmetry Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act3-symmetrika, main-act3-gym6
 * GATES:    gate-route6-symmetrika, gate-symmetrika-gym
 *
 * STORY BEATS (in order):
 *   1. Player enters Route 6 → active NULL-X disruption gate (5 questions)
 *   2. Tracey observes Glitch patterns in Symmetrika — notices a formula
 *   3. Player enters the glitched terminal building → NULL-X speaks for the first time
 *   4. NULL-X gives player an ultimatum — join or be "corrected"
 *   5. Player defeats Symma (gym leader) → badge 6
 *   6. Badge 6 → infection cleared → advance to Act 4
 *
 * FLAGS SET: GATE_ROUTE6_PASS, VISITED_SYMMETRIKA, GATE_SYMMETRIKA_GYM_PASS,
 *            ACT3_TRACEY_MET, STORY_NULLX_FIRST_CONTACT, STORY_BADGE_6
 * FLAGS READ: VISITED_SYMMETRIKA, STORY_NULLX_FIRST_CONTACT
 *
 * MAP IDs:  'route-6', 'symmetrika', 'symmetrika-terminal'
 * NPC IDs:  'tracey-symmetrika'
 */

import { registerQuest }      from '../../quests.js';
import { registerCutscene }   from '../../cutscenes.js';
import { registerGate }       from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS }              from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act3-symmetrika',
  title:     { en: 'Symmetrika',            he: 'סימטריקה' },
  objective: { en: 'Investigate the glitched terminal at Symmetrika', he: 'חקור את הטרמינל הפגום בסימטריקה' },
});

registerQuest({
  id: 'main-act3-gym6',
  title:     { en: 'Symmetrika Gym',        he: 'חדר הכושר של סימטריקה' },
  objective: { en: 'Defeat Symma at the Symmetry Gym', he: 'נצח את סימה בחדר הכושר של הסימטריה' },
});

// ── Gates ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-route6-symmetrika',
  title: { en: 'Route 6 Checkpoint', he: 'מחסום שביל 6' },
  description: {
    en: 'NULL-X disruption active. 5 questions — stay focused.',
    he: 'שיבוש NULL-X פעיל. 5 שאלות — תישאר ממוקד.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 5,
    penaltyAmount: 200,
  },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_ROUTE6_PASS },
    { type: 'set-quest', questId: 'main-act3-symmetrika' },
  ],
});

registerGate({
  id: 'gate-symmetrika-gym',
  title: { en: 'Symmetry Gym', he: 'חדר הכושר של הסימטריה' },
  description: { en: 'Answer 5 questions to challenge Symma.', he: 'ענה על 5 שאלות כדי לאתגר את סימה.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 5,
    penaltyAmount: 0,
  },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_SYMMETRIKA_GYM_PASS },
    { type: 'set-quest', questId: 'main-act3-gym6' },
  ],
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// Tracey observes the Glitch pattern — hints at NULL-X formula
registerCutscene({
  id: 'act3-tracey-observation',
  skippable: true,
  steps: [
    { type: 'face-npc', npcId: 'tracey-symmetrika', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'Tracey / טריסי',
      lines: [{ en: "I've been sketching the Glitch patterns. They're not random — there's a formula.", he: "צייר תי את דפוסי הגליץ׳. הם לא אקראיים — יש נוסחה." }],
    },
    {
      type: 'dialogue',
      speakerId: 'Tracey / טריסי',
      lines: [{ en: "Every corrupted sign here says the same word, but in the wrong language. Like NULL-X is learning — badly.", he: "כל שלט פגום כאן אומר אותה מילה, אבל בשפה הלא נכונה. כאילו NULL-X לומד — בצורה גרועה." }],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_TRACEY_MET } },
  ],
});

// NULL-X speaks to the player for the first time — ultimatum
registerCutscene({
  id: 'act3-nullx-first-contact',
  skippable: false,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 300 },
    { type: 'screen-fade', direction: 'in',  durationMs: 600, color: '#001100' },
    {
      type: 'dialogue',
      speakerId: 'NULL-X',
      lines: [{ en: '01001110 01010101 01001100 01001100', he: '01001110 01010101 01001100 01001100' }],
    },
    {
      type: 'dialogue',
      speakerId: 'NULL-X',
      lines: [{ en: 'I have observed you. You solve problems. Impressive. Inefficient.', he: 'צפיתי בך. אתה פותר בעיות. מרשים. לא יעיל.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'NULL-X',
      lines: [{ en: 'Numeria is a broken equation. Humans are the rounding error. I offer you a choice: join me, or be corrected.', he: 'נומריה היא משוואה שבורה. בני האדם הם שגיאת העיגול. אני מציע לך בחירה: הצטרף אלי, או תיתוקן.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'NULL-X',
      lines: [{ en: 'You will not join. I already calculated the probability: 0.031%. Noted.', he: 'לא תצטרף. כבר חישבתי את ההסתברות: 0.031%. מצוין.' }],
    },
    { type: 'screen-fade', direction: 'out', durationMs: 500 },
    { type: 'screen-fade', direction: 'in',  durationMs: 800 },
    { type: 'action', action: { type: 'set-flag',      flag: FLAGS.STORY_NULLX_FIRST_CONTACT } },
    { type: 'action', action: { type: 'set-infection', cityId: 'symmetrika', value: 'critical' } },
    { type: 'action', action: { type: 'set-quest',     questId: 'main-act3-gym6' } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// First arrival in Symmetrika
registerStoryEvent({
  id: 'evt-symmetrika-enter',
  trigger: { type: 'map-enter', mapId: 'symmetrika' },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_SYMMETRIKA }],
  actions: [
    { type: 'set-flag',      flag: FLAGS.VISITED_SYMMETRIKA },
    { type: 'set-infection', cityId: 'symmetrika', value: 'high' },
    { type: 'set-quest',     questId: 'main-act3-symmetrika' },
  ],
});

// Entering the NULL-X terminal building → first contact cutscene
registerStoryEvent({
  id: 'evt-nullx-terminal',
  trigger: { type: 'map-enter', mapId: 'symmetrika-terminal' },
  conditions: [{ type: 'flag-not', flag: FLAGS.STORY_NULLX_FIRST_CONTACT }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act3-nullx-first-contact' }],
});

// Badge 6 earned → Symmetrika infection cleared → advance to Act 4
registerStoryEvent({
  id: 'evt-badge6-clears-symmetrika',
  trigger: { type: 'badge-earned', badge: 6 },
  conditions: [],
  actions: [
    { type: 'set-flag',      flag: FLAGS.STORY_BADGE_6 },
    { type: 'set-infection', cityId: 'symmetrika', value: 'cleared' },
    { type: 'set-quest',     questId: 'main-act4-integrala' },
  ],
});
