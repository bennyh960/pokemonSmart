/**
 * Glitched (NULL-X infected) Pokémon look in battle.
 *
 * Each glitched enemy gets one style for the whole battle, rolled from the odds of
 * how infected it is (`GLITCH_STYLE_ODDS`). Every style tints only the Pokémon's own
 * shape — never a box around it.
 *
 * - zombie    — lurch + buzz, glow, afterimage, floating 0/1 + letters, breaks every ~2 s
 * - vhs       — "tracking error": rows wave/tear sideways, red/cyan split, scanlines
 * - code      — "decompile": a scan line turns it into a body of 0/1, then back
 * - missingno — "block shuffle": square chunks swap places and change colour
 * - static    — "dead channel": TV static inside it, roll band, loses vertical hold
 *
 * Drawn in the caller's coordinates (renderActorImage's centred actor space), so
 * it follows the actor's fade / faint / hit animations.
 */
import type { InfectionLevel, Pokemon } from '../../types/index.js';

export type GlitchStyleId = 'zombie' | 'vhs' | 'code' | 'missingno' | 'static';

/** Infection level → chance (sums to 1) of each style. Wild NPCs + glitched trainers count as critical. */
export const GLITCH_STYLE_ODDS: Record<'low' | 'medium' | 'high' | 'critical', Partial<Record<GlitchStyleId, number>>> = {
  low: { static: 0.5, missingno: 0.4, vhs: 0.1 / 3, zombie: 0.1 / 3, code: 0.1 / 3 },
  medium: { static: 0.2, missingno: 0.2, vhs: 0.5, zombie: 0.05, code: 0.05 },
  high: { static: 0.05, missingno: 0.05, vhs: 0.3, zombie: 0.45, code: 0.15 },
  critical: { code: 0.5, zombie: 0.5 },
};

/** Levels with no odds of their own (a glitched Pokémon on a calm map) use these. */
const FALLBACK_LEVEL = 'low';

export function rollGlitchStyle(level: InfectionLevel | undefined, rand: () => number = Math.random): GlitchStyleId {
  const odds = GLITCH_STYLE_ODDS[level && level in GLITCH_STYLE_ODDS ? (level as keyof typeof GLITCH_STYLE_ODDS) : FALLBACK_LEVEL];
  const entries = Object.entries(odds) as [GlitchStyleId, number][];
  let r = rand();
  for (const [id, p] of entries) {
    if ((r -= p) < 0) return id;
  }
  return entries[entries.length - 1][0];
}

/** One style per Pokémon for the whole battle (and a re-send keeps it). */
const styleByPokemon = new WeakMap<Pokemon, GlitchStyleId>();

export function glitchStyleFor(pokemon: Pokemon, level: InfectionLevel | undefined): GlitchStyleId {
  let style = styleByPokemon.get(pokemon);
  if (!style) styleByPokemon.set(pokemon, (style = rollGlitchStyle(level)));
  return style;
}

// ── Palette ──
const BITS_GREEN = '#39ff6a';
const VOID = '#7b00ff';
const LETTER_PURPLE = '#d08cff';
const SPLIT_A = '#ff2e5b';
const SPLIT_B = '#00e5ff';
const BLOCK_TINTS = [SPLIT_A, SPLIT_B, '#ffe600', '#a45bff'];

const BITS = '0101010110';
const LETTERS = 'NULLXABCDEFGHKMRSTZ';

// ── Helpers ──

/** The image's own shape filled with one colour (cached). */
const tintCache = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();
function tinted(image: HTMLImageElement, color: string): HTMLCanvasElement {
  let byColor = tintCache.get(image);
  if (!byColor) tintCache.set(image, (byColor = new Map()));
  let canvas = byColor.get(color);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const c = canvas.getContext('2d')!;
    c.drawImage(image, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = color;
    c.fillRect(0, 0, canvas.width, canvas.height);
    byColor.set(color, canvas);
  }
  return canvas;
}

/** Alpha mask of the image, to know which cells are inside the Pokémon (cached). */
const alphaCache = new WeakMap<HTMLImageElement, { w: number; h: number; data: Uint8ClampedArray }>();
function isSolid(image: HTMLImageElement, px: number, py: number): boolean {
  let mask = alphaCache.get(image);
  if (!mask) {
    const c = document.createElement('canvas');
    c.width = image.naturalWidth;
    c.height = image.naturalHeight;
    const x = c.getContext('2d')!;
    x.drawImage(image, 0, 0);
    mask = { w: c.width, h: c.height, data: x.getImageData(0, 0, c.width, c.height).data };
    alphaCache.set(image, mask);
  }
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  if (ix < 0 || iy < 0 || ix >= mask.w || iy >= mask.h) return false;
  return mask.data[(iy * mask.w + ix) * 4 + 3] > 128;
}

/** A reusable scratch canvas, cleared. */
const buffers = new Map<string, HTMLCanvasElement>();
function scratch(name: string, w: number, h: number): CanvasRenderingContext2D {
  let b = buffers.get(name);
  if (!b) buffers.set(name, (b = document.createElement('canvas')));
  if (b.width !== w || b.height !== h) {
    b.width = w;
    b.height = h;
  }
  const c = b.getContext('2d')!;
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, w, h);
  c.imageSmoothingEnabled = false;
  return c;
}

/** Cheap deterministic noise in [0, 1). */
function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

type StyleDrawer = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  nowMs: number,
) => void;

// ── Styles ──

const BURST_EVERY_MS = 2100;
const BURST_MS = 170;

const zombie: StyleDrawer = (ctx, image, x, y, w, h, nowMs) => {
  const t = nowMs / 1000;
  const burst = nowMs % BURST_EVERY_MS < BURST_MS;
  const frame = Math.floor(nowMs / 33); // ~30 fps noise, independent of refresh rate

  const lurch = Math.sin(t * 1.7) * 1.4 + Math.sin(t * 3.9) * 0.5;
  const buzz = burst ? 2.5 : 0.6;
  const jx = lurch + (hash(frame) - 0.5) * buzz * 2;
  const jy = (hash(frame + 99) - 0.5) * buzz - Math.abs(Math.sin(t * 1.7)) * 0.8;

  // Afterimage trailing the lurch
  ctx.save();
  ctx.globalAlpha *= 0.28;
  ctx.drawImage(tinted(image, BITS_GREEN), x - jx * 1.8, y + 1, w, h);
  ctx.restore();

  ctx.save();
  ctx.translate(x + w / 2 + jx, y + h / 2 + jy);
  ctx.rotate(Math.sin(t * 1.7) * 0.05);
  const lx = -w / 2;
  const ly = -h / 2;

  if (burst) {
    ctx.save();
    ctx.globalAlpha *= 0.7;
    ctx.drawImage(tinted(image, SPLIT_A), lx + 2.5, ly, w, h);
    ctx.drawImage(tinted(image, SPLIT_B), lx - 2.5, ly, w, h);
    ctx.restore();
    const iw = image.naturalWidth;
    const ih = image.naturalHeight;
    const bands = 7;
    for (let b = 0; b < bands; b++) {
      const shift = hash(frame * 7 + b) < 0.35 ? (hash(frame + b * 13) - 0.5) * 9 : 0;
      ctx.drawImage(image, 0, (ih * b) / bands, iw, ih / bands, lx + shift, ly + (h * b) / bands, w, h / bands);
    }
  } else {
    ctx.drawImage(image, lx, ly, w, h);
  }

  const base = ctx.globalAlpha;
  ctx.globalAlpha = base * (0.22 + 0.14 * Math.sin(t * 4.2));
  ctx.drawImage(tinted(image, VOID), lx, ly, w, h);
  ctx.globalAlpha = base * (0.12 + (burst ? 0.25 : 0));
  ctx.drawImage(tinted(image, BITS_GREEN), lx, ly, w, h);
  ctx.restore();

  drawFloatingChars(ctx, x, y, w, h, nowMs, 9, LETTER_PURPLE);
};

const vhs: StyleDrawer = (ctx, image, x, y, w, h, nowMs) => {
  const t = nowMs / 1000;
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const rows = 23;
  const tear = nowMs % 3000 < 400;
  const tick = Math.floor(nowMs / 50);
  const base = ctx.globalAlpha;

  const drawRows = (src: CanvasImageSource, dx: number, alpha: number): void => {
    ctx.globalAlpha = base * alpha;
    for (let r = 0; r < rows; r++) {
      const wave =
        Math.sin(t * 6 + r * 0.6) * 0.8 + (tear && hash(tick + r) < 0.3 ? (hash(r + tick * 3) - 0.5) * 12 : 0);
      ctx.drawImage(src, 0, (ih * r) / rows, iw, ih / rows + 0.5, x + dx + wave, y + (h * r) / rows, w, h / rows + 0.2);
    }
  };
  const split = tear ? 3 : 1.5;
  drawRows(tinted(image, SPLIT_A), split, 0.55);
  drawRows(tinted(image, SPLIT_B), -split, 0.55);
  drawRows(image, 0, 1);

  // Dark scanlines inside the body, crawling
  const s = scratch('vhs', iw, ih);
  s.drawImage(image, 0, 0);
  s.globalCompositeOperation = 'source-atop';
  s.fillStyle = '#000';
  for (let yy = Math.floor(nowMs / 60) % 2; yy < ih; yy += 3) s.fillRect(0, yy, iw, 1);
  ctx.globalAlpha = base * 0.35;
  ctx.drawImage(s.canvas, x, y, w, h);
  ctx.globalAlpha = base;
};

const code: StyleDrawer = (ctx, image, x, y, w, h, nowMs) => {
  // 0–15%: scan down into code · 15–40%: all code · 40–55%: scan back · rest: normal
  const p = (nowMs % 3200) / 3200;
  let edge = -1;
  let codeAbove = true;
  if (p < 0.15) edge = p / 0.15;
  else if (p < 0.4) edge = 1.01;
  else if (p < 0.55) {
    edge = (p - 0.4) / 0.15;
    codeAbove = false;
  }
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const cell = 4; // source pixels per glyph
  const cols = Math.floor(iw / cell);
  const rows = Math.floor(ih / cell);
  const cw = w / cols;
  const ch = h / rows;
  const isCode = (r: number): boolean => (edge < 0 ? false : codeAbove ? r / rows < edge : r / rows >= edge);
  const base = ctx.globalAlpha;

  for (let r = 0; r < rows; r++) {
    if (!isCode(r)) ctx.drawImage(image, 0, r * cell, iw, cell, x, y + r * ch, w, ch + 0.05);
  }
  ctx.globalAlpha = base * 0.18;
  ctx.drawImage(tinted(image, BITS_GREEN), x, y, w, h);

  ctx.save();
  ctx.font = '3px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tick = Math.floor(nowMs / 120);
  for (let r = 0; r < rows; r++) {
    if (!isCode(r)) continue;
    for (let c = 0; c < cols; c++) {
      if (!isSolid(image, c * cell + cell / 2, r * cell + cell / 2)) continue;
      const v = hash(c * 31 + r * 17 + tick);
      ctx.fillStyle = v < 0.08 ? '#ffffff' : BITS_GREEN;
      ctx.globalAlpha = base * (0.6 + v * 0.4);
      ctx.fillText(v < 0.5 ? '0' : '1', x + c * cw + cw / 2, y + r * ch + ch / 2);
    }
  }
  if (edge >= 0 && edge <= 1) {
    ctx.globalAlpha = base * 0.9;
    ctx.fillStyle = '#b8ffcb';
    ctx.fillRect(x - 4, y + edge * h, w + 8, 1);
  }
  ctx.restore();
  ctx.globalAlpha = base;

  drawFloatingChars(ctx, x, y, w, h, nowMs, 5, BITS_GREEN);
};

const missingno: StyleDrawer = (ctx, image, x, y, w, h, nowMs) => {
  const iw = image.naturalWidth;
  const bs = 16; // block size in source pixels
  const g = Math.floor(iw / bs);
  const phase = Math.floor(nowMs / 380);
  const base = ctx.globalAlpha;

  ctx.drawImage(image, x, y, w, h);
  if (nowMs % 2600 < 1500) {
    const dw = w / g;
    const dh = h / g;
    for (let i = 0; i < 5; i++) {
      const dc = Math.floor(hash(phase * 11 + i) * g);
      const dr = Math.floor(hash(phase * 7 + i * 3) * g);
      const sc = Math.floor(hash(phase * 5 + i * 9) * g);
      const sr = Math.floor(hash(phase * 3 + i * 5) * g);
      // Skip swaps that would only move empty background around
      if (!isSolid(image, dc * bs + bs / 2, dr * bs + bs / 2) && !isSolid(image, sc * bs + bs / 2, sr * bs + bs / 2))
        continue;
      const dx = x + dc * dw;
      const dy = y + dr * dh;
      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, dy, dw, dh);
      ctx.clip();
      ctx.globalAlpha = base * 0.6;
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(dx, dy, dw, dh);
      ctx.globalAlpha = base;
      ctx.drawImage(image, sc * bs, sr * bs, bs, bs, dx, dy, dw, dh);
      ctx.globalAlpha = base * 0.5;
      ctx.drawImage(tinted(image, BLOCK_TINTS[i % BLOCK_TINTS.length]), sc * bs, sr * bs, bs, bs, dx, dy, dw, dh);
      ctx.restore();
    }
  }
  ctx.globalAlpha = base * 0.15;
  ctx.drawImage(tinted(image, VOID), x, y, w, h);
  ctx.globalAlpha = base;
};

const NOISE = 48; // noise texture size
const staticTv: StyleDrawer = (ctx, image, x, y, w, h, nowMs) => {
  const lose = nowMs % 3400 < 260; // loses vertical hold
  const sq = lose ? 0.82 + hash(Math.floor(nowMs / 40)) * 0.1 : 1;
  const dy = y + h * (1 - sq);
  const base = ctx.globalAlpha;

  ctx.drawImage(image, x, dy, w, h * sq);

  const s = scratch('static', NOISE, NOISE);
  const noise = s.createImageData(NOISE, NOISE);
  for (let i = 0; i < NOISE * NOISE; i++) {
    const v = (Math.random() * 255) | 0;
    noise.data[i * 4] = noise.data[i * 4 + 1] = noise.data[i * 4 + 2] = v;
    noise.data[i * 4 + 3] = 255;
  }
  s.putImageData(noise, 0, 0);
  s.fillStyle = 'rgba(255,255,255,0.55)';
  s.fillRect(0, (((nowMs / 1600) % 1.4) - 0.2) * NOISE, NOISE, 5); // roll band
  s.globalCompositeOperation = 'destination-in';
  s.drawImage(image, 0, 0, NOISE, NOISE);

  ctx.globalAlpha = base * 0.42;
  ctx.drawImage(s.canvas, x, dy, w, h * sq);
  if (lose) {
    ctx.globalAlpha = base * 0.5;
    ctx.drawImage(tinted(image, '#ffffff'), x + 1, dy - 2, w, h * sq);
  }
  ctx.globalAlpha = base;
};

const STYLES: Record<GlitchStyleId, StyleDrawer> = { zombie, vhs, code, missingno, static: staticTv };

export function drawGlitchedSprite(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  nowMs: number,
  style: GlitchStyleId,
): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  STYLES[style](ctx, image, x, y, w, h, nowMs);
  ctx.restore();
}

// ── Faint: Pixel Decay ──

/** How long a fainted glitched Pokémon takes to crumble away (seconds). */
export const GLITCH_DECAY_S = 1.3;

const DECAY_CELL = 2; // source pixels per crumb
/** Share of the decay a crumb spends falling after it breaks off. */
const CRUMB_FALL = 0.3;

interface Crumb {
  sx: number;
  sy: number;
  color: string;
  /** Progress (0–1) at which it breaks off — the top crumbles first, with noise. */
  at: number;
}

const crumbCache = new WeakMap<HTMLImageElement, Crumb[]>();
function crumbsOf(image: HTMLImageElement): Crumb[] {
  let crumbs = crumbCache.get(image);
  if (!crumbs) {
    const c = document.createElement('canvas');
    c.width = image.naturalWidth;
    c.height = image.naturalHeight;
    const x = c.getContext('2d')!;
    x.drawImage(image, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    crumbs = [];
    for (let sy = 0; sy < c.height; sy += DECAY_CELL) {
      for (let sx = 0; sx < c.width; sx += DECAY_CELL) {
        const i = (sy * c.width + sx) * 4;
        if (d[i + 3] <= 128) continue;
        const at = (sy / c.height) * 0.45 + hash(sx * 7.3 + sy * 13.1) * 0.5;
        crumbs.push({ sx, sy, color: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`, at: at * (1 - CRUMB_FALL) });
      }
    }
    crumbCache.set(image, crumbs);
  }
  return crumbs;
}

/**
 * A fainted glitched Pokémon falling apart: crumbs break off its body (top first),
 * drop to the ground and fade, while the rest of it shakes and glows.
 * `progress` 0 → 1 over GLITCH_DECAY_S; nothing is drawn at 1.
 */
export function drawGlitchDecay(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  progress: number,
  nowMs: number,
): void {
  if (progress >= 1) return;
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const kx = w / iw;
  const ky = h / ih;
  const crumbs = crumbsOf(image);

  // What is still attached to the body
  const body = scratch('decay', iw, ih);
  body.drawImage(image, 0, 0);
  body.globalCompositeOperation = 'destination-out';
  for (const c of crumbs) if (c.at <= progress) body.fillRect(c.sx, c.sy, DECAY_CELL, DECAY_CELL);
  body.globalCompositeOperation = 'source-atop';
  body.globalAlpha = 0.15 + progress * 0.45; // sicker as it goes
  body.fillStyle = VOID;
  body.fillRect(0, 0, iw, ih);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  const shake = (hash(Math.floor(nowMs / 33)) - 0.5) * (0.6 + progress * 2);
  ctx.drawImage(body.canvas, x + shake, y, w, h);

  // Crumbs falling off
  const crumbSize = Math.max(1, DECAY_CELL * kx);
  for (const c of crumbs) {
    const age = (progress - c.at) / CRUMB_FALL; // 0 → 1 while falling
    if (age < 0 || age >= 1) continue;
    const drift = (hash(c.sx * 3.1 + c.sy) - 0.5) * 6 * age;
    const fx = x + c.sx * kx + drift;
    const fy = y + c.sy * ky + age * age * (h - c.sy * ky + 4);
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = hash(c.sx + c.sy * 5) < 0.2 ? BITS_GREEN : c.color;
    ctx.fillRect(Math.round(fx), Math.round(fy), crumbSize, crumbSize);
  }
  ctx.restore();

  // The last 0/1 escaping, fading out with it
  ctx.save();
  ctx.globalAlpha *= 1 - progress;
  drawFloatingChars(ctx, x, y, w, h, nowMs, 6, LETTER_PURPLE);
  ctx.restore();
}

/** 0/1 (and some English letters) rising around the Pokémon, flickering between characters. */
function drawFloatingChars(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  nowMs: number,
  count: number,
  letterColor: string,
): void {
  const base = ctx.globalAlpha;
  ctx.save();
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < count; i++) {
    const life = 1600 + hash(i) * 1400;
    const offset = hash(i + 50) * life;
    const p = ((nowMs + offset) % life) / life; // 0 → 1 over its life
    const cycle = Math.floor((nowMs + offset) / life); // new spot each life
    const px = x + w / 2 + (hash(i * 3 + cycle) - 0.5) * (w + 10) + Math.sin(p * 6 + i) * 2;
    const py = y + h * 0.9 - p * (h * 0.9 + 6);
    const useLetter = hash(i + cycle * 5) < 0.3;
    const pool = useLetter ? LETTERS : BITS;
    const ch = pool[Math.floor(hash(Math.floor(nowMs / 180) + i * 17) * pool.length)];
    ctx.globalAlpha = base * Math.sin(p * Math.PI) * 0.9;
    ctx.fillStyle = useLetter ? letterColor : BITS_GREEN;
    ctx.fillText(ch, Math.round(px), Math.round(py));
  }
  ctx.restore();
}
