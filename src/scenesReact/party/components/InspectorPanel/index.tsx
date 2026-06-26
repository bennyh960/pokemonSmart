import { useState } from 'react';
import { InspectorHeader } from './Header.js';
import { InspectorFooter } from './Footer.js';
import { InspectorStatsTab } from '../tabs/StatsTab.js';
import type { Move, PlayerData, Pokemon } from '../../../../types/index.js';
import HeldItemsTab from '../tabs/HeldItemsTab.js';
import { t } from '../../../../i18n/i18n.js';
import { MovesetTab } from '../tabs/MovesetTab.js';

interface Props {
  pokemon: Pokemon;
  party: Pokemon[];
  pd: PlayerData;
  onMoveReorder?: (moves: Move[]) => void;
  onEquipItem: (uuid: string, itemId: string) => void;
  isPokedexMode?: boolean;
}

export function InspectorPanel({ pokemon, party, pd, onMoveReorder, onEquipItem, isPokedexMode = false }: Props) {
  const [activeTab, setActiveTab] = useState<'stats' | 'moveset' | 'items'>('stats');

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-5 pt-4 pb-1">
        <h3 className="text-slate-400 text-xs font-bold tracking-wider uppercase">Live Inspector</h3>
      </div>

      <InspectorHeader pokemon={pokemon} isPokedexMode={isPokedexMode} />

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex px-4 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'stats'
                ? 'text-purple-400 border-purple-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            Stats
          </button>
          <button
            onClick={() => setActiveTab('moveset')}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'moveset'
                ? 'text-purple-400 border-purple-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            Moveset
          </button>
          <button
            onClick={() => setActiveTab('items')}
            className={`flex-1 pb-3 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === 'items'
                ? 'text-purple-400 border-purple-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t('party.heldItem.bagItems')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto game-scrollbar">
          {activeTab === 'stats' && <InspectorStatsTab pokemon={pokemon} party={party} />}
          {activeTab === 'moveset' && <MovesetTab pokemon={pokemon} onMoveReorder={onMoveReorder} />}
          {activeTab === 'items' && <HeldItemsTab pd={pd} pokemon={pokemon} onEquipItem={onEquipItem} />}
        </div>
      </div>

      <InspectorFooter />
    </div>
  );
}
