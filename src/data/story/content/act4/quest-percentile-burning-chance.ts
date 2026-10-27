/**
 * ACT 4: Percentile — "The Burning Chance"
 * ─────────────────────────────────────────────────────────────────────────────
 * NULL-X wants a world with no randomness. Team Rocket's Heat Collectors on the
 * Route 12 hills feed on two glitched legendaries (Entei + Moltres) and broadcast
 * NULL-X code: in Percentile, the city of chance, coins stop being random and the
 * heat keeps rising. A secret steam plant under the Route 11 cave (glitched Suicune +
 * caged fire Pokémon) powers the whole thing. The city stories are the symptoms.
 *
 * STORY BEATS (in order):
 *   1. Enter Percentile → Prof. Algorithma calls. Percentile + Route 12 infection → critical.
 *   2. Three clues, any order:
 *        library       coin kid — 10 heads in a row (1 in 1024)
 *        ball-storage  Rocket thief → Mos: the grunt dropped a map of the hills
 *        family-house  Erika — Jimmy's Growlithe ran toward the heat
 *   3. All clues → lab: Researcher Noa (10%/hour heat), Dr. Gal (hills + steam pipes under
 *      Route 11), Algorithma explains the cores. The Route 11 cave lookout leaves.
 *   4. Rocket Base (route-11-cave → cave yard tower → rocket-base/b1..b4): grunts, caged fire
 *      Pokémon in generators, Jessie & James on B3, glitched Suicune on B4 (flees < 90% HP)
 *      → Core X4 (Flow). Emergency hatch back to Route 11.
 *   5. Reminder waits by the closed gym door → rival battle.
 *   6. Route 12: 3 Heat Collector guards → admin's shield drops (needs Suicune freed too).
 *   7. Admin Kelvin beaten → Reminder holds the path, Max Formax vs Moltres (scripted), Entei
 *      appears, then rain — Suicune surfs in to help.
 *   8. Entei beaten → Core X5 (Chance). Max is worn out, gives the fire-triangle hint.
 *   9. Moltres beaten → Core X6 (Energy), Rocket gone, area infection −2 levels, ocean opens.
 *  10. Lab: Oak scans the 6 cores → "87% chance the next signal is under Minusburg".
 *  11. Leaving the lab → Lance lands, Jenny on the phone, gym opens.
 *  12. Badge 7 (+ HM02 Fly) → Minusburg blockade lifts.
 *
 * NPC IDs:
 *   percentile   npc-pct-reminder, npc-pct-gym-closed, npc-pct-lance
 *   library      npc-pct-coin-kid
 *   ball-storage npc-pct-ball-thief
 *   lab          npc-pct-oak
 *   route-11     npc-r11-rocket-lookout (on the cave door until the lab beat)
 *   rocket-base  b1–b4 grunts, npc-base-b2-gen-1..4 (generators), npc-base-jessie, npc-base-james,
 *                wild-base-suicune, npc-base-b4-hatch
 *   route-12     npc-pct-guard-1..3 (Heat Collectors), npc-pct-grunt-4..5, npc-pct-admin-shield,
 *                npc-pct-admin, npc-pct-reminder-r12, npc-pct-max, wild-pct-entei,
 *                npc-pct-moltres-fight, wild-pct-moltres, npc-pct-suicune-ally
 */

import { registerCutscene, type CutsceneStep } from '../../cutscenes.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { registerQuest } from '../../quests.js';
import { MapId } from '../../../maps/map-ids.js';

const CITY = MapId.PERCENTILE_PERCENTILE;
const R12 = MapId.ROUTES_ROUTE_12;

/** Everything the arc's glitch touched — drops 2 infection levels when Moltres is beaten. */
const ARC_AREA: MapId[] = [
  CITY,
  R12,
  MapId.ROUTES_ROUTE_11,
  MapId.ROUTES_ROUTE_11_CAVE,
  MapId.ROUTES_ROUTE_11_CAVE_EXIT,
  MapId.ROCKET_BASE_B1,
  MapId.ROCKET_BASE_B2,
  MapId.ROCKET_BASE_B3,
  MapId.ROCKET_BASE_B4,
];

const PLAYER = 'Player / שחקן';
const ALGORITHMA = 'Prof. Algorithma / פרופ׳ אלגוריתמה';
const MAX = 'Max Formax / מקס פורמקס';

const CLUE_FLAGS = [FLAGS.ACT4_PCT_CLUE_COIN, FLAGS.ACT4_PCT_CLUE_MAP, FLAGS.ACT4_PCT_CLUE_GROWLITHE];
const GUARD_IDS = ['npc-pct-guard-1', 'npc-pct-guard-2', 'npc-pct-guard-3'];
const GUARD_FLAGS = GUARD_IDS.map((id) => `trainer-${id}-defeated`);

const ENTEI = 244;
const SUICUNE = 245;
const MOLTRES = 146;
const ARCANINE = 59;
const GROWLITHE = 58;
const DRAGONITE = 149;

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act4-pct-clues',
  title: { en: 'Strange Days in Percentile', he: 'ימים מוזרים בפרסנטייל' },
  objective: {
    en: 'The city is too hot and luck acts weird. Ask people in town what they saw!',
    he: 'העיר חמה מדי והמזל מתנהג מוזר. שאל אנשים בעיר מה הם ראו!',
  },
});

registerQuest({
  id: 'main-act4-pct-lab',
  title: { en: 'Back to the Lab', he: 'חזרה למעבדה' },
  objective: {
    en: 'You found 3 clues! Bring them to Researcher Noa at the lab',
    he: 'מצאת 3 רמזים! הבא אותם לחוקרת נועה במעבדה',
  },
});

registerQuest({
  id: 'main-act4-pct-base',
  title: { en: 'The Secret Steam Plant', he: 'מפעל הקיטור הסודי' },
  objective: {
    en: 'Go back to the cave on Route 11 — Team Rocket hides something inside!',
    he: 'חזור למערה בדרך 11 — צוות רוקט מסתיר שם משהו!',
  },
});

registerQuest({
  id: 'main-act4-pct-base-core',
  title: { en: 'Deeper into the Base', he: 'עמוק יותר בבסיס' },
  objective: {
    en: 'Jessie and James blasted off! Take the stairs down to the steam core',
    he: 'ג\'סי וג\'יימס עפו! רד במדרגות אל ליבת הקיטור',
  },
});

registerQuest({
  id: 'main-act4-pct-hills',
  title: { en: 'To the Burning Hills!', he: 'אל הגבעות הבוערות!' },
  objective: {
    en: 'The road is open! Go north to Route 12 and shut down the 3 Heat Collectors',
    he: 'הדרך פתוחה! צא צפונה לדרך 12 וכבה את 3 אוספי החום',
  },
});

registerQuest({
  id: 'main-act4-pct-admin',
  title: { en: 'The Shield Is Down!', he: 'המגן נפל!' },
  objective: {
    en: 'Climb the hill path on Route 12 and beat Admin Kelvin',
    he: 'טפס בשביל הגבעה בדרך 12 ונצח את האדמין קלווין',
  },
});

registerQuest({
  id: 'main-act4-pct-legends',
  title: { en: 'Fire on the Hilltop', he: 'אש על ראש הגבעה' },
  objective: {
    en: 'Max needs help! Battle Entei on the hilltop',
    he: 'מקס צריך עזרה! הילחם באנטאיי על ראש הגבעה',
  },
});

registerQuest({
  id: 'main-act4-pct-moltres',
  title: { en: 'Help Max!', he: 'עזור למקס!' },
  objective: {
    en: 'Max is worn out — now battle Moltres!',
    he: 'מקס מותש — עכשיו הילחם במולטרס!',
  },
});

registerQuest({
  id: 'main-act4-pct-cores-lab',
  title: { en: 'Six Cores!', he: 'שש ליבות!' },
  objective: {
    en: 'Bring the cores to the lab in Percentile',
    he: 'הבא את הליבות למעבדה בפרסנטייל',
  },
});

registerQuest({
  id: 'main-act4-pct-badge',
  title: { en: 'The Fire Gym', he: 'מכון האש' },
  objective: {
    en: 'The gym is open! Beat Max Formax and win badge 7',
    he: 'המכון פתוח! נצח את מקס פורמקס וזכה בתג 7',
  },
});

registerQuest({
  id: 'main-act5-minusburg',
  title: { en: 'Back to Minusburg', he: 'חזרה למינוסבורג' },
  objective: {
    en: 'Fly to Minusburg — Officer Jenny and Lance are waiting',
    he: "עוף למינוסבורג — השוטרת ג'ני ולאנס מחכים",
  },
});

// ── Beat 1: Algorithma calls → the arc starts ───────────────────────────────

registerStoryEvent({
  id: 'evt-pct-arc-start',
  trigger: { type: 'map-enter', mapId: CITY },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT4_PCT_ARC_STARTED }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-algorithma-call' }],
});

registerCutscene({
  id: 'cutscene-pct-algorithma-call',
  phoneCaller: { en: 'Prof. Algorithma', he: "פרופ' אלגוריתמה" },
  steps: [
    {
      type: 'dialogue',
      speakerId: 'Prof.Algorithma',
      speakerName: ALGORITHMA,
      lines: [
        { en: 'You made it to Percentile! Listen — my sensors are going crazy.', he: 'הגעת לפרסנטייל! תקשיב — החיישנים שלי משתגעים.' },
        { en: 'The heat around the city keeps rising, and something even stranger...', he: 'החום סביב העיר ממשיך לעלות, ויש משהו עוד יותר מוזר...' },
        { en: "Chance itself is acting wrong. Random things aren't random anymore!", he: 'הסיכוי עצמו מתנהג לא נכון. דברים אקראיים כבר לא אקראיים!' },
        { en: 'That smells like NULL-X. Ask around — the library, the ball storage, the family house.', he: 'זה מריח כמו נאל-איקס. תשאל בעיר — בספרייה, במחסן הכדורים, בבית המשפחה.' },
        { en: 'And be careful: every wild Pokémon around here may be glitched.', he: 'ותיזהר: כל פוקימון בר כאן עלול להיות נגוע.' },
      ],
    },
    { type: 'action', action: { type: 'set-infection', mapId: CITY, value: 'critical' } },
    { type: 'action', action: { type: 'set-infection', mapId: R12, value: 'critical' } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act4-percentile' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act4-pct-clues' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_ARC_STARTED } },
  ],
});

// ── Beat 2a: Library — the coin that always lands heads ─────────────────────

registerStoryEvent({
  id: 'evt-pct-clue-coin',
  trigger: { type: 'npc-interact', npcId: 'npc-pct-coin-kid' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT4_PCT_CLUE_COIN }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-clue-coin' }],
});

registerCutscene({
  id: 'cutscene-pct-clue-coin',
  steps: [
    { type: 'face-npc', npcId: 'npc-pct-coin-kid', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'npc-pct-coin-kid',
      speakerName: 'Omer / עומר',
      lines: [
        { en: 'Heads. Heads. Heads... HEADS! Ten times in a row!', he: 'עץ. עץ. עץ... עץ! עשר פעמים ברצף!' },
        { en: "A coin is 50/50. Getting heads 10 times should almost never happen!", he: 'מטבע הוא 50/50. לקבל עץ 10 פעמים כמעט אף פעם לא אמור לקרות!' },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-percentile-librarian',
      speakerName: 'Grand Lea / סבתא לאה',
      lines: [
        { en: 'He is right. Half × half × half... ten times. That is 1 in 1024 — about 0.1%.', he: 'הוא צודק. חצי × חצי × חצי... עשר פעמים. זה 1 מתוך 1024 — בערך 0.1%.' },
        { en: 'And my statistics books... every table shows the same number now.', he: 'וספרי הסטטיסטיקה שלי... כל טבלה מראה עכשיו את אותו מספר.' },
        { en: 'Something is erasing chance from our city.', he: 'משהו מוחק את הסיכוי מהעיר שלנו.' },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_CLUE_COIN } },
  ],
});

// ── Beat 2b: Ball storage — Rocket thief + the map ──────────────────────────

registerStoryEvent({
  id: 'evt-pct-clue-map',
  trigger: { type: 'trainer-defeated', trainerId: 'npc-pct-ball-thief' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT4_PCT_CLUE_MAP }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-clue-map' }],
});

// Recovery: thief beaten but the clue was missed (older builds waited for a trigger that never fired)
registerStoryEvent({
  id: 'evt-pct-clue-map-recover',
  trigger: { type: 'map-enter', mapId: MapId.PERCENTILE_BALL_STORAGE },
  conditions: [
    { type: 'flag', flag: 'trainer-npc-pct-ball-thief-defeated' },
    { type: 'flag-not', flag: FLAGS.ACT4_PCT_CLUE_MAP },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-clue-map' }],
});

registerCutscene({
  id: 'cutscene-pct-clue-map',
  steps: [
    {
      type: 'dialogue',
      speakerId: 'npc-percentile-ball-keeper',
      speakerName: 'Storekeeper Mos / מחסנאי מוס',
      lines: [
        { en: 'Thank you! The storeroom is so hot the balls almost melted.', he: 'תודה! המחסן כל כך חם שהכדורים כמעט נמסו.' },
        { en: 'Look — that grunt dropped a map. The Route 12 hills, with three marks on it.', he: 'תראה — הסוכן הזה הפיל מפה. הגבעות של דרך 12, עם שלושה סימונים.' },
        { en: '"Heat Collector 1, 2, 3"... Whatever that is, it\'s up there.', he: '"אוסף חום 1, 2, 3"... מה שזה לא יהיה, זה שם למעלה.' },
        { en: 'And a fourth mark, far away: "Steam Plant — Route 11 cave". Strange...', he: 'וסימון רביעי, רחוק: "מפעל קיטור — מערת דרך 11". מוזר...' },
        { en: 'Take some Ultra Balls. You will need them more than the thieves!', he: 'קח כמה כדורי אולטרה. אתה תצטרך אותם יותר מהגנבים!' },
      ],
    },
    { type: 'action', action: { type: 'give-item', itemId: 'ultra-ball', quantity: 3 } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_CLUE_MAP } },
  ],
});

// ── Beat 2c: Family house — the missing Growlithe ───────────────────────────

registerStoryEvent({
  id: 'evt-pct-clue-growlithe',
  trigger: { type: 'npc-interact', npcId: 'npc-percentile-mom' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT4_PCT_ARC_STARTED },
    { type: 'flag-not', flag: FLAGS.ACT4_PCT_CLUE_GROWLITHE },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-clue-growlithe' }],
});

// Recovery: Erika already talked to (gift given) but the clue scene never ran
registerStoryEvent({
  id: 'evt-pct-clue-growlithe-recover',
  trigger: { type: 'map-enter', mapId: MapId.PERCENTILE_FAMILY_HOUSE },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT4_PCT_ARC_STARTED },
    { type: 'flag', flag: 'npc-npc-percentile-mom-rewarded' },
    { type: 'flag-not', flag: FLAGS.ACT4_PCT_CLUE_GROWLITHE },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-clue-growlithe' }],
});

registerCutscene({
  id: 'cutscene-pct-clue-growlithe',
  steps: [
    {
      type: 'dialogue',
      speakerId: 'npc-percentile-mom',
      speakerName: 'Erika / אריקה',
      lines: [
        { en: "Oh — and one more thing. Jimmy's Growlithe ran away this morning.", he: "אה — ועוד דבר. הגרוליית' של ג'ימי ברח הבוקר." },
        { en: 'It smelled the heat and ran north, toward the hills on Route 12.', he: 'הוא הריח את החום ורץ צפונה, לכיוון הגבעות של דרך 12.' },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-percentile-candy-kid',
      speakerName: 'Jimmy / ג׳ימי',
      lines: [{ en: 'If you go up there... please look for him!', he: 'אם אתה עולה לשם... בבקשה תחפש אותו!' }],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_CLUE_GROWLITHE } },
  ],
});

// ── Beat 2 → 3: all three clues → go to the lab ─────────────────────────────

// Saves from a build that had "A Clue!" / "One More Clue" quests go back to the clue quest
for (const oldQuestId of ['main-act4-pct-clues-2', 'main-act4-pct-clues-3']) {
  registerStoryEvent({
    id: `evt-pct-old-quest-${oldQuestId}`,
    trigger: { type: 'map-enter', mapId: '*' },
    conditions: [{ type: 'quest-active', questId: oldQuestId }],
    actions: [{ type: 'set-quest', questId: 'main-act4-pct-clues' }],
  });
}

for (const clue of CLUE_FLAGS) {
  registerStoryEvent({
    id: `evt-pct-clues-done-${clue}`,
    trigger: { type: 'flag-set', flag: clue },
    conditions: [
      { type: 'flags-count', flags: CLUE_FLAGS, min: 3 },
      { type: 'flag-not', flag: FLAGS.ACT4_PCT_CLUES_DONE },
    ],
    actions: [
      {
        type: 'show-message',
        lines: [
          { en: 'Broken chance... rising heat... the hills of Route 12. Time to visit the lab!', he: 'סיכוי שבור... חום עולה... הגבעות של דרך 12. הגיע הזמן לבקר במעבדה!' },
        ],
      },
      { type: 'complete-quest', questId: 'main-act4-pct-clues' },
      { type: 'set-quest', questId: 'main-act4-pct-lab' },
      { type: 'set-flag', flag: FLAGS.ACT4_PCT_CLUES_DONE },
    ],
  });
}

// ── Beat 3: Lab — the heat math + the cores explained ───────────────────────

registerStoryEvent({
  id: 'evt-pct-lab',
  trigger: { type: 'npc-interact', npcId: 'npc-percentile-lab-researcher' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT4_PCT_CLUES_DONE },
    { type: 'flag-not', flag: FLAGS.ACT4_PCT_LAB_DONE },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-lab' }],
});

registerCutscene({
  id: 'cutscene-pct-lab',
  steps: [
    {
      type: 'dialogue',
      speakerId: 'npc-percentile-lab-researcher',
      speakerName: 'Researcher Noa / החוקרת נועה',
      lines: [
        { en: 'A coin, a map and a runaway Growlithe? It all fits my readings!', he: 'מטבע, מפה וגרוליית\' שברח? הכל מתאים למדידות שלי!' },
        { en: 'The heat grows by 10% every hour — 10% of what it already is.', he: 'החום גדל ב-10% כל שעה — 10% ממה שכבר יש.' },
        { en: '100 → 110 → 121 → 133 → 146 → 161 → 177 → 195...', he: '100 → 110 → 121 → 133 → 146 → 161 → 177 → 195...' },
        { en: 'In about 7 hours it doubles! Growth on top of growth gets fast.', he: 'בעוד בערך 7 שעות הוא יוכפל! גדילה על גבי גדילה נהיית מהירה.' },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-percentile-beldum-trader',
      speakerName: 'Dr. Gal / ד"ר גל',
      lines: [
        { en: 'I traced the source. Two huge heat signals, up on the Route 12 hills.', he: 'איתרתי את המקור. שני אותות חום ענקיים, למעלה בגבעות של דרך 12.' },
        { en: 'But the machines get their power from somewhere else — steam pipes, running under the Route 11 cave!', he: 'אבל המכונות מקבלות כוח ממקום אחר — צינורות קיטור, שעוברים מתחת למערה של דרך 11!' },
        { en: 'Hold on — Professor Algorithma is calling the lab screen.', he: 'רגע — פרופסור אלגוריתמה מתקשר למסך של המעבדה.' },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof.Algorithma',
      speakerName: ALGORITHMA,
      lines: [
        { en: 'Two hot signals and a steam plant... that could be three cores! Let me explain what you are collecting.', he: 'שני אותות חמים ומפעל קיטור... אלה יכולות להיות שלוש ליבות! תן לי להסביר מה אתה אוסף.' },
        { en: 'NULL-X was built from 8 modules. Each core is one of them — one piece of its equation.', he: 'נאל-איקס נבנה משמונה מודולים. כל ליבה היא אחד מהם — חלק אחד מהמשוואה שלו.' },
        { en: 'NULL-X hides its cores inside legendary Pokémon. Only they are strong enough to hold one.', he: 'נאל-איקס מסתיר את הליבות שלו בתוך פוקימונים אגדיים. רק הם חזקים מספיק כדי להחזיק אחת.' },
        { en: 'The glitch you see on them is the core\'s code leaking out. Beat them, and the core falls free.', he: 'הגליץ\' שאתה רואה עליהם הוא הקוד של הליבה שדולף החוצה. תנצח אותם, והליבה משתחררת.' },
        { en: 'One core up there must be the CHANCE module — it is erasing randomness.', he: 'ליבה אחת שם למעלה היא כנראה מודול הסיכוי — הוא מוחק את האקראיות.' },
        { en: 'The other is the ENERGY module — it is feeding on heat.', he: 'השנייה היא מודול האנרגיה — היא ניזונה מחום.' },
        { en: 'But first, cut the power. Find that steam plant under the Route 11 cave!', he: 'אבל קודם, תנתק את הכוח. מצא את מפעל הקיטור מתחת למערה של דרך 11!' },
      ],
    },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act4-pct-lab' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act4-pct-base' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_LAB_DONE } },
  ],
});

// ── Beat 4: Rocket Base — steam plant under the Route 11 cave ───────────────

registerStoryEvent({
  id: 'evt-pct-base-enter',
  trigger: { type: 'map-enter', mapId: MapId.ROCKET_BASE_B1 },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT4_PCT_BASE_ENTERED }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-base-enter' }],
});

registerCutscene({
  id: 'cutscene-pct-base-enter',
  steps: [
    { type: 'screen-shake', durationMs: 500, intensity: 0.6 },
    { type: 'wait', durationMs: 500 },
    {
      type: 'dialogue',
      speakerName: PLAYER,
      lines: [
        { en: 'A secret Team Rocket base, hidden under the cave!', he: 'בסיס סודי של צוות רוקט, מוסתר מתחת למערה!' },
        { en: 'The floor is warm... the steam plant must be deep below.', he: 'הרצפה חמה... מפעל הקיטור בטח עמוק למטה.' },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_BASE_ENTERED } },
  ],
});

// Jessie + James both beaten on B3 → they blast off
for (const trainerId of ['npc-base-jessie', 'npc-base-james']) {
  registerStoryEvent({
    id: `evt-pct-base-jj-${trainerId}`,
    trigger: { type: 'trainer-defeated', trainerId },
    conditions: [
      { type: 'flag', flag: 'trainer-npc-base-jessie-defeated' },
      { type: 'flag', flag: 'trainer-npc-base-james-defeated' },
      { type: 'flag-not', flag: FLAGS.ACT4_PCT_BASE_JJ_DONE },
    ],
    actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-base-jj' }],
  });
}

registerCutscene({
  id: 'cutscene-pct-base-jj',
  steps: [
    {
      type: 'dialogue',
      speakerId: 'rocket-jessi',
      speakerName: "Jessie / ג'סי",
      lines: [{ en: 'Our steam plant! Our perfect plan!', he: 'מפעל הקיטור שלנו! התוכנית המושלמת שלנו!' }],
    },
    {
      type: 'dialogue',
      speakerId: 'rocket-james',
      speakerName: "James / ג'יימס",
      lines: [
        { en: 'Suicune is still down in the core... the boss will be furious!', he: 'סוויקון עדיין למטה בליבה... הבוס יתעצבן נורא!' },
        { en: "Team Rocket's blasting off agaaaain!", he: 'צוות רוקט עף שוב פעםםם!' },
      ],
    },
    { type: 'screen-shake', durationMs: 600, intensity: 1.2 },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act4-pct-base' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act4-pct-base-core' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_BASE_JJ_DONE } },
  ],
});

// B4 — Suicune chained to the steam engine
registerStoryEvent({
  id: 'evt-pct-b4-enter',
  trigger: { type: 'map-enter', mapId: MapId.ROCKET_BASE_B4 },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT4_PCT_B4_SEEN }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-b4-enter' }],
});

registerCutscene({
  id: 'cutscene-pct-b4-enter',
  steps: [
    { type: 'camera-snap', x: 12, y: 7 },
    { type: 'fx', kind: 'smoke', at: { npcId: 'wild-base-suicune' }, durationMs: 1800, radius: 2 },
    { type: 'play-sfx', sfxId: `cry:${SUICUNE}` },
    { type: 'screen-shake', durationMs: 700, intensity: 1 },
    { type: 'wait', durationMs: 900 },
    {
      type: 'dialogue',
      speakerName: PLAYER,
      lines: [
        { en: 'Suicune — the Pokémon that purifies water — chained to a steam engine!', he: 'סוויקון — הפוקימון שמטהר מים — כבול למנוע קיטור!' },
        { en: 'The glitch is all over it. It is boiling water for the whole base...', he: 'הגליץ\' על כולו. הוא מרתיח מים בשביל כל הבסיס...' },
        { en: 'If I weaken it, the chains should break!', he: 'אם אחליש אותו, השרשראות אמורות להישבר!' },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_B4_SEEN } },
  ],
});

// Suicune flees (below 90% HP) → Core X4, generators stop, hatch opens
registerStoryEvent({
  id: 'evt-pct-suicune-defeated',
  trigger: { type: 'trainer-defeated', trainerId: 'wild-base-suicune' },
  actions: [
    { type: 'give-item', itemId: 'core-x4', quantity: 1 },
    { type: 'start-cutscene', cutsceneId: 'cutscene-pct-suicune-freed' },
  ],
});

registerCutscene({
  id: 'cutscene-pct-suicune-freed',
  steps: [
    { type: 'play-sfx', sfxId: `cry:${SUICUNE}` },
    { type: 'screen-shake', durationMs: 800, intensity: 1.4 },
    { type: 'fx', kind: 'burst', at: { x: 12, y: 7 }, durationMs: 400, radius: 2 },
    { type: 'pokemon-anim', pokemonId: SUICUNE, motion: 'walk', from: 'player', path: ['up', 'up', 'up', 'up'] },
    { type: 'play-sfx', sfxId: 'item-found' },
    {
      type: 'dialogue',
      speakerName: PLAYER,
      lines: [
        { en: 'The chains broke and Suicune ran free... and it dropped NULL-X Core X4!', he: 'השרשראות נשברו וסוויקון ברח לחופשי... והוא הפיל את ליבת נאל-איקס X4!' },
        { en: 'The generators are going quiet. The fire Pokémon are free too!', he: 'הגנרטורים משתתקים. גם פוקימוני האש חופשיים!' },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof.Algorithma',
      speakerName: ALGORITHMA,
      lines: [
        { en: 'I see it on my screen — Core X4, the FLOW module! It controls water and steam.', he: 'אני רואה את זה על המסך — ליבה X4, מודול הזרימה! הוא שולט במים ובקיטור.' },
        { en: 'Without the steam, the Heat Collectors on Route 12 are much weaker. Now is our chance!', he: 'בלי הקיטור, אוספי החום בדרך 12 הרבה יותר חלשים. זה הסיכוי שלנו!' },
        { en: 'The fire is weaker now — the police opened the road from Percentile to Route 12.', he: 'האש נחלשה — המשטרה פתחה את הדרך מפרסנטייל לדרך 12.' },
        { en: 'There is an emergency hatch on this floor — it leads straight outside.', he: 'יש פתח חירום בקומה הזאת — הוא מוביל ישר החוצה.' },
      ],
    },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act4-pct-base-core' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act4-pct-hills' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_SUICUNE_DONE } },
  ],
});

// ── Beat 5: Reminder at the closed gym ──────────────────────────────────────

registerStoryEvent({
  id: 'evt-pct-reminder-beaten',
  trigger: { type: 'trainer-defeated', trainerId: 'npc-pct-reminder' },
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-reminder-beaten' }],
});

registerCutscene({
  id: 'cutscene-pct-reminder-beaten',
  steps: [
    {
      type: 'dialogue',
      speakerId: 'rival-reminder',
      speakerName: 'Rei Minder / ריי מיינדר',
      lines: [
        { en: "Okay, okay — you win this round.", he: 'בסדר, בסדר — ניצחת בסיבוב הזה.' },
        { en: "But I'll beat you to the hills! Last one up there is a Slowpoke!", he: 'אבל אני אגיע לגבעות לפניך! מי שמגיע אחרון הוא סלופוק!' },
      ],
    },
  ],
});

// ── Beat 5: Route 12 — first look at the burning hills ──────────────────────

registerStoryEvent({
  id: 'evt-pct-r12-enter',
  trigger: { type: 'map-enter', mapId: R12 },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT4_PCT_ARC_STARTED },
    { type: 'flag-not', flag: FLAGS.ACT4_PCT_R12_ENTERED },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-r12-enter' }],
});

registerCutscene({
  id: 'cutscene-pct-r12-enter',
  steps: [
    { type: 'camera-snap', x: 36, y: 31 },
    { type: 'fx', kind: 'fire', at: { x: 34, y: 30 }, durationMs: 2600, radius: 3 },
    { type: 'fx', kind: 'smoke', at: { x: 38, y: 28 }, durationMs: 2600, radius: 3 },
    { type: 'screen-shake', durationMs: 900, intensity: 1 },
    { type: 'wait', durationMs: 1400 },
    {
      type: 'dialogue',
      speakerName: 'Rocket radio / קשר של רוקט',
      lines: [
        { en: '*krrk* ...Collectors at 80%... the two big ones are burning nicely... *krrk*', he: '*קרררק* ...האוספים על 80%... שני הגדולים בוערים יפה... *קרררק*' },
        { en: '*krrk* ...keep everyone off the hills. Admin Kelvin\'s orders. *krrk*', he: '*קרררק* ...אף אחד לא עולה לגבעות. פקודה של האדמין קלווין. *קרררק*' },
      ],
    },
    {
      type: 'dialogue',
      speakerName: PLAYER,
      lines: [{ en: 'The hills are on fire... Every wild Pokémon here could be glitched.', he: 'הגבעות בוערות... כל פוקימון בר כאן עלול להיות נגוע.' }],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_R12_ENTERED } },
  ],
});

// ── Beat 5 → 6: all 3 Heat Collectors down (after the lab beat) → shield drops ──

const MACHINES_OFF_CONDITIONS = [
  ...GUARD_FLAGS.map((flag) => ({ type: 'flag' as const, flag })),
  { type: 'flag' as const, flag: FLAGS.ACT4_PCT_SUICUNE_DONE },
  { type: 'flag-not' as const, flag: FLAGS.ACT4_PCT_MACHINES_OFF },
];

for (const guardId of GUARD_IDS) {
  registerStoryEvent({
    id: `evt-pct-machines-off-${guardId}`,
    trigger: { type: 'trainer-defeated', trainerId: guardId },
    conditions: MACHINES_OFF_CONDITIONS,
    actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-machines-off' }],
  });
}

// Guards beaten before Suicune is freed: SUICUNE_DONE is set inside a cutscene, so just
// drop the shield here (no second cutscene while one is running).
registerStoryEvent({
  id: 'evt-pct-machines-off-after-suicune',
  trigger: { type: 'flag-set', flag: FLAGS.ACT4_PCT_SUICUNE_DONE },
  conditions: MACHINES_OFF_CONDITIONS,
  actions: [
    { type: 'complete-quest', questId: 'main-act4-pct-hills' },
    { type: 'set-quest', questId: 'main-act4-pct-admin' },
    { type: 'set-flag', flag: FLAGS.ACT4_PCT_MACHINES_OFF },
  ],
});

registerCutscene({
  id: 'cutscene-pct-machines-off',
  steps: [
    { type: 'screen-shake', durationMs: 700, intensity: 1.2 },
    { type: 'wait', durationMs: 700 },
    {
      type: 'dialogue',
      speakerName: PLAYER,
      lines: [
        { en: 'All three Heat Collectors are dark. The admin\'s shield must be down!', he: 'כל שלושת אוספי החום כבו. המגן של האדמין בטח נפל!' },
      ],
    },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act4-pct-hills' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act4-pct-admin' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_MACHINES_OFF } },
  ],
});

// ── Beat 6: Admin beaten → Max Formax vs Moltres, Entei joins ──────────────

registerStoryEvent({
  id: 'evt-pct-admin-defeated',
  trigger: { type: 'trainer-defeated', trainerId: 'npc-pct-admin' },
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-hilltop' }],
});

/** One scripted attack: sound, flash at the target, flames, shake. */
function attack(moveName: string, targetNpcId: string, cryOf: number): CutsceneStep[] {
  return [
    { type: 'play-sfx', sfxId: `move:${moveName}` },
    { type: 'fx', kind: 'burst', at: { npcId: targetNpcId }, durationMs: 400, radius: 1.5 },
    { type: 'fx', kind: 'fire', at: { npcId: targetNpcId }, durationMs: 1200, radius: 1.5 },
    { type: 'screen-shake', durationMs: 500, intensity: 1.3 },
    { type: 'wait', durationMs: 600 },
    { type: 'play-sfx', sfxId: `cry:${cryOf}` },
    { type: 'fx', kind: 'smoke', at: { npcId: targetNpcId }, durationMs: 900 },
    { type: 'wait', durationMs: 700 },
  ];
}

registerCutscene({
  id: 'cutscene-pct-hilltop',
  steps: [
    { type: 'face-npc', npcId: 'npc-pct-reminder-r12', dir: 'left' },
    {
      type: 'dialogue',
      speakerId: 'npc-pct-reminder-r12',
      speakerName: 'Rei Minder / ריי מיינדר',
      lines: [
        { en: 'You did it! The other grunts are running — I\'ll keep them off your back.', he: 'עשית את זה! שאר הסוכנים בורחים — אני אדאג שלא יפריעו לך.' },
        { en: 'Go up to the plateau. Something huge is up there!', he: 'תעלה לרמה. משהו ענק נמצא שם למעלה!' },
      ],
    },
    // Reminder leaves; Max, Entei and Moltres appear on the plateau
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_ADMIN_DEFEATED } },
    { type: 'screen-fade', direction: 'out', durationMs: 300 },
    { type: 'camera-snap', x: 37, y: 30 },
    { type: 'screen-fade', direction: 'in', durationMs: 300 },
    { type: 'play-sfx', sfxId: `cry:${MOLTRES}` },
    { type: 'fx', kind: 'fire', at: { npcId: 'npc-pct-moltres-fight' }, durationMs: 1500, radius: 2 },
    { type: 'wait', durationMs: 800 },
    {
      type: 'dialogue',
      speakerId: 'npc-pct-max',
      speakerName: MAX,
      lines: [{ en: 'You will not burn my city, Moltres! Arcanine — Flame Wheel!', he: 'לא תשרוף את העיר שלי, מולטרס! ארקנין — גלגל להבה!' }],
    },
    { type: 'pokemon-anim', pokemonId: ARCANINE, motion: 'walk', from: { npcId: 'npc-pct-max' }, path: ['up', 'up'] },
    ...attack('Flame Wheel', 'npc-pct-moltres-fight', MOLTRES),
    {
      type: 'dialogue',
      speakerName: 'Moltres / מולטרס',
      lines: [{ en: 'Kyaaaaah!! (It shrugs off the flames — fire only feeds it!)', he: 'קיאאאאה!! (הוא מתעלם מהלהבות — אש רק מזינה אותו!)' }],
    },
    ...attack('Fire Blast', 'npc-pct-max', ARCANINE),
    { type: 'play-sfx', sfxId: `cry:${ENTEI}` },
    { type: 'fx', kind: 'fire', at: { npcId: 'wild-pct-entei' }, durationMs: 1500, radius: 2 },
    { type: 'screen-shake', durationMs: 800, intensity: 1.6 },
    { type: 'wait', durationMs: 900 },
    {
      type: 'dialogue',
      speakerId: 'npc-pct-max',
      speakerName: MAX,
      lines: [
        { en: 'Entei too?! I cannot hold both of them!', he: 'גם אנטאיי?! אני לא יכול להחזיק את שניהם!' },
      ],
    },
    // Suicune — freed in the Rocket Base — surfs in on the rain
    { type: 'fx', kind: 'rain', at: { x: 37, y: 30 }, durationMs: 9000, radius: 10 },
    { type: 'wait', durationMs: 800 },
    { type: 'play-sfx', sfxId: `cry:${SUICUNE}` },
    { type: 'pokemon-anim', pokemonId: SUICUNE, motion: 'surf', from: { npcId: 'npc-pct-max' }, path: ['left', 'left', 'left', 'left'] },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_SUICUNE_ARRIVED } },
    { type: 'play-sfx', sfxId: 'move:Surf' },
    { type: 'fx', kind: 'smoke', at: { npcId: 'npc-pct-moltres-fight' }, durationMs: 1500, radius: 2 },
    { type: 'fx', kind: 'smoke', at: { npcId: 'wild-pct-entei' }, durationMs: 1500, radius: 2 },
    { type: 'wait', durationMs: 900 },
    {
      type: 'dialogue',
      speakerId: 'npc-pct-max',
      speakerName: MAX,
      lines: [
        { en: 'Rain?! And... Suicune! The one you freed from the steam plant!', he: 'גשם?! ו... סוויקון! זה ששחררת ממפעל הקיטור!' },
        { en: 'Its rain turns their flames into steam. Now we have a chance!', he: 'הגשם שלו הופך את הלהבות שלהם לקיטור. עכשיו יש לנו סיכוי!' },
        { en: 'Young trainer — you take Entei! Suicune and I will keep Moltres busy!', he: 'מאמן צעיר — אתה תיקח את אנטאיי! סוויקון ואני נעסיק את מולטרס!' },
      ],
    },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act4-pct-admin' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act4-pct-legends' } },
  ],
});

// ── Beat 7: Entei beaten → Core X4, Max is worn out ─────────────────────────

registerStoryEvent({
  id: 'evt-pct-entei-defeated',
  trigger: { type: 'trainer-defeated', trainerId: 'wild-pct-entei' },
  actions: [
    { type: 'give-item', itemId: 'core-x5', quantity: 1 },
    { type: 'start-cutscene', cutsceneId: 'cutscene-pct-entei-defeated' },
  ],
});

registerCutscene({
  id: 'cutscene-pct-entei-defeated',
  steps: [
    { type: 'play-sfx', sfxId: 'item-found' },
    {
      type: 'dialogue',
      speakerName: PLAYER,
      lines: [
        { en: 'The glitch left Entei and it ran off... and it dropped NULL-X Core X5!', he: 'הגליץ\' עזב את אנטאיי והוא ברח... והוא הפיל את ליבת נאל-איקס X5!' },
        { en: 'This must be the Chance module.', he: 'זה בטח מודול הסיכוי.' },
      ],
    },
    { type: 'camera-snap', x: 39, y: 30 },
    { type: 'fx', kind: 'rain', at: { x: 37, y: 30 }, durationMs: 6000, radius: 10 },
    ...attack('Overheat', 'npc-pct-max', ARCANINE),
    {
      type: 'dialogue',
      speakerId: 'npc-pct-max',
      speakerName: MAX,
      lines: [
        { en: 'Ugh... Arcanine is down. My whole team is exhausted.', he: 'אוף... ארקנין נפל. כל הצוות שלי מותש.' },
        { en: 'Listen. Fire needs three things: fuel, air and heat. Take one away and the fire goes out.', he: 'תקשיב. אש צריכה שלושה דברים: דלק, אוויר וחום. תוריד אחד והאש כבה.' },
        { en: "Moltres burns on the glitch — that's its fuel. Weaken it and the core will fall out!", he: 'מולטרס בוער על הגליץ\' — זה הדלק שלו. תחליש אותו והליבה תיפול!' },
        { en: 'Your turn, young mathematician!', he: 'תורך, מתמטיקאי צעיר!' },
      ],
    },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act4-pct-legends' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act4-pct-moltres' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_ENTEI_DONE } },
  ],
});

// ── Beat 8: Moltres beaten → Core X5, Rocket gone, the hills cool down ─────

registerStoryEvent({
  id: 'evt-pct-moltres-defeated',
  trigger: { type: 'trainer-defeated', trainerId: 'wild-pct-moltres' },
  actions: [
    { type: 'give-item', itemId: 'core-x6', quantity: 1 },
    { type: 'start-cutscene', cutsceneId: 'cutscene-pct-moltres-defeated' },
  ],
});

registerCutscene({
  id: 'cutscene-pct-moltres-defeated',
  steps: [
    { type: 'play-sfx', sfxId: `cry:${MOLTRES}` },
    { type: 'pokemon-anim', pokemonId: MOLTRES, motion: 'fly', from: { npcId: 'npc-pct-max' }, path: ['up', 'up', 'up', 'up', 'up'] },
    { type: 'play-sfx', sfxId: 'item-found' },
    {
      type: 'dialogue',
      speakerName: PLAYER,
      lines: [
        { en: 'Moltres flew away, free of the glitch... and it dropped NULL-X Core X6!', he: 'מולטרס עף משם, חופשי מהגליץ\'... והוא הפיל את ליבת נאל-איקס X6!' },
      ],
    },
    { type: 'fx', kind: 'smoke', at: { x: 34, y: 30 }, durationMs: 1800, radius: 3 },
    { type: 'wait', durationMs: 1000 },
    { type: 'face-npc', npcId: 'npc-pct-max', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'npc-pct-max',
      speakerName: MAX,
      lines: [
        { en: 'Ho ho! The Heat Collectors lost their power — Team Rocket is running down the hills!', he: 'הו הו! אוספי החום איבדו את הכוח — צוות רוקט בורח במורד הגבעות!' },
        { en: 'Feel that? The air is cooling. Chance is coming back to Percentile.', he: 'מרגיש? האוויר מתקרר. הסיכוי חוזר לפרסנטייל.' },
      ],
    },
    { type: 'pokemon-anim', pokemonId: GROWLITHE, motion: 'walk', from: { npcId: 'npc-pct-max' }, path: ['down'] },
    {
      type: 'dialogue',
      speakerName: PLAYER,
      lines: [
        { en: 'A Growlithe was hiding behind Max — it\'s Jimmy\'s! It follows you happily.', he: 'גרוליית\' הסתתר מאחורי מקס — זה של ג\'ימי! הוא הולך אחריך בשמחה.' },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-pct-max',
      speakerName: MAX,
      lines: [
        { en: 'Take those cores to the lab in the city. Then come to my gym...', he: 'קח את הליבות למעבדה בעיר. ואז בוא למכון שלי...' },
        { en: '...I want to battle the trainer who cooled down two legends!', he: '...אני רוצה להילחם במאמן שקירר שני אגדיים!' },
      ],
    },
    { type: 'play-sfx', sfxId: `cry:${SUICUNE}` },
    {
      type: 'dialogue',
      speakerName: 'Suicune / סוויקון',
      lines: [{ en: '(Suicune looks at you for a moment... then runs off into the rain.)', he: '(סוויקון מביט בך לרגע... ואז רץ אל תוך הגשם.)' }],
    },
    { type: 'pokemon-anim', pokemonId: SUICUNE, motion: 'walk', from: { npcId: 'npc-pct-suicune-ally' }, path: ['left', 'left', 'left', 'left', 'left'] },
    { type: 'move-npc', npcId: 'npc-pct-max', path: ['down', 'down', 'right', 'right'], waitForComplete: true },
    { type: 'hide-npc', npcId: 'npc-pct-max' },
    { type: 'action', action: { type: 'lower-infection', mapIds: ARC_AREA, levels: 2 } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.PERCENTILE_OCEAN_OPEN } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_GROWLITHE_FOUND } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act4-pct-moltres' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act4-pct-cores-lab' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_LEGENDS_DONE } },
  ],
});

// ── Side: Growlithe back home → Charcoal ────────────────────────────────────

registerStoryEvent({
  id: 'evt-pct-growlithe-returned',
  trigger: { type: 'map-enter', mapId: MapId.PERCENTILE_FAMILY_HOUSE },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT4_PCT_GROWLITHE_FOUND },
    { type: 'flag-not', flag: FLAGS.ACT4_PCT_GROWLITHE_RETURNED },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-growlithe-returned' }],
});

registerCutscene({
  id: 'cutscene-pct-growlithe-returned',
  steps: [
    { type: 'pokemon-anim', pokemonId: GROWLITHE, motion: 'walk', path: ['up', 'up'] },
    {
      type: 'dialogue',
      speakerId: 'npc-percentile-candy-kid',
      speakerName: 'Jimmy / ג׳ימי',
      lines: [{ en: 'GROWLITHE! You found him! Thank you, thank you!', he: "גרוליית'! מצאת אותו! תודה, תודה!" }],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-percentile-mom',
      speakerName: 'Erika / אריקה',
      lines: [
        { en: 'We cannot thank you enough. Please take this Charcoal.', he: 'אנחנו לא יודעים איך להודות לך. בבקשה קח את הפחם הזה.' },
        { en: 'A Pokémon holding it gets stronger Fire moves.', he: 'פוקימון שמחזיק אותו מקבל מתקפות אש חזקות יותר.' },
      ],
    },
    { type: 'action', action: { type: 'give-item', itemId: 'charcoal', quantity: 1 } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_GROWLITHE_RETURNED } },
  ],
});

// ── Beat 9: Lab — Oak scans the five cores ──────────────────────────────────

registerStoryEvent({
  id: 'evt-pct-lab-final',
  trigger: { type: 'map-enter', mapId: MapId.PERCENTILE_LAB },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT4_PCT_LEGENDS_DONE },
    { type: 'flag-not', flag: FLAGS.ACT4_PCT_LAB_FINAL },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-lab-final' }],
});

registerCutscene({
  id: 'cutscene-pct-lab-final',
  steps: [
    { type: 'face-npc', npcId: 'npc-pct-oak', dir: 'right' },
    {
      type: 'dialogue',
      speakerId: 'npc-pct-oak',
      speakerName: 'Prof. Oak / פרופ׳ אוק',
      lines: [
        { en: 'There you are! Algorithma sent me the moment the heat dropped.', he: 'הנה אתה! אלגוריתמה שלח אותי ברגע שהחום ירד.' },
        { en: 'Let me scan the cores. X1 from Zapdos, X2 from Raikou, X3 from Articuno...', he: 'תן לי לסרוק את הליבות. X1 מזאפדוס, X2 מראיקו, X3 מארטיקונו...' },
        { en: '...X4 from Suicune, the Flow module. X5 from Entei, Chance. X6 from Moltres, Energy.', he: '...X4 מסוויקון, מודול הזרימה. X5 מאנטאיי, הסיכוי. X6 ממולטרס, האנרגיה.' },
        { en: 'Six of eight! Only two are left.', he: 'שש מתוך שמונה! נשארו רק שתיים.' },
        { en: 'Each core still hums a faint signal, calling to its missing brothers.', he: 'כל ליבה עדיין משדרת אות חלש, שקורא לאחים החסרים שלה.' },
        { en: 'With six signals I can triangulate the next one...', he: 'עם שישה אותות אני יכול למקם את הבא...' },
      ],
    },
    { type: 'screen-shake', durationMs: 300, intensity: 0.6 },
    { type: 'wait', durationMs: 400 },
    {
      type: 'dialogue',
      speakerId: 'npc-pct-oak',
      speakerName: 'Prof. Oak / פרופ׳ אוק',
      lines: [
        { en: "87% chance: the next signal comes from under Minusburg!", he: 'סיכוי של 87%: האות הבא מגיע מתחת למינוסבורג!' },
        { en: 'Hmm, Officer Jenny closed the north side of that city... now I see why.', he: "הממ, השוטרת ג'ני סגרה את הצד הצפוני של העיר הזאת... עכשיו אני מבין למה." },
        { en: 'And the last core... it hides inside NULL-X\'s own tower.', he: 'והליבה האחרונה... היא מסתתרת בתוך המגדל של נאל-איקס עצמו.' },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_LAB_FINAL } },
  ],
});

// ── Beat 10: Leaving the lab — Lance lands, Jenny calls, the gym opens ──────

registerStoryEvent({
  id: 'evt-pct-lance',
  trigger: { type: 'map-enter', mapId: CITY },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT4_PCT_LAB_FINAL },
    { type: 'flag-not', flag: FLAGS.ACT4_PCT_GYM_OPEN },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'cutscene-pct-lance' }],
});

registerCutscene({
  id: 'cutscene-pct-lance',
  steps: [
    { type: 'play-sfx', sfxId: `cry:${DRAGONITE}` },
    { type: 'screen-shake', durationMs: 500, intensity: 0.8 },
    { type: 'wait', durationMs: 500 },
    { type: 'face-npc', npcId: 'npc-pct-lance', dir: 'left' },
    {
      type: 'dialogue',
      speakerId: 'npc-pct-lance',
      speakerName: 'Lance / לאנס',
      lines: [
        { en: 'Good to see you again! Alice told me what you did in the forest.', he: 'טוב לראות אותך שוב! אליס סיפרה לי מה עשית ביער.' },
        { en: 'I saw the fire on the hills from the sky — two legends, and you stopped both.', he: 'ראיתי את האש על הגבעות מהשמיים — שני אגדיים, ועצרת את שניהם.' },
        { en: 'Oak told me about Minusburg. I have been tracking the glitch there with Officer Jenny.', he: "אוק סיפר לי על מינוסבורג. אני עוקב שם אחרי הגליץ' יחד עם השוטרת ג'ני." },
        { en: 'She is on the line now.', he: 'היא על הקו עכשיו.' },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'officer-Jenny',
      speakerName: "Officer Jenny / השוטרת ג'ני",
      lines: [
        { en: 'Thanks to you, we know what we are looking for under Minusburg.', he: 'בזכותך, אנחנו יודעים מה אנחנו מחפשים מתחת למינוסבורג.' },
        { en: 'Win your seventh badge and learn to Fly — then come back. I will open the road for you.', he: 'תנצח את התג השביעי שלך ותלמד לעוף — ואז תחזור. אני אפתח לך את הדרך.' },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Gym Guide / מדריך המכון',
      lines: [{ en: 'Max Formax is back! The gym is open!', he: 'מקס פורמקס חזר! המכון פתוח!' }],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-pct-lance',
      speakerName: 'Lance / לאנס',
      lines: [{ en: 'Go win that badge. See you in Minusburg!', he: 'לך תנצח את התג הזה. נתראה במינוסבורג!' }],
    },
    { type: 'pokemon-anim', pokemonId: DRAGONITE, motion: 'fly', from: { npcId: 'npc-pct-lance' } },
    { type: 'hide-npc', npcId: 'npc-pct-lance' },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act4-pct-cores-lab' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act4-pct-badge' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT4_PCT_GYM_OPEN } },
  ],
});

// ── Beat 11: Badge 7 → Fly → Minusburg ──────────────────────────────────────

registerStoryEvent({
  id: 'evt-pct-badge7',
  trigger: { type: 'badge-earned', badge: 7 },
  actions: [
    {
      type: 'show-message',
      lines: [
        { en: 'You got HM02 Fly! Teach it to a flying Pokémon to travel between cities.', he: 'קיבלת את מכונת הלימוד תעופה! למד אותה לפוקימון מעופף כדי לטוס בין ערים.' },
        { en: 'Officer Jenny is waiting in Minusburg.', he: "השוטרת ג'ני מחכה במינוסבורג." },
      ],
    },
    { type: 'complete-quest', questId: 'main-act4-pct-badge' },
    { type: 'set-quest', questId: 'main-act5-minusburg' },
    { type: 'set-flag', flag: FLAGS.ACT4_MINUSBURG_OPEN },
    { type: 'set-flag', flag: FLAGS.ACT4_PCT_ARC_COMPLETE },
  ],
});
