/**
 * ACT 1: Minusburg — Investigation & Subtraction Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act1-minusburg, main-act1-minusburg-find-leader,
 *           main-act1-rocket-hunt, main-act1-gym2
 * GATES:    gate-minusburg-gym
 *
 * STORY BEATS (in order):
 *   1. Player arrives in Minusburg — streets are eerily quiet; investigation begins
 *   2. Player talks to Gary Oak (or Officer Jenny) → intro cutscene: Gary reveals
 *      he spotted Team Rocket; Jenny explains Pokemon disappearances + empty gym
 *      → quest: find the gym leader
 *   3. Player enters gym-minusburg → Minessa cutscene: explains Rocket/NULL-X threat,
 *      asks player to drive out 10 agents → quest: beat them all
 *   4. Each Rocket grunt (rocket-mb-1 … rocket-mb-10) despawns on defeat;
 *      defeating rocket-mb-10 triggers the finale cutscene
 *   5. Finale cutscene: Gary, Jenny, Minessa celebrate; Minessa + Jenny walk off
 *      toward the gym; Minessa invites player to challenge her
 *   6. Player passes gym gate (15 subtraction Qs) → battles Minessa → Badge 2
 *   7. Badge 2 → infection cleared; Prof. Algorithma calls to congratulate
 *
 * FLAGS SET: VISITED_MINUSBURG, MINUSBURG_GARY_MET, MINUSBURG_GYM_LEADER_FOUND,
 *            ROCKET_MINUSBURG_ALL_DEFEATED, GATE_MINUSBURG_GYM_PASS, STORY_BADGE_2
 *
 * MAP IDs:  'minusburg' (overworld), 'gym-minusburg' (gym interior — must exist)
 * NPC IDs (user must place):
 *   gary-oak-mb          — overworld, always until ROCKET_MINUSBURG_ALL_DEFEATED
 *   jenny-mb             — overworld, always until ROCKET_MINUSBURG_ALL_DEFEATED
 *   minessa-gym-mb       — gym-minusburg interior, despawns after GYM_LEADER_FOUND
 *   minessa-field-mb     — overworld, spawns after GYM_LEADER_FOUND, despawns after rockets done
 *   rocket-mb-1 … 10    — overworld, despawnOnDefeat: true
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act1-minusburg',
  title: { en: 'Something Is Wrong', he: 'משהו לא בסדר' },
  objective: {
    en: 'Investigate Minusburg — the streets feel too quiet',
    he: 'חקור את מינוסבורג — הרחובות נראים שקטים מדי',
  },
});

registerQuest({
  id: 'main-act1-minusburg-find-leader',
  title: { en: 'Find the Gym Leader', he: 'מצא את מנהיג המכון' },
  objective: {
    en: 'The gym is empty. Find Minessa — she was last seen inside',
    he: 'המכון ריק. מצא את מינסה — אחרון שנצפתה בפנים',
  },
});

registerQuest({
  id: 'main-act1-rocket-hunt',
  title: { en: 'Drive Out Team Rocket', he: 'גרש את צוות רוקט' },
  objective: {
    en: 'Defeat all 10 Team Rocket agents hiding in Minusburg',
    he: 'נצח את כל 10 סוכני צוות רוקט המסתתרים במינוסבורג',
  },
});

registerQuest({
  id: 'main-act1-gym2',
  title: { en: 'Minusburg Gym', he: 'מכון מינוסבורג' },
  objective: {
    en: "Defeat Minessa at the Subtraction Gym and earn Badge 2",
    he: 'נצח את מינסה במכון החיסור וזכה בתג 2',
  },
});

// ── Gate ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-minusburg-gym',
  title: { en: 'Subtraction Gym Entry', he: 'כניסה למכון החיסור' },
  description: {
    en: "The gym door is shielded. Solve 15 subtraction problems to prove you're not a NULL-X agent.",
    he: 'דלת המכון מוגנת. פתור 15 בעיות חיסור כדי להוכיח שאינך סוכן NULL-X.',
  },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  conditions: [],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    inputQuestions: { count: 5, types: ['-'] },
    questionsRequired: 1,
    rewardThreshold: 0.8,
    bonusMultiplier: 25,
    penaltyAmount: 0,
    rewards: [
      { type: 'money', amount: 600 },
      { type: 'item', itemId: 'super-potion', quantity: 3 },
    ],
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: FLAGS.GATE_MINUSBURG_GYM_PASS },
    { type: 'set-quest', questId: 'main-act1-gym2' },
  ],
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// Beat 1 — first arrival: atmosphere set, investigation quest starts
registerCutscene({
  id: 'act1-minusburg-arrival',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      lines: [
        {
          en: 'You arrive in Minusburg — the City of Subtraction.',
          he: 'אתה מגיע למינוסבורג — עיר החיסור.',
        },
        {
          en: 'The streets are quiet. Too quiet. Trainers walk fast, eyes down — Pokemon tucked out of sight.',
          he: 'הרחובות שקטים. שקטים מדי. מאמנים הולכים מהר, עיניים למטה — פוקימונים מוסתרים.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-minusburg' } },
  ],
});

// Beat 2 — Gary Oak + Officer Jenny intro
registerCutscene({
  id: 'act1-minusburg-gary-intro',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      speakerId: 'Gary Oak / גארי אוק',
      lines: [
        {
          en: 'Well, well — another trainer? I\'m Gary Oak. You\'ve heard of my grandfather, Prof. Oak, right? Of course you have.',
          he: 'הו הו — מאמן נוסף? אני גארי אוק. שמעת על סבי, פרופ׳ אוק, נכון? ברור שכן.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Gary Oak / גארי אוק',
      lines: [
        {
          en: 'Gramps sent me here to investigate. I\'ve already spotted Team Rocket scouts near the trees in the eastern district — at least ten of them.',
          he: 'סבא שלח אותי לכאן לחקור. כבר זיהיתי סיירי צוות רוקט ליד העצים ברובע המזרחי — לפחות עשרה מהם.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Officer Jenny / שוטרת ג׳ני',
      lines: [
        {
          en: "I'm Officer Jenny, city police. Pokemon disappearances have been reported every day this week. Trainers are hiding their Pokemon at home — they're terrified.",
          he: 'אני שוטרת ג׳ני, משטרת העיר. כל יום השבוע דווח על היעלמות פוקימונים. מאמנים מסתירים את הפוקימונים שלהם בבית — הם מפוחדים.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Officer Jenny / שוטרת ג׳ני',
      lines: [
        {
          en: "Most critically — the gym has been empty for three days. Minessa, our gym leader, went silent. The gym door is open but no one is there.",
          he: "חשוב מכל — המכון ריק כבר שלושה ימים. מינסה, מנהיגת המכון שלנו, שתקה. דלת המכון פתוחה אך אין איש.",
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Gary Oak / גארי אוק',
      lines: [
        {
          en: "If Team Rocket has NULL-X backing, this is serious. You should check the gym — Minessa might still be inside.",
          he: "אם לצוות רוקט יש תמיכה של NULL-X, זה חמור. כדאי שתבדוק את המכון — מינסה עשויה להיות עדיין בפנים.",
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.MINUSBURG_GARY_MET } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act1-minusburg' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-minusburg-find-leader' } },
  ],
});

// Beat 3 — empty gym message (before Gary is met)
// Handled inline via show-message in story event (no full cutscene needed)

// Beat 3 — Minessa discovered in the gym
registerCutscene({
  id: 'act1-minusburg-gym-leader',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      speakerId: 'Minessa / מינסה',
      lines: [
        {
          en: "A trainer — here? Good. I've been expecting someone brave enough to walk through that door.",
          he: "מאמן — כאן? טוב. ציפיתי למישהו אמיץ מספיק להיכנס דרך הדלת הזו.",
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Minessa / מינסה',
      lines: [
        {
          en: "Team Rocket, guided by NULL-X, has been terrorizing this city. Their moves are calculated, fast — smarter than anything I've seen from them before.",
          he: "צוות רוקט, בהנחיית NULL-X, מטריד את העיר הזו. המהלכים שלהם מחושבים, מהירים — חכמים יותר מכל מה שראיתי מהם.",
        },
        {
          en: "Ten agents are scattered through the eastern trees. They've been stealing Pokemon from trainers who refuse to hand them over.",
          he: "עשרה סוכנים מפוזרים בעצים המזרחיים. הם גנבו פוקימונים ממאמנים שסירבו להסגירם.",
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Minessa / מינסה',
      lines: [
        {
          en: "I've mapped their positions with Officer Jenny. Gary Oak is ready to assist. But someone needs to go out there and drive every last one of them out.",
          he: "מיפיתי את עמדותיהם עם שוטרת ג׳ני. גארי אוק מוכן לסייע. אבל מישהו צריך לצאת לשם ולגרש את כולם.",
        },
        {
          en: "That someone is you.",
          he: "אותו מישהו זה אתה.",
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.MINUSBURG_GYM_LEADER_FOUND } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act1-minusburg-find-leader' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-rocket-hunt' } },
  ],
});

// Beat 5 — finale: all rockets gone, Minessa + Jenny walk toward gym
registerCutscene({
  id: 'act1-minusburg-rockets-cleared',
  skippable: false,
  steps: [
    {
      type: 'dialogue',
      speakerId: 'Gary Oak / גארי אוק',
      lines: [
        {
          en: "That's the last one! Ten for ten — not bad at all.",
          he: "זה האחרון! עשרה מתוך עשרה — לא רע בכלל.",
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Officer Jenny / שוטרת ג׳ני',
      lines: [
        {
          en: "Outstanding work. I'll file a full report to Kanto HQ. Minusburg owes you more than it can repay.",
          he: "עבודה מצוינת. אגיש דוח מלא למפקדה בקנטו. מינוסבורג חייבת לך יותר ממה שתוכל להחזיר.",
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Minessa / מינסה',
      lines: [
        {
          en: "You protected this city when I couldn't. The trainers here will sleep soundly tonight.",
          he: "הגנת על העיר הזו כשאני לא יכולתי. המאמנים כאן יישנו בשקט הלילה.",
        },
      ],
    },
    { type: 'face-npc', npcId: 'jenny-mb', dir: 'right' },
    { type: 'move-npc', npcId: 'jenny-mb', path: ['right', 'right', 'right', 'right'], waitForComplete: true },
    {
      type: 'dialogue',
      speakerId: 'Minessa / מינסה',
      lines: [
        {
          en: "Come find me at the gym when you're ready. I'll be waiting — and I won't hold back.",
          he: "בוא למצוא אותי במכון כשאתה מוכן. אחכה — ולא אקל עליך.",
        },
      ],
    },
    { type: 'face-npc', npcId: 'minessa-field-mb', dir: 'right' },
    { type: 'move-npc', npcId: 'minessa-field-mb', path: ['right', 'right', 'right', 'right', 'right'], waitForComplete: true },
    { type: 'hide-npc', npcId: 'minessa-field-mb' },
    { type: 'hide-npc', npcId: 'jenny-mb' },
    { type: 'hide-npc', npcId: 'gary-oak-mb' },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act1-rocket-hunt' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ROCKET_MINUSBURG_ALL_DEFEATED } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-gym2' } },
    {
      type: 'action',
      action: {
        type: 'show-message',
        lines: [
          {
            en: "The city feels lighter already. Head to the Subtraction Gym when you're ready to battle Minessa!",
            he: "העיר כבר מרגישה קלילה יותר. לך למכון החיסור כשאתה מוכן להילחם במינסה!",
          },
        ],
      },
    },
  ],
});

// Beat 7 — Prof. Algorithma congratulates on Badge 2
registerCutscene({
  id: 'act1-minusburg-badge2-call',
  skippable: false,
  phoneCaller: { en: 'Prof. Algorithma', he: "פרופ' אלגוריתמה" },
  steps: [
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: "Congratulations on the Minus Badge! Defeating Minessa AND driving out Team Rocket in the same city — remarkable.",
          he: "ברכות על תג המינוס! לנצח את מינסה וגם לגרש את צוות רוקט באותה עיר — מדהים.",
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה',
      lines: [
        {
          en: "NULL-X uses confusion as a weapon. Every time you solve a problem or win a battle, you chip away at its influence.",
          he: "NULL-X משתמש בבלבול כנשק. בכל פעם שאתה פותר בעיה או מנצח בקרב, אתה מחריב את השפעתו.",
        },
        {
          en: "Route 3 leads to Multiplia. The challenges multiply from here — stay sharp!",
          he: "שביל 3 מוביל למולטיפליה. האתגרים מתרבים מכאן — הישאר ממוקד!",
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.STORY_BADGE_2 } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act1-gym2' } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// Beat 1 — first arrival: atmospheric opening
registerStoryEvent({
  id: 'evt-minusburg-first-arrive',
  trigger: { type: 'map-enter', mapId: 'minusburg' },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_MINUSBURG }],
  actions: [
    { type: 'set-flag', flag: FLAGS.VISITED_MINUSBURG },
    { type: 'set-infection', cityId: 'minusburg', value: 'low' },
    { type: 'start-cutscene', cutsceneId: 'act1-minusburg-arrival' },
  ],
});

// Beat 2 — talking to Gary triggers the intro cutscene
registerStoryEvent({
  id: 'evt-minusburg-gary-meet',
  trigger: { type: 'npc-interact', npcId: 'gary-oak-mb' },
  conditions: [{ type: 'flag-not', flag: FLAGS.MINUSBURG_GARY_MET }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act1-minusburg-gary-intro' }],
});

// Beat 2 (alt) — talking to Jenny first triggers the same intro cutscene
registerStoryEvent({
  id: 'evt-minusburg-jenny-meet',
  trigger: { type: 'npc-interact', npcId: 'jenny-mb' },
  conditions: [{ type: 'flag-not', flag: FLAGS.MINUSBURG_GARY_MET }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act1-minusburg-gary-intro' }],
});

// Beat 3a — player enters gym before meeting Gary: brief notice
registerStoryEvent({
  id: 'evt-gym-enter-empty',
  trigger: { type: 'map-enter', mapId: 'gym-minusburg' },
  conditions: [{ type: 'flag-not', flag: FLAGS.MINUSBURG_GARY_MET }],
  actions: [
    {
      type: 'show-message',
      lines: [
        {
          en: "The gym is open... but there's nobody inside. Footsteps in the dust. Then silence.",
          he: "המכון פתוח... אבל אין איש בפנים. טביעות רגליים באבק. ואז שקט.",
        },
      ],
    },
  ],
  repeatable: true,
});

// Beat 3b — player enters gym after meeting Gary: Minessa is here
registerStoryEvent({
  id: 'evt-gym-enter-after-gary',
  trigger: { type: 'map-enter', mapId: 'gym-minusburg' },
  conditions: [
    { type: 'flag', flag: FLAGS.MINUSBURG_GARY_MET },
    { type: 'flag-not', flag: FLAGS.MINUSBURG_GYM_LEADER_FOUND },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act1-minusburg-gym-leader' }],
});

// Beat 5 — last Rocket grunt defeated → finale cutscene
registerStoryEvent({
  id: 'evt-rockets-all-done',
  trigger: { type: 'flag-set', flag: 'trainer-rocket-mb-10-defeated' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ROCKET_MINUSBURG_ALL_DEFEATED }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act1-minusburg-rockets-cleared' }],
});

// Beat 7 — badge 2 earned → clear infection, Algorithma call
registerStoryEvent({
  id: 'evt-badge2-earned',
  trigger: { type: 'badge-earned', badge: 2 },
  actions: [
    { type: 'set-infection', cityId: 'minusburg', value: 'cleared' },
    { type: 'start-cutscene', cutsceneId: 'act1-minusburg-badge2-call' },
  ],
});
