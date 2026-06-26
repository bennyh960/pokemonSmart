import { useState } from 'react';

import { InspectorHeader } from './Header.js';
import { InspectorFooter } from './Footer.js';
import { InspectorStatsTab } from '../tabs/StatsTab.js';
import type { PlayerData, Pokemon } from '../../../../types/index.js';
import HeldItemsTab from '../tabs/HeldItemsTab.js';
import { t } from '../../../../i18n/i18n.js';

interface Props {
  pokemon: Pokemon;
  party: Pokemon[];
  onMoveReorder?: (moves: any[]) => void;
  isPokedexMode?: boolean; // Use this to hide trainer details when in Pokedex
  pd: PlayerData;
  setParty: (party: Pokemon[]) => void;
}

// -----------------------------
// MAIN PANEL EXPORT
// -----------------------------
export function InspectorPanel({ pokemon, party, onMoveReorder, isPokedexMode = false, pd, setParty }: Props) {
  const [activeTab, setActiveTab] = useState<'stats' | 'moveset' | 'items'>('stats');

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title */}
      <div className="px-5 pt-4 pb-1">
        <h3 className="text-slate-400 text-xs font-bold tracking-wider uppercase">Live Inspector</h3>
      </div>

      {/* 1. Header Card */}
      <InspectorHeader pokemon={pokemon} isPokedexMode={isPokedexMode} />

      {/* 2. Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Tabs */}
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

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'stats' && <InspectorStatsTab pokemon={pokemon} party={party} />}
          {/* Add your Moveset/Items components here later */}
          {activeTab === 'moveset' && <div className="p-4 text-slate-500 text-center mt-10">Moveset content...</div>}
          {activeTab === 'items' && <HeldItemsTab pd={pd} setParty={setParty} pokemon={pokemon} />}
        </div>
      </div>

      {/* 3. Footer Actions */}
      <InspectorFooter />
    </div>
  );
}
