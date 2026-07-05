import React from 'react';
import type { PokemonEntry } from '../../types';

interface EvolutionTabProps {
  pokemon: PokemonEntry;
}

/**
 * Intentionally left empty for now — evolution chain data already exists on
 * `pokemon.evolution` (see types.ts / pokemonData.ts) and is ready to render
 * once this tab's design is picked back up.
 */
export function EvolutionTab({ pokemon }: EvolutionTabProps) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-red-900/40 bg-zinc-950/40">
      <span className="font-mono text-xs uppercase tracking-widest text-zinc-600">Evolution — coming soon</span>
    </div>
  );
}
