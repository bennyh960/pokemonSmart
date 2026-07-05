import React, { useState } from 'react';
import type { PokemonEntry } from '../../types';
import { TYPE_COLORS } from '../../data/typeChart';

interface MovesTabProps {
  pokemon: PokemonEntry;
}

type MoveSub = 'level' | 'tm';

export function MovesTab({ pokemon }: MovesTabProps) {
  const [sub, setSub] = useState<MoveSub>('level');

  return (
    <div className="rounded-2xl border border-red-900/40 bg-zinc-950/60 p-5">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setSub('level')}
          className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wide transition ${
            sub === 'level'
              ? 'border-red-500/60 bg-red-950/40 text-red-300'
              : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          By Level
        </button>
        <button
          type="button"
          onClick={() => setSub('tm')}
          className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-wide transition ${
            sub === 'tm'
              ? 'border-red-500/60 bg-red-950/40 text-red-300'
              : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          By TM
        </button>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left font-mono text-[10px] uppercase tracking-wide text-zinc-500">
            <th className="pb-2 pr-2">{sub === 'level' ? 'Learned' : 'Source'}</th>
            <th className="pb-2 pr-2">Move</th>
            <th className="pb-2">Type</th>
          </tr>
        </thead>
        <tbody>
          {sub === 'level'
            ? pokemon.moves.level.map((m) => (
                <tr key={m.name} className="border-b border-zinc-900 last:border-none">
                  <td className="py-2.5 pr-2 font-mono text-xs text-zinc-500">Lv. {m.level}</td>
                  <td className="py-2.5 pr-2">
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[m.type], boxShadow: `0 0 6px ${TYPE_COLORS[m.type]}` }}
                    />
                    {m.name}
                  </td>
                  <td className="py-2.5">
                    <span
                      className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-black/80"
                      style={{ backgroundColor: TYPE_COLORS[m.type] }}
                    >
                      {m.type}
                    </span>
                  </td>
                </tr>
              ))
            : pokemon.moves.tm.map((m) => (
                <tr key={m.name} className="border-b border-zinc-900 last:border-none">
                  <td className="py-2.5 pr-2 font-mono text-xs text-zinc-500">TM</td>
                  <td className="py-2.5 pr-2">
                    <span
                      className="mr-2 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[m.type], boxShadow: `0 0 6px ${TYPE_COLORS[m.type]}` }}
                    />
                    {m.name}
                  </td>
                  <td className="py-2.5">
                    <span
                      className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-black/80"
                      style={{ backgroundColor: TYPE_COLORS[m.type] }}
                    >
                      {m.type}
                    </span>
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
