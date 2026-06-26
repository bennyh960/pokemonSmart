import { useState } from 'react';
import type { Move, PlayerData, Pokemon } from '../../types/index.js';
import { useI18n } from '../../ui-react/context/i18n-context.js';
import { InspectorPanel } from './components/InspectorPanel/index.js';
import type { PartyMode } from './index.js';
import { useKeyPress } from '../../ui-react/hooks/useKeyboard.tsx';
import PartySquadPanel from './components/PartySquadPanel/PartySquadPanel.tsx';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData.ts';

interface Props {
  onClose: () => void;
  mode: PartyMode;
}

export function PartyScreen({ onClose, mode }: Props) {
  const { t, isRTL } = useI18n();
  const [pd, editPlayerData] = usePlayerData();

  // party is a LIVE read — not state. Re-renders come from the store.
  const party = pd.party;

  // Selection tracked by identity (uuid), re-resolved against live pd each render
  // so it survives reorders/heals without going stale.
  const [selectedUuid, setSelectedUuid] = useState<string>(party[0]?.uuid ?? '');
  const selected = party.find((p) => p.uuid === selectedUuid) ?? party[0];

  function handleSelectPokemon(index: number) {
    if (mode.kind === 'select-target') {
      // const success = mode.onSelect?.(index);
      // if (success) onClose();
    }
  }

  // useDragSort produces the full reordered array; we apply it through the funnel.
  function applyPartyOrder(next: Pokemon[]) {
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

  function equipItem(uuid: string, itemId: string) {
    editPlayerData((pd) => {
      const mon = pd.party.find((p) => p.uuid === uuid);
      if (!mon) return;

      if (mon.heldItemId === itemId) {
        // unequip: return the item to the bag
        pd.items[itemId] = (pd.items[itemId] ?? 0) + 1;
        mon.heldItemId = null;
      } else {
        // return any currently-held item, then equip the new one
        if (mon.heldItemId) pd.items[mon.heldItemId] = (pd.items[mon.heldItemId] ?? 0) + 1;
        mon.heldItemId = itemId;
        pd.items[itemId] = (pd.items[itemId] ?? 0) - 1;
      }
      if (pd.items[itemId] !== undefined && pd.items[itemId] <= 0) delete pd.items[itemId];
    });
  }

  useKeyPress(['Escape', 'ArrowDown', 'ArrowUp'], (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const currentIndex = party.findIndex((p) => p.uuid === selected.uuid);
      const nextIndex = (currentIndex + 1) % party.length;
      const prevIndex = (currentIndex - 1 + party.length) % party.length;
      setSelectedUuid(party[e.key === 'ArrowDown' ? nextIndex : prevIndex].uuid);
    }
  });

  let b = pd.badges >>> 0;
  let badgeCount = 0;
  while (b) {
    badgeCount += b & 1;
    b >>>= 1;
  }

  return (
    <div
      className="w-full h-full flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <header className="shrink-0 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md z-10">
        <div className="flex items-center justify-between px-4 h-12 gap-4">
          {/* LEFT: back + title + count */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider shrink-0"
            >
              <span className="text-lg leading-none">←</span>
              <span className="hidden sm:inline">{t('common.back')}</span>
            </button>
            <div className="h-4 w-px bg-slate-800 shrink-0" />
            <h1 className="text-white font-bold text-sm tracking-wide shrink-0">{t('party.title')}</h1>
            <span className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-md font-medium shrink-0">
              {party.length}/6
            </span>
          </div>

          {/* CENTRE: active quest — only when present */}
          {pd.story?.activeQuestId && (
            <div className="hidden md:flex items-center gap-1.5 min-w-0 flex-1 justify-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider shrink-0">Quest</span>
              <span className="text-[11px] text-slate-300 font-medium truncate">{pd.story.activeQuestId}</span>
            </div>
          )}

          {/* RIGHT: badges + money */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Badge pips */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full border transition-colors ${
                    i < badgeCount ? 'bg-yellow-400 border-yellow-500' : 'bg-slate-800 border-slate-700'
                  }`}
                />
              ))}
            </div>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            {/* Money */}
            <span className="text-slate-300 text-xs font-mono font-bold">₽{pd.money.toLocaleString()}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-4 md:p-6 gap-6">
        {/* PANEL: PARTY SQUAD */}
        <div className="flex-[4] flex flex-col px-3 gap-5 bg-slate-900/20 border border-slate-800/60 rounded-3xl overflow-hidden backdrop-blur-xl relative min-h-[520px] lg:min-h-0 lg:h-full shadow-2xl">
          <PartySquadPanel
            party={party} // read-only → display boundary
            selectedUuid={selected?.uuid ?? ''}
            onSelect={setSelectedUuid}
            onReorder={applyPartyOrder}
          />
        </div>

        {/* PANEL: LIVE INSPECTOR — wider on desktop, taller when stacked */}
        <div className="flex-[6] flex flex-col bg-slate-900/20 border border-slate-800/60 rounded-3xl overflow-hidden backdrop-blur-xl relative min-h-[600px] lg:min-h-0 lg:h-full shadow-2xl">
          <InspectorPanel
            pokemon={selected}
            party={party}
            onMoveReorder={(moves) => setMoves(selected.uuid, moves)}
            onEquipItem={equipItem}
            pd={pd}
          />
        </div>
      </div>
    </div>
  );
}
