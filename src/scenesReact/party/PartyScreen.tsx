import { useState, useCallback } from 'react';
import type { Pokemon } from '../../types/index.js';
import { getPlayerData } from '../../systems/game-state.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { useDragSort } from '../../ui-react/hooks/useDragSort.js';
import { PokemonCard } from './PokemonCard.js';
import { InspectorPanel } from './InspectorPanel.js';

interface Props {
  onClose: () => void;
}

export function PartyScreen({ onClose }: Props) {
  const { t, isRTL } = useI18n();
  const pd = getPlayerData();

  const [party, setParty] = useState<Pokemon[]>([...pd.party]);
  const [selected, setSelected] = useState<Pokemon | null>(party[0] ?? null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const handleReorder = useCallback(
    (next: Pokemon[]) => {
      setParty(next);
      pd.party.splice(0, pd.party.length, ...next);
      setDraggingIndex(null);
      if (selected) {
        const updated = next.find((p) => p.uuid === selected.uuid) ?? null;
        setSelected(updated);
      }
    },
    [pd, selected],
  );

  const { onDragStart, onDragOver, onDragEnd } = useDragSort(party, handleReorder);

  const wrappedDragStart = (i: number) => {
    setDraggingIndex(i);
    onDragStart(i);
  };
  const wrappedDragEnd = () => {
    setDraggingIndex(null);
    onDragEnd();
  };

  // Pad to strictly 6 slots
  const slots = Array.from({ length: 6 }).map((_, i) => party[i] || null);

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
        {/* Collapses down to 1 column on extra small viewports for sleek mobile scaling */}

        <div className="flex-col flex-[4] flex gap-4">
          <h1 className="text-white font-bold text-lg tracking-wide">{t('party.title')}</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-center">
            {slots.map((pokemon, i) => {
              if (!pokemon) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="border-2 border-dashed border-slate-800/40 rounded-2xl bg-slate-900/10 flex flex-col items-center justify-center min-h-[140px] opacity-40 transition-all hover:bg-slate-900/20"
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-800 mb-2 flex items-center justify-center text-slate-600 font-bold text-lg">
                      +
                    </div>
                  </div>
                );
              }
              return (
                <PokemonCard
                  key={pokemon.uuid}
                  pokemon={pokemon}
                  index={i}
                  isSelected={selected?.uuid === pokemon.uuid}
                  isDragging={draggingIndex === i}
                  dragHandlers={{ onDragStart: wrappedDragStart, onDragOver, onDragEnd: wrappedDragEnd }}
                  onClick={() => setSelected(pokemon)}
                />
              );
            })}
          </div>
        </div>

        {/*  PANEL: LIVE INSPECTOR */}
        {/* Adds a base minimum height constraint when wrapped layout is stacked vertically underneath the squad list */}
        <aside className="flex-[5] flex flex-col bg-slate-900/20 border border-slate-800/60 rounded-3xl overflow-hidden backdrop-blur-xl relative min-h-[450px] lg:min-h-0 shadow-2xl">
          {selected ? (
            <InspectorPanel
              pokemon={selected}
              party={party}
              onMoveReorder={(moves) => {
                selected.moves = moves;
                setSelected({ ...selected, moves });
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6">
              <div className="w-16 h-16 rounded-full border-4 border-slate-800/50 mb-4 opacity-30 animate-pulse" />
              <p className="font-medium tracking-wide text-sm">{t('party.selectHint')}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
