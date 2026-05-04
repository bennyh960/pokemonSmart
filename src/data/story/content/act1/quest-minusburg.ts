/**
 * ACT 1: Minusburg — Investigation & Subtraction Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * Story beats:
 *  1. Player arrives → city empty, residents hide inside houses.
 *  2. Player goes to gym → cop at door says CLOSED (Team Rocket terror).
 *    ** meanwhile the coords where Gary and minessa is blocked by other grunts and a trainer cry for been atk - those wile dispaere when the player start cutscne
 *  3. Player talks to scared townsfolk (ambient NPC dialogue on map).
 *  4. ENCOUNTER: Player enters the eastern zone → Gary Oak + Minessa are
 *     face-to-face with Rocket grunts. Cutscene: intros, terror + NULL-X
 *     explained, player asked to clear the 10 grunts along the path.
 *     gary-oak-mb-1 + minessa-mb-1 DESPAWN (hidden in cutscene).
 *     gary-oak-mb-2 + minessa-mb-2 SPAWN near far end of path.
 *  5. Player defeats all 10 Team Rocket grunts (rocket-mb-1 … rocket-mb-10).
 *  6. FINALE: Officer Jenny walks in → city cleared. Minessa thanks player,
 *     says she's waiting in the gym. Gary gives NULL-X lore + items.
 *     blocker-mb spawns at path entry. Jenny + Minessa walk offscreen and hide.
 *     Gary stays in place.
 *  7. Gary despawns when player enters the gym OR earns Badge 2.
 *  8. Badge 2 → Prof. Algorithma congratulations phone call.
 *
 *  rocket-mb-1 … 10  — overworld battlable, despawnOnDefeat: true
 *
 * NPC placement IDs (full table at bottom of file):
 *   cop-gym-mb        cop blocking gym door
 *   gary-oak-mb-1     Gary at encounter spot (despawnAfter MINUSBURG_GARY_MET)
 *   minessa-mb-1      Minessa at encounter spot (despawnAfter MINUSBURG_GARY_MET)
 *   gary-oak-mb-2     Gary near path end (spawnAfter MINUSBURG_GARY_MET)
 *   minessa-mb-2      Minessa near path end (spawnAfter MINUSBURG_GARY_MET)
 *   jenny-mb          Officer Jenny (spawns for finale, walks off and hides)
 *   blocker-mb        path blocker (spawnAfter MINUSBURG_BLOCKER_PLACED)
 *   rocket-mb-1..10   Team Rocket grunts, despawnOnDefeat: true
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { registerGate } from '../../gates.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';
import { ITEM_GAME_DATA } from '../../../item-defs.js';
import { MapId } from '../../../maps/map-ids.js';

registerGate({
  id: 'gate-route2-minusburg',
  title: { en: 'Minusburg Checkpoint', he: 'מחסום מינוסבורג' },
  description: {
    en: "Please identify yourself. This city is already infected by NULL-X and we can't risk letting more infected trainers in. Please answer the questions to prove you are not infected.",
    he: 'אנא זהה את עצמך. העיר הזו כבר נגועה ב-NULL-X ואנחנו לא יכולים לסכן את הכניסה של מאמנים נגועים נוספים. אנא ענה על השאלות כדי להוכיח שאינך נגוע.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['-'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 6,
    inputQuestions: { count: 2, types: ['-'] },
    penaltyAmount: 150,
    // timeLimitPerQuestion: 30,
  },
  reopenCooldownMs: 15 * 60 * 1000,
});
registerGate({
  id: 'gate-minusburg-exit-right',
  title: { en: 'Minusburg Checkpoint', he: 'מחסום מינוסבורג' },
  description: {
    en: 'Finally leaving Minusburg? Be sure to answer these questions to prove you are not infected before you go. The last thing we need is for NULL-X to spread to other cities.',
    he: ' סוף סוף עוזב את מינוסבורג? ודא שאתה עונה על השאלות האלה כדי להוכיח שאינך נגוע לפני שאתה הולך. הדבר האחרון שאנחנו צריכים זה ש-NULL-X יתפשט לערים אחרות.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['-'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 8,
    inputQuestions: { count: 3, types: ['-', '×'] },
    penaltyAmount: 150,
    // timeLimitPerQuestion: 30,
  },
  reopenCooldownMs: 15 * 60 * 1000,
});

//#region Quests ─────────────────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act1-minusburg',
  title: { en: 'Something Is Wrong', he: 'משהו לא בסדר' },
  objective: {
    en: 'Investigate Minusburg — the streets feel too quiet',
    he: 'חקור את מינוסבורג — הרחובות נראים שקטים מדי',
  },
});
registerQuest({
  id: 'main-act1-minusburg-search-minnessa',
  title: { en: 'Find Minessa', he: 'מצא את מינסה' },
  objective: {
    en: 'Search the city and find Minessa, the Subtraction Gym leader',
    he: 'חפש בעיר ומצא את מינסה, מנהיגת מכון החיסור',
  },
});

registerQuest({
  id: 'main-act1-rocket-hunt',
  title: { en: 'Drive Out Team Rocket', he: 'גרש את צוות רוקט' },
  objective: {
    en: 'Defeat all 10 Team Rocket grunts blocking the eastern path',
    he: 'נצח את כל 10 הסןכנים של צוות רוקט החוסמים את הנתיב המזרחי',
  },
});

registerQuest({
  id: 'main-act1-gym2',
  title: { en: 'Minusburg Gym', he: 'מכון מינוסבורג' },
  objective: {
    en: 'Defeat Minessa at the Subtraction Gym and earn Badge 2',
    he: 'נצח את מינסה במכון החיסור וזכה בתג 2',
  },
});
registerQuest({
  id: 'main-act1-search-prof-ben',
  title: { en: 'Find Professor Ben', he: 'מצא את פרופסור בן' },
  objective: {
    en: 'Search for Professor Ben in Minusburg',
    he: 'חפש את פרופסור בן במינוסבורג',
  },
});
registerQuest({
  id: 'main-act1-met-prof-algo-in-sumvile',
  title: { en: 'Meet Professor Algorithma in Sumvile', he: 'פגוש את פרופסור אלגוריתמה בסומוויל' },
  objective: {
    en: 'Meet Professor Algorithma in Sumvile',
    he: 'פגוש את פרופסור אלגוריתמה בסומוויל',
  },
});

//#endregion

//#region Cutscenes ─────────────────────────────────────────────────────────────────

// ── Beat 1: Arrival — empty city atmosphere ────────────────────────────────────
registerCutscene({
  id: 'act1-minusburg-arrival',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      speakerName: 'Myself / אתה חושב לעצמך',
      lines: [
        {
          en: 'Minusburg — the City of Subtraction.',
          he: 'מינוסבורג — עיר החיסור.',
        },
        {
          en: 'The streets are completely empty. No trainers outside, no children. Just the sound of the wind.',
          he: 'הרחובות ריקים לחלוטין. אין מאמנים, אין ילדים. רק קול הרוח.',
        },
        {
          en: 'Curtains twitch in house windows — people are watching. But nobody comes out.',
          he: 'וילונות זזים בחלונות הבתים — אנשים מציצים. אבל אף אחד לא יוצא.',
        },
        {
          en: "Something happened here. Let's find out what.",
          he: 'משהו קרה כאן. בוא נגלה מה.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-minusburg' } },
  ],
});

// ── Beat 4: ENCOUNTER — Gary Oak + Minessa facing Rocket grunts ───────────────
// Triggered when player enters zone-minusburg-east (zone trigger on map).
// gary-oak-mb-1 and minessa-mb-1 are hidden at the end of this cutscene.
// gary-oak-mb-2 and minessa-mb-2 spawn via spawnAfter: MINUSBURG_GARY_MET on map.
registerCutscene({
  id: 'act1-minusburg-gary-intro',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'gary-oak-mb', dir: 'down' },

    {
      type: 'dialogue',
      speakerName: 'Gary Oak / גארי אוק',
      lines: [
        {
          en: "Heh — another one shows up. I'm Gary Oak. You've heard of my grandfather, Professor Oak? Of course you have.",
          he: 'היי אני גארי אוק. הנכד של פרופסור אוק  .',
        },
        {
          en: 'Gramps sent me here to keep an eye on things. Turns out Team Rocket decided this city is their personal playground.',
          he: 'סבא שלח אותי לכאן לשמור על הסדר. מתברר שצוות רוקט החליט שהעיר הזו היא מגרש המשחקים הפרטי שלהם.',
        },
      ],
    },
    { type: 'face-npc', npcId: 'npc-1776761882211', dir: 'down' },
    {
      type: 'dialogue',
      speakerName: 'Minessa / מינסה',
      lines: [
        {
          en: "I'm Minessa — leader of the Subtraction Gym. I've watched them steal Pokemon from terrified trainers.",
          he: 'אני מינסה — מנהיגת מכון החיסור. צפיתי בהם גונבים פוקימונים ממאמנים מפוחדים  .',
        },
        { en: 'Finally I found them ! its time to end this!', he: 'סוף סוף מצאתי אותם! הגיע הזמן לסיים את זה!' },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Gary Oak / גארי אוק',
      lines: [
        {
          en: "Team Rocket grunts are dug in along this eastern path. They've blocked the whole district.",
          he: 'הסוכנים של צוות רוקט מבוצרים לאורך הנתיב המזרחי הזה. הם חסמו את כל הרובע.',
        },
        {
          en: "Here's what I find interesting — their movements are too organised for regular Rockets. Gramps thinks NULL-X is feeding them tactical data.",
          he: 'מה שמעניין אותי — המהלכים שלהם מאורגנים מדי לרוקטים רגילים. סבא חושב ש-NULL-X מאכיל אותם בנתוני טקטיקה.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Minessa / מינסה',
      lines: [
        {
          en: 'NULL-X is an AI that has been corrupting Pokemon data across all of Numeria. It feeds on fear and confusion — this city is exactly what it wants.',
          he: 'NULL-X הוא בינה מלאכותית המשחיתה נתוני פוקימונים ברחבי נומריה. הוא ניזון מפחד ובלבול — העיר הזו היא בדיוק מה שהוא רוצה.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Gary Oak / גארי אוק',
      lines: [
        {
          en: 'Ok untill the police will arrive I think its our respnsobolty to stop them from hurting more people',
          he: 'טוב עד שהמשטרה תגיע אני חושב שזה אחריותנו למנוע מהם לפגוע בעוד אנשים',
        },
        {
          en: 'We need to clear them out of here. Can you take care of the grunts along this path?',
          he: 'אנחנו צריכים לפנות אותם מכאן. אתה יכול לעזור לטפל בסוכנים לאורך הנתיב הזה?',
        },
        {
          en: "Let's battle them all and show NULL-X that this city isn't its playground!",
          he: 'בוא נלחם בכל הסוכנים האלה ונראה ל-NULL-X שהעיר הזו לא מגרש המשחקים שלו!',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Minessa / מינסה',
      lines: [
        {
          en: 'Sound like a plan. Be careful — these grunts are more aggressive than usual. NULL-X is probably pumping them full of bad data to make them stronger.',
          he: 'נשמע כמו תוכנית. היזהר — הסוכנים האלה יותר תוקפניים מהרגיל. NULL-X כנראה מזין אותם בנתונים רעים כדי לחזק אותם.',
        },
      ],
    },
    // { type: 'move-npc', npcId: 'gary-oak-mb-1', path: ['up', 'up', 'left', 'left', 'left'], waitForComplete: true },
    // { type: 'move-npc', npcId: 'minessa-mb-1', path: ['up', 'up', 'left', 'left', 'left'], waitForComplete: true },
    // { type: 'move-npc', npcId: 'rocket-mb-11', path: ['up', 'up', 'down'], waitForComplete: true },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.MINUSBURG_GARY_MET } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act1-minusburg-search-minnessa' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-rocket-hunt' } },
  ],
});

// ── Beat 6: FINALE — city liberated, Gary gives items, blocker spawns ─────────
registerCutscene({
  id: 'act1-minusburg-rockets-cleared',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      speakerName: 'Officer Jenny / שוטרת ג׳ני',
      lines: [
        {
          en: 'All Rocket signatures cleared from my scanner. Minusburg is free.',
          he: 'כל חתימות הרוקט נמחקו מהסורק שלי. מינוסבורג חופשייה.',
        },
        {
          en: "You did in one afternoon what my entire precinct couldn't do in a week. Thank you.",
          he: 'עשית אחר צהריים אחד מה שכל תחנת המשטרה שלי לא הצליחה לעשות בשבוע. תודה.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Minessa / מינסה',
      lines: [
        {
          en: "You walked into our city a stranger and cleared the fear like it was nothing. The trainers here won't forget that.",
          he: 'נכנסת לעיר שלנו כזר ופינית את הפחד כאילו לא היה כלום. המאמנים כאן לא ישכחו את זה.',
        },
        {
          en: "The gym is open again. Come find me when you're ready — I'll be waiting. And I won't go easy on you.",
          he: 'המכון פתוח מחדש. בוא למצוא אותי כשאתה מוכן — אחכה. ולא אקל עליך.',
        },
      ],
    },
    // ── Gary shares NULL-X lore and Pokemon world context ────────────────────
    {
      type: 'dialogue',
      speakerName: 'Gary Oak / גארי אוק',
      lines: [
        {
          en: 'Good work. Now — lesson time. The Pokemon world runs on balance: nature, trainers, and Pokemon each play their role.',
          he: 'עבודה טובה. עכשיו — שיעור קצר. עולם הפוקימונים פועל על בסיס איזון: טבע, מאמנים ופוקימונים ממלאים כל אחד את תפקידו.',
        },
        {
          en: "NULL-X doesn't understand balance. It sees Pokemon as data — variables to be optimised, corrupted, or deleted. It's been injecting bad calculations into wild Pokemon, making them aggressive and unpredictable.",
          he: 'NULL-X לא מבין איזון. הוא רואה פוקימונים כנתונים — משתנים לאופטימיזציה, שחיתות, או מחיקה. הוא מזריק חישובים שגויים לפוקימוני בר, גורם להם להיות תוקפניים ובלתי צפויים.',
        },
      ],
    },
    // {
    //   type: 'dialogue',
    //   speakerName: 'Gary Oak / גארי אוק',
    //   lines: [
    //     {
    //       en: 'Oh — almost forgot. Take these. Consider it payment for doing the dirty work.',
    //       he: 'אה — כמעט שכחתי. קח את אלה. תחשוב על זה כתשלום על עשיית העבודה המלוכלכת.',
    //     },
    //   ],
    // },
    // // TODO: replace item IDs with final choices
    // { type: 'action', action: { type: 'give-item', itemId: 'super-potion', quantity: 3 } },
    // { type: 'action', action: { type: 'give-item', itemId: 'revive', quantity: 1 } },
    // {
    //   type: 'action',
    //   action: {
    //     type: 'show-message',
    //     lines: [{ en: 'Received 3× Super Potion and 1× Revive!', he: 'קיבלת ×3 תרופה משופרת ו-×1 תחייה!' }],
    //   },
    // },
    // ── Jenny walks off ──────────────────────────────────────────────────────
    // { type: 'face-npc', npcId: 'jenny-mb', dir: 'right' },
    // { type: 'move-npc', npcId: 'jenny-mb', path: ['up'], waitForComplete: true },
    // { type: 'hide-npc', npcId: 'jenny-mb' },
    // ── Minessa walks off ────────────────────────────────────────────────────

    // { type: 'hide-npc', npcId: 'minessa-mb-2' },
    // ── Set flags + quest, blocker spawns via flag ───────────────────────────
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act1-rocket-hunt' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ROCKET_MINUSBURG_ALL_DEFEATED } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.MINUSBURG_BLOCKER_PLACED } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-gym2' } },
    {
      type: 'action',
      action: {
        type: 'show-message',
        lines: [
          {
            en: "Minusburg is free! Head to the Subtraction Gym when you're ready to challenge Minessa.",
            he: 'מינוסבורג חופשייה! לך למכון החיסור כשאתה מוכן לאתגר את מינסה.',
          },
        ],
      },
    },
  ],
});

// ── Beat 8: Badge 2 earned — Algorithma congratulations call ─────────────────
registerCutscene({
  id: 'act1-minusburg-badge2-call',
  skippable: false,
  phoneCaller: { en: 'Prof. Algorithma', he: "פרופ' אלגוריתמה" },
  steps: [
    {
      type: 'dialogue',
      speakerName: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: 'officer Jenny updated me on the situation in Minusburg. I heard you drove out Team Rocket  impressive work!',
          he: 'שוטרת ג׳ני עדכנה אותי על המצב במינוסבורג ועל העזרה נגד צוות רוקט. — עבודה מרשימה!',
        },
        {
          en: "Congratulations on the Minus Badge! Driving out Team Rocket AND defeating Minessa in the same city — you're everything Numeria needs right now.",
          he: 'ברכות על תג המינוס! גירוש צוות רוקט ונצחון על מינסה באותה עיר — אתה בדיוק מה שנומריה צריכה עכשיו.',
        },
        {
          en: 'Route 3 leads to Multiplia. The challenges multiply from here — stay sharp!',
          he: 'שביל 3 מוביל למולטיפליה, עיר מכון הכפל. האתגרים מתרבים מכאן — הישאר ממוקד!',
        },
        {
          en: 'Before You continue to Route-3 , I need to ask you for a favor, During invstigation team-rocket drop out a documents related to Null-x that I need to analyze',
          he: 'לפני שתמשיך לשביל 3, אני צריך לבקש ממך טובה. במהלך חקירת צוות רוקט המודיעין השיג מסמכים שקשורים ל-NULL-X שאני צריך לנתח',
        },
        {
          en: 'Those documents are importants and stored in my coluge house proffestor Ben. please visit him.',
          he: 'המסמכים האלה חשובים ומאוחסנים בבית של עמיתי פרופסור בן. בבקשה בקר אותו.',
        },
      ],
    },

    // { type: 'action', action: { type: 'set-flag', flag: FLAGS.STORY_BADGE_2 } }, // should be given by gym leader
    // { type: 'action', action: { type: 'complete-quest', questId: 'main-act1-gym2' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-search-prof-ben' } },
  ],
});

registerCutscene({
  id: 'act1-professor-ben-met',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      speakerName: 'Prof. Ben / פרופ׳ בן',
      lines: [
        {
          en: "Hello -- I\'m Professor Ben. I study the effects of NULL-X on Pokemon data. I heard you\'ve been busy in Minusburg — thank you for your help.",
          he: 'שלום — אני פרופ׳ בן. אני חוקר את השפעות NULL-X על נתוני פוקימונים. שמעתי שהיית עסוק במינוסבורג — תודה על העזרה שלך.',
        },
        {
          en: 'Proffessor Algorithma mentioned you wanted to talk about some documents related to NULL-X that Team Rocket dropped. I might be able to help with that.',
          he: 'פרופסור אלגוריתמה אמר שאתה רוצה לדבר על כמה מסמכים שקשורים ל-NULL-X שצוות רוקט איבד. אולי אני יכול לעזור עם זה.',
        },
        {
          en: 'I trust you will bring those documents to proffesor Algorithma in Sumvile after we are done here',
          he: 'אני סומך עליך שתביא את המסמכים האלה לפרופסור אלגוריתמה בסומוויל אחרי שנגמור כאן',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_COLLECT_DOCS_FROM_BEN } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act1-search-prof-ben' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-met-prof-algo-in-sumvile' } },
  ],
});

registerCutscene({
  id: 'act1-professor-algo-met-docs',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      speakerName: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: "Good to see you again. Thanks for bringing these documents. Let me take a look... Hmm, interesting. This data could be really helpful for understanding NULL-X's next moves.",
          he: 'טוב לראות אותך שוב. תודה שהבאת את המסמכים האלה. תן לי להסתכל... הממ, מעניין. הנתונים האלה יכולים להיות מאוד מועילים להבנת הצעדים הבאים של NULL-X.',
        },
        {
          en: 'I will contact you once I analyze this data. In the meantime, keep your guard up — NULL-X is getting desperate and might try something big soon.',
          he: 'אני אצור איתך קשר ברגע שאנתח את הנתונים האלה. בינתיים, שמור על ערנות — NULL-X מתייאש ויכול לנסות משהו גדול בקרוב.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_BRING_DOCUMENTS_TO_ALGORITHMA } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act1-met-prof-algo-in-sumvile' } },
  ],
});

//#endregion

//#region Events ─────────────────────────────────────────────────────────────────────────────

// Beat 1 — first map enter: atmospheric arrival cutscene
registerStoryEvent({
  id: 'evt-minusburg-first-arrive',
  trigger: { type: 'map-enter', mapId: 'minusburg/minusburg' },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_MINUSBURG }],
  actions: [
    { type: 'set-flag', flag: FLAGS.VISITED_MINUSBURG },
    { type: 'set-infection', mapId: MapId.MINUSBURG_MINUSBURG, value: 'low' },
    { type: 'start-cutscene', cutsceneId: 'act1-minusburg-arrival' },
  ],
});

// Beat 2 — player tries to enter gym: cop Jenny blocks the door (repeatable)
registerStoryEvent({
  id: 'evt-gym-door-cop',
  trigger: { type: 'npc-interact', npcId: 'cop-gym-mb' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ROCKET_MINUSBURG_ALL_DEFEATED }],
  actions: [
    {
      type: 'show-message',
      lines: [
        {
          en: 'The officer steps forward. "Gym\'s closed until further notice. Team Rocket has been running wild — Minessa can\'t hold battles in these conditions. Come back when the city is safe."',
          he: '"המכון סגור עד להודעה חדשה. צוות רוקט משתולל — מינסה לא יכולה לנהל קרבות בתנאים האלה. בוא בחזרה כשהעיר תהיה בטוחה."',
        },
      ],
    },
    {
      type: 'set-flag',
      flag: FLAGS.MINUSBURG_GYM_BLOCKER_MET,
    },
    {
      type: 'complete-quest',
      questId: 'main-act1-minusburg',
    },
    { type: 'set-quest', questId: 'main-act1-minusburg-search-minnessa' },
  ],
  repeatable: true,
});

// Beat 4 — player interacts with Gary or Minessa at encounter spot: cutscene fires once
// (gary-oak-mb-1 and minessa-mb-1 both point to the same event via npc-interact)
registerStoryEvent({
  id: 'evt-minusburg-encounter',
  trigger: { type: 'npc-interact', npcId: 'gary-oak-mb' },
  conditions: [{ type: 'flag-not', flag: FLAGS.MINUSBURG_GARY_MET }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act1-minusburg-gary-intro' }],
});

registerStoryEvent({
  id: 'evt-minusburg-encounter-minessa',
  trigger: { type: 'npc-interact', npcId: 'npc-1776761882211' },
  conditions: [{ type: 'flag-not', flag: FLAGS.MINUSBURG_GARY_MET }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act1-minusburg-gary-intro' }],
});

// Beat 6 — all 10 Rocket grunts defeated → finale cutscene
registerStoryEvent({
  id: 'evt-rockets-all-done',
  trigger: { type: 'trainer-defeated', trainerId: 'rocket-mb-10' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ROCKET_MINUSBURG_ALL_DEFEATED }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act1-minusburg-rockets-cleared' }],
});

registerStoryEvent({
  id: 'update-quest-gym2-on-badge2',
  trigger: { badge: 2, type: 'badge-earned' },
  actions: [{ type: 'complete-quest', questId: 'main-act1-gym2' }],
});

// Beat 8 — badge 2 earned → clear infection + Algorithma call
// (Gary's map NPC despawns automatically via despawnAfter: STORY_BADGE_2 in map JSON)
registerStoryEvent({
  id: 'evt-badge2-earned',
  // trigger: { type: 'badge-earned', badge: 2 },
  repeatable: false,
  trigger: { type: 'map-exit', mapId: 'minusburg/gym' },
  conditions: [{ type: 'flag', flag: FLAGS.STORY_BADGE_2 }],
  actions: [
    { type: 'set-infection', mapId: MapId.MINUSBURG_MINUSBURG, value: 'medium' },
    { type: 'start-cutscene', cutsceneId: 'act1-minusburg-badge2-call' },
  ],
});
registerStoryEvent({
  id: 'evt-profBen-docs',
  repeatable: false,
  trigger: { type: 'npc-interact', npcId: 'npc-prof-ben-act1' },
  conditions: [
    { type: 'flag', flag: FLAGS.STORY_BADGE_2 },
    { type: 'flag-not', flag: FLAGS.ACT1_BRING_DOCUMENTS_TO_ALGORITHMA },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act1-professor-ben-met' }],
});
registerStoryEvent({
  id: 'evt-profBen-docs-to-algo',
  repeatable: false,
  trigger: { type: 'npc-interact', npcId: 'npc-act1-prof-algo' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT1_COLLECT_DOCS_FROM_BEN },
    { type: 'flag-not', flag: FLAGS.ACT1_BRING_DOCUMENTS_TO_ALGORITHMA },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act1-professor-algo-met-docs' },
    // Mark key file as used
    { type: 'set-flag', flag: ITEM_GAME_DATA['9003'].usedFlag ?? 'key-secret-doc-analyzed' },
  ],
});

//#endregion
