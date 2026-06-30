import { useEffect, useState } from 'react';
import type { Move, Pokemon } from '../../types/index.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { InspectorPanel } from './components/InspectorPanel/index';
import type { PartyMode } from './index.js';
import { useKeyPress } from '../../ui-react/hooks/useKeyboard.tsx';
import PartySquadPanel from './components/PartySquadPanel/PartySquadPanel.tsx';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.ts';
import { getQuickActions } from './components/QuickActions/helpers.ts';
import QuickActions from './components/QuickActions/QuickActions.tsx';
import { canUseItemOnPokemon } from '../../systems/item-effects.ts';
import PartyHeader from './components/PartyHeader/PartyHeader.tsx';
import { setPartyIndex } from '../../scenes/party/party_scene.ts';
import { getGlobalAudio } from '../../audio/audio-manager.ts';
import MoveLearning from './components/MoveLearning/MoveLearning.tsx';
import type { StateMachine } from '../../engine/state-machine.ts';
import { FloatingTextLayer } from '../../ui-react/componenets/FloatingText.tsx';
import { useGameNotification } from '../../ui-react/context/GameNotifications-context.tsx';
import { getPokemonDisplayName } from '../../services/pokemon-data.ts';

interface Props {
  onClose: () => void;
  mode: PartyMode;
  stateMachine: StateMachine;
}

export function PartyScreen({ onClose, mode, stateMachine }: Props) {
  const { t, isRTL } = useI18n();
  const [pd, editPlayerData] = usePlayerData();
  const { showNotification } = useGameNotification();
  // const [notification, setNotification] = useState<GameNotificationProps | null>(null);
  // party is a LIVE read — not state. Re-renders come from the store.
  const party = pd.party;

  // Selection tracked by identity (uuid), re-resolved against live pd each render
  // so it survives reorders/heals without going stale.
  const [selectedUuid, setSelectedUuid] = useState<string>(() => {
    if (mode.kind === 'battle' && mode.inBattleUUID) {
      return mode.inBattleUUID;
    } else if (mode.kind === 'move-learning') {
      return party[mode.session.partyIndex]?.uuid;
    } else if (mode.kind === 'select-target') {
      const eligiblePokemon = party.filter((p) => mode.isEligible?.(p) ?? true);
      return eligiblePokemon[0]?.uuid ?? party[0]?.uuid;
    }
    return party[0]?.uuid;
  });
  const selected = party.find((p) => p.uuid === selectedUuid) ?? party[0];

  // Move learning session state (TODO: CONTINUE)
  const [selectedMoveToDelete, setSelectedMoveToDelete] = useState<null | Move>(null);

  /** Check if a Pokemon is eligible for selection in the current mode. */
  function isPokemonEligible(pokemon: Pokemon) {
    if (mode.kind === 'battle') {
      const roster = mode.roster;
      const index = party.indexOf(pokemon);
      if (!roster.has(index) && roster.size >= mode.maxSize) {
        showNotification({
          text: t('battle.rosterFull', { max: mode.maxSize, count: mode.maxSize }),
          type: 'warning',
          duration: 4000,
        });
        return false;
      }
      return true;
    } else if (mode.kind === 'select-target') {
      // we can't filter party due to many dependecies on other components.
      const isEligible = mode.isEligible?.(pokemon) ?? canUseItemOnPokemon(mode.itemId, selected);
      if (!isEligible) {
        showNotification({
          text: t('bag.isNotEligible', { name: getPokemonDisplayName(pokemon.id) }),
          type: 'warning',
          duration: 2000,
          position: 'top-center',
        });
      }
      return isEligible;
    }
  }

  function onDoubleClick(pokemon: Pokemon) {
    const isEligible = isPokemonEligible(pokemon);
    if (!isEligible) {
      getGlobalAudio()?.playSFX('alert');
      return;
    }
    const index = party.indexOf(pokemon);
    if (mode.kind === 'battle' || mode.kind === 'select-target') {
      setPartyIndex(index);
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

  // Global ESC
  useKeyPress(['Escape'], (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  });

  // party squad pannel
  useKeyPress(['ArrowDown', 'ArrowUp', 'Enter'], (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (mode.kind === 'move-learning') return;
      const currentIndex = party.findIndex((p) => p.uuid === selected.uuid);
      const nextIndex = (currentIndex + 1) % party.length;
      const prevIndex = (currentIndex - 1 + party.length) % party.length;
      setSelectedUuid(party[e.key === 'ArrowDown' ? nextIndex : prevIndex].uuid);
    } else if (e.key === 'Enter') {
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
          {mode.kind === 'move-learning' ? (
            <MoveLearning
              pokemon={selected}
              newMoveId={mode.session.moveId}
              selectedMoveToDelete={selectedMoveToDelete}
              onConfirmReplace={() => onClose()}
              onConfirmSkip={() => {
                onClose();
              }}
            />
          ) : (
            <PartySquadPanel
              party={party} // read-only → display boundary
              selectedUuid={selected?.uuid ?? ''}
              onSelect={setSelectedUuid}
              onReorder={applyPartyOrder}
              mode={mode}
              onDoubleClick={onDoubleClick}
            />
          )}
        </div>

        {/* PANEL: LIVE INSPECTOR — wider on desktop, taller when stacked */}
        <div className="flex-[6] flex flex-col bg-slate-900/20 border border-slate-800/60 rounded-3xl overflow-hidden backdrop-blur-xl relative min-h-[600px] lg:min-h-0 lg:h-full shadow-2xl">
          <InspectorPanel
            pokemon={selected}
            mode={mode}
            editPlayerData={editPlayerData}
            pd={pd}
            showNotification={showNotification}
          />
        </div>
      </div>
      {(mode.kind === 'battle' || mode.kind === 'overworld') && (
        <QuickActions
          mode={mode}
          onClose={onClose}
          editPlayerData={editPlayerData}
          selected={selected}
          quickActionItems={getQuickActions(selected, mode, pd.items)}
          stateMachine={stateMachine}
        />
      )}
      <FloatingTextLayer />
    </div>
  );
}
