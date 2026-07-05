import React, { useMemo } from 'react';
import type { PokemonEntry } from '../types';
import { PokemonCard } from './PokemonCard';
import { SearchHeader } from './SearchHeader';

interface ListViewProps {
  pokemons: PokemonEntry[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (key: string) => void;
  onToggleCaught: (key: string) => void;
}

export function ListView({ pokemons, search, onSearchChange, onSelect, onToggleCaught }: ListViewProps) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pokemons;
    return pokemons.filter((p) => {
      if (p.status === 'unseen') return '???'.includes(q) || String(p.id).includes(q);
      return p.name.toLowerCase().includes(q) || String(p.id).includes(q);
    });
  }, [pokemons, search]);

  const caughtCount = pokemons.filter((p) => p.status === 'caught').length;
  const seenCount = pokemons.filter((p) => p.status !== 'unseen').length;

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_#5b0d0d_0%,_#1a0505_45%,_#000000_85%)]">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-10 sm:py-12">
        <div className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-red-400/80">
          <span className="text-red-500">◈</span> Pokédex — Field Unit
        </div>

        <SearchHeader
          value={search}
          onChange={onSearchChange}
          caughtCount={caughtCount}
          seenCount={seenCount}
          totalCount={pokemons.length}
        />

        <div className="flex flex-col gap-3">
          {filtered.map((p) => (
            <PokemonCard key={p.key} pokemon={p} onSelect={onSelect} onToggleCaught={onToggleCaught} />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-red-900/50 bg-black/40 px-5 py-8 text-center font-mono text-sm text-zinc-500">
              No signal — no Pokémon match “{search}”.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
