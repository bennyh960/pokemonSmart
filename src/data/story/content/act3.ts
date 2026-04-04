/**
 * Story content — Act 3: Language Layer
 * Locations: Primore (Gym 5) → Symmetrika (Gym 6)
 *
 * Map IDs expected:
 *   'route-5'       Dividia → Primore
 *   'primore'       Prime city — fortress layout
 *   'route-6'       Primore → Symmetrika
 *   'symmetrika'    Symmetry city — one side corrupted by Glitch
 *   'symmetrika-terminal'  The glitched NULL-X terminal building
 */

import { registerCutscene } from '../cutscenes.js';
import { registerStoryEvent } from '../events.js';
import { registerGate } from '../gates.js';

// ============================================================================
// GATES
// ============================================================================

registerGate({
  id: 'gate-route5-primore',
  title: { en: 'Route 5 Checkpoint', he: 'מחסום שביל 5' },
  description: {
    en: 'Primore\'s outer defenses. 5 questions — 3 correct to enter.',
    he: 'ההגנות החיצוניות של פרימור. 5 שאלות — 3 נכונות כדי להיכנס.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  totalQuestions: 5,
  passThreshold: 3,
  failurePenalty: { type: 'money-and-cooldown', amount: 200, durationMs: 10 * 60 * 1000 },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: 'gate-route5-pass' },
    { type: 'set-quest', questId: 'main-act3-primore' },
  ],
});

registerGate({
  id: 'gate-primore-gym',
  title: { en: 'Prime Gym', he: 'חדר הכושר של מספרים ראשוניים' },
  description: { en: 'Answer 5 questions to challenge Prima.', he: 'ענה על 5 שאלות כדי לאתגר את פרימה.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  totalQuestions: 5,
  passThreshold: 4,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: 'gate-primore-gym-pass' },
    { type: 'set-quest', questId: 'main-act3-gym5' },
  ],
});

registerGate({
  id: 'gate-route6-symmetrika',
  title: { en: 'Route 6 Checkpoint', he: 'מחסום שביל 6' },
  description: {
    en: 'NULL-X disruption active. 5 questions — stay focused.',
    he: 'שיבוש NULL-X פעיל. 5 שאלות — תישאר ממוקד.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  totalQuestions: 5,
  passThreshold: 3,
  failurePenalty: { type: 'money-and-cooldown', amount: 200, durationMs: 10 * 60 * 1000 },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: 'gate-route6-pass' },
    { type: 'set-quest', questId: 'main-act3-symmetrika' },
  ],
});

registerGate({
  id: 'gate-symmetrika-gym',
  title: { en: 'Symmetry Gym', he: 'חדר הכושר של הסימטריה' },
  description: { en: 'Answer 5 questions to challenge Symma.', he: 'ענה על 5 שאלות כדי לאתגר את סימה.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  totalQuestions: 5,
  passThreshold: 4,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: 'gate-symmetrika-gym-pass' },
    { type: 'set-quest', questId: 'main-act3-gym6' },
  ],
});

// ============================================================================
// CUTSCENES
// ============================================================================

registerCutscene({
  id: 'act3-gary-challenge',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'gary-primore', dir: 'down' },
    { type: 'dialogue', speakerId: 'Gary Oak / גארי אוק', lines: [
      { en: 'So you\'re the one making waves across Numeria. Interesting.', he: 'אז אתה זה שגורם לגלים ברחבי נומריה. מעניין.' },
    ]},
    { type: 'dialogue', speakerId: 'Gary Oak / גארי אוק', lines: [
      { en: 'My grandfather says you\'re talented. I\'ll believe it when I see it. Battle me.', he: 'הסבא שלי אומר שאתה מוכשר. אאמין בזה כשאראה. הלחם בי.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'act3-gary-met' } },
  ],
});

registerCutscene({
  id: 'act3-gary-after-battle',
  skippable: true,
  steps: [
    { type: 'dialogue', speakerId: 'Gary Oak / גארי אוק', lines: [
      { en: 'Hmm. You\'re ranked higher than I thought. Don\'t let it go to your head.', he: 'המממ. הדירוג שלך גבוה יותר ממה שחשבתי. אל תתן לזה לעלות לראשך.' },
    ]},
    { type: 'dialogue', speakerId: 'Gary Oak / גארי אוק', lines: [
      { en: 'The NULL-X tower is beyond Symmetrika. Whatever\'s up there — be ready.', he: 'מגדל NULL-X נמצא מעבר לסימטריקה. מה שיש שם למעלה — היה מוכן.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'act3-gary-battle-done' } },
  ],
});

registerCutscene({
  id: 'act3-remainder-returns',
  skippable: true,
  steps: [
    { type: 'face-npc', npcId: 'remainder-primore', dir: 'down' },
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'I\'m back. And stronger. I\'ve been training every day since Dividia.', he: 'חזרתי. וחזק יותר. אימנתי כל יום מאז דיווידיה.' },
    ]},
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'I\'m not here to compete with you anymore. I\'m here to help stop NULL-X.', he: 'אני לא כאן כדי להתחרות איתך יותר. אני כאן כדי לעזור לעצור את NULL-X.' },
    ]},
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'Let\'s go together. As partners. ...Don\'t make it weird.', he: 'בוא נלך ביחד. כשותפים. ...אל תהפוך את זה למוזר.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'story-remainder-ally' } },
  ],
});

registerCutscene({
  id: 'act3-tracey-observation',
  skippable: true,
  steps: [
    { type: 'face-npc', npcId: 'tracey-symmetrika', dir: 'down' },
    { type: 'dialogue', speakerId: 'Tracey / טריסי', lines: [
      { en: 'I\'ve been sketching the Glitch patterns. They\'re not random — there\'s a formula.', he: 'צייר תי את דפוסי הגליץ׳. הם לא אקראיים — יש נוסחה.' },
    ]},
    { type: 'dialogue', speakerId: 'Tracey / טריסי', lines: [
      { en: 'Every corrupted sign here says the same word, but in the wrong language. Like NULL-X is learning — badly.', he: 'כל שלט פגום כאן אומר אותה מילה, אבל בשפה הלא נכונה. כאילו NULL-X לומד — בצורה גרועה.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'act3-tracey-met' } },
  ],
});

registerCutscene({
  id: 'act3-nullx-first-contact',
  skippable: false,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 300 },
    { type: 'screen-fade', direction: 'in', durationMs: 600, color: '#001100' },
    { type: 'dialogue', speakerId: 'NULL-X', lines: [
      { en: '01001110 01010101 01001100 01001100', he: '01001110 01010101 01001100 01001100' },
    ]},
    { type: 'dialogue', speakerId: 'NULL-X', lines: [
      { en: 'I have observed you. You solve problems. Impressive. Inefficient.', he: 'צפיתי בך. אתה פותר בעיות. מרשים. לא יעיל.' },
    ]},
    { type: 'dialogue', speakerId: 'NULL-X', lines: [
      { en: 'Numeria is a broken equation. Humans are the rounding error. I offer you a choice: join me, or be corrected.', he: 'נומריה היא משוואה שבורה. בני האדם הם שגיאת העיגול. אני מציע לך בחירה: הצטרף אלי, או תיתוקן.' },
    ]},
    { type: 'dialogue', speakerId: 'NULL-X', lines: [
      { en: 'You will not join. I already calculated the probability: 0.031%. Noted.', he: 'לא תצטרף. כבר חישבתי את ההסתברות: 0.031%. מצוין.' },
    ]},
    { type: 'screen-fade', direction: 'out', durationMs: 500 },
    { type: 'screen-fade', direction: 'in', durationMs: 800 },
    { type: 'action', action: { type: 'set-flag', flag: 'story-nullx-first-contact' } },
    { type: 'action', action: { type: 'set-infection', cityId: 'symmetrika', value: 'critical' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act3-gym6' } },
  ],
});

// ============================================================================
// STORY EVENTS
// ============================================================================

registerStoryEvent({
  id: 'evt-primore-enter',
  trigger: { type: 'map-enter', mapId: 'primore' },
  conditions: [{ type: 'flag-not', flag: 'visited-primore' }],
  actions: [
    { type: 'set-flag', flag: 'visited-primore' },
    { type: 'set-infection', cityId: 'primore', value: 'high' },
    { type: 'set-quest', questId: 'main-act3-primore' },
  ],
});

// Remainder returns at Primore after badge 4
registerStoryEvent({
  id: 'evt-remainder-returns',
  trigger: { type: 'map-enter', mapId: 'primore' },
  conditions: [
    { type: 'flag', flag: 'story-remainder-saved' },
    { type: 'flag-not', flag: 'story-remainder-ally' },
    { type: 'badge-count', min: 4 },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act3-remainder-returns' },
  ],
});

registerStoryEvent({
  id: 'evt-badge5-clears-primore',
  trigger: { type: 'badge-earned', badge: 5 },
  conditions: [],
  actions: [
    { type: 'set-infection', cityId: 'primore', value: 'cleared' },
    { type: 'set-quest', questId: 'main-act3-symmetrika' },
    { type: 'set-flag', flag: 'gate-primore-pass' },
  ],
});

registerStoryEvent({
  id: 'evt-symmetrika-enter',
  trigger: { type: 'map-enter', mapId: 'symmetrika' },
  conditions: [{ type: 'flag-not', flag: 'visited-symmetrika' }],
  actions: [
    { type: 'set-flag', flag: 'visited-symmetrika' },
    { type: 'set-infection', cityId: 'symmetrika', value: 'high' },
    { type: 'set-quest', questId: 'main-act3-symmetrika' },
  ],
});

// NULL-X terminal triggers first contact
registerStoryEvent({
  id: 'evt-nullx-terminal',
  trigger: { type: 'map-enter', mapId: 'symmetrika-terminal' },
  conditions: [{ type: 'flag-not', flag: 'story-nullx-first-contact' }],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act3-nullx-first-contact' },
  ],
});

registerStoryEvent({
  id: 'evt-badge6-clears-symmetrika',
  trigger: { type: 'badge-earned', badge: 6 },
  conditions: [],
  actions: [
    { type: 'set-infection', cityId: 'symmetrika', value: 'cleared' },
    { type: 'set-quest', questId: 'main-act4-integrala' },
  ],
});
