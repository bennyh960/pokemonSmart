import { registerCutscene } from '../../cutscenes';
import { registerStoryEvent } from '../../events';
import { registerQuest } from '../../quests';
import { FLAGS, allTrainersDefeatedFlag } from '../../flags';

// start story action with reminder
registerStoryEvent({
  id: 'act1-reminder-call-route4',
  trigger: { type: 'map-enter', mapId: 'routes/route-4' },
  actions: [
    { type: 'set-infection', mapId: 'routes/route-1', value: 'medium' },
    { type: 'set-infection', mapId: 'sumville/sumville', value: 'medium' },
    { type: 'set-infection', mapId: 'routes/route-2', value: 'medium' },
    { type: 'set-infection', mapId: 'routes/route-3', value: 'medium' },
    { type: 'set-infection', mapId: 'minusburg/minusburg', value: 'medium' },
    { type: 'set-infection', mapId: 'routes/route-4', value: 'medium' },
    { type: 'set-infection', mapId: 'multiplia/multiplia', value: 'critical' },
    { type: 'start-cutscene', cutsceneId: 'act1-reminder-call-route4-enter' },
  ],
});

registerCutscene({
  id: 'act1-reminder-call-route4-enter',

  steps: [
    { type: 'face-npc', npcId: 'rei-minder-route-4', dir: 'down' },
    {
      type: 'dialogue',
      speakerName: 'Reminder/ריי מיינדר',
      lines: [
        { en: '', he: 'האא אתה פה ? מה שלומך?' },
        { en: '', he: 'אני חייב להיות כנה - לא האמנתי שתצליח להשיג תג מכון החיסור' },
        { en: '', he: 'אבל אתה מוכיח לאט לאט שאתה באמת יריב ראוי' },
        { en: '', he: 'אולי הגיע הזמן לקרב נוסף ביננו' },
      ],
    },

    // Spawn Jenny and Misty, then walk them in from the left simultaneously
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_ROUTE_3_MISTY_JENNI_ARRIVED } },
    {
      type: 'move-npc',
      npcId: 'misty-route-4',
      path: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'right', 'right', 'right', 'right', 'right', 'right'],
      waitForComplete: true,
    },
    {
      type: 'dialogue',
      speakerName: 'Misty/מיסטי',
      lines: [
        { he: 'היי , אני רואה שהצלחת להשיג חכה! מקווה שיהיה איתה דייג נפלא', en: '' },
        {
          he: 'משהו מוזר קורה כאן - נתקלתי בפוקימוני פרא פראיים במיוחד , הם זזו בצורה מוזרה וגם היו ממש אגרסיביים',
          en: '',
        },
        {
          he: 'זה קרה ממש בשעה שסיימתי את הדיג שלי , הפוקימונים התנהגו מוזר מאוד , הם גם היו מופרעים מאוד וניסו לתקוף אותי',
          en: '',
        },
        {
          en: '',
          he: 'אני חייבת להגיע למרכז הפוקימונים הקרוב להתאוששות , מקווה ניפגש שוב',
        },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'misty-route-4',
      path: ['right', 'right', 'right', 'right', 'right', 'right'],
      waitForComplete: false,
    },
    {
      type: 'move-npc',
      npcId: 'officer-jenny-route-4',
      path: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'right', 'right', 'right', 'right'],
      waitForComplete: false,
    },

    {
      type: 'dialogue',
      speakerName: "Officer Jenni/ג'ני השוטרת",
      lines: [
        { he: 'עצרו רגע...', en: '' },
        { en: '', he: "שלום ! אני השוטרת ג'ני מהעיר מולטיפילה" },
        { he: 'הגיעו דיווחים לאזור על פוקימונים שמתנהגים מוזר מאוד', en: '' },
        { he: 'ייתכן שזה קשור לנוכחות של צוות רוקט במינסבורג - המודיעין דיבר על זה משהו', en: '' },
        { he: 'אני הולכת להצטרף לחקירה של תחנת מינסבורג, בינתיים היו זהירים', en: '' },
      ],
    },

    {
      type: 'dialogue',
      speakerName: 'אני/Player',
      lines: [
        { he: 'אוקיי - אנחנו נהיה זהירים ונדווח אם נראה משהו חריג', en: '' },
        { en: '', he: 'תודה על המידע - להתראות!' },
      ],
    },

    // Walk Jenny and Misty off-screen to the left simultaneously, then set the flag
    {
      type: 'move-npc',
      npcId: 'officer-jenny-route-4',
      path: [
        'left',
        'left',
        'left',
        'left',
        'left',
        'left',
        'down',
        'down',
        'down',
        'down',
        'down',
        'down',
        'down',
        'down',
      ],
      waitForComplete: false,
    },

    {
      type: 'dialogue',
      speakerName: 'Reminder/ריי מיינדר',
      lines: [
        {
          en: '',
          he: 'טוב , נשמע מוזר מאוד, לא? ',
        },
        { en: '', he: 'אולי זה קשור לצוות רוקט או לא - לא יודע' },
        { en: '', he: 'מה שאני כן יודע שזה אני מוכן לקרב פוקימונים !' },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_ROUTE_3_MISTY_JENNI_GO } },
  ],
});

// ── Quest ─────────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act1-deliver-doc',
  title: { en: 'Secret Message', he: 'מסמך סודי' },
  objective: {
    en: 'Deliver Secret Document 2 to Professor Oak in the Multiplia Library',
    he: 'מסור את המסמך הסודי לפרופסור אוק בספרייה של מולטיפילה',
  },
});

// ── Story Event: all glitch pokemon on Route 4 defeated ───────────────────────

registerStoryEvent({
  id: 'act1-route4-all-clear',
  trigger: { type: 'flag-set', flag: allTrainersDefeatedFlag('routes/route-4') },
  actions: [
    { type: 'set-flag', flag: FLAGS.ACT1_ROUTE4_ASSEMBLY_STARTED },
    { type: 'start-cutscene', cutsceneId: 'act1-route4-assembly' },
  ],
});

// ── Cutscene: the assembly ─────────────────────────────────────────────────────

registerCutscene({
  id: 'act1-route4-assembly',
  skippable: false,
  steps: [
    // a. Rocket grunt flees left
    { type: 'face-npc', npcId: 'rocket-grunt-r4-assembly', dir: 'right' },
    { type: 'move-npc', npcId: 'rocket-grunt-r4-assembly', path: ['left', 'left', 'left'], waitForComplete: true },

    // b. Blocker officer chases the grunt (already despawned by flag — show-npc re-shows it)
    { type: 'show-npc', npcId: 'npc-r4-officer-blocker' },
    { type: 'face-npc', npcId: 'npc-r4-officer-blocker', dir: 'left' },
    { type: 'move-npc', npcId: 'npc-r4-officer-blocker', path: ['up', 'left', 'left', 'left'], waitForComplete: true },
    { type: 'hide-npc', npcId: 'npc-r4-officer-blocker' },
    { type: 'hide-npc', npcId: 'rocket-grunt-r4-assembly' },
    // todo: face player up
    // c. Officer Jenny walks in and asks what happened
    {
      type: 'move-npc',
      npcId: 'jenny-r4-assembly',
      path: ['right', 'right', 'right', 'right', 'right'],
      waitForComplete: true,
    },
    { type: 'face-npc', npcId: 'jenny-r4-assembly', dir: 'down' },

    {
      type: 'dialogue',
      speakerName: "Officer Jenny/ג'ני השוטרת",
      lines: [
        { he: 'באתי מיד כשהתקבלה קריאה לגיבוי — מה קרה כאן?', en: '' },
        { he: 'ראיתי סוכן רוקט בורח. ספר לי הכול.', en: '' },
      ],
    },

    // e. Gary and Minessa arrive
    {
      type: 'move-npc',
      npcId: 'gary-r4-assembly',
      path: ['down', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'left', 'left'],
      waitForComplete: false,
    },
    {
      type: 'move-npc',
      npcId: 'minessa-r4-assembly',
      path: ['down', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'left', 'left'],
      waitForComplete: false,
    },
    // d. Player explains the glitch encounters,
    {
      type: 'dialogue',
      speakerName: 'אני/Player',
      lines: [
        { he: 'היו פה שלושה יצורים... לא פוקימונים רגילים.', en: '' },
        { he: "הם ריצדו, דיברו ג'יבריש וחשו חזקים הרבה יותר מהרגיל.", en: '' },
        { he: 'כשניצחתי אותם — הם פשוט נעלמו. ואז ראיתי סוכן רוקט בורח.', en: '' },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Gary/גארי',
      lines: [
        { he: 'גם אנחנו נתקלנו בהם בדרך לכאן.', en: '' },
        { he: 'הצלחנו לנצח — אבל משהו בהם היה לא טבעי לגמרי.', en: '' },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Minessa/מינסה',
      lines: [
        { he: 'הם לא היו רשומים בפוקדקס. אפס מידע. כאילו... לא קיימים.', en: '' },
        { he: 'ואז בקרב הם כאילו הופיעו בפוקדקס כפוקימונים רגילים', en: '' },
      ],
    },

    // g. Group: investigation + rockets near glitches
    {
      type: 'dialogue',
      speakerName: "Officer Jenny/ג'ני השוטרת",
      lines: [
        { he: 'אנחנו חוקרים כבר כמה ימים. התמונה ברורה — זה מאורגן.', en: '' },
        { he: 'היו עדויות שראו בסמוך ליצורים האלה פעילות של סוכני צוות רוקט', en: '' },
        { he: 'אותו דפוס בכל המסלולים. זה לא מקרי.', en: '' },
      ],
    },

    // h. Gary mentions NULL-X and secret docs
    {
      type: 'dialogue',
      speakerName: 'Gary/גארי',
      lines: [
        { he: 'רגע — זה מסתדר עם מה שכתוב במסמכים הסודיים שמצאנו.', en: '' },
        { he: 'NULL-X יכולה לשלוט בפוקימונים דרך צוות רוקט ולגרום להם להשתבש.', en: '' },
        { he: 'מה שראינו כאן — זו לא תיאוריה. זה כבר קורה.', en: '' },
        { he: "אני חושב שבמסמך היצורים האלה נקראו 'גליץ' אבל זה לא ברור לגמרי.", en: '' },
      ],
    },

    // i. Others leave — Leon stays for private talk

    {
      type: 'move-npc',
      npcId: 'minessa-r4-assembly',
      path: ['left', 'left', 'left', 'left', 'left', 'left'],
      waitForComplete: false,
    },
    {
      type: 'move-npc',
      npcId: 'jenny-r4-assembly',
      path: ['left', 'left', 'left', 'left', 'left', 'left'],
      waitForComplete: false,
    },
    { type: 'hide-npc', npcId: 'officer-1-r4-assembly' },
    { type: 'hide-npc', npcId: 'officer-2-r4-assembly' },
    { type: 'wait', durationMs: 800 },

    // Gary private moment
    {
      type: 'dialogue',
      speakerName: 'Gary/גארי',
      lines: [
        { he: 'יש לי מסמך סודי   — נפל לידינו מסוכן רוקט בכיר.', en: '' },
        {
          he: 'דיברתי עם סבא שלי פרופסור אוק לגבי המסמך והוא רוצה לחקור אותו , הפרופסור אמר שהוא יחכה לי בספריית מולטיפילה',
          en: '',
        },
        { he: 'הוא חייב להגיע לפרופסור אוק בספריית מולטיפילה. הוא היחיד שיכול לפענח אותו.', en: '' },
        { he: 'אני צריך לסייע למשטרה בחקירה ואני יודע שאפשר לסמוך עלייך שתעביר את המסמך.', en: '' },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'אני/Player',
      lines: [{ he: 'אני אגיע לשם. מה שצריך.', en: '' }],
    },
    {
      type: 'dialogue',
      speakerName: 'Gary/גארי',
      lines: [{ he: 'מצוין. זהירות בדרך —   צוות רוקט עדיין שם בחוץ.', en: '' }],
    },

    // Wrap-up: set flags, start quest
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_SECRET_DOC_2_RECEIVED } },
    // ! i decided not use ITEM_GAME_DATA for that to avoid confusing in the bag.  so we will count on the flag but i keep the comments
    // { type: 'action', action: { type: 'set-flag', flag: TEM_GAME_DATA['9003'].usedFlag } },
    // { type: 'action', action: { type: 'give-item', itemId: 'secret-doc-2', quantity: 1 } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-deliver-doc' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_ROUTE4_ASSEMBLY_DONE } },
    {
      type: 'move-npc',
      npcId: 'gary-r4-assembly',
      path: ['left', 'left', 'left', 'left', 'left', 'left'],
      waitForComplete: false,
    },
  ],
});
