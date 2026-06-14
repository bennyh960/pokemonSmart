import mapManifest from '../../../data/maps/map-manifest';
import { drawRect, drawText, fillRect } from '../../../engine/renderer';
import { getTileset } from '../../../engine/tileset';
import { getLocale, isRTL, t } from '../../../i18n/i18n';
import { getPokemon, getSpawnLocations } from '../../../services/pokemon-data';
import { getPlayerData } from '../../../systems/game-state';
import { getCachedMap, loadMap } from '../../../systems/map-manager';

// RENDER
export function renderLocationTab(
  ctx: CanvasRenderingContext2D,
  contentY: number,
  contentH: number,
  SCREEN_W: number,
  cachedWildLocations: WildLocation[] = [],
): void {
  const rtl = isRTL();

  const locs = cachedWildLocations;

  if (locs.length === 0) {
    drawText(ctx, t('pokedex.location.none'), SCREEN_W / 2, contentY + 40, {
      size: 7,
      color: '#807070',
      font: 'monospace',
      align: 'center',
    });
    return;
  }

  let y = contentY + 4;
  const rowH = 14;

  for (const loc of locs) {
    const displayName = loc.mapLabel;

    fillRect(ctx, 4, y, SCREEN_W - 8, rowH - 2, '#241010');
    drawRect(ctx, 4, y, SCREEN_W - 8, rowH - 2, '#5a3030');
    drawText(ctx, displayName, rtl ? SCREEN_W - 10 : 10, y + 2, {
      size: 7,
      color: '#ffffff',
      font: 'monospace',
      align: rtl ? 'right' : 'left',
    });
    if (loc.methods.length > 0) {
      let mx = rtl ? 10 : SCREEN_W - 10;
      for (let i = loc.methods.length - 1; i >= 0; i--) {
        const method = loc.methods[i]!;
        const methodLabel = t(`encounter.method.${method}`);
        const pillW = methodLabel.length * 4 + 6;
        if (rtl) {
          fillRect(ctx, mx, y + 2, pillW, 9, '#2a3a2a');
          drawRect(ctx, mx, y + 2, pillW, 9, '#4a6a4a');
          drawText(ctx, methodLabel, mx + pillW / 2, y + 3, {
            size: 5,
            color: '#88cc88',
            font: 'monospace',
            align: 'center',
          });
          mx += pillW + 3;
        } else {
          mx -= pillW;
          fillRect(ctx, mx, y + 2, pillW, 9, '#2a3a2a');
          drawRect(ctx, mx, y + 2, pillW, 9, '#4a6a4a');
          drawText(ctx, methodLabel, mx + pillW / 2, y + 3, {
            size: 5,
            color: '#88cc88',
            font: 'monospace',
            align: 'center',
          });
          mx -= 3;
        }
      }
    }

    y += rowH;
    if (y > contentY + contentH - rowH) break;
  }

  const hintY = contentY + contentH - 14;

  const hintY2 = hintY - 14;
  drawText(ctx, t('pokedex.location.cacheHint'), SCREEN_W / 2, hintY2, {
    size: 5,
    color: '#555566',
    font: 'monospace',
    align: 'center',
  });

  fillRect(ctx, 4, hintY, SCREEN_W - 8, 12, '#1a1a2a');
  drawRect(ctx, 4, hintY, SCREEN_W - 8, 12, '#3a3a5a');
  drawText(
    ctx,
    rtl ? 'Enter \u2192 \u05e6\u05e4\u05d9\u05d9\u05d4 \u05d1\u05de\u05e4\u05d4' : 'Enter \u2192 Show on map',
    SCREEN_W / 2,
    hintY + 2,
    { size: 6, color: '#8888cc', font: 'monospace', align: 'center' },
  );
}

// Logic
export interface WildLocation {
  mapId: string;
  minLevel: number;
  maxLevel: number;
  methods: string[];
  mapLabel: string;
}

export function getWildLocations(pokemonId: number): WildLocation[] {
  const spawnLocations = getSpawnLocations(pokemonId);
  if (spawnLocations.length === 0) return [];

  const pokemon = getPokemon(pokemonId);
  const pokemonTypes = (pokemon?.types ?? []) as string[];

  // Global tile key cache for this function call:
  // key → { encounterTypes, description } or null if not an encounter tile
  const tileKeyCache = new Map<string, { encounterTypes: string[]; description?: string } | null>();

  const results: WildLocation[] = [];
  const locale = getLocale();
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
