import { useRef, useState } from 'react';
import { PokemonCard } from '../PokemonCard';
import { useDragSort } from '../../../../ui-react/hooks/useDragSort';
import type { Pokemon } from '../../../../types';
import { useI18n } from '../../../../ui-react/context/i18n-context';
import type { PartyMode } from '../..';
import { getItem } from '../../../../data/items';
import { useInputLayer } from '../../../../engine/inputManagerV2';

interface IPartySquadPanel {
  party: Pokemon[];
  selectedUuid: string;
  onSelect: (uuid: string) => void;
  onReorder: (next: Pokemon[]) => void;
  mode: PartyMode;
  onDoubleClick: (pokemon: Pokemon) => void;
}

const PartySquadPanel = ({ party, selectedUuid, onSelect, onReorder, mode, onDoubleClick }: IPartySquadPanel) => {
  const { t, locale, isRTL } = useI18n();
  const slots = Array.from({ length: 6 }).map((_, i) => party[i] || null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [softSelectedUuid, setSoftSelectedUuid] = useState<string | null>(null);

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

  useInputLayer({
    id: 'party-squad-panel',
    name: 'Party Squad Panel',
    blocksLowerLayers: false,
    keyBindings: [
      { code: 'Space', action: 'swap-request' },
      { code: 'Enter', action: 'ok' },
      { code: 'ArrowDown', action: 'down' },
      { code: 'ArrowUp', action: 'up' },
    ],
    onAction: (action) => {
      if (action === 'down') {
        handleChangeSelectedCursor('down');
      } else if (action === 'up') {
        handleChangeSelectedCursor('up');
      }

      if (!softSelectedUuid && action === 'ok') {
        onDoubleClick(party.find((p) => p.uuid === selectedUuid)!);
        return;
      }
      if (mode.kind === 'overworld' && action === 'swap-request') {
        if (!softSelectedUuid) {
          setSoftSelectedUuid(selectedUuid);
        } else {
          setSoftSelectedUuid(null);
        }
      } else if (action === 'ok' && softSelectedUuid) {
        const softSelectedIndex = party.findIndex((p) => p.uuid === softSelectedUuid);
        const selectedIndex = party.findIndex((p) => p.uuid === selectedUuid);

        if (softSelectedIndex !== -1 && selectedIndex !== -1 && softSelectedIndex !== selectedIndex) {
          const next = [...party];
          // swap the two
          const temp = next[softSelectedIndex];
          next[softSelectedIndex] = next[selectedIndex];
          next[selectedIndex] = temp;
          onReorder(next);
          setSoftSelectedUuid(null);
        }
      }
    },
  });

  const handleChangeSelectedCursor = (direction: 'up' | 'down') => {
    if (mode.kind === 'move-learning') return;
    const currentIndex = party.findIndex((p) => p.uuid === selectedUuid);
    const nextIndex = (currentIndex + 1) % party.length;
    const prevIndex = (currentIndex - 1 + party.length) % party.length;
    onSelect(party[direction === 'down' ? nextIndex : prevIndex].uuid);
  };

  const itemRef = useRef(mode.kind === 'select-target' ? getItem(mode.itemId) : null);
  const leaderIndex = party.findIndex((p) => p.hp > 0);

  return (
    <>
      <div className="px-5 pt-4 pb-1">
        <h3 className="text-slate-400 text-xs font-bold tracking-wider uppercase">
          {mode.kind === 'select-target'
            ? t('bag.selectPokemon', { itemName: itemRef.current?.name[locale] ?? '' })
            : t('party.squad')}
        </h3>
      </div>

      {itemRef.current && (
        <div className="px-5 pb-2 text-slate-400 text-xs font-medium tracking-wide">
          {itemRef.current?.description[locale]}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-center" dir={isRTL ? 'rtl' : 'ltr'}>
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
              disabled={mode.kind === 'select-target' && !mode.isEligible?.(pokemon)}
              index={i}
              isLeader={i === leaderIndex}
              isSelected={selectedUuid === pokemon.uuid || softSelectedUuid === pokemon.uuid}
              isDragging={mode.kind === 'battle' ? false : draggingIndex === i}
              dragHandlers={
                mode.kind === 'battle'
                  ? undefined
                  : { onDragStart: wrappedDragStart, onDragOver, onDragEnd: wrappedDragEnd }
              }
              onClick={() => {
                onSelect(pokemon.uuid);
                setSoftSelectedUuid(null);
              }}
              onDoubleClick={() => onDoubleClick(pokemon)}
            />
          );
        })}
      </div>
    </>
  );
};

export default PartySquadPanel;
