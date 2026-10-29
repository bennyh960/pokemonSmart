/**
 * Overworld Pokémon animation — a Pokémon sprite that appears on the map and
 * flies, surfs or walks along a tile path, then fades out.
 * Used by the `pokemon-anim` cutscene step; the sprite helpers are shared with
 * the player's Fly animation in overworld.ts.
 */

import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { TILE_SIZE } from '../engine/config.js';
import { getPokemonSpriteUrl } from '../utils/util.js';

export type PokemonAnimMotion = 'fly' | 'surf' | 'walk';
export type PathDir = 'up' | 'down' | 'left' | 'right';

const DIR_DELTAS: Record<PathDir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/** Seconds per tile for each motion. */
const TILE_DURATION: Record<PokemonAnimMotion, number> = { fly: 0.12, surf: 0.3, walk: 0.25 };
const APPEAR_S = 0.3;
const VANISH_S = 0.35;
/** Fly with no path: rise straight up this many tiles. */
const DEFAULT_FLY_RISE: PathDir[] = ['up', 'up', 'up', 'up'];

export interface PokemonAnim {
  pokemonId: number;
  sprite: HTMLImageElement | null;
  motion: PokemonAnimMotion;
  /** Tile centers in world pixels: origin first, then one point per path step. */
  points: Array<{ x: number; y: number }>;
  phase: 'appear' | 'move' | 'vanish' | 'done';
  timer: number;
  /** Current draw state (world pixels). */
  x: number;
  y: number;
  offsetY: number;
  scale: number;
  alpha: number;
}

/** Resolved against the deploy base, so it works directly in an <img src>. */
export function pokemonFrontSpriteUrl(pokemonId: number): string {
  return getPokemonSpriteUrl(pokemonId, 'front');
}

/** Returns the cached sprite if loaded, and calls onLoad once it finishes loading. */
export function loadPokemonSprite(pokemonId: number, onLoad: (img: HTMLImageElement) => void): HTMLImageElement | null {
  const url = pokemonFrontSpriteUrl(pokemonId);
  loadImage(url)
    .then(onLoad)
    .catch(() => {
      /* non-fatal — animation just shows nothing */
    });
  return getCachedImage(url);
}

/** Draw a Pokémon sprite centered on (screenX, screenY), sized like the Fly animation (2 tiles at scale 1). */
export function drawOverworldPokemon(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  screenX: number,
  screenY: number,
  scale: number,
  alpha: number,
): void {
  const size = TILE_SIZE * 2 * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, screenX - size / 2, screenY - size / 2, size, size);
  ctx.restore();
}

export function createPokemonAnim(
  pokemonId: number,
  originTile: { x: number; y: number },
  motion: PokemonAnimMotion,
  path: PathDir[] = [],
): PokemonAnim {
  const steps = path.length === 0 && motion === 'fly' ? DEFAULT_FLY_RISE : path;
  const points = [{ x: originTile.x * TILE_SIZE + TILE_SIZE / 2, y: originTile.y * TILE_SIZE + TILE_SIZE / 2 }];
  for (const dir of steps) {
    const last = points[points.length - 1];
    points.push({ x: last.x + DIR_DELTAS[dir].dx * TILE_SIZE, y: last.y + DIR_DELTAS[dir].dy * TILE_SIZE });
  }
  const anim: PokemonAnim = {
    pokemonId,
    sprite: null,
    motion,
    points,
    phase: 'appear',
    timer: 0,
    x: points[0].x,
    y: points[0].y,
    offsetY: 0,
    scale: 1,
    alpha: 0,
  };
  anim.sprite = loadPokemonSprite(pokemonId, (img) => (anim.sprite = img));
  return anim;
}

/** Advance the animation. Returns true once it has finished. */
export function updatePokemonAnim(a: PokemonAnim, dt: number): boolean {
  a.timer += dt;
  const fly = a.motion === 'fly';

  if (a.phase === 'appear') {
    const p = Math.min(a.timer / APPEAR_S, 1);
    a.alpha = p;
    if (fly) a.offsetY = -p * TILE_SIZE * 0.5; // lift off the ground
    if (p >= 1) {
      a.phase = a.points.length > 1 ? 'move' : 'vanish';
      a.timer = 0;
    }
  } else if (a.phase === 'move') {
    const segments = a.points.length - 1;
    const total = segments * TILE_DURATION[a.motion];
    const p = Math.min(a.timer / total, 1);
    const pos = p * segments;
    const i = Math.min(Math.floor(pos), segments - 1);
    const t = pos - i;
    a.x = a.points[i].x + (a.points[i + 1].x - a.points[i].x) * t;
    a.y = a.points[i].y + (a.points[i + 1].y - a.points[i].y) * t;
    if (fly) {
      a.offsetY = -TILE_SIZE * (0.5 + p * 1.5); // keeps climbing
      a.scale = 1 - p * 0.4; // 1 → 0.6, flying away
    } else if (a.motion === 'surf') {
      a.offsetY = Math.sin(a.timer * 8) * 1; // gentle bob
    }
    if (p >= 1) {
      a.phase = 'vanish';
      a.timer = 0;
    }
  } else if (a.phase === 'vanish') {
    const p = Math.min(a.timer / VANISH_S, 1);
    a.alpha = 1 - p;
    if (fly) a.scale = Math.max(0.3, a.scale - dt);
    if (p >= 1) a.phase = 'done';
  }
  return a.phase === 'done';
}
