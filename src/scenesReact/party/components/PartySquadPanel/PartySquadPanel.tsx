import { useState } from 'react';
import { PokemonCard } from '../PokemonCard';
import { useDragSort } from '../../../../ui-react/hooks/useDragSort';
import type { Pokemon } from '../../../../types';

interface IPartySquadPanel {
  party: Pokemon[];
  selectedUuid: string;
  onSelect: (uuid: string) => void;
  onReorder: (next: Pokemon[]) => void;
}

const PartySquadPanel = ({ party, selectedUuid, onSelect, onReorder }: IPartySquadPanel) => {
  const slots = Array.from({ length: 6 }).map((_, i) => party[i] || null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // useDragSort calls this with the fully reordered array on drop.
  const handleReorder = (next: Pokemon[]) => {
    setDraggingIndex(null);
    onReorder(next);
  };

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
              isSelected={selectedUuid === pokemon.uuid}
              isDragging={draggingIndex === i}
              dragHandlers={{ onDragStart: wrappedDragStart, onDragOver, onDragEnd: wrappedDragEnd }}
              onClick={() => onSelect(pokemon.uuid)}
            />
          );
        })}
      </div>
    </>
  );
};

export default PartySquadPanel;
