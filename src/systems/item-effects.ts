/**
 * Centralized item effect application logic.
 *
 * All item effects (heal, revive, pp-restore, rare-candy, etc.) are handled here
 * so that both the Battle scene and the Bag/overworld can share the same code.
 */

import type { Pokemon } from '../types/index.js';
import { getItem } from '../data/items.js';
import { checkAndApplyLevelUp } from './encounter.js';

export interface ItemUseResult {
  success: boolean;
  message: string;       // e.g. "Restored 20 HP!" or "Can't use on this Pokemon"
  leveledUp?: boolean;   // true if rare-candy caused a level up
}

/**
 * Apply an item effect to a target Pokemon. Returns a result with success/fail and a message.
 *
 * This does NOT decrement the item from inventory -- the caller is responsible for that.
 * This does NOT handle capture or stat-boost in battle (those are battle-specific).
 */
export function applyItemEffect(itemId: string, target: Pokemon): ItemUseResult {
  const def = getItem(itemId);
  if (!def) {
    return { success: false, message: 'Unknown item.' };
  }

  const effect = def.effect;

  switch (effect.type) {
    case 'heal': {
      if (target.hp <= 0) {
        return { success: false, message: "Can't use on a fainted Pokemon!" };
      }
      if (target.hp >= target.maxHp) {
        return { success: false, message: 'HP is already full!' };
      }
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + effect.amount);
      const restored = target.hp - before;
      return { success: true, message: `Restored ${restored} HP!` };
    }

    case 'heal-full': {
      if (target.hp <= 0) {
        return { success: false, message: "Can't use on a fainted Pokemon!" };
      }
      if (target.hp >= target.maxHp) {
        return { success: false, message: 'HP is already full!' };
      }
      target.hp = target.maxHp;
      return { success: true, message: 'HP fully restored!' };
    }

    case 'revive': {
      if (target.hp > 0) {
        return { success: false, message: "Can't use on a Pokemon that isn't fainted!" };
      }
      const restored = Math.max(1, Math.floor(target.maxHp * (effect.hpPercent / 100)));
      target.hp = restored;
      return { success: true, message: `Revived with ${restored} HP!` };
    }

    case 'status-cure': {
      // TODO: Status effects not yet implemented in the game.
      // For now, always succeed with a placeholder message.
      return { success: true, message: 'Cured!' };
    }

    case 'pp-restore': {
      if (target.hp <= 0) {
        return { success: false, message: "Can't use on a fainted Pokemon!" };
      }
      let anyRestored = false;
      for (const move of target.moves) {
        if (move.currentPp < move.pp) {
          if (effect.amount === 'all') {
            move.currentPp = move.pp;
          } else {
            move.currentPp = Math.min(move.pp, move.currentPp + effect.amount);
          }
          anyRestored = true;
        }
      }
      if (!anyRestored) {
        return { success: false, message: 'PP is already full for all moves!' };
      }
      return { success: true, message: 'PP was restored!' };
    }

    case 'stat-boost': {
      // Stat boosts are battle-only; handled separately in battle.ts
      return { success: false, message: 'Can only use in battle!' };
    }

    case 'rare-candy': {
      if (target.hp <= 0) {
        return { success: false, message: "Can't use on a fainted Pokemon!" };
      }
      // Give enough XP to trigger a level up
      target.xp = target.xpToNext;
      const didLevel = checkAndApplyLevelUp(target);
      if (didLevel) {
        return { success: true, message: `Grew to level ${target.level}!`, leveledUp: true };
      }
      return { success: true, message: 'Gained experience!' };
    }

    case 'capture': {
      // Capture is handled separately in battle flow, not via this function
      return { success: false, message: "Can't use that here!" };
    }

    case 'none': {
      return { success: false, message: "This item can't be used." };
    }

    default: {
      return { success: false, message: "This item can't be used." };
    }
  }
}

/**
 * Decrement an item from the player's inventory. Removes the entry if quantity reaches 0.
 */
export function consumeItem(items: Record<string, number>, itemId: string): void {
  if (items[itemId] != null) {
    items[itemId]--;
    if (items[itemId] <= 0) {
      delete items[itemId];
    }
  }
}
