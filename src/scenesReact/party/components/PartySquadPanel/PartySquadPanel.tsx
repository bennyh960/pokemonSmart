import React, { useCallback, useState } from 'react';
import { PokemonCard } from '../PokemonCard';
import { useDragSort } from '../../../../ui-react/hooks/useDragSort';
import type { PlayerData, Pokemon } from '../../../../types';
import { autoSave } from '../../../../systems/game-state';

interface IPartySquadPanel {
  party: Pokemon[];
  selected: Pokemon;
  setSelected: (pokemon: Pokemon) => void;
  setParty: (party: Pokemon[]) => void;
  pd: PlayerData;
}

const PartySquadPanel = ({ party, selected, setSelected, setParty, pd }: IPartySquadPanel) => {
  const slots = Array.from({ length: 6 }).map((_, i) => party[i] || null);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const handleReorder = useCallback(
    (next: Pokemon[]) => {
      setParty(next);
      pd.party.splice(0, pd.party.length, ...next);
      setDraggingIndex(null);
      autoSave();
      if (selected) {
        const updated = next.find((p) => p.uuid === selected.uuid);
        if (updated) {
          setSelected(updated);
        }
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

  return (
    <>
      <div className="px-5 pt-4 pb-1">
        <h3 className="text-slate-400 text-xs font-bold tracking-wider uppercase">Party Squad</h3>
      </div>
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
    </>
  );
};

export default PartySquadPanel;
