import { registerCutscene } from '../../cutscenes';
import { registerStoryEvent } from '../../events';
import { FLAGS } from '../../flags';
import { registerQuest } from '../../quests';

// ── Phase 1: Reminder calls from Route 9 (map-enter Symmetrika, post Raikou) ──
registerStoryEvent({
  id: 'evt-r9-reminder-call',
  trigger: { type: 'map-enter', mapId: 'symmetrika/symmetrika' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT3_POWER_RAIKOU_ARC_FLEE },
    { type: 'flag-not', flag: FLAGS.ACT3_R9_REMINDER_CALLED },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-r9-reminder-call' }],
});

registerCutscene({
  id: 'cutscene-r9-reminder-call',
  phoneCaller: { en: 'Reminder', he: 'רמיינדר' },
  steps: [
    {
      type: 'dialogue',
      speakerId: 'rival-reminder',
      lines: [
        {
          en: "Hey! It's Reminder. Sima Tria told me you might be close here , is that true? ",
          he: 'היי! זה רמיינדר. סימה טריה אמרה שאולי אתה קרוב לכאן, זה נכון?',
        },

        {
          en: 'Post my gym battle with Sima Tria she told me about Route 9 — they say it connects many towns and there are rare Pokémon nearby...',
          he: 'לאחר קרב האולם שלי עם סימה טריה היא סיפרה לי על דרך 9 — אומרים שהיא מחברת הרבה ערים ושיש פוקימונים נדירים בסביבה...',
        },
        {
          en: 'So I went to explore... but Team Rocket ambushed me.',
          he: 'אז יצאתי לסייר... אבל צוות רוקט תקף אותי',
        },
        {
          en: 'They was many and I was not able to fight them!!! when my Pidgeot tried to protect me, they stole it from me and ran away once they hear the police sirens!!!',
          he: "הם היו רבים ולא הצלחתי להילחם בהם!!! כשהפידג'יאוט שלי ניסה להגן עליי, הם גנבו אותו וברחו ברגע ששמעו את סירנות המשטרה!!!",
        },
        {
          en: 'They rocket grunts splited - t But I have a feeling my pokemon is stil close',
          he: 'חיילי צוות הרוקט התפצלו אבל יש לי הרגשה שהפוקימון שלי עדיין קרוב',
        },
        {
          en: 'Route-9 is in the east of symetrika, you can find me there if you want to help me.',
          he: 'דרך 9 היא במעבר המזרחי של סימטריקה, אתה יכול למצוא אותי שם אם אתה רוצה לעזור לי.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player/שחקן',
      lines: [
        { en: 'Of course, I will help you.', he: 'כמובן, אעזור לך' },
        {
          en: 'I am in Symettrika right now, I will head to Route 9 and meet you there.',
          he: 'אני כרגע בסימטריקה, אני אלך לדרך 9 ואפגוש אותך שם.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_R9_REMINDER_CALLED } },
    { type: 'action', action: { type: 'set-quest', questId: 'quest-route9' } },
  ],
});

registerQuest({
  id: 'quest-route9',
  title: { en: "Reminder's Pidgeot", he: "הפידג'יאוט של רמיינדר" },
  objective: {
    en: "Find the Rocket grunt  who stole Reminder's Pidgeot",
    he: "מצא את חייל הרוקט שגנב את הפידג'יאוט של רמיינדר",
  },
});

// ── Phase 2: Talk to Reminder on Route 9 ─────────────────────────────────────
registerStoryEvent({
  id: 'evt-r9-reminder-talk',
  trigger: { type: 'npc-interact', npcId: 'npc-r9-reminder' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT3_R9_REMINDER_CALLED },
    { type: 'flag-not', flag: FLAGS.ACT3_R9_REMINDER_TALKED },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-r9-reminder-talk' }],
});

registerCutscene({
  id: 'cutscene-r9-reminder-talk',
  steps: [
    {
      type: 'dialogue',
      speakerId: 'npc-r9-reminder',
      lines: [
        { en: 'Oh — you came! Thank goodness.', he: 'אוה - באת! תודה לאל' },
        {
          en: 'While I was waiting... Officer Jenny also came and they chased the rocket grunt on the east side of route 9 to block the path to Multipila town.',
          he: "בזמן שהמתנתי... השוטרת ג'ני גם הגיעה והיא רדפה אחרי צוות רוקט בצד המזרחי של דרך 9 כדי לחסום את הדרך לעיר מולטיפילה.",
        },
        {
          en: 'The rocket grunt who stole my pokemon turn to other path , he is hear somewhere',
          he: 'חייל הרוקט שגנב את הפוקימון שלי פנה לדרך אחרת, הוא כאן איפשהו',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-r9-reminder',
      lines: [
        {
          en: 'You must know that - Team Rocket had a legendary Pokémon with them. Something I have never seen before.',
          he: 'חייב לציין שלכנופיית צוות רוקט התלווה פוקימון אגדי איתם. משהו שלא ראיתי מעולם',
        },
        {
          en: 'A massive blue bird — glitching, unstable... it attacked with ice moves. The whole area froze for a moment.',
          he: "ציפור כחולה ענקית - נראתה מושפעת מגליץ', מושחתת... התקיפה עם מהלכי קרח. כל האזור קפא לרגע",
        },
        {
          en: 'And it was carrying something strange. Some kind of device — like a chip or a circuit board.',
          he: 'והיא נשאה משהו מוזר. מכשיר מסוג כלשהו - כמו שבב או לוח מעגלים',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-r9-reminder',
      lines: [
        {
          en: 'Everything happened so fast. The grunt fled into the mountains here.',
          he: 'הכל קרה כל כך מהר. חייל הרוקט ברח בהרים פה ',
        },
        {
          en: 'Pidgeot must still be somewhere nearby... .',
          he: "הפידג'יאוט חייב להיות בסביבה... בבקשה עזור לי בסריקה",
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player/שחקן',
      lines: [{ en: 'Leave it to me.', he: 'תשאיר את זה לי' }],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_R9_REMINDER_TALKED } },
  ],
});

// ── Phase 3: Rocket grunt defeated in Route-9 cave ────────────────────────────
registerStoryEvent({
  id: 'evt-r9-grunt-defeated',
  trigger: { type: 'trainer-defeated', trainerId: 'npc-rocketGrunt' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT3_R9_REMINDER_TALKED },
    { type: 'flag-not', flag: FLAGS.ACT3_R9_GRUNT_DEFEATED },
  ],
  actions: [
    { type: 'set-flag', flag: FLAGS.ACT3_R9_GRUNT_DEFEATED },
    { type: 'set-repel', steps: 50 },
    { type: 'start-cutscene', cutsceneId: 'cutscene-r9-reminder-cave' },
  ],
});

// ── Phase 4: Reminder appears in cave, thanks player, leaves ──────────────────
registerCutscene({
  id: 'cutscene-r9-reminder-cave',
  steps: [
    { type: 'wait', durationMs: 200 },
    {
      type: 'move-npc',
      npcId: 'npc-r9-reminder-cave',
      path: ['down', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'down'],
      waitForComplete: true,
    },
    {
      type: 'dialogue',
      speakerId: 'npc-r9-reminder-cave',
      lines: [
        { en: 'You got him!', he: 'תפסת אותו!' },
        { en: 'I heared my Pidgeot from a distance — great work.', he: "שמעתי את הפידג'יאוט שלי מרחוק - עבודה מצוינת" },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player/שחקן',
      lines: [{ en: 'Pidgeot — is it safe?', he: "הפידג'יאוט - האם הוא בסדר?" }],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-r9-reminder-cave',
      lines: [
        {
          en: 'Pidgeot found its way back on its own — it must have escaped when the grunt ran!',
          he: "הפידג'יאוט חזר לבד - הוא כנראה ברח כשחייל הרוקט נמלט!",
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: '...',
      lines: [{ en: '...Pidgeot returned safely to Reminder.', he: "...הפידג'יאוט חזר בשלום לרמיינדר." }],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-r9-reminder-cave',
      lines: [
        {
          en: 'But there is something more important — I saw the blue bird again as the grunt ran out.',
          he: 'אבל יש משהו חשוב יותר - ראיתי שוב את הציפור הכחולה כשחייל הרוקט נמלט',
        },
        {
          en: 'Up close, that device it was carrying looked like... a cheap computer chip. Cracked plastic, exposed wires.',
          he: 'מקרוב, אותו מכשיר שהיא נשאה נראה כמו... שבב מחשב זול. פלסטיק סדוק, חוטים חשופים',
        },
        {
          en: 'What would a legendary Pokémon be doing carrying something like that?',
          he: 'מה לפוקימון אגדי ולהסתובב עם משהו כזה?',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-r9-reminder-cave',
      lines: [
        {
          en: 'Anyway — thank you for everything. I will not forget this.',
          he: 'בכל מקרה - תודה על הכל. לא אשכח את זה',
        },
        {
          en: 'I am heading to Percentile City next — the next city-badge!',
          he: 'אני מתלבט אם להמשיך לעיר פרסנטייל - האתגר הבא מחכה לי שם!',
        },
        {
          en: 'Or maybe I will continue invastigate this cave - I am able to surf with my pokemons and I want to see if there is something more to find here.',
          he: 'או אולי אני אמשיך לחקור את המערה הזו - אני יכול לגלוש עם הפוקימונים שלי ואני רוצה לראות אם יש משהו נוסף למצוא כאן.',
        },
        {
          en: 'Anyway I will get to rest now - I am exhausted from all this.',
          he: 'בכל מקרה אני אלך לנוח עכשיו - אני מותש מכל זה.',
        },
        {
          en: 'Good luck on your journey... see you at the top!',
          he: 'הרבה הצלחה במסע שלך... נתראה בהמשך לקרב נוסף ביננו!',
        },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'npc-r9-reminder-cave',
      path: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
      waitForComplete: true,
    },
    { type: 'hide-npc', npcId: 'npc-r9-reminder-cave' },
    { type: 'action', action: { type: 'complete-quest', questId: 'quest-route9' } },
    { type: 'action', action: { type: 'set-quest', questId: 'quest-go-percentile' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_R9_ARC_COMPLETE } },
  ],
});

registerQuest({
  id: 'quest-go-percentile',
  title: { en: 'Road to Percentile', he: 'הדרך לפרסנטייל' },
  objective: {
    en: 'Continue your journey to Percentile City to challenge the next gym there',
    he: 'המשך את המסע שלך לעיר פרסנטייל כדי לאתגר את המכון הבא שם',
  },
});
