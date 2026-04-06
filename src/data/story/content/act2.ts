/**
 * Story content — Act 2: Trust Nobody
 * Locations: Multiplia (Gym 3) → Dividia (Gym 4)
 *
 * Map IDs expected:
 *   'route-3'              Route connecting Minusburg → Multiplia
 *   'multiplia'            Multiplication city
 *   'multiplia-pokecenter' Interior — Jessie disguised as Nurse Joy
 *   'route-4'              Route connecting Multiplia → Dividia
 *   'dividia'              Division city
 */

import { registerCutscene } from '../cutscenes.js';
import { registerStoryEvent } from '../events.js';
import { registerGate } from '../gates.js';

// ============================================================================
// GATES
// ============================================================================

registerGate({
  id: 'gate-route3-multiplia',
  title: { en: 'Route 3 Checkpoint', he: 'מחסום שביל 3' },
  description: {
    en: 'The Glitch has warped the signs on this route. 3 questions to proceed.',
    he: 'הגליץ׳ עיוות את השלטים בשביל הזה. 3 שאלות כדי להמשיך.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  totalQuestions: 3,
  passThreshold: 2,
  failurePenalty: { type: 'money-and-cooldown', amount: 100, durationMs: 5 * 60 * 1000 },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: 'gate-route3-pass' },
    { type: 'set-quest', questId: 'main-act2-multiplia' },
  ],
});

registerGate({
  id: 'gate-multiplia-gym',
  title: { en: 'Multiplication Gym', he: 'חדר הכושר של הכפל' },
  description: { en: 'Answer 4 questions to enter the gym.', he: 'ענה על 4 שאלות כדי להיכנס לחדר הכושר.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  totalQuestions: 4,
  passThreshold: 3,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: 'gate-multiplia-gym-pass' },
    { type: 'set-quest', questId: 'main-act2-multiplia' },
  ],
});

registerGate({
  id: 'gate-route4-dividia',
  title: { en: 'Route 4 Checkpoint', he: 'מחסום שביל 4' },
  description: {
    en: 'NULL-X interference detected. 5 questions — 3 correct to pass.',
    he: 'זוהתה הפרעה מ-NULL-X. 5 שאלות — 3 נכונות כדי לעבור.',
  },
  triggerType: 'route-checkpoint',
  questionSetIds: ['placeholder'],
  totalQuestions: 5,
  passThreshold: 3,
  failurePenalty: { type: 'money-and-cooldown', amount: 150, durationMs: 10 * 60 * 1000 },
  reopenCooldownMs: 30 * 60 * 1000,
  successActions: [
    { type: 'set-flag', flag: 'gate-route4-pass' },
    { type: 'set-quest', questId: 'main-act2-dividia' },
  ],
});

registerGate({
  id: 'gate-dividia-gym',
  title: { en: 'Division Gym', he: 'חדר הכושר של החילוק' },
  description: { en: 'Answer 4 questions to enter the gym.', he: 'ענה על 4 שאלות כדי להיכנס לחדר הכושר.' },
  triggerType: 'gym-entry',
  questionSetIds: ['placeholder'],
  totalQuestions: 4,
  passThreshold: 3,
  failurePenalty: { type: 'none' },
  reopenCooldownMs: 0,
  successActions: [
    { type: 'set-flag', flag: 'gate-dividia-gym-pass' },
    { type: 'set-quest', questId: 'main-act2-gym4' },
  ],
});

// ============================================================================
// CUTSCENES
// ============================================================================

registerCutscene({
  id: 'act2-misty-meets-player',
  skippable: true,
  steps: [
    { type: 'face-npc', npcId: 'misty-multiplia', dir: 'down' },
    { type: 'dialogue', speakerId: 'Misty / מיסטי', lines: [
      { en: 'Oh — you made it through Route 3? Faster than I expected.', he: 'אוי — עברת את שביל 3? מהר יותר ממה שציפיתי.' },
    ]},
    { type: 'dialogue', speakerId: 'Misty / מיסטי', lines: [
      { en: 'I\'m here because the timing systems on the routes keep glitching. Random teleports. Missing bridges.', he: 'אני כאן כי מערכות התזמון בשבילים ממשיכות להשתגע. טלפורטים אקראיים. גשרים חסרים.' },
    ]},
    { type: 'dialogue', speakerId: 'Misty / מיסטי', lines: [
      { en: 'Tip: when a gate gives you a time challenge — don\'t rush. Breathe. Work through it.', he: 'טיפ: כשהשער נותן לך אתגר זמן — אל תמהר. נשום. עבוד דרכו.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'act2-misty-met' } },
  ],
});

registerCutscene({
  id: 'act2-fake-nurse-reveal',
  skippable: false,
  steps: [
    { type: 'dialogue', speakerId: 'Nurse Joy?', lines: [
      { en: 'Welcome! Your Pokemon will be... "healed" in no time!', he: 'ברוך הבא! הפוקמונים שלך יהיו... "מרפאים" תוך זמן קצר!' },
    ]},
    { type: 'wait', durationMs: 400 },
    { type: 'dialogue', speakerId: 'Nurse Joy?', lines: [
      { en: 'Hmm... something seems off. That\'s not the standard healing chant...', he: 'המממ... משהו נראה לא בסדר. זה לא הנוסחה הרגילה לריפוי...' },
    ]},
    { type: 'screen-fade', direction: 'out', durationMs: 400 },
    { type: 'screen-fade', direction: 'in', durationMs: 400 },
    { type: 'show-npc', npcId: 'jessie-nurse' },
    { type: 'hide-npc', npcId: 'fake-nurse-joy' },
    { type: 'dialogue', speakerId: 'Jessie / ג׳סי', lines: [
      { en: 'Prepare for trouble! And make it... actually we skipped the motto. Give us the Pokemon!', he: 'היכנסו לצרות! ותעשו את זה... בעצם דילגנו על המוטו. תנו לנו את הפוקמונים!' },
    ]},
    { type: 'dialogue', speakerId: 'James / ג׳יימס', lines: [
      { en: 'Team Rocket never tires of a good disguise. Until it fails. Which is always.', he: 'קבוצת רוקט לעולם לא עייפת מתחפושת טובה. עד שהיא נכשלת. שזה תמיד.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'rocket-multiplia-nurse-revealed' } },
  ],
});

registerCutscene({
  id: 'act2-fake-nurse-defeated',
  skippable: true,
  steps: [
    { type: 'dialogue', speakerId: 'Jessie / ג׳סי', lines: [
      { en: 'We\'re blasting off again! But we\'ll be back. Team Rocket never quits!', he: 'אנחנו ממריאים שוב! אבל נחזור. קבוצת רוקט לא מוותרת לעולם!' },
    ]},
    { type: 'screen-fade', direction: 'out', durationMs: 300 },
    { type: 'hide-npc', npcId: 'jessie-nurse' },
    { type: 'hide-npc', npcId: 'james-pokecenter' },
    { type: 'screen-fade', direction: 'in', durationMs: 500 },
    { type: 'action', action: { type: 'set-flag', flag: 'rocket-multiplia-nurse-exposed' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act2-gym3' } },
    { type: 'dialogue', speakerId: 'Misty / מיסטי', lines: [
      { en: 'I knew something was wrong here. Good work exposing them.', he: 'ידעתי שמשהו לא בסדר כאן. עבודה טובה בחשיפתם.' },
    ]},
  ],
});

registerCutscene({
  id: 'act2-brock-meets-player',
  skippable: true,
  steps: [
    { type: 'face-npc', npcId: 'brock-dividia', dir: 'down' },
    { type: 'dialogue', speakerId: 'Brock / ברוק', lines: [
      { en: 'You must be the one Algorithma told me about. Good. This city needs solid help.', he: 'אתה חייב להיות זה שאלגוריתמה סיפר לי עליו. טוב. העיר הזו צריכה עזרה אמינה.' },
    ]},
    { type: 'dialogue', speakerId: 'Brock / ברוק', lines: [
      { en: 'Think of logic like a good stew — every ingredient has its place. Leave one out and the whole thing falls apart.', he: 'תחשוב על לוגיקה כמו מרק טוב — לכל מרכיב יש מקומו. השמט אחד והכל מתפרק.' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'act2-brock-met' } },
  ],
});

registerCutscene({
  id: 'act2-remainder-glitch',
  skippable: false,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 200 },
    { type: 'screen-fade', direction: 'in', durationMs: 600, color: '#440000' },
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'Something is... wrong. My Pokemon — it won\'t listen. Its eyes are glowing red.', he: 'משהו... לא בסדר. הפוקמון שלי — הוא לא מציית. עיניו זוהרות אדום.' },
    ]},
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'The Glitch. It got him. I don\'t know what to—', he: 'הגליץ׳. הוא תפס אותו. אני לא יודע מה ל—' },
    ]},
    { type: 'dialogue', speakerId: 'Brock / ברוק', lines: [
      { en: 'Use the serum fragments! Quickly — before the infection spreads to the others!', he: 'השתמש בחלקי הסרום! מהר — לפני שהזיהום מתפשט לאחרים!' },
    ]},
    { type: 'action', action: { type: 'set-flag', flag: 'story-remainder-glitched' } },
    { type: 'action', action: { type: 'set-flag', flag: 'story-remainder-infected' } },
  ],
});

registerCutscene({
  id: 'act2-remainder-saved',
  skippable: true,
  steps: [
    { type: 'screen-fade', direction: 'out', durationMs: 300 },
    { type: 'screen-fade', direction: 'in', durationMs: 800 },
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: '...It worked. You used your serum. For me.', he: '...זה עבד. השתמשת בסרום שלך. בשבילי.' },
    ]},
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: 'I\'ve been nothing but difficult with you. And you still helped.', he: 'הייתי קשה עמך בכל דבר. ועדיין עזרת.' },
    ]},
    { type: 'dialogue', speakerId: 'Remainder / ריי-מיינדר', lines: [
      { en: '...I need to get stronger. I\'ll train and come back. Don\'t lose to that gym leader before I return.', he: '...אני צריך להתחזק. אני אאמן ואחזור. אל תפסיד לאותו מנהיג חדר כושר לפני שאחזור.' },
    ]},
    { type: 'face-npc', npcId: 'remainder-dividia', dir: 'up' },
    { type: 'action', action: { type: 'set-flag', flag: 'story-remainder-saved' } },
    { type: 'action', action: { type: 'set-flag', flag: 'story-remainder-cured' } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act2-gym4' } },
  ],
});

// ============================================================================
// STORY EVENTS
// ============================================================================

registerStoryEvent({
  id: 'evt-route3-enter',
  trigger: { type: 'map-enter', mapId: 'route-3' },
  conditions: [{ type: 'flag-not', flag: 'visited-route3' }],
  actions: [
    { type: 'set-flag', flag: 'visited-route3' },
    { type: 'set-infection', cityId: 'multiplia', value: 'medium' },
  ],
});

registerStoryEvent({
  id: 'evt-multiplia-enter',
  trigger: { type: 'map-enter', mapId: 'multiplia' },
  conditions: [{ type: 'flag-not', flag: 'visited-multiplia' }],
  actions: [
    { type: 'set-flag', flag: 'visited-multiplia' },
    { type: 'set-infection', cityId: 'multiplia', value: 'medium' },
    { type: 'set-quest', questId: 'main-act2-multiplia' },
  ],
});

// Entering the fake Pokemon Center triggers the reveal
registerStoryEvent({
  id: 'evt-fake-pokecenter',
  trigger: { type: 'map-enter', mapId: 'multiplia-pokecenter' },
  conditions: [
    { type: 'flag-not', flag: 'rocket-multiplia-nurse-revealed' },
    { type: 'flag', flag: 'visited-multiplia' },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act2-fake-nurse-reveal' },
  ],
});

// Misty appears after entering Multiplia
registerStoryEvent({
  id: 'evt-misty-multiplia',
  trigger: { type: 'map-enter', mapId: 'multiplia' },
  conditions: [
    { type: 'flag', flag: 'visited-multiplia' },
    { type: 'flag-not', flag: 'act2-misty-met' },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act2-misty-meets-player' },
  ],
});

registerStoryEvent({
  id: 'evt-badge3-clears-multiplia',
  trigger: { type: 'badge-earned', badge: 3 },
  conditions: [],
  actions: [
    { type: 'set-flag', flag: 'story-badge-3' },
    { type: 'set-infection', cityId: 'multiplia', value: 'cleared' },
    { type: 'set-quest', questId: 'main-act2-dividia' },
  ],
});

registerStoryEvent({
  id: 'evt-dividia-enter',
  trigger: { type: 'map-enter', mapId: 'dividia' },
  conditions: [{ type: 'flag-not', flag: 'visited-dividia' }],
  actions: [
    { type: 'set-flag', flag: 'visited-dividia' },
    { type: 'set-infection', cityId: 'dividia', value: 'medium' },
    { type: 'set-quest', questId: 'main-act2-dividia' },
  ],
});

// Brock introduction on entering Dividia
registerStoryEvent({
  id: 'evt-brock-dividia',
  trigger: { type: 'map-enter', mapId: 'dividia' },
  conditions: [
    { type: 'flag', flag: 'visited-dividia' },
    { type: 'flag-not', flag: 'act2-brock-met' },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act2-brock-meets-player' },
  ],
});

// Remainder gets glitched when player enters Dividia after badge 3
registerStoryEvent({
  id: 'evt-remainder-glitch',
  trigger: { type: 'map-enter', mapId: 'dividia' },
  conditions: [
    { type: 'flag', flag: 'visited-dividia' },
    { type: 'flag-not', flag: 'story-remainder-glitched' },
    { type: 'badge-count', min: 3 },
  ],
  actions: [
    { type: 'start-cutscene', cutsceneId: 'act2-remainder-glitch' },
  ],
});

registerStoryEvent({
  id: 'evt-badge4-clears-dividia',
  trigger: { type: 'badge-earned', badge: 4 },
  conditions: [],
  actions: [
    { type: 'set-flag', flag: 'story-badge-4' },
    { type: 'set-infection', cityId: 'dividia', value: 'cleared' },
    { type: 'start-cutscene', cutsceneId: 'act2-remainder-saved' },
  ],
});
