/**
 * Hall of Fame — a party snapshot per League win.
 * The number of entries is the League win count used by trainer ranks.
 */

import { HALL_OF_FAME_MAX } from '../data/trainer-ranks.js';
import type { PlayerData } from '../types/index.js';

/** Record a League win. Returns the new League win count. */
export function recordHallOfFame(pd: PlayerData): number {
  pd.hallOfFame.push({
    date: Date.now(),
    playtime: Math.floor(pd.playtime),
    party: pd.party.map((p) => ({ id: p.id, level: p.level, abilityId: p.abilityId, heldItemId: p.heldItemId })),
  });
  if (pd.hallOfFame.length > HALL_OF_FAME_MAX) pd.hallOfFame.splice(0, pd.hallOfFame.length - HALL_OF_FAME_MAX);
  return pd.hallOfFame.length;
}
