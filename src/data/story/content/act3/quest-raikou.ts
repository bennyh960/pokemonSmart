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
      lines: [{ en: '', he: 'היי מה שלומך?' }],
    },
    { type: 'dialogue', speakerName: 'Player/שחקן', lines: [{ en: '', he: "ב''ה הכל בסדר! מה איתך?" }] },
    {
      type: 'dialogue',
      speakerId: 'gym-5-fractalis',
      lines: [
        { en: '', he: 'משהו מוזר קורה ליד תחנת הכח' },
        {
          en: '',
          he: 'ראיקו! - ראיקו הפוקימון האגדי הגיע להר. ככל הנראה הוא נמשך מהתדרים שכיוונו כדי למשוך את זאפדוס',
        },
        { en: '', he: 'ראיקו גם מגיע כל כמה שנים לפרוק מתח - אבל זה לא הזמן שלו להגיע.' },
        { en: '', he: 'הוא אגרסיבי ותוקפני - אבל גם נראה שהוא נלחם במשהו' },
        { en: '', he: 'נראה שהוא גם נדבק בגליץ' },
        {
          en: '',
          he: "אצטרך את עזרתך - נעשה בדיוק כמו שעשינו לפני. אני אכוון את התדרים לגבעה - אתה תנסה לשחרר אותו מאחיזת הגליץ'",
        },
        { en: '', he: "נראה שיש עליו פריט דומה שהיה על זאפדוס - אולי זה קשור לגליץ'?" },
        { en: '', he: 'אני מחכה לך ליד תחנת הכח - תגיע בהקדם , לא יודע כמה זמן אצליח להחזיק אותו על הגבעה' },
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
  conditions: [
    { type: 'flag', flag: FLAGS.ACT3_POWER_RAIKOU_ARC_FLEE },
    { type: 'flag-not', flag: 'key-core-x4-obtained' },
  ],
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
        { en: '', he: 'עבודה טובה! התדרים הותאמו בהצלחה' },
        { en: '', he: "ראיקו נכנס לתחנה ונראה שהוא מתמודד עם הגליץ' - הוא נראה פחות אגרסיבי עכשיו" },
        { en: '', he: 'הוא הגיע לתחנה אבל הפריט שהיה עליו נעלם - ראית אותו? ' },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player/שחקן',
      lines: [
        { en: '', he: 'כן ראיתי  - זו ליבת נאל-איקס . ' },
        { en: '', he: 'אסור שידעו שהליבה אצלי - אני אסתיר אותה טוב טוב' },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'gym-5-fractalis',
      lines: [
        { en: '', he: 'אני אעדכן את לאנס - אתה תמשיך במסע שלך. שמור על פרופיל נמוך' },
        { en: '', he: 'תודה רבה על העזרה והרבה הצלחה בהמשך! מקווה שניפגש שוב. להתראות' },
      ],
    },
  ],
});
