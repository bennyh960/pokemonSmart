/**
 * ACT 0: Zeroville Intro
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act0, main-act0-starter, main-act0-explore
 * TRIGGERS: Player enters Zeroville → enters Algorithma's lab → leaves to Route 1
 *
 * STORY BEATS (in order):
 *   1. Player enters Zeroville → quest "New Adventure" starts
 *   2. Player enters Algorithma's lab → intro cutscene → starter selection scene
 *   3. Player returns to lab → Remainder reacts jealously
 *   4. Player steps onto Route 1 → Algorithma farewell → act0 complete
 *
 * FLAGS SET: ACT0_INTRO_SEEN, ACT0_REMAINDER_MET, ACT0_COMPLETE, VISITED_ZEROVILLE
 * FLAGS READ: ACT0_INTRO_SEEN, ACT0_REMAINDER_MET, ACT0_COMPLETE
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act0',
  title: { en: 'New Adventure', he: 'הרפתקה חדשה' },
  objective: { en: "Visit Prof. Algorithma's lab", he: 'בקר במעבדה של פרופ׳ אלגוריתמה' },
});

registerQuest({
  id: 'main-act0-starter',
  title: { en: 'Choose Your Partner', he: 'בחר את השותף שלך' },
  objective: { en: 'Choose your starter Pokemon', he: 'בחר את פוקמון ההתחלה שלך' },
});

registerQuest({
  id: 'main-act0-explore',
  title: { en: 'Explore Zeroville', he: 'חקור את אפסוויל' },
  objective: { en: 'Look around Zeroville and talk to people', he: 'סייר בעיר ודבר עם האנשים' },
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// registerCutscene({
//   id: 'test',
//   skippable: true,
//   steps: [
//     {
//       type: 'dialogue',
//       speakerId: 'Test Speaker',
//       lines: [{ en: 'This is a test dialogue.', he: 'זה דיאלוג בדיקה.' }],
//     },
//     { type: 'move-npc', npcId: 'rival-reminder', path: ['down', 'down'] },
//   ],
// });

registerCutscene({
  id: 'act0-intro',
  skippable: true,
  steps: [
    { type: 'screen-fade', direction: 'in', durationMs: 500 },
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: "Ah, you're here! Welcome to my lab. I'm Professor Algorithma.",
          he: 'או, הגעת! ברוך הבא למעבדה שלי. אני פרופסור אלגוריתמה.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: 'This is Numeria — a region where knowledge and Pokemon go hand in hand.',
          he: 'זוהי נומריה — אזור שבו ידע ופוקמונים הולכים יד ביד.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: "You have a rare gift — an intuition for numbers and logic. I've been waiting for someone like you.",
          he: ' שמעתי שיש לך כישרון נדיר — אינטואיציה למספרים ולוגיקה. חיכיתי למישהו כמוך.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: "Every trainer in Numeria begins their journey by choosing a partner Pokemon. It's time for you to choose yours.",
          he: 'כל מאמן בנומריה מתחיל את מסעו בבחירת פוקמון שותף. הגיע הזמן שגם אתה תבחר.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        { en: "In your journey, you'll face many challenges.", he: 'במסע שלך, תתמודד עם אתגרים רבים.' },
        {
          en: 'Some will test your knowledge. Others will test your strength.',
          he: 'חלקם יבדקו את הידע שלך. אחרים יבדקו את כוחך.',
        },
        { en: "But don't worry — you'll grow stronger with every step.", he: 'אבל אל תדאג — תתחזק עם כל צעד.' },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT0_INTRO_SEEN } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act0-starter' } },
    // Transition to starter selection scene; resumes here when done
    { type: 'start-scene', sceneId: 'STARTER_SELECT' },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act0-starter' } },
  ],
});

registerCutscene({
  id: 'act0-remainder-meets-player',
  skippable: true,
  steps: [
    { type: 'face-npc', npcId: 'remainder-lab', dir: 'down' },
    { type: 'move-npc', npcId: 'remainder-lab', path: ['left'] },
    {
      type: 'dialogue',
      speakerId: 'Remainder / ריי-מיינדר',
      lines: [
        { en: "Oh. YOU got chosen? I've been studying here for months.", he: 'או. אתה נבחרת? למדתי כאן חודשים שלמים.' },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Remainder / ריי-מיינדר',
      lines: [{ en: "Whatever. Don't expect any help from me on the road.", he: 'נו טוב. אל תצפה לעזרה ממני בדרך.' }],
    },
    { type: 'face-npc', npcId: 'remainder-lab', dir: 'up' },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT0_REMAINDER_MET } },
  ],
});

registerCutscene({
  id: 'act0-leave-zeroville',
  skippable: true,
  steps: [
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: 'Heading to Route 1 already? Good. The trainers there will sharpen your skills.',
          he: 'כבר הולך לשביל 1? טוב מאוד. תוכל לפגוש מאמנים צעירים כמוך! וללכוד פוקימונים חדשים .',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: 'Sumville is at the other end. There is a Gym there. If you are strong enough, you will be able to earn a badge. Safe travels!',
          he: 'סאמוויל נמצאת בצד השני. יש שם מכון פוקימונים . אם אתה מספיק חזק, תוכל לזכות בתג מכון. נסיעה טובה!',
        },
        {
          en: 'The best trainers who collected all the 8 badges can particpate in the Numeria League Championship! But that is a long way ahead, for now, focus on your journey.',
          he: 'המאמנים הטובים ביותר שאספו את כל 8 התגים יכולים להשתתף באליפות ליגת נומריה! אבל זה עוד דרך ארוכה, לעכשיו, תתמקד במסע שלך.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-route1' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT0_COMPLETE } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────
// registerStoryEvent({
//   id: 'start-test',
//   trigger: { type: 'map-enter', mapId: 'zeroville-house-tl' },
//   // conditions: [{ type: 'flag-not', flag: FLAGS.TEST_EVENT_SEEN }],
//   repeatable: true, // flag-not condition is the guard; cutscene sets TEST_EVENT_SEEN
//   actions: [{ type: 'start-cutscene', cutsceneId: 'test' }],
// });

// Entering Zeroville for the first time — set visit flag + start opening quest
registerStoryEvent({
  id: 'start-game',
  trigger: { type: 'map-enter', mapId: 'zeroville' },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_ZEROVILLE }],
  actions: [
    { type: 'set-flag', flag: FLAGS.VISITED_ZEROVILLE },
    { type: 'set-infection', cityId: 'zeroville', value: 'none' },
    { type: 'set-quest', questId: 'main-act0' },
  ],
});

// Entering Algorithma's lab before the intro → play intro cutscene
registerStoryEvent({
  id: 'evt-act0-intro',
  trigger: { type: 'map-enter', mapId: 'algorithma-lab' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT0_INTRO_SEEN }],
  repeatable: true, // flag-not condition is the guard; cutscene sets ACT0_INTRO_SEEN
  actions: [{ type: 'start-cutscene', cutsceneId: 'act0-intro' }],
});

// Returning to lab after starter chosen — Remainder reacts
registerStoryEvent({
  id: 'evt-act0-remainder',
  trigger: { type: 'map-enter', mapId: 'algorithma-lab' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT0_INTRO_SEEN },
    { type: 'flag-not', flag: FLAGS.ACT0_REMAINDER_MET },
  ],
  repeatable: true, // flag-not condition is the guard; cutscene sets ACT0_REMAINDER_MET
  actions: [{ type: 'start-cutscene', cutsceneId: 'act0-remainder-meets-player' }],
});

// Stepping onto Route 1 for the first time → Algorithma farewell + act0 done
registerStoryEvent({
  id: 'evt-act0-leave',
  trigger: { type: 'map-enter', mapId: 'route-1' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT0_INTRO_SEEN },
    { type: 'flag-not', flag: FLAGS.ACT0_COMPLETE },
  ],
  repeatable: true, // flag-not condition is the guard; cutscene sets ACT0_COMPLETE
  actions: [{ type: 'start-cutscene', cutsceneId: 'act0-leave-zeroville' }],
});
