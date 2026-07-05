import React, { useEffect, useMemo, useState } from 'react';
import type { PokedexPokemon, TabKey } from '../types';
import { DetailHeader } from './DetailHeader';
import { InfoTab } from './tabs/InfoTab';
import { EvolutionTab } from './tabs/EvolutionTab';
import { MovesTab } from './tabs/MovesTab';
import { LocationsTab } from './tabs/LocationsTab';
import { TabBar } from './Tabbar';
import {
  getLearnset,
  getMove,
  getPokemonAbilityDetails,
  getRegularNextEvolution,
  getTmLearnset,
  type MoveData,
} from '../../../services/pokemon-data';
import { getWildLocations, type WildLocation } from '../utils/locationHelper';
import { useI18n } from '../../../ui-react/context/i18n-context';
import { BattleTab } from './tabs/BattleTab';
import { getInput, useInputLayer } from '../../../engine/input';

interface DetailViewProps {
  defaultTab?: TabKey;
  pokemon: PokedexPokemon;
  onBack: () => void;
  onViewOnMap: (wildLocations: WildLocation[]) => void;
}

export function DetailView({ defaultTab, pokemon, onBack, onViewOnMap }: DetailViewProps) {
  const { locale } = useI18n();
  const [tab, setTab] = useState<TabKey>(defaultTab ?? 'info');

  const abilities = getPokemonAbilityDetails(pokemon.id);
  // const evolutions = getRegularNextEvolution(pokemon.id);
  const locations = getWildLocations(pokemon.id, locale);

  const movesData = useMemo(() => {
    const tmLearnset = getTmLearnset(pokemon.id);
    const learnset = getLearnset(pokemon.id);

    const learnsetMoves = learnset
      .map((m) => {
        const move = getMove(m.moveId);
        return {
          move: move,
          level: m.levelLearned,
        };
      })
      .filter((m): m is { move: MoveData; level: number } => m.move !== undefined);

    const tmLearnsetMoves = tmLearnset
      .map((m) => {
        const move = getMove(m.moveId);
        return {
          move: move,
        };
      })
      .filter((m): m is { move: MoveData } => m.move !== undefined);

    return { learnsetMoves, tmLearnsetMoves };
  }, [pokemon.id]);

  useInputLayer({
    id: 'pokedex-detail',
    name: 'Pokdex Detail',
    blocksLowerLayers: true,
    keyBindings: [
      { code: 'Escape', action: 'back' },
      { code: 'ArrowLeft', action: 'prevTab' },
      { code: 'ArrowRight', action: 'nextTab' },
    ],
    onAction: (action) => {
      if (action === 'back') {
        console.log('back');
        onBack();
      } else if (action === 'nextTab') {
        setTab((prev) => {
          if (prev === 'info') return 'locations';
          if (prev === 'evolution') return 'info';
          if (prev === 'battle') return 'evolution';
          if (prev === 'moves') return 'battle';
          if (prev === 'locations') return 'moves';
          return prev;
        });
      } else if (action === 'prevTab') {
        setTab((prev) => {
          if (prev === 'info') return 'evolution';
          if (prev === 'evolution') return 'battle';
          if (prev === 'battle') return 'moves';
          if (prev === 'moves') return 'locations';
          if (prev === 'locations') return 'info';
          return prev;
        });
      }
    },
  });

  useEffect(() => {
    const input = getInput();
    input.applyVirtualLayout({
      utility: [{ id: 'v-esc', label: 'ESC', key: 'Escape', className: 'vEsc' }],
      dpad: [
        { id: 'v-left', label: '◀', key: 'ArrowLeft', className: 'vLeft' },
        { id: 'v-right', label: '▶', key: 'ArrowRight', className: 'vRight' },
      ],
    });
  }, []);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_#5b0d0d_0%,_#1a0505_45%,_#000000_85%)]">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-10 sm:py-12">
        <DetailHeader pokemon={pokemon} onBack={onBack} />

        <div className="mt-6">
          <TabBar active={tab} onChange={setTab} />
        </div>
        <div className="min-h-0 flex-1 game-scrollbar overflow-y-auto pb-6 pr-1">
          {tab === 'info' && <InfoTab pokemon={pokemon} abilities={abilities} />}
          {tab === 'evolution' && <EvolutionTab pokemon={pokemon} />}
          {tab === 'battle' && <BattleTab pokemon={pokemon} />}
          {tab === 'moves' && <MovesTab learnset={movesData.learnsetMoves} tmLearnset={movesData.tmLearnsetMoves} />}
          {tab === 'locations' && <LocationsTab locations={locations} onViewOnMap={onViewOnMap} />}
        </div>
      </div>
    </div>
  );
}
