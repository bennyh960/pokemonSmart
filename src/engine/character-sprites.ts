/**
 * Character Sprites — loads the character spritesheet manifest (characters.json)
 * and provides frame lookups for the overworld renderer.
 *
 * IMPORTANT — Scaling convention:
 * Source frames in the spritesheet can be any size (e.g. 32×32 for higher detail).
 * The game ALWAYS renders them at TILE_SIZE×TILE_SIZE (16×16 logical pixels).
 * The browser's drawImage() handles the downscale automatically.
 * The sprite editor works in source pixels (32×32), the game works in tile pixels (16×16).
 *
 * Usage:
 *   await loadCharacterSprites();
 *   const frame = getCharacterFrame('dani', 'down', 'stand');
 *   // frame = { image, sx, sy, w, h } — w,h are SOURCE size (32×32)
 *   // Render with: ctx.drawImage(img, sx, sy, w, h, dx, dy, TILE_SIZE, TILE_SIZE)
 */

import charactersManifest from '../data/sprites/characters.json';
import { toAssetUrl } from './asset-path.js';

// ── Types ──

export interface SpriteFrame {
  image: HTMLImageElement;
  sx: number;
  sy: number;
  w: number;
  h: number;
  /** If true, render this frame mirrored on the X axis (left↔right direction fallback). */
  flipX?: boolean;
}

/** Bilingual name used in character definitions. */
export interface CharacterName {
  en: string;
  he: string;
}

/** Roles a character sprite can be tagged with for editor filtering. */
export type CharacterRole =
  | 'hero' // player characters
  | 'rival' // rival characters
  | 'professor' // professors (Algorithmah etc.)
  | 'gym-leader' // gym leaders
  | 'gym-helper' // gym trainers / puzzle helpers
  | 'elite-4' // Elite Four members
  | 'champion' // Pokemon League champion
  | 'villain' // Team Rocket / NULL-X antagonists
  | 'nurse' // Pokemon Center nurses
  | 'shopkeeper' // Mart shopkeepers
  | 'story' // key story NPCs (not fitting other roles)
  | 'trainer' // generic route trainers
  | 'townfolk' // regular town residents
  | 'ranger' // route / safari guides
  | 'wild-pokemon'; // overworld wild Pokémon sprites

/** All valid character roles (for editor dropdowns). */
export const CHARACTER_ROLES: CharacterRole[] = [
  'hero',
  'rival',
  'professor',
  'gym-leader',
  'gym-helper',
  'elite-4',
  'champion',
  'villain',
  'nurse',
  'shopkeeper',
  'story',
  'trainer',
  'townfolk',
  'ranger',
  'wild-pokemon',
];

interface CharacterDef {
  name?: CharacterName | string; // string for legacy compat
  roles?: CharacterRole[]; // filterable roles for editor
  frameWidth: number;
  frameHeight: number;
  frames: ({ sx: number; sy: number } | null)[];
}

// ── State ──

const manifest = charactersManifest as {
  image: string;
  dict: Record<string, number>;
  [key: string]: unknown;
};

/** All characters flattened: id → CharacterDef */
const characters = new Map<string, CharacterDef>();

/** The loaded spritesheet image. */
let sheetImage: HTMLImageElement | null = null;
let loaded = false;

/** Parse a name field that may be a string (legacy) or {en, he}. */
function parseCharName(raw: unknown): CharacterName {
  if (!raw) return { en: '', he: '' };
  if (typeof raw === 'string') return { en: raw, he: '' };
  const obj = raw as Record<string, string>;
  return { en: obj.en || '', he: obj.he || '' };
}

// ── Index characters immediately from manifest (sync) ──
// This ensures getCharacterList() works even without loadCharacterSprites()
{
  const reserved = new Set(['image', 'dict']);
  for (const [key, value] of Object.entries(manifest)) {
    if (reserved.has(key)) continue;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const group = value as Record<string, CharacterDef>;
    for (const [id, charDef] of Object.entries(group)) {
      characters.set(id, charDef);
    }
  }
}

// ── Init ──

/** Load the spritesheet image and index all characters. */
export async function loadCharacterSprites(): Promise<void> {
  if (loaded) return;

  // Load the spritesheet image
  sheetImage = new Image();
  sheetImage.src = toAssetUrl(manifest.image);
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

const DIR_BASE: Record<string, number> = { up: 0, down: 3, left: 6, right: 9 };
const POSE_OFFSET: Record<string, number> = { stand: 0, 'walk-1': 1, 'walk-2': 2 };
const OPPOSITE_DIR: Partial<Record<string, string>> = { left: 'right', right: 'left' };

function isValidRawFrame(f: { sx: number; sy: number } | null): f is { sx: number; sy: number } {
  return f !== null && f.sx >= 0 && f.sy >= 0;
}

/**
 * Get the sprite frame for a character.
 *
 * Null-frame fallbacks (no JSON changes required):
 *   1. Within a direction: if the requested pose is null, steps back to an earlier pose
 *      in the same direction (walk-2 → walk-1 → stand) to avoid animation flicker.
 *   2. Entire direction missing (left/right only): mirrors the opposite direction and
 *      sets `flipX: true` on the returned frame so the caller can apply ctx.scale(-1,1).
 *
 * @param id        Character id (e.g. "dani", "leon")
 * @param facing    Direction: "up" | "down" | "left" | "right"
 * @param pose      Animation pose: "stand" | "walk-1" | "walk-2"
 * @returns         SpriteFrame or null if not found
 */
export function getCharacterFrame(id: string, facing: string, pose: string = 'stand'): SpriteFrame | null {
  if (!sheetImage || !loaded) return null;

  const charDef = characters.get(id);
  if (!charDef) return null;

  const base = DIR_BASE[facing];
  if (base === undefined) return null;

  const poseOffset = POSE_OFFSET[pose] ?? 0;

  // Walk back through poses in a direction to find the first valid frame.
  const tryDir = (dirBase: number): { sx: number; sy: number } | null => {
    for (let off = poseOffset; off >= 0; off--) {
      const idx = dirBase + off;
      if (idx < charDef.frames.length && isValidRawFrame(charDef.frames[idx])) {
        return charDef.frames[idx] as { sx: number; sy: number };
      }
    }
    return null;
  };

  let raw = tryDir(base);
  let flipX = false;

  // If the entire direction is missing and it's left/right, mirror the opposite side.
  if (!raw) {
    const oppDir = OPPOSITE_DIR[facing];
    if (oppDir !== undefined) {
      raw = tryDir(DIR_BASE[oppDir]!);
      if (raw) flipX = true;
    }
  }

  if (!raw) return null;

  return {
    image: sheetImage,
    sx: raw.sx,
    sy: raw.sy,
    w: charDef.frameWidth,
    h: charDef.frameHeight,
    ...(flipX && { flipX: true }),
  };
}

/** Check if a character id exists in the manifest. */
export function hasCharacter(id: string): boolean {
  return characters.has(id);
}

/** Character info returned by getCharacterList. */
export interface CharacterInfo {
  id: string;
  name: CharacterName;
  roles: CharacterRole[];
}

/**
 * Get all characters as a flat list with bilingual names.
 */
export function getCharacterList(): CharacterInfo[] {
  const result: CharacterInfo[] = [];
  for (const [id, charDef] of characters) {
    result.push({ id, name: parseCharName(charDef.name), roles: charDef.roles || [] });
  }
  return result;
}

/** Get all characters that include the given role tag. */
export function getCharactersByRole(role: CharacterRole): CharacterInfo[] {
  return getCharacterList().filter((character) => character.roles.includes(role));
}

/** Default hero sprite id used for new games and migrated saves. */
export function getDefaultHeroCharacterId(): string {
  const heroes = getCharactersByRole('hero');
  if (heroes.length > 0) return heroes[0].id;
  const firstCharacter = getCharacterList()[0];
  return firstCharacter?.id ?? 'ashKetchum';
}

/** Get character info by ID. */
export function getCharacterInfo(id: string): CharacterInfo | undefined {
  const charDef = characters.get(id);
  if (!charDef) return undefined;
  return { id, name: parseCharName(charDef.name), roles: charDef.roles || [] };
}

/** Get the frame size for a character. */
export function getCharacterFrameSize(id: string): { w: number; h: number } | null {
  const charDef = characters.get(id);
  if (!charDef) return null;
  return { w: charDef.frameWidth, h: charDef.frameHeight };
}
