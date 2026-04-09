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
    en: 'The path to Sumville is locked. We must identify you are not NULL-X creators. Three questions will determine if you can pass. Choose wisely.',
    he: "הדרך לסאמוויל נעולה. עלינו לוודא שאינך יוצרי NULL-X. מספר שאלות יקבעו אם תוכל לעבור. בחר בחוכמה.",
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  totalQuestions: 5,
  passThreshold: 5,
  failurePenalty: { type: 'money', amount: 150 },
  reopenCooldownMs: 30 * 60 * 1000,   // 30 min
  successActions: [
    { type: 'set-flag', flag: 'gate-route1-pass' },
    { type: 'set-quest', questId: 'main-act1-sumville' },
  ],
});
registerGate({
  id: 'gate-sumville-route2',
  title: { en: 'Route 2 Checkpoint', he: 'מחסום שביל 2' },
  description: {
    en: 'The path Sumville-Route2 is locked. We must identify you are not NULL-X creators. Three questions will determine if you can pass. Choose wisely.',
    he: "הדרך לסאמוויל נעולה. עלינו לוודא שאינך יוצרי NULL-X. מספר שאלות יקבעו אם תוכל לעבור. בחר בחוכמה.",
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  totalQuestions: 5,
  passThreshold: 5,
  failurePenalty: { type: 'money', amount: 150 },
  reopenCooldownMs: 15 * 60 * 1000,   // 15 min
  successActions: [
    { type: 'set-flag', flag: 'gate-sumville-route2-pass' },
  ],
});

registerGate({
  id: 'gate-route2-minusburg',
  title: { en: 'Route 2 Checkpoint', he: 'מחסום שביל 2' },
  description: {
    en: 'The Glitch is spreading. 10 questions — think carefully.',
    he: 'הגליץ׳ מתפשט. 10 שאלות — חשוב היטב.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  totalQuestions: 10,
  passThreshold: 8,
  failurePenalty: { type: 'money-and-cooldown', amount: 100, durationMs: 5 * 60 * 1000 },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: 'gate-route2-pass' },
    { type: 'set-quest', questId: 'main-act1-gym2' },
  ],
});

registerGate({
  id: 'gate-sumville-gym',
  title: { en: 'Addition Gym Entry', he: 'כניסה למכון החיבור' },
  description: {
    en: 'The gym door requires a verification. Answer 15 questions.',
    he: 'דלת המכון דורשת אימות. ענה על 15 שאלות.',
  },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  totalQuestions: 15,
  passThreshold: 12,
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
    { type: 'screen-fade', direction: 'in', durationMs: 500 },
    // { type: 'wait', durationMs: 500 },
    {
      type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
        { en: 'Ah, you\'re here! Welcome to my lab. I\'m Professor Algorithma.', he: 'או, הגעת! ברוך הבא למעבדה שלי. אני פרופסור אלגוריתמה.' },
      ]
    },
    {
      type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
        { en: 'This is Numeria — a region where knowledge and Pokemon go hand in hand.', he: 'זוהי נומריה — אזור שבו ידע ופוקמונים הולכים יד ביד.' },
      ]
    },
    {
      type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
        { en: 'You have a rare gift — an intuition for numbers and logic. I\'ve been waiting for someone like you.', he: 'יש לך כישרון נדיר — אינטואיציה למספרים ולוגיקה. חיכיתי למישהו כמוך.' },
      ]
    },
    {
      type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
        { en: 'Every trainer in Numeria begins their journey by choosing a partner Pokemon. It\'s time for you to choose yours.', he: 'כל מאמן בנומריה מתחיל את מסעו בבחירת פוקמון שותף. הגיע הזמן שגם אתה תבחר.' },
      ]
    },
    {
      type: "dialogue", speakerId: "Prof. Algorithma / פרופ׳ אלגוריתמה", lines: [
        { en: "Train your partner and become the best trainer you can.", he: "אמן את השותף שלך והפוך למאמן הטוב ביותר שאתה יכול להיות." },
        { en: "In your journey, you'll face many challenges.", he: "במסע שלך, תתמודד עם אתגרים רבים." },
        { en: "Some will test your knowledge. Others will test your strength.", he: "חלקם יבדקו את הידע שלך. אחרים יבדקו את כוחך." },
        { en: "But don't worry — you'll grow stronger with every step.", he: "אבל אל תדאג — תתחזק עם כל צעד." },
      ]
    },
    { type: 'action', action: { type: 'set-flag', flag: 'act0-intro-seen' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act0-starter' } },
    // Transition to starter selection scene, returns to OVERWORLD when done
    { type: 'start-scene', sceneId: 'STARTER_SELECT' },
    
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
      { en: 'Heading to Route 1 already? Good. The trainers there will sharpen your skills.', he: 'כבר הולך לשביל 1? טוב. המאמנים שם ישפרו את כישוריך.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'Sumville is at the other end. I have friends there who can help you. Safe travels!', he: 'סאמוויל נמצאת בצד השני. יש לי שם חברים שיכולים לעזור לך. נסיעה טובה!' },
    ]},
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-route1' } },
    { type: 'action', action: { type: 'set-flag', flag: 'act0-complete' } },
  ],
});

registerCutscene({
  id: 'act1-nullx-intro',
  skippable: false,
  steps: [
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'Wait — before you leave Route 1, I need to tell you something.', he: 'רגע — לפני שתעזוב את שביל 1, יש לי משהו לספר לך.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'Strange errors have been appearing in the verification systems. Corrupted logic. Contradictions.', he: 'שגיאות מוזרות מופיעות במערכות האימות. לוגיקה פגומה. סתירות.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'I fear something — or someone — is deliberately disrupting the region\'s knowledge gates.', he: 'אני חושש שמשהו — או מישהו — מפריע בכוונה לשערי הידע של האזור.' },
    ]},
    { type: 'dialogue', speakerId: 'Prof. Algorithma / פרופ׳ אלגוריתמה', lines: [
      { en: 'Be careful in Sumville. And keep growing stronger — you\'ll need it.', he: 'היה זהיר בסאמוויל. והמשך להתחזק — תזדקק לזה.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'act1-nullx-intro-seen' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-sumville' } },
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
    { type: 'set-flag', flag: 'story-badge-1' },
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
    { type: 'set-flag', flag: 'story-badge-2' },
    { type: 'set-infection', cityId: 'minusburg', value: 'cleared' },
    { type: 'set-quest', questId: 'main-act2-multiplia' },
  ],
});

// Talking to the Route 1 exit NPC → triggers NULL-X intro cutscene (first time only)
registerStoryEvent({
  id: 'evt-route1-exit-npc',
  trigger: { type: 'npc-interact', npcId: 'route1-exit-npc' },
  conditions: [
    { type: 'flag', flag: 'act0-complete' },
    { type: 'flag-not', flag: 'act1-nullx-intro-seen' },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act1-nullx-intro' },
  ],
});

// Gate 1 cleared → advance quest to show gate was passed (if not already advanced by exit NPC)
registerStoryEvent({
  id: 'evt-gate-route1-cleared',
  trigger: { type: 'gate-cleared', gateId: 'gate-route1-sumville' },
  conditions: [],
  actions: [
    { type: 'set-quest', questId: 'main-act1-sumville' },
  ],
});
