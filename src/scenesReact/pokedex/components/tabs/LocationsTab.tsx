import React from 'react';
import type { PokemonEntry } from '../../types';

interface LocationsTabProps {
  pokemon: PokemonEntry;
}

export function LocationsTab({ pokemon }: LocationsTabProps) {
  return (
    <div className="rounded-2xl border border-red-900/40 bg-zinc-950/60 p-5">
      <div className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-500">Known Locations</div>
      <div className="space-y-4">
        {pokemon.locations.map((loc) => (
          <div
            key={loc.name}
            className="flex items-start gap-3 border-b border-zinc-900 pb-4 last:border-none last:pb-0"
          >
            <span className="text-amber-400">📍</span>
            <div>
              <div className="text-sm font-semibold text-zinc-100">{loc.name}</div>
              <div className="mt-0.5 text-xs text-zinc-500">{loc.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
