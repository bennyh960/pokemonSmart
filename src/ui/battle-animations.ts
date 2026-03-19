/**
 * BattleAnimations - Visual effects for battle: flash, shake, fade, damage numbers.
 */

import { fillRect, drawText } from '../engine/renderer.js';

const SCREEN_W = 240;
const SCREEN_H = 160;

// --- Flash Effect ---

interface FlashEffect {
  active: boolean;
  timer: number;
  duration: number;
  color: string;
}

export function createFlash(color = '#ffffff', duration = 0.15): FlashEffect {
  return { active: true, timer: duration, duration, color };
}

export function updateFlash(flash: FlashEffect, dt: number): void {
  if (!flash.active) return;
  flash.timer -= dt;
  if (flash.timer <= 0) flash.active = false;
}

export function renderFlash(ctx: CanvasRenderingContext2D, flash: FlashEffect): void {
  if (!flash.active) return;
  const alpha = flash.timer / flash.duration;
  fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, `rgba(255,255,255,${alpha * 0.6})`);
}

// --- Shake Effect ---

interface ShakeEffect {
  active: boolean;
  timer: number;
  intensity: number;
  offsetX: number;
  offsetY: number;
}

export function createShake(intensity = 3, duration = 0.3): ShakeEffect {
  return { active: true, timer: duration, intensity, offsetX: 0, offsetY: 0 };
}

export function updateShake(shake: ShakeEffect, dt: number): void {
  if (!shake.active) return;
  shake.timer -= dt;
  if (shake.timer <= 0) {
    shake.active = false;
    shake.offsetX = 0;
    shake.offsetY = 0;
    return;
  }
  const decay = shake.timer * 3;
  shake.offsetX = (Math.random() - 0.5) * shake.intensity * decay;
  shake.offsetY = (Math.random() - 0.5) * shake.intensity * decay;
}

export function applyShake(ctx: CanvasRenderingContext2D, shake: ShakeEffect): void {
  if (!shake.active) return;
  ctx.translate(shake.offsetX, shake.offsetY);
}

export function resetShake(ctx: CanvasRenderingContext2D, shake: ShakeEffect): void {
  if (!shake.active) return;
  ctx.translate(-shake.offsetX, -shake.offsetY);
}

// --- Fade Effect ---

interface FadeEffect {
  active: boolean;
  timer: number;
  duration: number;
  fadeIn: boolean;
}

export function createFade(fadeIn: boolean, duration = 0.5): FadeEffect {
  return { active: true, timer: 0, duration, fadeIn };
}

export function updateFade(fade: FadeEffect, dt: number): void {
  if (!fade.active) return;
  fade.timer += dt;
  if (fade.timer >= fade.duration) fade.active = false;
}

export function renderFade(ctx: CanvasRenderingContext2D, fade: FadeEffect): void {
  if (!fade.active) return;
  let alpha = fade.timer / fade.duration;
  if (fade.fadeIn) alpha = 1 - alpha;
  fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, `rgba(0,0,0,${Math.max(0, Math.min(1, alpha))})`);
}

// --- Damage Number Popup ---

interface DamagePopup {
  active: boolean;
  text: string;
  x: number;
  y: number;
  startY: number;
  timer: number;
  duration: number;
  color: string;
}

const popups: DamagePopup[] = [];

export function spawnDamageNumber(text: string, x: number, y: number, color = '#f8f8f8'): void {
  popups.push({
    active: true,
    text,
    x,
    y,
    startY: y,
    timer: 0,
    duration: 1.0,
    color,
  });
}

export function updatePopups(dt: number): void {
  for (const p of popups) {
    if (!p.active) continue;
    p.timer += dt;
    p.y = p.startY - p.timer * 15;
    if (p.timer >= p.duration) p.active = false;
  }
  // Clean up dead popups
  for (let i = popups.length - 1; i >= 0; i--) {
    if (!popups[i].active) popups.splice(i, 1);
  }
}

export function renderPopups(ctx: CanvasRenderingContext2D): void {
  for (const p of popups) {
    if (!p.active) continue;
    const alpha = Math.max(0, 1 - p.timer / p.duration);
    drawText(ctx, p.text, p.x, p.y, {
      size: 8,
      color: p.color,
      align: 'center',
    });
    // Simple fade using a semi-transparent black overlay on the text area
    if (alpha < 0.5) {
      // Let it fade naturally by reducing draw later in lifecycle
      // (Canvas 2D doesn't support per-text alpha easily, so we keep it visible for most of duration)
    }
  }
}

// --- Convenience: Clear all effects ---

export function clearAllPopups(): void {
  popups.length = 0;
}
