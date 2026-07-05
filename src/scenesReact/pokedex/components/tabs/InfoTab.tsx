import React from 'react';
import type { PokemonEntry } from '../../types';

const STAT_LABELS: Record<keyof PokemonEntry['stats'], string> = {
  hp: 'HP',
  atk: 'ATK',
  def: 'DEF',
  spa: 'SP.A',
  spd: 'SP.D',
  spe: 'SPE',
};

const MAX_STAT = 150;

interface InfoTabProps {
  pokemon: PokemonEntry;
}

export function InfoTab({ pokemon }: InfoTabProps) {
  const statEntries = Object.entries(pokemon.stats) as [keyof PokemonEntry['stats'], number][];
  const total = statEntries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-red-900/40 bg-zinc-950/60 p-5">
        <div className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-500">Base Stats</div>
        {statEntries.map(([key, value]) => (
          <div key={key} className="mb-2.5 grid grid-cols-[54px_1fr_36px] items-center gap-3">
            <span className="font-mono text-[11px] text-zinc-500">{STAT_LABELS[key]}</span>
            <div className="h-2 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-400"
                style={{ width: `${Math.min(100, (value / MAX_STAT) * 100)}%` }}
              />
            </div>
            <span className="text-right font-mono text-xs text-zinc-300">{value}</span>
          </div>
        ))}
        <div className="mt-3 flex justify-between border-t border-dashed border-zinc-800 pt-3 font-mono text-xs text-amber-400">
          <span>TOTAL</span>
          <span>{total}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-red-900/40 bg-zinc-950/60 p-5">
        <div className="mb-4 font-mono text-xs uppercase tracking-widest text-zinc-500">Abilities</div>
        {pokemon.abilities.map((a) => (
          <div key={a.name} className="mb-3.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              {a.name}
              {a.hidden && (
                <span className="rounded-full border border-amber-400/40 px-2 py-0.5 font-mono text-[9px] text-amber-400">
                  HIDDEN
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">{a.description}</p>
          </div>
        ))}

        <div className="mt-5 border-t border-dashed border-zinc-800 pt-4 font-mono text-xs uppercase tracking-widest text-zinc-500">
          Classification
        </div>
        <div className="mt-2 space-y-2 text-sm">
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Category</span>
            <span>{pokemon.category}</span>
          </div>
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-500">Height</span>
            <span>{pokemon.height}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Weight</span>
            <span>{pokemon.weight}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
