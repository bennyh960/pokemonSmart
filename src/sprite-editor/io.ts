import type { SpriteEditorState } from './editor-state.js';
import type { SpriteCharacter, FramePos } from './types.js';
import { FRAME_DICT } from './types.js';
import { hasFSAccess, saveToDirectory } from '../editor/fs-save.js';

/**
 * Export sprites as grouped manifest JSON.
 *
 * Output format:
 * {
 *   "image": "...",
 *   "dict": { "down-stand": 0, ... },
 *   "trainers": { "dani": { name, frameWidth, frameHeight, frames: [{sx,sy},...] } },
 *   "npcs": { ... },
 *   ...
 * }
 */
export function exportManifest(state: SpriteEditorState): string {
  // Group sprites by category
  const grouped: Record<string, Record<string, SpriteCharacter>> = {};

  for (const s of state.sprites) {
    const cat = s.category || 'other';
    // Pluralize category key for the manifest
    const catKey = pluralize(cat);
    if (!grouped[catKey]) grouped[catKey] = {};

    grouped[catKey][s.id] = {
      name: s.name,
      frameWidth: s.frameWidth,
      frameHeight: s.frameHeight,
      frames: s.frames.map(f => (f.sx < 0 || f.sy < 0) ? null : { sx: f.sx, sy: f.sy }),
    };
  }

  const manifest: Record<string, unknown> = {
    image: state.imageSrc,
    dict: { ...FRAME_DICT },
    ...grouped,
  };

  return JSON.stringify(manifest, null, 2);
}

/** Simple pluralize for category keys. */
function pluralize(s: string): string {
  if (s.endsWith('s')) return s;
  if (s.endsWith('er')) return s + 's';        // trainer → trainers, player → players
  if (s.endsWith('on')) return s + 's';         // pokemon → pokemons
  return s + 's';
}

/** Inverse of pluralize — strip trailing 's' if it was added. */
function singularize(s: string): string {
  if (s.endsWith('ers')) return s.slice(0, -1); // trainers → trainer
  if (s.endsWith('ons')) return s.slice(0, -1); // pokemons → pokemon
  if (s.endsWith('s') && s.length > 1) return s.slice(0, -1);
  return s;
}

/**
 * Save sprite manifest.
 */
export async function saveManifest(state: SpriteEditorState, fileName = 'sprites.json'): Promise<void> {
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

/**
 * Load a manifest from JSON string into state.
 * Supports the grouped format: { image, dict, trainers: { id: {...} }, ... }
 */
export function loadManifest(state: SpriteEditorState, json: string): void {
  const data = JSON.parse(json);

  state.sprites = [];

  if (data.image) state.imageSrc = data.image;

  // Known non-category keys
  const reserved = new Set(['image', 'dict']);

  for (const [key, value] of Object.entries(data)) {
    if (reserved.has(key)) continue;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;

    // This is a category group (e.g. "trainers", "npcs")
    const category = singularize(key);
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
        name: (c.name as string) || id,
        category,
        frameWidth: (c.frameWidth as number) ?? 16,
        frameHeight: (c.frameHeight as number) ?? 16,
        frames,
      });
    }
  }

  state.selectedIndex = -1;
  state.emit('items-changed');
}

/** Load manifest from a File. */
export async function loadManifestFromFile(state: SpriteEditorState, file: File): Promise<void> {
  const text = await file.text();
  loadManifest(state, text);
}
