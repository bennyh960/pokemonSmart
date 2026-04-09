/**
 * SpritePreloader — Loads tileset, manifest, player/NPC sprites at startup.
 *
 * Uses the gridded tileset (tileset-grid.png) where every tile is at
 * a predictable col*16, row*16 position. The manifest (tileset-grid.json)
 * defines ground tiles and object definitions.
 */

import { loadImage } from './sprite-loader.js';
import {
  TILESET_PATH,
  TILESET_MANIFEST_PATH,
  PLAYER_FRAME_MAP,
  PLAYER_FRAME_WIDTH,
  PLAYER_FRAME_HEIGHT,
  PLAYER_FRAMES_PER_DIR,
  PLAYER_DIRECTIONS,
  NPC_SPRITE_PATHS,
} from './sprite-atlas.js';
import { parseManifest, type AtlasCatalog } from './object-catalog.js';

// ─── Caches ─────────────────────────────────────────────────────

let tilesetImage: HTMLImageElement | null = null;
let atlasCatalog: AtlasCatalog | null = null;
let playerSheet: HTMLImageElement | null = null;
const npcCache = new Map<string, HTMLImageElement>();

// ─── Player sheet composer ──────────────────────────────────────

async function composePlayerSheet(): Promise<HTMLImageElement> {
  const sheetW = PLAYER_FRAMES_PER_DIR * PLAYER_FRAME_WIDTH;
  const sheetH = PLAYER_DIRECTIONS * PLAYER_FRAME_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = sheetW;
  canvas.height = sheetH;
  const ctx = canvas.getContext('2d', { alpha: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, sheetW, sheetH);

  const frameResults = await Promise.allSettled(
    PLAYER_FRAME_MAP.map(async (entry) => {
      const img = await loadImage(entry.file);
      return { ...entry, img };
    }),
  );

  for (const result of frameResults) {
    if (result.status === 'fulfilled') {
      const { row, col, img } = result.value;
      ctx.drawImage(img, col * PLAYER_FRAME_WIDTH, row * PLAYER_FRAME_HEIGHT);
    }
  }

  const loaded = frameResults.filter((r) => r.status === 'fulfilled').length;
  if (loaded === 0) throw new Error('No player frames loaded');

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = canvas.toDataURL('image/png');
  });
}

// ─── Preloader ──────────────────────────────────────────────────

let preloadPromise: Promise<void> | null = null;

export function preloadOverworldAssets(): Promise<void> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    // Load tileset image and manifest in parallel
    const [imgResult, manifestResult] = await Promise.allSettled([
      loadImage(TILESET_PATH),
      fetch(TILESET_MANIFEST_PATH).then(r => r.json()),
    ]);

    if (imgResult.status === 'fulfilled') {
      tilesetImage = imgResult.value;
      console.log(`[sprite-preloader] Tileset loaded: ${tilesetImage.naturalWidth}×${tilesetImage.naturalHeight}`);
    } else {
      console.warn('[sprite-preloader] Tileset not loaded:', imgResult.reason);
    }

    if (manifestResult.status === 'fulfilled') {
      atlasCatalog = parseManifest(manifestResult.value);
      console.log(`[sprite-preloader] Manifest: ${atlasCatalog.groundTiles.size} ground tiles, ${atlasCatalog.objects.size} objects`);
    } else {
      console.warn('[sprite-preloader] Manifest not loaded:', manifestResult.reason);
    }

    // Compose player sprite sheet
    try {
      playerSheet = await composePlayerSheet();
      console.log('[sprite-preloader] Player sheet composed');
    } catch (e) {
      console.warn('[sprite-preloader] Player frames not found, using procedural fallback', e);
    }

    // Load NPC sprites
    const npcEntries = Object.entries(NPC_SPRITE_PATHS);
    const npcResults = await Promise.allSettled(
      npcEntries.map(async ([key, path]) => {
        const img = await loadImage(path);
        return { key, img };
      }),
    );
    for (const result of npcResults) {
      if (result.status === 'fulfilled') {
        npcCache.set(result.value.key, result.value.img);
      }
    }
    const loadedCount = npcResults.filter((r) => r.status === 'fulfilled').length;
    if (loadedCount > 0) {
      console.log(`[sprite-preloader] ${loadedCount}/${npcEntries.length} NPC sprites loaded`);
    }
  })();

  return preloadPromise;
}

// ─── Accessors ──────────────────────────────────────────────────

/** Get the tileset image (clean 16×16 grid). */
export function getAtlasImage(): HTMLImageElement | null {
  return tilesetImage;
}

/** Get the parsed catalog (ground tiles + object definitions). */
export function getAtlasCatalog(): AtlasCatalog | null {
  return atlasCatalog;
}

/** Get the preloaded player sprite sheet (48×64), or null. */
export function getPreloadedPlayerSheet(): HTMLImageElement | null {
  return playerSheet;
}

/** Get a preloaded NPC sprite image, or null. */
export function getPreloadedNPCSprite(spriteType: string): HTMLImageElement | null {
  return npcCache.get(spriteType) ?? null;
}

/** Legacy stub. */
export function getPreloadedTile(_tileType: number): HTMLImageElement | null {
  return null;
}
