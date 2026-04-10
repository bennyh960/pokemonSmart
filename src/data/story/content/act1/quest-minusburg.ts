/**
 * ACT 1: Route 2 + Minusburg — Subtraction Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act1-route2, main-act1-gym2
 * GATES:    gate-route2-minusburg (Route 2 → Minusburg checkpoint)
 *
 * STORY BEATS (in order):
 *   1. Player enters Route 2 → 10-question gate
 *   2. Player arrives in Minusburg → Remainder is here again, challenges player
 *   3. Remainder battle → after battle Remainder notices something strange
 *   4. Player defeats Minus (gym leader) → badge 2 → advance to Act 2
 *
 * FLAGS SET: GATE_ROUTE2_PASS, VISITED_MINUSBURG,
 *            ACT1_REMAINDER_BATTLE_STARTED, ACT1_REMAINDER_FIRST_BATTLE_DONE,
 *            STORY_BADGE_2
 * FLAGS READ: VISITED_MINUSBURG
 *
 * MAP IDs:  'route-2', 'minusburg'
 * NPC IDs:  'remainder-minusburg'
 */

import { registerQuest }      from '../../quests.js';
import { registerCutscene }   from '../../cutscenes.js';
import { registerGate }       from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS }              from '../../flags.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act1-route2',
  title:     { en: 'Onward to Minusburg',  he: 'קדימה לעיר מינוסבורג' },
  objective: { en: 'Cross Route 2 and reach Minusburg', he: 'חצה את שביל 2 והגע למינוסבורג' },
});

registerQuest({
  id: 'main-act1-gym2',
  title:     { en: 'Minusburg Gym',        he: 'חדר הכושר של מינוסבורג' },
  objective: { en: 'Defeat Minus at the Subtraction Gym', he: 'נצח את מינוס בחדר הכושר של החיסור' },
});

// ── Gate ─────────────────────────────────────────────────────────────────────

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
    { type: 'set-flag', flag: FLAGS.GATE_ROUTE2_PASS },
    { type: 'set-quest', questId: 'main-act1-gym2' },
  ],
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// Remainder confronts the player — first real battle
registerCutscene({
  id: 'act1-remainder-first-battle',
  skippable: false,
  steps: [
    { type: 'face-npc', npcId: 'remainder-minusburg', dir: 'down' },
    {
      type: 'dialogue',
      speakerId: 'Remainder / ריי-מיינדר',
      lines: [
        { en: "You made it this far. I'm... impressed. But don't get comfortable.", he: 'הגעת עד כאן. אני... מרשים. אבל אל תרגיש בנוח.' },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Remainder / ריי-מיינדר',
      lines: [
        { en: "I've been training harder than you. This battle will prove it.", he: 'אימנתי קשה יותר ממך. הקרב הזה יוכיח את זה.' },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_REMAINDER_BATTLE_STARTED } },
  ],
});

// After Remainder is defeated — he notices something off in the city
registerCutscene({
  id: 'act1-remainder-after-battle',
  skippable: true,
  steps: [
    {
      type: 'dialogue',
      speakerId: 'Remainder / ריי-מיינדר',
      lines: [{ en: "...You won. Fine. I won't forget this.", he: '...ניצחת. טוב. לא אשכח את זה.' }],
    },
    {
      type: 'dialogue',
      speakerId: 'Remainder / ריי-מיינדר',
      lines: [
        { en: "There's something strange in this city. The numbers on the signs don't add up.", he: 'יש משהו מוזר בעיר הזאת. המספרים על השלטים לא מסתדרים.' },
      ],
    },
    { type: 'face-npc', npcId: 'remainder-minusburg', dir: 'up' },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_REMAINDER_FIRST_BATTLE_DONE } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// First visit to Minusburg
registerStoryEvent({
  id: 'evt-minusburg-visit',
  trigger: { type: 'map-enter', mapId: 'minusburg' },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_MINUSBURG }],
  actions: [
    { type: 'set-flag',      flag: FLAGS.VISITED_MINUSBURG },
    { type: 'set-infection', cityId: 'minusburg', value: 'low' },
    { type: 'set-quest',     questId: 'main-act1-gym2' },
  ],
});

// Badge 2 earned → Minusburg infection cleared → advance to Act 2
registerStoryEvent({
  id: 'evt-badge2-clears-minusburg',
  trigger: { type: 'badge-earned', badge: 2 },
  conditions: [],
  actions: [
    { type: 'set-flag',      flag: FLAGS.STORY_BADGE_2 },
    { type: 'set-infection', cityId: 'minusburg', value: 'cleared' },
    { type: 'set-quest',     questId: 'main-act2-multiplia' },
  ],
});
