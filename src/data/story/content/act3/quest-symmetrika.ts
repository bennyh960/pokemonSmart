/**
 * ACT 3: 
 * ─────────────────────────────────────────────────────────────────────────────

 */

import { registerGate } from '../../gates.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';

// ── Quests ───────────────────────────────────────────────────────────────────

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
  id: 'gate-symetrica-route10',
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

// ── Cutscenes ─────────────────────────────────────────────────────────────────

// ── Story Events ──────────────────────────────────────────────────────────────
