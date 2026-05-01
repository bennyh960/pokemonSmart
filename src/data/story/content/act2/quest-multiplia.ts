/**
 * ACT 2: Route 3 + Multiplia — Fake Nurse + Multiplication Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act2-multiplia, main-act2-gym3
 * GATES:    gate-route3-multiplia, gate-multiplia-gym
 *
 * STORY BEATS (in order):
 *   1. Player enters Route 3 → checkpoint gate (3 questions)
 *   2. Misty greets player in Multiplia — gives timing tip
 *   3. Player enters the Pokemon Center → Jessie disguised as Nurse Joy is revealed
 *   4. Player defeats Jessie/James → real healing restored, gym quest starts
 *   5. Player passes gym gate → defeats Mila → badge 3
 *
 * FLAGS SET: VISITED_ROUTE3, GATE_ROUTE3_PASS, VISITED_MULTIPLIA,
 *            GATE_MULTIPLIA_GYM_PASS, ACT2_MISTY_MET,
 *            ROCKET_MULTIPLIA_NURSE_REVEALED, ROCKET_MULTIPLIA_NURSE_EXPOSED,
 *            STORY_BADGE_3
 * FLAGS READ: VISITED_MULTIPLIA, ROCKET_MULTIPLIA_NURSE_REVEALED
 *
 * MAP IDs:  'route-3', 'multiplia', 'multiplia-pokecenter'
 * NPC IDs:  'misty-multiplia', 'fake-nurse-joy', 'jessie-nurse', 'james-pokecenter'
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
  id: 'main-act2-multiplia',
  title:     { en: 'Multiplia',             he: 'מולטיפליה' },
  objective: { en: 'Reach Multiplia and investigate the Pokemon Center', he: 'הגע למולטיפליה וחקור את מרכז הפוקמון' },
});

registerQuest({
  id: 'main-act2-gym3',
  title:     { en: 'Multiplia Gym',         he: 'חדר הכושר של מולטיפליה' },
  objective: { en: 'Defeat Mila at the Multiplication Gym', he: 'נצח את מילה בחדר הכושר של הכפל' },
});

// ── Gates ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-route3-multiplia',
  title: { en: 'Route 3 Checkpoint', he: 'מחסום שביל 3' },
  description: {
    en: 'The Glitch has warped the signs on this route. 3 questions to proceed.',
    he: 'הגליץ׳ עיוות את השלטים בשביל הזה. 3 שאלות כדי להמשיך.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 3,
    penaltyAmount: 100,
  },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_ROUTE3_PASS },
    { type: 'set-quest', questId: 'main-act2-multiplia' },
  ],
});

registerGate({
  id: 'gate-multiplia-gym',
  title: { en: 'Multiplication Gym', he: 'חדר הכושר של הכפל' },
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
    { type: 'set-flag', flag: FLAGS.GATE_MULTIPLIA_GYM_PASS },
    { type: 'set-quest', questId: 'main-act2-multiplia' },
  ],
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// Misty greets the player on arrival
registerCutscene({
  id: 'act2-misty-meets-player',
  skippable: true,
  steps: [
    { type: 'face-npc', npcId: 'misty-multiplia', dir: 'down' },
    {
      type: 'dialogue',
      speakerName: 'Misty / מיסטי',
      lines: [{ en: 'Oh — you made it through Route 3? Faster than I expected.', he: 'אוי — עברת את שביל 3? מהר יותר ממה שציפיתי.' }],
    },
    {
      type: 'dialogue',
      speakerName: 'Misty / מיסטי',
      lines: [{ en: "I'm here because the timing systems on the routes keep glitching. Random teleports. Missing bridges.", he: 'אני כאן כי מערכות התזמון בשבילים ממשיכות להשתגע. טלפורטים אקראיים. גשרים חסרים.' }],
    },
    {
      type: 'dialogue',
      speakerName: 'Misty / מיסטי',
      lines: [{ en: "Tip: when a gate gives you a time challenge — don't rush. Breathe. Work through it.", he: "טיפ: כשהשער נותן לך אתגר זמן — אל תמהר. נשום. עבוד דרכו." }],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT2_MISTY_MET } },
  ],
});

// Jessie unmasked in the Pokemon Center
registerCutscene({
  id: 'act2-fake-nurse-reveal',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      speakerName: 'Nurse Joy?',
      lines: [{ en: 'Welcome! Your Pokemon will be... "healed" in no time!', he: 'ברוך הבא! הפוקמונים שלך יהיו... "מרפאים" תוך זמן קצר!' }],
    },
    { type: 'wait', durationMs: 400 },
    {
      type: 'dialogue',
      speakerName: 'Nurse Joy?',
      lines: [{ en: "Hmm... something seems off. That's not the standard healing chant...", he: 'המממ... משהו נראה לא בסדר. זה לא הנוסחה הרגילה לריפוי...' }],
    },
    { type: 'screen-fade', direction: 'out', durationMs: 400 },
    { type: 'screen-fade', direction: 'in',  durationMs: 400 },
    { type: 'show-npc', npcId: 'jessie-nurse' },
    { type: 'hide-npc', npcId: 'fake-nurse-joy' },
    {
      type: 'dialogue',
      speakerName: 'Jessie / ג׳סי',
      lines: [{ en: 'Prepare for trouble! And make it... actually we skipped the motto. Give us the Pokemon!', he: 'היכנסו לצרות! ותעשו את זה... בעצם דילגנו על המוטו. תנו לנו את הפוקמונים!' }],
    },
    {
      type: 'dialogue',
      speakerName: 'James / ג׳יימס',
      lines: [{ en: 'Team Rocket never tires of a good disguise. Until it fails. Which is always.', he: 'קבוצת רוקט לעולם לא עייפת מתחפושת טובה. עד שהיא נכשלת. שזה תמיד.' }],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ROCKET_MULTIPLIA_NURSE_REVEALED } },
  ],
});

// Jessie/James defeated — real healing restored
registerCutscene({
  id: 'act2-fake-nurse-defeated',
  skippable: true,
  steps: [
    {
      type: 'dialogue',
      speakerName: 'Jessie / ג׳סי',
      lines: [{ en: "We're blasting off again! But we'll be back. Team Rocket never quits!", he: 'אנחנו ממריאים שוב! אבל נחזור. קבוצת רוקט לא מוותרת לעולם!' }],
    },
    { type: 'screen-fade', direction: 'out', durationMs: 300 },
    { type: 'hide-npc', npcId: 'jessie-nurse' },
    { type: 'hide-npc', npcId: 'james-pokecenter' },
    { type: 'screen-fade', direction: 'in',  durationMs: 500 },
    { type: 'action', action: { type: 'set-flag',  flag: FLAGS.ROCKET_MULTIPLIA_NURSE_EXPOSED } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act2-gym3' } },
    {
      type: 'dialogue',
      speakerName: 'Misty / מיסטי',
      lines: [{ en: 'I knew something was wrong here. Good work exposing them.', he: 'ידעתי שמשהו לא בסדר כאן. עבודה טובה בחשיפתם.' }],
    },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// First step onto Route 3
registerStoryEvent({
  id: 'evt-route3-enter',
  trigger: { type: 'map-enter', mapId: MapId.ROUTES_ROUTE_3 },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_ROUTE3 }],
  actions: [
    { type: 'set-flag',      flag: FLAGS.VISITED_ROUTE3 },
    { type: 'set-infection', mapId: MapId.MULTIPLIA_MULTIPLIA, value: 'medium' },
  ],
});

// First arrival in Multiplia
registerStoryEvent({
  id: 'evt-multiplia-enter',
  trigger: { type: 'map-enter', mapId: 'multiplia/multiplia' },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_MULTIPLIA }],
  actions: [
    { type: 'set-flag',      flag: FLAGS.VISITED_MULTIPLIA },
    { type: 'set-infection', mapId: MapId.MULTIPLIA_MULTIPLIA, value: 'medium' },
    { type: 'set-quest',     questId: 'main-act2-multiplia' },
  ],
});

// Misty appears on second visit (after flag is set by first arrival event)
registerStoryEvent({
  id: 'evt-misty-multiplia',
  trigger: { type: 'map-enter', mapId: 'multiplia/multiplia' },
  conditions: [
    { type: 'flag',     flag: FLAGS.VISITED_MULTIPLIA },
    { type: 'flag-not', flag: FLAGS.ACT2_MISTY_MET },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act2-misty-meets-player' }],
});

// Entering the fake Pokemon Center → Jessie reveal
registerStoryEvent({
  id: 'evt-fake-pokecenter',
  trigger: { type: 'map-enter', mapId: MapId.SHARED_FAKE_POKECENTER },
  conditions: [
    { type: 'flag-not', flag: FLAGS.ROCKET_MULTIPLIA_NURSE_REVEALED },
    { type: 'flag',     flag: FLAGS.VISITED_MULTIPLIA },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act2-fake-nurse-reveal' }],
});

// Badge 3 earned → Multiplia infection cleared → advance to Dividia
registerStoryEvent({
  id: 'evt-badge3-clears-multiplia',
  trigger: { type: 'badge-earned', badge: 3 },
  conditions: [],
  actions: [
    { type: 'set-flag',      flag: FLAGS.STORY_BADGE_3 },
    { type: 'set-infection', mapId: MapId.MULTIPLIA_MULTIPLIA, value: 'cleared' },
    { type: 'set-quest',     questId: 'main-act2-dividia' },
  ],
});
