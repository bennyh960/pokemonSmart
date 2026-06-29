import type { PartyMode } from '../..';
import { getItem, type ItemDef } from '../../../../data/items';
import { getRegularNextEvolution } from '../../../../services/pokemon-data';
import type { Pokemon } from '../../../../types';

const getQuickActionsItems = (mode: PartyMode, inventory: Record<string, number>) => {
  const items = Object.entries(inventory)
    .map(([itemId, count]) => {
      const itemDef = getItem(itemId);
      return { itemId, count, itemDef };
    })
    .filter(
      (e) =>
        e.count > 0 &&
        ((mode.kind === 'battle' && e.itemDef?.usableInBattle) ||
          (mode.kind === 'overworld' && e.itemDef?.usableInOverworld)),
    );
  // console.debug('QuickActionButton items:', items);
  return items;
};

export interface QuickActionItem {
  itemId: string;
  count: number;
  itemDef: ItemDef | undefined;
}

// similar logic to canUseItemOnPokemon on item-effects.ts but we don't want to apply the effect here, just check if it is relevant to the current pokemon state
export const getQuickActions = (
  pokemon: Pokemon,
  mode: PartyMode,
  inventory: Record<string, number>,
): QuickActionItem[] => {
  const items = getQuickActionsItems(mode, inventory);
  const itemsToShow: QuickActionItem[] = [];

  const isFainted = pokemon.hp <= 0;
  const deltaHP = pokemon.maxHp - pokemon.hp;

  // 1. Sort by category priority
  // Fixed: Fallback to safe array spread copy if environment doesn't support toSorted
  const sortedItems = [...items].sort((a, b) => {
    const categoryOrder = ['evolution', 'revival', 'healing', 'status-cure', 'pp-restore', 'battle', 'vitamin'];
    const aIndex = categoryOrder.indexOf(a.itemDef?.category ?? '');
    const bIndex = categoryOrder.indexOf(b.itemDef?.category ?? '');
    return aIndex - bIndex;
  });

  // 2. Filter and Match
  sortedItems.forEach((entry) => {
    const { itemDef } = entry;
    if (!itemDef) return;

    const { type } = itemDef.effect;

    // --- DEAD STATE LATCH ---
    if (isFainted) {
      if (itemDef.category === 'revival') {
        itemsToShow.push(entry);
      }
      return; // Absolute block: Fainted pokemon cannot receive any other items
    }

    // --- ALIVE STATE ACTIONS ---

    // Evolution Stones
    if (itemDef.category === 'evolution') {
      const nextEvo = getRegularNextEvolution(pokemon.id);
      const stoneEvo = nextEvo.find((e) => e.trigger === 'use-item' && e.item === itemDef.id);
      if (stoneEvo) {
        return itemsToShow.push(entry); // Return early to prevent duplicate array pushing
      }
    }

    // Smart Healing Logic
    if (itemDef.category === 'healing' && deltaHP > 0) {
      if (type === 'heal') {
        const amount = itemDef.effect.amount;

        // Show if the item heals a meaningful chunk, OR if the user is almost fully healed anyway
        const isNotMassiveWaste = amount <= deltaHP + 20;
        const healsSignificantAmount = amount >= deltaHP * 0.3;

        if (isNotMassiveWaste || healsSignificantAmount) {
          return itemsToShow.push(entry);
        }
      }

      if (type === 'heal-full') {
        // Only show full heals if missing at least 30% of Max HP, otherwise save it
        if (deltaHP / pokemon.maxHp >= 0.3) {
          return itemsToShow.push(entry);
        }
      }
    }

    // Status Cure
    if (itemDef.category === 'status-cure' && pokemon.status) {
      if (
        itemDef.effect.type === 'status-cure' &&
        (itemDef.effect.status === 'all' || itemDef.effect.status === pokemon.status)
      ) {
        return itemsToShow.push(entry);
      }
    }

    // PP Restore
    if (itemDef.category === 'pp-restore' && pokemon.moves.some((m) => m.currentPp < m.pp)) {
      return itemsToShow.push(entry);
    }

    // Battle Items (X-Items)
    if (type === 'stat-boost') {
      return itemsToShow.push(entry);
    }

    // Vitamins
    if (itemDef.category === 'vitamin') {
      return itemsToShow.push(entry);
    }
  });

  // 3. Final Healing Re-sorting (Optional Fine-tuning)
  // If there are multiple healing items allowed, sort them so the best matching one is leftmost
  itemsToShow.sort((a, b) => {
    if (a.itemDef?.category === 'healing' && b.itemDef?.category === 'healing') {
      const aAmt = a.itemDef.effect.type === 'heal' ? a.itemDef.effect.amount : pokemon.maxHp;
      const bAmt = b.itemDef.effect.type === 'heal' ? b.itemDef.effect.amount : pokemon.maxHp;

      // Calculate how close each item is to perfectly clearing deltaHP without overflowing massively
      const aDiff = Math.abs(deltaHP - aAmt);
      const bDiff = Math.abs(deltaHP - bAmt);
      return aDiff - bDiff; // Closest to perfect heal goes first
    }
    return 0;
  });

  return itemsToShow.slice(0, 5);
};
