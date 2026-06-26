import { useState, useCallback, useEffect } from 'react';
import type { Pokemon } from '../../types/index.js';
import { getPlayerData } from '../../systems/game-state.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { useDragSort } from '../../ui-react/hooks/useDragSort.js';
import { PokemonCard } from './components/PokemonCard.tsx';
import { InspectorPanel } from './components/InspectorPanel/index.js';
import type { PartyMode } from './index.js';
import type { InputManager } from '../../engine/input/input_manager.ts';
import { useKeyPress } from '../../ui-react/hooks/useKeyboard.tsx';
import PartySquadPanel from './components/PartySquadPanel/PartySquadPanel.tsx';

interface Props {
  onClose: () => void;
  mode: PartyMode;
}

export function PartyScreen({ onClose, mode }: Props) {
  const { t, isRTL } = useI18n();
  const pd = getPlayerData();

  const [party, setParty] = useState<Pokemon[]>([...pd.party]);
  const [selected, setSelected] = useState<Pokemon>(party[0]);

  useEffect(() => {
    console.log(mode);
  }, []);

  // Pad to strictly 6 slots

  function handleSelectPokemon(index: number) {
    if (mode.kind === 'select-target') {
      // const success = mode.onSelect?(index)
      // if (success) onClose()
      // if false → stay open, bag scene already set its message
    }
  }

  useKeyPress(['Escape', 'ArrowDown', 'ArrowUp'], (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const currentIndex = party.findIndex((p) => p.uuid === selected.uuid);
      const nextIndex = (currentIndex + 1) % party.length;
      const prevIndex = (currentIndex - 1 + party.length) % party.length;
      if (e.key === 'ArrowDown') {
        setSelected(party[nextIndex]);
      } else if (e.key === 'ArrowUp') {
        setSelected(party[prevIndex]);
      }
    }
  });

  return (
    <div
      className="w-full h-full flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* HEADER */}
      <header className="shrink-0 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md py-10 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-semibold uppercase tracking-wider"
            >
              <span className="text-xl leading-none">←</span> {t('common.back')}
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <h1 className="text-white font-bold text-lg tracking-wide">{t('party.title')}</h1>
            <span className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-md font-medium">
              {party.length}/6
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <kbd className="px-2 py-1 bg-slate-900 rounded border border-slate-800 font-mono text-slate-400">1–6</kbd>
            <span>{t('party.keyHint')}</span>
          </div>
        </div>
      </header>

      {/* MASTER-DETAIL BODY */}
      {/* Switches to a scrollable flex column on small devices, returns to a side-by-side dashboard layout on modern screens */}
      <div className="flex-1 w-full flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 md:p-6 gap-6">
        {/*  PANEL: PARTY SQUAD */}

        {/* <div className="flex-col flex-[4] flex gap-4"> */}
        <div className="flex-[4] flex flex-col px-3 gap-5 bg-slate-900/20 border border-slate-800/60 rounded-3xl overflow-hidden backdrop-blur-xl relative min-h-[450px] lg:min-h-0 shadow-2xl">
          <PartySquadPanel party={party} setParty={setParty} pd={pd} selected={selected} setSelected={setSelected} />
        </div>

        {/*  PANEL: LIVE INSPECTOR */}
        {/* Adds a base minimum height constraint when wrapped layout is stacked vertically underneath the squad list */}
        <div className="flex-[5] flex flex-col bg-slate-900/20 border border-slate-800/60 rounded-3xl overflow-hidden backdrop-blur-xl relative min-h-[450px] lg:min-h-0 shadow-2xl">
          <InspectorPanel
            pd={pd}
            pokemon={selected}
            party={party}
            onMoveReorder={(moves) => {
              selected.moves = moves;
              setSelected({ ...selected, moves });
            }}
          />
        </div>
      </div>
    </div>
  );
}
