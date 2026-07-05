import React, { useMemo } from 'react';
import type { PokemonEntry, PokeType } from '../../types';
import { computeMatchups, TYPE_COLORS } from '../../data/typeChart';

interface BattleTabProps {
  pokemon: PokemonEntry;
}

function multiplierLabel(mult: number): string {
  if (mult === 0) return '0×';
  if (mult === 0.25) return '¼×';
  if (mult === 0.5) return '½×';
  if (mult === 4) return '4×';
  return '2×';
}

function MatchupSection({
  title,
  accent,
  types,
  matchups,
}: {
  title: string;
  accent: string;
  types: PokeType[];
  matchups: Record<PokeType, number>;
}) {
  return (
    <div>
      <h4 className="mb-2.5 font-mono text-xs uppercase tracking-widest" style={{ color: accent }}>
        {title}
      </h4>
      {types.length === 0 ? (
        <span className="font-mono text-xs text-zinc-600">None</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <span
              key={t}
              className="rounded-full px-2.5 py-1 font-mono text-[11px] font-bold text-black/80"
              style={{ backgroundColor: TYPE_COLORS[t] }}
            >
              {t} <span className="opacity-70">{multiplierLabel(matchups[t])}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function BattleTab({ pokemon }: BattleTabProps) {
  const matchups = useMemo(() => computeMatchups(pokemon.types), [pokemon.types]);

  const buckets = useMemo(() => {
    const weak4: PokeType[] = [];
    const weak2: PokeType[] = [];
    const resist2: PokeType[] = [];
    const resist4: PokeType[] = [];
    const immune: PokeType[] = [];
    (Object.entries(matchups) as [PokeType, number][]).forEach(([type, mult]) => {
      if (mult === 0) immune.push(type);
      else if (mult === 4) weak4.push(type);
      else if (mult === 2) weak2.push(type);
      else if (mult === 0.5) resist2.push(type);
      else if (mult === 0.25) resist4.push(type);
    });
    return { weak4, weak2, resist2, resist4, immune };
  }, [matchups]);

  return (
    <div className="rounded-2xl border border-red-900/40 bg-zinc-950/60 p-5">
      <div className="mb-5 font-mono text-xs uppercase tracking-widest text-zinc-500">
        Defensive matchups — vs {pokemon.types.join(' / ')}
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <MatchupSection title="4× Weak to" accent="#f87171" types={buckets.weak4} matchups={matchups} />
        <MatchupSection title="2× Weak to" accent="#f87171" types={buckets.weak2} matchups={matchups} />
        <MatchupSection title="½× Resists" accent="#34d399" types={buckets.resist2} matchups={matchups} />
        <MatchupSection title="¼× Resists" accent="#34d399" types={buckets.resist4} matchups={matchups} />
        <MatchupSection title="Immune to" accent="#38bdf8" types={buckets.immune} matchups={matchups} />
      </div>
    </div>
  );
}
