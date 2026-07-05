import React from 'react';
import type { PokemonEntry } from '../types';
import { artUrl } from '../utils/sprites';
import { ScanRing } from './Scanring';
import { TypeBadge } from '../../../ui-react/componenets/Typebadge';

interface DetailHeaderProps {
  pokemon: PokemonEntry;
  onBack: () => void;
  onToggleCaught: () => void;
}

export function DetailHeader({ pokemon, onBack, onToggleCaught }: DetailHeaderProps) {
  const isCaught = pokemon.status === 'caught';

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 rounded-lg border border-red-800/50 bg-black/50 px-4 py-2 font-mono text-xs uppercase tracking-wide text-red-400 hover:border-red-500 hover:bg-black/70"
      >
        ← Back to list
      </button>

      <div className="flex flex-col items-center gap-6 rounded-2xl border border-red-900/40 bg-gradient-to-br from-zinc-900 to-black px-6 py-8 sm:flex-row sm:items-center">
        <ScanRing spriteSrc={artUrl(pokemon.id)} alt={pokemon.name} />

        <div className="flex-1 text-center sm:text-left">
          <div className="font-mono text-xs tracking-[0.3em] text-red-400">#{String(pokemon.id).padStart(3, '0')}</div>
          <h1 className="mt-1 text-3xl font-bold text-zinc-50">{pokemon.name}</h1>
          <div className="mt-1 text-sm text-zinc-500">
            {pokemon.category} · HT {pokemon.height} · WT {pokemon.weight}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {pokemon.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleCaught}
            className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition
              ${
                isCaught
                  ? 'border-emerald-500/50 text-emerald-400'
                  : 'border-zinc-600 text-zinc-400 hover:border-red-500/50 hover:text-red-400'
              }`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: isCaught ? '#34d399' : '#71717a',
                boxShadow: `0 0 6px ${isCaught ? '#34d399' : 'transparent'}`,
              }}
            />
            {isCaught ? 'Caught' : 'Seen — not caught'}
          </button>
        </div>
      </div>
    </div>
  );
}
