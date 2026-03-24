/**
 * Character Sprites — loads the character spritesheet manifest (characters.json)
 * and provides frame lookups for the overworld renderer.
 *
 * Usage:
 *   await loadCharacterSprites();
 *   const frame = getCharacterFrame('dani', 'down', 'stand');
 *   // frame = { image, sx, sy, w, h } or null
 */

import charactersManifest from '../data/sprites/characters.json';

// ── Types ──

export interface SpriteFrame {
  image: HTMLImageElement;
  sx: number;
  sy: number;
  w: number;
  h: number;
}

interface CharacterDef {
  name: string;
  frameWidth: number;
  frameHeight: number;
  frames: ({ sx: number; sy: number } | null)[];
}

// ── State ──

const manifest = charactersManifest as {
  image: string;
  dict: Record<string, number>;
  [category: string]: unknown;
};

/** All characters flattened: id → CharacterDef */
const characters = new Map<string, CharacterDef>();

/** The loaded spritesheet image. */
let sheetImage: HTMLImageElement | null = null;
let loaded = false;

// ── Init ──

/** Load the spritesheet image and index all characters. */
export async function loadCharacterSprites(): Promise<void> {
  if (loaded) return;

  // Index characters from all categories
  const reserved = new Set(['image', 'dict']);
  for (const [key, value] of Object.entries(manifest)) {
    if (reserved.has(key)) continue;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const group = value as Record<string, CharacterDef>;
    for (const [id, charDef] of Object.entries(group)) {
      characters.set(id, charDef);
    }
  }

  // Load the spritesheet image
  sheetImage = new Image();
  sheetImage.src = manifest.image;
  await new Promise<void>((resolve) => {
    sheetImage!.onload = () => resolve();
    sheetImage!.onerror = () => {
      console.warn('Failed to load character spritesheet:', manifest.image);
      resolve();
    };
  });

  loaded = true;
}

// ── Frame lookup ──

/**
 * Get the sprite frame for a character.
 *
 * @param id        Character id (e.g. "dani", "leon")
 * @param facing    Direction: "up" | "down" | "left" | "right"
 * @param pose      Animation pose: "stand" | "walk-1" | "walk-2"
 * @returns         SpriteFrame or null if not found / null slot
 */
export function getCharacterFrame(id: string, facing: string, pose: string = 'stand'): SpriteFrame | null {
  if (!sheetImage || !loaded) return null;

  const charDef = characters.get(id);
  if (!charDef) return null;

  const label = `${facing}-${pose}`;
  const frameIdx = manifest.dict[label];
  if (frameIdx === undefined || frameIdx < 0) return null;
  if (frameIdx >= charDef.frames.length) return null;

  const frame = charDef.frames[frameIdx];
  if (!frame || frame.sx < 0 || frame.sy < 0) return null;

  return {
    image: sheetImage,
    sx: frame.sx,
    sy: frame.sy,
    w: charDef.frameWidth,
    h: charDef.frameHeight,
  };
}

/** Check if a character id exists in the manifest. */
export function hasCharacter(id: string): boolean {
  return characters.has(id);
}

/**
 * Get all character ids grouped by category.
 * Returns Map<category, {id, name}[]>
 */
export function getCharacterList(): Map<string, { id: string; name: string }[]> {
  const result = new Map<string, { id: string; name: string }[]>();
  const reserved = new Set(['image', 'dict']);

  for (const [key, value] of Object.entries(manifest)) {
    if (reserved.has(key)) continue;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;

    const group = value as Record<string, CharacterDef>;
    const items: { id: string; name: string }[] = [];
    for (const [id, charDef] of Object.entries(group)) {
      items.push({ id, name: charDef.name });
    }
    if (items.length > 0) result.set(key, items);
  }

  return result;
}

/** Get the frame size for a character. */
export function getCharacterFrameSize(id: string): { w: number; h: number } | null {
  const charDef = characters.get(id);
  if (!charDef) return null;
  return { w: charDef.frameWidth, h: charDef.frameHeight };
}
