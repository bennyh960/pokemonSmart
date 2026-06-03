/**
 * Centralized item effect application logic.
 *
 * All item effects (heal, revive, pp-restore, rare-candy, etc.) are handled here
 * so that both the Battle scene and the Bag/overworld can share the same code.
 */

import type { Pokemon } from '../types/index.js';
import { getItemGameData, getItemGameDataBySlug, getTMEffect } from '../data/item-defs.js';
import { getPlayerData } from './game-state.js';
import { checkAndApplyLevelUp, recalcPokemonStats } from './encounter.js';
import {
  getPokemonDisplayName,
  getMove,
  canLearnViaTM,
  getNextEvolution,
  type EvolutionStep,
} from '../services/pokemon-data.js';
import { getLocale, t } from '../i18n/i18n.js';
import type { LevelUpMoveResult } from './move-learning.js';
import { createMoveFromId } from './move-learning.js';
import { canCurePersistentStatus } from './battle-state.js';
import { getItem } from '../data/items.js';

export interface ItemUseResult {
  success: boolean;
  message: string; // e.g. "Restored 20 HP!" or "Can't use on this Pokemon"
  leveledUp?: boolean; // true if rare-candy caused a level up
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
    case 'restore-full':
    case 'revive':
    case 'status-cure':
    case 'pp-restore':
    case 'pp-restore-one':
    case 'rare-candy':
    case 'vitamin':
    case 'tm':
    case 'evolution-stone':
      return true;
    default:
      return false;
  }
}

/** Returns true if this item can be used directly without selecting a Pokemon target. */
export function isDirectUseItem(itemId: string): boolean {
  const def = getItemDef(itemId);
  if (!def) return false;
  return def.effect.type === 'pokedex-battery' || def.effect.type === 'battle-helper' || def.effect.type === 'repel';
}

export function canUseItemOnPokemon(itemId: string, target: Pokemon): boolean {
  const def = getItemDef(itemId);
  if (!def) return false;

  switch (def.effect.type) {
    case 'heal':
    case 'restore-full': // is ok to apply full restore even if no status to cure, since it still heals HP
    case 'heal-full':
      return target.hp > 0 && target.hp < target.maxHp;
    case 'revive':
      return target.hp <= 0;
    case 'status-cure':
    case 'restore-full': // is ok to apply full restore even if no status to cure, since it still heals HP
      return canCurePersistentStatus(target.status, def.effect.status);
    case 'pp-restore':
    case 'pp-restore-one':
      return target.hp > 0 && target.moves.some((move) => move.currentPp < move.pp);
    case 'rare-candy':
      return target.hp > 0;
    case 'vitamin':
      return target.hp > 0 && (target.evs?.[def.effect.stat] ?? 0) < 31;
    case 'tm': {
      const tmEffect = getTMEffect(itemId);
      if (!tmEffect) return false;
      if (!canLearnViaTM(target.id, tmEffect.moveId)) return false;
      if (target.moves.some((m) => m.id === tmEffect.moveId)) return false;
      return true; // eligible even if move slots full — replacement flow handles that
    }
    case 'evolution-stone': {
      if (target.hp <= 0) return false;
      const stoneSlug = getItem(itemId)?.id;
      if (!stoneSlug) return false;
      const nextEvo = getNextEvolution(target.id);
      return nextEvo?.trigger === 'use-item' && nextEvo.item === stoneSlug;
    }
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
        return { success: false, message: t('item.effect.cantUse') };
      }
      if (target.hp >= target.maxHp) {
        return { success: false, message: t('item.effect.hpFull') };
      }
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + effect.amount);
      const restored = target.hp - before;
      return { success: true, message: t('item.effect.restoredHp', { amount: restored }) };
    }

    case 'heal-full': {
      if (target.hp <= 0) {
        return { success: false, message: t('item.effect.cantUse') };
      }
      if (target.hp >= target.maxHp) {
        return { success: false, message: t('item.effect.hpFull') };
      }
      target.hp = target.maxHp;
      return { success: true, message: t('item.effect.hpFullRestored') };
    }

    case 'revive': {
      if (target.hp > 0) {
        return { success: false, message: t('item.effect.cantUse2') };
      }
      const restored = Math.max(1, Math.floor(target.maxHp * (effect.hpPercent / 100)));
      target.hp = restored;
      return { success: true, message: t('item.effect.revived', { amount: restored }) };
    }

    case 'status-cure': {
      if (!canCurePersistentStatus(target.status, effect.status)) {
        return {
          success: false,
          message: t('item.effect.cantUseStatus', {
            status: effect.status === 'all' ? 'have any status condition' : effect.status,
          }),
        };
      }
      target.status = null;
      return { success: true, message: t('item.effect.cured') };
    }

    case 'restore-full': {
      if (target.hp <= 0) {
        return { success: false, message: t('item.effect.cantUse') };
      }
      let cured = false;
      if (canCurePersistentStatus(target.status, effect.status)) {
        target.status = null;
        cured = true;
      }
      target.hp = target.maxHp;
      return {
        success: true,
        message: cured ? t('item.effect.hpFullRestoredAndCured') : t('item.effect.hpFullRestored'),
      };
    }

    case 'pp-restore': {
      if (target.hp <= 0) {
        return { success: false, message: t('item.effect.cantUse') };
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
        return { success: false, message: t('item.effect.ppFullAll') };
      }
      return { success: true, message: t('item.effect.ppRestored') };
    }

    case 'pp-restore-one': {
      if (target.hp <= 0) {
        return { success: false, message: t('item.effect.cantUse') };
      }
      // Restore the first move with depleted PP
      const move = target.moves.find((m) => m.currentPp < m.pp);
      if (!move) {
        return { success: false, message: t('item.effect.ppFullAll') };
      }
      const before = move.currentPp;
      move.currentPp = effect.amount === 999 ? move.pp : Math.min(move.pp, move.currentPp + effect.amount);
      const restored = move.currentPp - before;
      return { success: true, message: t('item.effect.ppRestoredOne', { amount: restored, move: move.id }) };
    }

    case 'stat-boost': {
      // Stat boosts are battle-only; handled separately in battle.ts
      return { success: false, message: t('item.effect.allowInBattle') };
    }

    case 'rare-candy': {
      if (target.hp <= 0) {
        return { success: false, message: t('item.effect.cantUse') };
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
      return { success: true, message: t('item.effect.gainedExperience') };
    }

    case 'tm': {
      // NOTE: Actual compatibility check and natural-level warning are handled in bag.ts.
      // This function only does the raw move addition (called after UI confirms).
      const move = getMove(effect.moveId);
      if (!move) return { success: false, message: t('item.effect.moveNotFound') };

      // Check if already knows the move
      const allMoves = [...(target.moves || [])];
      if (allMoves.some((m) => m.id === effect.moveId)) {
        return { success: false, message: t('item.effect.alreadyKnowsMove', { move: move.name[getLocale()] }) };
      }

      // Add to battle moves if there is space (up to 8 max)
      if ((target.moves?.length ?? 0) < 8) {
        const newMove = createMoveFromId(effect.moveId);
        if (!newMove) return { success: false, message: t('item.effect.moveNotFound') };
        target.moves = [...(target.moves || []), newMove];
      } else {
        return {
          success: false,
          message: t('item.effect.noSpaceForMove', {
            move: move.name[getLocale()],
          }),
        };
      }

      return {
        success: true,
        message: t('item.effect.learnedMove', { move: move.name[getLocale()] }),
      };
    }

    case 'evolution-stone': {
      if (target.hp <= 0) {
        return { success: false, message: t('item.effect.cantUse') };
      }
      const stoneSlug = getItem(itemId)?.id;
      if (!stoneSlug) {
        return { success: false, message: '???-באג' };
      }
      const nextEvo = getNextEvolution(target.id);
      if (!nextEvo || nextEvo.trigger !== 'use-item' || nextEvo.item !== stoneSlug) {
        return { success: false, message: t('item.effect.noEffect') };
      }
      return {
        success: true,
        message: `${getPokemonDisplayName(target.id)} ` + t('item.effect.evolvedInto'),
        evolution: nextEvo,
      };
    }

    case 'capture': {
      // Capture is handled separately in battle flow, not via this function
      return { success: false, message: t('item.effect.cantUse3') };
    }

    case 'none': {
      return { success: false, message: t('item.effect.cantUse3') };
    }

    case 'vitamin': {
      if (target.hp <= 0) {
        return { success: false, message: t('item.effect.cantUse') };
      }
      const stat = effect.stat;
      const EV_CAP = 31;
      const EV_PER_USE = 4; // 4 EVs per vitamin so stat changes are visible at normal levels
      const evs = target.evs ?? { hp: 0, atk: 0, def: 0, spe: 0, spa: 0, spd: 0 };
      if (evs[stat] >= EV_CAP) {
        return { success: false, message: t('item.effect.noEffect') };
      }
      evs[stat] = Math.min(EV_CAP, evs[stat] + EV_PER_USE);
      target.evs = evs;
      recalcPokemonStats(target);
      const statNames: Record<string, { he: string; en: string }> = {
        hp: { he: 'נקודות חיים', en: 'HP' },
        atk: { he: 'התקפה', en: 'Attack' },
        def: { he: 'הגנה', en: 'Defense' },
        spe: { he: 'מהירות', en: 'Speed' },
        spa: { he: 'התקפה מיוחדת', en: 'Sp. Atk' },
        spd: { he: 'הגנה מיוחדת', en: 'Sp. Def' },
      };
      return {
        success: true,
        message: t('battle.statRose', {
          name: getPokemonDisplayName(target.id),
          stat: statNames[stat]?.[getLocale()] ?? stat,
        }),
      };
    }

    default: {
      return { success: false, message: t('item.effect.cantUse3') };
    }
  }
}

/**
 * Apply a direct-use item effect (no Pokemon target — affects player data directly).
 * Used for pokedex-battery and battle-helper items.
 */
export function applyDirectItemEffect(itemId: string): ItemUseResult {
  const def = getItemDef(itemId);
  if (!def) return { success: false, message: '???-באג' };

  const effect = def.effect;

  if (effect.type === 'pokedex-battery') {
    const pd = getPlayerData();
    const MAX = 50;
    if (pd.pokedexBatteryCharges >= MAX) {
      return { success: false, message: t('item.effect.pokedexFull') };
    }
    const newVal = Math.min(MAX, pd.pokedexBatteryCharges + effect.amount);
    const added = newVal - pd.pokedexBatteryCharges;
    const wasted = effect.amount - added;
    pd.pokedexBatteryCharges = newVal;
    if (wasted > 0) {
      return {
        success: true,
        message: t('item.effect.pokedexBatteryWasted', { added: String(added), wasted: String(wasted) }),
      };
    }
    return {
      success: true,
      message: t('item.effect.pokedexBatteryCharged', {
        added: String(added),
        total: String(pd.pokedexBatteryCharges),
      }),
    };
  }

  if (effect.type === 'battle-helper') {
    const pd = getPlayerData();
    pd.battleHelperBattles += effect.battles;
    return {
      success: true,
      message: t('item.effect.battleHelper', {
        battles: String(effect.battles),
        total: String(pd.battleHelperBattles),
      }),
    };
  }

  if (effect.type === 'repel') {
    const pd = getPlayerData();
    if (pd.repelStepsRemaining > 0) {
      return { success: false, message: t('repel.already') };
    }
    pd.repelStepsRemaining = effect.steps;
    return { success: true, message: t('repel.active', { steps: String(effect.steps) }) };
  }

  return { success: false, message: t('item.effect.cantUse3') };
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
