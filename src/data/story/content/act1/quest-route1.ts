/**
 * ACT 1: Route 1 — The First Gate
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act1-route1, main-act1-gate
 * GATES:    gate-route1-sumville (Route 1 → Sumville checkpoint)
 *
 * STORY BEATS (in order):
 *   1. Player reaches Route 1 exit NPC → NULL-X intro cutscene (first warning)
 *   2. Player reaches the gate checkpoint → math questions (5 required)
 *   3. Gate cleared → quest advances to Sumville
 *
 * FLAGS SET: ACT1_NULLX_INTRO_SEEN, GATE_ROUTE1_PASS
 * FLAGS READ: ACT0_COMPLETE, ACT1_NULLX_INTRO_SEEN, GATE_ROUTE1_PASS
 *
 * MAP IDs:  'route-1'   (NPC id: 'route1-exit-npc' placed near the gate)
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act1-route1',
  title: { en: 'Head to Sumville', he: 'לך לסאמוויל' },
  objective: { en: 'Travel through Route 1 to reach Sumville', he: 'עבור דרך שביל 1 כדי להגיע לסאמוויל' },
});

registerQuest({
  id: 'main-act1-gate',
  title: { en: 'First Verification', he: 'אימות ראשון' },
  objective: { en: 'Pass the verification gate on Route 1', he: 'עבור את שער האימות בשביל 1' },
});

// ── Gates ─────────────────────────────────────────────────────────────────────
// The guard stands in Sumville (map sumville/sumville), guarding the Route 1 side.
// Success actions run on every pass — the one-time quest step lives in evt-gate-route1-cleared.
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
    questionsRequired: 5,
    inputQuestions: { count: 2 },
    penaltyAmount: 150,
  },
  reopenCooldownMs: 45 * 60 * 1000,
  successActions: [{ type: 'set-flag', flag: FLAGS.GATE_ROUTE1_PASS }],
});

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// Fires at Route 1 exit — first time Algorithma warns about NULL-X
registerCutscene({
  id: 'act1-nullx-intro',
  skippable: false,
  phoneCaller: { en: 'Prof. Algorithma', he: "פרופ' אלגוריתמה" },
  steps: [
    {
      type: 'dialogue',
      speakerId: 'Prof.Algorithma',
      lines: [
        {
          en: 'Wait — You still on Route 1, I need to tell you something.',
          he: 'היי , מה שלומך? עדיין בשביל 1 ? אני צריך לספר לך משהו.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof.Algorithma',
      lines: [
        {
          he: 'הגיעו כל מיני דיווחים  על הפרעות טכנולוגיות בכל רחבי האזור ',
          en: 'There have been all sorts of reports of technological disruptions across the region.',
        },
        {
          en: 'Strange errors have been appearing in the verification systems. Corrupted logic. Contradictions.',
          he: 'שגיאות מוזרות מופיעות במערכות האימות. לוגיקה פגומה וכל מיני סתירות.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof.Algorithma',
      lines: [
        {
          en: "I fear something — or someone — is deliberately disrupting the region's knowledge gates.",
          he: 'אני חושש שמשהו — או מישהו — מפריע בכוונה לשערי הידע של האזור.',
        },
      ],
    },
    {
      type: 'dialogue',
      speakerId: 'Prof.Algorithma',
      lines: [
        {
          en: "Be careful in Sumville. And keep growing stronger — you'll need it.",
          he: 'היה זהיר בסאמוויל. והמשך להתחזק — תזדקק לזה.',
        },
      ],
    },
    { type: 'action', action: { type: 'set-flag', flag: FLAGS.ACT1_NULLX_INTRO_SEEN } },
    { type: 'action', action: { type: 'set-quest', questId: 'main-act1-sumville' } },
  ],
});

// ── Story Events ──────────────────────────────────────────────────────────────

// Talking to the Route 1 exit NPC → NULL-X warning (first time only)
registerStoryEvent({
  id: 'evt-route1-exit-npc',
  trigger: { type: 'trainer-defeated', trainerId: 'route1-exit-npc' },
  conditions: [
    { type: 'flag', flag: FLAGS.ACT0_COMPLETE },
    { type: 'flag-not', flag: FLAGS.ACT1_NULLX_INTRO_SEEN },
  ],
  // repeatable: flag-not condition is the guard; cutscene sets ACT1_NULLX_INTRO_SEEN
  repeatable: true,
  triggerDelayPostFlag: 1,
  actions: [{ type: 'start-cutscene', cutsceneId: 'act1-nullx-intro' }],
});

// Gate 1 cleared → advance quest (if exit NPC cutscene already played this is a no-op)
registerStoryEvent({
  id: 'evt-gate-route1-cleared',
  trigger: { type: 'gate-cleared', gateId: 'gate-route1-sumville' },
  actions: [{ type: 'set-quest', questId: 'main-act1-sumville' }],
});
