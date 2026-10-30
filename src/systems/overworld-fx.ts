/**
 * Overworld particle effects — fire, smoke, hit bursts and an Unown storm drawn on the map.
 * Used by the `fx` cutscene step (e.g. a scripted fight between two NPCs, the Unown ambush).
 * Particles are plain pixel squares in world coordinates, so they scroll with the camera.
 */

import { TILE_SIZE } from '../engine/config.js';

export type OverworldFxKind = 'fire' | 'smoke' | 'burst' | 'rain' | 'unown';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  /** Unown only: the letter, its orbit around the center (angle in radians, distance in pixels) and turn speed. */
  glyph?: string;
  angle?: number;
  dist?: number;
  spin?: number;
}

export interface OverworldFx {
  kind: OverworldFxKind;
  /** Effect center in world pixels. */
  cx: number;
  cy: number;
  /** Spawn radius in world pixels. */
  radius: number;
  timer: number;
  durationS: number;
  spawnAcc: number;
  particles: Particle[];
}

/** Particles spawned per second, per tile of radius. */
const SPAWN_RATE: Record<OverworldFxKind, number> = { fire: 70, smoke: 18, burst: 0, rain: 40, unown: 5 };
const BURST_COUNT = 28;

const FIRE_COLORS = ['#fff3a0', '#ffd23f', '#ff9f1c', '#f25c05', '#c22a00'];
const SMOKE_COLORS = ['#8a8a8a', '#6e6e6e', '#555555'];
const BURST_COLORS = ['#ffffff', '#fff3a0', '#ffb347', '#ff7b00'];
const RAIN_COLOR = '#9ec9ff';
const UNOWN_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ?!';
/** Glitch stripes across the storm: how many, and how far they reach each side of the center (world pixels). */
const UNOWN_STRIPES = 5;
const UNOWN_STRIPE_REACH = 140;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function spawnParticle(fx: OverworldFx): Particle {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * fx.radius;
  const x = fx.cx + Math.cos(angle) * dist;
  const y = fx.cy + Math.sin(angle) * dist * 0.5; // flatter spread — reads as "on the ground"
  if (fx.kind === 'fire') {
    const maxLife = rand(0.35, 0.75);
    return { x, y, vx: rand(-6, 6), vy: rand(-38, -20), life: maxLife, maxLife, size: rand(2, 4) };
  }
  if (fx.kind === 'unown') {
    // A letter enters at the rim and spirals into the center
    const maxLife = rand(1.1, 1.7);
    const spin = (Math.random() < 0.5 ? -1 : 1) * rand(2.5, 4.5);
    const glyph = UNOWN_GLYPHS[Math.floor(Math.random() * UNOWN_GLYPHS.length)];
    return { x, y, vx: 0, vy: 0, life: maxLife, maxLife, size: rand(6, 9), glyph, angle, dist: fx.radius * 1.6, spin };
  }
  if (fx.kind === 'rain') {
    // Drops start anywhere in a square above the area and fall diagonally through it
    const maxLife = rand(0.45, 0.7);
    return {
      x: fx.cx + rand(-fx.radius, fx.radius),
      y: fx.cy + rand(-fx.radius, fx.radius) - fx.radius * 0.6,
      vx: -40,
      vy: 190,
      life: maxLife,
      maxLife,
      size: rand(3, 5),
    };
  }
  // smoke
  const maxLife = rand(0.9, 1.6);
  return { x, y: y - TILE_SIZE * 0.5, vx: rand(-5, 5), vy: rand(-16, -8), life: maxLife, maxLife, size: rand(3, 5) };
}

/**
 * Create an effect centered on a tile.
 *   radiusTiles — how wide the effect spreads (default 1 tile)
 */
export function createOverworldFx(
  kind: OverworldFxKind,
  tile: { x: number; y: number },
  durationMs: number,
  radiusTiles = 1,
): OverworldFx {
  const fx: OverworldFx = {
    kind,
    cx: tile.x * TILE_SIZE + TILE_SIZE / 2,
    cy: tile.y * TILE_SIZE + TILE_SIZE / 2,
    radius: Math.max(2, radiusTiles * TILE_SIZE * 0.6),
    timer: 0,
    durationS: durationMs / 1000,
    spawnAcc: 0,
    particles: [],
  };
  if (kind === 'burst') {
    for (let i = 0; i < BURST_COUNT; i++) {
      const angle = (i / BURST_COUNT) * Math.PI * 2 + rand(-0.15, 0.15);
      const speed = rand(40, 90) * radiusTiles;
      const maxLife = rand(0.25, 0.45);
      fx.particles.push({
        x: fx.cx,
        y: fx.cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        size: rand(2, 3),
      });
    }
  }
  return fx;
}

/** Advance the effect. Returns true once it has finished and every particle has faded. */
export function updateOverworldFx(fx: OverworldFx, dt: number): boolean {
  fx.timer += dt;
  if (fx.timer < fx.durationS && SPAWN_RATE[fx.kind] > 0) {
    fx.spawnAcc += dt * SPAWN_RATE[fx.kind] * Math.max(1, fx.radius / (TILE_SIZE * 0.6));
    while (fx.spawnAcc >= 1) {
      fx.particles.push(spawnParticle(fx));
      fx.spawnAcc -= 1;
    }
  }
  for (const p of fx.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (fx.kind === 'burst') {
      p.vx *= 0.9;
      p.vy *= 0.9;
    }
    if (fx.kind === 'unown') {
      p.angle! += p.spin! * dt;
      p.dist = fx.radius * 1.6 * (p.life / p.maxLife);
      p.x = fx.cx + Math.cos(p.angle!) * p.dist;
      p.y = fx.cy + Math.sin(p.angle!) * p.dist * 0.7;
    }
  }
  fx.particles = fx.particles.filter((p) => p.life > 0);
  return fx.timer >= fx.durationS && fx.particles.length === 0;
}

function pickColor(colors: string[], t: number): string {
  return colors[Math.min(colors.length - 1, Math.floor(t * colors.length))];
}

/** Same hue for the same letter (as the English games' Unown tiles). */
function glyphHue(glyph: string): number {
  return ((glyph.charCodeAt(0) - 65) * 47 + 250) % 360;
}

/** The Unown storm: flickering glitch stripes, then each letter with its eye. */
function drawUnownStorm(ctx: CanvasRenderingContext2D, fx: OverworldFx, camX: number, camY: number): void {
  const live = fx.timer < fx.durationS;
  if (live) {
    for (let i = 0; i < UNOWN_STRIPES; i++) {
      if (Math.random() < 0.5) continue;
      ctx.globalAlpha = rand(0.12, 0.3);
      ctx.fillStyle = Math.random() < 0.5 ? '#ff2fd1' : '#2fe6ff';
      const y = fx.cy - camY + rand(-fx.radius * 1.4, fx.radius * 1.4);
      ctx.fillRect(Math.round(fx.cx - camX - UNOWN_STRIPE_REACH), Math.round(y), UNOWN_STRIPE_REACH * 2, rand(1, 3));
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 1.5;
  for (const p of fx.particles) {
    const t = 1 - p.life / p.maxLife;
    const sx = p.x - camX + (Math.random() < 0.08 ? rand(-2, 2) : 0); // a glitchy twitch now and then
    const sy = p.y - camY;
    ctx.globalAlpha = Math.min(1, t * 4, (1 - t) * 3);
    ctx.font = `bold ${Math.round(p.size)}px monospace`;
    ctx.strokeStyle = '#140a24';
    ctx.strokeText(p.glyph!, sx, sy);
    ctx.fillStyle = `hsl(${glyphHue(p.glyph!)}, 85%, 65%)`;
    ctx.fillText(p.glyph!, sx, sy);
    // The eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, p.size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#140a24';
    ctx.beginPath();
    ctx.arc(sx, sy, p.size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw the effect. camX/camY are the camera offset in world pixels. */
export function drawOverworldFx(ctx: CanvasRenderingContext2D, fx: OverworldFx, camX: number, camY: number): void {
  ctx.save();
  if (fx.kind === 'unown') {
    drawUnownStorm(ctx, fx, camX, camY);
    ctx.restore();
    return;
  }
  for (const p of fx.particles) {
    const t = 1 - p.life / p.maxLife; // 0 = just born, 1 = about to die
    let size = p.size;
    if (fx.kind === 'fire') {
      ctx.fillStyle = pickColor(FIRE_COLORS, t);
      ctx.globalAlpha = 1 - t * 0.6;
      size = p.size * (1 - t * 0.6);
    } else if (fx.kind === 'smoke') {
      ctx.fillStyle = pickColor(SMOKE_COLORS, t);
      ctx.globalAlpha = 0.55 * (1 - t);
      size = p.size * (1 + t * 1.5);
    } else if (fx.kind === 'rain') {
      // A thin slanted streak: one column of pixels, `size` tall
      ctx.fillStyle = RAIN_COLOR;
      ctx.globalAlpha = 0.7;
      const sx = Math.round(p.x - camX);
      const sy = Math.round(p.y - camY);
      for (let i = 0; i < p.size; i++) ctx.fillRect(sx + Math.round(i * -0.2), sy + i, 1, 1);
      continue;
    } else {
      ctx.fillStyle = pickColor(BURST_COLORS, t);
      ctx.globalAlpha = 1 - t;
    }
    const s = Math.max(1, Math.round(size));
    ctx.fillRect(Math.round(p.x - camX - s / 2), Math.round(p.y - camY - s / 2), s, s);
  }
  // Burst: a quick white flash ring at the center
  if (fx.kind === 'burst' && fx.timer < 0.15) {
    ctx.globalAlpha = 0.6 * (1 - fx.timer / 0.15);
    ctx.fillStyle = '#ffffff';
    const r = TILE_SIZE * 0.6;
    ctx.fillRect(Math.round(fx.cx - camX - r), Math.round(fx.cy - camY - r), r * 2, r * 2);
  }
  ctx.restore();
}
