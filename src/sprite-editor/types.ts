/**
 * Sprite Editor types.
 *
 * Generic sprite definition system — works for any sprite sheet
 * with directional / animated frames.
 *
 * Each character is a list of frames with explicit (sx, sy) positions.
 * The array index IS the frame identity — a global dictionary maps
 * labels (like "down-stand") to indices.
 */

/** A single frame's position in the spritesheet. */
export interface FramePos {
  sx: number;
  sy: number;
}

/** Bilingual name (English + Hebrew). */
export interface BilingualName {
  en: string;
  he: string;
}

/** A character definition — all frames share the same size. */
export interface SpriteCharacter {
  name?: BilingualName;
  frameWidth: number;
  frameHeight: number;
  frames: (FramePos | null)[];  // null = empty slot (no sprite for this frame)
}

/**
 * The manifest JSON output.
 * All characters live under a single "characters" key.
 */
export interface SpriteManifest {
  image: string;
  dict: Record<string, number>;
  characters: Record<string, SpriteCharacter>;
  // Legacy support: old grouped keys like "npcs", "trainers"
  [key: string]: Record<string, SpriteCharacter> | string | Record<string, number>;
}

/** Internal flat representation for the editor. */
export interface SpriteEntry {
  id: string;
  name: BilingualName;
  frameWidth: number;
  frameHeight: number;
  frames: FramePos[];
}

export type SpriteEditorEvent =
  | 'selection-changed'
  | 'item-selected'
  | 'items-changed'
  | 'viewport-changed'
  | 'crop-mode-changed'
  | 'crop-target-changed';

/** Generate a short random ID for new sprites. */
export function generateSpriteId(): string {
  const hex = Math.random().toString(16).slice(2, 8);
  return `char_${hex}`;
}

/**
 * Global frame dictionary — maps label → array index.
 * Convention: {direction}-{pose}
 * The game engine looks up: dict["down-stand"] → 0 → character.frames[0]
 */
export const FRAME_DICT: Record<string, number> = {
  // Standard 4-direction walk cycle (3 frames × 4 directions = 12)
  // Up first, then down — matches common spritesheet layout
  'up-stand':       0,
  'up-walk-1':      1,
  'up-walk-2':      2,
  'down-stand':     3,
  'down-walk-1':    4,
  'down-walk-2':    5,
  'left-stand':     6,
  'left-walk-1':    7,
  'left-walk-2':    8,
  'right-stand':    9,
  'right-walk-1':  10,
  'right-walk-2':  11,
};

/**
 * Reverse dict: index → label.
 * Used by the editor to show what each frame index means.
 */
export const FRAME_DICT_REVERSE: Record<number, string> = Object.fromEntries(
  Object.entries(FRAME_DICT).map(([k, v]) => [v, k])
);

/** All frame label names in order. */
export const FRAME_LABELS = Object.keys(FRAME_DICT);
