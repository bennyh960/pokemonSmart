/**
 * ACT 4: Percentile — City of Statistics
 * ─────────────────────────────────────────────────────────────────────────────
 * QUESTS:   main-act4-percentile
 * GATES:    gate-percentile-entry, gate-percentile-route12 (3 light questions each, passed once — permanent)
 *
 * STORY BEATS (in order):
 *   1. Player arrives from Route 11 → entry gate (one-time, easy)
 *   2. First visit → "Explore Percentile" quest
 *   3. Town NPCs explain the Pokémon world through percentages
 *      (natures ±10%, catch chance, Leftovers ~6%), give items
 *   4. Special houses: trade-evolution master, rare Pokémon traders (Porygon, Chansey)
 *   5. Gym leader is not here yet — gym story comes next
 *
 * FLAGS SET:  VISITED_PERCENTILE
 * FLAGS READ: PERCENTILE_OCEAN_OPEN (west-ocean blockers in percentile.json — not set yet)
 *
 * MAP IDs:  'percentile/percentile' + interiors 'percentile/*'
 */

import { registerQuest } from '../../quests.js';
import { registerGate } from '../../gates.js';
import { registerStoryEvent } from '../../events.js';
import { FLAGS } from '../../flags.js';
import { DEFAULT_SESSION_CONFIG } from '../../global-gate-config.js';
import { MapId } from '../../../maps/map-ids.js';

// ── Quests ───────────────────────────────────────────────────────────────────

registerQuest({
  id: 'main-act4-percentile',
  title: { en: 'Percentile City', he: 'העיר פרסנטייל' },
  objective: {
    en: 'Explore Percentile — talk to the townsfolk and visit the library and the lab',
    he: 'חקור את פרסנטייל — דבר עם התושבים ובקר בספרייה ובמעבדה',
  },
});

// ── Gates ─────────────────────────────────────────────────────────────────────

// Kept short on purpose: answered once, then open forever.
registerGate({
  id: 'gate-percentile-entry',
  title: { en: 'Percentile City Gate', he: 'שער העיר פרסנטייל' },
  questionSetIds: ['*'],
  triggerType: 'city-entry',
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 3,
    inputQuestions: { count: 1, types: ['+', '-'] },
    penaltyAmount: 200,
    rewards: [
      { type: 'money', amount: 1000 },
      { type: 'item', itemId: 'ultra-ball', quantity: 2 },
    ],
  },
  reopenCooldownMs: 0,
});

registerGate({
  id: 'gate-percentile-route12',
  title: { en: 'Percentile-Route 12 Gate', he: 'שער פרסנטייל-דרך 12' },
  questionSetIds: ['*'],
  triggerType: 'city-exit',
  sessionConfig: {
    ...DEFAULT_SESSION_CONFIG,
    questionsRequired: 3,
    inputQuestions: { count: 1, types: ['×'] },
    penaltyAmount: 200,
    rewards: [
      { type: 'money', amount: 1000 },
      { type: 'item', itemId: 'max-potion', quantity: 2 },
    ],
  },
  reopenCooldownMs: 0,
});

// ── Story Events ──────────────────────────────────────────────────────────────

registerStoryEvent({
  id: 'evt-percentile-enter',
  trigger: { type: 'map-enter', mapId: 'percentile/percentile' as MapId },
  conditions: [{ type: 'flag-not', flag: FLAGS.VISITED_PERCENTILE }],
  actions: [
    { type: 'set-flag', flag: FLAGS.VISITED_PERCENTILE },
    { type: 'set-quest', questId: 'main-act4-percentile' },
  ],
});
