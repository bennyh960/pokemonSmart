const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Small in-list sprite (pixel-art front sprite). */
export function spriteUrl(dexId: number): string {
  return `${SPRITE_BASE}/${dexId}.png`;
}

/** Large official artwork used in the detail header. */
export function artUrl(dexId: number): string {
  return `${SPRITE_BASE}/other/official-artwork/${dexId}.png`;
}
