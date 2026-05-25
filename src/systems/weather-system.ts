import type { WeatherConditionId } from '../types/battle-metadata.js';

export type MapClimate = Partial<Record<WeatherConditionId, number>> | null;

const sessionKey = (mapId: string) => `wx:${mapId}`;

export function isDaytime(): boolean {
  // return false; // Force night for testing
  return new Date().getHours() >= 6 && new Date().getHours() < 18;
}

/**
 * Returns the weather rolled for this map, caching the result in sessionStorage
 * so it stays stable while the player moves in/out of buildings.
 * Sun is excluded from the roll at night.
 * Returns null when climate is null (interior) or the roll landed on clear.
 */
export function getMapWeather(mapId: string, climate: MapClimate): WeatherConditionId | null {
  if (!climate) return null;

  const cached = sessionStorage.getItem(sessionKey(mapId));
  if (cached !== null) return (cached as WeatherConditionId) || null;

  const entries = (Object.entries(climate) as [WeatherConditionId, number][]).filter(
    ([type]) => !(type === 'sun' && !isDaytime()),
  );

  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * Math.max(totalWeight, 1);

  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      sessionStorage.setItem(sessionKey(mapId), type);
      return type;
    }
  }

  // Remaining probability = clear
  sessionStorage.setItem(sessionKey(mapId), '');
  return null;
}

/** Dark blue tint overlay for night (only called for outdoor maps). */
export function renderNightOverlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#101828';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Render ambient weather particles over the full overworld screen. */
export function renderOverworldWeather(
  ctx: CanvasRenderingContext2D,
  weatherType: WeatherConditionId,
  now: number,
  W: number,
  H: number,
): void {
  switch (weatherType) {
    case 'rain':
      renderRain(ctx, now, W, H);
      break;
    case 'sandstorm':
      renderSandstorm(ctx, now, W, H);
      break;
    case 'hail':
      renderHail(ctx, now, W, H);
      break;
    case 'sun':
      renderSun(ctx, now, W, H);
      break;
  }
}

function renderRain(ctx: CanvasRenderingContext2D, now: number, W: number, H: number): void {
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#3870b0';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#88c0e8';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 45; i++) {
    const speed = 90 + (i % 4) * 22;
    const x = (i * 31 + now * 18) % W;
    const y = (i * 23 + now * speed) % H;
    const len = 4 + (i % 3) * 2;
    ctx.globalAlpha = 0.25 + (i % 4) * 0.07;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 1, y + len);
    ctx.stroke();
  }
  ctx.restore();
}

function renderSandstorm(ctx: CanvasRenderingContext2D, now: number, W: number, H: number): void {
  ctx.save();

  // Base amber haze
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#c89050';
  ctx.fillRect(0, 0, W, H);

  // Layer 1: large slow dust blobs — give the "wall of sand" depth
  for (let i = 0; i < 7; i++) {
    const speed = 14 + (i % 4) * 7;
    const cx = ((i * 79 + now * speed) % (W + 100)) - 50;
    const cy = ((i * 41) % H) + Math.sin(now * 0.35 + i * 1.4) * 14;
    const rx = 22 + (i % 4) * 13;
    const ry = 7 + (i % 3) * 5;
    ctx.globalAlpha = 0.06 + (i % 4) * 0.022;
    ctx.fillStyle = i % 2 === 0 ? '#d4a060' : '#ba8840';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.sin(now * 0.25 + i * 0.8) * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Layer 2: medium curved streaks (quadratic curves — not straight lines)
  ctx.lineCap = 'round';
  for (let i = 0; i < 28; i++) {
    const speed = 52 + (i % 5) * 15;
    const x0 = ((i * 43 + now * speed) % (W + 40)) - 20;
    const y0 = ((i * 23) % H) + Math.sin(now * 1.3 + i * 0.9) * 4;
    const len = 9 + (i % 4) * 6;
    const dip = Math.sin(now * 2.2 + i * 1.1) * 3.5;
    ctx.globalAlpha = 0.18 + (i % 5) * 0.055;
    ctx.strokeStyle = i % 3 === 0 ? '#e0b870' : i % 3 === 1 ? '#c8984a' : '#d4a858';
    ctx.lineWidth = 0.5 + (i % 3) * 0.25;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + len * 0.55, y0 + dip, x0 + len, y0 + 1.5);
    ctx.stroke();
  }

  // Layer 3: fine fast particles — sand grain texture
  for (let i = 0; i < 55; i++) {
    const speed = 95 + (i % 7) * 16;
    const px = ((i * 31 + now * speed) % (W + 16)) - 8;
    const py = ((i * 17) % H) + Math.sin(now * 2.8 + i * 1.3) * 5;
    const r = 0.35 + (i % 4) * 0.3;
    ctx.globalAlpha = 0.18 + (i % 5) * 0.065;
    ctx.fillStyle = i % 4 === 0 ? '#f0c878' : i % 4 === 1 ? '#d49838' : i % 4 === 2 ? '#c89050' : '#e8b060';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function renderHail(ctx: CanvasRenderingContext2D, now: number, W: number, H: number): void {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#90b8d8';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#d8eeff';
  for (let i = 0; i < 28; i++) {
    const speed = 60 + (i % 4) * 18;
    const x = (i * 37 + now * 22) % W;
    const y = (i * 29 + now * speed) % H;
    const r = 0.9 + (i % 3) * 0.5;
    ctx.globalAlpha = 0.45 + (i % 4) * 0.1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderSun(ctx: CanvasRenderingContext2D, now: number, W: number, H: number): void {
  ctx.save();
  const pulse = 0.06 + Math.sin(now * 1.6) * 0.02;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffd860';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.04 + Math.sin(now * 1.1) * 0.015;
  ctx.fillStyle = '#fff8c0';
  for (let i = 0; i < 5; i++) {
    const baseAngle = Math.PI * 0.55 + i * (Math.PI * 0.12);
    const spread = 0.055;
    const len = 200;
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W + Math.cos(baseAngle - spread) * len, Math.sin(baseAngle - spread) * len);
    ctx.lineTo(W + Math.cos(baseAngle + spread) * len, Math.sin(baseAngle + spread) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
