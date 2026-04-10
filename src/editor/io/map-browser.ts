/**
 * Map Browser — Provides access to all existing game maps for loading in the editor.
 * Uses dynamic imports to load map JSON files directly from the game's data folder.
 */

import { importMap } from './map-importer.js';

/** All known game maps with their display names */
export const GAME_MAPS: { id: string; label: string }[] = [
  { id: 'zeroville', label: 'Zeroville (Starting Town)' },
  { id: 'route-1', label: 'Route 1' },
  { id: 'sumville', label: 'Sumville' },
  { id: 'pokecenter-interior', label: 'Pokemon Center (Interior)' },
  { id: 'mart-interior', label: 'Poke Mart (Interior)' },
  { id: 'test-map', label: 'Test Map' },
  { id: 'algebria', label: 'Algebria' },
  { id: 'divideburg', label: 'Divideburg' },
  { id: 'fractalis', label: 'Fractalis' },
  { id: 'infinity-plateau', label: 'Infinity Plateau' },
  { id: 'logica-heights', label: 'Logica Heights' },
  { id: 'multitown', label: 'Multitown' },
  { id: 'prime-city', label: 'Prime City' },
];

/** Dynamic import loaders for each map */
const mapLoaders: Record<string, () => Promise<any>> = {
  zeroville: () => import('../../data/maps/zeroville.json'),
  'route-1': () => import('../../data/maps/route-1.json'),
  sumville: () => import('../../data/maps/sumville.json'),
  'pokecenter-interior': () => import('../../data/maps/pokecenter-interior.json'),
  'mart-interior': () => import('../../data/maps/mart-interior.json'),
  'test-map': () => import('../../data/maps/test-map.json'),
  algebria: () => import('../../data/maps/algebria.json'),
  divideburg: () => import('../../data/maps/divideburg.json'),
  fractalis: () => import('../../data/maps/fractalis.json'),
  'infinity-plateau': () => import('../../data/maps/infinity-plateau.json'),
  'logica-heights': () => import('../../data/maps/logica-heights.json'),
  multitown: () => import('../../data/maps/multitown.json'),
  'prime-city': () => import('../../data/maps/prime-city.json'),
};

/** Load a game map by ID into the editor */
export async function loadGameMap(mapId: string): Promise<boolean> {
  const loader = mapLoaders[mapId];
  if (!loader) {
    alert(`Unknown map: ${mapId}`);
    return false;
  }

  try {
    const module = await loader();
    const data = module.default;
    // Ensure map has an id
    if (!data.id) data.id = mapId;
    // Use the importer which handles field normalization
    const json = JSON.stringify(data);
    return importMap(json);
  } catch (e) {
    alert(`Failed to load map "${mapId}": ${e}`);
    return false;
  }
}
