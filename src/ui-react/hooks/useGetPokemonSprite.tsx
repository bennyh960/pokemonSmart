//   const spriteUrl = getPokemonSpriteUrl(pokemon.id);
//   const [sprite, setSprite] = useState<string | null>(getCachedImage(spriteUrl)?.src ?? null);

import { useEffect, useState } from 'react';
import { getCachedImage, loadImage } from '../../engine/sprite-loader';
import { getPokemonSpriteUrl } from '../../utils/util';

const useGetPokemonSprite = (pokemonId: number, side: 'front' | 'back' = 'front', skipLoad: boolean = false) => {
  const spriteUrl = getPokemonSpriteUrl(pokemonId, side);
  const [sprite, setSprite] = useState<string | null>(getCachedImage(spriteUrl)?.src ?? null);

  useEffect(() => {
    let dead = false;
    if (!skipLoad) {
      loadImage(spriteUrl)
        .then((img) => {
          if (!dead) setSprite(img.src);
        })
        .catch(() => {});
    }
    return () => {
      dead = true;
    };
  }, [pokemonId, spriteUrl, skipLoad]);

  return { sprite, spriteUrl };
};

export default useGetPokemonSprite;
