/**
 * Map Browser — Provides access to all game maps for loading in the editor.
 * Auto-discovers maps via import.meta.glob (recursive, excludes templates/ and backup/).
 * Map IDs are path-relative: e.g. "minusburg/gym", "routes/route-1".
 */

import { importMap } from './map-importer.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapModules = import.meta.glob<{ default: any }>([
  '../../data/maps/**/*.json',
  '!../../data/maps/templates/**',
  '!../../data/maps/backup/**',
], { eager: true });

function mapIdFromPath(path: string): string {
  return path.replace(/^.*\/maps\//, '').replace(/\.json$/, '');
}

/** Display label: "folder#name" (e.g. "minusburg#gym"), or just ID for root-level maps. */
function buildLabel(id: string): string {
  const slash = id.indexOf('/');
  return slash >= 0 ? `${id.slice(0, slash)}#${id.slice(slash + 1)}` : id;
}

/** All known game maps, sorted by label. */
export const GAME_MAPS: { id: string; label: string; folder: string }[] = Object.keys(mapModules)
  .map(path => {
    const id = mapIdFromPath(path);
    const slash = id.indexOf('/');
    const folder = slash >= 0 ? id.slice(0, slash) : '';
    return { id, label: buildLabel(id), folder };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

/** All unique folder names, sorted. Used for the "New Map" folder selector. */
export const KNOWN_FOLDERS: string[] = [...new Set(
  GAME_MAPS.map(m => m.folder).filter(Boolean)
)].sort();

/** Load a game map by ID into the editor. */
export async function loadGameMap(mapId: string): Promise<boolean> {
  const entry = Object.entries(mapModules).find(([p]) => mapIdFromPath(p) === mapId);
  if (!entry) {
    alert(`Unknown map: ${mapId}`);
    return false;
  }
  try {
    const data = { ...entry[1].default, id: mapId };
    return importMap(JSON.stringify(data));
  } catch (e) {
    alert(`Failed to load map "${mapId}": ${e}`);
    return false;
  }
}
