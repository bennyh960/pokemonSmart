import mapManifest from '../../../data/maps/map-manifest';
import { getTileset } from '../../../engine/tileset';
import { type Locale } from '../../../i18n/i18n';
import { getPokemon, getSpawnLocations } from '../../../services/pokemon-data';
import { getPlayerData } from '../../../systems/game-state';
import { getCachedMap, loadMap } from '../../../systems/map-manager';

// Logic
export interface WildLocation {
  mapId: string;
  minLevel: number;
  maxLevel: number;
  methods: string[];
  mapLabel: string;
}

export function getWildLocations(pokemonId: number, locale: Locale): WildLocation[] {
  const spawnLocations = getSpawnLocations(pokemonId);
  if (spawnLocations.length === 0) return [];

  const pokemon = getPokemon(pokemonId);
  const pokemonTypes = (pokemon?.types ?? []) as string[];

  // Global tile key cache for this function call:
  // key → { encounterTypes, description } or null if not an encounter tile
  const tileKeyCache = new Map<string, { encounterTypes: string[]; description?: string } | null>();

  const results: WildLocation[] = [];
  const allMapsIds = preLoadVisitedMaps(); // getAllMapIds();

  for (const spawn of spawnLocations) {
    const resolvedMapId = allMapsIds.find((id) => id.endsWith('/' + spawn.mapId));
    const map = resolvedMapId ? getCachedMap(resolvedMapId) : undefined;
    if (!map) continue;
    const mapLabel = map?.label ? (locale === 'he' ? map.label.he : map.label.en) : (resolvedMapId ?? spawn.mapId);
    // Skip if map not cached yet, wrong tileset, or no encounter table
    if (!map || map.tileset !== 'overworld' || !map.encounterTableId || !mapLabel) {
      results.push({ ...spawn, methods: [], mapLabel });
      continue;
    }

    // overworld manifest
    const tileset = getTileset('overworld');
    // console.log({ mapId: spawn.mapId, resolvedMapId, mapLabel, tileset });

    // Collect unique tile keys from this map's tile grid
    const mapTileKeys = new Set<string>();
    for (const row of map.tiles) {
      for (const cell of row) {
        if (typeof cell === 'string') {
          mapTileKeys.add(cell);
        }
      }
    }

    // Populate global tile key cache for any keys we haven't seen yet
    if (tileset) {
      for (const key of mapTileKeys) {
        if (!tileKeyCache.has(key)) {
          const def = tileset.getTile(key);
          if (def?.encounterTypes && def.encounterTypes.length > 0) {
            tileKeyCache.set(key, {
              encounterTypes: def.encounterTypes,
              description: def.category,
            });
          } else {
            tileKeyCache.set(key, null);
          }
        }
      }
    }

    // Find matching methods for this pokemon on this map
    const methods = new Set<string>();
    for (const key of mapTileKeys) {
      const cached = tileKeyCache.get(key);
      if (!cached) continue;
      if (pokemonMatchesEncounterTypes(pokemonTypes, cached.encounterTypes)) {
        methods.add(cached.description ?? '');
      }
    }

    results.push({
      ...spawn,
      methods: [...methods].filter(Boolean),
      mapLabel,
    });
  }

  return results;
}

function preLoadVisitedMaps() {
  const pd = getPlayerData();
  const visitedCities = mapManifest.cities.map((c) => c.id).filter((id) => pd.flags[`visited-${id}`]);
  const visitedRoutes = mapManifest.routes.map((c) => c.id).filter((id) => pd.flags[`visited-${id}`]);
  const visitedLocations = [...visitedCities, ...visitedRoutes];
  for (const id of visitedLocations) {
    if (!getCachedMap(id)) {
      loadMap(id);
    }
  }
  return visitedLocations;
}

/**
// Returns true if a pokemon with the given types can appear on a tile
 // with the given encounterTypes. & is * . i placed & just cause it was problematic in the vs code comments
 //
 //  encounterTypes formats:
//  ['grass', 'bug']         → include: pokemon must have at least one of these types
//  ['&/water']              → loose exclude: exclude only if ALL pokemon types are in the exclusion list
//  ['&/water?']             → strict exclude: exclude if ANY pokemon type is in the exclusion list
//  ['&']                    → all types allowed
//  ['&/flying,ground,rock'] → loose exclude with multiple exclusions
**/

function pokemonMatchesEncounterTypes(pokemonTypes: string[], encounterTypes: string[]): boolean {
  for (const rule of encounterTypes) {
    if (rule === '*') return true;

    if (rule.startsWith('*/')) {
      // Exclude rule
      const rest = rule.slice(2);
      const strict = rest.endsWith('?');
      const exclusionStr = strict ? rest.slice(0, -1) : rest;
      const exclusions = exclusionStr.split(',').map((s) => s.trim());

      if (strict) {
        // Strict: exclude if ANY pokemon type is in the exclusion list
        if (pokemonTypes.some((t) => exclusions.includes(t))) continue;
      } else {
        // Loose: exclude only if ALL pokemon types are in the exclusion list
        if (pokemonTypes.every((t) => exclusions.includes(t))) continue;
      }
      return true;
    }

    // Include rule: pokemon must have at least one matching type
    if (pokemonTypes.some((t) => encounterTypes.includes(t))) return true;
  }

  return false;
}
