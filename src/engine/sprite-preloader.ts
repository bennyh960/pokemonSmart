import { loadCharacterSprites } from './character-sprites.js';

let preloadPromise: Promise<void> | null = null;

/** Preload overworld assets. Now delegates to the character-sprites system. */
export function preloadOverworldAssets(): Promise<void> {
  if (preloadPromise) return preloadPromise;
  preloadPromise = loadCharacterSprites();
  return preloadPromise;
}

// Stubs — the old tileset-grid / player-frame / NPC-sprite files no longer exist.
// All characters are served from characters_overworld.png via character-sprites.ts.
export function getAtlasImage(): HTMLImageElement | null { return null; }
export function getAtlasCatalog(): null { return null; }
export function getPreloadedPlayerSheet(): HTMLImageElement | null { return null; }
export function getPreloadedNPCSprite(_spriteType: string): HTMLImageElement | null { return null; }
export function getPreloadedTile(_tileType: number): HTMLImageElement | null { return null; }
