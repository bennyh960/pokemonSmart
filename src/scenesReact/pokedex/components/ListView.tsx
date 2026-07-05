import { useEffect, useMemo, useRef, useState } from 'react';
import type { PokedexPokemon } from '../types';
import { PokemonCard } from './PokemonCard';
import { SearchHeader } from './SearchHeader';
import { useI18n } from '../../../ui-react/context/i18n-context';
import { getInput, useInputLayer } from '../../../engine/input';

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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pokemons;
    return pokemons.filter((p) => {
      if (!p.stats || p.status === 'unseen') return '???'.includes(q) || String(p.id).includes(q);
      return p.name[locale].toLowerCase().includes(q) || String(p.id).includes(q);
    });
  }, [pokemons, search]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [search]);

  useInputLayer({
    id: 'pokedex-list',
    name: 'Pokdex List',
    blocksLowerLayers: false,
    keyBindings: [
      { code: 'ArrowDown', action: 'down' },
      { code: 'ArrowUp', action: 'up' },
      { code: 'Enter', action: 'select' },
      { code: 'Space', action: 'select' },
    ],
    onAction: (action) => {
      const el = scrollRef.current;
      if (!el) return;
      const amount = 80; // px per press, tune to card height
      if (action === 'down') {
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        el.scrollBy({ top: amount, behavior: 'smooth' });
      } else if (action === 'up') {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        el.scrollBy({ top: -amount, behavior: 'smooth' });
      } else if (action === 'select') {
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          onSelect(filtered[activeIndex].id);
        }
      }
    },
  });

  useEffect(() => {
    const input = getInput();
    input.applyVirtualLayout({
      utility: [
        { id: 'v-enter', label: '⏎ ENTER', key: 'Enter', className: 'vEnter' },
        { id: 'v-esc', label: 'ESC', key: 'Escape', className: 'vEsc' },
      ],
      dpad: [
        { id: 'v-up', label: '▲', key: 'ArrowUp', className: 'vUp' },
        { id: 'v-down', label: '▼', key: 'ArrowDown', className: 'vDown' },
      ],
    });
  }, []);

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

        <div
          tabIndex={0}
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 game-scrollbar outline-none focus:ring-1 focus:ring-red-500/30"
        >
          {filtered.map((p, idx) => (
            <PokemonCard key={p.id} pokemon={p} onSelect={onSelect} isSoftSelected={activeIndex === idx} />
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
