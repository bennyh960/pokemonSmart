import type { PokedexPokemon } from '../types';
import { PokeballBadge } from './PokeballBadge';
import { TypeBadge } from '../../../ui-react/componenets/Typebadge';
import useGetPokemonSprite from '../../../ui-react/hooks/useGetPokemonSprite';
import { useI18n } from '../../../ui-react/context/i18n-context';

interface PokemonCardProps {
  pokemon: PokedexPokemon;
  onSelect: (id: number) => void;
}

export function PokemonCard({ pokemon, onSelect }: PokemonCardProps) {
  const { locale } = useI18n();
  const dexId = `#${String(pokemon.id).padStart(3, '0')}`;
  const isUnseen = pokemon.status === 'unseen';
  const isSeen = pokemon.status === 'seen';
  const isCaught = pokemon.status === 'caught';
  const isRelease = pokemon.status === 'release';

  const hasData = isSeen || isCaught || isRelease;
  // Silhouette applies to both "seen only" and "unseen" (who's-that-pokemon style).
  const { sprite } = useGetPokemonSprite(pokemon.id, 'front', isUnseen);

  const renderImage = () => {
    if (!sprite || isUnseen) {
      return (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-zinc-700 font-mono text-xl text-zinc-600">
          ?
        </div>
      );
    }

    return (
      <img
        src={sprite}
        alt={pokemon.name[locale]}
        className={`h-16 w-16 [image-rendering:pixelated] drop-shadow-[0_6px_8px_rgba(0,0,0,0.6)]`}
      />
    );
  };

  return (
    <div
      onClick={() => onSelect(pokemon.id)}
      className={`group relative flex w-full items-center gap-4 rounded-xl border px-5 py-4 backdrop-blur-sm transition
        ${
          isUnseen
            ? 'cursor-default border-zinc-800 bg-zinc-950/60'
            : 'cursor-pointer border-red-900/40 bg-zinc-950/70 hover:border-red-500/60 hover:bg-zinc-900/80'
        }`}
    >
      {/* Sprite */}
      <div className="flex h-16 w-16 shrink-0 items-center justify-center">{renderImage()}</div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[11px] tracking-wide text-zinc-500">{dexId}</div>
        <div className={`truncate font-semibold ${isUnseen ? 'text-zinc-500' : 'text-zinc-100'}`}>
          {hasData ? pokemon.name[locale] : '???'}
        </div>
        {hasData && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pokemon.types.map((t) => (
              <TypeBadge key={t} type={t} />
            ))}
          </div>
        )}
      </div>

      {/* Status / action */}
      <div className="shrink-0">
        {(isCaught || isRelease) && <PokeballBadge disabled={isRelease} title={isCaught ? 'Caught' : 'Released'} />}
      </div>
    </div>
  );
}
