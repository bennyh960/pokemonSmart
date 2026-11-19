import { useState } from 'react';
import type { ItemDef } from '../../../data/items.js';
import { pocketOf } from '../../../data/bag-pockets.js';

/** Item sprite from PokeAPI, pixel-crisp; a colored dot of its pocket if it fails to load. */
export function ItemSprite({ def, size }: { def: ItemDef; size: number }) {
  const [broken, setBroken] = useState(false);
  if (broken || !def.sprite) {
    return (
      <span
        className="block rounded-full shadow-[inset_0_-4px_0_rgba(0,0,0,.25)]"
        style={{ width: size * 0.6, height: size * 0.6, background: pocketOf(def.category)?.color ?? '#8fb19c' }}
      />
    );
  }
  return (
    <img
      src={def.sprite}
      alt=""
      draggable={false}
      onError={() => setBroken(true)}
      className="pointer-events-none select-none [image-rendering:pixelated]"
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
