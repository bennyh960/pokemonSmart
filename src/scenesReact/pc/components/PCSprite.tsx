import useGetPokemonSprite from '../../../ui-react/hooks/useGetPokemonSprite';

/** Front battle sprite, pixel-crisp, scaled to fill its box. */
export function PCSprite({ id, className = '' }: { id: number; className?: string }) {
  const { sprite } = useGetPokemonSprite(id);
  if (!sprite) return <span className={className} />;
  return (
    <img
      src={sprite}
      alt=""
      draggable={false}
      className={`pointer-events-none select-none [image-rendering:pixelated] ${className}`}
    />
  );
}
