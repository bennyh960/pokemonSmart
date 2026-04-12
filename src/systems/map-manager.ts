/**
 * MapManager - Lazy-loading map registry for dynamic map transitions.
 *
 * Maps are registered upfront with a loader function (dynamic import).
 * When a map is needed, it is loaded on demand and cached.
 */

import type { TileMapData } from '../engine/tilemap.js';
import { loadTileset } from '../engine/tileset.js';
import { normalizeDialogue } from './npc.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapLoader = () => Promise<{ default: any }>;

/** Bilingual display names for every registered map. */
const MAP_NAMES: Record<string, { en: string; he: string }> = {
  zeroville: { en: 'Zeroville', he: 'זרוויל' },
  'zeroville-house-tl': { en: 'Zeroville House', he: 'בית בזרוויל' },
  'zeroville-house-tr': { en: 'Zeroville House', he: 'בית בזרוויל' },
  'zeroville-house-br': { en: 'Zeroville House', he: 'בית בזרוויל' },
  'route-1': { en: 'Route 1', he: 'מסלול 1' },
  'route1-house': { en: 'Route 1 House', he: 'בית במסלול 1' },
  sumville: { en: 'Sumville', he: 'סאמוויל' },
  'sumville-gym': { en: 'Sumville Gym', he: 'ג׳ים סאמוויל' },
  'sumville-house-1': { en: 'Sumville House', he: 'בית בסאמוויל' },
  'sumville-house-2': { en: 'Sumville House', he: 'בית בסאמוויל' },
  'sumvile-house I': { en: 'Sumville House', he: 'בית בסאמוויל' },
  'sumville-remainder-house': { en: 'Remainder House', he: 'בית השארית' },
  'route-2': { en: 'Route 2', he: 'מסלול 2' },
  'route-3': { en: 'Route 3', he: 'מסלול 3' },
  'route-4': { en: 'Route 4', he: 'מסלול 4' },
  'route-5': { en: 'Route 5', he: 'מסלול 5' },
  'route-6': { en: 'Route 6', he: 'מסלול 6' },
  'route-7': { en: 'Route 7', he: 'מסלול 7' },
  'route-8': { en: 'Route 8', he: 'מסלול 8' },
  'route-9': { en: 'Route 9', he: 'מסלול 9' },
  'route-10': { en: 'Route 10', he: 'מסלול 10' },
  safari: { en: 'Safari Zone', he: 'אזור הספארי' },
  minusburg: { en: 'Minusburg', he: 'מינוסבורג' },
  'deep-forest': { en: 'Deep Forest', he: 'יער עמוק' },
  'mountain-pass': { en: 'Mountain Pass', he: 'מעבר ההר' },
  'mountain-cave': { en: 'Mountain Cave', he: 'מערת ההר' },
  dividia: { en: 'Dividia', he: 'דיוידיה' },
  divideburg: { en: 'Dividia', he: 'דיוידיה' },
  'dividia-cave': { en: 'Dividia Cave', he: 'מערת דיוידיה' },
  'dividia-house-1': { en: 'Dividia House', he: 'בית בדיוידיה' },
  'dividia-house-2': { en: 'Dividia House', he: 'בית בדיוידיה' },
  'dividia-house-3': { en: 'Dividia House', he: 'בית בדיוידיה' },
  'dividia-house-4': { en: 'Dividia House', he: 'בית בדיוידיה' },
  multiplia: { en: 'Multiplia', he: 'מולטיפליה' },
  primore: { en: 'Primore', he: 'פרימור' },
  symmetrika: { en: 'Symmetrika', he: 'סימטריקה' },
  'symmetrika-cave': { en: 'Symmetrika Cave', he: 'מערת סימטריקה' },
  'symmetrika-terminal': { en: 'Symmetrika Terminal', he: 'תחנת סימטריקה' },
  integrala: { en: 'Integrala', he: 'אינטגרלה' },
  absoluta: { en: 'Absoluta', he: 'אבסולוטה' },
  'algorithma-lab': { en: 'Algorithma Lab', he: 'מעבדת אלגוריתמה' },
  'logica-heights': { en: 'Logica Heights', he: 'גבעות לוגיקה' },
  fractalis: { en: 'Fractalis', he: 'פרקטליס' },
  algebria: { en: 'Algebria', he: 'אלגברייה' },
  'infinity-plateau': { en: 'Infinity Plateau', he: 'רמת האינסוף' },
  'prime-city': { en: 'Prime City', he: 'עיר הראשוניים' },
  multitown: { en: 'Multitown', he: 'מולטיטאון' },
  'nullx-tower': { en: 'NULL-X Tower', he: 'מגדל NULL-X' },
  'nullx-floor-6': { en: 'NULL-X Tower — Floor 6', he: 'מגדל NULL-X — קומה 6' },
  'pokecenter-interior': { en: 'Pokémon Center', he: 'מרכז פוקימון' },
  'pokecenter-2': { en: 'Pokémon Center', he: 'מרכז פוקימון' },
  'pokecenter-mart-interior': { en: 'Pokémon Center', he: 'מרכז פוקימון' },
  'mart-interior': { en: 'Poké Mart', he: 'פוקה מארט' },
  'fake-pokecenter': { en: 'Strange Building', he: 'בניין מוזר' },
  'house-3-i': { en: 'House', he: 'בית' },
  'oak lab': { en: "Prof. Oak's Lab", he: 'מעבדת פרופ׳ אוק' },
};

/** Return bilingual display name for a map ID. Falls back to the raw ID if unknown. */
export function getMapDisplayName(mapId: string): { en: string; he: string } {
  return MAP_NAMES[mapId] ?? { en: mapId, he: mapId };
}

/** Search cached (already-loaded) maps to find which map contains a trainer with the given ID. */
export function findMapForTrainer(trainerId: string): string | null {
  for (const [mapId, mapData] of mapCache) {
    if (mapData.npcs?.some((npc) => npc.id === trainerId)) return mapId;
  }
  return null;
}

/** Registry of map loaders keyed by map ID. */
const mapLoaders = new Map<string, MapLoader>();

/** Cache of already-loaded map data. */
const mapCache = new Map<string, TileMapData>();

/** The currently active map ID. */
let currentMapId: string | null = null;

/** Register a map with a lazy loader. */
export function registerMap(id: string, loader: MapLoader): void {
  mapLoaders.set(id, loader);
}

/** Load a map by ID. Returns cached data if already loaded. */
export async function loadMap(id: string): Promise<TileMapData> {
  const cached = mapCache.get(id);
  if (cached) return cached;

  const loader = mapLoaders.get(id);
  if (!loader) {
    throw new Error(`Map "${id}" is not registered. Available: ${[...mapLoaders.keys()].join(', ')}`);
  }

  const module = await loader();
  const data = module.default as TileMapData;
  // Ensure the map has an id field
  if (!data.id) {
    data.id = id;
  }
  // Normalize legacy string[] dialogue to BilingualText[]
  if (data.npcs) {
    for (const npc of data.npcs) {
      if (npc.dialogue) {
        npc.dialogue = normalizeDialogue(npc.dialogue as any);
      }
    }
  }
  // Pre-load tileset if the map declares one
  if (data.tileset) {
    await loadTileset(data.tileset);
  }
  mapCache.set(id, data);
  return data;
}

/** Get the current map ID. */
export function getCurrentMapId(): string | null {
  return currentMapId;
}

/** Set the current map ID (called when transitioning). */
export function setCurrentMapId(id: string): void {
  currentMapId = id;
}

// ─── Register all known maps ────────────────────────────────────

registerMap('zeroville', () => import('../data/maps/zeroville.json').catch(() => import('../data/maps/test-map.json')));
registerMap('zeroville-house-tl', () =>
  import('../data/maps/zeroville-house-tl.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('zeroville-house-tr', () =>
  import('../data/maps/zeroville-house-tr.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('zeroville-house-br', () =>
  import('../data/maps/zeroville-house-br.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('route-1', () => import('../data/maps/route-1.json').catch(() => import('../data/maps/test-map.json')));
registerMap('sumville', () => import('../data/maps/sumville.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-2', () => import('../data/maps/route-2.json').catch(() => import('../data/maps/test-map.json')));
registerMap('safari', () => import('../data/maps/safari.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-3', () => import('../data/maps/route-3.json').catch(() => import('../data/maps/test-map.json')));
registerMap('minusburg', () => import('../data/maps/minusburg.json').catch(() => import('../data/maps/test-map.json')));
registerMap('sumville-house-1', () =>
  import('../data/maps/sumville-house-1.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('sumville-house-2', () =>
  import('../data/maps/sumville-house-2.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('sumvile-house I', () =>
  import('../data/maps/sumvile-house I.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('sumville-gym', () =>
  import('../data/maps/sumville-gym.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('sumville-remainder-house', () =>
  import('../data/maps/sumville-remainder-house.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('route1-house', () =>
  import('../data/maps/route1-house.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('route-4', () => import('../data/maps/route-4.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-10', () => import('../data/maps/route-10.json').catch(() => import('../data/maps/test-map.json')));
registerMap('dividia-house-1', () =>
  import('../data/maps/dividia-house-1.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('dividia-house-2', () =>
  import('../data/maps/dividia-house-2.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('dividia-house-3', () =>
  import('../data/maps/dividia-house-3.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('dividia-house-4', () =>
  import('../data/maps/dividia-house-4.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('pokecenter-mart-interior', () =>
  import('../data/maps/pokecenter-mart-interior.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('pokecenter-2', () =>
  import('../data/maps/pokecenter-2.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('mart-interior', () =>
  import('../data/maps/mart-interior.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('deep-forest', () =>
  import('../data/maps/deep-forest.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('mountain-pass', () =>
  import('../data/maps/mountain-pass.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('house-3-i', () => import('../data/maps/house-3-i.json').catch(() => import('../data/maps/test-map.json')));
registerMap('oak lab', () => import('../data/maps/oak lab.json').catch(() => import('../data/maps/test-map.json')));
// Story-canonical IDs — point to renamed/new map files
registerMap('algorithma-lab', () =>
  import('../data/maps/algorithma-lab.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('multiplia', () => import('../data/maps/multiplia.json').catch(() => import('../data/maps/test-map.json')));
registerMap('dividia', () => import('../data/maps/dividia.json').catch(() => import('../data/maps/test-map.json')));
registerMap('primore', () => import('../data/maps/primore.json').catch(() => import('../data/maps/test-map.json')));
registerMap('fake-pokecenter', () =>
  import('../data/maps/fake-pokecenter.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('route-5', () => import('../data/maps/route-5.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-6', () => import('../data/maps/route-6.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-7', () => import('../data/maps/route-7.json').catch(() => import('../data/maps/test-map.json')));
registerMap('route-8', () => import('../data/maps/route-8.json').catch(() => import('../data/maps/test-map.json')));
registerMap('symmetrika', () =>
  import('../data/maps/symmetrika.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('symmetrika-terminal', () =>
  import('../data/maps/symmetrika-terminal.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('integrala', () => import('../data/maps/integrala.json').catch(() => import('../data/maps/test-map.json')));
registerMap('absoluta', () => import('../data/maps/absoluta.json').catch(() => import('../data/maps/test-map.json')));
registerMap('nullx-tower', () =>
  import('../data/maps/nullx-tower.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('nullx-floor-6', () =>
  import('../data/maps/nullx-floor-6.json').catch(() => import('../data/maps/test-map.json')),
);
// Cave maps
registerMap('dividia-cave', () =>
  import('../data/maps/dividia-cave.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('symmetrika-cave', () =>
  import('../data/maps/symmetrika-cave.json').catch(() => import('../data/maps/test-map.json')),
);
registerMap('mountain-cave', () =>
  import('../data/maps/mountain-cave.json').catch(() => import('../data/maps/test-map.json')),
);
// Route 9 — south of Zeroville (stub, under construction)
registerMap('route-9', () => import('../data/maps/route-9.json').catch(() => import('../data/maps/test-map.json')));
