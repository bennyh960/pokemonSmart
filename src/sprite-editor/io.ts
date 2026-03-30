import type { SpriteEditorState } from './editor-state.js';
import type { SpriteCharacter, FramePos, BilingualName } from './types.js';
import { FRAME_DICT } from './types.js';
import { hasFSAccess, saveToDirectory, saveBlobToDirectory } from '../editor/fs-save.js';

/**
 * Export sprites as a flat manifest JSON.
 *
 * Output format:
 * {
 *   "image": "...",
 *   "dict": { "down-stand": 0, ... },
 *   "characters": { "char_a1b2": { name: {en,he}, frameWidth, frameHeight, frames } }
 * }
 */
export function exportManifest(state: SpriteEditorState): string {
  const characters: Record<string, SpriteCharacter> = {};

  for (const s of state.sprites) {
    const char: SpriteCharacter = {
      frameWidth: s.frameWidth,
      frameHeight: s.frameHeight,
      frames: s.frames.map(f => (f.sx < 0 || f.sy < 0) ? null : { sx: f.sx, sy: f.sy }),
    };
    // Only include name if at least one locale is non-empty
    if (s.name.en || s.name.he) {
      char.name = { en: s.name.en, he: s.name.he };
    }
    // Only include roles if non-empty
    if (s.roles.length > 0) {
      char.roles = [...s.roles];
    }
    characters[s.id] = char;
  }

  const manifest = {
    image: state.imageSrc,
    dict: { ...FRAME_DICT },
    characters,
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Save sprite manifest.
 */
export async function saveManifest(state: SpriteEditorState, fileName = 'characters.json'): Promise<void> {
  const json = exportManifest(state);

  if (hasFSAccess()) {
    await saveToDirectory('sprites', fileName, json);
    return;
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Copy manifest JSON to clipboard. */
export async function copyManifest(state: SpriteEditorState): Promise<void> {
  await navigator.clipboard.writeText(exportManifest(state));
}

/** Parse a name field that may be a string (legacy) or BilingualName. */
function parseName(raw: unknown): BilingualName {
  if (!raw) return { en: '', he: '' };
  if (typeof raw === 'string') return { en: raw, he: '' };
  const obj = raw as Record<string, string>;
  return { en: obj.en || '', he: obj.he || '' };
}

/**
 * Load a manifest from JSON string into state.
 * Supports both new flat format ("characters" key) and legacy grouped format
 * ("npcs", "trainers", etc.).
 */
export function loadManifest(state: SpriteEditorState, json: string): void {
  const data = JSON.parse(json);

  state.sprites = [];

  if (data.image) state.imageSrc = data.image;

  // Known non-character keys
  const reserved = new Set(['image', 'dict']);

  for (const [key, value] of Object.entries(data)) {
    if (reserved.has(key)) continue;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;

    // This is a group of characters (could be "characters", "npcs", "trainers", etc.)
    const group = value as Record<string, Record<string, unknown>>;

    for (const [id, charData] of Object.entries(group)) {
      if (typeof charData !== 'object' || charData === null) continue;
      const c = charData as Record<string, unknown>;

      const frames: FramePos[] = [];
      if (Array.isArray(c.frames)) {
        for (const f of c.frames) {
          if (f === null || f === undefined) {
            frames.push({ sx: -1, sy: -1 }); // null → internal sentinel
          } else {
            const fo = f as Record<string, unknown>;
            const fsx = (fo.sx as number) ?? -1;
            const fsy = (fo.sy as number) ?? -1;
            frames.push({ sx: fsx, sy: fsy });
          }
        }
      }

      state.sprites.push({
        id,
        name: parseName(c.name),
        roles: Array.isArray(c.roles) ? (c.roles as string[]).filter(Boolean) as import('./types.js').CharacterRole[] : [],
        frameWidth: (c.frameWidth as number) ?? 16,
        frameHeight: (c.frameHeight as number) ?? 16,
        frames,
      });
    }
  }

  state.selectedIndex = -1;
  state.emit('items-changed');
}

/**
 * Apply a crop (scale-in-place) to a region of the spritesheet image.
 */
export async function applyCrop(
  image: HTMLImageElement,
  sx: number, sy: number, sw: number, sh: number,
  tw: number, th: number,
  targetSx: number, targetSy: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0);
  ctx.clearRect(sx, sy, sw, sh);
  ctx.drawImage(image, sx, sy, sw, sh, targetSx, targetSy, tw, th);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
  });
  return blob;
}

/**
 * Save the modified spritesheet image to disk.
 */
export async function saveSpriteImage(blob: Blob, fileName = 'characters_overworld.png'): Promise<void> {
  if (hasFSAccess()) {
    await saveBlobToDirectory('sprite-image', fileName, blob);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Load manifest from a File. */
export async function loadManifestFromFile(state: SpriteEditorState, file: File): Promise<void> {
  const text = await file.text();
  loadManifest(state, text);
}
