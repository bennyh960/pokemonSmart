// Raikou part 1 start on end with zapdos
// start Flag  : act3-sym-zapdos-cave-defeated
// mid flag - ACT3_POWER_RAIKOU_ARC_FLEE - trainer-wild-r8-raikou-en1-defeated
// end flag - key-core-x4-obtained
// on map 7 exit - sir fracti call to say about raikou
// npc
// on cave-7 exsit - don shavriz call to player and invite him to same big mountain - raikou aggresive , he should not be there
// npc-gym-leader-raikou1 - same position "fix freqnecies"
// npc-1779351438659 - block gym entrance (to avoid duplicatuon of gym leader that outside)
// npc-r8-raikou-en1 - wild raikou auto walk

import { registerCutscene } from '../../cutscenes';
import { registerStoryEvent } from '../../events';
import { FLAGS } from '../../flags';
import { registerQuest } from '../../quests';

registerStoryEvent({
  id: 'evt-frac-raikou-core',
  trigger: { type: 'map-exit', mapId: 'routes/route-7-cave2' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT3_SYM_ZAPDOS_CAVE_DEFEATED },
    { type: 'flag-not', flag: FLAGS.ACT3_POWER_RAIKOU_ARC_FLEE },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act3-raikou-sirFracti-call' }],
});

registerCutscene({
  id: 'act3-raikou-sirFracti-call',
  phoneCaller: { en: 'Sir Fracti', he: 'דון שבריז' },
  steps: [
    {
      type: 'dialogue',
      speakerId: 'gym-5-fractalis',
      lines: [{ en: 'Hello , how are you?', he: 'היי מה שלומך?' }],
    },
    {
      type: 'dialogue',
      speakerName: 'Player/שחקן',
      lines: [{ en: 'I am fine, thank you! How about you?', he: "ב''ה הכל בסדר! מה איתך?" }],
    },
    {
      type: 'dialogue',
      speakerId: 'gym-5-fractalis',
      lines: [
        { en: 'Something strange is happening near the power plant.', he: 'משהו מוזר קורה ליד תחנת הכח' },
        {
          en: 'Raikou! - The legendary Pokémon Raikou has arrived at the mountain. It seems to be drawn by the frequencies we set to attract Zapdos.',
          he: 'ראיקו! - ראיקו הפוקימון האגדי הגיע להר. ככל הנראה הוא נמשך מהתדרים שכיוונו כדי למשוך את זאפדוס',
        },
        {
          en: 'Raikou also comes every few years to release energy - but this is not its time to arrive.',
          he: 'ראיקו גם מגיע כל כמה שנים לפרוק מתח - אבל זה לא הזמן שלו להגיע.',
        },
        {
          en: 'It is aggressive and hostile - but it also seems to be fighting something.',
          he: 'הוא אגרסיבי ותוקפני - אבל גם נראה שהוא נלחם במשהו',
        },
        { en: 'It also seems to be affected by the glitch.', he: 'נראה שהוא גם נדבק בגליץ' },
        {
          en: 'I will need your help - we will do exactly as we did before. I will direct the frequencies to the hill - you will try to free it from the glitch.',
          he: "אצטרך את עזרתך - נעשה בדיוק כמו שעשינו לפני. אני אכוון את התדרים לגבעה - אתה תנסה לשחרר אותו מאחיזת הגליץ'",
        },
        {
          en: 'It seems to have an item similar to the one Zapdos had - maybe it is related to the glitch?',
          he: "נראה שיש עליו פריט דומה שהיה על זאפדוס - אולי זה קשור לגליץ'?",
        },
        {
          en: "I am waiting for you near the power plant - come as soon as possible, I don't know how long I can keep it on the hill.",
          he: 'אני מחכה לך ליד תחנת הכח - תגיע בהקדם , לא יודע כמה זמן אצליח להחזיק אותו על הגבעה',
        },
      ],
    },
    { type: 'action', action: { type: 'set-quest', questId: 'quest-raikou' } },
  ],
});

registerQuest({
  id: 'quest-raikou',
  title: { en: "Raikou's Rampage", he: 'טירוף ראיקו האגדי' },
  objective: {
    en: 'Stop Raikou - the legendary Pokémon - before it destroys everything in its path!',
    he: 'עצור את ראיקו  - לפני שהוא יחריב את כל מה שבדרכו!',
  },
});

// small event to prevent wild encounter when raikou run
registerStoryEvent({
  id: 'evt-auto-repel-for-raikou',
  trigger: { type: 'flag-set', flag: FLAGS.ACT3_POWER_RAIKOU_ARC_FLEE },
  actions: [{ type: 'set-repel', steps: 100 }],
});

registerStoryEvent({
  id: 'evt-frac-raikou-core-collect',
  trigger: { type: 'flag-set', flag: 'key-core-x4-obtained' }, // key item auto flag
  conditions: [{ type: 'flag', flag: FLAGS.ACT3_POWER_RAIKOU_ARC_FLEE }],
  triggerDelayPostFlag: 1500,
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act3-raikou-sirFracti-call2' },
    { type: 'complete-quest', questId: 'quest-raikou' },
  ],
});

registerCutscene({
  id: 'act3-raikou-sirFracti-call2',
  phoneCaller: { en: 'Sir Fracti', he: 'דון שבריז' },
  steps: [
    {
      type: 'dialogue',
      speakerId: 'gym-5-fractalis',
      lines: [
        { en: 'Good job! The frequencies have been successfully adjusted.', he: 'עבודה טובה! התדרים הותאמו בהצלחה' },
        {
          en: 'Raikou has entered the station and seems to be dealing with the glitch - it looks less aggressive now.',
          he: "ראיקו נכנס לתחנה ונראה שהוא מתמודד עם הגליץ' - הוא נראה פחות אגרסיבי עכשיו",
        },
        {
          en: 'It reached the station, but the item it had is gone - did you see it?',
          he: 'הוא הגיע לתחנה אבל הפריט שהיה עליו נעלם - ראית אותו? ',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player/שחקן',
      lines: [
        { en: "Yes, I saw it - it's a NULL-X Core.", he: 'כן ראיתי  - זו ליבת נאל-איקס . ' },
        {
          en: 'They must not know the core is with me - I will hide it well.',
          he: 'אסור שידעו שהליבה אצלי - אני אסתיר אותה טוב טוב',
        },
        {
          en: "But now I already hold 2 cores - I can't risk the power plant to keep it here.",
          he: 'אבל עכשיו אני כבר מחזיק 2 ליבות - אני לא יכול לסכן את תחנת הכוח כדי לשמור אותה כאן.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'gym-5-fractalis',
      lines: [
        {
          en: 'You right ! keep it here is risky. I will update Lance - you continue your journey. Keep a low profile.',
          he: 'אתה צודק! לשמור את זה כאן מסוכן. אני אעדכן את לאנס - אתה תמשיך במסע שלך. שמור על פרופיל נמוך',
        },
        {
          en: 'Thank you very much for the help and good luck in the future! I hope we meet again. Goodbye.',
          he: 'תודה רבה על העזרה והרבה הצלחה בהמשך! מקווה שניפגש שוב. להתראות',
        },
      ],
    },
  ],
});
// const PREFIX = 'pokemon-math-adventure-save-';

//   for (let slot = 0; slot < 3; slot++) {
//     const key = PREFIX + slot;
//     const raw = localStorage.getItem(key);
//     if (!raw) continue;

//     const save = JSON.parse(raw);

//     // Reset Raikou battle (brings Raikou NPC back, hides core tile until re-defeated)
//     delete save.flags?.['trainer-wild-r8-raikou-en1-defeated'];

//     // Reset core pickup
//     delete save.items?.['core-x4'];
//     delete save.flags?.['key-core-x4-obtained'];
//     delete save.flags?.['obj-route-8-null-x-core-i-21-41-collected'];

//     // Reset story event done-flags so they can re-fire
//     delete save.flags?.['__event-done-evt-auto-repel-for-raikou'];
//     delete save.flags?.['__event-done-evt-frac-raikou-core-collect'];

//     // Undo quest completion if it ran
//     if (save.story?.completedQuestIds) {
//       save.story.completedQuestIds = save.story.completedQuestIds.filter(q => q !== 'quest-raikou');
//     }

//     localStorage.setItem(key, JSON.stringify(save));
//     console.log(`Slot ${slot}: reset.`);
//   }

//   console.log('Done. Reload the game.');
