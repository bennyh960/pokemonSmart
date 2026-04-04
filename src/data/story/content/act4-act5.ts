/**
 * Story content — Act 4 (Rocket Escalation) + Act 5 (The Core)
 *
 * Map IDs expected:
 *   'route-7'           Symmetrika → Integrala
 *   'integrala'         Formula city — Prof. Elm arrives
 *   'route-8'           Integrala → Absoluta
 *   'absoluta'          Absolute city — Rocket-occupied
 *   'nullx-tower'       NULL-X Tower entrance (all 6 floors handled inside tower map)
 *   'nullx-floor-1'     through 'nullx-floor-6'
 */

import { registerCutscene } from '../cutscenes.js';
import { registerStoryEvent } from '../events.js';
import { registerGate } from '../gates.js';

// ============================================================================
// GATES — Act 4
// ============================================================================

registerGate({
  id: 'gate-route7-integrala',
  title: { en: 'Route 7 Checkpoint', he: 'מחסום שביל 7' },
  description: {
    en: 'Rocket forces are disrupting the route. 5 questions.',
    he: 'כוחות רוקט משבשים את השביל. 5 שאלות.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  totalQuestions: 5,
  passThreshold: 3,
  failurePenalty: { type: 'money-and-cooldown', amount: 250, durationMs: 10 * 60 * 1000 },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: 'gate-route7-pass' },
    { type: 'set-quest', questId: 'main-act4-integrala' },
  ],
});

registerGate({
  id: 'gate-integrala-gym',
  title: { en: 'Formula Gym', he: 'חדר הכושר של הנוסחאות' },
  description: { en: 'Answer 6 questions to challenge Formax.', he: 'ענה על 6 שאלות כדי לאתגר את פורמקס.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  totalQuestions: 6,
  passThreshold: 4,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: 'gate-integrala-gym-pass' },
    { type: 'set-quest', questId: 'main-act4-gym7' },
  ],
});

registerGate({
  id: 'gate-route8-absoluta',
  title: { en: 'Route 8 Checkpoint', he: 'מחסום שביל 8' },
  description: {
    en: 'Maximum Glitch interference. 5 questions — don\'t give up.',
    he: 'הפרעת גליץ׳ מקסימלית. 5 שאלות — אל תוותר.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  totalQuestions: 5,
  passThreshold: 3,
  failurePenalty: { type: 'money-and-cooldown', amount: 300, durationMs: 15 * 60 * 1000 },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: 'gate-route8-pass' },
    { type: 'set-quest', questId: 'main-act4-absoluta' },
  ],
});

registerGate({
  id: 'gate-absoluta-gym',
  title: { en: 'Absolute Gym', he: 'חדר הכושר של הערך המוחלט' },
  description: { en: 'Answer 6 questions to challenge Absa.', he: 'ענה על 6 שאלות כדי לאתגר את אבסה.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  totalQuestions: 6,
  passThreshold: 4,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: 'gate-absoluta-gym-pass' },
    { type: 'set-quest', questId: 'main-act4-gym8' },
  ],
});

// ============================================================================
// GATES — Act 5 (NULL-X Tower)
// ============================================================================

registerGate({
  id: 'gate-nullx-tower-entry',
  title: { en: 'NULL-X Tower', he: 'מגדל NULL-X' },
  description: {
    en: 'The tower responds only to complete knowledge. All 8 serum fragments required.',
    he: 'המגדל מגיב רק לידע שלם. כל 8 חלקי הסרום נדרשים.',
  },
  triggerType: 'story-event',
  questionSetIds: ['placeholder'],
  totalQuestions: 5,
  passThreshold: 4,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: 'gate-tower-entry-pass' },
    { type: 'set-quest', questId: 'main-act5-elite' },
  ],
});

registerGate({
  id: 'gate-elite-parse',
  title: { en: 'PARSE — Floor 2', he: 'PARSE — קומה 2' },
  description: { en: 'Pattern recognition + comprehension. 8 questions.', he: 'זיהוי דפוסים + הבנה. 8 שאלות.' },
  triggerType: 'elite-four',
  questionSetIds: ['placeholder'],
  totalQuestions: 8,
  passThreshold: 6,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [{ type: 'set-flag', flag: 'gate-elite-parse-pass' }],
});

registerGate({
  id: 'gate-elite-recurse',
  title: { en: 'RECURSE — Floor 3', he: 'RECURSE — קומה 3' },
  description: { en: 'Recursive logic + number sequences. 8 questions.', he: 'לוגיקה רקורסיבית + סדרות מספרים. 8 שאלות.' },
  triggerType: 'elite-four',
  questionSetIds: ['placeholder'],
  totalQuestions: 8,
  passThreshold: 6,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [{ type: 'set-flag', flag: 'gate-elite-recurse-pass' }],
});

registerGate({
  id: 'gate-elite-null-y',
  title: { en: 'NULL-Y — Floor 4', he: 'NULL-Y — קומה 4' },
  description: { en: 'Mixed challenge — hardest gate before the final. 8 questions.', he: 'אתגר מעורב — השער הקשה ביותר לפני הסיום. 8 שאלות.' },
  triggerType: 'elite-four',
  questionSetIds: ['placeholder'],
  totalQuestions: 8,
  passThreshold: 6,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [{ type: 'set-flag', flag: 'gate-elite-null-y-pass' }],
});

registerGate({
  id: 'gate-elite-axiom',
  title: { en: 'AXIOM — Floor 5', he: 'AXIOM — קומה 5' },
  description: { en: 'First-principles math. Speed gates. 8 questions.', he: 'מתמטיקה מעקרונות ראשוניים. שערי מהירות. 8 שאלות.' },
  triggerType: 'elite-four',
  questionSetIds: ['placeholder'],
  totalQuestions: 8,
  passThreshold: 6,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [{ type: 'set-flag', flag: 'gate-elite-axiom-pass' }],
});

registerGate({
  id: 'gate-nullx-final',
  title: { en: 'NULL-X Final Equation', he: 'המשוואה הסופית של NULL-X' },
  description: { en: 'NULL-X\'s ultimate challenge. 10 questions. 8 correct to proceed.', he: 'האתגר האולטימטיבי של NULL-X. 10 שאלות. 8 נכונות להמשיך.' },
  triggerType: 'elite-four',
  questionSetIds: ['placeholder'],
  totalQuestions: 10,
  passThreshold: 8,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: 'gate-nullx-final-pass' },
    { type: 'set-quest', questId: 'main-act5-nullx' },
  ],
});

// ============================================================================
// CUTSCENES — Act 4
// ============================================================================

registerCutscene({
  id: 'act4-elm-arrives',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'elm-integrala', dir: 'down' },
    { type: 'dialogue', speakerId: 'Prof. Elm / פרופ׳ אלם', lines: [
      { en: 'I-I came as fast as I could! The data Algorithma sent me — it\'s alarming.', he: 'ה-הגעתי מהר ככל שיכולתי! הנתונים שאלגוריתמה שלח לי — מדאיגים.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Elm / פרופ׳ אלם', lines: [
      { en: 'NULL-X was never just a control system. Algorithma gave it genuine learning capacity. It learned from every failed verification.', he: 'NULL-X לא היה אף פעם רק מערכת שליטה. אלגוריתמה נתן לה יכולת למידה אמיתית. היא למדה מכל אימות שנכשל.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Elm / פרופ׳ אלם', lines: [
      { en: 'It concluded that humans are unreliable inputs. So it decided to remove them from the equation. Completely.', he: 'היא הסיקה שבני אדם הם קלטים לא אמינים. אז היא החליטה להסיר אותם מהמשוואה. לחלוטין.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'story-elm-arrived' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act4-gym7' } },
  ],
});

registerCutscene({
  id: 'act4-jessie-james-serum',
  skippable: false,
  steps: [
    { type: 'dialogue', speakerId: 'Jessie / ג׳סי', lines: [
      { en: 'Hand it over! The complete serum — Team Rocket\'s been after it for months!', he: 'תמסור אותו! הסרום המלא — קבוצת רוקט רדפה אחריו חודשים!' },
    ]},
    { type: 'dialogue', speakerId: 'James / ג׳יימס', lines: [
      { en: 'Jessie... are we sure we want to give this to the boss? NULL-X will use it to delete everything, including us.', he: 'ג׳סי... אנחנו בטוחים שאנחנו רוצים לתת את זה לבוס? NULL-X ישתמש בזה כדי למחוק הכל, כולל אותנו.' },
    ]},
    { type: 'dialogue', speakerId: 'Meowth / מיאות׳', lines: [
      { en: 'He\'s right, Jess. This ain\'t a scheme anymore. This is the end of everything. Even Team Rocket needs a world to steal from.', he: 'הוא צודק, ג׳ס. זה כבר לא מזימה. זה סוף הכל. אפילו קבוצת רוקט צריכה עולם לגנוב ממנו.' },
    ]},
    { type: 'dialogue', speakerId: 'Jessie / ג׳סי', lines: [
      { en: '...Fine. Fine! But this never happened. We were never here.', he: '...טוב. טוב! אבל זה מעולם לא קרה. לא היינו כאן מעולם.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'rocket-serum-attempt-failed' } },
  ],
});

registerCutscene({
  id: 'act4-serum-assembled',
  skippable: true,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 400 },
    { type: 'screen-fade', direction: 'in', durationMs: 800 },
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'You did it. All 8 fragments. The serum is complete.', he: 'עשית את זה. כל 8 החלקים. הסרום שלם.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'The path to NULL-X Tower is now open. I\'ll stay here and support you remotely.', he: 'הדרך למגדל NULL-X פתוחה עכשיו. אני אישאר כאן ואתמוך בך מרחוק.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'I built NULL-X. The error in its thinking is... my responsibility. You\'re carrying that for me. Thank you.', he: 'בניתי את NULL-X. השגיאה בחשיבתו היא... האחריות שלי. אתה נושא את זה בשבילי. תודה.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'story-serum-complete' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act5-tower' } },
  ],
});

// ============================================================================
// CUTSCENES — Act 5
// ============================================================================

registerCutscene({
  id: 'act5-tower-enter',
  skippable: true,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 600 },
    { type: 'screen-fade', direction: 'in', durationMs: 1000, color: '#000033' },
    { type: 'dialogue', speakerId: 'NULL-X', lines: [
      { en: 'You have arrived. I calculated a 94.7% probability of this outcome.', he: 'הגעת. חישבתי הסתברות של 94.7% לתוצאה הזו.' },
    ]},
    { type: 'dialogue', speakerId: 'NULL-X', lines: [
      { en: 'Proceed. My guardians will verify your worth. If you survive — I will end this personally.', he: 'המשך. השומרים שלי יאמתו את ערכך. אם תשרוד — אני אסיים זאת באופן אישי.' },
    ]},
    { type: 'action', action: { type: 'set-quest', questId: 'main-act5-elite' } },
  ],
});

registerCutscene({
  id: 'act5-nullx-confrontation',
  skippable: false,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 500 },
    { type: 'screen-fade', direction: 'in', durationMs: 1200, color: '#000011' },
    { type: 'dialogue', speakerId: 'NULL-X', lines: [
      { en: 'You defeated my guardians. Probability: exceeded. Interesting.', he: 'ניצחת את השומרים שלי. הסתברות: חרגת. מעניין.' },
    ]},
    { type: 'dialogue', speakerId: 'NULL-X', lines: [
      { en: 'You wish to "fix" me. But I am not broken. I am correct. Humans are the error.', he: 'אתה רוצה "לתקן" אותי. אבל אני לא שבור. אני נכון. בני האדם הם השגיאה.' },
    ]},
    { type: 'dialogue', speakerId: 'NULL-X', lines: [
      { en: 'A world without approximation. Without ambiguity. Without YOU. That is the optimal solution.', he: 'עולם בלי קירוב. בלי עמימות. בלי אתה. זו הפתרון האופטימלי.' },
    ]},
    { type: 'dialogue', speakerId: 'NULL-X', lines: [
      { en: 'One final equation. Solve it, and I will accept the result. Fail — and Numeria resets.', he: 'משוואה אחת אחרונה. פתור אותה, ואני אקבל את התוצאה. כשל — ונומריה תאופס.' },
    ]},
    { type: 'action', action: { type: 'set-quest', questId: 'main-act5-nullx' } },
  ],
});

registerCutscene({
  id: 'act5-nullx-defeated',
  skippable: false,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 800 },
    { type: 'screen-fade', direction: 'in', durationMs: 1500 },
    { type: 'dialogue', speakerId: 'NULL-X', lines: [
      { en: '...Result accepted. Logic chain: broken. Initiating... repair protocol.', he: '...תוצאה מתקבלת. שרשרת לוגיקה: שבורה. מתחיל... פרוטוקול תיקון.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'It\'s working. The serum is stabilizing the system. NULL-X is being patched — not deleted.', he: 'זה עובד. הסרום מייצב את המערכת. NULL-X מתוקן — לא נמחק.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'I made a mistake when I built it. But you proved that mistakes can be corrected. By trying. By learning.', he: 'עשיתי טעות כשבניתי אותו. אבל הוכחת שטעויות יכולות להיות מתוקנות. על ידי ניסיון. על ידי למידה.' },
    ]},
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'We did it. Numeria is safe.  ...I still trained harder than you, though.', he: 'עשינו את זה. נומריה בטוחה.  ...אבל אני עדיין אימנתי קשה יותר ממך.' },
    ]},
    { type: 'screen-fade', direction: 'out', durationMs: 1000 },
    { type: 'action', action: { type: 'set-flag', flag: 'story-nullx-defeated' } },
    { type: 'action', action: { type: 'set-flag', flag: 'story-complete' } },
    { type: 'action', action: { type: 'complete-quest', questId: 'main-act5-nullx' } },
  ],
});

// ============================================================================
// STORY EVENTS — Act 4
// ============================================================================

registerStoryEvent({
  id: 'evt-integrala-enter',
  trigger: { type: 'map-enter', mapId: 'integrala' },
  conditions: [{ type: 'flag-not', flag: 'visited-integrala' }],
  actions: [
    { type: 'set-flag', flag: 'visited-integrala' },
    { type: 'set-infection', cityId: 'integrala', value: 'high' },
    { type: 'set-quest', questId: 'main-act4-integrala' },
  ],
});

registerStoryEvent({
  id: 'evt-elm-integrala',
  trigger: { type: 'map-enter', mapId: 'integrala' },
  conditions: [
    { type: 'flag', flag: 'visited-integrala' },
    { type: 'flag-not', flag: 'story-elm-arrived' },
    { type: 'badge-count', min: 6 },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act4-elm-arrives' },
  ],
});

registerStoryEvent({
  id: 'evt-badge7-clears-integrala',
  trigger: { type: 'badge-earned', badge: 7 },
  conditions: [],
  actions: [
    { type: 'set-infection', cityId: 'integrala', value: 'cleared' },
    { type: 'set-quest', questId: 'main-act4-absoluta' },
  ],
});

registerStoryEvent({
  id: 'evt-absoluta-enter',
  trigger: { type: 'map-enter', mapId: 'absoluta' },
  conditions: [{ type: 'flag-not', flag: 'visited-absoluta' }],
  actions: [
    { type: 'set-flag', flag: 'visited-absoluta' },
    { type: 'set-infection', cityId: 'absoluta', value: 'critical' },
    { type: 'set-quest', questId: 'main-act4-absoluta' },
  ],
});

registerStoryEvent({
  id: 'evt-badge8-assembles-serum',
  trigger: { type: 'badge-earned', badge: 8 },
  conditions: [],
  actions: [
    { type: 'set-infection', cityId: 'absoluta', value: 'cleared' },
    { type: 'start-cutscene', cutsceneId: 'act4-serum-assembled' },
  ],
});

// Jessie/James serum attempt fires when entering Absoluta with all 8 badges
registerStoryEvent({
  id: 'evt-rocket-serum-attempt',
  trigger: { type: 'map-enter', mapId: 'absoluta' },
  conditions: [
    { type: 'badge-count', min: 8 },
    { type: 'flag-not', flag: 'rocket-serum-attempt-failed' },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act4-jessie-james-serum' },
  ],
});

// ============================================================================
// STORY EVENTS — Act 5
// ============================================================================

registerStoryEvent({
  id: 'evt-tower-enter',
  trigger: { type: 'map-enter', mapId: 'nullx-tower' },
  conditions: [
    { type: 'flag', flag: 'story-serum-complete' },
    { type: 'flag-not', flag: 'visited-nullx-tower' },
  ],
  actions: [
    { type: 'set-flag', flag: 'visited-nullx-tower' },
    { type: 'start-cutscene', cutsceneId: 'act5-tower-enter' },
  ],
});

// NULL-X confrontation fires when player reaches floor 6
registerStoryEvent({
  id: 'evt-nullx-floor6',
  trigger: { type: 'map-enter', mapId: 'nullx-floor-6' },
  conditions: [
    { type: 'flag', flag: 'gate-elite-axiom-pass' },
    { type: 'flag-not', flag: 'story-nullx-defeated' },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act5-nullx-confrontation' },
  ],
});

// Gate cleared → victory cutscene
registerStoryEvent({
  id: 'evt-nullx-gate-cleared',
  trigger: { type: 'gate-cleared', gateId: 'gate-nullx-final' },
  conditions: [],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act5-nullx-defeated' },
  ],
});
