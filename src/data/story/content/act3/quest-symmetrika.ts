/**
 * ACT 3: Symmetrika — Post-Badge Story Arc
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:
 *   main-act3-sym-meet-lance     — Meet Lance at the DayCare House in Fractalis
 *   main-act3-sym-to-cave        — Head to the cave in route-7
 *   main-act3-sym-find-pokemon   — Find stolen Pokemon & defeat all Team Rocket
 *   main-act3-sym-rejoin-lance   — Rejoin Lance deeper in the cave
 *   main-act3-sym-to-percentile  — Continue to Percentile city via route-11
 *
 * STORY BEATS (in order):
 *   1. Badge 6 earned → Sima reveals she's Lance's sister; quest: meet Lance at DayCare
 *   2. Player meets Lance at fractalis/dayCare → HM Surf received; quest: cave route-7
 *   3. Player enters route-7-cave1 → Team Rocket ambush, 3 Pokemon stolen, Lance holds grunts
 *   4. Player defeats Jesse/James (npc-rocket-thief-james) in cave2 → Pokemon restored
 *   5. Player rejoins Lance deeper in cave1 → investigate cutscene → Zapdos appears
 *   6. Player defeats Zapdos → it flees, NULL-X Core X1 (9004) drops; Lance debrief → Percentile
 *
 * FLAGS SET:
 *   ACT3_SYM_BADGE_CUTSCENE_DONE, ACT3_SYM_LANCE_DAYCARE_MET,
 *   ACT3_SYM_ROCKET_AMBUSH_DONE, ACT3_SYM_POKEMON_STOLEN,
 *   ACT3_SYM_THIEF_DEFEATED, ACT3_SYM_POKEMON_RESTORED,
 *   ACT3_SYM_LANCE_CAVE_RETURN, ACT3_SYM_ZAPDOS_CAVE_DEFEATED,
 *   ACT3_SYM_ARC_COMPLETE
 *
 * NPC IDs (cutscene-referenced):
 *   symetria-gym-leader-npc       symmetrika/gym      (Sima the gym leader — existing)
 *   npc-lance-daycare       fractalis/dayCare   (Lance gives Surf)
 *   npc-lance-cave1-guard   routes/route-7-cave1 (Lance holds grunts after ambush)
 *   npc-rocket-cave1-g1..7  routes/route-7-cave1 (Team Rocket trainers)
 *   npc-lance-c2-return  routes/route-7-cave1 (Lance repositioned deeper)
 *   npc-zapdos-cave         routes/route-7-cave1 (Zapdos legendary battle)
 *   npc-rocket-cave2-g1..5  routes/route-7-cave2 (Team Rocket trainers)
 *   npc-rocket-thief-james  routes/route-7-cave2 (Jesse+James boss — thief)
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene, TEAM_ROCKET_LINES } from '../../cutscenes.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';

// ── Quests ────────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act3-sym-meet-lance',
  title: { en: 'Meet Lance', he: 'פגוש את לאנס' },
  objective: {
    en: 'Go to the DayCare House in Fractalis and meet Lance',
    he: 'לך לבית גידול הפוקימונים בפרקטליס ופגוש את לאנס',
  },
});

registerQuest({
  id: 'main-act3-sym-to-cave',
  title: { en: 'Cave Investigation', he: 'חקירת המערה' },
  objective: {
    en: 'Head to the cave in route-7 to investigate about Zapdos',
    he: 'לך למערה בדרך 7 כדי לחקור על זאפדוס',
  },
});

registerQuest({
  id: 'main-act3-sym-find-pokemon',
  title: { en: 'Find Your Pokemon', he: 'מצא את הפוקימונים שלך' },
  objective: {
    en: 'Defeat all Team Rocket in the caves and find your stolen Pokemon',
    he: 'נצח את כל חיילי צוות רוקט במערות ומצא את הפוקימונים הגנובים שלך',
  },
});

registerQuest({
  id: 'main-act3-sym-rejoin-lance',
  title: { en: 'Rejoin Lance', he: 'חזור ללאנס' },
  objective: {
    en: 'Find Lance deeper in the cave and continue the investigation',
    he: 'מצא את לאנס עמוק יותר במערה והמשך את החקירה',
  },
});

registerQuest({
  id: 'main-act3-sym-to-percentile',
  title: { en: 'Onward to Percentile', he: 'קדימה לפרסנטייל' },
  objective: {
    en: 'Head to Percentile city via route-11',
    he: 'לך לעיר פרסנטייל דרך דרך 11',
  },
});

// ── Gates ─────────────────────────────────────────────────────────────────────

registerGate({
  id: 'gate-symetria-r8-1',
  title: { en: 'Route 8 Checkpoint', he: 'מחסום שביל 8' },
  description: {
    en: 'NULL-X disruption active. 5 questions — stay focused.',
    he: 'שיבוש NULL-X פעיל. 5 שאלות — תישאר ממוקד.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 5,
    penaltyAmount: 200,
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ROUTE8_PASS }],
});

registerGate({
  id: 'gate-symetrica-route9',
  title: { en: 'Route 9 Checkpoint', he: 'מחסום שביל 9' },
  description: {
    en: 'NULL-X disruption active. 5 questions — stay focused.',
    he: 'שיבוש NULL-X פעיל. 5 שאלות — תישאר ממוקד.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 3,
    penaltyAmount: 200,
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ROUTE9_PASS }],
});

registerGate({
  id: 'gate-symetrica-route11',
  title: { en: 'Route 11 Checkpoint', he: 'מחסום שביל 11' },
  description: {
    en: 'NULL-X disruption active. 5 questions — stay focused.',
    he: 'שיבוש NULL-X פעיל. 5 שאלות — תישאר ממוקד.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 3,
    penaltyAmount: 200,
  },
  reopenCooldownMs: 15 * 60 * 1000,
});

registerGate({
  id: 'gate-symetrica-route10',
  title: { en: 'Route 10 Checkpoint', he: 'מחסום שביל 10' },
  description: {
    en: 'NULL-X disruption active. 5 questions — stay focused.',
    he: 'שיבוש NULL-X פעיל. 5 שאלות — תישאר ממוקד.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 3,
    penaltyAmount: 200,
  },
  reopenCooldownMs: 15 * 60 * 1000,
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// symmetrika/gym — post-badge 6: Sima reveals she is Lance's sister
registerCutscene({
  id: 'act3-sym-sima-reveal',
  skippable: true,
  steps: [
    { type: 'face-npc', npcId: 'symetria-gym-leader-npc', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'symetria-gym-leader-npc',
      lines: [
        {
          en: "You're remarkable. Most trainers can't even reach me — the mirror puzzles alone defeat them.",
          he: 'אתה מדהים. רוב המאמנים אפילו לא מצליחים להגיע אלי — חידות המראה לבדן מביסות אותם.',
        },
        {
          en: "Tell me — where are you from? I don't recognize you from the local circuits.",
          he: 'ספר לי — מאיפה אתה? אני לא מכירה אותך מהמעגלים המקומיים.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player / שחקן',
      lines: [
        {
          en: "I'm from Zeroville. It's far from here.",
          he: 'אני מזירוויל. זה רחוק מכאן.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'symetria-gym-leader-npc',
      speakerName: 'Sima Tria / סימה טריה',
      lines: [
        {
          en: "Zeroville? That's not as far as you think — a strong trainer like you can teach a Pokemon Surf. Route-10 connects straight to Zeroville.",
          he: 'זירוויל? זה לא כל כך רחוק כמו שאתה חושב — מאמן חזק כמוך יכול ללמד פוקימון גלישה. דרך 10 מתחברת ישירות לזירוויל.',
        },
        {
          en: "But first — the glitches. You've been traveling through Numeria. Tell me, have you seen what's happening out there?",
          he: "אבל קודם — הגליצ'ים. טיילת בנומריה. ספר לי, האם ראית מה קורה שם בחוץ?",
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player / שחקן',
      lines: [
        {
          en: "I've encountered many of them. Powerful glitches, fake trainers... I've been trying to help Professors Oak and Algorithma figure out what's behind it all.",
          he: "פגשתי הרבה כאלה. גליצ'ים חזקים, מאמנים מזויפים... ניסיתי לעזור לפרופסורים אוק ואלגוריתמה להבין מה עומד מאחורי כל זה.",
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'symetria-gym-leader-npc',
      speakerName: 'Sima Tria / סימה טריה',
      lines: [
        {
          en: 'My brother has been investigating the same thing together with Professor Oak and Algorithma. ',
          he: 'גם אח שלי לאנס מעורב בחקירה! לאנס מארבעת הנבחרים . לאנס אחי הגדול הוא מודל להערצה עבורי',
        },
        {
          en: 'He mentioned a promising trainer from Zeroville who has been crossing Numeria... could that be you?',
          he: 'הוא הזכיר מאמן מבטיח מזירוויל שחוצה את נומריה... זה אולי אתה?',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player / שחקן',
      lines: [
        {
          en: 'I met Lance at Algorithma lab. it was post some activity of team rocket - He helped both proffesors Oak and Algorithma to invastiagte the appreace of team rocket and glitches.',
          he: 'פגשתי את לאנס במעבדת אלגוריתמה. זה היה אחרי פעילות של צוות רוקט - הוא עזר גם לפרופסור אוק וגם לאלגוריתמה לחקור את הופעת צוות רוקט והגליצים.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'symetria-gym-leader-npc',
      speakerName: 'Sima Tria / סימה טריה',
      lines: [
        {
          en: 'I knew it. Lance should be at the DayCare House in Fractalis right now — he can help your Pokemon learn Surf. Go find him.',
          he: 'ידעתי. לאנס אמור להיות בבית גידול הפוקימונים בפרקטליס עכשיו — הוא יכול לעזור לפוקימון שלך ללמוד גלישה. לך למצוא אותו.',
        },
        {
          en: 'And... be careful. Whatever is controlling these glitches is getting stronger.',
          he: "רק זהירות - אנחנו לא יודעים עדיין הכל על הגלי'צים ונראה שההשפעה שלהם מתחזקת באזור",
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_SYM_BADGE_CUTSCENE_DONE } },
    { type: 'action', action: { type: 'complete-quest', questId: 'finish-act3-route8' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act3-sym-meet-lance' } },
  ],
});

// fractalis/dayCare — Lance gives HM Surf, plans to meet at cave
registerCutscene({
  id: 'act3-sym-lance-daycare',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'npc-lance-daycare', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'npc-lance-daycare',
      speakerName: 'Lance / לאנס',
      lines: [
        {
          en: 'Hello , good to see you again! ',
          he: 'שלום , טוב לראות אותך שוב!',
        },
        {
          en: 'I camed here to invastiagte about the last events with the power plants',
          he: 'באתי לכאן כדי לחקור את האירועים האחרונים עם תחנות הכוח',
        },
        {
          en: "I've stoped to rest here but soon I want start my investigation again. what are you doing here?",
          he: 'עצרתי כאן למנוחה אבל בקרוב אני רוצה להתחיל את החקירה שלי שוב. מה אתה עושה כאן?',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player / שחקן',
      lines: [
        {
          en: 'I was in Symmetrika town battle with Sima your sister , she told me you might be here help me with teaching my pokemon Surf',
          he: 'אני הייתי בעיירה סימטריקה בקרב עם סימה אחותך , היא אמרה שאולי אתה כאן כדי לעזור לי ללמד את הפוקימונים שלי גלישה',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-lance-daycare',
      lines: [
        {
          en: 'Ohh my little sister , you met her! she is very powerful and smart  , I am glad you get along with her',
          he: 'אוי אחותי הקטנה , פגשת אותה! היא מאוד חזקה וחכמה  , אני שמח שאתה מסתדר איתה',
        },
        {
          en: 'If you want to learn Surf you need raise your pokemon to level 45 at least , and his size must be appropite so he will be able to carry you. It doesnt have to be water type pokemon only but mostly it will be water type',
          he: 'אם אתה רוצה ללמוד גלישה אתה צריך להעלות את הפוקימון שלך לפחות לרמה 40 , והגודל שלו חייב להיות מתאים כדי שיוכל לשאת אותך. לא חייב להיות פוקימון מסוג מים בלבד אבל ברוב המקרים יהיה מסוג מים',
        },
        {
          en: 'Now take this - you seem to me powerfull enough to be able to surf',
          he: 'עכשיו קח את זה - נראה לי שאתה חזק מספיק כדי להיות מסוגל לגלוש',
        },
      ],
    },
    { type: 'action', action: { type: 'give-item', itemId: 'hm03', quantity: 1 } },
    {
      type: 'dialogue',
      speakerName: 'Player / שחקן',
      lines: [
        {
          en: 'Ohh Thanks ! appriate it!',
          he: 'הוו תודה! אני מעריך את זה!',
        },
        {
          en: 'About the events you talked about - I can tell you all what happens! It start from route-7 , we saw many glitches there including Zapdos the legendary bird .',
          he: 'אני יכול לספר לך הכל על מה שקרה! זה התחיל בדרך 7 , ראינו הרבה גליצים שם כולל זאפדוס הציפור האגדית .',
        },
        {
          en: 'I met Sir Fracti which is the chief engineer of the power planet and also the Fractalis Gym leader',
          he: 'פגשתי את דון שבריז שהוא מהנדס ראשי של תחנת הכוח וגם מנהיג חדר הכושר של פרקטליס',
        },
        {
          en: 'He explain me that electric type pokemons  came to frequent to the power station to offload some current including legnedary pokemons like Zapdos',
          he: 'הוא הסביר לי שפוקימונים מסוג חשמל מגיעים מידי פעם לתחנת הכוח כדי לפרוק קצת זרם כולל פוקימונים אגדיים כמו זאפדוס',
        },
        {
          en: 'We worked like a team to treat Zapdos to came to offload his current , I also  was able to came closer and battle him but he flee',
          he: 'שיתפנו פעולה כדי לטפל בזאפדוס שיגיע לפרוק את הזרם שלו , גם הצלחתי אפילו ליזום קרב איתו אבל הוא ברח',
        },
        {
          en: 'He was infected with the glitch but it seems like he ressit it and battle it also',
          he: 'נראה שזאפדוס בעצמו הודבק מהגליץ אבל בשונה מגליצים אחרים - היה נראה שהוא התנגד להשפעה. כאילו הוא נלחם בעצמו',
        },
        {
          en: 'Now is the part that might interest you the most , We found a device on Zapdos that might be related to the NULL-X cores that Oak and Algorithma are investigating',
          he: 'עכשיו מגיע החלק שעשוי לעניין אותך ביותר , מצאנו מכשיר על זאפדוס שעשוי להיות קשור לליבות NULL-X שאוק ואלגוריתמה חוקרים',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-lance-daycare',
      speakerName: 'Lance / לאנס',
      lines: [
        {
          en: 'A device on Zapdos... We must see it closer , I think good point to start is in route-7 the first place you said you met zapdos.',
          he: 'מכשיר על זאפדוס... אנחנו חייבים לראות את זה מקרוב , אני חושב שהנקודה הטובה להתחיל היא בדרך 7 המקום הראשון שאמרת שפגשת את זאפדוס.',
        },
        {
          en: "If Zapdos is still in the area — near route-7 — then the core is still with it. We need to go to the cave. That's where you first saw it.",
          he: 'אם זאפדוס עדיין באזור — ליד דרך 7 — אז הליבה עדיין איתו. אנחנו צריכים ללכת למערה. שם ראית אותו לראשונה.',
        },
        {
          en: "Meet me at the cave entrance in route-7. I'll go ahead and scout.",
          he: 'פגוש אותי בכניסה למערה בדרך 7. אני אלך קדימה ואסייר.',
        },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'npc-lance-daycare',
      path: ['down', 'down', 'down', 'down'],
      waitForComplete: true,
    },
    { type: 'hide-npc', npcId: 'npc-lance-daycare' },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_SYM_LANCE_DAYCARE_MET } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act3-sym-meet-lance' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act3-sym-to-cave' } },
  ],
});

// route-7-cave2 — Team Rocket ambush, Zapdos revealed, pokemon stolen, Lance holds grunts
registerCutscene({
  id: 'act3-sym-cave-ambush',
  skippable: false,
  steps: [
    { type: 'move-player', path: ['up', 'up', 'up'] },

    ...TEAM_ROCKET_LINES,
    { type: 'move-npc', npcId: 'r7-c2-fake-rocket6', path: ['left'] },
    { type: 'play-sfx', sfxId: 'bump-wall' },
    { type: 'move-player', path: ['left'] },

    { type: 'move-npc', npcId: 'r7-c2-fake-rocket6', path: ['left'] },
    { type: 'play-sfx', sfxId: 'bump-wall' },
    { type: 'move-player', path: ['left'] },
    { type: 'face-npc', npcId: 'r7-c2-fake-rocket5', dir: 'up' },
    { type: 'move-player', path: ['right'] },
    { type: 'move-npc', npcId: 'r7-c2-fake-rocket3', path: ['down', 'right'] },
    {
      type: 'dialogue',
      speakerId: 'r7-c2-fake-rocket6',
      lines: [
        {
          en: "Don't move! You're surrounded!",
          he: 'אל תזוז! אתה מוקף!',
        },
        {
          en: 'You not suppose to be here ! you came to far!.',
          he: 'אתה לא אמור להיות כאן! הגעת רחוק מדי!',
        },
      ],
    },

    {
      type: 'dialogue',
      speakerId: 'r7-c2-fake-rocket-jessi',
      lines: [
        { en: 'I recognize you! anoying trainer! its time to pay!', he: 'אני מזהה אותך! מאמן מעצבן! הגיע הזמן לשלם!' },
        {
          en: 'Zapdos! The legendary Zapdos — under Team Rocket control!',
          he: 'זאפדוס! זאפדוס האגדי — תחת שליטת צוות רוקט!.',
        },
        { en: 'Zapdos use Thunder', he: '!!!זאפדוס מכת ברק' },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'act3-zap-ambush',
      path: ['down', 'down', 'right', 'right', 'up', 'up', 'up', 'up', 'left', 'left', 'down'],
      waitForComplete: false,
    },
    { type: 'play-sfx', sfxId: 'thunder' },
    { type: 'overlay', color: '#ffff0033' },
    { type: 'wait', durationMs: 300 },
    { type: 'overlay', color: '#5f5f2d4f' },
    { type: 'wait', durationMs: 300 },
    { type: 'overlay', color: '#000000ec' },
    { type: 'thief-npc', npcId: 'npc-rocket-thief-james', condition: { amount: 3, aboveLevel: 40 } },
    { type: 'wait', durationMs: 1600 },
    {
      type: 'dialogue',
      speakerId: 'r7-c2-fake-rocket-2-james',
      lines: [
        {
          en: "On it! You'll never catch me!",
          he: 'הפסדת בקרב! הפוקימונים שלך מותשים ועכשיו הם אצלי! ',
        },
      ],
    },
    { type: 'overlay', color: '#5f5f2d4f' },
    { type: 'wait', durationMs: 1300 },
    { type: 'overlay', color: null },
    {
      type: 'dialogue',
      speakerName: 'Somone / מישהו',
      lines: [
        {
          en: 'STOP! Everyone back away from that trainer — NOW.',
          he: 'עצרו! כולם להסתלק מהמאמן הזה — עכשיו.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'r7-c2-fake-rocket-2-james',
      lines: [{ en: 'ohhh its Lance! lets split and run', he: 'אווו זה לאנס! בואו נתפצל ונברח' }],
    },
    {
      type: 'dialogue',
      speakerId: 'r7-c2-fake-rocket-jessi',
      lines: [
        {
          en: 'The rest of you — spread out! Make sure no one follows the boss!',
          he: ' התפצלו! ודאו שאף אחד לא עוקב אחרינו!',
        },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'r7-c2-fake-rocket-2-james',
      path: ['down', 'down', 'down', 'down', 'left', 'down', 'down'],
      waitForComplete: false,
    },
    {
      type: 'move-npc',
      npcId: 'r7-c2-fake-rocket-jessi',
      path: ['down', 'down', 'down', 'down', 'right', 'down', 'down'],
      waitForComplete: false,
    },
    {
      type: 'move-npc',
      npcId: 'act3-zap-ambush',
      path: ['right', 'right', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'right'],
      waitForComplete: true,
    },
    { type: 'hide-npc', npcId: 'r7-c2-fake-rocket-2-james' },
    { type: 'hide-npc', npcId: 'r7-c2-fake-rocket-jessi' },
    { type: 'hide-npc', npcId: 'act3-zap-ambush' },
    { type: 'move-npc', npcId: 'r7-c2-fake-rocket3', path: ['left', 'left', 'left', 'up', 'up', 'up', 'up'] },
    { type: 'hide-npc', npcId: 'r7-c2-fake-rocket3' },
    { type: 'move-npc', npcId: 'r7-c2-fake-rocket5', path: ['left', 'up', 'up', 'up', 'up', 'up'] },
    { type: 'hide-npc', npcId: 'r7-c2-fake-rocket5' },
    {
      type: 'move-npc',
      npcId: 'npc-lance-cave1-guard',
      path: ['down', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'down', 'down'],
      waitForComplete: false,
    },
    { type: 'move-npc', npcId: 'r7-c2-fake-rocket4', path: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'] },
    { type: 'hide-npc', npcId: 'r7-c2-fake-rocket4' },
    { type: 'move-npc', npcId: 'r7-c2-fake-rocket6', path: ['down', 'down', 'down', 'down'] },
    { type: 'hide-npc', npcId: 'r7-c2-fake-rocket6' },
    { type: 'hide-npc', npcId: 'act3-zap-ambush' },

    {
      type: 'dialogue',
      speakerId: 'npc-lance-c2-return',
      speakerName: 'Lance / לאנס',
      lines: [{ en: 'Are you Ok?', he: 'הכל בסדר?' }],
    },
    {
      type: 'dialogue',
      speakerName: 'player/שחקן',
      lines: [
        { en: 'No - They ambush me and Zapdos attack me ', he: 'לא - הם הפתיעו אותי וזאפדוס תקף אותי ' },
        {
          en: 'They took my pokemons when I was weak and now they are gone!',
          he: 'הם לקחו את הפוקימונים שלי כשהתעלפתי מהמתקפה של זאפדוס ועכשיו הם נעלמו!',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-lance-c2-return',
      speakerName: 'Lance / לאנס',
      lines: [
        { en: '', he: 'הו אז זה נכון ! הם באמת שולטים על זאפדוס' },
        { en: '', he: 'מסוכן ביותר! אבל לאנס לא מתכוון לוותר עליך ועל הפוקימונים שלך ככה בקלות' },

        {
          en: "Don't let them run - chase james he proably hiding close by. I will chase Zapdos deeper in the cave",
          he: 'אל תתן להם לברוח - הם יצאו מהמערה לדרך 7 כנראה הם מסתתרים קרוב לכאן - זאפדוס ברח לכיוון השני - בלעדיו הם חלשים. אני ארדוף אחרי זאפדוס עמוק יותר במערה',
        },
        { en: '', he: 'אני מניח שיקח לי קצת זמן פה - אז אם תסיים מוקדם , אשמח שתבוא לחפות עליי' },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_SYM_POKEMON_STOLEN } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_SYM_ROCKET_AMBUSH_DONE } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act3-sym-to-cave' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act3-sym-find-pokemon' } },
  ],
});

// route-7-cave2 — after Jesse/James defeated, pokemon restored
registerCutscene({
  id: 'act3-sym-pokemon-restored',
  skippable: true,
  steps: [
    {
      type: 'dialogue',
      speakerName: 'James / ג׳יימס',
      lines: [
        {
          en: 'You beat us! You are stronger than I thought.',
          he: 'ניצחת אותנו! אתה חזק יותר ממה שחשבתי.',
        },
        {
          en: 'Ohh no - the pokemon I stole are back to thier trainer. Time to run... we will be back!',
          he: 'הוו לא - הפוקימונים שגנבתי חזרו למאמן שלהם. הגיע הזמן לברוח... אנחנו עוד נחזור!!',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player / שחקן',
      lines: [
        {
          en: 'My Pokemon are back! Now I need to find Lance.',
          he: 'הפוקימונים שלי חזרו! עכשיו אני צריך לחזור ללאנס במערה השנייה.',
        },
      ],
    },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act3-sym-find-pokemon' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act3-sym-rejoin-lance' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_SYM_POKEMON_RESTORED } },
  ],
});

// route-7-cave1 — Lance and player investigate deeper, Zapdos appears
registerCutscene({
  id: 'act3-sym-lance-cave-investigate',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'npc-lance-c2-return', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'npc-lance-c2-return',
      speakerName: 'Lance / לאנס',
      lines: [
        {
          en: "Good — you're back with your Pokemons. I knew you can do it!.",
          he: 'טוב — חזרת עם הפוקימונים שלך. ידעתי שאתה יכול לעשות את זה!.',
        },
        {
          en: 'Dont afraid from team rocket - they not treat thier pokemons like partners. they treat them as slaves and tools. they will never understand the bond between you and your pokemons.',
          he: 'אל תפחד מצוות רוקט - הם לא מתייחסים לפוקימונים שלהם כשותפים. הם מתייחסים אליהם כאל עבדים וכלים. הם לעולם לא יבינו את הקשר בינך לבין הפוקימונים שלך.  ',
        },
        {
          en: 'Trainers who want to be master must see their pokemons as friends and partners, not tools or slaves. you have proven that you are a true trainer, and your bond with your pokemons is strong. keep going and you will be able to defeat team rocket once and for all!',
          he: 'מאמנים שרוצים להיות מאסטרים חייבים לראות את הפוקימונים שלהם כחברים ושותפים, לא ככלים או עבדים. הוכחת שאתה מאמן אמיתי, והקשר שלך עם הפוקימונים שלך חזק. המשך ותוכל לנצח את צוות רוקט אחת ולתמיד!',
        },
        {
          en: 'Now lets focus on Zapdos - he must be here , team rocket appear allwyes close to storng glitches',
          he: "עכשיו בוא נתמקד בזפדוס - הוא חייב להיות כאן, צוות רוקט מופיע תמיד קרוב לפוקימוני גליץ' חזקים",
        },
        {
          en: 'While you were away, I fought 10 Team Rocket agents, but they keep coming - they do not give up',
          he: 'בזמן שנעדרת נלחמתי ב10 סוכני רוקט אבל הם ממשיכים להגיע - הם לא מתייאשים',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player / שחקן',
      lines: [
        {
          en: 'We will not give up either!',
          he: 'גם אנחנו לא נתייאש!',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-lance-c2-return',
      speakerName: 'Lance / לאנס',
      lines: [
        {
          en: 'This area is clear - lets continue deepr into the cave. They all run this way ... follow me.',
          he: 'האזור הזה נקי - בוא נמשיך עמוק יותר לתוך המערה. הם כולם רצו לכיוון הזה... תעקוב אחריי.',
        },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'npc-lance-c2-return',
      path: ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up'],
      waitForComplete: true,
    },
    { type: 'hide-npc', npcId: 'npc-lance-c2-return' },
    { type: 'play-music', musicId: 'team-rocket-grunt' },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_SYM_LANCE_CAVE_RETURN } },
  ],
});

// route-7-cave1 — Zapdos flees, NULL-X Core X1 falls, Lance debrief
registerCutscene({
  id: 'act3-sym-zapdos-core-obtained',
  skippable: true,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 400 },
    { type: 'wait', durationMs: 300 },
    { type: 'screen-fade', direction: 'in', durationMs: 500 },
    {
      type: 'dialogue',
      speakerId: 'npc-lance-c2-zapdos-end',
      lines: [
        {
          en: 'It fled again... but look — on the ground!',
          he: 'הוא ברח שוב... אבל תסתכל — על הקרקע!',
        },
        {
          en: "The device fell off Zapdos as it retreated. It's free of it now.",
          he: 'המכשיר נפל מזאפדוס כשנסוג. הוא חופשי ממנו עכשיו. אני רוצה שתשמור עליו!',
        },
      ],
    },
    { type: 'action', action: { type: 'give-item', itemId: '9004', quantity: 1 } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_SYM_NULLX_CORE5_COLLECTED } },

    {
      type: 'dialogue',
      speakerId: 'npc-lance-c2-zapdos-end',
      lines: [
        {
          en: 'Ok so we find our first null-x core . There is 7 left.',
          he: 'טוב אז מצאנו את ליבת הנול-אקס הראשונה שלנו. נשארו עוד 7.',
        },
        {
          en: 'There is no point to deliver them yet! The proffesor can not do nothing untill will give them all . till then it will be dangerous.',
          he: 'אין טעם למסור את הליבה לפרופסורים עדיין! הפרופסורים לא יכולים לעשות כלום עד שנמסור להם את כולם. עד אז זה יהיה מסוכן. זה יחשוף אותם להתקפות מצוות רוקט',
        },
        {
          en: "But I noticed something strange — this cave. This isn't Zapdos's natural habitat at all. Zapdos lives on a remote island, far from civilization. What was it doing here?",
          he: 'אגב שמתי לב למשהו מוזר — המערה הזו. זו בכלל לא בית הגידול הטבעי של זאפדוס. זאפדוס חי באי מרוחק, רחוק מהציביליזציה. מה הוא עשה כאן?',
        },
        {
          en: 'How team Rocket get access to Zapdos? We saw that zapdos ressit to thier control . They even kept distance from him.',
          he: 'איך צוות רוקט קיבל גישה לזאפדוס? ראינו שזאפדוס התנגד לשליטתם. הם אפילו שמרו מרחק ממנו.',
        },
        {
          en: 'All of the rocket grunt run - we dont have much clue where the other cores are.',
          he: 'כל סוכני צוות רוקט ברחו - אין לנו הרבה מושג איפה שאר הליבות.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Player / שחקן',
      lines: [
        {
          en: "Wait... think about it. Zapdos never truly attacked anyone. On route-7 it fled. At the power station it fought, but always hesitated — like something was holding it back. It didn't act like a regular glitch.",
          he: "רגע... תחשוב על זה. זאפדוס לא תקף אף אחד באמת. בדרך 7 הוא ברח. בתחנת הכוח הוא נלחם, אבל תמיד היסס — כאילו משהו עצר אותו. הוא לא התנהג כמו גליץ' רגיל.",
        },
        {
          en: "Maybe it was fighting the core's control — but it deliberately chose to stay near the power plant instead of going back to its island. Near familiar electric energy. Not near its home Pokemon.",
          he: 'אולי הוא נלחם בשליטת הליבה — אבל הוא בחר בכוונה להישאר ליד תחנת הכוח במקום לחזור לאי שלו. ליד אנרגיה חשמלית מוכרת. לא ליד הפוקימונים של ביתו.',
        },
        {
          en: "It didn't want to go back to its island while carrying the core... because it was afraid of attacking the Pokemon it lives with.",
          he: 'הוא לא רצה לחזור לאי שלו בזמן שנשא את הליבה... כי הוא פחד לתקוף את הפוקימונים שהוא חי איתם.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-lance-c2-zapdos-end',
      lines: [
        {
          en: '',
          he: 'זאפדוס הוא פוקימון אגדי - הדחף הטבעי שלו הוא להגן ולא להרוס! אפילו תחת שליטת נאל-איקס זאפדוס הצליח להראות התנגדות',
        },

        {
          en: "You've done well today. Continue your journey — Save yourself and dont tell to no one about the cores.",
          he: 'עשית עבודה טובה היום. המשך את המסע שלך — הציל את עצמך ואל תגיד לאף אחד על הליבות.',
        },
        {
          en: 'Currently only us - me , you , the professors and Sir Fracti know about the cores - lets keep it that way',
          he: 'קשה לדעת על מי ניתן לסמוך - כרגע רק הפרופסורים, דון שבריז, אני ואתה יודעים על הליבות - בוא נשמור את זה ככה',
        },
        {
          en: 'I will follow Zapdos to see if it is safe - if he back to his nature or still controlled by the glitch.',
          he: ' נהיה בקשר! - אני אלך בעקבות זאפדוס כדי לראות אם הוא חוזר לטבעו או עדיין נשלט על ידי הגליץ.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_SYM_ZAPDOS_CAVE_DEFEATED } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT3_SYM_ARC_COMPLETE } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act3-sym-rejoin-lance' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act3-sym-to-percentile' } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// Badge 6 earned → Sima post-badge cutscene
registerStoryEvent({
  id: 'evt-sym-badge6-earned',
  trigger: { type: 'badge-earned', badge: 6 },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT3_SYM_BADGE_CUTSCENE_DONE }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act3-sym-sima-reveal' }],
});

// Lance at DayCare — one-shot cutscene on first interact
registerStoryEvent({
  id: 'evt-sym-lance-daycare',
  trigger: { type: 'npc-interact', npcId: 'npc-lance-daycare' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT3_SYM_LANCE_DAYCARE_MET }],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act3-sym-lance-daycare' }],
});

// Player enters cave1 after meeting Lance → ambush
registerStoryEvent({
  id: 'evt-sym-cave-ambush',
  trigger: { type: 'map-enter', mapId: 'routes/route-7-cave2' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT3_SYM_LANCE_DAYCARE_MET },
    { type: 'flag-not', flag: FLAGS.ACT3_SYM_ROCKET_AMBUSH_DONE },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act3-sym-cave-ambush' }],
});

// Jesse/James defeated in cave2 → pokemon restored + quest update
registerStoryEvent({
  id: 'evt-sym-thief-defeated',
  trigger: { type: 'trainer-defeated', trainerId: 'npc-rocket-thief-james' },
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT3_SYM_THIEF_DEFEATED }],
  actions: [
    { type: 'set-flag', flag: FLAGS.ACT3_SYM_THIEF_DEFEATED },
    { type: 'start-cutscene', cutsceneId: 'act3-sym-pokemon-restored' },
  ],
});

// Lance-return in cave1 — one-shot investigate cutscene
registerStoryEvent({
  id: 'evt-sym-lance-cave-return',
  trigger: { type: 'npc-interact', npcId: 'npc-lance-c2-return' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT3_SYM_POKEMON_RESTORED },
    { type: 'flag-not', flag: FLAGS.ACT3_SYM_LANCE_CAVE_RETURN },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act3-sym-lance-cave-investigate' }],
});

// Zapdos defeated/fled in cave1 → core given + debrief
registerStoryEvent({
  id: 'evt-sym-zapdos-cave-defeated',
  trigger: { type: 'trainer-defeated', trainerId: 'npc-zapdos-cave' },
  triggerDelayPostFlag: 2,
  conditions: [{ type: 'flag-not', flag: FLAGS.ACT3_SYM_ZAPDOS_CAVE_DEFEATED }],
  actions: [
    { type: 'set-repel', steps: 80 },
    { type: 'start-cutscene', cutsceneId: 'act3-sym-zapdos-core-obtained' },
  ],
});
