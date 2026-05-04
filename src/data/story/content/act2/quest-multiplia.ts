/**
 * ACT 2: Route 3 + Multiplia — Fake Nurse + Multiplication Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * The story get more clearence , the player meet oak and gym leader in library as contuinue quest of prev act
 * the dialouge should explain about the glitches , those are real pokemon that infected and act like zombies , immposible to capture by our technoloiges
 * but team rocket has the pokeballs to capture them . they become powerfull. profesor oak says he goes to meet algotritmia
 * the gym leader says invite player to gym battle . on gym entrance the gym lader call and appologice says that a glitches has discovered on route 6
 * and he need helps . inside the  gym we blocke paths by some npc (need flag ) . new quest go helps to gym leader .
 * on going to route 6 player and gym leader battle some 6-7 rocket grunts + jessi and james , on all defeated officer jenny arrive to start new cutscne .
 * and Jenni says about thier plan to infect the cities by glitches right now the infection is medium and 50% of pokemons are infected .
 * gym leader warn player - we will beat them but make sure you capture enough pokemons before they are all infected .
 * he talk again about the the gym battle but he ask the player to do some favor - in a his private house - his wife there and she is sick and need help to get some medicine.
 * the medicine is in zerovile in the revive make house (we will create a new NPC that will give the medicine - it will be just a flag ) then quest .
 *  player go to zerovile and get the medicine and give it to gym leader wife on flag set the proffesor call and ask to visit him .
 * a new cutscne - in the lab proffesor oak , algo and lance from the elit-4
 *  they explain that they analzyed the evidence , and based rocket invastigations they know that the glitches are result of a virus that infect the pokemons and make them more aggressive and stronger
 * but also make them uncontrollable and impossible to capture by normal means . the proffesor told player they were a team who built the Null-x , they dont understand how they
 * the team rocket took control over it until they figure out in the documents . they stole the AI Cors . the cors are 8 items spread around the regions and those was the soul of the null-x
 * they stole them and place fake cors . they will built a machine that will be able to detect the cors and notify the heros about the locations .
 * lance says good bye and goes .
 * new quest - go back to multiplia to gym battle
 *
 *
 * cities involve : multipila , zerovile
 * interior : zerovile/revive-house , zerovile/algoritmia-lab , multiplia/gym , multiplia/gym-leader-house
 * npcs : gym leader , gym leader wife , professor oak , algo , lance , team rocket grunts , jessi and james , officer jenny
 * blockers and flags
 * quest :
 * 0- (from prev act ) meet professor oak in library and gym leader in library
 * 1- go to gym
 * 2- help gym leader by battle team rocket grunts + jessi and james in route 6
 * 3- meet officer jenny in route 6
 * 4- help gym leader wife by getting medicine from zerovile
 * 5- meet professor oak in his lab
 * 6- interact with gym leader wife to despawn gym blocker
 * 7- battle gym leader in multiplia gym
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';

// ── Gates ───────────────────────────────────────────────────────────────────

//#region ── Gates ─────────────────────────────────────────────────────────────────────
registerGate({
  id: 'gate-route4-multiplia',
  title: { en: 'Route 4 Checkpoint', he: 'מחסום שביל 4' },
  description: {
    en: 'The Glitch has warped the signs on this route. 6 questions to proceed.',
    he: 'הגליץ׳ עיוות את השלטים בשביל הזה. 6 שאלות כדי להמשיך.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['*'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 7,
    penaltyAmount: 500,
    bonusEnabled: true,
    bonusMultiplier: 3,
    inputQuestions: { count: 2, types: ['×'] },
    penaltyThreshold: 0.5,
    rewardThreshold: 0.7,
    rewards: [
      { type: 'money', amount: 1500 },
      { type: 'item', itemId: 'x-attack', amount: 1 },
      { type: 'item', itemId: 'x-defense', amount: 1 },
      { type: 'item', itemId: 'x-speed', amount: 1 },
    ],
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ROUTE4_PASS }],
});
registerGate({
  id: 'gate-route6-multiplia',
  title: { en: 'Route 6 Checkpoint', he: 'מחסום שביל 6' },
  description: {
    en: 'The Glitch has warped the signs on this route. 10 questions to proceed.',
    he: 'הגליץ׳ עיוות את השלטים בשביל הזה. 10 שאלות כדי להמשיך.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['*', '+'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 10,
    penaltyAmount: 1500,
    bonusEnabled: true,
    bonusMultiplier: 3,
    inputQuestions: { count: 5, types: ['×'] },
    penaltyThreshold: 0.5,
    rewardThreshold: 0.8,
    rewards: [
      { type: 'money', amount: 3500 },
      { type: 'item', itemId: 'great-ball', amount: 3 },
    ],
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ROUTE6_PASS }],
});
registerGate({
  id: 'gate-route5-multiplia',
  title: { en: 'Route 5 Checkpoint', he: 'מחסום שביל 5' },
  description: {
    en: 'The Glitch has warped the signs on this route. 8 questions to proceed.',
    he: 'הגליץ׳ עיוות את השלטים בשביל הזה. 8 שאלות כדי להמשיך.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['*', '+', '-'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 8,
    penaltyAmount: 1500,
    bonusEnabled: true,
    bonusMultiplier: 3,
    inputQuestions: { count: 5, types: ['×', '-', '+'] },
    penaltyThreshold: 0.5,
    rewardThreshold: 0.8,
    rewards: [
      { type: 'money', amount: 3500 },
      { type: 'item', itemId: 'ultra-ball', amount: 2 },
    ],
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ROUTE5_PASS }],
});

registerGate({
  id: 'gate-route9-multiplia',
  title: { en: 'Route 9 Checkpoint', he: 'מחסום שביל 9' },
  description: {
    en: 'The Glitch has warped the signs on this route. 8 questions to proceed.',
    he: 'הגליץ׳ עיוות את השלטים בשביל הזה. 8 שאלות כדי להמשיך.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['*', '+', '-'],
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 8,
    penaltyAmount: 1500,
    bonusEnabled: true,
    bonusMultiplier: 3,
    inputQuestions: { count: 5, types: ['×', '-', '+'] },
    penaltyThreshold: 0.5,
    rewardThreshold: 0.8,
    rewards: [
      { type: 'money', amount: 3500 },
      { type: 'item', itemId: 'max-repel', amount: 2 },
    ],
  },
  reopenCooldownMs: 15 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ROUTE9_PASS }],
});
// #endregion

//#region ── Quests ─────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act2-go-to-gym',
  title: { en: 'The Multiplication Gym', he: 'מכון הכפל' },
  objective: {
    en: 'Visit Kefel at the Multiplia Gym',
    he: 'בקר את קפטן קפל במכון מולטיפילה',
  },
});

registerQuest({
  id: 'main-act2-help-route6',
  title: { en: 'Route 6 in Danger', he: 'שביל 6 בסכנה' },
  objective: {
    en: 'Help Kefel defeat Team Rocket grunts on Route 6',
    he: 'עזור לקפטן קפל להביס את סוכני צוות רוקט בשביל 6',
  },
});

registerQuest({
  id: 'main-act2-medicine',
  title: { en: 'Special Medicine', he: 'תרופה מיוחדת' },
  objective: {
    en: "Get the herbal remedy from Rick in Zeroville's Revive House",
    he: 'קבל את תרופת העשבים מריק בבית הרבייבים בזירוביל',
  },
});

registerQuest({
  id: 'main-act2-wife',
  title: { en: "Kefel's Wife", he: 'אשת קפטן קפל' },
  objective: {
    en: "Bring the medicine to Kefel's wife at his house in Multiplia",
    he: 'הבא את התרופה לאשת קפטן קפל בביתו במולטיפילה',
  },
});

registerQuest({
  id: 'main-act2-visit-lab',
  title: { en: "Professor's Call", he: 'שיחת הפרופסור' },
  objective: {
    en: "Visit Prof. Algorithma's lab in Zeroville",
    he: "בקר במעבדה של פרופ' אלגוריתמה בזירוביל",
  },
});

registerQuest({
  id: 'main-act2-gym-battle',
  title: { en: 'Back to the Gym', he: 'בחזרה למכון' },
  objective: {
    en: 'Challenge Kefel at the Multiplia Gym',
    he: 'אתגר את קפטן קפל במכון מולטיפילה',
  },
});

//#endregion

//#region ── Story Events ──────────────────────────────────────────────────────────────

// Step 0: Library — player interacts with Oak → library cutscene + completes act1 doc quest
registerStoryEvent({
  id: 'act2-library-oak-interact',
  trigger: { type: 'npc-interact', npcId: 'npc-multi-lib-oak' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT1_SECRET_DOC_2_RECEIVED },
    { type: 'flag-not', flag: FLAGS.ACT2_LIBRARY_SCENE_DONE },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act2-library-meeting' }],
});

// Step 1: First entry to gym → Kefel calls about Route 6
registerStoryEvent({
  id: 'act2-gym-entry',
  trigger: { type: 'map-enter', mapId: 'multiplia/gym' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT2_LIBRARY_SCENE_DONE },
    { type: 'flag-not', flag: FLAGS.ACT2_GYM_LEADER_CALLED },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act2-gym-entry-call' }],
});

// Step 2: All Route 6 Rocket trainers defeated → Jenny cutscene
registerStoryEvent({
  id: 'act2-route6-cleared',
  trigger: { type: 'flag-set', flag: 'all-trainers-defeated-routes/route-6' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT2_GYM_LEADER_CALLED },
    { type: 'flag-not', flag: FLAGS.ACT2_ROUTE6_JENNY_DONE },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act2-route6-jenny' }],
});

// Step 3 (chain): Medicine flag set → advance quest to wife delivery
registerStoryEvent({
  id: 'act2-medicine-chain',
  trigger: { type: 'flag-set', flag: FLAGS.ACT2_MEDICINE_RECEIVED },
  actions: [{ type: 'set-quest', questId: 'main-act2-wife' }],
});

// Step 4: Player interacts with wife while holding medicine → delivery cutscene
registerStoryEvent({
  id: 'act2-wife-interact',
  trigger: { type: 'npc-interact', npcId: 'npc-kefel-wife' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT2_MEDICINE_RECEIVED },
    { type: 'flag-not', flag: FLAGS.ACT2_WIFE_HELPED },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act2-wife-medicine' }],
});

// Step 5: Enter Algorithma lab after wife helped → big reveal cutscene
registerStoryEvent({
  id: 'act2-lab-enter',
  trigger: { type: 'map-enter', mapId: 'zeroville/algorithma-lab' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT2_WIFE_HELPED },
    { type: 'flag-not', flag: FLAGS.ACT2_LAB_CUTSCENE_DONE },
  ],
  actions: [{ type: 'start-cutscene', cutsceneId: 'act2-lab-cores-reveal' }],
});

//#endregion

//#region ── Cutscenes ─────────────────────────────────────────────────────────────────

// ── Cutscene 1: Library — Oak + Kefel ─────────────────────────────────────────
registerCutscene({
  id: 'act2-library-meeting',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'npc-multi-lib-oak', dir: 'down' },
    { type: 'face-npc', npcId: 'npc-captain-kefel-lib', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'npc-multi-lib-oak',
      lines: [
        { en: 'Excellent — you made it. Gary told me to expect you.', he: 'מצוין — הגעת. גארי אמר לי לצפות לך.' },
        {
          en: "I've studied the document carefully. These creatures — the Glitches — are real Pokemon that have been infected by a virus.",
          he: 'במסמך יש כתב סתרים דיי בסיסי. כתוב פה שהיצורים האלה — הגליצ׳ים — הם פוקימונים אמיתיים שנדבקו בווירוס.',
        },
        {
          en: 'The infection makes them aggressive, unpredictable, and completely impossible to capture with standard Pokéballs.',
          he: 'ההדבקה הופכת אותם לאגרסיביים, בלתי צפויים, ובלתי ניתנים לתפיסה עם כדורי פוקה רגילים.',
        },
        {
          en: "But Team Rocket has developed special Pokéballs that can capture them — and they become dangerously powerful in Rocket's hands.",
          he: 'אבל לצוות רוקט יש כדורי פוקה מיוחדים שיכולים לתפוס אותם — והם הופכים לחזקים בצורה מסוכנת בידי רוקט.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-multi-lib-oak',
      lines: [
        { en: "Ohh theres some symbols here that i can't decipher.", he: 'אווה יש פה כמה סמלים שאני לא מצליח לפענח.' },
        {
          en: "I'm heading to Algorithma's lab right now. She must analyse this immediately.",
          he: 'אני הולך למעבדה של אלגוריתמה עכשיו. נמשיך לנתח את זה ביחד.',
        },
      ],
    },
    { type: 'face-npc', npcId: 'npc-captain-kefel-lib', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'npc-captain-kefel-lib',
      lines: [
        {
          en: "Good timing meeting you here. I'm Kefel — I run the Multiplication Gym in this city.",
          he: 'תזמון טוב לפגוש אותך כאן. אני קפל — אני מנהל את מכון הכפל בעיר הזו.',
        },
        {
          en: 'I heared about yout ! impressive , so young and so talent. not givven up and not afraid from challengs',
          he: 'שמעתי עליך! מרשים, כל כך צעיר וכישרוני. לא ויתרת ולא פחדת מאתגרים',
        },
        {
          en: "You've been handling Team Rocket out there? Impressive. Come challenge me at the gym — I want to test you myself!",
          he: ' בוא לאתגר אותי במכון — אני רוצה לבדוק אותך בעצמי!',
        },
      ],
    },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act1-deliver-doc' } },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT2_LIBRARY_SCENE_DONE } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act2-go-to-gym' } },
  ],
});

// ── Cutscene 2: Gym entry — phone call from Kefel ─────────────────────────────
registerCutscene({
  id: 'act2-gym-entry-call',
  skippable: false,
  phoneCaller: { en: 'Kefel', he: 'קפל' },
  steps: [
    {
      type: 'dialogue',
      speakerName: 'Kefel / קפל',
      lines: [
        { en: "Sorry — I'm not at the gym right now. Something came up.", he: 'סליחה — אני לא במכון כרגע. משהו קרה.' },
        {
          en: 'A Glitch swarm was spotted on Route 6 and I saw Team Rocket grunts with them. This is serious.',
          he: 'נצפתה להקת גליץ׳ בשביל 6 וראיתי כוחות צוות רוקט עמם. זה חמור.',
        },
        {
          en: "Please go to Route 6 and help drive them off! I'll get there as fast as I can.",
          he: 'בבקשה לך לשביל 6 ועזור לגרש אותם! אני אגיע לשם מהר ככל שאוכל.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT2_GYM_LEADER_CALLED } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act2-help-route6' } },
  ],
});

// ── Cutscene 3: Route 6 — Jenny arrives after all Rocket defeated ─────────────
registerCutscene({
  id: 'act2-route6-jenny',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'jenny-r6', dir: 'down' },
    {
      type: 'move-npc',
      npcId: 'jenny-r6',
      path: ['right', 'right', 'right', 'right'],
      waitForComplete: true,
    },
    {
      type: 'dialogue',
      speakerId: 'jenny-r6',
      lines: [
        { en: 'Officer Jenny — I got here as fast as I could.', he: "שוטרת ג'ני — הגעתי מהר ככל שיכולתי." },
        {
          en: 'Good work taking down those Rocket operatives. But the situation is worse than it looks.',
          he: 'עבודה טובה להפיל את אנשי רוקט. אבל המצב גרוע ממה שנראה.',
        },
        {
          en: 'The infection is already at 50%. Half the wild Pokemon in the region have been exposed to the Glitch virus.',
          he: 'ההדבקה כבר ב-50%. חצי מפוקימוני הפרא באזור נחשפו לוירוס הגליץ׳.',
        },
        {
          en: "Team Rocket's plan is to push that number to 100% — spreading Glitches into every city and town in Numeria.",
          he: 'התכנית של צוות רוקט היא לדחוף את המספר הזה ל-100% — להפיץ גליץ׳ים לכל עיר וכפר בנומריה.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerName: 'Kefel / קפל',
      lines: [
        {
          en: 'Then we need to act fast. Trainer — catch as many Pokemon as you can before they get infected.',
          he: 'אז אנחנו צריכים לפעול מהר. מאמן — תפוס כמה שיותר פוקימונים לפני שהם נדבקים.',
        },
        {
          en: 'A Glitched Pokemon cannot be caught at all. Once they turn, they are gone forever.',
          he: 'פוקימון שהפך לגליץ׳ לא ניתן לתפיסה בכלל. ברגע שהם הופכים, הם אבודים לנצח.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'jenny-r6',
      lines: [
        {
          en: "I'll radio for backup and secure this route. You two — stay sharp.",
          he: 'אני אדווח לגיבוי ואבטיח את השביל הזה. שניכם — תישארו ערניים.',
        },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'jenny-r6',
      path: ['left', 'left', 'left', 'left', 'left'],
      waitForComplete: false,
    },
    {
      type: 'dialogue',
      speakerName: 'Kefel / קפל',
      lines: [
        {
          en: 'I still owe you a gym battle. Come find me at the gym soon.',
          he: 'אני עדיין חייב לך קרב מכון. בוא למצוא אותי במכון בקרוב.',
        },
        {
          en: 'But first... can you do me a personal favour?',
          he: 'אבל קודם... האם תוכל לעשות לי טובה אישית?',
        },
        {
          en: 'My wife is ill at our house in Multiplia. She needs a special herbal remedy — the kind only Rick in Zeroville can prepare.',
          he: 'אשתי חולה בביתנו במולטיפילה. היא צריכה תרופת עשבים מיוחדת — הסוג שרק ריק בזירוביל יכול להכין.',
        },
        {
          en: 'Go to the Revive House in Zeroville and ask Rick. He will know exactly what she needs.',
          he: 'לך לבית הרבייבים בזירוביל ושאל את ריק. הוא ידע בדיוק מה היא צריכה.',
        },
        {
          en: 'Please bring it to her. I will meet you at the gym as soon as I finish here.',
          he: 'בבקשה הבא לה אותה. אני אפגוש אותך במכון בהקדם שאסיים כאן.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT2_ROUTE6_JENNY_DONE } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act2-medicine' } },
  ],
});

// ── Cutscene 4: Wife — medicine delivered ─────────────────────────────────────
registerCutscene({
  id: 'act2-wife-medicine',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'npc-kefel-wife', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'npc-kefel-wife',
      lines: [
        {
          en: 'Oh — you are the trainer my husband called about? He said you might come.',
          he: 'אוה — אתה המאמן שבעלי התקשר לגביו? הוא אמר שאולי תבוא.',
        },
        {
          en: "You brought Rick's remedy? Thank you so much... I already feel a little better just knowing it is here.",
          he: 'הבאת את התרופה של ריק? תודה רבה לך... אני כבר מרגישה קצת יותר טוב רק מזה שהיא כאן.',
        },
        {
          en: 'Please tell Kefel not to worry about me. He should focus on the gym — and on what is happening out there.',
          he: 'בבקשה אמור לקפל לא לדאוג לגבי. הוא צריך להתמקד במכון — ובמה שקורה שם בחוץ.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT2_WIFE_HELPED } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act2-visit-lab' } },
  ],
});

// ── Cutscene 5: Algorithma Lab — Oak + Algo + Lance, AI Cores reveal ──────────
registerCutscene({
  id: 'act2-lab-cores-reveal',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'npc-oak-algo-lab', dir: 'down' },
    { type: 'face-npc', npcId: 'npc-lance-algo-lab', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'npc-oak-algo-lab',
      lines: [
        { en: 'Good — you came. We have been waiting.', he: 'טוב — באת. חיכינו לך.' },
        {
          en: "We have analysed all the evidence. The Glitch virus doesn't just infect Pokemon by accident — it was engineered to.",
          he: 'ניתחנו את כל הראיות. וירוס הגליץ׳ לא מדביק פוקימונים במקרה — הוא תוכנן לעשות זאת.',
        },
        {
          en: 'Infected Pokemon become more aggressive and far stronger — but also completely uncontrollable. Standard Pokéballs cannot hold them.',
          he: 'פוקימונים נגועים הופכים לאגרסיביים יותר וחזקים בהרבה — אבל גם לבלתי ניתנים לשליטה לחלוטין. כדורי פוקה רגילים לא יכולים להחזיק אותם.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'algorithma',
      lines: [
        {
          en: 'Professor Oak and I... we were part of the original team that built NULL-X.',
          he: 'פרופסור אוק ואני... היינו חלק מהצוות המקורי שבנה את NULL-X.',
        },
        {
          en: 'We designed it to solve mathematical problems beyond human ability — to be a tool for good.',
          he: 'תכננו אותו לפתור בעיות מתמטיות מעבר ליכולת אנושית — להיות כלי לטובה.',
        },
        {
          en: 'For years we could not understand how Team Rocket gained control over it... until we found these documents.',
          he: 'במשך שנים לא יכולנו להבין איך צוות רוקט השיג שליטה עליו... עד שמצאנו את המסמכים האלה.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-lance-algo-lab',
      lines: [
        { en: 'They stole the AI Cores.', he: 'הם גנבו את ליבות הבינה המלאכותית.' },
        {
          en: 'NULL-X was built around 8 Cores — each one a fragment of its intelligence and will. Together they form its soul.',
          he: 'NULL-X נבנה סביב 8 ליבות — כל אחת שבר מהאינטליגנציה ורצון שלו. יחד הן מרכיבות את נשמתו.',
        },
        {
          en: 'Team Rocket stole the real Cores and placed fakes in their place. With the originals, they can direct NULL-X — and through it, control the Glitch virus across all of Numeria.',
          he: 'צוות רוקט גנב את הליבות האמיתיות ושם מזויפות במקומן. עם המקוריות, הם יכולים לכוון את NULL-X — ודרכו, לשלוט בוירוס הגליץ׳ ברחבי כל נומריה.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-oak-algo-lab',
      lines: [
        {
          en: 'The 8 Cores were scattered across Numeria — hidden in different locations around the region.',
          he: '8 הליבות פוזרו ברחבי נומריה — מוסתרות במיקומים שונים ברחבי האזור.',
        },
        {
          en: "Algorithma is building a detection machine. Once complete, it will scan the region and notify you of each Core's location.",
          he: 'אלגוריתמה בונה מכונת גילוי. ברגע שתהיה מוכנה, היא תסרוק את האזור ותודיע לך על מיקום כל ליבה.',
        },
        {
          en: "Find the real Cores. Replace the fakes. It is the only way to break Team Rocket's control over NULL-X — and stop the Glitch infection for good.",
          he: 'מצא את הליבות האמיתיות. החלף את המזויפות. זוהי הדרך היחידה לשבור את שליטת צוות רוקט על NULL-X — ולעצור את הדבקת הגליץ׳ לצמיתות.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'npc-lance-algo-lab',
      lines: [
        {
          en: 'I must return to the Elite Four. We have our own preparations to make.',
          he: 'אני חייב לחזור לאליטה הארבע. יש לנו הכנות משלנו לעשות.',
        },
        {
          en: 'Stay strong, trainer. The fate of Numeria is closer to your hands than you realise.',
          he: 'תישאר חזק, מאמן. גורל נומריה קרוב לידיים שלך יותר ממה שאתה מבין.',
        },
      ],
    },
    {
      type: 'move-npc',
      npcId: 'npc-lance-algo-lab',
      path: ['down', 'down', 'down', 'down', 'down'],
      waitForComplete: false,
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT2_LAB_CUTSCENE_DONE } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act2-gym-battle' } },
  ],
});

//#endregion
