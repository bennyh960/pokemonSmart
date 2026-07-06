import { useState } from 'react';
import type { PokedexPokemon } from './types';
import { ListView } from './components/ListView';
import { DetailView } from './components/Detailview';
import { useInputLayer } from '../../engine/input';
import { useI18n } from '../../ui-react/context/i18n-context';
import { usePlayerData } from '../../ui-react/hooks/usePlayerData';
import { getPokdexPokemons, getCaughtCount } from './utils/helpers';

import type { StateMachine } from '../../engine/state-machine';
import { setPokedexMapContext } from '../../scenes/world-map';
import type { WildLocation } from './utils/locationHelper';
import type { PokedexMode } from '.';

const TOTAL_POKEMON_COUNT = 251;

const EXTRA_POKEMONS_IDS = [
  328, 329, 330, 349, 350, 359, 371, 372, 373, 374, 375, 376, 442, 443, 444, 445, 447, 448, 461, 464, 466, 467, 468,
  610, 611, 612, 633, 634, 635,
];

const TOTAL_POKEMON = Array.from({ length: TOTAL_POKEMON_COUNT }, (_, i) => i + 1).concat(EXTRA_POKEMONS_IDS);

/**
 * Top-level Pokédex scene. Owns the Pokémon roster state (caught/seen/unseen)
 * and toggles between the list screen and the detail screen.
 */
export function PokedexScene({
  onClose,
  stateMachine,
  mode,
}: {
  mode: PokedexMode;
  onClose: () => void;
  stateMachine: StateMachine;
}) {
  const { locale, setLocale } = useI18n();
  const [pd] = usePlayerData();

  const SEEN_COUNT = Object.keys(pd.pokedex).length;
  const CAUGHT_COUNT = getCaughtCount(pd);

  const [pokemonMap] = useState<Map<number, PokedexPokemon>>(getPokdexPokemons(pd, EXTRA_POKEMONS_IDS));
  const [selectedPokemon, setSelectedPokemon] = useState<PokedexPokemon | null>(
    mode.kind === 'battle' || mode.kind === 'party' ? (pokemonMap.get(mode.pokemonId) ?? null) : null,
  );
  const [search, setSearch] = useState('');

  const pokemons = Array.from(pokemonMap.values()).sort((a, b) => a.id - b.id);

  function handleSelect(id: number) {
    const target = pokemonMap.get(id);
    if (!target) return;
    setSelectedPokemon(target);
  }

  useInputLayer({
    id: 'pokedex-screen',
    name: 'Pokedex Screen Global',
    blocksLowerLayers: false,
    keyBindings: [
      { code: 'Escape', action: 'close' },
      { code: 'KeyL', action: 'toggle-locale' },
    ],
    onAction: (action) => {
      if (action === 'close') {
        onClose();
      } else if (action === 'toggle-locale') {
        setLocale(locale === 'en' ? 'he' : 'en');
      }
    },
  });

  if (selectedPokemon) {
    const handleOnViewOnMap = (wildLocations: WildLocation[]) => {
      setPokedexMapContext(selectedPokemon.id, () => {}, wildLocations ?? []);
      onClose();
      stateMachine.push('WORLD_MAP');
    };
    return (
      <DetailView
        defaultTab={mode.kind === 'battle' ? mode.tab : 'info'}
        pokemon={selectedPokemon}
        onBack={() => setSelectedPokemon(null)}
        onViewOnMap={handleOnViewOnMap}
      />
    );
  }

  return (
    <ListView
      totalCount={TOTAL_POKEMON.length}
      seenCount={SEEN_COUNT}
      caughtCount={CAUGHT_COUNT}
      pokemons={pokemons}
      search={search}
      onSearchChange={setSearch}
      onSelect={handleSelect}
    />
  );
}
