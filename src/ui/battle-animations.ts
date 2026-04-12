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

export type AttackEffectKind =
  | 'projectile' | 'beam' | 'pulse' | 'burst'
  | 'dragon-aura' | 'flamethrower' | 'leaf-spray' | 'water-flow'
  | 'psychic-wave' | 'rock-throw' | 'rock-slide' | 'fire-blast'
  | 'giga-drain' | 'lightning';

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
  variant?: string;
  seed: number;
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
  variant?: string;
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
    variant: options.variant,
    seed: Math.floor(Math.random() * 99999),
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
    case 'projectile':   renderProjectileEffect(ctx, effect); break;
    case 'beam':         renderBeamEffect(ctx, effect); break;
    case 'pulse':        renderPulseEffect(ctx, effect); break;
    case 'burst':        renderBurstEffect(ctx, effect); break;
    case 'dragon-aura':  renderDragonAuraEffect(ctx, effect); break;
    case 'flamethrower': renderFlamethrowerEffect(ctx, effect); break;
    case 'leaf-spray':   renderLeafSprayEffect(ctx, effect); break;
    case 'water-flow':   renderWaterFlowEffect(ctx, effect); break;
    case 'psychic-wave': renderPsychicWaveEffect(ctx, effect); break;
    case 'rock-throw':   renderRockThrowEffect(ctx, effect); break;
    case 'rock-slide':   renderRockSlideEffect(ctx, effect); break;
    case 'fire-blast':   renderFireBlastEffect(ctx, effect); break;
    case 'giga-drain':   renderGigaDrainEffect(ctx, effect); break;
    case 'lightning':    renderLightningEffect(ctx, effect); break;
  }
}

// =============================================================================
// PRIMITIVE HELPERS
// =============================================================================

/** Simple seeded LCG random number generator — returns same sequence for same seed. */
function seededRng(seed: number): () => number {
  let s = (seed * 1664525 + 1013904223) & 0x7fffffff;
  return (): number => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function drawRockShape(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number, rotation: number,
  rng: () => number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  const numPts = 7;
  ctx.beginPath();
  for (let i = 0; i < numPts; i++) {
    const angle = (Math.PI * 2 * i) / numPts;
    const r = size * (0.65 + rng() * 0.35);
    if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
    else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fillStyle = '#907060';
  ctx.fill();
  ctx.strokeStyle = '#503828';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Highlight chip
  ctx.globalAlpha *= 0.6;
  ctx.fillStyle = '#c8a888';
  ctx.beginPath();
  ctx.ellipse(-size * 0.12, -size * 0.18, size * 0.22, size * 0.12, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLightningPath(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  branchCount: number,
  boltColor: string, glowColor: string,
  alpha: number,
  rng: () => number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const segments = Math.max(4, Math.floor(len / 7));
  const perpX = -dy / len;
  const perpY = dx / len;

  // Build zigzag path
  const pts: [number, number][] = [[x1, y1]];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const bx = x1 + dx * t;
    const by = y1 + dy * t;
    const offset = (rng() - 0.5) * 12;
    pts.push([bx + perpX * offset, by + perpY * offset]);
  }
  pts.push([x2, y2]);

  const drawPath = (lw: number, style: string, a: number): void => {
    ctx.globalAlpha = a;
    ctx.strokeStyle = style;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  };

  ctx.save();
  drawPath(5, glowColor, alpha * 0.25);   // outer glow
  drawPath(1.8, boltColor, alpha);         // main bolt
  drawPath(0.6, '#ffffff', alpha * 0.85);  // white core

  // Branch forks
  for (let b = 0; b < branchCount; b++) {
    const bi = Math.min(pts.length - 2, Math.floor(pts.length * (0.25 + rng() * 0.5)));
    const bLen = 7 + rng() * 9;
    const baseAngle = Math.atan2(dy, dx) + (rng() - 0.5) * Math.PI * 0.65;
    const bx2 = pts[bi][0] + Math.cos(baseAngle) * bLen;
    const by2 = pts[bi][1] + Math.sin(baseAngle) * bLen;
    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = boltColor;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(pts[bi][0], pts[bi][1]);
    ctx.lineTo(bx2, by2);
    ctx.stroke();
  }
  ctx.restore();
}

// =============================================================================
// NEW MOVE RENDER FUNCTIONS
// =============================================================================

// --- Dragon Aura ---
// Phase 0-0.37: Dragon energy aura grows on attacker
// Phase 0.37-0.75: Energy orb snakes toward target
// Phase 0.75-1.0: Explosion at target with dragon spikes

function renderDragonAuraEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;

  let auraColor = '#8855f8';
  let glowColor = '#40d0c0';
  if (effect.variant === 'char-dragon') { auraColor = '#ff6820'; glowColor = '#ffc840'; }
  if (effect.variant === 'dra-dragon')  { auraColor = '#20a8ff'; glowColor = '#88ffff'; }

  const PHASE2 = 0.37;
  const PHASE3 = 0.75;

  ctx.save();

  if (t < PHASE2) {
    const pt = t / PHASE2;
    const rng = seededRng(effect.seed + Math.floor(t * 20));
    const auraR = 5 + pt * 13;

    ctx.globalAlpha = pt * 0.18;
    ctx.fillStyle = auraColor;
    ctx.beginPath();
    ctx.arc(effect.sourceX, effect.sourceY, auraR, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = pt * 0.65;
    ctx.strokeStyle = auraColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(effect.sourceX, effect.sourceY, auraR, 0, Math.PI * 2);
    ctx.stroke();

    // Pulsing secondary ring
    const ring2R = auraR * (1.35 + Math.sin(pt * Math.PI * 5) * 0.08);
    ctx.globalAlpha = pt * 0.30;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(effect.sourceX, effect.sourceY, ring2R, 0, Math.PI * 2);
    ctx.stroke();

    // Dragon tendrils
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 + pt * 1.2;
      const wobble = (rng() - 0.5) * 0.4;
      const tipR = auraR * (1.25 + Math.sin(pt * Math.PI * 3 + i) * 0.12);
      const midR = auraR * 0.55;
      const midAngle = angle + wobble;
      ctx.globalAlpha = pt * 0.7;
      ctx.strokeStyle = glowColor;
      ctx.beginPath();
      ctx.moveTo(effect.sourceX, effect.sourceY);
      ctx.quadraticCurveTo(
        effect.sourceX + Math.cos(midAngle) * midR,
        effect.sourceY + Math.sin(midAngle) * midR,
        effect.sourceX + Math.cos(angle) * tipR,
        effect.sourceY + Math.sin(angle) * tipR,
      );
      ctx.stroke();
    }

  } else if (t < PHASE3) {
    const pt = (t - PHASE2) / (PHASE3 - PHASE2);
    const eased = 1 - Math.pow(1 - pt, 2);
    const dx = effect.targetX - effect.sourceX;
    const dy = effect.targetY - effect.sourceY;
    const len = Math.hypot(dx, dy) || 1;
    const perpX = -dy / len;

    const x = effect.sourceX + dx * eased;
    const snakeAmp = Math.sin(pt * Math.PI) * 4 * Math.sign(perpX || 1);
    const yBase = effect.sourceY + dy * eased;
    const y = yBase + snakeAmp;

    // Trail
    for (let i = 1; i <= 4; i++) {
      const tEased = Math.max(0, eased - i * 0.14);
      const tx = effect.sourceX + dx * tEased;
      const ty = effect.sourceY + dy * tEased;
      ctx.globalAlpha = (0.55 - i * 0.1) * (1 - pt * 0.2);
      ctx.fillStyle = i === 1 ? glowColor : auraColor;
      ctx.beginPath();
      ctx.arc(tx, ty, Math.max(0.5, 4.2 - i * 0.9), 0, Math.PI * 2);
      ctx.fill();
    }

    // Orb
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = auraColor;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Fading aura on source
    ctx.globalAlpha = (1 - pt) * 0.25;
    ctx.strokeStyle = auraColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(effect.sourceX, effect.sourceY, 13, 0, Math.PI * 2);
    ctx.stroke();

  } else {
    const pt = (t - PHASE3) / (1 - PHASE3);
    const rng = seededRng(effect.seed + 1);
    const radius = 5 + pt * 20;
    const alpha = Math.max(0, 1 - pt);

    // Core flash
    ctx.globalAlpha = alpha * 0.28;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Expanding ring
    ctx.globalAlpha = alpha * 0.75;
    ctx.strokeStyle = auraColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Outer ring
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, radius * 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Dragon spikes
    const numSpikes = 8;
    for (let i = 0; i < numSpikes; i++) {
      const angle = (Math.PI * 2 * i) / numSpikes + pt * 0.35;
      const inner = radius * 0.28;
      const outer = radius + 9 + rng() * 5;
      ctx.globalAlpha = alpha * (0.45 + 0.4 * Math.sin(pt * Math.PI * 2 + i));
      ctx.strokeStyle = i % 2 === 0 ? glowColor : auraColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(effect.targetX + Math.cos(angle) * inner, effect.targetY + Math.sin(angle) * inner);
      ctx.lineTo(effect.targetX + Math.cos(angle) * outer, effect.targetY + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// --- Flamethrower ---
// Continuous particle stream from source to target, cone shape.

function renderFlamethrowerEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const dx = effect.targetX - effect.sourceX;
  const dy = effect.targetY - effect.sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const perpX = -uy;
  const perpY = ux;

  const isChar = effect.variant === 'char-fire';
  const coneHalfWidth = isChar ? 9 : 6;
  const numParticles = isChar ? 26 : 19;

  ctx.save();

  for (let i = 0; i < numParticles; i++) {
    const rng = seededRng(effect.seed + i * 7);
    const phaseOffset = rng() * 0.55;
    const pt = (t + phaseOffset) % 1.0;

    const progress = pt * len;
    const px = effect.sourceX + ux * progress;
    const py = effect.sourceY + uy * progress;

    const spreadFrac = progress / len;
    const side = (rng() * 2 - 1) * coneHalfWidth * spreadFrac;
    const fpx = px + perpX * side;
    const fpy = py + perpY * side;

    const heat = 1 - Math.abs(side) / (coneHalfWidth + 0.01);
    const alpha = 0.72 * heat * (1 - pt * 0.45);
    const size = 2.2 + heat * 2.8;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = heat > 0.65 ? '#fff060' : (rng() > 0.4 ? '#ff7020' : '#ff4010');
    ctx.beginPath();
    ctx.arc(fpx, fpy, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bright core beam
  const coreAlpha = Math.min(1, t * 4) * Math.max(0, 1 - (t - 0.75) * 4);
  if (coreAlpha > 0) {
    ctx.globalAlpha = coreAlpha * 0.45;
    ctx.strokeStyle = '#fff8c0';
    ctx.lineWidth = isChar ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(effect.sourceX, effect.sourceY);
    ctx.lineTo(effect.sourceX + ux * len * Math.min(t * 1.8, 1), effect.sourceY + uy * len * Math.min(t * 1.8, 1));
    ctx.stroke();
  }

  ctx.restore();
}

// --- Razor Leaf / Leaf Spray ---
// 5 spinning sharp leaves arc from source to target.

function renderLeafSprayEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const numLeaves = 5;
  const dx = effect.targetX - effect.sourceX;
  const dy = effect.targetY - effect.sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const baseAngle = Math.atan2(dy, dx);

  ctx.save();

  for (let i = 0; i < numLeaves; i++) {
    const rng = seededRng(effect.seed + i * 13);
    const delay = rng() * 0.08;
    const adjT = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
    if (adjT <= 0) continue;

    const eased = 1 - Math.pow(1 - adjT, 2);
    const spreadAngle = (i - (numLeaves - 1) * 0.5) * 0.18;
    const leafAngle = baseAngle + spreadAngle;
    const x = effect.sourceX + Math.cos(leafAngle) * len * eased;
    const y = effect.sourceY + Math.sin(leafAngle) * len * eased;

    const spinDir = rng() > 0.5 ? 1 : -1;
    const spinSpeed = 3 + rng() * 4;
    const pointAngle = leafAngle + adjT * Math.PI * spinSpeed * spinDir;
    const leafSize = 3.5 + rng() * 1.8;
    const alpha = adjT < 0.88 ? 0.92 : (1 - adjT) / 0.12 * 0.92;

    ctx.globalAlpha = alpha;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(pointAngle);

    // Leaf body
    ctx.fillStyle = '#38c838';
    ctx.beginPath();
    ctx.ellipse(0, 0, leafSize * 0.28, leafSize, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark edge
    ctx.strokeStyle = '#1a5820';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Center vein
    ctx.beginPath();
    ctx.moveTo(0, -leafSize);
    ctx.lineTo(0, leafSize);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

// --- Water Gun / Water Flow ---
// Wave-like stream of water droplets with undulating path.

function renderWaterFlowEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const dx = effect.targetX - effect.sourceX;
  const dy = effect.targetY - effect.sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const perpX = -uy;
  const perpY = ux;
  const numDroplets = 22;

  ctx.save();

  for (let i = 0; i < numDroplets; i++) {
    const rng = seededRng(effect.seed + i * 11);
    const phaseOffset = rng() * 0.5;
    const pt = (t + phaseOffset) % 1.0;

    const progress = pt * len;
    const px = effect.sourceX + ux * progress;
    const py = effect.sourceY + uy * progress;

    const waveFreq = 3 + rng() * 2;
    const waveAmp = 2.5 + rng() * 2;
    const wave = Math.sin(pt * Math.PI * waveFreq + rng() * Math.PI * 2) * waveAmp * (progress / len);
    const fpx = px + perpX * wave;
    const fpy = py + perpY * wave;

    const alpha = 0.78 * (1 - pt * 0.35);
    const size = 1.8 + rng() * 1.5;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = rng() > 0.6 ? '#90ccff' : '#3888e8';
    ctx.beginPath();
    ctx.arc(fpx, fpy, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wavy core stream
  const streamAlpha = Math.min(1, t * 5) * Math.max(0, 1 - (t - 0.72) * 3.5);
  if (streamAlpha > 0) {
    ctx.globalAlpha = streamAlpha * 0.5;
    ctx.strokeStyle = '#70b8ff';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const segs = 10;
    for (let s = 0; s <= segs; s++) {
      const sp = s / segs;
      const sx = effect.sourceX + dx * sp;
      const sy = effect.sourceY + dy * sp;
      const wave = Math.sin(sp * Math.PI * 3 + t * 12) * 2.5 * sp;
      if (s === 0) ctx.moveTo(sx + perpX * wave, sy + perpY * wave);
      else ctx.lineTo(sx + perpX * wave, sy + perpY * wave);
    }
    ctx.stroke();
  }

  ctx.restore();
}

// --- Psychic Wave ---
// Phase 1: Rings travel from attacker to target
// Phase 2: Shimmer rings at target

function renderPsychicWaveEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const dx = effect.targetX - effect.sourceX;
  const dy = effect.targetY - effect.sourceY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const travelAngle = Math.atan2(dy, dx);
  const SPLIT = 0.52;

  ctx.save();

  if (t < SPLIT) {
    const pt = t / SPLIT;
    const numRings = 3;
    for (let i = 0; i < numRings; i++) {
      const ringT = (pt + i / numRings) % 1.0;
      if (ringT > 0.96) continue;
      const rx = effect.sourceX + ux * len * ringT;
      const ry = effect.sourceY + uy * len * ringT;
      const ringAlpha = (1 - ringT) * 0.72;
      const ringR = 3.5 + ringT * 7;

      ctx.globalAlpha = ringAlpha;
      ctx.strokeStyle = i % 2 === 0 ? '#e050d8' : '#b070f8';
      ctx.lineWidth = 1.5;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(travelAngle);
      ctx.scale(1, 0.38);
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.restore();
      ctx.stroke();
    }

  } else {
    const pt = (t - SPLIT) / (1 - SPLIT);
    const alpha = Math.max(0, 1 - pt);

    // 3 expanding rings at target
    for (let r = 0; r < 3; r++) {
      const rT = (pt + r * 0.33) % 1.0;
      ctx.globalAlpha = (1 - rT) * alpha * 0.65;
      ctx.strokeStyle = r % 2 === 0 ? '#e050d8' : '#b070f8';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, 3 + rT * 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shimmer fill
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = '#d080f8';
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 12 + pt * 8, 0, Math.PI * 2);
    ctx.fill();

    // Rotating inner spokes
    for (let s = 0; s < 6; s++) {
      const angle = (Math.PI * 2 * s) / 6 + pt * Math.PI;
      ctx.globalAlpha = alpha * 0.4;
      ctx.strokeStyle = '#f080e8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(effect.targetX + Math.cos(angle) * 3, effect.targetY + Math.sin(angle) * 3);
      ctx.lineTo(effect.targetX + Math.cos(angle) * (8 + pt * 10), effect.targetY + Math.sin(angle) * (8 + pt * 10));
      ctx.stroke();
    }
  }

  ctx.restore();
}

// --- Rock Throw ---
// 2 chunky rocks arc toward target, debris on impact.

function renderRockThrowEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const dx = effect.targetX - effect.sourceX;
  const dy = effect.targetY - effect.sourceY;
  const numRocks = 2;

  ctx.save();

  for (let i = 0; i < numRocks; i++) {
    const posRng = seededRng(effect.seed + i * 17);
    const delay = i * 0.10;
    const adjT = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
    if (adjT <= 0) continue;

    const eased = 1 - Math.pow(1 - adjT, 1.6);
    const spreadX = (posRng() - 0.5) * 10;
    const x = effect.sourceX + dx * eased + spreadX * (1 - eased);
    const arcH = 8 + posRng() * 6;
    const y = effect.sourceY + dy * eased - Math.sin(eased * Math.PI) * arcH;
    const rotation = adjT * Math.PI * (2.5 + posRng() * 3) * (posRng() > 0.5 ? 1 : -1);
    const size = 4 + posRng() * 3;

    if (adjT < 0.90) {
      ctx.globalAlpha = Math.min(1, adjT * 5) * 0.92;
      const shapeRng = seededRng(effect.seed + i * 17);
      drawRockShape(ctx, x, y, size, rotation, shapeRng);
    }

    // Impact debris
    if (adjT > 0.82) {
      const debrisT = (adjT - 0.82) / 0.18;
      for (let d = 0; d < 6; d++) {
        const dRng = seededRng(effect.seed + i * 17 + d * 31);
        const angle = dRng() * Math.PI * 2;
        const speed = 5 + dRng() * 8;
        const fx = effect.targetX + Math.cos(angle) * speed * debrisT;
        const fy = effect.targetY + Math.sin(angle) * speed * debrisT + debrisT * 2;
        ctx.globalAlpha = (1 - debrisT) * 0.75;
        ctx.fillStyle = '#a08878';
        ctx.beginPath();
        ctx.arc(fx, fy, 1.2 + dRng() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

// --- Rock Slide ---
// 5 rocks fall from above the target with staggered timing and dust clouds.

function renderRockSlideEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const numRocks = 5;

  ctx.save();

  for (let i = 0; i < numRocks; i++) {
    const posRng = seededRng(effect.seed + i * 23);
    const delay = posRng() * 0.32;
    const adjT = Math.max(0, (t - delay) / (1 - delay));
    if (adjT <= 0) continue;

    const offsetX = (posRng() - 0.5) * 32;
    const startY = effect.targetY - 35 - posRng() * 18;
    const fallT = Math.min(1, adjT * 1.35);
    const eased = fallT * fallT;

    const x = effect.targetX + offsetX;
    const y = startY + (effect.targetY - startY) * eased;
    const rotation = adjT * Math.PI * 1.8 * (posRng() > 0.5 ? 1 : -1);
    const size = 3.5 + posRng() * 4;

    if (fallT < 0.93) {
      ctx.globalAlpha = Math.min(1, adjT * 4) * 0.9;
      const shapeRng = seededRng(effect.seed + i * 23);
      drawRockShape(ctx, x, y, size, rotation, shapeRng);
    }

    // Dust cloud on impact
    if (adjT > 0.65) {
      const dustT = Math.min(1, (adjT - 0.65) / 0.35);
      for (let d = 0; d < 5; d++) {
        const dRng = seededRng(effect.seed + i * 23 + d * 41);
        const angle = -Math.PI * 0.5 + (dRng() - 0.5) * Math.PI;
        const speed = 4 + dRng() * 6;
        const dustX = x + Math.cos(angle) * speed * dustT;
        const dustY = effect.targetY + Math.sin(angle) * speed * dustT - dustT * 3;
        ctx.globalAlpha = (1 - dustT) * 0.5;
        ctx.fillStyle = '#c0a880';
        ctx.beginPath();
        ctx.arc(dustX, dustY, 1.8 + dRng() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

// --- Fire Blast ---
// Traveling fire orb → 5-point star explosion at target.

function renderFireBlastEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const SPLIT = 0.40;
  const isChar = effect.variant === 'char-blast';

  ctx.save();

  if (t < SPLIT) {
    const pt = t / SPLIT;
    const eased = 1 - Math.pow(1 - pt, 2);
    const x = effect.sourceX + (effect.targetX - effect.sourceX) * eased;
    const y = effect.sourceY + (effect.targetY - effect.sourceY) * eased;

    // Main orb
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#ff5818';
    ctx.beginPath();
    ctx.arc(x, y, 5.5 + pt * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#ffd048';
    ctx.beginPath();
    ctx.arc(x, y, 2.8 + pt, 0, Math.PI * 2);
    ctx.fill();

    // Trail
    for (let i = 1; i <= 3; i++) {
      const tEased = Math.max(0, eased - i * 0.14);
      const tx = effect.sourceX + (effect.targetX - effect.sourceX) * tEased;
      const ty = effect.sourceY + (effect.targetY - effect.sourceY) * tEased;
      ctx.globalAlpha = 0.45 - i * 0.12;
      ctx.fillStyle = '#ff7030';
      ctx.beginPath();
      ctx.arc(tx, ty, Math.max(0.5, 4.5 - i), 0, Math.PI * 2);
      ctx.fill();
    }

  } else {
    const pt = (t - SPLIT) / (1 - SPLIT);
    const alpha = Math.max(0, 1 - pt);
    const scale = 1 + pt * 2.8;
    const baseR = 7 * scale;
    const numPoints = isChar ? 6 : 5;
    const rotation = pt * 0.4;

    // Outer fire glow
    ctx.globalAlpha = alpha * 0.22;
    ctx.fillStyle = '#ff3808';
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, baseR * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Star shape
    ctx.fillStyle = isChar ? '#ff8020' : '#ff5818';
    ctx.globalAlpha = alpha * 0.88;
    ctx.beginPath();
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = (Math.PI * i) / numPoints + rotation;
      const r = i % 2 === 0 ? baseR : baseR * 0.40;
      const px = effect.targetX + Math.cos(angle) * r;
      const py = effect.targetY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Bright core
    ctx.globalAlpha = alpha * 0.95;
    ctx.fillStyle = '#fff8a0';
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, baseR * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Scattered sparks
    const rng = seededRng(effect.seed + 2);
    for (let i = 0; i < 9; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = baseR * (0.7 + pt * 0.7) * rng();
      ctx.globalAlpha = alpha * 0.65 * rng();
      ctx.fillStyle = '#ffd060';
      ctx.beginPath();
      ctx.arc(
        effect.targetX + Math.cos(angle) * dist,
        effect.targetY + Math.sin(angle) * dist,
        1 + rng() * 2, 0, Math.PI * 2,
      );
      ctx.fill();
    }
  }

  ctx.restore();
}

// --- Giga Drain ---
// Phase 1: Green tendrils grow from target toward attacker
// Phase 2: Energy orbs travel from target to attacker

function renderGigaDrainEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const SPLIT = 0.50;
  const dx = effect.sourceX - effect.targetX;
  const dy = effect.sourceY - effect.targetY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const perpX = -uy;
  const perpY = ux;
  const numTendrils = 3;

  ctx.save();

  // Target sickly glow throughout
  const glowAlpha = t < SPLIT ? t / SPLIT * 0.22 : (1 - (t - SPLIT) / SPLIT) * 0.22;
  ctx.globalAlpha = glowAlpha;
  ctx.fillStyle = '#40d040';
  ctx.beginPath();
  ctx.arc(effect.targetX, effect.targetY, 14, 0, Math.PI * 2);
  ctx.fill();

  if (t < SPLIT) {
    const pt = t / SPLIT;

    for (let i = 0; i < numTendrils; i++) {
      const rng = seededRng(effect.seed + i * 19);
      const reach = pt * (0.65 + rng() * 0.3);
      const segs = 8;

      ctx.globalAlpha = 0.78 - i * 0.1;
      ctx.strokeStyle = i === 0 ? '#50e050' : '#30a830';
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      for (let s = 0; s <= segs; s++) {
        const sp = (s / segs) * reach;
        const tx = effect.targetX + ux * len * sp;
        const ty = effect.targetY + uy * len * sp;
        const wobble = Math.sin(sp * Math.PI * 4 + t * 14 + i * 2.1) * 4;
        if (s === 0) ctx.moveTo(tx + perpX * wobble, ty + perpY * wobble);
        else ctx.lineTo(tx + perpX * wobble, ty + perpY * wobble);
      }
      ctx.stroke();
    }

  } else {
    const pt = (t - SPLIT) / (1 - SPLIT);

    for (let i = 0; i < numTendrils; i++) {
      const delay = i * 0.12;
      const orbT = Math.max(0, Math.min(1, (pt - delay) / (1 - delay)));
      if (orbT <= 0) continue;

      const eased = 1 - Math.pow(1 - orbT, 2);
      const x = effect.targetX + dx * eased;
      const y = effect.targetY + dy * eased;
      const alpha = orbT < 0.88 ? 0.85 : (1 - orbT) / 0.12 * 0.85;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#60f060';
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.7;
      ctx.fillStyle = '#b0ffb0';
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Absorb glow on source
    const absorbAlpha = Math.min(1, pt * 4) * Math.max(0, 1 - (pt - 0.65) / 0.35);
    if (absorbAlpha > 0) {
      ctx.globalAlpha = absorbAlpha * 0.28;
      ctx.fillStyle = '#40ff40';
      ctx.beginPath();
      ctx.arc(effect.sourceX, effect.sourceY, 8 + pt * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// --- Lightning (Thunderbolt / Thunder) ---
// 'thunder' variant: bolt falls from top of screen
// 'dra-lightning' variant: serpentine with extra branches

function renderLightningEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const isThunder = effect.variant === 'thunder' || effect.variant === 'dra-thunder';
  const isDra = effect.variant === 'dra-lightning';

  // Flickering alpha
  const baseAlpha = t < 0.25 ? t / 0.25 : Math.max(0, 1 - (t - 0.25) / 0.75);
  const flickerSeed = effect.seed + Math.floor(t * 10);
  const rng = seededRng(flickerSeed);

  // Thunder falls from sky directly above target; Thunderbolt travels from attacker
  const bx1 = isThunder ? effect.targetX + (rng() - 0.5) * 6 : effect.sourceX;
  const by1 = isThunder ? 0 : effect.sourceY;

  ctx.save();

  const branches = isDra ? 3 : 2;
  drawLightningPath(ctx, bx1, by1, effect.targetX, effect.targetY, branches,
    '#ffe030', '#88ccff', baseAlpha, rng);

  // Second flicker bolt (dra variant has extra)
  if (isDra && baseAlpha > 0.2) {
    const rng2 = seededRng(flickerSeed + 50);
    drawLightningPath(ctx,
      bx1 + (rng2() - 0.5) * 8, by1,
      effect.targetX + (rng2() - 0.5) * 5, effect.targetY,
      1, '#aaddff', '#4488cc', baseAlpha * 0.45, rng2);
  }

  // Impact flash at target
  if (t > 0.18) {
    const flashT = Math.max(0, 1 - (t - 0.18) * 3.5);
    ctx.globalAlpha = flashT * 0.55;
    ctx.fillStyle = '#fffff0';
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 5 + flashT * 9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Electric sparks radiating from impact
  if (t > 0.15) {
    const sparkAlpha = Math.max(0, 1 - (t - 0.15) / 0.55);
    const sparkRng = seededRng(effect.seed + 77 + Math.floor(t * 14));
    for (let i = 0; i < 5; i++) {
      const angle = sparkRng() * Math.PI * 2;
      const dist = 3 + sparkRng() * 9;
      ctx.globalAlpha = sparkAlpha * 0.8;
      ctx.strokeStyle = '#ffe840';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(effect.targetX, effect.targetY);
      ctx.lineTo(effect.targetX + Math.cos(angle) * dist, effect.targetY + Math.sin(angle) * dist);
      ctx.stroke();
    }
  }

  ctx.restore();
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

function renderConfuseStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const phase = (effect.timer * 2.2) + (i * (Math.PI / 2));
    const orbitX = Math.cos(phase) * effect.width * 0.16;
    const orbitY = Math.sin(phase) * effect.height * 0.12;
    const x = effect.centerX + orbitX;
    const y = effect.centerY - (effect.height * 0.16) + orbitY;
    ctx.globalAlpha = fade * (0.4 + i * 0.08);
    ctx.fillStyle = i % 2 === 0 ? '#ff9cc0' : '#f070c8';
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fade * 0.85;
    ctx.strokeStyle = '#fff2a6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 1.5, y);
    ctx.lineTo(x + 1.5, y);
    ctx.moveTo(x, y - 1.5);
    ctx.lineTo(x, y + 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

function renderSeedStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  ctx.save();
  ctx.globalAlpha = fade * 0.12;
  ctx.strokeStyle = '#7ccf5c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(effect.centerX, effect.centerY + (effect.height * 0.08), effect.width * 0.24, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  for (let i = 0; i < 3; i++) {
    const phase = ((effect.timer * 1.5) + (i * 0.22)) % 1;
    const x = effect.centerX - (effect.width * 0.18) + (i * effect.width * 0.18);
    const y = effect.centerY + (effect.height * 0.18) - (phase * effect.height * 0.38);
    ctx.globalAlpha = fade * (0.28 + ((1 - phase) * 0.22));
    ctx.fillStyle = i === 1 ? '#a8e070' : '#78c850';
    ctx.beginPath();
    ctx.ellipse(x, y, 2.2, 1.5, i === 1 ? -0.6 : 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8f8c8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 2);
    ctx.stroke();
  }
  ctx.restore();
}

function renderTrapStatusEffect(ctx: CanvasRenderingContext2D, effect: StatusTurnEffect, fade: number): void {
  ctx.save();
  ctx.globalAlpha = fade * 0.75;
  ctx.strokeStyle = '#f0a060';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const y = effect.centerY - (effect.height * 0.08) + (i * effect.height * 0.12);
    ctx.beginPath();
    for (let step = 0; step <= 12; step++) {
      const progress = step / 12;
      const x = effect.centerX - (effect.width * 0.24) + (progress * effect.width * 0.48);
      const offsetY = Math.sin((progress * Math.PI * 2) + (effect.timer * 10) + i) * 2.5;
      if (step === 0) {
        ctx.moveTo(x, y + offsetY);
      } else {
        ctx.lineTo(x, y + offsetY);
      }
    }
    ctx.stroke();
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
    case 'confuse':
      renderConfuseStatusEffect(ctx, effect, fade);
      break;
    case 'seed':
      renderSeedStatusEffect(ctx, effect, fade);
      break;
    case 'trap':
      renderTrapStatusEffect(ctx, effect, fade);
      break;
  }
}

// --- Convenience: Clear all effects ---

export function clearAllPopups(): void {
  popups.length = 0;
}
