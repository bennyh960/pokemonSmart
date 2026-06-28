import { useEffect, useState } from 'react';
import type { Move, Pokemon } from '../../types/index.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { InspectorPanel } from './components/InspectorPanel/index';
import type { PartyMode } from './index.js';
import { useKeyPress } from '../../ui-react/hooks/useKeyboard.tsx';
import PartySquadPanel from './components/PartySquadPanel/PartySquadPanel.tsx';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.ts';
import { getQuickActions } from './lib/helpers.ts';
import QuickActions from './components/QuickActions';
import { canUseItemOnPokemon } from '../../systems/item-effects.ts';
import PartyHeader from './components/PartyHeader/PartyHeader.tsx';
import { setPartyIndex } from '../../scenes/party/party_scene.ts';
import { GameNotification, type GameNotificationProps } from '../../ui-react/componenets/GameNotification.tsx';
import { getGlobalAudio } from '../../audio/audio-manager.ts';
import { getPokemonDisplayName } from '../../services/pokemon-data.ts';
import { getItem } from '../../data/items.ts';

interface Props {
  onClose: () => void;
  mode: PartyMode;
}

export function PartyScreen({ onClose, mode }: Props) {
  const { t, isRTL, locale } = useI18n();
  const [pd, editPlayerData] = usePlayerData();
  const [notification, setNotification] = useState<GameNotificationProps | null>(null);
  // party is a LIVE read — not state. Re-renders come from the store.
  const party = pd.party;

  // Selection tracked by identity (uuid), re-resolved against live pd each render
  // so it survives reorders/heals without going stale.
  const [selectedUuid, setSelectedUuid] = useState<string>(
    mode.kind === 'battle' && mode.inBattleUUID ? mode.inBattleUUID : party[0].uuid,
  );
  const selected = party.find((p) => p.uuid === selectedUuid) ?? party[0];
  const quickActionsItems = getQuickActions(selected, mode, pd.items);

  /** Check if a Pokemon is eligible for selection in the current mode. */
  function isPokemonEligible(index: number) {
    if (mode.kind === 'battle') {
      const roster = mode.roster;
      if (!roster.has(index) && roster.size >= mode.maxSize) {
        setNotification({
          position: 'top-center',
          text: t('battle.rosterFull', { max: mode.maxSize, count: mode.maxSize }),
          type: 'warning',
          duration: 4000,
        });
        return false;
      }
      return true;
    } else if (mode.kind === 'select-target') {
      if (mode.isEligible?.(selected)) return true;
      return canUseItemOnPokemon(mode.itemId, selected);
    }
  }

  function onDoubleClick(pokemon: Pokemon) {
    const isEligible = isPokemonEligible(party.indexOf(pokemon));
    if (!isEligible) {
      return;
    }
    if (mode.kind === 'battle') {
      setPartyIndex(party.indexOf(pokemon));
      onClose();
    }
  }

  // useDragSort produces the full reordered array; we apply it through the funnel.
  function applyPartyOrder(next: Pokemon[]) {
    if (mode.kind === 'battle') return;
    editPlayerData((pd) => {
      pd.party.splice(0, pd.party.length, ...next);
    });
  }

  function setMoves(uuid: string, moves: Move[]) {
    editPlayerData((pd) => {
      const mon = pd.party.find((p) => p.uuid === uuid);
      if (mon) mon.moves = moves;
    });
  }

  // Held Items only
  function equipItem(uuid: string, itemId: string) {
    editPlayerData((pd) => {
      const mon = pd.party.find((p) => p.uuid === uuid);
      if (!mon) return;

      if (mon.heldItemId === itemId) {
        // unequip: return the item to the bag
        pd.items[itemId] = (pd.items[itemId] ?? 0) + 1;
        mon.heldItemId = null;
        setNotification({
          position: 'top-center',
          text: t('bag.heldItem.unequipped', {
            item: getItem(itemId)?.name[locale] ?? '???',
            name: getPokemonDisplayName(mon.id),
          }),
          type: 'danger',
        });
      } else {
        // return any currently-held item, then equip the new one
        if (mon.heldItemId) pd.items[mon.heldItemId] = (pd.items[mon.heldItemId] ?? 0) + 1;
        mon.heldItemId = itemId;
        pd.items[itemId] = (pd.items[itemId] ?? 0) - 1;
        setNotification({
          position: 'top-center',
          text: t('bag.heldItem.equipped', {
            item: getItem(itemId)?.name[locale] ?? '???',
            name: getPokemonDisplayName(mon.id),
          }),
          type: 'success',
        });
      }
      if (pd.items[itemId] !== undefined && pd.items[itemId] <= 0) delete pd.items[itemId];
    });
  }

  // Global ESC
  useKeyPress(['Escape'], (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  });

  // party squad pannel
  useKeyPress(['ArrowDown', 'ArrowUp', 'Enter'], (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const currentIndex = party.findIndex((p) => p.uuid === selected.uuid);
      const nextIndex = (currentIndex + 1) % party.length;
      const prevIndex = (currentIndex - 1 + party.length) % party.length;
      setSelectedUuid(party[e.key === 'ArrowDown' ? nextIndex : prevIndex].uuid);
    } else if (e.key === 'Enter') {
      console.log('double click', selected);
      onDoubleClick(selected);
    }
  });

  useEffect(() => {
    getGlobalAudio()?.playCry(selected?.id ?? 0);
  }, [selected]);

  return (
    <div
      className="w-full h-full flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <PartyHeader onClose={onClose} t={t} pd={pd} mode={mode} onDoubleClick={onDoubleClick} />

      <div className="flex-1 w-full flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 md:p-6 gap-6">
        {/* PANEL: PARTY SQUAD */}
        <div className="flex-[4] flex flex-col px-3 gap-5 bg-slate-900/20 border border-slate-800/60 rounded-3xl overflow-hidden backdrop-blur-xl relative min-h-[520px] lg:min-h-0 lg:h-full shadow-2xl">
          <PartySquadPanel
            party={party} // read-only → display boundary
            selectedUuid={selected?.uuid ?? ''}
            onSelect={setSelectedUuid}
            onReorder={applyPartyOrder}
            mode={mode}
            onDoubleClick={onDoubleClick}
          />
        </div>

        {/* PANEL: LIVE INSPECTOR — wider on desktop, taller when stacked */}
        <div className="flex-[6] flex flex-col bg-slate-900/20 border border-slate-800/60 rounded-3xl overflow-hidden backdrop-blur-xl relative min-h-[600px] lg:min-h-0 lg:h-full shadow-2xl">
          <InspectorPanel
            pokemon={selected}
            party={party}
            mode={mode}
            onMoveReorder={(moves) => setMoves(selected.uuid, moves)}
            onEquipItem={equipItem}
            pd={pd}
          />
        </div>
      </div>
      <QuickActions mode={mode} onClose={onClose} pd={pd} editPlayerData={editPlayerData} selected={selected} />
      {notification && <GameNotification {...notification} onClose={() => setNotification(null)} />}
    </div>
  );
}
