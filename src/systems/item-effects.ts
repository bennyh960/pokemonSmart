/**
 * Centralized item effect application logic.
 *
 * All item effects (heal, revive, pp-restore, rare-candy, etc.) are handled here
 * so that both the Battle scene and the Bag/overworld can share the same code.
 */

import type { Pokemon } from '../types/index.js';
import { getItemGameData, getItemGameDataBySlug } from '../data/item-defs.js';
import { getPlayerData } from './game-state.js';
import { checkAndApplyLevelUp, recalcPokemonStats } from './encounter.js';
import { getPokemonDisplayName, getMove, type EvolutionStep } from '../services/pokemon-data.js';
import { t } from '../i18n/i18n.js';
import type { LevelUpMoveResult } from './move-learning.js';
import { createMoveFromId } from './move-learning.js';
import { canCurePersistentStatus } from './battle-state.js';
import { getItem } from '../data/items.js';

export interface ItemUseResult {
  success: boolean;
  message: string;       // e.g. "Restored 20 HP!" or "Can't use on this Pokemon"
  leveledUp?: boolean;   // true if rare-candy caused a level up
  evolution?: EvolutionStep;
  newMoves?: LevelUpMoveResult[];
}

function getItemDef(itemId: string) {
  const numId = Number(itemId);
  return !isNaN(numId) ? getItemGameData(numId) : getItemGameDataBySlug(itemId);
}

export function itemTargetsPokemon(itemId: string): boolean {
  const def = getItemDef(itemId);
  if (!def) return false;

  switch (def.effect.type) {
    case 'heal':
    case 'heal-full':
    case 'revive':
    case 'status-cure':
    case 'pp-restore':
    case 'pp-restore-one':
    case 'rare-candy':
    case 'vitamin':
    case 'tm':
      return true;
    default:
      return false;
  }
}

/** Returns true if this item can be used directly without selecting a Pokemon target. */
export function isDirectUseItem(itemId: string): boolean {
  const def = getItemDef(itemId);
  if (!def) return false;
  return def.effect.type === 'pokedex-battery' || def.effect.type === 'battle-helper';
}

export function canUseItemOnPokemon(itemId: string, target: Pokemon): boolean {
  const def = getItemDef(itemId);
  if (!def) return false;

  switch (def.effect.type) {
    case 'heal':
    case 'heal-full':
      return target.hp > 0 && target.hp < target.maxHp;
    case 'revive':
      return target.hp <= 0;
    case 'status-cure':
      return canCurePersistentStatus(target.status, def.effect.status);
    case 'pp-restore':
    case 'pp-restore-one':
      return target.hp > 0 && target.moves.some(move => move.currentPp < move.pp);
    case 'rare-candy':
      return target.hp > 0;
    case 'vitamin':
      return target.hp > 0 && ((target.evs?.[def.effect.stat] ?? 0) < 31);
    case 'tm':
      return true;  // compatibility/duplicate check is done in bag.ts after selection
    default:
      return false;
  }
}

/**
 * Apply an item effect to a target Pokemon. Returns a result with success/fail and a message.
 *
 * This does NOT decrement the item from inventory -- the caller is responsible for that.
 * This does NOT handle capture or stat-boost in battle (those are battle-specific).
 */
export function applyItemEffect(itemId: string, target: Pokemon): ItemUseResult {
  // Support both numeric ID strings and legacy slugs
  const def = getItemDef(itemId);
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
      if (!canCurePersistentStatus(target.status, effect.status)) {
        return { success: false, message: 'No matching status to cure!' };
      }
      target.status = null;
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
      const result = checkAndApplyLevelUp(target);
      if (result.leveledUp) {
        return {
          success: true,
          message: t('battle.levelUp', { name: getPokemonDisplayName(target.id), level: target.level }),
          leveledUp: true,
          evolution: result.evolution,
          newMoves: result.newMoves,
        };
      }
      return { success: true, message: 'Gained experience!' };
    }

    case 'tm': {
      // NOTE: Actual compatibility check and natural-level warning are handled in bag.ts.
      // This function only does the raw move addition (called after UI confirms).
      const move = getMove(effect.moveId);
      if (!move) return { success: false, message: 'Move not found' };

      // Check if already knows the move
      const allMoves = [...(target.moves || [])];
      if (allMoves.some(m => m.id === effect.moveId)) {
        return { success: false, message: 'already-knows' };
      }

      // Add to battle moves if there is space (up to 8 max)
      if ((target.moves?.length ?? 0) < 8) {
        const newMove = createMoveFromId(effect.moveId);
        if (!newMove) return { success: false, message: 'Move not found' };
        target.moves = [...(target.moves || []), newMove];
      } else {
        return { success: false, message: 'no-space' };
      }

      return { success: true, message: 'learned' };
    }

    case 'capture': {
      // Capture is handled separately in battle flow, not via this function
      return { success: false, message: "Can't use that here!" };
    }

    case 'none': {
      return { success: false, message: "This item can't be used." };
    }

    case 'vitamin': {
      if (target.hp <= 0) {
        return { success: false, message: "Can't use on a fainted Pokemon!" };
      }
      const stat = effect.stat;
      const EV_CAP = 31;
      const EV_PER_USE = 4;  // 4 EVs per vitamin so stat changes are visible at normal levels
      const evs = target.evs ?? { hp: 0, atk: 0, def: 0, spe: 0, spa: 0, spd: 0 };
      if (evs[stat] >= EV_CAP) {
        return { success: false, message: "It won't have any more effect." };
      }
      evs[stat] = Math.min(EV_CAP, evs[stat] + EV_PER_USE);
      target.evs = evs;
      recalcPokemonStats(target);
      const statNames: Record<string, string> = {
        hp: 'HP', atk: 'Attack', def: 'Defense', spe: 'Speed', spa: 'Sp. Atk', spd: 'Sp. Def',
      };
      return { success: true, message: `${target.name}'s ${statNames[stat] ?? stat} slightly rose!` };
    }

    default: {
      return { success: false, message: "This item can't be used." };
    }
  }
}

/**
 * Apply a direct-use item effect (no Pokemon target — affects player data directly).
 * Used for pokedex-battery and battle-helper items.
 */
export function applyDirectItemEffect(itemId: string): ItemUseResult {
  const def = getItemDef(itemId);
  if (!def) return { success: false, message: 'Unknown item.' };

  const effect = def.effect;

  if (effect.type === 'pokedex-battery') {
    const pd = getPlayerData();
    const MAX = 50;
    if (pd.pokedexBatteryCharges >= MAX) {
      return { success: false, message: 'Pokedex battery is already full!' };
    }
    const newVal = Math.min(MAX, pd.pokedexBatteryCharges + effect.amount);
    const added = newVal - pd.pokedexBatteryCharges;
    const wasted = effect.amount - added;
    pd.pokedexBatteryCharges = newVal;
    if (wasted > 0) {
      return { success: true, message: `Pokedex charged +${added}! (${pd.pokedexBatteryCharges}/50) — ${wasted} wasted` };
    }
    return { success: true, message: `Pokedex charged +${added}! (${pd.pokedexBatteryCharges}/50)` };
  }

  if (effect.type === 'battle-helper') {
    const pd = getPlayerData();
    pd.battleHelperBattles += effect.battles;
    return { success: true, message: `Battle Helper +${effect.battles} battles! (${pd.battleHelperBattles} left). Toggle ON in Pokedex [H].` };
  }

  return { success: false, message: "This item can't be used directly." };
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

/**
 * Returns true if this item should be consumed (removed from inventory) after use.
 * TMs and HMs are never consumed — they can be used repeatedly.
 */
export function isItemConsumable(itemId: string): boolean {
  const def = getItem(itemId);
  if (!def) return false;
  return def.effect.type !== 'tm';
}
