/**
 * Gate cards — key items used at a question gate (gate-overlay.ts). Both stack; the bag shows how many.
 *   bypass — skips all the questions of one gate → straight to the bonus question, no fine.
 *            Not at gyms or the League (`bypassAllowed`).
 *   skip   — skips one question (it counts as answered). Works at every gate, not on the bonus question.
 *
 * First Bypass Card: Officer Jenny in Sumville (act1-oak-arrives). More of both: mini-game prizes
 * (minigames/gate-card-prizes.ts — labs, Word Board, berry games).
 */

import type { GateTriggerType } from '../data/story/gates.js';
import type { PlayerData } from '../types/index.js';

export const GATE_CARD_ITEMS = {
  bypass: 'bypass-card',
  skip: 'skip-card',
} as const;

export type GateCard = keyof typeof GATE_CARD_ITEMS;

/** Gates a Bypass Card can't open — a badge or the League has to be earned question by question. */
const NO_BYPASS_TRIGGERS: ReadonlySet<GateTriggerType> = new Set<GateTriggerType>([
  'gym-entry',
  'gym-leader',
  'auto-gym-entrance',
  'elite-four',
]);

export function bypassAllowed(triggerType: GateTriggerType): boolean {
  return !NO_BYPASS_TRIGGERS.has(triggerType);
}

export function gateCardCount(pd: Pick<PlayerData, 'items'>, card: GateCard): number {
  return pd.items[GATE_CARD_ITEMS[card]] ?? 0;
}

/** Use `count` cards (fewer if the player has fewer). Returns how many were used. */
export function useGateCard(pd: Pick<PlayerData, 'items'>, card: GateCard, count = 1): number {
  const id = GATE_CARD_ITEMS[card];
  const have = pd.items[id] ?? 0;
  const used = Math.max(0, Math.min(have, count));
  if (have - used <= 0) delete pd.items[id];
  else pd.items[id] = have - used;
  return used;
}
