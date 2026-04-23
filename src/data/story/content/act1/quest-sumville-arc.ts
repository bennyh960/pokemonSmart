/**
 * ACT 1: Sumville Arc — Bridge Crystal + Addition Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act1-sumville, main-sumville-investigate, main-sumville-rocket,
 *           main-sumville-crystal, main-act1-gym1
 * GATES:    gate-sumville-gym (Addition Gym entry gate)
 *
 * STORY BEATS (in order):
 *   1. Player arrives in Sumville → Prof. Oak appears, warns about NULL-X
 *   2. Player finds the gym is closed/blocked → investigate quest
 *   3. Player talks to gym blocker → Jessie & James appear near bridge
 *   4. Player defeats Jessie & James → Bridge Crystal dropped
 *   5. Player returns Crystal to keeper → Adda returns to gym
 *   6. Player passes gym gate → battles Adda → badge 1 earned
 *   7. Badge 1 → Sumville infection cleared → path to Route 2 opens
 *
 * FLAGS SET: VISITED_SUMVILLE, ACT1_OAK_WARNING_HEARD, SUMVILLE_ARRIVED,
 *            SUMVILLE_GYM_BLOCKER_TALKED, SUMVILLE_CRYSTAL_FOUND,
 *            SUMVILLE_CRYSTAL_RETURNED, SUMVILLE_GYM_CLEARED,
 *            GATE_SUMVILLE_GYM_PASS, STORY_BADGE_1
 * FLAGS READ: GATE_ROUTE1_PASS, ACT1_OAK_WARNING_HEARD, VISITED_SUMVILLE,
 *             SUMVILLE_ARRIVED, SUMVILLE_GYM_BLOCKER_TALKED, SUMVILLE_CRYSTAL_FOUND,
 *             SUMVILLE_CRYSTAL_RETURNED, SUMVILLE_GYM_CLEARED
 *
 * MAP IDs:  'sumville'
 * NPC IDs:  gym blocker despawns after SUMVILLE_CRYSTAL_RETURNED
 *           Adda (gym leader) spawns after SUMVILLE_CRYSTAL_RETURNED
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act1-sumville',
  title: { en: 'Sumville', he: 'סאמוויל' },
  objective: { en: 'Meet Prof. Oak and explore Sumville', he: 'פגוש את פרופ׳ אוק וחקור את סאמוויל' },
});

registerQuest({
  id: 'main-sumville-investigate',
  title: { en: 'Locked Gym', he: 'מכון הפוקימונים נעול' },
  objective: { en: 'Investigate why the Addition Gym is closed', he: 'חקור מדוע מכון הפוקימונים של החיבור סגור' },
});

registerQuest({
  id: 'main-sumville-rocket',
  title: { en: 'Bridge Crystal', he: 'גביש הגשר' },
  objective: {
    en: 'Defeat Team Rocket at the bridge and recover the stolen Crystal Core',
    he: 'נצח את רוקט בגשר ושחזר את גביש הליבה הגנוב',
  },
});

registerQuest({
  id: 'main-sumville-crystal',
  title: { en: 'Return the Crystal', he: 'החזר את הגביש' },
  objective: {
    en: 'Return the Bridge Crystal to the Crystal Keeper at the bridge',
    he: 'החזר את גביש הגשר לשומרת הגביש בגשר',
  },
});

registerQuest({
  id: 'main-act1-gym1',
  title: { en: 'Sumville Gym', he: 'מכון הפוקימונים של סאמוויל' },
  objective: { en: 'Defeat Adda at the Addition Gym', he: 'נצח את אדה במכון הפוקימונים של החיבור' },
});

// ── Gate ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-sumville-gym',
  title: { en: 'Addition Gym Entry', he: 'כניסה למכון החיבור' },
  description: {
    en: 'The gym door requires a verification. Answer 15 questions.',
    he: 'דלת המכון דורשת אימות. ענה על 15 שאלות.',
  },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  conditions: [],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    inputQuestions: { count: 5, types: ['+'] },
    questionsRequired: 1,
    rewardThreshold: 1,
    bonusMultiplier: 30,
    penaltyAmount: 0,
    rewards: [
      { type: 'money', amount: 750 },
      { type: 'item', itemId: 'rare-candy', amount: 100 },
      { type: 'item', itemId: 'zinc', amount: 300 },
    ],
  },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_SUMVILLE_GYM_PASS },
    { type: 'set-quest', questId: 'main-act1-gym1' },
  ],
});
registerGate({
  id: 'gate-route1-sumville',
  title: { en: 'Route 1 Checkpoint', he: 'מחסום שביל 1' },
  description: {
    en: 'The path Sumville-Route1 is locked. We must identify you are not NULL-X creators. Questions will determine if you can pass. Choose wisely.',
    he: 'הדרך לסאמוויל נעולה. עלינו לוודא שאינך יוצרי NULL-X. מספר שאלות יקבעו אם תוכל לעבור. בחר בחוכמה.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 2,
    inputQuestions: { count: 2 },
    penaltyAmount: 150,
    // timeLimitPerQuestion: 30,
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_SUMVILLE_ROUTE2_PASS }],
});
registerGate({
  id: 'gate-sumville-route2',
  title: { en: 'Route 2 Checkpoint', he: 'מחסום שביל 2' },
  description: {
    en: 'The path Sumville-Route2 is locked. We must identify you are not NULL-X creators. Questions will determine if you can pass. Choose wisely.',
    he: 'הדרך לסאמוויל נעולה. עלינו לוודא שאינך יוצרי NULL-X. מספר שאלות יקבעו אם תוכל לעבור. בחר בחוכמה.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['-', '+'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 5,
    inputQuestions: { count: 2, types: ['-'] },
    penaltyAmount: 150,
    // timeLimitPerQuestion: 30,
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_SUMVILLE_ROUTE2_PASS }],
});
// THIS GATE IS FAKE _ THERE IS NO ENTRANCE TO SAFARI BUT DONT CARE FOR NOW
registerGate({
  id: 'gate-sumville-safari',
  title: { en: 'Safari Zone Checkpoint', he: 'מחסום אזור הספארי' },
  description: {
    en: 'The path Sumville-Safari is locked. We must identify you are not NULL-X creators. Questions will determine if you can pass. Choose wisely.',
    he: 'הדרך לסאמוויל אזור הספארי נעולה. עלינו לוודא שאינך יוצרי NULL-X. מספר שאלות יקבעו אם תוכל לעבור. בחר בחוכמה.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 15,
    rewardThreshold: 0.86,
    bonusMultiplier: 2,
    penaltyAmount: 550,
    rewards: [
      { type: 'money', amount: 1000 },
      { type: 'item', itemId: 'rare-candy', quantity: 2 },
      { type: 'item', itemId: 'pokeball', quantity: 15 },
    ],
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_SUMVILLE_SAFARI_PASS }],
});
// ── Cutscenes ─────────────────────────────────────────────────────────────────

// Prof. Oak arrives at Sumville — warns about cross-region NULL-X impact
registerCutscene({
  id: 'act1-oak-arrives',
  skippable: false,

  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 600 },
    { type: 'screen-fade', direction: 'in', durationMs: 800 },
    { type: 'overlay', color: null },
    {
      type: 'dialogue',
      speakerId: 'Prof. Oak / פרופ׳ אוק',
      lines: [{ en: 'I came as soon as Algorithma called.', he: 'באתי ברגע שפרופסור אלגוריתמה התקשר.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'Officer Jenny / שוטרת ג׳ני',
      lines: [
        {
          en: "Team Rocket's stole the Null-X system , is the AI that control all of our system. We are in big problem",
          he: 'גניבת מערכת נול-אקס על ידי צוות רוקט, הבינה המלאכותית ששולטת על כל המערכות שלנו. אנחנו בבעיה גדולה',
        },
      ],
    },

    {
      type: 'dialogue',
      speakerId: 'Prof. Oak / פרופ׳ אוק',
      lines: [
        {
          en: 'A rogue AI compromising verification systems — Kanto has seen disruptions too.',
          he: 'בינה מלאכותית סוררת שמסכנת מערכות אימות — קנטו גם כן חווה שיבושים.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Oak / פרופ׳ אוק',
      lines: [
        {
          en: 'Until we figure out what to do about Null-x , we still can protect our technology.',
          he: 'עד שנבין מה לעשות עם נול-אקס, עדיין נוכל להגן על הטכנולוגיה שלנו.',
        },
        {
          he: 'נול-אקס יכול לגרום לשגיאות שעלולות להזיק לאנשים ולפוקימונים. עלינו להיות זהירים ולהגן על הטכנולוגיה שלנו עד שנמצא פתרון.',
          en: 'The Null-x can produce glitches that can cause harm to the people and the Pokémon. We need to be careful and protect our technology until we can find a solution.',
        },
        {
          en: "Me and Professor Algorithma was in a team that developed the Null-x asystem 20 years ago, Its very sofisticated system but it has cons , it's glitches are dangoures but has limitations!",
          he: 'אני ופרופסור אלגוריתמה היינו בצוות שפיתח את מערכת נול-אקס לפני 20 שנה, זו מערכת מתוחכמת מאוד אבל יש לה חסרונות, התקלות שלה מסוכנות אבל יש לה מגבלות!',
        },
        {
          en: "They can't solve simple questions that smart kids can ! Math problems, logic questions and even english questions is the Null-x's weakness! ",
          he: 'הם לא יכולים לפתור שאלות פשוטות שילדים חכמים יכולים! בעיות מתמטיות, שאלות לוגיות ואפילו שאלות באנגלית הן הנקודות החלשות של נול-אקס!',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Officer Jenny / שוטרת ג׳ני',
      lines: [
        {
          en: 'So, lets use this as solution we will block any kind of technology in Numeria region by adding Question guard',
          he: 'אז, בואו נשתמש בזה כפתרון, נחסום כל סוג של טכנולוגיה באזור נומריה על ידי הוספת שומר שאלות',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Oak / פרופ׳ אוק',
      lines: [
        {
          he: 'זו רעיון טוב, כבר יש לנו שאלות מוכנות, פשוט תקרא לקצינים שלך ותמקם אותם בכניסת העיר, בבתי הפוקימונים, במכונים ה , בשוק ובכל מקום שיש בו טכנולוגיה, אנחנו צריכים להגן על האנשים והפוקימונים שלנו מהתקלות של נול-אקס',
          en: "Its a good idea, we already have ready questions , just call your officers and place them in city entrance, pokecenters , gyms , market and any place that has technology, we need to protect our people and pokemons from the Null-x's glitches",
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_OAK_WARNING_HEARD } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-gym1' } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// First arrival in Sumville (after passing gate) → Oak cutscene
registerStoryEvent({
  id: 'evt-act1-oak-arrives',
  trigger: { type: 'map-enter', mapId: 'sumville' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT1_OAK_WARNING_HEARD }],
  // repeatable: flag-not condition is the real guard; cutscene sets ACT1_OAK_WARNING_HEARD.
  // Without this, __event-done-* blocks replay if cutscene was interrupted.
  // repeatable: true,
  actions: [
    { type: 'set-flag', flag: FLAGS.VISITED_SUMVILLE },
    { type: 'set-infection', cityId: 'sumville', value: 'low' },
    { type: 'start-cutscene', cutsceneId: 'act1-oak-arrives' },
  ],
});

// Arriving in Sumville before passing the gate (shouldn't happen normally, but guard it)
registerStoryEvent({
  id: 'evt-sumville-infection',
  trigger: { type: 'map-enter', mapId: 'sumville' },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_SUMVILLE }],
  actions: [
    { type: 'set-flag', flag: FLAGS.VISITED_SUMVILLE },
    { type: 'set-infection', cityId: 'sumville', value: 'low' },
    { type: 'complete-quest', questId: 'main-act1-sumville' },
  ],
});

// Player talks to gym blocker → Rocket team appears at bridge
registerStoryEvent({
  id: 'ev-sumville-arrive',
  trigger: { type: 'map-enter', mapId: 'sumville' },
  conditions: [{ type: 'flag-not', flag: FLAGS.SUMVILLE_ARRIVED }],
  actions: [
    { type: 'set-flag', flag: FLAGS.SUMVILLE_ARRIVED },
    { type: 'set-quest', questId: 'main-sumville-investigate' },
  ],
  completedFlag: FLAGS.SUMVILLE_ARRIVED,
});

// Gym blocker NPC sets a flag when talked to → triggers Rocket appearance
registerStoryEvent({
  id: 'ev-sumville-gym-blocker-talked',
  trigger: { type: 'flag-set', flag: FLAGS.SUMVILLE_GYM_BLOCKER_TALKED },
  actions: [{ type: 'set-quest', questId: 'main-sumville-rocket' }],
});

// Jessie drops crystal → return it quest
registerStoryEvent({
  id: 'ev-sumville-crystal-found',
  trigger: { type: 'flag-set', flag: FLAGS.SUMVILLE_CRYSTAL_FOUND },
  actions: [{ type: 'set-quest', questId: 'main-sumville-crystal' }],
});

// Crystal returned → Adda comes back to gym
registerStoryEvent({
  id: 'ev-sumville-crystal-returned',
  trigger: { type: 'flag-set', flag: FLAGS.SUMVILLE_CRYSTAL_RETURNED },
  actions: [
    { type: 'set-quest', questId: 'main-act1-gym1' },
    {
      type: 'show-message',
      lines: [
        {
          en: 'The Bridge Crystal is restored! Power flows back to the Addition Gym...',
          he: 'גביש הגשר שוחזר! הכוח זורם בחזרה למכון...',
        },
        { en: 'Adda has returned to the gym. Go challenge her!', he: 'אדה חזרה למכון. לך לאתגר אותה!' },
      ],
    },
  ],
});

// Gym cleared → advance to Route 2
registerStoryEvent({
  id: 'ev-sumville-gym-cleared',
  trigger: { type: 'flag-set', flag: FLAGS.SUMVILLE_GYM_CLEARED },
  actions: [
    { type: 'complete-quest', questId: 'main-act1-gym1' },
    { type: 'set-quest', questId: 'main-act1-route2' },
    {
      type: 'show-message',
      lines: [
        { en: 'You earned the Sum Badge and HM01 Cut!', he: 'הרווחת את תג הסכום ו-HM01 גזירה!' },
        {
          en: 'The path to Route 2 — Difference Pass — is now open. Minusburg awaits!',
          he: 'הדרך לשביל 2 — מעבר ההפרש — פתוחה עכשיו. מינוסבורג ממתין!',
        },
      ],
    },
  ],
});

// Badge 1 earned → infection cleared, path to Route 2 opens
registerStoryEvent({
  id: 'evt-badge1-clears-sumville',
  trigger: { type: 'badge-earned', badge: 1 },
  conditions: [],
  actions: [
    { type: 'set-flag', flag: FLAGS.STORY_BADGE_1 },
    { type: 'set-infection', cityId: 'sumville', value: 'cleared' },
    { type: 'set-quest', questId: 'main-act1-route2' },
  ],
});
