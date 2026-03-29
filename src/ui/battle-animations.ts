/**
 * BattleAnimations - Visual effects for battle: flash, shake, fade, damage numbers.
 */

import { fillRect, drawText } from '../engine/renderer.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';

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

// --- Level-Up Sparkle Effect ---

interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface LevelUpEffect {
  active: boolean;
  timer: number;
  duration: number;
  sparkles: Sparkle[];
  glowAlpha: number;
  originX: number;
  originY: number;
}

interface CaptureSuccessEffect {
  active: boolean;
  timer: number;
  duration: number;
  sparkles: Sparkle[];
  originX: number;
  originY: number;
}

interface SendOutEffect {
  active: boolean;
  timer: number;
  duration: number;
  originX: number;
  originY: number;
  fillColor: string;
  ringColor: string;
}

export type AttackEffectKind = 'projectile' | 'beam' | 'pulse' | 'burst';

interface AttackEffect {
  active: boolean;
  timer: number;
  duration: number;
  kind: AttackEffectKind;
  color: string;
  accentColor: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

interface StatusTurnEffect {
  active: boolean;
  timer: number;
  duration: number;
  status: string;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

const SPARKLE_COLORS = ['#ffd700', '#fff176', '#ffab00', '#ffffff', '#ffe082'];

function createSparkleBurst(
  originX: number,
  originY: number,
  count: number,
  options: {
    spreadX: number;
    spreadY: number;
    minSpeed: number;
    maxSpeed: number;
    upwardBias: number;
    minLife: number;
    maxLife: number;
    minSize: number;
    maxSize: number;
  },
): Sparkle[] {
  const sparkles: Sparkle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const speed = options.minSpeed + Math.random() * (options.maxSpeed - options.minSpeed);
    sparkles.push({
      x: originX + (Math.random() - 0.5) * options.spreadX,
      y: originY + (Math.random() - 0.5) * options.spreadY,
      vx: Math.cos(angle) * speed * 0.4,
      vy: Math.sin(angle) * speed * 0.3 - options.upwardBias,
      life: options.minLife + Math.random() * (options.maxLife - options.minLife),
      maxLife: options.minLife + Math.random() * (options.maxLife - options.minLife),
      size: options.minSize + Math.random() * (options.maxSize - options.minSize),
      color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
    });
  }
  return sparkles;
}

function updateSparkles(sparkles: Sparkle[], dt: number): void {
  for (const s of sparkles) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 20 * dt;
    s.life -= dt;
  }
}

function renderSparkles(ctx: CanvasRenderingContext2D, sparkles: Sparkle[]): void {
  for (const s of sparkles) {
    if (s.life <= 0) continue;
    const alpha = Math.min(1, s.life / (s.maxLife * 0.3));
    ctx.save();
    ctx.globalAlpha = alpha;
    const sz = s.size * (0.5 + 0.5 * (s.life / s.maxLife));
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - sz);
    ctx.lineTo(s.x + sz * 0.6, s.y);
    ctx.lineTo(s.x, s.y + sz);
    ctx.lineTo(s.x - sz * 0.6, s.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function createLevelUpEffect(xBarX: number, xBarY: number): LevelUpEffect {
  const sparkles = createSparkleBurst(xBarX + 27, xBarY, 24, {
    spreadX: 54,
    spreadY: 4,
    minSpeed: 15,
    maxSpeed: 45,
    upwardBias: 12,
    minLife: 0.6,
    maxLife: 1.1,
    minSize: 1,
    maxSize: 2.5,
  });
  return { active: true, timer: 0, duration: 1.2, sparkles, glowAlpha: 1, originX: xBarX, originY: xBarY };
}

export function updateLevelUpEffect(effect: LevelUpEffect, dt: number): void {
  if (!effect.active) return;
  effect.timer += dt;
  if (effect.timer >= effect.duration) { effect.active = false; return; }

  effect.glowAlpha = Math.max(0, 1 - effect.timer / 0.4); // glow fades in first 0.4s

  updateSparkles(effect.sparkles, dt);
}

export function renderLevelUpEffect(ctx: CanvasRenderingContext2D, effect: LevelUpEffect): void {
  if (!effect.active) return;

  // Golden glow over XP bar area
  if (effect.glowAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = effect.glowAlpha * 0.35;
    fillRect(ctx, effect.originX - 2, effect.originY - 8, 60, 14, '#ffd700');
    ctx.globalAlpha = effect.glowAlpha * 0.15;
    fillRect(ctx, effect.originX - 6, effect.originY - 14, 68, 24, '#fff176');
    ctx.restore();
  }

  renderSparkles(ctx, effect.sparkles);
}

export function createCaptureSuccessEffect(originX: number, originY: number): CaptureSuccessEffect {
  return {
    active: true,
    timer: 0,
    duration: 0.9,
    sparkles: createSparkleBurst(originX, originY - 2, 18, {
      spreadX: 8,
      spreadY: 6,
      minSpeed: 14,
      maxSpeed: 30,
      upwardBias: 8,
      minLife: 0.35,
      maxLife: 0.75,
      minSize: 1,
      maxSize: 2.2,
    }),
    originX,
    originY,
  };
}

export function updateCaptureSuccessEffect(effect: CaptureSuccessEffect, dt: number): void {
  if (!effect.active) return;
  effect.timer += dt;
  if (effect.timer >= effect.duration) {
    effect.active = false;
    return;
  }
  updateSparkles(effect.sparkles, dt);
}

export function renderCaptureSuccessEffect(ctx: CanvasRenderingContext2D, effect: CaptureSuccessEffect): void {
  if (!effect.active) return;

  const pulse = 1 - (effect.timer / effect.duration);
  ctx.save();
  ctx.globalAlpha = pulse * 0.35;
  ctx.fillStyle = '#fff6b0';
  ctx.beginPath();
  ctx.arc(effect.originX, effect.originY, 10 + pulse * 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  renderSparkles(ctx, effect.sparkles);
}

export function createSendOutEffect(
  originX: number,
  originY: number,
  fillColor = '#ff5a5a',
  ringColor = '#ffd6d6',
): SendOutEffect {
  return {
    active: true,
    timer: 0,
    duration: 0.5,
    originX,
    originY,
    fillColor,
    ringColor,
  };
}

export function updateSendOutEffect(effect: SendOutEffect, dt: number): void {
  if (!effect.active) return;
  effect.timer += dt;
  if (effect.timer >= effect.duration) {
    effect.active = false;
    return;
  }
}

export function renderSendOutEffect(ctx: CanvasRenderingContext2D, effect: SendOutEffect): void {
  if (!effect.active) return;

  const t = effect.timer / effect.duration;
  const alpha = Math.max(0, 1 - t);
  const innerR = 8 + t * 10;
  const outerR = 14 + t * 18;

  ctx.save();
  ctx.globalAlpha = alpha * 0.32;
  ctx.fillStyle = effect.fillColor;
  ctx.beginPath();
  ctx.arc(effect.originX, effect.originY, outerR, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = effect.ringColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(effect.originX, effect.originY, innerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function createAttackEffect(options: {
  kind: AttackEffectKind;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  color: string;
  accentColor?: string;
  duration?: number;
}): AttackEffect {
  const defaultDuration = options.kind === 'beam' ? 0.2 : options.kind === 'pulse' ? 0.3 : 0.34;
  return {
    active: true,
    timer: 0,
    duration: options.duration ?? defaultDuration,
    kind: options.kind,
    color: options.color,
    accentColor: options.accentColor ?? '#ffffff',
    sourceX: options.sourceX,
    sourceY: options.sourceY,
    targetX: options.targetX,
    targetY: options.targetY,
  };
}

export function updateAttackEffect(effect: AttackEffect, dt: number): void {
  if (!effect.active) return;
  effect.timer += dt;
  if (effect.timer >= effect.duration) {
    effect.active = false;
  }
}

function renderProjectileEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = Math.max(0, Math.min(1, effect.timer / effect.duration));
  const eased = 1 - Math.pow(1 - t, 2);
  const x = effect.sourceX + (effect.targetX - effect.sourceX) * eased;
  const yBase = effect.sourceY + (effect.targetY - effect.sourceY) * eased;
  const arc = Math.sin(eased * Math.PI) * 12;
  const y = yBase - arc;

  for (let i = 0; i < 3; i++) {
    const trailT = Math.max(0, eased - i * 0.12);
    const tx = effect.sourceX + (effect.targetX - effect.sourceX) * trailT;
    const ty = effect.sourceY + (effect.targetY - effect.sourceY) * trailT - Math.sin(trailT * Math.PI) * 12;
    ctx.save();
    ctx.globalAlpha = 0.18 + (1 - i * 0.28);
    ctx.fillStyle = i === 0 ? effect.accentColor : effect.color;
    ctx.beginPath();
    ctx.arc(tx, ty, 4 - i, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = effect.color;
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = effect.accentColor;
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderBeamEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = Math.max(0, Math.min(1, effect.timer / effect.duration));
  const alpha = t < 0.45 ? t / 0.45 : Math.max(0, 1 - (t - 0.45) / 0.55);

  ctx.save();
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = effect.color;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(effect.sourceX, effect.sourceY);
  ctx.lineTo(effect.targetX, effect.targetY);
  ctx.stroke();

  ctx.globalAlpha = alpha * 0.95;
  ctx.strokeStyle = effect.accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(effect.sourceX, effect.sourceY);
  ctx.lineTo(effect.targetX, effect.targetY);
  ctx.stroke();
  ctx.restore();
}

function renderPulseEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = Math.max(0, Math.min(1, effect.timer / effect.duration));
  const radius = 6 + t * 18;
  const alpha = Math.max(0, 1 - t);

  ctx.save();
  ctx.globalAlpha = alpha * 0.2;
  ctx.fillStyle = effect.color;
  ctx.beginPath();
  ctx.arc(effect.targetX, effect.targetY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.8;
  ctx.strokeStyle = effect.accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(effect.targetX, effect.targetY, radius * 0.75, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function renderBurstEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = Math.max(0, Math.min(1, effect.timer / effect.duration));
  const radius = 4 + t * 18;
  const alpha = Math.max(0, 1 - t);

  ctx.save();
  ctx.globalAlpha = alpha * 0.22;
  ctx.fillStyle = effect.color;
  ctx.beginPath();
  ctx.arc(effect.targetX, effect.targetY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.95;
  ctx.strokeStyle = effect.accentColor;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 + t * 0.5;
    const inner = radius * 0.45;
    const outer = radius + 6;
    ctx.beginPath();
    ctx.moveTo(effect.targetX + Math.cos(angle) * inner, effect.targetY + Math.sin(angle) * inner);
    ctx.lineTo(effect.targetX + Math.cos(angle) * outer, effect.targetY + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderAttackEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  if (!effect.active) return;

  switch (effect.kind) {
    case 'projectile':
      renderProjectileEffect(ctx, effect);
      break;
    case 'beam':
      renderBeamEffect(ctx, effect);
      break;
    case 'pulse':
      renderPulseEffect(ctx, effect);
      break;
    case 'burst':
      renderBurstEffect(ctx, effect);
      break;
  }
}

export function createStatusTurnEffect(
  status: string,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): StatusTurnEffect {
  return {
    active: true,
    timer: 0,
    duration: 0.75,
    status,
    centerX,
    centerY,
    width,
    height,
  };
}

export function updateStatusTurnEffect(effect: StatusTurnEffect, dt: number): void {
  if (!effect.active) return;
  effect.timer += dt;
  if (effect.timer >= effect.duration) {
    effect.active = false;
  }
}

function renderBurnStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  const pulse = 0.75 + Math.sin(effect.timer * 18) * 0.15;
  ctx.save();
  ctx.globalAlpha = fade * 0.2;
  ctx.fillStyle = '#ff7a3d';
  ctx.beginPath();
  ctx.ellipse(effect.centerX, effect.centerY + (effect.height * 0.15), effect.width * 0.28, effect.height * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    const flameX = effect.centerX + ((i - 1) * effect.width * 0.16);
    const flameY = effect.centerY + (effect.height * 0.18) - Math.sin((effect.timer * 12) + i) * 2;
    const flameH = effect.height * (0.18 + i * 0.02) * pulse;
    const flameW = effect.width * 0.1;
    ctx.globalAlpha = fade * (0.42 - i * 0.06);
    ctx.fillStyle = i === 1 ? '#ffd27a' : '#ff5c3d';
    ctx.beginPath();
    ctx.moveTo(flameX, flameY - flameH);
    ctx.lineTo(flameX + flameW, flameY + flameH * 0.2);
    ctx.lineTo(flameX, flameY + flameH * 0.5);
    ctx.lineTo(flameX - flameW, flameY + flameH * 0.2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function renderPoisonStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const phase = ((effect.timer * 1.8) + (i * 0.18)) % 1;
    const x = effect.centerX - (effect.width * 0.16) + (i * effect.width * 0.11);
    const y = effect.centerY + (effect.height * 0.18) - (phase * effect.height * 0.45);
    const radius = 2 + ((1 - phase) * 2);
    ctx.globalAlpha = fade * (0.24 + ((1 - phase) * 0.18));
    ctx.fillStyle = i % 2 === 0 ? '#a86cf0' : '#d080f0';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderParalyzeStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  ctx.save();
  ctx.globalAlpha = fade * 0.85;
  ctx.strokeStyle = '#ffd84a';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const startX = effect.centerX - (effect.width * 0.22) + (i * effect.width * 0.22);
    const startY = effect.centerY - (effect.height * 0.18) + Math.sin((effect.timer * 14) + i) * 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + 3, startY + 5);
    ctx.lineTo(startX - 1, startY + 5);
    ctx.lineTo(startX + 4, startY + 11);
    ctx.stroke();
  }
  ctx.restore();
}

function renderSleepStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  const chars = ['Z', 'z', 'z'];
  ctx.save();
  for (let i = 0; i < chars.length; i++) {
    const phase = ((effect.timer * 1.4) + (i * 0.16)) % 1;
    const x = effect.centerX + (effect.width * 0.08) + (i * 5);
    const y = effect.centerY - (effect.height * 0.34) - (phase * 10);
    ctx.globalAlpha = fade * (0.35 + ((1 - phase) * 0.35));
    drawText(ctx, chars[i], x, y, {
      size: 6 - i,
      color: '#d8dcff',
      align: 'center',
      direction: 'ltr',
    });
  }
  ctx.restore();
}

function renderFreezeStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  const blocks = [
    { x: -0.22, y: -0.15, w: 0.16, h: 0.2 },
    { x: -0.02, y: 0.05, w: 0.18, h: 0.22 },
    { x: 0.16, y: -0.08, w: 0.14, h: 0.18 },
  ];

  ctx.save();
  ctx.globalAlpha = fade * 0.16;
  ctx.fillStyle = '#8fe6ff';
  ctx.beginPath();
  ctx.ellipse(effect.centerX, effect.centerY, effect.width * 0.34, effect.height * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const block of blocks) {
    const x = effect.centerX + (effect.width * block.x);
    const y = effect.centerY + (effect.height * block.y);
    const w = effect.width * block.w;
    const h = effect.height * block.h;
    ctx.globalAlpha = fade * 0.42;
    ctx.fillStyle = '#bff6ff';
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = fade * 0.9;
    ctx.strokeStyle = '#e8ffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }
  ctx.restore();
}

export function renderStatusTurnEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect): void {
  if (!effect.active) return;

  const fade = Math.max(0, 1 - (effect.timer / effect.duration));
  switch (effect.status) {
    case 'burn':
      renderBurnStatusEffect(ctx, effect, fade);
      break;
    case 'poison':
      renderPoisonStatusEffect(ctx, effect, fade);
      break;
    case 'paralyze':
      renderParalyzeStatusEffect(ctx, effect, fade);
      break;
    case 'sleep':
      renderSleepStatusEffect(ctx, effect, fade);
      break;
    case 'freeze':
      renderFreezeStatusEffect(ctx, effect, fade);
      break;
  }
}

// --- Convenience: Clear all effects ---

export function clearAllPopups(): void {
  popups.length = 0;
}
