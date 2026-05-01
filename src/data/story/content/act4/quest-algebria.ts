/**
 * ACT 4: Route 8 + Absoluta — Jessie/James Back Down + Serum Complete
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act4-absoluta, main-act4-gym8, main-act4-serum
 * GATES:    gate-route8-absoluta, gate-absoluta-gym
 *
 * STORY BEATS (in order):
 *   1. Player enters Route 8 → maximum Glitch interference gate (5 questions)
 *   2. Absoluta is Rocket-occupied — tense atmosphere
 *   3. Jessie/James try to steal the serum → Meowth talks them out of it
 *      (even Team Rocket needs a world to steal from)
 *   4. Player passes gym gate → defeats Absa (absolute value gym) → badge 8
 *   5. Badge 8 → all serum fragments assembled → Algorithma farewell
 *      → NULL-X Tower path opens → advance to Act 5
 *
 * FLAGS SET: GATE_ROUTE8_PASS, VISITED_ABSOLUTA, GATE_ABSOLUTA_GYM_PASS,
 *            ROCKET_SERUM_ATTEMPT_FAILED, STORY_BADGE_8, STORY_SERUM_COMPLETE
 * FLAGS READ: VISITED_ABSOLUTA, ROCKET_SERUM_ATTEMPT_FAILED, STORY_SERUM_COMPLETE
 *
 * MAP IDs:  'route-8', 'absoluta'
 */

import { registerQuest }      from '../../quests.js';
import { registerCutscene }   from '../../cutscenes.js';
import { registerGate }       from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS }              from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';
import { MapId } from '../../../maps/map-ids.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act4-absoluta',
  title:     { en: 'Absoluta',              he: 'אבסולוטה' },
  objective: { en: 'Fight through Rocket patrols and reach the gym', he: 'לחם דרך סיורי רוקט והגע לחדר הכושר' },
});

registerQuest({
  id: 'main-act4-gym8',
  title:     { en: 'Absoluta Gym',          he: 'חדר הכושר של אבסולוטה' },
  objective: { en: 'Defeat Absa at the Absolute Gym', he: 'נצח את אבסה בחדר הכושר של הערך המוחלט' },
});

registerQuest({
  id: 'main-act4-serum',
  title:     { en: 'Assemble the Serum',    he: 'הרכב את הסרום' },
  objective: { en: 'Assemble all 8 serum fragments to open NULL-X Tower', he: 'אסוף את כל 8 חלקי הסרום כדי לפתוח את מגדל NULL-X' },
});

// ── Gates ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-route8-absoluta',
  title: { en: 'Route 8 Checkpoint', he: 'מחסום שביל 8' },
  description: {
    en: "Maximum Glitch interference. 5 questions — don't give up.",
    he: "הפרעת גליץ׳ מקסימלית. 5 שאלות — אל תוותר.",
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 5,
    penaltyAmount: 300,
  },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_ROUTE8_PASS },
    { type: 'set-quest', questId: 'main-act4-absoluta' },
  ],
});

registerGate({
  id: 'gate-absoluta-gym',
  title: { en: 'Absolute Gym', he: 'חדר הכושר של הערך המוחלט' },
  description: { en: 'Answer 6 questions to challenge Absa.', he: 'ענה על 6 שאלות כדי לאתגר את אבסה.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 6,
    penaltyAmount: 0,
  },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_ABSOLUTA_GYM_PASS },
    { type: 'set-quest', questId: 'main-act4-gym8' },
  ],
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// Jessie/James try to steal the serum — Meowth talks them out of it
registerCutscene({
  id: 'act4-jessie-james-serum',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      speakerName: 'Jessie / ג׳סי',
      lines: [{ en: "Hand it over! The complete serum — Team Rocket's been after it for months!", he: 'תמסור אותו! הסרום המלא — קבוצת רוקט רדפה אחריו חודשים!' }],
    },
    {
      type: 'dialogue',
      speakerName: 'James / ג׳יימס',
      lines: [{ en: "Jessie... are we sure we want to give this to the boss? NULL-X will use it to delete everything, including us.", he: "ג׳סי... אנחנו בטוחים שאנחנו רוצים לתת את זה לבוס? NULL-X ישתמש בזה כדי למחוק הכל, כולל אותנו." }],
    },
    {
      type: 'dialogue',
      speakerName: 'Meowth / מיאות׳',
      lines: [{ en: "He's right, Jess. This ain't a scheme anymore. This is the end of everything. Even Team Rocket needs a world to steal from.", he: "הוא צודק, ג׳ס. זה כבר לא מזימה. זה סוף הכל. אפילו קבוצת רוקט צריכה עולם לגנוב ממנו." }],
    },
    {
      type: 'dialogue',
      speakerName: 'Jessie / ג׳סי',
      lines: [{ en: "...Fine. Fine! But this never happened. We were never here.", he: "...טוב. טוב! אבל זה מעולם לא קרה. לא היינו כאן מעולם." }],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ROCKET_SERUM_ATTEMPT_FAILED } },
  ],
});

// All badges collected — serum complete, Algorithma sends player to the Tower
registerCutscene({
  id: 'act4-serum-assembled',
  skippable: true,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 400 },
    { type: 'screen-fade', direction: 'in',  durationMs: 800 },
    {
      type: 'dialogue',
      speakerName: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [{ en: 'You did it. All 8 fragments. The serum is complete.', he: 'עשית את זה. כל 8 החלקים. הסרום שלם.' }],
    },
    {
      type: 'dialogue',
      speakerName: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [{ en: "The path to NULL-X Tower is now open. I'll stay here and support you remotely.", he: "הדרך למגדל NULL-X פתוחה עכשיו. אני אישאר כאן ואתמוך בך מרחוק." }],
    },
    {
      type: 'dialogue',
      speakerName: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [{ en: "I built NULL-X. The error in its thinking is... my responsibility. You're carrying that for me. Thank you.", he: "בניתי את NULL-X. השגיאה בחשיבתו היא... האחריות שלי. אתה נושא את זה בשבילי. תודה." }],
    },
    { type: 'action', action: { type: 'set-flag',  flag: FLAGS.STORY_SERUM_COMPLETE } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act5-tower' } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// First arrival in Absoluta
registerStoryEvent({
  id: 'evt-absoluta-enter',
  trigger: { type: 'map-enter', mapId: 'absoluta/absoluta' as MapId },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_ABSOLUTA }],
  actions: [
    { type: 'set-flag',      flag: FLAGS.VISITED_ABSOLUTA },
    { type: 'set-infection', mapId: 'absoluta/absoluta' as MapId as MapId, value: 'critical' },
    { type: 'set-quest',     questId: 'main-act4-absoluta' },
  ],
});

// Jessie/James serum attempt fires when entering Absoluta with all 8 badges
registerStoryEvent({
  id: 'evt-rocket-serum-attempt',
  trigger: { type: 'map-enter', mapId: 'absoluta/absoluta' as MapId },
  conditions: [
    { type: 'badge-count', min: 8 },
    { type: 'flag-not',    flag: FLAGS.ROCKET_SERUM_ATTEMPT_FAILED },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act4-jessie-james-serum' }],
});

// Badge 8 earned → Absoluta infection cleared + serum assembled cutscene
registerStoryEvent({
  id: 'evt-badge8-assembles-serum',
  trigger: { type: 'badge-earned', badge: 8 },
  conditions: [],
  actions: [
    { type: 'set-flag',       flag: FLAGS.STORY_BADGE_8 },
    { type: 'set-infection',  mapId: 'absoluta/absoluta' as MapId as MapId, value: 'cleared' },
    { type: 'start-cutscene', cutsceneId: 'act4-serum-assembled' },
  ],
});
