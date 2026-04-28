import { registerCutscene } from '../../cutscenes';
import { registerStoryEvent } from '../../events';
import { FLAGS } from '../../flags';
import { registerQuest } from '../../quests';

registerQuest({
  id: 'main-act1-route3',
  title: { en: 'Route 3', he: 'שביל 3' },
  objective: { en: 'Explore Route 3 and find new trainers to battle', he: 'חקור את שביל 3 ומצא מאמנים חדשים לקרב' },
});

registerStoryEvent({
  id: 'act1-route3-start',
  trigger: { type: 'map-enter', mapId: 'routes/route-3' },
  actions: [{ type: 'set-quest', questId: 'main-act1-route3' }],
});

registerStoryEvent({
  id: 'act1-route3-reward',
  trigger: { type: 'npc-interact', npcId: 'fishing-rod-blocker' },
  actions: [
    { type: 'set-flag', flag: FLAGS.ACT1_ROUTE3_MEET_MISTY },
    { type: 'complete-quest', questId: 'main-act1-route3' },
    { type: 'set-quest', questId: 'main-act1-route3-reward' },
  ],
});

registerQuest({
  id: 'main-act1-route3-reward',
  title: { en: 'Route 3 Reward', he: 'פרס שביל 3' },
  objective: { en: 'Go to get a fishing rod', he: 'לך לקבל חכת דיג' },
});

registerStoryEvent({
  id: 'act1-route3-end',
  trigger: { type: 'flag-set', flag: FLAGS.ACT1_ROUTE3_REWARD_RECEIVED },
  actions: [{ type: 'complete-quest', questId: 'main-act1-route3-reward' }],
});

// start story action with reminder
registerStoryEvent({
  id: 'act1-reminder-call-route4',
  trigger: { type: 'map-enter', mapId: 'routes/route-4' },
  actions: [
    { type: 'set-infection', mapId: 'routes/route-4', value: 'medium' },
    { type: 'set-infection', mapId: 'routes/route-3', value: 'medium' },
    { type: 'set-infection', mapId: 'minusburg/minusburg', value: 'medium' },
    { type: 'start-cutscene', cutsceneId: 'act1-reminder-call-route4-enter' },
  ],
});

registerCutscene({
  id: 'act1-reminder-call-route4-enter',

  steps: [
    { type: 'face-npc', npcId: 'rei-minder-route-4', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'Reminder/ריי מיינדר',
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
      speakerId: 'Misty/מיסטי',
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
      speakerId: "Officer Jenni/ג'ני השוטרת",
      lines: [
        { he: 'עצרו רגע...', en: '' },
        { en: '', he: "שלום ! אני השוטרת ג'ני מהעיר מולטיפילה" },
        { he: 'הגיעו דיווחים לאזור על פוקימונים שמתנהגים מוזר - אם תשמעו על זה משהו תודיעו למשטרה תכף ומיד', en: '' },
      ],
    },

    {
      type: 'dialogue',
      speakerId: 'אני/Player',
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
      speakerId: 'Reminder/ריי מיינדר',
      lines: [
        {
          he: 'טוב האמת שזה מסקרן מאוד מה קרה לפוקימונים פה - אבל אולי קודם נתחיל בקרב שלנו?',
          en: "Well actually it's very intriguing what happened to the pokemons here - but maybe first let's start with our battle?",
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_ROUTE_3_MISTY_JENNI_GO } },
  ],
});
