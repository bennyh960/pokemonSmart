import React, { useState } from 'react';
import type { PokemonEntry } from './types';
import { POKEMON_DATA, POKEMON_ORDER } from './data/pokemonData';
import { ListView } from './components/ListView';
import { DetailView } from './components/Detailview';

/**
 * Top-level Pokédex scene. Owns the Pokémon roster state (caught/seen/unseen)
 * and toggles between the list screen and the detail screen.
 */
export function PokedexScene() {
  const [pokemonMap, setPokemonMap] = useState<Record<string, PokemonEntry>>(POKEMON_DATA);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const pokemons = POKEMON_ORDER.map((key) => pokemonMap[key]);

  function handleSelect(key: string) {
    const target = pokemonMap[key];
    if (target.status === 'unseen') {
      // Simulate a field encounter: reveals the entry without catching it.
      setPokemonMap((prev) => ({ ...prev, [key]: { ...prev[key], status: 'seen' } }));
      return;
    }
    setSelectedKey(key);
  }

  function handleToggleCaught(key: string) {
    setPokemonMap((prev) => {
      const current = prev[key];
      const nextStatus = current.status === 'caught' ? 'seen' : 'caught';
      return { ...prev, [key]: { ...current, status: nextStatus } };
    });
  }

  if (selectedKey) {
    const selected = pokemonMap[selectedKey];
    return <DetailView pokemon={selected} onBack={() => setSelectedKey(null)} onToggleCaught={handleToggleCaught} />;
  }

  return (
    <ListView
      pokemons={pokemons}
      search={search}
      onSearchChange={setSearch}
      onSelect={handleSelect}
      onToggleCaught={handleToggleCaught}
    />
  );
}
