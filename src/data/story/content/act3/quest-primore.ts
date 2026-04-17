/**
 * ACT 3: Route 5 + Primore — Gary Battle + Prime Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act3-primore, main-act3-gym5
 * GATES:    gate-route5-primore, gate-primore-gym
 *
 * STORY BEATS (in order):
 *   1. Player enters Route 5 → Primore outer defenses gate (5 questions)
 *   2. Gary Oak challenges the player at Primore
 *   3. Remainder returns — recovered, now an ally
 *   4. Player passes gym gate → defeats Prima → badge 5
 *   5. Badge 5 → route to Symmetrika unlocks
 *
 * FLAGS SET: GATE_ROUTE5_PASS, VISITED_PRIMORE, GATE_PRIMORE_PASS,
 *            GATE_PRIMORE_GYM_PASS, ACT3_GARY_MET, ACT3_GARY_BATTLE_DONE,
 *            STORY_REMAINDER_ALLY, STORY_REMAINDER_JOINED, STORY_BADGE_5
 * FLAGS READ: VISITED_PRIMORE, STORY_REMAINDER_SAVED, STORY_REMAINDER_ALLY
 *
 * MAP IDs:  'route-5', 'primore'
 * NPC IDs:  'gary-primore', 'remainder-primore'
 */

import { registerQuest }      from '../../quests.js';
import { registerCutscene }   from '../../cutscenes.js';
import { registerGate }       from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS }              from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act3-primore',
  title:     { en: 'Primore',              he: 'פרימור' },
  objective: { en: 'Reach Primore and find Gary Oak', he: 'הגע לפרימור ומצא את גארי אוק' },
});

registerQuest({
  id: 'main-act3-gym5',
  title:     { en: 'Primore Gym',          he: 'חדר הכושר של פרימור' },
  objective: { en: 'Defeat Prima at the Prime Gym', he: 'נצח את פרימה בחדר הכושר של מספרי הראשוניים' },
});

// ── Gates ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-route5-primore',
  title: { en: 'Route 5 Checkpoint', he: 'מחסום שביל 5' },
  description: {
    en: "Primore's outer defenses. 5 questions — 3 correct to enter.",
    he: 'ההגנות החיצוניות של פרימור. 5 שאלות — 3 נכונות כדי להיכנס.',
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
    { type: 'set-flag', flag: FLAGS.GATE_ROUTE5_PASS },
    { type: 'set-quest', questId: 'main-act3-primore' },
  ],
});

registerGate({
  id: 'gate-primore-gym',
  title: { en: 'Prime Gym', he: 'חדר הכושר של מספרים ראשוניים' },
  description: { en: 'Answer 5 questions to challenge Prima.', he: 'ענה על 5 שאלות כדי לאתגר את פרימה.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 5,
    penaltyAmount: 0,
  },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_PRIMORE_GYM_PASS },
    { type: 'set-quest', questId: 'main-act3-gym5' },
  ],
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// Gary Oak challenges the player
registerCutscene({
  id: 'act3-gary-challenge',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'gary-primore', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'Gary Oak / גארי אוק',
      lines: [{ en: "So you're the one making waves across Numeria. Interesting.", he: 'אז אתה זה שגורם לגלים ברחבי נומריה. מעניין.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'Gary Oak / גארי אוק',
      lines: [{ en: "My grandfather says you're talented. I'll believe it when I see it. Battle me.", he: 'הסבא שלי אומר שאתה מוכשר. אאמין בזה כשאראה. הלחם בי.' }],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_GARY_MET } },
  ],
});

// After Gary battle — Gary tips off about NULL-X Tower
registerCutscene({
  id: 'act3-gary-after-battle',
  skippable: true,
  steps: [
    {
      type: 'dialogue',
      speakerId: 'Gary Oak / גארי אוק',
      lines: [{ en: "Hmm. You're ranked higher than I thought. Don't let it go to your head.", he: 'המממ. הדירוג שלך גבוה יותר ממה שחשבתי. אל תתן לזה לעלות לראשך.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'Gary Oak / גארי אוק',
      lines: [{ en: "The NULL-X tower is beyond Symmetrika. Whatever's up there — be ready.", he: 'מגדל NULL-X נמצא מעבר לסימטריקה. מה שיש שם למעלה — היה מוכן.' }],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_GARY_BATTLE_DONE } },
  ],
});

// Remainder returns at Primore — now wants to be an ally
registerCutscene({
  id: 'act3-remainder-returns',
  skippable: true,
  steps: [
    { type: 'face-npc', npcId: 'remainder-primore', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'Remainder / ריי-מיינדר',
      lines: [{ en: "I'm back. And stronger. I've been training every day since Dividia.", he: 'חזרתי. וחזק יותר. אימנתי כל יום מאז דיווידיה.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'Remainder / ריי-מיינדר',
      lines: [{ en: "I'm not here to compete with you anymore. I'm here to help stop NULL-X.", he: 'אני לא כאן כדי להתחרות איתך יותר. אני כאן כדי לעזור לעצור את NULL-X.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'Remainder / ריי-מיינדר',
      lines: [{ en: "Let's go together. As partners. ...Don't make it weird.", he: 'בוא נלך ביחד. כשותפים. ...אל תהפוך את זה למוזר.' }],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.STORY_REMAINDER_ALLY } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.STORY_REMAINDER_JOINED } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// First arrival in Primore
registerStoryEvent({
  id: 'evt-primore-enter',
  trigger: { type: 'map-enter', mapId: 'primore' },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_PRIMORE }],
  actions: [
    { type: 'set-flag',      flag: FLAGS.VISITED_PRIMORE },
    { type: 'set-infection', cityId: 'primore', value: 'high' },
    { type: 'set-quest',     questId: 'main-act3-primore' },
  ],
});

// Remainder returns at Primore after badge 4 (and after being saved in Dividia)
registerStoryEvent({
  id: 'evt-remainder-returns',
  trigger: { type: 'map-enter', mapId: 'primore' },
  conditions: [
    { type: 'flag',        flag: FLAGS.STORY_REMAINDER_SAVED },
    { type: 'flag-not',    flag: FLAGS.STORY_REMAINDER_ALLY },
    { type: 'badge-count', min: 4 },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act3-remainder-returns' }],
});

// Badge 5 earned → Primore infection cleared + route to Symmetrika opens
registerStoryEvent({
  id: 'evt-badge5-clears-primore',
  trigger: { type: 'badge-earned', badge: 5 },
  conditions: [],
  actions: [
    { type: 'set-flag',      flag: FLAGS.STORY_BADGE_5 },
    { type: 'set-infection', cityId: 'primore', value: 'cleared' },
    { type: 'set-quest',     questId: 'main-act3-symmetrika' },
    { type: 'set-flag',      flag: FLAGS.GATE_PRIMORE_PASS },
  ],
});
