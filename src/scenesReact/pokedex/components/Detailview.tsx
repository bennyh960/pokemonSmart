import React, { useState } from 'react';
import type { PokemonEntry, TabKey } from '../types';
import { DetailHeader } from './DetailHeader';
import { InfoTab } from './tabs/InfoTab';
import { EvolutionTab } from './tabs/EvolutionTab';
import { BattleTab } from './tabs/BattleTab';
import { MovesTab } from './tabs/MovesTab';
import { LocationsTab } from './tabs/LocationsTab';
import { TabBar } from './Tabbar';

interface DetailViewProps {
  pokemon: PokemonEntry;
  onBack: () => void;
  onToggleCaught: (key: string) => void;
}

export function DetailView({ pokemon, onBack, onToggleCaught }: DetailViewProps) {
  const [tab, setTab] = useState<TabKey>('info');

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_#5b0d0d_0%,_#1a0505_45%,_#000000_85%)]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-10 sm:py-12">
        <DetailHeader pokemon={pokemon} onBack={onBack} onToggleCaught={() => onToggleCaught(pokemon.key)} />

        <div className="mt-6">
          <TabBar active={tab} onChange={setTab} />
          {tab === 'info' && <InfoTab pokemon={pokemon} />}
          {tab === 'evolution' && <EvolutionTab pokemon={pokemon} />}
          {tab === 'battle' && <BattleTab pokemon={pokemon} />}
          {tab === 'moves' && <MovesTab pokemon={pokemon} />}
          {tab === 'locations' && <LocationsTab pokemon={pokemon} />}
        </div>
      </div>
    </div>
  );
}
