import { useState } from 'react';
import { InspectorHeader } from './Header.js';
import { InspectorStatsTab } from './tabs/StatsTab.js';
import type { Move, PlayerData, Pokemon } from '../../../../types/index.js';
import HeldItemsTab from './tabs/HeldItemsTab.js';
import { t } from '../../../../i18n/i18n.js';
import { MovesetTab } from './tabs/MovesetTab.js';
import { TYPE_BADGE } from '../../../../data/type-constants.js';
import type { PartyMode } from '../../index.js';
import { useKeyPress } from '../../../../ui-react/hooks/useKeyboard.js';

interface Props {
  mode: PartyMode;
  pokemon: Pokemon;
  party: Pokemon[];
  pd: PlayerData;
  onMoveReorder?: (moves: Move[]) => void;
  onEquipItem: (uuid: string, itemId: string) => void;
  isPokedexMode?: boolean;
  defaultTab?: 'stats' | 'moveset' | 'items';
}

export function InspectorPanel({
  mode,
  pokemon,
  party,
  pd,
  onMoveReorder,
  onEquipItem,
  isPokedexMode = false,
  defaultTab = 'stats',
}: Props) {
  const [activeTab, setActiveTab] = useState<'stats' | 'moveset' | 'items'>(defaultTab);

  const primaryType = TYPE_BADGE[pokemon.types[0]];
  const secondaryType = TYPE_BADGE[pokemon.types[1]] ?? primaryType;

  const baseTabClass = 'flex-1 pb-3 text-sm font-semibold transition-colors border-b-2';
  const inactiveTabClass = `${baseTabClass} text-slate-500 border-transparent hover:text-slate-300 cursor-pointer`;

  const getTabClass = (tab: string) => (activeTab === tab ? baseTabClass : inactiveTabClass);

  const getTabStyle = (tab: string): React.CSSProperties =>
    activeTab === tab
      ? { color: primaryType.color, borderColor: secondaryType.color, boxShadow: `0 2px 8px ${primaryType.bg}` }
      : {};

  // inspector pannel
  useKeyPress(['ArrowLeft', 'ArrowRight'], (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const tabs = ['stats', 'moveset', 'items'];
      const currentIndex = tabs.indexOf(activeTab);
      const nextIndex =
        e.key === 'ArrowRight' ? (currentIndex - 1 + tabs.length) % tabs.length : (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex] as 'stats' | 'moveset' | 'items');
    }
  });

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-5 pt-4 pb-1">
        <h3 className="text-slate-400 text-xs font-bold tracking-wider uppercase">{t('party.inspector')}</h3>
      </div>

      <InspectorHeader pokemon={pokemon} isPokedexMode={isPokedexMode} />

      <div className="flex-1 outline-none flex flex-col min-h-0">
        <div className="flex px-4 border-b border-slate-800">
          <button onClick={() => setActiveTab('stats')} className={getTabClass('stats')} style={getTabStyle('stats')}>
            {t('party.baseStats')}
          </button>
          <button
            onClick={() => setActiveTab('moveset')}
            className={getTabClass('moveset')}
            style={getTabStyle('moveset')}
          >
            {t('party.moves.title')}
          </button>
          {mode.kind !== 'battle' && (
            <button onClick={() => setActiveTab('items')} className={getTabClass('items')} style={getTabStyle('items')}>
              {t('party.heldItem.bagItems')}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto game-scrollbar">
          {activeTab === 'stats' && <InspectorStatsTab pokemon={pokemon} party={party} />}
          {activeTab === 'moveset' && <MovesetTab pokemon={pokemon} onMoveReorder={onMoveReorder} />}
          {mode.kind !== 'battle' && activeTab === 'items' && (
            <HeldItemsTab pd={pd} pokemon={pokemon} onEquipItem={onEquipItem} />
          )}
        </div>
      </div>
    </div>
  );
}
