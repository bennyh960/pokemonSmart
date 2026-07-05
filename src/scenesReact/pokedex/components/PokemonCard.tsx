import React from 'react';
import type { PokemonEntry } from '../types';
import { PokeballBadge } from './PokeballBadge';
import { spriteUrl } from '../utils/sprites';
import { TypeBadge } from '../../../ui-react/componenets/Typebadge';

interface PokemonCardProps {
  pokemon: PokemonEntry;
  onSelect: (key: string) => void;
  onToggleCaught: (key: string) => void;
}

export function PokemonCard({ pokemon, onSelect, onToggleCaught }: PokemonCardProps) {
  const dexId = `#${String(pokemon.id).padStart(3, '0')}`;
  const isUnseen = pokemon.status === 'unseen';
  const isSeenOnly = pokemon.status === 'seen';
  const isCaught = pokemon.status === 'caught';

  return (
    <div
      onClick={() => onSelect(pokemon.key)}
      className={`group relative flex w-full items-center gap-4 rounded-xl border px-5 py-4 backdrop-blur-sm transition
        ${
          isUnseen
            ? 'cursor-default border-zinc-800 bg-zinc-950/60'
            : 'cursor-pointer border-red-900/40 bg-zinc-950/70 hover:border-red-500/60 hover:bg-zinc-900/80'
        }`}
    >
      {/* Sprite */}
      <div className="flex h-16 w-16 shrink-0 items-center justify-center">
        {isUnseen ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-zinc-700 font-mono text-xl text-zinc-600">
            ?
          </div>
        ) : (
          <img
            src={spriteUrl(pokemon.id)}
            alt={pokemon.name}
            className={`h-16 w-16 [image-rendering:pixelated] drop-shadow-[0_6px_8px_rgba(0,0,0,0.6)] ${
              isSeenOnly ? 'brightness-0 opacity-80' : ''
            }`}
          />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[11px] tracking-wide text-zinc-500">{dexId}</div>
        <div className={`truncate font-semibold ${isUnseen ? 'text-zinc-500' : 'text-zinc-100'}`}>
          {isUnseen ? '???' : pokemon.name}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {isUnseen ? <TypeBadge type="normal" dim /> : pokemon.types.map((t) => <TypeBadge key={t} type={t} />)}
        </div>
      </div>

      {/* Status / action */}
      <div className="shrink-0">
        {isCaught && (
          <PokeballBadge
            title="Release to seen-only"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCaught(pokemon.key);
            }}
          />
        )}
        {isUnseen && <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-600">tap to scan</span>}
      </div>
    </div>
  );
}
