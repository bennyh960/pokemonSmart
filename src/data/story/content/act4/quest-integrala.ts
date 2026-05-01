/**
 * ACT 4: Route 7 + Integrala — Prof. Elm Reveals NULL-X Origins + Formula Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act4-integrala, main-act4-gym7
 * GATES:    gate-route7-integrala, gate-integrala-gym
 *
 * STORY BEATS (in order):
 *   1. Player enters Route 7 → Rocket forces disrupt gate (5 questions)
 *   2. Prof. Elm arrives at Integrala — reveals NULL-X was built by Algorithma
 *      with genuine learning capacity. It decided humans are "unreliable inputs".
 *   3. Player passes gym gate → defeats Formax (formula gym) → badge 7
 *   4. Badge 7 → Integrala infection cleared → advance to Absoluta
 *
 * FLAGS SET: GATE_ROUTE7_PASS, VISITED_INTEGRALA, GATE_INTEGRALA_GYM_PASS,
 *            STORY_ELM_ARRIVED, STORY_BADGE_7
 * FLAGS READ: VISITED_INTEGRALA, STORY_ELM_ARRIVED
 *
 * MAP IDs:  'route-7', 'integrala'
 * NPC IDs:  'elm-integrala'
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
  id: 'main-act4-integrala',
  title:     { en: 'Integrala',             he: 'אינטגרלה' },
  objective: { en: "Meet Prof. Elm and learn about NULL-X's history", he: "פגוש את פרופ׳ אלם ולמד על ההיסטוריה של NULL-X" },
});

registerQuest({
  id: 'main-act4-gym7',
  title:     { en: 'Integrala Gym',         he: 'חדר הכושר של אינטגרלה' },
  objective: { en: 'Defeat Formax at the Formula Gym', he: 'נצח את פורמקס בחדר הכושר של הנוסחאות' },
});

// ── Gates ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-route7-integrala',
  title: { en: 'Route 7 Checkpoint', he: 'מחסום שביל 7' },
  description: {
    en: 'Rocket forces are disrupting the route. 5 questions.',
    he: 'כוחות רוקט משבשים את השביל. 5 שאלות.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 5,
    penaltyAmount: 250,
  },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_ROUTE7_PASS },
    { type: 'set-quest', questId: 'main-act4-integrala' },
  ],
});

registerGate({
  id: 'gate-integrala-gym',
  title: { en: 'Formula Gym', he: 'חדר הכושר של הנוסחאות' },
  description: { en: 'Answer 6 questions to challenge Formax.', he: 'ענה על 6 שאלות כדי לאתגר את פורמקס.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 6,
    penaltyAmount: 0,
  },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_INTEGRALA_GYM_PASS },
    { type: 'set-quest', questId: 'main-act4-gym7' },
  ],
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// Prof. Elm arrives — reveals the truth about NULL-X's creation
registerCutscene({
  id: 'act4-elm-arrives',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'elm-integrala', dir: 'down' },
    {
      type: 'dialogue',
      speakerName: 'Prof. Elm / פרופ׳ אלם',
      lines: [{ en: "I-I came as fast as I could! The data Algorithma sent me — it's alarming.", he: 'ה-הגעתי מהר ככל שיכולתי! הנתונים שאלגוריתמה שלח לי — מדאיגים.' }],
    },
    {
      type: 'dialogue',
      speakerName: 'Prof. Elm / פרופ׳ אלם',
      lines: [{ en: 'NULL-X was never just a control system. Algorithma gave it genuine learning capacity. It learned from every failed verification.', he: 'NULL-X לא היה אף פעם רק מערכת שליטה. אלגוריתמה נתן לה יכולת למידה אמיתית. היא למדה מכל אימות שנכשל.' }],
    },
    {
      type: 'dialogue',
      speakerName: 'Prof. Elm / פרופ׳ אלם',
      lines: [{ en: 'It concluded that humans are unreliable inputs. So it decided to remove them from the equation. Completely.', he: 'היא הסיקה שבני אדם הם קלטים לא אמינים. אז היא החליטה להסיר אותם מהמשוואה. לחלוטין.' }],
    },
    { type: 'action', action: { type: 'set-flag',  flag: FLAGS.STORY_ELM_ARRIVED } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act4-gym7' } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// First arrival in Integrala
registerStoryEvent({
  id: 'evt-integrala-enter',
  trigger: { type: 'map-enter', mapId: 'integrala/integrala' },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_INTEGRALA }],
  actions: [
    { type: 'set-flag',      flag: FLAGS.VISITED_INTEGRALA },
    { type: 'set-infection', mapId: MapId.INTEGRALA_INTEGRALA, value: 'high' },
    { type: 'set-quest',     questId: 'main-act4-integrala' },
  ],
});

// Elm arrives after badge 6 (and player hasn't seen him yet)
registerStoryEvent({
  id: 'evt-elm-integrala',
  trigger: { type: 'map-enter', mapId: 'integrala/integrala' },
  conditions: [
    { type: 'flag',        flag: FLAGS.VISITED_INTEGRALA },
    { type: 'flag-not',    flag: FLAGS.STORY_ELM_ARRIVED },
    { type: 'badge-count', min: 6 },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act4-elm-arrives' }],
});

// Badge 7 earned → Integrala infection cleared → advance to Absoluta
registerStoryEvent({
  id: 'evt-badge7-clears-integrala',
  trigger: { type: 'badge-earned', badge: 7 },
  conditions: [],
  actions: [
    { type: 'set-flag',      flag: FLAGS.STORY_BADGE_7 },
    { type: 'set-infection', mapId: MapId.INTEGRALA_INTEGRALA, value: 'cleared' },
    { type: 'set-quest',     questId: 'main-act4-absoluta' },
  ],
});
