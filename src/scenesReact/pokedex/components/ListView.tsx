import React, { useMemo } from 'react';
import type { PokedexPokemon } from '../types';
import { PokemonCard } from './PokemonCard';
import { SearchHeader } from './SearchHeader';
import { useI18n } from '../../../ui-react/context/i18n-context';
import type { PokemonData } from '../../../services/pokemon-data';

interface ListViewProps {
  pokemons: PokedexPokemon[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (id: number) => void;
  seenCount: number;
  caughtCount: number;
  totalCount: number;
}

export function ListView({
  pokemons,
  search,
  onSearchChange,
  onSelect,
  seenCount,
  caughtCount,
  totalCount,
}: ListViewProps) {
  const { t, locale } = useI18n();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pokemons;
    return pokemons.filter((p) => {
      if (!p.stats || p.status === 'unseen') return '???'.includes(q) || String(p.id).includes(q);
      return p.name[locale].toLowerCase().includes(q) || String(p.id).includes(q);
    });
  }, [pokemons, search]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_#5b0d0d_0%,_#1a0505_45%,_#000000_85%)]">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-10 sm:py-12 min-h-0">
        <div className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-red-400/80">
          <span className="text-red-500">◈</span>
          {t('pokedex.title')}
        </div>

        <SearchHeader
          value={search}
          onChange={onSearchChange}
          caughtCount={caughtCount}
          seenCount={seenCount}
          totalCount={totalCount}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 game-scrollbar">
          {filtered.map((p) => (
            <PokemonCard key={p.id} pokemon={p} onSelect={onSelect} />
          ))}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-red-900/50 bg-black/40 px-5 py-8 text-center font-mono text-sm text-zinc-500">
              {t('pokedex.search.noResults')} "{search}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
