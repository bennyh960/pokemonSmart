/**
 * WorldMapScene — Image-based world map with fly destination selection.
 *
 * Background image + map-manifest.ts drive all rendering:
 *   - Image drawn at manifest.scale, centred on screen
 *   - Route labels drawn at their title positions
 *   - City labels + fly-mode highlight rects drawn for each city
 *   - Player dot placed by mapping pd.position to the location's tile-grid rect;
 *     for indoor maps the dot falls back to the parent folder's city rect centre
 *
 * Fly mode (activated by setFlyCallback before pushing this scene):
 *   - Only visited cities are selectable (highlighted rect + border)
 *   - Arrow keys cycle through visited cities
 *   - Enter triggers the fly callback and pops the scene
 */

import type { InputManager } from '../engine/input.js';
import { drawText, fillRect, fillRoundRect } from '../engine/renderer.js';
import type { StateMachine } from '../engine/state-machine.js';
import { t, isRTL } from '../i18n/i18n.js';
import { getPlayerData, hasActiveGame } from '../systems/game-state.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
import { getMapDisplayName, loadMap, mapCache } from '../systems/map-manager.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import mapManifest from '../data/maps/map-manifest.js';
import type { TileMapData } from '../engine/tilemap.js';
import type { Scene, Pokemon } from '../types/index.js';
import { type WildLocation } from './pokedex/tabs/location.js';
// ─── Fly destination registry ─────────────────────────────────────────────────
/** All city mapIds from the manifest are valid Fly destinations. */
export const FLY_DESTINATIONS: string[] = mapManifest.cities.map((c) => c.id);

// ─── Fly callback ─────────────────────────────────────────────────────────────
/** Set by overworld.ts before pushing WORLD_MAP. Null = read-only map view. */
let pendingFlyCallback: ((destinationMapId: string) => void) | null = null;
let flyPokemon: Pokemon | null = null;

/** Pass the pokemon that will fly alongside the callback so the map can render it. */
export function setFlyCallback(cb: ((destinationMapId: string) => void) | null, pokemon?: Pokemon): void {
  pendingFlyCallback = cb;
  flyPokemon = pokemon ?? null;
}

// Utility for location
let pokedexMapContext: { pokemonId: number; onReturn: () => void; locations: WildLocation[] } | null = null;

export function setPokedexMapContext(pokemonId: number, onReturn: () => void, locations: WildLocation[]): void {
  pokedexMapContext = { pokemonId, onReturn, locations };
}

/**
 * Return a landing spawn for the given city, or null to fall back to the
 * map's own spawn field.  If flySpawn has multiple entries one is picked
 * at random so cities can have several valid landing spots.
 */
export function resolveFlySpawn(mapId: string): { x: number; y: number } | null {
  const city = mapManifest.cities.find((c) => c.id === mapId);
  if (!city?.flySpawn?.length) return null;
  const idx = Math.floor(Math.random() * city.flySpawn.length);
  return city.flySpawn[idx]!;
}

// ─── Coord helpers ────────────────────────────────────────────────────────────

/** Offset that centres the scaled image on the logical screen. */
function imageOffset(scale: number): { x: number; y: number } {
  return {
    x: Math.round((SCREEN_W - mapManifest.imageData.width * scale) / 2),
    y: Math.round((SCREEN_H - mapManifest.imageData.height * scale) / 2),
  };
}

/**
 * Convert original-image pixel coords to logical screen coords.
 * ox/oy are in unscaled image pixels.
 */
function toScreen(ox: number, oy: number, scale: number, off: { x: number; y: number }): { x: number; y: number } {
  return { x: off.x + ox * scale, y: off.y + oy * scale };
}

/**
 * Resolve which manifest location a mapId belongs to.
 * Returns the location + whether the match is precise (direct mapId match) or
 * approximate (matched on parent folder — player is in a building).
 */
function resolveLocation(mapId: string) {
  const all = [...mapManifest.cities, ...mapManifest.routes];

  const direct = all.find((l) => l.id === mapId);
  if (direct) return { loc: direct, precise: true };

  // Indoor map: strip filename, keep folder, find first matching city/route
  const folder = mapId.split('/')[0];
  const parent = all.find((l) => l.id.startsWith(folder + '/'));
  return parent ? { loc: parent, precise: false } : null;
}

// ─── Label chip util ─────────────────────────────────────────────────────────

/**
 * Draw a map-label chip: rounded-rect background + text centred at (x, y).
 *
 * kind='city'  → warm cream text on dark-blue plate  (name-sign feel)
 * kind='route' → muted green text on dark-green plate (road-sign feel)
 */
function drawLocationLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  kind: 'city' | 'route',
  visited: boolean,
  selected: boolean,
): void {
  const size = kind === 'city' ? 4 : 3;

  ctx.save();
  ctx.font = `${size}px monospace`;
  const tw = Math.ceil(ctx.measureText(text).width);
  ctx.restore();

  const padX = 2;
  const padY = 1;
  const chipX = x - tw / 2 - padX;
  const chipY = y - padY;
  const chipW = tw + padX * 2;
  const chipH = size + padY * 2 + 1;

  // Drop shadow
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000000';
  fillRoundRect(ctx, chipX, chipY + 1, chipW, chipH, 3);
  ctx.restore();

  // Background plate
  let bgColor: string;
  let bgAlpha: number;
  let textColor: string;

  if (kind === 'city') {
    bgColor = selected ? '#102638' : '#071018';
    bgAlpha = selected ? 0.78 : visited ? 0.66 : 0.56;
    textColor = selected ? '#f3ef12' : visited ? '#f2f20e' : '#3d87d0';
  } else {
    bgColor = selected ? '#0e2010' : '#081208';
    bgAlpha = selected ? 0.75 : visited ? 0.62 : 0.48;
    textColor = selected ? '#d5f8d5' : visited ? '#9bc68d' : '#16dc16';
  }

  ctx.save();
  ctx.globalAlpha = bgAlpha;
  ctx.fillStyle = bgColor;
  fillRoundRect(ctx, chipX, chipY, chipW, chipH, 3);
  ctx.restore();

  drawText(ctx, text, x, y, { size, color: textColor, align: 'center', font: 'monospace' });
}

// ─── Scene factory ────────────────────────────────────────────────────────────

export function createWorldMapScene(input: InputManager, stateMachine: StateMachine): Scene {
  let visitedCities: string[] = [];
  let selectedIndex = 0;
  let elapsed = 0;
  let showLabels = false;
  const mapDataCache = new Map<string, TileMapData>();

  function preloadMapData(ids: string[]): void {
    for (const id of ids) {
      if (!mapDataCache.has(id)) {
        loadMap(id)
          .then((data) => mapDataCache.set(id, data))
          .catch(() => undefined);
      }
    }
  }

  return {
    enter(): void {
      elapsed = 0;
      selectedIndex = 0;
      showLabels = false;

      loadImage(mapManifest.imageData.path).catch(() => undefined);
      if (flyPokemon) {
        loadImage(`/sprites/pokemon/front/${flyPokemon.id}.png`).catch(() => undefined);
      }

      if (!hasActiveGame()) {
        visitedCities = [];
        return;
      }

      const pd = getPlayerData();
      visitedCities = mapManifest.cities.map((c) => c.id).filter((id) => pd.flags[`visited-${id}`]);

      // Default cursor to current city
      const folder = pd.position.mapId.split('/')[0];
      const idx = visitedCities.findIndex((id) => id.startsWith(folder + '/'));
      if (idx >= 0) selectedIndex = idx;

      // Preload map data for precise player-dot placement
      preloadMapData([pd.position.mapId, ...visitedCities]);
    },

    exit(): void {
      pendingFlyCallback = null;
      pokedexMapContext = null;
    },

    update(dt: number): void {
      elapsed += dt;

      if (
        input.isKeyPressed('Escape') ||
        input.isKeyPressed('w') ||
        input.isKeyPressed('W') ||
        input.isKeyPressed('m') ||
        input.isKeyPressed('M')
      ) {
        if (pokedexMapContext) {
          const cb = pokedexMapContext.onReturn;
          pokedexMapContext = null;
          stateMachine.pop();
          cb();
        } else {
          stateMachine.pop();
        }
        return;
      }

      if (input.isKeyPressed('x') || input.isKeyPressed('X')) {
        showLabels = !showLabels;
      }

      const canFly = pendingFlyCallback !== null && pokedexMapContext === null;
      if (canFly && visitedCities.length > 0) {
        if (input.isKeyPressed('ArrowLeft') || input.isKeyPressed('ArrowUp')) {
          selectedIndex = (selectedIndex - 1 + visitedCities.length) % visitedCities.length;
        } else if (input.isKeyPressed('ArrowRight') || input.isKeyPressed('ArrowDown')) {
          selectedIndex = (selectedIndex + 1) % visitedCities.length;
        } else if (input.isKeyPressed('Enter')) {
          const destId = visitedCities[selectedIndex];
          if (destId && pendingFlyCallback) {
            const cb = pendingFlyCallback;
            pendingFlyCallback = null;
            stateMachine.pop();
            cb(destId);
          }
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      const { imageData, scale } = mapManifest;
      // Fit image to screen first, then apply manifest scale as zoom multiplier
      const fitScale = Math.min(SCREEN_W / imageData.width, SCREEN_H / imageData.height);
      const finalScale = fitScale * scale;
      const off = imageOffset(finalScale);
      const rtl = isRTL();
      const canFly = pendingFlyCallback !== null && pokedexMapContext === null;

      // ── Background ───────────────────────────────────────────────────────
      fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, '#0a0a1a');

      // ── World map image ──────────────────────────────────────────────────
      const img = getCachedImage(imageData.path);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, SCREEN_W, SCREEN_H);
        ctx.clip();
        ctx.drawImage(img, off.x, off.y, imageData.width * finalScale, imageData.height * finalScale);
        ctx.restore();
      } else {
        drawText(ctx, '...', SCREEN_W / 2, SCREEN_H / 2, {
          size: 7,
          color: '#335566',
          align: 'center',
          font: 'monospace',
        });
      }

      // ── Routes (shown only when showLabels is on) ─────────────────────────
      if (showLabels) {
        const pd = hasActiveGame() ? getPlayerData() : null;
        for (const route of mapManifest.routes) {
          const { x1, y1, x2, y2, title } = route;
          const anchor = toScreen(
            x1 + (title[0] / 100) * (x2 - x1),
            y1 + (title[1] / 100) * (y2 - y1),
            finalScale,
            off,
          );
          const isVisited = pd ? !!pd.flags[`visited-${route.id}`] : false;
          const name = route.label ?? getMapDisplayName(route.id);
          drawLocationLabel(ctx, rtl ? name.he : name.en, anchor.x, anchor.y, 'route', isVisited, false);
        }
      }

      // ── Cities ───────────────────────────────────────────────────────────
      for (const city of mapManifest.cities) {
        const { x1, y1, x2, y2, title } = city;
        const sx = off.x + x1 * finalScale;
        const sy = off.y + y1 * finalScale;
        const sw = (x2 - x1) * finalScale;
        const sh = (y2 - y1) * finalScale;

        const isVisited = visitedCities.includes(city.id);
        const isSelected = canFly && visitedCities[selectedIndex] === city.id;

        // Fly-mode highlight rect
        if (canFly && isVisited) {
          const pulse = 0.55 + 0.45 * Math.sin(elapsed * 3);
          ctx.save();
          ctx.globalAlpha = isSelected ? 0.5 : pulse * 0.25;
          fillRect(ctx, sx, sy, sw, sh, isSelected ? '#88ddff' : '#4488aa');
          ctx.globalAlpha = 1;
          if (isSelected) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, sw, sh);
          }
          ctx.restore();
        }

        // Fly Pokémon sprite — bobbing on the selected city
        if (isSelected && flyPokemon) {
          const sprite = getCachedImage(`/sprites/pokemon/front/${flyPokemon.id}.png`);
          if (sprite) {
            const sprW = 20;
            const sprH = 20;
            const cx = sx + sw / 2;
            const cy = sy + sh / 2;
            const bob = Math.sin(elapsed * 4) * 1.5;
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sprite, cx - sprW / 2, cy - sprH / 2 + bob, sprW, sprH);
            ctx.restore();
          }
        }

        // City label
        const anchor = toScreen(x1 + (title[0] / 100) * (x2 - x1), y1 + (title[1] / 100) * (y2 - y1), finalScale, off);
        const name = city.label ?? getMapDisplayName(city.id);
        drawLocationLabel(ctx, rtl ? name.he : name.en, anchor.x, anchor.y, 'city', isVisited, isSelected);
      }

      // ── Pokédex location indicators ──────────────────────────────────────────
      if (pokedexMapContext) {
        const locs = pokedexMapContext.locations;
        for (const loc of locs) {
          const city = mapManifest.cities.find((c) => c.id === loc.mapId || c.id.endsWith('/' + loc.mapId));

          const route = city
            ? null
            : mapManifest.routes.find((r) => r.id === loc.mapId || r.id.endsWith('/' + loc.mapId));
          const entry = city ?? route;
          if (!entry) continue;

          const sx = off.x + entry.x1 * finalScale;
          const sy = off.y + entry.y1 * finalScale;
          const sw = (entry.x2 - entry.x1) * finalScale;
          const sh = (entry.y2 - entry.y1) * finalScale;
          const cx = sx + sw / 2;
          const cy = sy + sh / 2;

          const sprite = getCachedImage(`/sprites/pokemon/front/${pokedexMapContext.pokemonId}.png`);
          const sprW = 14;
          const sprH = 14;
          const pad = 3;
          const blink = 0.55 + 0.45 * Math.sin(elapsed * 3);

          ctx.save();
          // Blinking background pill
          ctx.globalAlpha = 0.75 * blink;
          fillRect(ctx, cx - sprW / 2 - pad, cy - sprH / 2 - pad, sprW + pad * 2, sprH + pad * 2, '#000000');
          ctx.globalAlpha = 0.5 * blink;
          ctx.strokeStyle = '#ffdd44';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx - sprW / 2 - pad, cy - sprH / 2 - pad, sprW + pad * 2, sprH + pad * 2);
          ctx.globalAlpha = 1;
          if (sprite) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sprite, cx - sprW / 2, cy - sprH / 2, sprW, sprH);
          } else {
            ctx.globalAlpha = blink;
            fillRect(ctx, cx - sprW / 2, cy - sprH / 2, sprW, sprH, '#ffdd44');
          }
          ctx.restore();
        }
      }

      // ── Player dot ───────────────────────────────────────────────────────
      if (hasActiveGame()) {
        const pd = getPlayerData();
        const resolved = resolveLocation(pd.position.mapId);

        if (resolved) {
          const { loc, precise } = resolved;
          let dotX: number;
          let dotY: number;

          if (precise && mapDataCache.has(pd.position.mapId)) {
            const mapData = mapDataCache.get(pd.position.mapId)!;
            const rx = mapData.width > 0 ? pd.position.x / mapData.width : 0.5;
            const ry = mapData.height > 0 ? pd.position.y / mapData.height : 0.5;
            dotX = off.x + (loc.x1 + rx * (loc.x2 - loc.x1)) * finalScale;
            dotY = off.y + (loc.y1 + ry * (loc.y2 - loc.y1)) * finalScale;
          } else {
            // Indoor map or not yet loaded — show centre of parent city rect
            dotX = off.x + ((loc.x1 + loc.x2) / 2) * finalScale;
            dotY = off.y + ((loc.y1 + loc.y2) / 2) * finalScale;
          }

          const pulse = 0.5 + 0.5 * Math.sin(elapsed * 4);
          const r = 2 + pulse * 0.8;
          ctx.save();
          ctx.beginPath();
          ctx.arc(dotX, dotY, r + 1.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(dotX, dotY, r, 0, Math.PI * 2);
          ctx.fillStyle = '#ff4444';
          ctx.fill();
          ctx.restore();
        }
      }

      // ── Header ───────────────────────────────────────────────────────────
      fillRect(ctx, 0, 0, SCREEN_W, 14, 'rgba(0,0,0,0.6)');
      drawText(ctx, t('worldMap.title'), SCREEN_W / 2, 3, {
        size: 7,
        color: '#ccddff',
        align: 'center',
        font: 'monospace',
        direction: rtl ? 'rtl' : 'ltr',
      });

      // ── Footer hints ─────────────────────────────────────────────────────
      const barY = SCREEN_H - 11;
      fillRect(ctx, 0, barY, SCREEN_W, 11, 'rgba(0,0,0,0.6)');

      const labelHint = `${t('worldMap.labelsHint')}${showLabels ? ' ●' : ''}`;
      const flyPart = canFly && visitedCities.length > 0 ? `${t('worldMap.flyHint')}  ` : '';
      const hints = `${flyPart}${labelHint}  ${t('worldMap.hint')}`;

      drawText(ctx, hints, SCREEN_W / 2, barY + 2, {
        size: 5,
        color: '#667788',
        align: 'center',
        font: 'monospace',
      });
    },
  };
}
