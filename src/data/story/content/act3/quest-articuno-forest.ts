/**
 * ACT 3: Small Forest — Chasing Articuno
 * ─────────────────────────────────────────────────────────────────────────────
 * Starts after Officer Jenny's cave quake (quest-route9.ts) opens the secret exit.
 *
 * STORY BEATS (in order):
 *   1. Enter the forest → Articuno flies from (3,66) to (21,53); low glitch infection.
 *      An invisible blocker on x=42 keeps the player in the south-west.
 *   2. Player reaches (20,54) (invisible trigger at 19,54) → Articuno flies north to (17,16).
 *      The x=42 blocker and the trigger disappear.
 *   3. 4 Rocket grunts in the north-east corridor (56–62, 8–31). Beating the last one
 *      → Alice (Elite Four) arrives, tells her story, gives TM53 Dragon Rage + supplies, leaves.
 *   4. More Rocket grunts on the way west to Articuno's room (door at 18,22).
 *   5. Articuno battle at (17,16) — flees at 80% HP or after 3 turns (whichever first) → Core X3 auto-collected.
 *   6. Alice calls → forest purified, Snorlax appears, blockers removed, Officer Jenny leaves.
 *
 * NPC IDs (routes/small forest):
 *   npc-forest-articuno-intro   hidden, flies in beat 1
 *   npc-forest-articuno-perch   waits at (21,53) until beat 2
 *   wild-forest-articuno        battle at (17,16)
 *   npc-forest-alice            hidden, beat 3
 *   sys-forest-blocker-east     invisible x=42 wall (beats 1–2)
 *   sys-forest-articuno-trigger invisible trigger at (19,54)
 *   npc-forest-scared-trainer   blocks the Route 1 path at (26,32) until the arc ends
 *   npc-forest-rocket-1..12     grunts (1–4 north-east corridor, 5–12 after Alice)
 */

import { registerCutscene } from '../../cutscenes';
import { registerStoryEvent } from '../../events';
import { FLAGS } from '../../flags';
import { registerQuest } from '../../quests';
import { MapId } from '../../../maps/map-ids';

const FOREST = MapId.ROUTES_SMALL_FOREST;

/** The 4 grunts in the north-east corridor — beating all of them brings Alice. */
const CORRIDOR_GRUNTS = ['npc-forest-rocket-1', 'npc-forest-rocket-2', 'npc-forest-rocket-3', 'npc-forest-rocket-4'];

// ── Quest ────────────────────────────────────────────────────────────────────

registerQuest({
  id: 'quest-forest-articuno',
  title: { en: 'Chase Articuno', he: 'במרדף אחרי ארטיקונו' },
  objective: {
    en: 'Follow Articuno through the forest',
    he: 'עקוב אחרי ארטיקונו ביער',
  },
});

// ── Beat 1: entering the forest ─────────────────────────────────────────────

registerStoryEvent({
  id: 'evt-forest-articuno-intro',
  trigger: { type: 'map-enter', mapId: FOREST },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT3_R9_CAVE_QUAKE },
    { type: 'flag-not', flag: FLAGS.ACT3_FOREST_ARTICUNO_SEEN },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-forest-articuno-intro' }],
});

registerCutscene({
  id: 'cutscene-forest-articuno-intro',
  steps: [
    { type: 'wait', durationMs: 300 },
    { type: 'show-npc', npcId: 'npc-forest-articuno-intro' },
    { type: 'play-sfx', sfxId: 'alert' },
    {
      type: 'move-npc',
      npcId: 'npc-forest-articuno-intro',
      // Only the on-screen part of the flight to (21,53) — the perch NPC there appears by flag
      path: [...Array<'up'>(6).fill('up'), ...Array<'right'>(8).fill('right')],
    },
    { type: 'hide-npc', npcId: 'npc-forest-articuno-intro' },
    {
      type: 'dialogue',
      speakerName: 'Player/שחקן',
      lines: [
        { en: 'Articuno! It flew deeper into the forest.', he: 'ארטיקונו! הוא עף לעומק היער.' },
        {
          en: 'The air here feels... glitchy. I have to follow it.',
          he: 'האוויר פה מרגיש... משובש. אני חייב לעקוב אחריו.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-infection', mapId: FOREST, value: 'low' } },
    { type: 'action', action: { type: 'complete-quest', questId: 'quest-r9-search-rocket' } },
    { type: 'action', action: { type: 'set-quest', questId: 'quest-forest-articuno' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_FOREST_ARTICUNO_SEEN } },
  ],
});

// ── Beat 2: Articuno flies north ────────────────────────────────────────────

registerStoryEvent({
  id: 'evt-forest-articuno-flies-north',
  trigger: { type: 'npc-interact', npcId: 'sys-forest-articuno-trigger' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT3_FOREST_ARTICUNO_FLEW_NORTH }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-forest-articuno-flies-north' }],
});

registerCutscene({
  id: 'cutscene-forest-articuno-flies-north',
  steps: [
    { type: 'face-npc', npcId: 'npc-forest-articuno-perch', dir: 'up' },
    { type: 'play-sfx', sfxId: 'alert' },
    {
      type: 'move-npc',
      npcId: 'npc-forest-articuno-perch',
      // Only the on-screen part of the flight north — the battle NPC at (17,16) appears by flag
      path: Array<'up'>(7).fill('up'),
    },
    { type: 'hide-npc', npcId: 'npc-forest-articuno-perch' },
    {
      type: 'dialogue',
      speakerName: 'Player/שחקן',
      lines: [
        {
          en: 'It got away again — it flew to the far north of the forest.',
          he: 'הוא שוב ברח - הוא עף לצפון הרחוק של היער.',
        },
        { en: 'I need to find another way around.', he: 'אני צריך למצוא דרך אחרת להגיע לשם.' },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_FOREST_ARTICUNO_FLEW_NORTH } },
  ],
});

// ── Beat 3: last corridor grunt beaten → Alice arrives ──────────────────────

for (const gruntId of CORRIDOR_GRUNTS) {
  registerStoryEvent({
    id: `evt-forest-alice-after-${gruntId}`,
    trigger: { type: 'trainer-defeated', trainerId: gruntId },
    conditions: [
      ...CORRIDOR_GRUNTS.map((id) => ({ type: 'flag' as const, flag: `trainer-${id}-defeated` })),
      { type: 'flag-not', flag: FLAGS.ACT3_FOREST_ALICE_MET },
    ],
    actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-forest-alice' }],
  });
}

registerCutscene({
  id: 'cutscene-forest-alice',
  steps: [
    { type: 'wait', durationMs: 400 },
    { type: 'show-npc', npcId: 'npc-forest-alice' },
    {
      type: 'move-npc',
      npcId: 'npc-forest-alice',
      path: [...Array<'right'>(6).fill('right'), 'down', 'down', 'down', 'down'],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-forest-alice',
      lines: [
        {
          en: "So you're the one who beat those Rocket grunts? Impressive.",
          he: 'אז אתה זה שניצח את חיילי הרוקט האלה? מרשים.',
        },
        {
          en: "I'm Alice, of the Elite Four. I heard voices and came to check.",
          he: 'אני אליס, מארבעת האליטה. שמעתי קולות ובאתי לבדוק.',
        },
        {
          en: 'This forest is usually so peaceful... but it was full of Team Rocket. I defeated many of them.',
          he: 'היער הזה בדרך כלל כל כך שליו... אבל הוא היה מלא בצוות רוקט. ניצחתי הרבה מהם.',
        },
        {
          en: "Then Articuno swooped in and attacked me before I was ready. It's not acting like itself.",
          he: 'ואז ארטיקונו צלל ותקף אותי לפני שהייתי מוכנה. הוא לא מתנהג כמו עצמו.',
        },
        { en: "You'll need strength to face it. Take these.", he: 'תצטרך כוח כדי להתמודד מולו. קח את אלה.' },
      ],
    },
    { type: 'action', action: { type: 'give-item', itemId: 'tm53', quantity: 1 } },
    { type: 'action', action: { type: 'give-item', itemId: 'max-repel', quantity: 3 } },
    { type: 'action', action: { type: 'give-item', itemId: 'super-potion', quantity: 5 } },
    { type: 'action', action: { type: 'give-item', itemId: 'hyper-potion', quantity: 2 } },
    { type: 'action', action: { type: 'give-item', itemId: 'max-revive', quantity: 1 } },
    { type: 'action', action: { type: 'give-item', itemId: 'great-ball', quantity: 10 } },
    { type: 'action', action: { type: 'give-item', itemId: 'ultra-ball', quantity: 3 } },
    { type: 'play-sfx', sfxId: 'item-found' },
    {
      type: 'dialogue',
      speakerName: '...',
      lines: [
        {
          en: 'Received TM53 Dragon Rage, 3 Max Repels, 5 Super Potions, 2 Hyper Potions, a Max Revive, 10 Great Balls and 3 Ultra Balls!',
          he: 'קיבלת TM53 זעם הדרקון, 3 מקס רפל, 5 סופר שיקוי, 2 היפר שיקוי, מקס החייאה, 10 גרייט בול ו-3 אולטרה בול!',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-forest-alice',
      lines: [
        {
          en: "I'm still searching for Articuno. Let's split up — we'll cover more ground.",
          he: 'אני עדיין מחפשת את ארטיקונו. בוא ניפרד - ככה נכסה יותר שטח.',
        },
        { en: 'Be careful. More Rocket grunts are hiding to the west.', he: 'תיזהר. עוד חיילי רוקט מסתתרים במערב.' },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'npc-forest-alice',
      path: ['up', 'up', ...Array<'left'>(8).fill('left')],
    },
    { type: 'hide-npc', npcId: 'npc-forest-alice' },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_FOREST_ALICE_MET } },
  ],
});

// ── Beat 5: Articuno flees → Core X3 ────────────────────────────────────────

// Fleeing a wild NPC fires 'trainer-defeated' (battle_scene sets FLAGS.ACT3_FOREST_ARTICUNO_FLED too)
registerStoryEvent({
  id: 'evt-forest-articuno-fled',
  trigger: { type: 'trainer-defeated', trainerId: 'wild-forest-articuno' },
  actions: [
    { type: 'give-item', itemId: 'core-x3', quantity: 1 },
    { type: 'start-cutscene', cutsceneId: 'cutscene-forest-core-drop' },
  ],
});

registerCutscene({
  id: 'cutscene-forest-core-drop',
  steps: [
    { type: 'play-sfx', sfxId: 'item-found' },
    {
      type: 'dialogue',
      speakerName: '...',
      lines: [
        {
          en: 'Articuno fled... and dropped NULL-X Core X3! You picked it up.',
          he: 'ארטיקונו ברח... והפיל את ליבת נאל-איקס X3! אספת אותה.',
        },
      ],
    },
  ],
});

// Core X3 key flag (set by give-item) → Alice calls, like Raikou's Core X2 call
registerStoryEvent({
  id: 'evt-forest-alice-call',
  trigger: { type: 'flag-set', flag: 'key-core-x3-obtained' },
  conditions: [{ type: 'flag', flag: FLAGS.ACT3_FOREST_ARTICUNO_FLED }],
  triggerDelayPostFlag: 2,
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-forest-alice-call' }],
});

// ── Beat 6: Alice calls → forest purified ───────────────────────────────────

registerCutscene({
  id: 'cutscene-forest-alice-call',
  phoneCaller: { en: 'Alice', he: 'אליס' },
  steps: [
    {
      type: 'dialogue',
      speakerId: 'alice',
      lines: [
        {
          en: 'I saw Articuno fly out of the forest! Did you fight it?',
          he: 'ראיתי את ארטיקונו עף מחוץ ליער! נלחמת בו?',
        },
        {
          en: "It's heading toward the distant islands. I'll go after it.",
          he: 'הוא בדרך לאיים הרחוקים. אני ארדוף אחריו.',
        },
        { en: 'The glitch is fading — the forest feels calm again.', he: 'הגליץ׳ נעלם - היער מרגיש שוב רגוע.' },
        {
          en: 'Take your time here. Rare Pokémon love this forest — keep an eye out!',
          he: 'אל תמהר. פוקימונים נדירים אוהבים את היער הזה - תפקח עיניים!',
        },
        {
          en: 'Rumor says a baby Dratini hides by the water, and a tiny Larvitar was seen near the rocks. Maybe even a Lapras!',
          he: 'שמעתי שדרטיני קטן מסתתר ליד המים, ולרביטאר זעיר נראה ליד הסלעים. אולי אפילו לאפראס!',
        },
        {
          en: "Oh! And the big news: the glitch kept a Snorlax asleep for days. Now it's AWAKE — and very hungry!",
          he: 'אה! והחדשה הגדולה: הגליץ׳ הרדים סנורלקס במשך ימים. עכשיו הוא ער - ורעב מאוד!',
        },
        {
          en: "It's stomping around the north side of the forest looking for snacks. Say hi — but watch your lunchbox!",
          he: 'הוא מסתובב בצפון היער ומחפש חטיפים. תגיד לו שלום - אבל תשמור על הסנדוויץ׳ שלך!',
        },
        {
          en: 'Fun fact: a Snorlax eats about 400 kg of food a day. It gobbles so fast, its tummy never knows when to stop!',
          he: 'עובדה מעניינת: סנורלקס אוכל בערך 400 ק״ג אוכל ביום. הוא בולע כל כך מהר, שהבטן שלו לא יודעת מתי לעצור!',
        },
        {
          en: 'Same goes for us: your brain needs about 20 minutes to feel full. Eat slowly, and lots of fruit and veggies — not like Snorlax!',
          he: 'גם אצלנו זה ככה: למוח לוקח בערך 20 דקות להרגיש שובע. תאכל לאט, והרבה פירות וירקות - לא כמו סנורלקס!',
        },
        {
          en: 'If you can catch it, check its paws — it may be holding some Leftovers!',
          he: 'אם תצליח לתפוס אותו, תבדוק מה יש לו בכפות - אולי הוא מחזיק שאריות מזון!',
        },
        {
          en: 'And if you want a shortcut to Percentile City, you can surf up the river to Zeroville. I think it is closer...',
          he: 'אגב אם אתה רוצה קיצור דרך לפרסנטייל , תמשיך במעלה הזרם ותגיע לזירוויל , שם תוכל להמשיך דרך שביל 10',
        },
      ],
    },
    { type: 'action', action: { type: 'set-infection', mapId: FOREST, value: 'cleared' } },
    { type: 'action', action: { type: 'complete-quest', questId: 'quest-forest-articuno' } },
    { type: 'action', action: { type: 'set-quest', questId: 'quest-go-percentile' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_ARTICUNO_ARC_COMPLETE } },
  ],
});

// ── After the arc: the glitch spreads everywhere else ───────────────────────
// Runs on the next map load after the arc ends (also catches saves that finished it earlier).
// Every map goes to at least 'high' — one below critical; the purified forest stays clean.
registerStoryEvent({
  id: 'evt-glitch-spread-after-articuno',
  trigger: { type: 'map-enter', mapId: '*' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT3_ARTICUNO_ARC_COMPLETE },
    { type: 'flag-not', flag: FLAGS.ACT3_GLITCH_SPREAD },
  ],
  actions: [
    { type: 'spread-infection', value: 'high', except: [FOREST] },
    { type: 'set-flag', flag: FLAGS.ACT3_GLITCH_SPREAD },
  ],
});
