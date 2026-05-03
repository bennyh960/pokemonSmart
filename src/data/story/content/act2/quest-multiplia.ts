/**
 * ACT 2: Route 3 + Multiplia — Fake Nurse + Multiplication Gym
 * ─────────────────────────────────────────────────────────────────────────────
 * The story get more clearence , the player meet oak and gym leader in library as contuinue quest of prev act
 * a big pokemons blocking the the way
 */

import { registerQuest } from '../../quests.js';
import { registerCutscene } from '../../cutscenes.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';
import { MapId } from '../../../maps/map-ids.js';
import { ITEMS } from '../../../items.js';
import { ITEM_SLUG_TO_ID } from '../../../item-defs.js';

// ── Quests ───────────────────────────────────────────────────────────────────

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

//#region ── Cutscenes ─────────────────────────────────────────────────────────────────

//#endregion
//#region ── Story Events ──────────────────────────────────────────────────────────────

//#endregion
