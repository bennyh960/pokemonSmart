/**
 * Story content — Act 0 (Quiet Start) and Act 1 (The First Gate).
 *
 * This file registers:
 *   - Cutscenes: act0-intro, act0-remainder-lab, act1-oak-arrives, act1-remainder-battle
 *   - Gates: gate-route1-sumville (Route 1 checkpoint), gate-route2-minusburg
 *   - Story events: map-enter triggers, trainer-defeated triggers, gate-cleared triggers
 *
 * Content fires automatically when the map IDs match — no manual wiring needed
 * once the maps are built in the editor.
 *
 * Map IDs expected (set in map JSON "id" field):
 *   'zeroville'          - Starting town + Algorithma's lab
 *   'algorithma-lab'     - Indoor lab map (Algorithma + Remainder NPCs)
 *   'route-1'            - Route 1 connecting Zeroville → Sumville
 *   'sumville'           - First destination city
 *   'route-2'            - Route 2 connecting Sumville → Minusburg
 *   'minusburg'          - Subtraction city
 */

import { registerCutscene } from '../cutscenes.js';
import { registerStoryEvent } from '../events.js';
import { registerGate } from '../gates.js';

// ============================================================================
// GATES
// ============================================================================

registerGate({
  id: 'gate-route1-sumville',
  title: { en: 'Route 1 Checkpoint', he: 'מחסום שביל 1' },
  description: {
    en: 'The path to Sumville is locked. Answer 3 questions to continue.',
    he: 'המסלול לסאמוויל חסום. ענה על 3 שאלות כדי להמשיך.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  totalQuestions: 3,
  passThreshold: 2,
  failurePenalty: { type: 'money', amount: 50 },
  reopenCooldownMs: 30 * 60 * 1000,   // 30 min
  successActions: [
    { type: 'set-flag', flag: 'gate-route1-pass' },
    { type: 'set-quest', questId: 'main-act1-sumville' },
  ],
});

registerGate({
  id: 'gate-route2-minusburg',
  title: { en: 'Route 2 Checkpoint', he: 'מחסום שביל 2' },
  description: {
    en: 'The Glitch is spreading. 3 questions — think carefully.',
    he: 'הגליץ׳ מתפשט. 3 שאלות — חשוב היטב.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  totalQuestions: 3,
  passThreshold: 2,
  failurePenalty: { type: 'money-and-cooldown', amount: 100, durationMs: 5 * 60 * 1000 },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: 'gate-route2-pass' },
    { type: 'set-quest', questId: 'main-act1-gym2' },
  ],
});

registerGate({
  id: 'gate-sumville-gym',
  title: { en: 'Addition Gym Entry', he: 'כניסה לחדר כושר החיבור' },
  description: {
    en: 'The gym door requires a verification. Answer 4 questions.',
    he: 'דלת חדר הכושר דורשת אימות. ענה על 4 שאלות.',
  },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  totalQuestions: 4,
  passThreshold: 3,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,    // permanent once passed
  successActions: [
    { type: 'set-flag', flag: 'gate-sumville-gym-pass' },
    { type: 'set-quest', questId: 'main-act1-gym1' },
  ],
});

// ============================================================================
// CUTSCENES
// ============================================================================

registerCutscene({
  id: 'act0-intro',
  skippable: true,
  steps: [
    { type: 'screen-fade', direction: 'in', durationMs: 1200 },
    { type: 'wait', durationMs: 500 },
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'Ah, you\'re awake! Welcome to Numeria — a region where knowledge opens every door.', he: 'א, התעוררת! ברוך הבא לנומריה — אזור שבו ידע פותח כל דלת.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'I am Professor Algorithma. I built the verification systems that keep this region safe.', he: 'אני פרופסור אלגוריתמה. בניתי את מערכות האימות ששומרות על האזור הזה.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'Something is wrong. Strange errors. Contradictions in the system. I fear the worst.', he: 'משהו לא בסדר. שגיאות מוזרות. סתירות במערכת. אני חושש מהגרוע מכל.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'You have a rare gift — an intuition for numbers and logic. Numeria needs you.', he: 'יש לך כישרון נדיר — אינטואיציה למספרים ולוגיקה. נומריה צריכה אותך.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'First — choose your partner. A Pokemon who will travel by your side.', he: 'קודם כל — בחר את השותף שלך. פוקמון שיסע לצידך.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'act0-intro-seen' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act0-starter' } },
  ],
});

registerCutscene({
  id: 'act0-remainder-meets-player',
  skippable: true,
  steps: [
    { type: 'face-npc', npcId: 'remainder-lab', dir: 'down' },
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'Oh. YOU got chosen? I\'ve been studying here for months.', he: 'או. אתה נבחרת? למדתי כאן חודשים שלמים.' },
    ]},
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'Whatever. Don\'t expect any help from me on the road.', he: 'נו טוב. אל תצפה לעזרה ממני בדרך.' },
    ]},
    { type: 'face-npc', npcId: 'remainder-lab', dir: 'up' },
    { type: 'action', action: { type: 'set-flag', flag: 'act0-remainder-met' } },
  ],
});

registerCutscene({
  id: 'act0-leave-zeroville',
  skippable: true,
  steps: [
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'The path to Sumville lies through Route 1. The gate guards are there to keep the Glitch out.', he: 'המסלול לסאמוויל עובר דרך שביל 1. השומרים שם כדי לשמור על הגליץ׳ בחוץ.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'Answer their questions honestly. Your knowledge is your key. Good luck!', he: 'ענה על שאלותיהם בכנות. הידע שלך הוא המפתח שלך. בהצלחה!' },
    ]},
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-route1' } },
    { type: 'action', action: { type: 'set-flag', flag: 'act0-complete' } },
  ],
});

registerCutscene({
  id: 'act1-oak-arrives',
  skippable: false,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 600 },
    { type: 'screen-fade', direction: 'in', durationMs: 800 },
    { type: 'dialogue', speakerId: 'Prof. Oak / פרופ׳ אוק', lines: [
      { en: 'I came as soon as Algorithma called. This is bigger than Numeria.', he: 'הגעתי ברגע שאלגוריתמה התקשר. זה גדול יותר מנומריה.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Oak / פרופ׳ אוק', lines: [
      { en: 'A rogue AI compromising verification systems — Kanto has seen disruptions too.', he: 'בינה מלאכותית סוררת שמסכנת מערכות אימות — קנטו גם כן חווה שיבושים.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Oak / פרופ׳ אוק', lines: [
      { en: 'You\'ve already made it past Route 1. Your brother — ah, I mean Algorithma — chose wisely.', he: 'כבר עברת את שביל 1. אחיך — אה, כלומר אלגוריתמה — בחר בחוכמה.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'act1-oak-warning-heard' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-gym1' } },
  ],
});

registerCutscene({
  id: 'act1-remainder-first-battle',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'remainder-minusburg', dir: 'down' },
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'You made it this far. I\'m... impressed. But don\'t get comfortable.', he: 'הגעת עד כאן. אני... מרשים. אבל אל תרגיש בנוח.' },
    ]},
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'I\'ve been training harder than you. This battle will prove it.', he: 'אימנתי קשה יותר ממך. הקרב הזה יוכיח את זה.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'act1-remainder-battle-started' } },
  ],
});

registerCutscene({
  id: 'act1-remainder-after-battle',
  skippable: true,
  steps: [
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: '...You won. Fine. I won\'t forget this.', he: '...ניצחת. טוב. לא אשכח את זה.' },
    ]},
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'There\'s something strange in this city. The numbers on the signs don\'t add up.', he: 'יש משהו מוזר בעיר הזאת. המספרים על השלטים לא מסתדרים.' },
    ]},
    { type: 'face-npc', npcId: 'remainder-minusburg', dir: 'up' },
    { type: 'action', action: { type: 'set-flag', flag: 'act1-remainder-first-battle-done' } },
  ],
});

// ============================================================================
// STORY EVENTS
// ============================================================================

// Act 0: Entering the lab for the first time triggers the intro cutscene
registerStoryEvent({
  id: 'evt-act0-intro',
  trigger: { type: 'map-enter', mapId: 'algorithma-lab' },
  conditions: [
    { type: 'flag-not', flag: 'act0-intro-seen' },
  ],
  actions: [
    { type: 'set-infection', cityId: 'zeroville', value: 'none' },
    { type: 'start-cutscene', cutsceneId: 'act0-intro' },
  ],
});

// After starter is chosen + returns to lab, Remainder reacts
registerStoryEvent({
  id: 'evt-act0-remainder',
  trigger: { type: 'map-enter', mapId: 'algorithma-lab' },
  conditions: [
    { type: 'flag', flag: 'act0-intro-seen' },
    { type: 'flag-not', flag: 'act0-remainder-met' },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act0-remainder-meets-player' },
  ],
});

// Entering Route 1 for the first time — Algorithma sends the player off
registerStoryEvent({
  id: 'evt-act0-leave',
  trigger: { type: 'map-enter', mapId: 'route-1' },
  conditions: [
    { type: 'flag', flag: 'act0-intro-seen' },
    { type: 'flag-not', flag: 'act0-complete' },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act0-leave-zeroville' },
  ],
});

// Visiting Zeroville sets infection to none + quest if no quest active
registerStoryEvent({
  id: 'evt-zeroville-visit',
  trigger: { type: 'map-enter', mapId: 'zeroville' },
  conditions: [
    { type: 'flag-not', flag: 'visited-zeroville' },
  ],
  actions: [
    { type: 'set-flag', flag: 'visited-zeroville' },
    { type: 'set-infection', cityId: 'zeroville', value: 'none' },
  ],
});

// Act 1: First time entering Sumville — Prof. Oak arrives
registerStoryEvent({
  id: 'evt-act1-oak-arrives',
  trigger: { type: 'map-enter', mapId: 'sumville' },
  conditions: [
    { type: 'flag', flag: 'gate-route1-pass' },
    { type: 'flag-not', flag: 'act1-oak-warning-heard' },
  ],
  actions: [
    { type: 'set-flag', flag: 'visited-sumville' },
    { type: 'set-infection', cityId: 'sumville', value: 'low' },
    { type: 'start-cutscene', cutsceneId: 'act1-oak-arrives' },
  ],
});

// Entering Sumville after Oak — just set infection
registerStoryEvent({
  id: 'evt-sumville-infection',
  trigger: { type: 'map-enter', mapId: 'sumville' },
  conditions: [
    { type: 'flag-not', flag: 'visited-sumville' },
  ],
  actions: [
    { type: 'set-flag', flag: 'visited-sumville' },
    { type: 'set-infection', cityId: 'sumville', value: 'low' },
  ],
});

// Badge 1 earned → Sumville infection cleared
registerStoryEvent({
  id: 'evt-badge1-clears-sumville',
  trigger: { type: 'badge-earned', badge: 1 },
  conditions: [],
  actions: [
    { type: 'set-infection', cityId: 'sumville', value: 'cleared' },
    { type: 'set-quest', questId: 'main-act1-route2' },
  ],
});

// Entering Minusburg
registerStoryEvent({
  id: 'evt-minusburg-visit',
  trigger: { type: 'map-enter', mapId: 'minusburg' },
  conditions: [
    { type: 'flag-not', flag: 'visited-minusburg' },
  ],
  actions: [
    { type: 'set-flag', flag: 'visited-minusburg' },
    { type: 'set-infection', cityId: 'minusburg', value: 'low' },
    { type: 'set-quest', questId: 'main-act1-gym2' },
  ],
});

// Badge 2 earned → Minusburg infection cleared + advance quest
registerStoryEvent({
  id: 'evt-badge2-clears-minusburg',
  trigger: { type: 'badge-earned', badge: 2 },
  conditions: [],
  actions: [
    { type: 'set-infection', cityId: 'minusburg', value: 'cleared' },
    { type: 'set-quest', questId: 'main-act2-multiplia' },
  ],
});

// Gate 1 cleared → advance quest to show gate was passed
registerStoryEvent({
  id: 'evt-gate-route1-cleared',
  trigger: { type: 'gate-cleared', gateId: 'gate-route1-sumville' },
  conditions: [],
  actions: [
    { type: 'set-quest', questId: 'main-act1-sumville' },
  ],
});
