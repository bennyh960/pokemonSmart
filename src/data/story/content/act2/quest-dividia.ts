/**
 * ACT 2: Route 4 + Dividia — Remainder Glitch + Division Gym
 * ─────────────────────────────────────────────────────────────────────────────

 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';
import { MapId } from '../../../maps/map-ids.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act2-dividia',
  title: { en: 'Save Remainder', he: 'הצל את ריי-מיינדר' },
  objective: { en: 'Find Remainder at Dividia and cure the Glitch', he: 'מצא את ריי-מיינדר בדיווידיה ורפא את הגליץ׳' },
});

registerQuest({
  id: 'main-act2-gym4',
  title: { en: 'Dividia Gym', he: 'חדר הכושר של דיווידיה' },
  objective: { en: 'Defeat Divon at the Division Gym', he: 'נצח את דיבון בחדר הכושר של החילוק' },
});

// ── Gates ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-route4-dividia',
  title: { en: 'Route 4 Checkpoint', he: 'מחסום שביל 4' },
  description: {
    en: 'NULL-X interference detected. 5 questions — 3 correct to pass.',
    he: 'זוהתה הפרעה מ-NULL-X. 5 שאלות — 3 נכונות כדי לעבור.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 5,
    penaltyAmount: 150,
  },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_ROUTE4_PASS },
    { type: 'set-quest', questId: 'main-act2-dividia' },
  ],
});

registerGate({
  id: 'gate-dividia-gym',
  title: { en: 'Division Gym', he: 'חדר הכושר של החילוק' },
  description: { en: 'Answer 4 questions to enter the gym.', he: 'ענה על 4 שאלות כדי להיכנס לחדר הכושר.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 4,
    penaltyAmount: 0,
  },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_DIVIDIA_GYM_PASS },
    { type: 'set-quest', questId: 'main-act2-gym4' },
  ],
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// Brock greets the player at Dividia
registerCutscene({
  id: 'act2-brock-meets-player',
  skippable: true,
  steps: [
    { type: 'face-npc', npcId: 'brock-dividia', dir: 'down' },
    {
      type: 'dialogue',
      speakerName: 'Brock / ברוק',
      lines: [
        {
          en: 'You must be the one Algorithma told me about. Good. This city needs solid help.',
          he: 'אתה חייב להיות זה שאלגוריתמה סיפר לי עליו. טוב. העיר הזו צריכה עזרה אמינה.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Brock / ברוק',
      lines: [
        {
          en: 'Think of logic like a good stew — every ingredient has its place. Leave one out and the whole thing falls apart.',
          he: 'תחשוב על לוגיקה כמו מרק טוב — לכל מרכיב יש מקומו. השמט אחד והכל מתפרק.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT2_BROCK_MET } },
  ],
});

// Remainder's Pokemon gets infected by the Glitch
registerCutscene({
  id: 'act2-remainder-glitch',
  skippable: false,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 200 },
    { type: 'screen-fade', direction: 'in', durationMs: 600, color: '#440000' },
    {
      type: 'dialogue',
      speakerName: 'Remainder / ריי-מיינדר',
      lines: [
        {
          en: "Something is... wrong. My Pokemon — it won't listen. Its eyes are glowing red.",
          he: 'משהו... לא בסדר. הפוקמון שלי — הוא לא מציית. עיניו זוהרות אדום.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Remainder / ריי-מיינדר',
      lines: [{ en: "The Glitch. It got him. I don't know what to—", he: 'הגליץ׳. הוא תפס אותו. אני לא יודע מה ל—' }],
    },
    {
      type: 'dialogue',
      speakerName: 'Brock / ברוק',
      lines: [
        {
          en: 'Use the serum fragments! Quickly — before the infection spreads to the others!',
          he: 'השתמש בחלקי הסרום! מהר — לפני שהזיהום מתפשט לאחרים!',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.STORY_REMAINDER_GLITCHED } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.STORY_REMAINDER_INFECTED } },
  ],
});

// Player uses serum — Remainder is cured and leaves to train
registerCutscene({
  id: 'act2-remainder-saved',
  skippable: true,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 300 },
    { type: 'screen-fade', direction: 'in', durationMs: 800 },
    {
      type: 'dialogue',
      speakerName: 'Remainder / ריי-מיינדר',
      lines: [{ en: '...It worked. You used your serum. For me.', he: '...זה עבד. השתמשת בסרום שלך. בשבילי.' }],
    },
    {
      type: 'dialogue',
      speakerName: 'Remainder / ריי-מיינדר',
      lines: [
        {
          en: "I've been nothing but difficult with you. And you still helped.",
          he: 'הייתי קשה עמך בכל דבר. ועדיין עזרת.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Remainder / ריי-מיינדר',
      lines: [
        {
          en: "...I need to get stronger. I'll train and come back. Don't lose to that gym leader before I return.",
          he: '...אני צריך להתחזק. אני אאמן ואחזור. אל תפסיד לאותו מנהיג חדר כושר לפני שאחזור.',
        },
      ],
    },
    { type: 'face-npc', npcId: 'remainder-dividia', dir: 'up' },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.STORY_REMAINDER_SAVED } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.STORY_REMAINDER_CURED } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act2-gym4' } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// First arrival in Dividia
registerStoryEvent({
  id: 'evt-dividia-enter',
  trigger: { type: 'map-enter', mapId: 'dividia/dividia' },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_DIVIDIA }],
  actions: [
    { type: 'set-flag', flag: FLAGS.VISITED_DIVIDIA },
    { type: 'set-infection', mapId: MapId.DIVIDIA_DIVIDIA, value: 'medium' },
    { type: 'set-quest', questId: 'main-act2-dividia' },
  ],
});

// Brock introduction on second entry (after visited flag set)
registerStoryEvent({
  id: 'evt-brock-dividia',
  trigger: { type: 'map-enter', mapId: 'dividia/dividia' },
  conditions: [
    { type: 'flag', flag: FLAGS.VISITED_DIVIDIA },
    { type: 'flag-not', flag: FLAGS.ACT2_BROCK_MET },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act2-brock-meets-player' }],
});

// Remainder gets glitched when player has 3+ badges and re-enters Dividia
registerStoryEvent({
  id: 'evt-remainder-glitch',
  trigger: { type: 'map-enter', mapId: 'dividia/dividia' },
  conditions: [
    { type: 'flag', flag: FLAGS.VISITED_DIVIDIA },
    { type: 'flag-not', flag: FLAGS.STORY_REMAINDER_GLITCHED },
    { type: 'badge-count', min: 3 },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act2-remainder-glitch' }],
});

// Badge 4 earned → Dividia infection cleared + Remainder saved cutscene
registerStoryEvent({
  id: 'evt-badge4-clears-dividia',
  trigger: { type: 'badge-earned', badge: 4 },
  conditions: [],
  actions: [
    { type: 'set-flag', flag: FLAGS.STORY_BADGE_4 },
    { type: 'set-infection', mapId: MapId.DIVIDIA_DIVIDIA, value: 'cleared' },
    { type: 'start-cutscene', cutsceneId: 'act2-remainder-saved' },
  ],
});
