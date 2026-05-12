/**
 * ACT 3: Fractalis — Zapdos Chase + Electric Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act3-fractalis, main-act3-zapdos-chase, main-act3-electric-gym
 * GATES:    gate-fractalis-gym
 *
 * STORY BEATS (in order):
 *   1. Player enters Fractalis → investigation quest starts
 *   2. Wife in gymHouse gives item → engineer spawns at beach
 *   3. Player finds engineer at beach → Zapdos reveal + sets off to route-7
 *   4. Player enters Route 7 → Jenny scene, Zapdos despawns, route-8 unlocks
 *   5. Player enters Route 8 → engineer explains Zapdos is being controlled
 *   6. Player battles Zapdos in Route 8 → NULL-X Core 5 drops
 *   7. Engineer invites player to power station gym
 *
 * FLAGS SET: VISITED_FRACTALIS, ACT3_FRACTALIS_WIFE_TALKED,
 *            ACT3_FRACTALIS_ENGINEER_MET, ACT3_FRACTALIS_ROUTE7_SCENE_DONE,
 *            ACT3_FRACTALIS_ROUTE8_ENTERED, ACT3_FRACTALIS_ZAPDOS_DEFEATED,
 *            ACT3_FRACTALIS_GYM_INVITE, GATE_FRACTALIS_GYM_PASS
 *
 * FLAGS READ: ACT3_FRACTALIS_WIFE_TALKED, ACT3_FRACTALIS_ENGINEER_MET,
 *             ACT3_FRACTALIS_ROUTE7_SCENE_DONE, ACT3_FRACTALIS_ROUTE8_ENTERED
 *
 * MAP IDs:  'fractalis/fractalis', 'fractalis/gymHouse',
 *           'routes/route-7', 'routes/route-8'
 *
 * NPC IDs (cutscene-referenced):
 *   npc-fractalis-engineer-wife         fractalis/gymHouse
 *   npc-fractalis-engineer-volt         fractalis/fractalis  (beach)
 *   npc-zapdos-route7         routes/route-7       (existing — despawnAfter added)
 *   npc-engineer-volt-r7      routes/route-7       (jenny scene)
 *   npc-jenny-zapdos-scene    routes/route-7       (jenny scene)
 *   npc-engineer-volt-r8      routes/route-8       (arrival scene)
 *   npc-engineer-volt-r8-post routes/route-8       (hunt + post-battle)
 *   npc-zapdos-route8         routes/route-8       (legendary battle)
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';
import { MapId } from '../../../maps/map-ids.js';

// ── Quests ────────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act3-fractalis',
  title: { en: 'Fractalis', he: ' עיר השברים - פרקטליס' },
  objective: { en: 'Explore Fractalis', he: 'חקור את עיר השברים - פרקטליס' },
});
registerQuest({
  id: 'main-act3-engineer-intro',
  title: { en: 'Chief Engineer', he: 'מהנדס ראשי' },
  objective: {
    en: 'Search the chief engineer and learn about the power station',
    he: 'חפש את המהנדס הראשי ולמד על תחנת הכוח',
  },
});

registerQuest({
  id: 'main-act3-zapdos-chase',
  title: { en: 'Find the Missing Zapdos', he: 'מצא את זאפדוס הנעלם' },
  objective: { en: 'Follow the engineer to Route 7 and track Zapdos', he: 'עקוב אחר המהנדס לדרך 7 ועקוב אחר זאפדוס' },
});

registerQuest({
  id: 'main-act3-electric-gym',
  title: { en: 'The Electric Gym', he: 'מכון החשמל' },
  objective: {
    en: 'Challenge the Electric Gym at the power station in Route 8',
    he: 'בקר במכון החשמל בתחנת הכוח בדרך 8',
  },
});

// ── Gate ──────────────────────────────────────────────────────────────────────
// TODO: useAuto Register no need
// registerGate({
//   id: 'gate-fractalis-gym',
//   title:       { en: 'Electric Gym',            he: 'מכון החשמל' },
//   description: {
//     en: 'Answer 5 questions to challenge the Electric Gym Leader.',
//     he: 'ענה על 5 שאלות כדי לאתגר את מנהיג מכון החשמל.',
//   },
//   triggerType: 'gym-entry',
//   questionSetIds: ['placeholder'],
//   sessionConfig: {
//     ...DEFAULT_SESSION_CONFIG,
//     questionsRequired: 5,
//     penaltyAmount: 0,
//   },
//   reopenCooldownMs: 0,
//   successActions: [
//     { type: 'set-flag', flag: FLAGS.GATE_FRACTALIS_GYM_PASS },
//     { type: 'set-quest', questId: 'main-act3-electric-gym' },
//   ],
// });

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// gymHouse — wife's first interaction
registerCutscene({
  id: 'act3-wife-intro',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      speakerName: "Engineer's Wife / אשת המהנדס",
      lines: [
        { en: 'Oh, a trainer! Have you come from Route 7?', he: 'אה, מאמן! הגעת מדרך 7?' },
        {
          en: "Are you here to challenge the gym? The gym is closed right now because of... well, something's going on with the power station.",
          he: 'האם הגעת לאתגר את המכון? המכון סגור כרגע בגלל...',
        },
        {
          en: "My husband is the chief engineer there, so he's been very busy trying to figure it out.",
          he: 'בעלי הוא המהנדס הראשי שם, אז הוא מאוד עסוק בניסיון להבין מה קורה.',
        },
        {
          en: "He's been so worried lately — he said something feels wrong. He should be down by the beach right now - I suggest you will go to talk with him.",
          he: 'הוא היה כל כך מודאג לאחרונה — הוא אמר שמשהו לא בסדר. הוא אמור להיות ליד החוף עכשיו. אני מציעה שתלך לדבר איתו.',
        },
      ],
    },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act3-fractalis' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act3-engineer-intro' } },

    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_FRACTALIS_WIFE_TALKED } },
  ],
});

// fractalis beach — engineer reveals Zapdos situation
registerCutscene({
  id: 'act3-engineer-intro',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'npc-fractalis-engineer-volt', dir: 'down' },

    {
      type: 'dialogue',
      speakerId: 'npc-fractalis-engineer-volt',
      speakerName: 'Engineer Volt / מהנדס וולט',
      lines: [
        {
          en: "I'm the prime engineer of the power station in Route 8. For years, wild electric Pokémon have traveled here to offload their excess current. That power runs half the world.",
          he: 'אני המהנדס הראשי של תחנת הכוח של נומריה. תחנת הכח נמצאת בדרך 8. שנים ארוכות, פוקימוני חשמל פראיים מגיעים לכאן כדי לפרוק את הזרם העודף שלהם..',
        },
        {
          en: 'But a month ago... they stopped. Every single one. And now the bigger problem — Zapdos. The legendary Zapdos appears here every five years, precise as a clock.',
          he: 'אבל לאחרונה הם בקושי מגיעים ... . כולם. ועכשיו הבעיה הגדולה יותר — זאפדוס. זאפדוס הפוקימון האגדי מגיע לכאן כל חמש שנים, מדויק כמו שעון.',
        },
        {
          en: "It was due a week ago. It hasn't come. Something is blocking it.",
          he: 'הוא היה אמור להגיע לפני שבוע. הוא לא הגיע. משהו עוצר אותו.',
        },
        {
          en: "Zapdos carri large amount of electricity - if he will not offload soon it can damage him. I'm worried about him.",
          he: 'זאפדוס הוא לא פוקימון חשמל רגיל - הוא מפוקימוני החשמל החזקים בעולם! הוא נושא כמות גדולה של חשמל - אם הוא לא יפרוק בקרוב זה יכול לגרום לנזק בלתי הפיך עבורו. אני דואג לו.',
        },
      ],
    },

    {
      type: 'dialogue',
      speakerName: 'Player / שחקן',
      lines: [
        {
          en: 'Zapdos ? I saw a big pokemon fliying around Route 7 recently. It was yellow and had electric sparks around it. Could it be...?',
          he: 'זאפדוס? ראיתי פוקימון גדול עף באזור דרך 7 לאחרונה. הוא היה צהוב והיו ניצוצות חשמליים סביבו. זה יכול להיות...?',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-fractalis-engineer-volt',
      lines: [
        {
          en: 'Wait — you say you saw a huge yellow bird flying in Route 7? That must be Zapdos!',
          he: 'רגע — אתה אומר שראית ציפור צהובה ענקית עפה בדרך 7? זה חייב להיות זאפדוס!',
        },
        { en: "Hurry — let's go!", he: 'מהר — בוא נלך!' },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'npc-fractalis-engineer-volt',
      path: ['right', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
    },
    { type: 'hide-npc', npcId: 'npc-fractalis-engineer-volt' },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_FRACTALIS_ENGINEER_MET } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act3-zapdos-chase' } },
  ],
});

// route-7 — Zapdos despawns, Jenny reports, route-8 unlocks
registerCutscene({
  id: 'act3-route7-jenny-scene',
  skippable: false,
  steps: [
    { type: 'hide-npc', npcId: 'npc-zapdos-route7' },
    { type: 'wait', durationMs: 500 },
    { type: 'face-npc', npcId: 'npc-jenny-zapdos-scene', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'npc-engineer-volt-r7',
      lines: [{ en: 'Officer! Did you see a Zapdos here?', he: 'שוטרת! ראית זאפדוס כאן?' }],
    },
    {
      type: 'dialogue',
      speakerName: "Officer Jenny / שוטרת ג'ני",
      speakerId: 'npc-jenny-zapdos-scene',
      lines: [
        {
          en: 'Yes! It was acting very strange — attacking Pokémon and trainers, but kept hesitating. Like it was fighting itself.',
          he: 'כן! הוא התנהג מאוד מוזר — תקף פוקימוני ומאמנים, אבל כל הזמן היסס. כאילו הוא נלחם בעצמו.',
        },
        {
          en: 'It fled toward the mountains. Probably in Route 8 by now.',
          he: 'הוא עף לכיוון ההרים. כנראה בדרך 8 עכשיו.',
        },
        {
          en: "I'll file my report. You can trust the Engineer on this — don't let his calm fool you.",
          he: 'אני אגיש דוח. אפשר לסמוך על המהנדס בנושא הזה — אחרי הכל הוא גם מאמן פוקימונים מאוד חזק ! אל תניח לרוגע שלו להטעות אותך.',
        },
      ],
    },

    {
      type: 'dialogue',
      speakerName: 'Engineer Volt / מהנדס וולט',
      speakerId: 'npc-engineer-volt-r7',
      lines: [
        {
          en: 'Come with me to Route 8. We have to find Zapdos.',
          he: 'בוא איתי לדרך 8. אנחנו חייבים למצוא את זאפדוס.',
        },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'npc-engineer-volt-r7',
      path: ['left', 'left'],
      waitForComplete: false,
    },
    {
      type: 'move-npc',
      npcId: 'npc-jenny-zapdos-scene',
      path: ['left', 'left', 'left'],
      waitForComplete: false,
    },
    { type: 'hide-npc', npcId: 'npc-engineer-volt-r7' },
    { type: 'hide-npc', npcId: 'npc-jenny-zapdos-scene' },
    // setting this flag despawns the route-8 blocker in fractalis/fractalis
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_FRACTALIS_ROUTE7_SCENE_DONE } },
  ],
});

// route-8 — engineer explains Zapdos is being controlled
registerCutscene({
  id: 'act3-route8-arrival',
  skippable: true,
  steps: [
    {
      type: 'dialogue',
      speakerName: 'Engineer Volt / מהנדס וולט',
      speakerId: 'npc-engineer-volt-r8-temp1',
      lines: [
        {
          en: "I've studied Zapdos's migration for twenty years. Its path is always the same — straight to the power station, offload, and leave.",
          he: 'למדתי את נדידת זאפדוס עשרים שנה. המסלול שלו תמיד זהה — ישר לתחנת הכוח, פריקת זרם, ועזיבה.',
        },
        {
          en: 'But this time... something is forcing it to attack. It WANTS to come here — I can feel it. But something else is in control.',
          he: 'אבל הפעם... משהו מכריח אותו לתקוף. הוא רוצה להגיע לכאן — אני מרגיש. אבל משהו אחר שולט בו.',
        },
        {
          en: "Let's find it and stop it.",
          he: 'בוא נמצא אותו ונעצור אותו. אלכס הוא חבר שאני סומך עליו שיעזור לנו , הוא יחסום אותו מצפון',
        },
        {
          en: 'I will try to temp him to arrive to power station by generating some electric current, you should try to block him from the mountain. The current there is the Highest',
          he: 'אני אנסה לפתות אותו להגיע לתחנת הכוח על ידי יצירת זרם חשמלי, אתה צריך לנסות לחסום אותו מההר. הזרם שם הוא הגבוה ביותר',
        },
      ],
    },

    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_FRACTALIS_ROUTE8_ENTERED } },
    { type: 'wait', durationMs: 500 },
  ],
});

// route-8 — Zapdos defeated, NULL-X Core 5 found
registerCutscene({
  id: 'act3-zapdos-core-reveal',
  skippable: true,
  phoneCaller: { en: 'Engineer Volt ', he: 'דון שבריז - המהנדס הראשי' },
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 400 },
    { type: 'overlay', color: '#000000' },
    { type: 'screen-fade', direction: 'in', durationMs: 600 },

    {
      type: 'dialogue',
      speakerId: 'gym-5-fractalis', // the original sprite id of enginner-team leader sir fracti don shavris
      lines: [
        {
          en: "Zapdos is heading to the power station! It offloaded its electrical current — exactly what it's supposed to do.",
          he: 'זאפדוס הגיע לתחנת הכוח! הוא פרק את הזרם החשמלי שלו — בדיוק כפי שהיה אמור.',
        },
        {
          en: "But the way it fought... that wasn't a normal Glitch infection. Zapdos was resisting. It was fighting back against whatever controlled it.",
          he: "אבל האופן שבו נלחם... זה לא היה זיהום גלי'ץ רגיל. זאפדוס התנגד. הוא נלחם נגד מה ששלט בו.",
        },
        {
          en: 'When Zapdos offload current I notice he cary some wiered device - i wasnt able to came closer due to high voltage.',
          he: 'כשזאפדוס פרק את הזרם שמתי לב שהוא נשא מכשיר מוזר - לא הצלחתי להתקרב בגלל המתח הגבוה.',
        },
        {
          en: 'Did you see it? It looked like a core of some sort. It was glowing with electric energy, but it was also... broken. Damaged.',
          he: 'ראית את זה? זה נראה כמו ליבה מסוג מסוים. זה היה זוהר באנרגיה חשמלית, אבל זה גם... שבור. פגום.',
        },
      ],
    },

    // we not giving this item here - its just an hint to that the cores are hidden in the legendary bodies and the player will need free them after/before the league
    // we need post gym battle to find way to update proffesors and Lance about it .
    // { type: 'action', action: { type: 'give-item', itemId: 'null-x-core-5', quantity: 1 } },
    {
      type: 'dialogue',
      speakerName: 'player / שחקן',
      lines: [
        {
          en: 'A broken core? Could it be... one of the NULL-X cores that Lance and Proffesor Oak and Algoritmia talked about?',
          he: 'ליבה שבורה? זה יכול להיות... אחד מליבות ה-NULL-X שדיברו עליהם לאנס, פרופסור אוק ואלגוריטמיה?',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'gym-5-fractalis',
      lines: [
        {
          en: 'Lance from the elite four ? It might worth to tell him about it. He is the only one I know that can handle this kind of information and might know what to do with it.',
          he: 'לאנס מהאליטה? אולי כדאי לספר לו על זה. הוא היחיד שאני מכיר שיכול להתמודד עם סוג כזה של מידע ואולי יודע מה לעשות עם זה.',
        },
        {
          en: 'But first came find to the power station . You told me you here for gym battle , no? So I want inform you that the gym is open now.',
          he: 'אבל קודם בוא נמצא את תחנת הכוח. אמרת שאתה כאן בשביל קרב מכון, לא? אז אני רוצה ליידע אותך שהמכון פתוח עכשיו.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_FRACTALIS_GYM_INVITE } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act3-electric-gym' } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// first arrival at Fractalis
registerStoryEvent({
  id: 'evt-fractalis-enter',
  trigger: { type: 'map-enter', mapId: 'fractalis/fractalis' as MapId },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_FRACTALIS }],
  actions: [
    { type: 'set-flag', flag: FLAGS.VISITED_FRACTALIS },
    { type: 'set-quest', questId: 'main-act3-fractalis' },
    { type: 'set-infection', mapId: 'routes/route-8', value: 'high' },
    { type: 'set-infection', mapId: 'fractalis/fractalis', value: 'high' },
    { type: 'set-infection', mapId: 'routes/route-7', value: 'high' },
    { type: 'set-infection', mapId: 'routes/route-6', value: 'critical' },
    { type: 'set-infection', mapId: 'routes/route-5', value: 'critical' },
    { type: 'set-infection', mapId: 'multiplia/multiplia', value: 'critical' },
    { type: 'set-infection', mapId: 'routes/route-4', value: 'critical' },
    { type: 'set-infection', mapId: 'minusburg/minusburg', value: 'critical' },
    { type: 'set-infection', mapId: 'routes/route-3', value: 'critical' },
    { type: 'set-infection', mapId: 'routes/route-2', value: 'critical' },
    { type: 'set-infection', mapId: 'sumville/sumville', value: 'critical' },
    { type: 'set-infection', mapId: 'routes/route-1', value: 'critical' },
    { type: 'set-infection', mapId: 'dividia/dividia', value: 'critical' },
    // TODO : ADD ALL REST OF CITIES
  ],
});

// wife — one-shot cutscene on first interact
registerStoryEvent({
  id: 'evt-wife-talked',
  trigger: { type: 'npc-interact', npcId: 'npc-fractalis-engineer-wife' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT3_FRACTALIS_WIFE_TALKED }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act3-wife-intro' }],
});

// beach engineer — one-shot intro cutscene
registerStoryEvent({
  id: 'evt-engineer-intro',
  trigger: { type: 'npc-interact', npcId: 'npc-fractalis-engineer-volt' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT3_FRACTALIS_ENGINEER_MET }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act3-engineer-intro' }],
});

// enter route-7 after engineer met → trigger jenny + zapdos scene
registerStoryEvent({
  id: 'evt-route7-zapdos-scene',
  trigger: { type: 'map-enter', mapId: 'routes/route-7' as MapId },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT3_FRACTALIS_ENGINEER_MET },
    { type: 'flag-not', flag: FLAGS.ACT3_FRACTALIS_ROUTE7_SCENE_DONE },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act3-route7-jenny-scene' }],
});

// enter route-8 first time after route-7 scene → engineer arrival
registerStoryEvent({
  id: 'evt-route8-arrival',
  trigger: { type: 'map-enter', mapId: 'routes/route-8' as MapId },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT3_FRACTALIS_ROUTE7_SCENE_DONE },
    { type: 'flag-not', flag: FLAGS.ACT3_FRACTALIS_ROUTE8_ENTERED },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act3-route8-arrival' }],
});

// Zapdos defeated → give core + trigger reveal cutscene
registerStoryEvent({
  id: 'evt-zapdos-defeated',
  trigger: { type: 'trainer-defeated', trainerId: 'npc-zapdos-route8' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT3_FRACTALIS_ZAPDOS_DEFEATED }], // blocker flag for gym entrance from house and route-8
  actions: [
    { type: 'set-flag', flag: FLAGS.ACT3_FRACTALIS_ZAPDOS_DEFEATED },
    { type: 'start-cutscene', cutsceneId: 'act3-zapdos-core-reveal' },
  ],
});
