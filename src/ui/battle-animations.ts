/**
 * BattleAnimations - Visual effects for battle: flash, shake, fade, damage numbers.
 */

import { fillRect, drawText } from '../engine/renderer.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';

/**
 // utility function that get a color profile from a hex color, returning lighter and darker variants
 * Generates an 11-step color palette array from an input hex color.
 * Index 0 is the brightest (near white core), index 5 is the exact base color,
 * and index 10 is the darkest shadow tone.
 * 
 * Perfect for dynamic Canvas rendering, gradients, and particle systems.
 */
function getHexColorProfileArray(hex: string): string[] {
  // Normalize and parse the hex string
  const cleanHex = hex.replace('#', '');
  const n = parseInt(cleanHex, 16);

  // Extract RGB components
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;

  // Blends toward pure white (255) for highlight tints
  const tint = (channel: number, factor: number) => Math.round(channel + (255 - channel) * factor);

  // Blends toward pure black (0) for shadow shades
  const shade = (channel: number, factor: number) => Math.round(channel * factor);

  // Format numbers back to standard Hex strings
  const toHex = (rNum: number, gNum: number, bNum: number) => {
    const clamp = (v: number) => Math.min(255, Math.max(0, v));
    return '#' + [rNum, gNum, bNum].map((v) => clamp(v).toString(16).padStart(2, '0')).join('');
  };

  const formattedBase = hex.startsWith('#') ? hex : `#${hex}`;

  return [
    // --- LIGHT TINTS (Indexes 0 to 4) ---
    toHex(tint(r, 0.9), tint(g, 0.9), tint(b, 0.9)), // 0: Ultra-bright core / flash
    toHex(tint(r, 0.72), tint(g, 0.72), tint(b, 0.72)), // 1: Inner core aura
    toHex(tint(r, 0.54), tint(g, 0.54), tint(b, 0.54)), // 2: High-energy sparkle
    toHex(tint(r, 0.36), tint(g, 0.36), tint(b, 0.36)), // 3: Bright particle stream
    toHex(tint(r, 0.18), tint(g, 0.18), tint(b, 0.18)), // 4: Soft edge highlight

    // --- BASE COLOR (Index 5) ---
    formattedBase, // 5: Middle / Base Move Type Color

    // --- DARK SHADES (Indexes 6 to 10) ---
    toHex(shade(r, 0.82), shade(g, 0.82), shade(b, 0.82)), // 6: Soft ambient glow ring
    toHex(shade(r, 0.64), shade(g, 0.64), shade(b, 0.64)), // 7: Secondary tendril fill
    toHex(shade(r, 0.46), shade(g, 0.46), shade(b, 0.46)), // 8: Dark outline / shadow hull
    toHex(shade(r, 0.28), shade(g, 0.28), shade(b, 0.28)), // 9: Low-visibility void color
    toHex(shade(r, 0.1), shade(g, 0.1), shade(b, 0.1)), // 10: Near-black contrast border
  ];
}

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
  | 'projectile'
  | 'beam'
  | 'pulse'
  | 'burst'
  | 'dragon-aura'
  | 'flamethrower'
  | 'leaf-spray'
  | 'water-flow'
  | 'psychic-wave'
  | 'rock-throw'
  | 'rock-slide'
  | 'fire-blast'
  | 'giga-drain'
  | 'lightning'
  | 'vine-whip'
  | 'heal-pulse'
  | 'double-team'
  | 'solar-beam'
  | 'rapid-spin'
  | 'twister-spin'
  | 'icy-wind'
  | 'electroweb'
  | 'protect-shield'
  | 'earthquake'
  | 'fly-vanish'
  | 'dig-vanish'
  | 'smoke-screen'
  | 'mist-veil'
  | 'haze-clear'
  | 'punch'
  | 'surf-wave'
  | 'powder'
  | 'shadow-ball'
  | 'bite'
  | 'night-shade';

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
  spriteImage?: HTMLImageElement | null;
  power?: number;
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
  if (effect.timer >= effect.duration) {
    effect.active = false;
    return;
  }

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

  const pulse = 1 - effect.timer / effect.duration;
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
  spriteImage?: HTMLImageElement | null;
  power?: number;
}): AttackEffect {
  const defaultDuration =
    options.kind === 'beam'
      ? 0.2
      : options.kind === 'pulse'
        ? 0.3
        : options.kind === 'fly-vanish'
          ? 0.7
          : options.kind === 'dig-vanish'
            ? 0.5
            : 0.34;
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
    spriteImage: options.spriteImage,
    power: options.power,
  };
}

function getPowerScale(power?: number): number {
  if (!power || power <= 0) return 1.0;
  return Math.min(2.0, Math.max(0.5, power / 60));
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
  const ps = getPowerScale(effect.power);
  const eased = 1 - Math.pow(1 - t, 2);
  const x = effect.sourceX + (effect.targetX - effect.sourceX) * eased;
  const yBase = effect.sourceY + (effect.targetY - effect.sourceY) * eased;
  const arc = Math.sin(eased * Math.PI) * 12 * ps;
  const y = yBase - arc;

  for (let i = 0; i < 3; i++) {
    const trailT = Math.max(0, eased - i * 0.12);
    const tx = effect.sourceX + (effect.targetX - effect.sourceX) * trailT;
    const ty = effect.sourceY + (effect.targetY - effect.sourceY) * trailT - Math.sin(trailT * Math.PI) * 12 * ps;
    ctx.save();
    ctx.globalAlpha = 0.18 + (1 - i * 0.28);
    ctx.fillStyle = i === 0 ? effect.accentColor : effect.color;
    ctx.beginPath();
    ctx.arc(tx, ty, (4 - i) * ps, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = effect.color;
  ctx.beginPath();
  ctx.arc(x, y, 4.5 * ps, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = effect.accentColor;
  ctx.beginPath();
  ctx.arc(x, y, 2 * ps, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderBeamEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = Math.max(0, Math.min(1, effect.timer / effect.duration));
  const ps = getPowerScale(effect.power);
  const alpha = t < 0.45 ? t / 0.45 : Math.max(0, 1 - (t - 0.45) / 0.55);

  ctx.save();
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = effect.color;
  ctx.lineWidth = 6 * ps;
  ctx.beginPath();
  ctx.moveTo(effect.sourceX, effect.sourceY);
  ctx.lineTo(effect.targetX, effect.targetY);
  ctx.stroke();

  ctx.globalAlpha = alpha * 0.95;
  ctx.strokeStyle = effect.accentColor;
  ctx.lineWidth = 2 * ps;
  ctx.beginPath();
  ctx.moveTo(effect.sourceX, effect.sourceY);
  ctx.lineTo(effect.targetX, effect.targetY);
  ctx.stroke();
  ctx.restore();
}

function renderPulseEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = Math.max(0, Math.min(1, effect.timer / effect.duration));
  const ps = getPowerScale(effect.power);
  const radius = (6 + t * 18) * ps;
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

function drawFissureLine(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  angle: number,
  length: number,
  alpha: number,
  rng: () => number,
  groundTop: number,
  groundBot: number,
): void {
  if (length <= 1) return;
  const segments = Math.max(3, Math.floor(length / 9));
  const pts: [number, number][] = [[startX, startY]];
  let x = startX;
  let y = startY;
  for (let i = 0; i < segments; i++) {
    const segLen = length / segments;
    const perpAngle = angle + Math.PI / 2;
    const wobble = (rng() - 0.5) * segLen * 0.45;
    x += Math.cos(angle) * segLen + Math.cos(perpAngle) * wobble;
    y = Math.max(
      groundTop + 1,
      Math.min(groundBot - 1, y + Math.sin(angle) * segLen * 0.18 + Math.sin(perpAngle) * wobble * 0.25),
    );
    pts.push([x, y]);
  }
  ctx.save();
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = '#1a0c04';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.45;
  ctx.strokeStyle = '#d4a840';
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.restore();
  if (length > 12) {
    const midIdx = Math.max(1, Math.floor(pts.length / 2));
    const [bStartX, bStartY] = pts[midIdx];
    const branchAngle = angle + (rng() > 0.5 ? 0.55 : -0.55) * Math.PI * 0.6;
    const branchLen = length * 0.38;
    const bPts: [number, number][] = [[bStartX, bStartY]];
    let bx = bStartX;
    let by = bStartY;
    const bSegs = Math.max(2, Math.floor(branchLen / 9));
    for (let i = 0; i < bSegs; i++) {
      const segLen = branchLen / bSegs;
      const wobble2 = (rng() - 0.5) * 0.4;
      bx += Math.cos(branchAngle + wobble2) * segLen;
      by = Math.max(groundTop + 1, Math.min(groundBot - 1, by + Math.sin(branchAngle) * segLen * 0.18));
      bPts.push([bx, by]);
    }
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = '#1a0c04';
    ctx.lineWidth = 1.0;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(bPts[0][0], bPts[0][1]);
    for (let i = 1; i < bPts.length; i++) ctx.lineTo(bPts[i][0], bPts[i][1]);
    ctx.stroke();
    ctx.restore();
  }
}

function renderEarthquakeEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = Math.max(0, Math.min(1, effect.timer / effect.duration));
  const alpha = t < 0.2 ? t / 0.2 : t < 0.65 ? 1.0 : Math.max(0, 1 - (t - 0.65) / 0.35);
  const GROUND_TOP = 34;
  const GROUND_BOT = 84;
  const SCREEN_W_EQ = 240;
  const crackProgress = Math.min(1, t / 0.4);
  const rng = seededRng(effect.seed);
  ctx.save();
  ctx.globalAlpha = alpha * 0.14;
  ctx.fillStyle = '#8b6040';
  ctx.fillRect(0, GROUND_TOP, SCREEN_W_EQ, GROUND_BOT - GROUND_TOP);
  ctx.restore();
  const epicX = SCREEN_W_EQ / 2;
  const epicY = (GROUND_TOP + GROUND_BOT) / 2;
  const maxLen = SCREEN_W_EQ * 0.55 * crackProgress;
  if (maxLen > 2) {
    const yOffsets = [0, -8, 8];
    const angleOffsets = [0, 0.12, -0.12];
    for (let c = 0; c < 3; c++) {
      const crackY = epicY + yOffsets[c];
      const ao = angleOffsets[c];
      drawFissureLine(
        ctx,
        epicX,
        crackY,
        Math.PI + ao,
        maxLen * 0.55,
        alpha,
        seededRng(effect.seed + c * 31),
        GROUND_TOP,
        GROUND_BOT,
      );
      drawFissureLine(
        ctx,
        epicX,
        crackY,
        ao,
        maxLen * 0.55,
        alpha,
        seededRng(effect.seed + c * 31 + 1000),
        GROUND_TOP,
        GROUND_BOT,
      );
    }
    drawFissureLine(
      ctx,
      epicX - 25,
      GROUND_TOP + 8,
      Math.PI * 0.38,
      maxLen * 0.28,
      alpha,
      seededRng(effect.seed + 200),
      GROUND_TOP,
      GROUND_BOT,
    );
    drawFissureLine(
      ctx,
      epicX + 25,
      GROUND_TOP + 8,
      Math.PI * 0.62,
      maxLen * 0.28,
      alpha,
      seededRng(effect.seed + 300),
      GROUND_TOP,
      GROUND_BOT,
    );
  }
  for (let i = 0; i < 14; i++) {
    const px = rng() * SCREEN_W_EQ;
    const py0 = GROUND_TOP + 6 + rng() * (GROUND_BOT - GROUND_TOP - 12);
    const rise = t * 18 * (0.5 + rng() * 0.5);
    const pAlpha = alpha * Math.max(0, (1 - t * 1.1) * 0.65);
    const pR = 1 + rng() * 2.2;
    if (pAlpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = pAlpha;
    ctx.fillStyle = rng() > 0.5 ? '#c8a070' : '#e8d0a0';
    ctx.beginPath();
    ctx.arc(px, py0 - rise, pR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function renderBurstEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = Math.max(0, Math.min(1, effect.timer / effect.duration));
  const ps = getPowerScale(effect.power);
  const radius = (4 + t * 18) * ps;
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

function renderFlyVanishEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = Math.max(0, Math.min(1, effect.timer / effect.duration));
  const rng = seededRng(effect.seed);
  const count = 12;
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const speed = 14 + rng() * 18;
    const startX = effect.sourceX + (rng() - 0.5) * 12;
    const startY = effect.sourceY + (rng() - 0.5) * 12;
    const px = startX + Math.cos(angle) * speed * t;
    const py = startY + Math.sin(angle) * speed * t - t * 14;
    const featherAngle = rng() * Math.PI;
    const size = 1.8 + rng() * 2.2;
    const alpha = Math.max(0, 1 - t * 1.15) * 0.92;
    if (alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = rng() > 0.5 ? '#ffffff' : '#c0e8ff';
    ctx.translate(px, py);
    ctx.rotate(featherAngle);
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Faint glow ring at source
  const glow = Math.max(0, 1 - t * 1.4) * 0.35;
  if (glow > 0) {
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.strokeStyle = '#a0d0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(effect.sourceX, effect.sourceY, 6 + t * 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function renderDigVanishEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = Math.max(0, Math.min(1, effect.timer / effect.duration));
  const rng = seededRng(effect.seed);
  const count = 16;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + rng() * 0.5;
    const speed = 9 + rng() * 15;
    const px = effect.sourceX + Math.cos(angle) * speed * t;
    const py = effect.sourceY + Math.sin(angle) * speed * t + t * 10;
    const size = 1.2 + rng() * 2.8;
    const alpha = Math.max(0, 1 - t * 1.2) * 0.88;
    if (alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = rng() > 0.5 ? '#a07840' : '#c89858';
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Dirt cloud at base
  const cloudAlpha = Math.max(0, 1 - t * 1.1) * 0.28;
  if (cloudAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = cloudAlpha;
    ctx.fillStyle = '#b89060';
    ctx.beginPath();
    ctx.ellipse(effect.sourceX, effect.sourceY + 4, 10 + t * 8, 5 + t * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// --- Smoke Screen / Mist-Veil / Haze-Clear ---
// One render function handles all three; color + target position drive the visual difference.
// variant='smoke': dark cloud at foe, black veil
// variant='mist':  white/blue cloud at user, sparkle ring
// variant='haze':  green murk spanning both sides
function renderCloudEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const isMist = effect.variant === 'mist';
  const isHaze = effect.variant === 'haze';
  const cx = isMist ? effect.sourceX : effect.targetX;
  const cy = isMist ? effect.sourceY : effect.targetY;
  const fieldCx = (effect.sourceX + effect.targetX) / 2;
  const fieldCy = (effect.sourceY + effect.targetY) / 2;

  ctx.save();

  const NUM_PUFFS = 7;
  const origins = isHaze
    ? [
        { x: effect.sourceX, y: effect.sourceY },
        { x: effect.targetX, y: effect.targetY },
      ]
    : [{ x: cx, y: cy }];

  for (const origin of origins) {
    for (let i = 0; i < NUM_PUFFS; i++) {
      const pRng = seededRng(effect.seed + i * 31 + (origin === origins[1] ? 500 : 0));
      const delay = i * 0.06;
      const pt = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
      if (pt <= 0) continue;
      const ox = (pRng() - 0.5) * 32;
      const oy = (pRng() - 0.5) * 16 - pt * (isMist ? 18 : 12);
      const radius = 5 + pt * 20;
      const fadeIn = Math.min(1, pt * 3);
      const fadeOut = Math.max(0, 1 - Math.max(0, pt - 0.35) / 0.65);
      const alpha = fadeIn * fadeOut * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = effect.color;
      ctx.beginPath();
      ctx.arc(origin.x + ox, origin.y + oy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.35;
      ctx.strokeStyle = effect.accentColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(origin.x + ox, origin.y + oy, radius * 0.85, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Per-variant accent
  const peak = Math.sin(t * Math.PI);
  if (isMist) {
    // Sparkle ring around user
    ctx.globalAlpha = peak * 0.22;
    ctx.strokeStyle = '#a0d8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 16 + t * 10, 0, Math.PI * 2);
    ctx.stroke();
  } else if (isHaze) {
    // Wide murky cloud across the field
    ctx.globalAlpha = peak * 0.18;
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.ellipse(fieldCx, fieldCy, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Smoke: dark veil at foe
    const veilPeak = Math.min(t / 0.4, (1 - t) / 0.3);
    if (veilPeak > 0) {
      ctx.globalAlpha = veilPeak * 0.2;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function renderSmokeScreenEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  renderCloudEffect(ctx, effect);
}
function renderMistVeilEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  renderCloudEffect(ctx, effect);
}
function renderHazeClearEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  renderCloudEffect(ctx, effect);
}

// --- Punch ---
// Fist rushes toward target, type-specific impact burst (electric/fire/ice/fighting/ghost)
function renderPunchEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const IMPACT = 0.42;
  const dx = effect.targetX - effect.sourceX;
  const dy = effect.targetY - effect.sourceY;
  const angle = Math.atan2(dy, dx);

  ctx.save();

  if (t < IMPACT) {
    const pt = t / IMPACT;
    const eased = 1 - Math.pow(1 - pt, 2);
    const fx = effect.sourceX + dx * eased;
    const fy = effect.sourceY + dy * eased;

    // Motion blur streaks
    for (let tr = 5; tr >= 1; tr--) {
      const trEased = Math.max(0, eased - tr * 0.09);
      const trX = effect.sourceX + dx * trEased;
      const trY = effect.sourceY + dy * trEased;
      ctx.globalAlpha = (0.04 + (6 - tr) * 0.02) * eased;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 2 - tr * 0.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(trX - Math.cos(angle) * 4, trY - Math.sin(angle) * 4);
      ctx.lineTo(trX + Math.cos(angle) * 4, trY + Math.sin(angle) * 4);
      ctx.stroke();
    }

    // Type-energy aura around fist
    ctx.globalAlpha = 0.35 * pt;
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.arc(fx, fy, 13 + pt * 3, 0, Math.PI * 2);
    ctx.fill();

    // --- Fist shape ---
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(angle);

    // Palm (main body of fist)
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#b87840';
    ctx.beginPath();
    ctx.roundRect(-8, -5, 11, 10, 2);
    ctx.fill();

    // Knuckles row (3 bumps across the front)
    for (let k = 0; k < 3; k++) {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#d09050';
      ctx.beginPath();
      ctx.arc(3, -3.5 + k * 3.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      // Knuckle crease
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#805020';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(3, -3.5 + k * 3.5, 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Thumb (side)
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#c08040';
    ctx.beginPath();
    ctx.ellipse(-5, -6.5, 2.5, 4, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Wrist
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#a06830';
    ctx.beginPath();
    ctx.roundRect(-9, -4, 4, 8, 1);
    ctx.fill();

    // Type-color glow outline
    ctx.globalAlpha = 0.5 * pt;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 5;
    ctx.shadowColor = effect.color;
    ctx.beginPath();
    ctx.roundRect(-9, -6, 14, 12, 3);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  } else {
    const pt = (t - IMPACT) / (1 - IMPACT);
    const fade = Math.max(0, 1 - pt);

    // Impact rings
    for (let ring = 0; ring < 3; ring++) {
      const rT = Math.max(0, pt - ring * 0.1);
      const rR = rT * (16 + ring * 6);
      const rA = Math.max(0, 1 - rT) * fade * (ring === 0 ? 0.75 : 0.4);
      if (rA <= 0 || rR <= 0) continue;
      ctx.globalAlpha = rA;
      ctx.strokeStyle = ring === 0 ? effect.accentColor : effect.color;
      ctx.lineWidth = ring === 0 ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, rR, 0, Math.PI * 2);
      ctx.stroke();
    }

    const typeVar = effect.variant ?? 'normal';
    const rng = seededRng(effect.seed);

    if (typeVar === 'electric') {
      for (let i = 0; i < 6; i++) {
        const sa = (i / 6) * Math.PI * 2 + 0.3;
        const sd = 6 + rng() * 12 * pt;
        const mx = effect.targetX + Math.cos(sa) * sd * 0.5 + (rng() - 0.5) * 5;
        const my = effect.targetY + Math.sin(sa) * sd * 0.5 + (rng() - 0.5) * 5;
        ctx.globalAlpha = fade * 0.85;
        ctx.strokeStyle = '#ffe030';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(effect.targetX, effect.targetY);
        ctx.lineTo(mx, my);
        ctx.lineTo(effect.targetX + Math.cos(sa) * sd, effect.targetY + Math.sin(sa) * sd);
        ctx.stroke();
      }
      ctx.globalAlpha = fade * 0.3;
      ctx.fillStyle = '#fff080';
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (typeVar === 'fire') {
      for (let i = 0; i < 9; i++) {
        const fa = rng() * Math.PI * 2;
        const fd = 3 + rng() * 14 * pt;
        ctx.globalAlpha = fade * (0.55 + rng() * 0.4);
        ctx.fillStyle = rng() > 0.45 ? '#ff5010' : '#ffaa20';
        ctx.beginPath();
        ctx.arc(
          effect.targetX + Math.cos(fa) * fd,
          effect.targetY + Math.sin(fa) * fd - pt * 10,
          1.5 + rng() * 2.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = fade * 0.25;
      ctx.fillStyle = '#ff8020';
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (typeVar === 'ice') {
      for (let i = 0; i < 6; i++) {
        const ia = (i / 6) * Math.PI * 2 + 0.5;
        const id = 5 + pt * 12;
        ctx.globalAlpha = fade * 0.85;
        ctx.fillStyle = rng() > 0.5 ? '#80d8ff' : '#ffffff';
        ctx.save();
        ctx.translate(effect.targetX + Math.cos(ia) * id, effect.targetY + Math.sin(ia) * id);
        ctx.rotate(ia + pt * 1.5);
        ctx.beginPath();
        ctx.moveTo(0, -3.5);
        ctx.lineTo(1.2, 0);
        ctx.lineTo(0, 3.5);
        ctx.lineTo(-1.2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = fade * 0.2;
      ctx.fillStyle = '#c0eeff';
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, 11, 0, Math.PI * 2);
      ctx.fill();
    } else if (typeVar === 'ghost') {
      for (let i = 0; i < 5; i++) {
        const ga = (i / 5) * Math.PI * 2;
        const gd = 4 + pt * 14;
        ctx.globalAlpha = fade * 0.65;
        ctx.fillStyle = i % 2 === 0 ? '#7030c0' : '#4010a0';
        ctx.beginPath();
        ctx.arc(effect.targetX + Math.cos(ga) * gd, effect.targetY + Math.sin(ga) * gd, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Normal / fighting: starburst
      for (let i = 0; i < 5; i++) {
        const sa = (i / 5) * Math.PI * 2 + 0.3;
        const sd = 5 + pt * 13;
        ctx.globalAlpha = fade * 0.75;
        ctx.fillStyle = effect.accentColor;
        ctx.beginPath();
        ctx.arc(effect.targetX + Math.cos(sa) * sd, effect.targetY + Math.sin(sa) * sd, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Central white flash
    ctx.globalAlpha = fade * (1 - pt) * 0.7;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 4.5 * (1 - pt * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --- Surf Wave ---
// variant='surf': massive wave sweeps across and crashes
// variant='hydro-pump': high-pressure column blasts target
function renderSurfWaveEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const isHydro = effect.variant === 'hydro-pump';
  ctx.save();

  if (isHydro) {
    if (t < 0.22) {
      // Gather water at source
      const pt = t / 0.22;
      const rng = seededRng(effect.seed);
      for (let i = 0; i < 12; i++) {
        const a = rng() * Math.PI * 2;
        const d = (1 - pt) * (8 + rng() * 14);
        ctx.globalAlpha = pt * 0.7;
        ctx.fillStyle = rng() > 0.5 ? '#2888ff' : '#90d0ff';
        ctx.beginPath();
        ctx.arc(effect.sourceX + Math.cos(a) * d, effect.sourceY + Math.sin(a) * d, 1.5 + rng() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Charging glow
      ctx.globalAlpha = pt * 0.4;
      ctx.fillStyle = '#1060d0';
      ctx.beginPath();
      ctx.arc(effect.sourceX, effect.sourceY, 4 + pt * 12, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const pt = (t - 0.22) / 0.78;
      const fade = pt > 0.72 ? Math.max(0, 1 - (pt - 0.72) / 0.28) : 1;
      const dx = effect.targetX - effect.sourceX;
      const dy = effect.targetY - effect.sourceY;
      const angle = Math.atan2(dy, dx);
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);

      // Outer column
      ctx.globalAlpha = 0.55 * fade;
      ctx.strokeStyle = '#1060d0';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(effect.sourceX, effect.sourceY);
      ctx.lineTo(effect.targetX, effect.targetY);
      ctx.stroke();

      // Middle
      ctx.globalAlpha = 0.75 * fade;
      ctx.strokeStyle = '#3090ff';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(effect.sourceX, effect.sourceY);
      ctx.lineTo(effect.targetX, effect.targetY);
      ctx.stroke();

      // Bright core
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = '#b8e4ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(effect.sourceX, effect.sourceY);
      ctx.lineTo(effect.targetX, effect.targetY);
      ctx.stroke();

      // Side sprays
      const rng = seededRng(effect.seed + Math.floor(t * 10));
      for (let i = 0; i < 7; i++) {
        const sp = rng() * 0.85 + 0.08;
        const side = rng() > 0.5 ? 1 : -1;
        const spLen = 5 + rng() * 10;
        ctx.globalAlpha = fade * rng() * 0.55;
        ctx.strokeStyle = '#70c0ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const bx = effect.sourceX + dx * sp;
        const by = effect.sourceY + dy * sp;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + perpX * spLen * side, by + perpY * spLen * side);
        ctx.stroke();
      }

      // Impact explosion
      if (pt > 0.18) {
        const impPt = Math.min(1, (pt - 0.18) / 0.45);
        ctx.globalAlpha = (1 - impPt) * 0.7 * fade;
        ctx.fillStyle = '#1868cc';
        ctx.beginPath();
        ctx.arc(effect.targetX, effect.targetY, 6 + impPt * 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = (1 - impPt) * 0.8 * fade;
        ctx.strokeStyle = '#c8ecff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(effect.targetX, effect.targetY, 5 + impPt * 16, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } else {
    // Surf: wave rises from user's position then sweeps to target
    const RISE = 0.2;
    const TRAVEL = 0.65;

    if (t < RISE) {
      // Phase 1: wave rises at user's position
      const pt = t / RISE;
      const eased = 1 - Math.pow(1 - pt, 2);
      const waveH = 8 + eased * 16;
      const waveW = 12 + eased * 14;

      ctx.globalAlpha = 0.78 * eased;
      ctx.fillStyle = '#1868cc';
      ctx.beginPath();
      ctx.ellipse(effect.sourceX, effect.sourceY, waveW, waveH * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.88 * eased;
      ctx.fillStyle = '#d0eeff';
      ctx.beginPath();
      ctx.ellipse(effect.sourceX, effect.sourceY - waveH * 0.28, waveW * 0.88, waveH * 0.32, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.7 * eased;
      ctx.fillStyle = '#eef8ff';
      ctx.beginPath();
      ctx.ellipse(effect.sourceX, effect.sourceY - waveH * 0.45, waveW * 0.55, waveH * 0.14, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    } else if (t < TRAVEL) {
      // Phase 2: wave travels from source to target, growing
      const pt = (t - RISE) / (TRAVEL - RISE);
      const eased = 1 - Math.pow(1 - pt, 1.6);
      const waveX = effect.sourceX + (effect.targetX - effect.sourceX) * eased;
      const waveY = effect.sourceY + (effect.targetY - effect.sourceY) * eased;
      const growFactor = 0.8 + pt * 0.45;
      const waveH = (18 + pt * 16) * growFactor;
      const waveW = (22 + pt * 14) * growFactor;

      ctx.globalAlpha = 0.15 * pt;
      ctx.fillStyle = '#0030a8';
      ctx.beginPath();
      ctx.ellipse(waveX, waveY + waveH * 0.55, waveW * 0.9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.78;
      ctx.fillStyle = '#1868cc';
      ctx.beginPath();
      ctx.ellipse(waveX, waveY, waveW, waveH * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#0040a0';
      ctx.beginPath();
      ctx.ellipse(waveX, waveY + waveH * 0.1, waveW * 0.6, waveH * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.88;
      ctx.fillStyle = '#d0eeff';
      ctx.beginPath();
      ctx.ellipse(waveX, waveY - waveH * 0.28, waveW * 0.88, waveH * 0.32, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#eef8ff';
      ctx.beginPath();
      ctx.ellipse(waveX, waveY - waveH * 0.45, waveW * 0.55, waveH * 0.14, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      const rng = seededRng(effect.seed);
      for (let i = 0; i < 14; i++) {
        const dRng = seededRng(effect.seed + i * 17);
        ctx.globalAlpha = 0.65 * (1 - dRng() * 0.4);
        ctx.fillStyle = '#50a8ff';
        ctx.beginPath();
        ctx.arc(
          waveX + (dRng() - 0.35) * waveW * 2.2 * pt,
          waveY - waveH * 0.3 - dRng() * waveH * 0.9,
          1.2 + dRng() * 2.2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      void rng;
    } else {
      // Phase 3: crash at target
      const pt = (t - TRAVEL) / (1 - TRAVEL);
      const fade = Math.max(0, 1 - pt);
      const rng = seededRng(effect.seed);

      for (let i = 0; i < 22; i++) {
        const a = rng() * Math.PI * 2;
        const speed = 10 + rng() * 18;
        const dropX = effect.targetX + Math.cos(a) * speed * pt;
        const dropY = effect.targetY + Math.sin(a) * speed * pt - pt * pt * 18;
        ctx.globalAlpha = fade * (0.5 + rng() * 0.5);
        ctx.fillStyle = rng() > 0.45 ? '#3898e8' : '#b0e0ff';
        ctx.beginPath();
        ctx.arc(dropX, dropY, 1.4 + rng() * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = fade * 0.45;
      ctx.fillStyle = '#1060c0';
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, 12 + pt * 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = fade * 0.65;
      ctx.strokeStyle = '#b8e8ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, 9 + pt * 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = fade * 0.35;
      ctx.strokeStyle = '#80c8ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, 5 + pt * 24, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// --- Powder ---
// Colorful powder particles fan toward target
function renderPowderEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  ctx.save();

  const NUM = 28;
  const dx = effect.targetX - effect.sourceX;
  const dy = effect.targetY - effect.sourceY;

  for (let i = 0; i < NUM; i++) {
    const pRng = seededRng(effect.seed + i * 13);
    const delay = pRng() * 0.28;
    const pt = Math.max(0, Math.min(1, (t - delay) / (0.9 - delay)));
    if (pt <= 0) continue;

    const speed = 0.55 + pRng() * 0.45;
    const spread = (pRng() - 0.5) * 36;
    const drift = 3 + pRng() * 8;
    const spin = pRng() * Math.PI * 2;

    const bx = effect.sourceX + dx * pt * speed + spread * pt;
    const by = effect.sourceY + dy * pt * speed - drift * pt;

    const fade = pt > 0.68 ? Math.max(0, 1 - (pt - 0.68) / 0.32) : 1;
    ctx.globalAlpha = fade * (0.6 + pRng() * 0.35);

    // Mix between main color and white sparkle
    ctx.fillStyle = pRng() > 0.35 ? effect.color : effect.accentColor;
    const r = 1.2 + pRng() * 2.2;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(spin + pt * 3);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Some particles are tiny diamond shapes
    if (pRng() > 0.65) {
      ctx.globalAlpha = fade * 0.75;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.4);
      ctx.lineTo(r * 0.7, 0);
      ctx.lineTo(0, r * 1.4);
      ctx.lineTo(-r * 0.7, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

// --- Shadow Ball ---
// Large dark/purple orb flies toward target, orbiting wisps, dark explosion
function renderShadowBallEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const IMPACT = 0.5;
  ctx.save();

  if (t < IMPACT) {
    const pt = t / IMPACT;
    const eased = 1 - Math.pow(1 - pt, 2);
    const bx = effect.sourceX + (effect.targetX - effect.sourceX) * eased;
    const by = effect.sourceY + (effect.targetY - effect.sourceY) * eased;

    // Shadow trail
    for (let tr = 3; tr >= 1; tr--) {
      const trEased = Math.max(0, eased - tr * 0.14);
      const trX = effect.sourceX + (effect.targetX - effect.sourceX) * trEased;
      const trY = effect.sourceY + (effect.targetY - effect.sourceY) * trEased;
      ctx.globalAlpha = 0.04 + (4 - tr) * 0.04;
      ctx.fillStyle = '#4a18a0';
      ctx.beginPath();
      ctx.arc(trX, trY, 9 - tr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer dark haze
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#280870';
    ctx.beginPath();
    ctx.arc(bx, by, 17, 0, Math.PI * 2);
    ctx.fill();

    // Main orb
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#18082c';
    ctx.beginPath();
    ctx.arc(bx, by, 10.5, 0, Math.PI * 2);
    ctx.fill();

    // Purple mid-layer
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = '#5820a8';
    ctx.beginPath();
    ctx.arc(bx, by, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Bright highlight
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#9850e8';
    ctx.beginPath();
    ctx.arc(bx - 2.5, by - 2.5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#d090ff';
    ctx.beginPath();
    ctx.arc(bx - 1.5, by - 1.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting wisps
    for (let w = 0; w < 6; w++) {
      const wAngle = (w / 6) * Math.PI * 2 + pt * Math.PI * 5;
      const wDist = 12 + Math.sin(pt * Math.PI * 4 + w * 0.8) * 2.5;
      ctx.globalAlpha = 0.55 - w * 0.04;
      ctx.fillStyle = w % 2 === 0 ? '#5020b0' : '#2c0a78';
      ctx.beginPath();
      ctx.arc(bx + Math.cos(wAngle) * wDist, by + Math.sin(wAngle) * wDist, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Impact
    const pt = (t - IMPACT) / (1 - IMPACT);
    const fade = Math.max(0, 1 - pt);

    // Dark fill pulse
    ctx.globalAlpha = (1 - pt) * 0.4;
    ctx.fillStyle = '#18082c';
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 16 + pt * 6, 0, Math.PI * 2);
    ctx.fill();

    // Expanding rings
    for (let ring = 0; ring < 4; ring++) {
      const rT = Math.max(0, pt - ring * 0.07);
      const rR = rT * (20 + ring * 7);
      const rA = Math.max(0, 1 - rT) * fade * (ring === 0 ? 0.7 : 0.35);
      if (rA <= 0 || rR <= 0) continue;
      ctx.globalAlpha = rA;
      ctx.strokeStyle = ring % 2 === 0 ? '#7030c8' : '#3a1070';
      ctx.lineWidth = ring === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, rR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shadow wisps fly outward
    for (let i = 0; i < 7; i++) {
      const wAngle = (i / 7) * Math.PI * 2 + 0.45;
      const dist = 5 + pt * 18;
      const wR = Math.max(0.1, 3 * (1 - pt * 0.85));
      ctx.globalAlpha = fade * 0.65;
      ctx.fillStyle = i % 2 === 0 ? '#5828b0' : '#2c0a78';
      ctx.beginPath();
      ctx.arc(effect.targetX + Math.cos(wAngle) * dist, effect.targetY + Math.sin(wAngle) * dist, wR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// --- Bite ---
// Jaws open → rush toward target → snap shut with type burst
function renderBiteEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const isCrunch = effect.variant === 'crunch';
  const typeVar = effect.variant ?? 'bite';
  const APPROACH = 0.38;
  const SNAP = 0.62;

  const dx = effect.targetX - effect.sourceX;
  const dy = effect.targetY - effect.sourceY;

  ctx.save();

  if (t < APPROACH) {
    // Jaws opening + rushing to target
    const pt = t / APPROACH;
    const eased = 1 - Math.pow(1 - pt, 2);
    const jx = effect.sourceX + dx * eased;
    const jy = effect.sourceY + dy * eased;
    const gape = 0.45 * Math.min(1, pt * 2);
    const jawSize = isCrunch ? 13 : 9;

    ctx.globalAlpha = 0.88;
    const jawColor = isCrunch ? '#1a1a2a' : '#2a2a2a';
    const toothColor = '#f0edd0';

    // Upper jaw
    ctx.fillStyle = jawColor;
    ctx.beginPath();
    ctx.ellipse(jx, jy - gape * 12, jawSize, jawSize * 0.45, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Lower jaw
    ctx.beginPath();
    ctx.ellipse(jx, jy + gape * 12, jawSize, jawSize * 0.45, 0, 0, Math.PI);
    ctx.fill();

    // Teeth
    const numTeeth = isCrunch ? 5 : 3;
    ctx.fillStyle = toothColor;
    const toothH = isCrunch ? 5 : 3.5;
    for (let tooth = 0; tooth < numTeeth; tooth++) {
      const tx2 = jx - (numTeeth - 1) * 3 + tooth * 6;
      ctx.globalAlpha = 0.9;
      // Upper teeth
      ctx.beginPath();
      ctx.moveTo(tx2 - 1.8, jy - gape * 12 + 2);
      ctx.lineTo(tx2, jy - gape * 12 + 2 - toothH);
      ctx.lineTo(tx2 + 1.8, jy - gape * 12 + 2);
      ctx.fill();
      // Lower teeth
      ctx.beginPath();
      ctx.moveTo(tx2 - 1.8, jy + gape * 12 - 2);
      ctx.lineTo(tx2, jy + gape * 12 - 2 + toothH);
      ctx.lineTo(tx2 + 1.8, jy + gape * 12 - 2);
      ctx.fill();
    }
  } else if (t < SNAP) {
    // Snapping shut
    const pt = (t - APPROACH) / (SNAP - APPROACH);
    const closeT = 1 - Math.pow(1 - pt, 3);
    const gape = (1 - closeT) * 0.45;
    const jawSize = isCrunch ? 13 : 9;

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = isCrunch ? '#1a1a2a' : '#2a2a2a';

    ctx.beginPath();
    ctx.ellipse(effect.targetX, effect.targetY - gape * 12, jawSize, jawSize * 0.45, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(effect.targetX, effect.targetY + gape * 12, jawSize, jawSize * 0.45, 0, 0, Math.PI);
    ctx.fill();

    // Impact cracks at snap
    if (pt > 0.65) {
      const crackPt = (pt - 0.65) / 0.35;
      for (let i = 0; i < 4; i++) {
        const ca = (i / 4) * Math.PI * 2 + 0.4;
        const cl = 5 + crackPt * (isCrunch ? 10 : 6);
        ctx.globalAlpha = crackPt * 0.65;
        ctx.strokeStyle = effect.accentColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(effect.targetX, effect.targetY);
        ctx.lineTo(effect.targetX + Math.cos(ca) * cl, effect.targetY + Math.sin(ca) * cl);
        ctx.stroke();
      }
      if (isCrunch) {
        ctx.globalAlpha = crackPt * 0.4;
        ctx.fillStyle = '#5030b0';
        ctx.beginPath();
        ctx.arc(effect.targetX, effect.targetY, 8 + crackPt * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // Recoil + type burst
    const pt = (t - SNAP) / (1 - SNAP);
    const fade = Math.max(0, 1 - pt);

    ctx.globalAlpha = fade * 0.55;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = isCrunch ? 3 : 2;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 4 + pt * (isCrunch ? 20 : 15), 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = fade * 0.3;
    ctx.strokeStyle = effect.accentColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 3 + pt * (isCrunch ? 14 : 10), 0, Math.PI * 2);
    ctx.stroke();

    // Type effects for elemental fangs
    const rng = seededRng(effect.seed);
    if (typeVar === 'electric') {
      for (let i = 0; i < 4; i++) {
        const sa = rng() * Math.PI * 2;
        const sd = 4 + rng() * 12 * pt;
        const mx = effect.targetX + Math.cos(sa) * sd * 0.5 + (rng() - 0.5) * 4;
        const my = effect.targetY + Math.sin(sa) * sd * 0.5 + (rng() - 0.5) * 4;
        ctx.globalAlpha = fade * 0.85;
        ctx.strokeStyle = '#ffe030';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(effect.targetX, effect.targetY);
        ctx.lineTo(mx, my);
        ctx.lineTo(effect.targetX + Math.cos(sa) * sd, effect.targetY + Math.sin(sa) * sd);
        ctx.stroke();
      }
    } else if (typeVar === 'fire') {
      for (let i = 0; i < 7; i++) {
        const fa = rng() * Math.PI * 2;
        const fd = 3 + rng() * 12 * pt;
        ctx.globalAlpha = fade * 0.7;
        ctx.fillStyle = rng() > 0.5 ? '#ff5010' : '#ffaa20';
        ctx.beginPath();
        ctx.arc(
          effect.targetX + Math.cos(fa) * fd,
          effect.targetY + Math.sin(fa) * fd - pt * 8,
          1.5 + rng() * 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    } else if (typeVar === 'ice') {
      for (let i = 0; i < 5; i++) {
        const ia = (i / 5) * Math.PI * 2;
        const id = 4 + pt * 12;
        ctx.globalAlpha = fade * 0.8;
        ctx.fillStyle = rng() > 0.5 ? '#88d8ff' : '#c8f0ff';
        ctx.save();
        ctx.translate(effect.targetX + Math.cos(ia) * id, effect.targetY + Math.sin(ia) * id);
        ctx.rotate(ia + pt * 2);
        ctx.beginPath();
        ctx.moveTo(0, -3.5);
        ctx.lineTo(1.2, 0);
        ctx.lineTo(0, 3.5);
        ctx.lineTo(-1.2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else if (typeVar === 'poison') {
      for (let i = 0; i < 8; i++) {
        const va = rng() * Math.PI * 2;
        const vd = 3 + rng() * 14 * pt;
        ctx.globalAlpha = fade * 0.75;
        ctx.fillStyle = rng() > 0.5 ? '#9030c0' : '#48c030';
        ctx.beginPath();
        ctx.arc(
          effect.targetX + Math.cos(va) * vd,
          effect.targetY + Math.sin(va) * vd + pt * 6,
          1.5 + rng() * 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

// --- Night Shade ---
// Spectral dark beam — distinct ghostly apparition, not a solid orb
function renderNightShadeEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  ctx.save();

  const dx = effect.targetX - effect.sourceX;
  const dy = effect.targetY - effect.sourceY;
  const angle = Math.atan2(dy, dx);
  const dist = Math.hypot(dx, dy);
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  if (t < 0.45) {
    const pt = t / 0.45;
    const beamLen = dist * pt;
    const tipX = effect.sourceX + Math.cos(angle) * beamLen;
    const tipY = effect.sourceY + Math.sin(angle) * beamLen;
    const rng = seededRng(effect.seed + Math.floor(t * 8));

    // Outer dark shroud
    ctx.globalAlpha = 0.5 * pt;
    ctx.strokeStyle = '#180828';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(effect.sourceX, effect.sourceY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Mid spectral beam
    ctx.globalAlpha = 0.7 * pt;
    ctx.strokeStyle = '#6020a8';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(effect.sourceX, effect.sourceY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Bright ghostly core
    ctx.globalAlpha = 0.9 * pt;
    ctx.strokeStyle = '#c890ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(effect.sourceX, effect.sourceY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Ghostly wisps drifting off the beam
    for (let i = 0; i < 8; i++) {
      const sp = rng() * pt;
      const bx = effect.sourceX + Math.cos(angle) * dist * sp;
      const by = effect.sourceY + Math.sin(angle) * dist * sp;
      const off = (rng() - 0.5) * 8;
      ctx.globalAlpha = rng() * 0.6 * pt;
      ctx.fillStyle = rng() > 0.5 ? '#7030c0' : '#3010a0';
      ctx.beginPath();
      ctx.arc(bx + perpX * off, by + perpY * off, 1.5 + rng() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const pt = (t - 0.45) / 0.55;
    const fade = Math.max(0, 1 - pt);
    const rng = seededRng(effect.seed);

    // Dark expanding ring
    ctx.globalAlpha = fade * 0.5;
    ctx.fillStyle = '#2a0850';
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 5 + pt * 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = fade * 0.75;
    ctx.strokeStyle = '#9040e0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 4 + pt * 18, 0, Math.PI * 2);
    ctx.stroke();

    // Spectral wisps radiating outward
    for (let i = 0; i < 6; i++) {
      const wa = (i / 6) * Math.PI * 2 + t * 4;
      const wd = 6 + pt * 16;
      ctx.globalAlpha = fade * 0.6;
      ctx.fillStyle = '#7030c0';
      ctx.beginPath();
      ctx.arc(effect.targetX + Math.cos(wa) * wd, effect.targetY + Math.sin(wa) * wd, 2 + rng() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner glow fade
    ctx.globalAlpha = fade * 0.35;
    ctx.fillStyle = '#5010a8';
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 3 + pt * 10, 0, Math.PI * 2);
    ctx.fill();
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
    case 'earthquake':
      renderEarthquakeEffect(ctx, effect);
      break;
    case 'dragon-aura':
      renderDragonAuraEffect(ctx, effect);
      break;
    case 'flamethrower':
      renderFlamethrowerEffect(ctx, effect);
      break;
    case 'leaf-spray':
      renderLeafSprayEffect(ctx, effect);
      break;
    case 'water-flow':
      renderWaterFlowEffect(ctx, effect);
      break;
    case 'psychic-wave':
      renderPsychicWaveEffect(ctx, effect);
      break;
    case 'rock-throw':
      renderRockThrowEffect(ctx, effect);
      break;
    case 'rock-slide':
      renderRockSlideEffect(ctx, effect);
      break;
    case 'fire-blast':
      renderFireBlastEffect(ctx, effect);
      break;
    case 'giga-drain':
      renderGigaDrainEffect(ctx, effect);
      break;
    case 'lightning':
      renderLightningEffect(ctx, effect);
      break;
    case 'vine-whip':
      renderVineWhipEffect(ctx, effect);
      break;
    case 'heal-pulse':
      renderHealPulseEffect(ctx, effect);
      break;
    case 'protect-shield':
      renderProtectShieldEffect(ctx, effect);
      break;
    case 'double-team':
      renderDoubleTeamEffect(ctx, effect);
      break;
    case 'solar-beam':
      renderSolarBeamEffect(ctx, effect);
      break;
    case 'rapid-spin':
      renderRapidSpinEffect(ctx, effect);
      break;
    case 'twister-spin':
      renderTwisterSpinEffect(ctx, effect);
      break;
    case 'icy-wind':
      renderIcyWindEffect(ctx, effect);
      break;
    case 'electroweb':
      renderElectrowebEffect(ctx, effect);
      break;
    case 'fly-vanish':
      renderFlyVanishEffect(ctx, effect);
      break;
    case 'dig-vanish':
      renderDigVanishEffect(ctx, effect);
      break;
    case 'smoke-screen':
      renderSmokeScreenEffect(ctx, effect);
      break;
    case 'mist-veil':
      renderMistVeilEffect(ctx, effect);
      break;
    case 'haze-clear':
      renderHazeClearEffect(ctx, effect);
      break;
    case 'punch':
      renderPunchEffect(ctx, effect);
      break;
    case 'surf-wave':
      renderSurfWaveEffect(ctx, effect);
      break;
    case 'powder':
      renderPowderEffect(ctx, effect);
      break;
    case 'shadow-ball':
      renderShadowBallEffect(ctx, effect);
      break;
    case 'bite':
      renderBiteEffect(ctx, effect);
      break;
    case 'night-shade':
      renderNightShadeEffect(ctx, effect);
      break;
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
  cx: number,
  cy: number,
  size: number,
  rotation: number,
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
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  branchCount: number,
  boltColor: string,
  glowColor: string,
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
  drawPath(5, glowColor, alpha * 0.25); // outer glow
  drawPath(1.8, boltColor, alpha); // main bolt
  drawPath(0.6, '#ffffff', alpha * 0.85); // white core

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
  if (effect.variant === 'char-dragon') {
    auraColor = '#ff6820';
    glowColor = '#ffc840';
  }
  if (effect.variant === 'dra-dragon') {
    auraColor = '#20a8ff';
    glowColor = '#88ffff';
  }

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
    ctx.globalAlpha = pt * 0.3;
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
    ctx.fillStyle = heat > 0.65 ? '#fff060' : rng() > 0.4 ? '#ff7020' : '#ff4010';
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
    const alpha = adjT < 0.88 ? 0.92 : ((1 - adjT) / 0.12) * 0.92;

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

// --- Vine Whip ---
// Curved vine tendrils extend from attacker to target, whip-snap, then retract.
// Number of vines driven by 'vine-N' variant (2 by default, up to 5 for Tangrowth).

function renderVineWhipEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const numWhips = parseInt(effect.variant?.replace('vine-', '') ?? '2', 10) || 2;

  const dx = effect.targetX - effect.sourceX;
  const dy = effect.targetY - effect.sourceY;
  const dist = Math.hypot(dx, dy) || 1;

  // Phase timing
  const extendEnd = 0.48; // end of extension phase
  const holdEnd = 0.7; // end of hold-at-target phase

  ctx.save();

  for (let i = 0; i < numWhips; i++) {
    const rng = seededRng(effect.seed + i * 31);

    // Stagger: alternate left/right whips extend slightly offset in time
    const stagger = (i % 2 === 0 ? 0 : 0.055) + rng() * 0.03;
    const localT = Math.max(0, (t - stagger) / (1 - stagger));
    if (localT <= 0) continue;

    // Vertical spread — symmetric around center, tighter for more whips
    const spreadIndex = i - (numWhips - 1) * 0.5;
    const spacing = numWhips <= 2 ? 6.5 : numWhips <= 3 ? 5.0 : 4.0;
    const baseOffsetY = spreadIndex * spacing * 2;
    const jitterY = (rng() - 0.5) * 2.5;
    const offsetY = baseOffsetY + jitterY;

    // How far the vine tip has reached along the path (0→1)
    let reach: number;
    let alpha: number;
    if (localT <= extendEnd) {
      reach = 1 - Math.pow(1 - localT / extendEnd, 2.5); // fast ease-out extension
      alpha = 1;
    } else if (localT <= holdEnd) {
      reach = 1;
      alpha = 1;
    } else {
      const retractT = (localT - holdEnd) / (1 - holdEnd);
      reach = Math.pow(1 - retractT, 1.8);
      alpha = Math.max(0, 1 - retractT * 0.8);
    }

    if (reach <= 0.02 || alpha <= 0.01) continue;

    // Whip curve: control point arcs out perpendicular to the attack direction
    // Oscillates outward during extension, straightens at impact
    const whipBow = Math.sin(localT * Math.PI) * 0.18;
    const perpX = -dy / dist;
    const perpY = dx / dist;

    const startX = effect.sourceX;
    const startY = effect.sourceY + offsetY * 0.15;
    const tipX = effect.sourceX + dx * reach;
    const tipY = effect.sourceY + dy * reach + offsetY * (0.9 + 0.1 * reach);
    const ctrlX = effect.sourceX + dx * 0.5 + perpX * dist * whipBow;
    const ctrlY = effect.sourceY + dy * 0.5 + perpY * dist * whipBow + offsetY * 0.55;

    const vineW = 2.0 + rng() * 0.5 - i * 0.12;

    // Dark outline (drawn first, behind the vine)
    ctx.globalAlpha = alpha * 0.45;
    ctx.lineWidth = vineW + 1.2;
    ctx.strokeStyle = '#145218';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();

    // Main vine body
    ctx.globalAlpha = alpha * 0.95;
    ctx.lineWidth = vineW;
    ctx.strokeStyle = '#2ecc40';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();

    // Bright highlight stripe along the vine
    ctx.globalAlpha = alpha * 0.5;
    ctx.lineWidth = 0.9;
    ctx.strokeStyle = '#a8ff6a';
    ctx.beginPath();
    ctx.moveTo(startX, startY - 0.5);
    ctx.quadraticCurveTo(ctrlX, ctrlY - 0.6, tipX, tipY - 0.5);
    ctx.stroke();

    // Leaf tip — small dark-green teardrop bud at the vine end
    if (reach > 0.45) {
      const tipAlpha = alpha * Math.min(1, (reach - 0.45) * 3.5);
      ctx.globalAlpha = tipAlpha;
      ctx.fillStyle = '#1a7a28';
      const tipAngle = Math.atan2(tipY - ctrlY, tipX - ctrlX);
      ctx.save();
      ctx.translate(tipX, tipY);
      ctx.rotate(tipAngle);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.4, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Small highlight on the bud
      ctx.fillStyle = '#5aff7a';
      ctx.globalAlpha = tipAlpha * 0.5;
      ctx.beginPath();
      ctx.ellipse(-0.3, -0.9, 0.5, 1.2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
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

  // Perpendicular vectors to calculate the wavy distortion offsets
  const perpX = -uy;
  const perpY = ux;

  const SPLIT = 0.45; // Wave travels, then control aura takes over
  const colorProfile = getHexColorProfileArray(effect.color);

  ctx.save();

  if (t < SPLIT) {
    // --- PHASE 1: THE TRAVELLING PSYCHIC WAVE ---
    const pt = t / SPLIT;

    // We render multiple parallel waves slightly offset for a dense, distorted beam look
    const numWaves = 3;
    for (let w = 0; w < numWaves; w++) {
      ctx.beginPath();

      const waveOffset = w * 0.15;
      ctx.lineWidth = w === 1 ? 2.5 : 1.2;
      ctx.strokeStyle = w === 1 ? colorProfile[1] : w === 0 ? colorProfile[3] : colorProfile[5];
      ctx.globalAlpha = (0.8 - w * 0.2) * Math.sin(pt * Math.PI); // Smooth fade-in/out
      ctx.lineJoin = 'round';

      // Draw the wave along the path using segments
      const segments = 30;
      // The head of the wave travels from source to target based on progress (pt)
      const currentLength = len * pt;

      for (let s = 0; s <= segments; s++) {
        const segRatio = s / segments;
        const currentDist = currentLength * segRatio;

        // Linear position along the direct path
        const lx = effect.sourceX + ux * currentDist;
        const ly = effect.sourceY + uy * currentDist;

        // Sine wave calculations: frequent oscillation, diminishing at tail, expanding at head
        const frequency = 0.12;
        const amplitude = 12 * Math.sin(segRatio * Math.PI) * (1 + w * 0.3);
        const wavePhase = pt * 35 - currentDist * frequency + waveOffset;
        const displacement = Math.sin(wavePhase) * amplitude;

        // Displace the coordinate perpendicular to the direction of travel
        const finalX = lx + perpX * displacement;
        const finalY = ly + perpY * displacement;

        if (s === 0) {
          ctx.moveTo(finalX, finalY);
        } else {
          ctx.lineTo(finalX, finalY);
        }
      }
      ctx.stroke();
    }

    // High energy distortion flare at the front tip of the wave
    const headX = effect.sourceX + ux * len * pt;
    const headY = effect.sourceY + uy * len * pt;
    ctx.globalAlpha = 0.6 * Math.sin(pt * Math.PI);
    ctx.fillStyle = colorProfile[0];
    ctx.beginPath();
    ctx.arc(headX, headY, 8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // --- PHASE 2: TELEKINETIC CONTROL AURA & DEFENDER FLASH ---
    const pt = (t - SPLIT) / (1 - SPLIT);
    const auraAlpha = Math.sin(pt * Math.PI); // Fades in smoothly and fades out at end

    // 1. Psychic Telekinetic Aura Rings rising around defender
    const numAuraRings = 4;
    for (let i = 0; i < numAuraRings; i++) {
      const rng = seededRng(effect.seed + i * 53);
      // Individual ring lifecycle offset
      const ringProgress = (pt * 1.5 + i / numAuraRings) % 1.0;

      // Animate rings starting low, scaling outward, and lifting upward slightly
      const radius = 10 + ringProgress * 18;
      const liftY = ringProgress * -15;
      const currentAlpha = auraAlpha * (1 - ringProgress);

      ctx.globalAlpha = currentAlpha * 0.7;
      ctx.strokeStyle = i % 2 === 0 ? colorProfile[2] : colorProfile[4];
      ctx.lineWidth = 2.0 - ringProgress * 1.0;

      ctx.save();
      // Position center of ring on defender
      ctx.translate(effect.targetX, effect.targetY + liftY);

      // Squish the circle on the Y-axis to give it an immersive 3D horizontal ring perspective
      ctx.scale(1.2, 0.4);

      // Introduce an erratic mental wobble factor to the ring path
      const wobble = Math.sin(pt * 25 + i) * 2;
      ctx.beginPath();
      ctx.arc(wobble, 0, radius, 0, Math.PI * 2);
      ctx.restore();
      ctx.stroke();

      // Small sparks lifting out of the rings
      ctx.globalAlpha = currentAlpha * 0.8;
      ctx.fillStyle = colorProfile[0];
      const sparkAngle = rng() * Math.PI * 2 + pt * 4;
      const sparkX = effect.targetX + Math.cos(sparkAngle) * (radius * 0.8);
      const sparkY = effect.targetY + liftY + Math.sin(sparkAngle) * (radius * 0.3);
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. High-Frequency Psychic Flash Layer overlapping defender sprite
    // This creates an intense flickering silhouette effect over the opponent
    const flashFlicker = Math.sin(pt * Math.PI * 18) > 0;
    if (flashFlicker) {
      ctx.globalAlpha = auraAlpha * 0.22;
      ctx.fillStyle = colorProfile[3];
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, 22, 0, Math.PI * 2);
      ctx.fill();

      // Bright core overlay
      ctx.globalAlpha = auraAlpha * 0.35;
      ctx.fillStyle = colorProfile[1];
      ctx.beginPath();
      ctx.arc(effect.targetX, effect.targetY, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Heavy Ambient Control Glow underneath defender
    ctx.globalAlpha = auraAlpha * 0.15;
    const gradient = ctx.createRadialGradient(effect.targetX, effect.targetY, 5, effect.targetX, effect.targetY, 32);
    gradient.addColorStop(0, colorProfile[4]);
    gradient.addColorStop(0.6, colorProfile[7]);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 32, 0, Math.PI * 2);
    ctx.fill();
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
    const delay = i * 0.1;
    const adjT = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
    if (adjT <= 0) continue;

    const eased = 1 - Math.pow(1 - adjT, 1.6);
    const spreadX = (posRng() - 0.5) * 10;
    const x = effect.sourceX + dx * eased + spreadX * (1 - eased);
    const arcH = 8 + posRng() * 6;
    const y = effect.sourceY + dy * eased - Math.sin(eased * Math.PI) * arcH;
    const rotation = adjT * Math.PI * (2.5 + posRng() * 3) * (posRng() > 0.5 ? 1 : -1);
    const size = 4 + posRng() * 3;

    if (adjT < 0.9) {
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
  const SPLIT = 0.4;
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
      const r = i % 2 === 0 ? baseR : baseR * 0.4;
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
        1 + rng() * 2,
        0,
        Math.PI * 2,
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
  const SPLIT = 0.48;
  const dx = effect.sourceX - effect.targetX;
  const dy = effect.sourceY - effect.targetY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const perpX = -uy;
  const perpY = ux;
  const numTendrils = 5;
  const colorProfile = getHexColorProfileArray(effect.color);

  ctx.save();

  // Target sickly glow + pulsing ring while draining
  const glowAlpha = t < SPLIT ? (t / SPLIT) * 0.3 : Math.max(0, 1 - (t - SPLIT) / (1 - SPLIT)) * 0.2;
  ctx.globalAlpha = glowAlpha;
  ctx.fillStyle = colorProfile[8]; // Original '#28b828'
  ctx.beginPath();
  ctx.arc(effect.targetX, effect.targetY, 16, 0, Math.PI * 2);
  ctx.fill();

  if (t < SPLIT) {
    // Phase 1: tendrils reach toward target, color being "pulled out"
    const pt = t / SPLIT;

    // Pulsing ring at target (energy being pulled)
    const ringAlpha = 0.35 * Math.sin(pt * Math.PI * 5) * 0.5 + 0.2;
    ctx.globalAlpha = ringAlpha;
    ctx.strokeStyle = colorProfile[3]; // Original '#70ff70'
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, 10 + Math.sin(pt * Math.PI * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < numTendrils; i++) {
      const rng = seededRng(effect.seed + i * 19);
      const reach = pt * (0.6 + rng() * 0.35);
      const segs = 10;
      const thick = i === 0 ? 2.2 : 1.2;

      ctx.globalAlpha = 0.85 - i * 0.1;

      // Dynamic tendril styling going deeper down the palette based on trendril index
      ctx.strokeStyle = i === 0 ? colorProfile[4] : i < 3 ? colorProfile[7] : colorProfile[10];
      ctx.lineWidth = thick;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      for (let s = 0; s <= segs; s++) {
        const sp = (s / segs) * reach;
        const tx2 = effect.targetX + ux * len * sp;
        const ty2 = effect.targetY + uy * len * sp;
        const wobble = Math.sin(sp * Math.PI * 5 + t * 16 + i * 2.4) * (4 + i * 0.8);
        if (s === 0) ctx.moveTo(tx2 + perpX * wobble, ty2 + perpY * wobble);
        else ctx.lineTo(tx2 + perpX * wobble, ty2 + perpY * wobble);
      }
      ctx.stroke();

      // Glowing tip
      const tipX = effect.targetX + ux * len * reach;
      const tipY = effect.targetY + uy * len * reach;
      ctx.globalAlpha = 0.7 - i * 0.08;
      ctx.fillStyle = colorProfile[3]; // Original '#90ff90'
      ctx.beginPath();
      ctx.arc(tipX, tipY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Phase 2: orbs stream from target back to source
    const pt = (t - SPLIT) / (1 - SPLIT);
    const numOrbs = 5;

    for (let i = 0; i < numOrbs; i++) {
      const delay = i * 0.1;
      const orbT = Math.max(0, Math.min(1, (pt - delay) / (1 - Math.min(delay, 0.9))));
      if (orbT <= 0) continue;

      const eased = 1 - Math.pow(1 - orbT, 2);
      const x = effect.targetX + dx * eased;
      const y = effect.targetY + dy * eased;
      const alpha = orbT < 0.85 ? 0.88 : Math.max(0, (1 - orbT) / 0.15) * 0.88;

      // Orb glow aura
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = colorProfile[8]; // Original '#30c030'
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Main orb
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colorProfile[3]; // Original '#70ff70'
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = colorProfile[0]; // Original '#d0ffd0'
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Small trailing particle
      if (orbT > 0.08) {
        const trailEased = 1 - Math.pow(1 - Math.max(0, orbT - 0.08), 2);
        const tx3 = effect.targetX + dx * trailEased;
        const ty3 = effect.targetY + dy * trailEased;
        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = colorProfile[6]; // Original '#50dd50'
        ctx.beginPath();
        ctx.arc(tx3, ty3, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Absorb burst at source — grows then fades
    const absorbAlpha = Math.min(1, pt * 3.5) * Math.max(0, 1 - (pt - 0.55) / 0.45);
    if (absorbAlpha > 0) {
      ctx.globalAlpha = absorbAlpha * 0.4;
      ctx.fillStyle = colorProfile[7]; // Original '#40ff40'
      ctx.beginPath();
      ctx.arc(effect.sourceX, effect.sourceY, 10 + pt * 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = absorbAlpha * 0.7;
      ctx.strokeStyle = colorProfile[3]; // Original '#90ff90'
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(effect.sourceX, effect.sourceY, 7 + pt * 7, 0, Math.PI * 2);
      ctx.stroke();

      // Sparkles rising from source
      const rng = seededRng(effect.seed + 9000);
      for (let s = 0; s < 4; s++) {
        const sa = rng() * Math.PI * 2;
        const sd = 5 + rng() * 8;
        ctx.globalAlpha = absorbAlpha * (0.5 + rng() * 0.4);
        ctx.fillStyle = colorProfile[2]; // Original '#b0ffb0'
        ctx.beginPath();
        ctx.arc(effect.sourceX + Math.cos(sa) * sd, effect.sourceY + Math.sin(sa) * sd - pt * 6, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
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
  drawLightningPath(ctx, bx1, by1, effect.targetX, effect.targetY, branches, '#ffe030', '#88ccff', baseAlpha, rng);

  // Second flicker bolt (dra variant has extra)
  if (isDra && baseAlpha > 0.2) {
    const rng2 = seededRng(flickerSeed + 50);
    drawLightningPath(
      ctx,
      bx1 + (rng2() - 0.5) * 8,
      by1,
      effect.targetX + (rng2() - 0.5) * 5,
      effect.targetY,
      1,
      '#aaddff',
      '#4488cc',
      baseAlpha * 0.45,
      rng2,
    );
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
  ctx.ellipse(
    effect.centerX,
    effect.centerY + effect.height * 0.15,
    effect.width * 0.28,
    effect.height * 0.22,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    const flameX = effect.centerX + (i - 1) * effect.width * 0.16;
    const flameY = effect.centerY + effect.height * 0.18 - Math.sin(effect.timer * 12 + i) * 2;
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
    const phase = (effect.timer * 1.8 + i * 0.18) % 1;
    const x = effect.centerX - effect.width * 0.16 + i * effect.width * 0.11;
    const y = effect.centerY + effect.height * 0.18 - phase * effect.height * 0.45;
    const radius = 2 + (1 - phase) * 2;
    ctx.globalAlpha = fade * (0.24 + (1 - phase) * 0.18);
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
    const startX = effect.centerX - effect.width * 0.22 + i * effect.width * 0.22;
    const startY = effect.centerY - effect.height * 0.18 + Math.sin(effect.timer * 14 + i) * 3;
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
    const phase = (effect.timer * 1.4 + i * 0.16) % 1;
    const x = effect.centerX + effect.width * 0.08 + i * 5;
    const y = effect.centerY - effect.height * 0.34 - phase * 10;
    ctx.globalAlpha = fade * (0.35 + (1 - phase) * 0.35);
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
    const x = effect.centerX + effect.width * block.x;
    const y = effect.centerY + effect.height * block.y;
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
    const phase = effect.timer * 2.2 + i * (Math.PI / 2);
    const orbitX = Math.cos(phase) * effect.width * 0.16;
    const orbitY = Math.sin(phase) * effect.height * 0.12;
    const x = effect.centerX + orbitX;
    const y = effect.centerY - effect.height * 0.16 + orbitY;
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
  ctx.arc(effect.centerX, effect.centerY + effect.height * 0.08, effect.width * 0.24, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  for (let i = 0; i < 3; i++) {
    const phase = (effect.timer * 1.5 + i * 0.22) % 1;
    const x = effect.centerX - effect.width * 0.18 + i * effect.width * 0.18;
    const y = effect.centerY + effect.height * 0.18 - phase * effect.height * 0.38;
    ctx.globalAlpha = fade * (0.28 + (1 - phase) * 0.22);
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
    const y = effect.centerY - effect.height * 0.08 + i * effect.height * 0.12;
    ctx.beginPath();
    for (let step = 0; step <= 12; step++) {
      const progress = step / 12;
      const x = effect.centerX - effect.width * 0.24 + progress * effect.width * 0.48;
      const offsetY = Math.sin(progress * Math.PI * 2 + effect.timer * 10 + i) * 2.5;
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

  const fade = Math.max(0, 1 - effect.timer / effect.duration);
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

// =============================================================================
// NEW MOVE ANIMATION RENDER FUNCTIONS
// =============================================================================

// --- Heal Pulse (Rest / Recover / Roost / Milk Drink) ---
// Expanding green rings + rising sparkles centered on user
function renderHealPulseEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const cx = effect.targetX; // self-target → targetX == sourceX
  const cy = effect.targetY;
  const rng = seededRng(effect.seed);

  ctx.save();

  // Two staggered expanding rings
  for (let ring = 0; ring < 3; ring++) {
    const offset = ring * 0.22;
    const rt = Math.max(0, Math.min(1, (t - offset) / (1 - offset)));
    if (rt <= 0) continue;
    const radius = 4 + rt * 22;
    const alpha = Math.max(0, 1 - rt);
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = ring === 1 ? effect.accentColor : effect.color;
    ctx.lineWidth = ring === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Soft inner glow
  const glowAlpha = Math.max(0, 1 - t * 2);
  if (glowAlpha > 0) {
    ctx.globalAlpha = glowAlpha * 0.18;
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rising sparkle particles
  const NUM_PARTICLES = 8;
  for (let i = 0; i < NUM_PARTICLES; i++) {
    const phaseSeed = rng();
    const delay = phaseSeed * 0.35;
    const pt = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
    if (pt <= 0) continue;
    const angle = (Math.PI * 2 * i) / NUM_PARTICLES + phaseSeed;
    const spread = 6 + rng() * 10;
    const px = cx + Math.cos(angle) * spread * (0.5 + pt * 0.5);
    const py = cy - pt * 18 - rng() * 4;
    const alpha = Math.max(0, 1 - pt * 1.4);
    const sz = 1.5 + rng() * 1.5;
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = pt < 0.5 ? effect.accentColor : effect.color;
    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --- Protect Shield (Protect / Detect / Endure) ---
// Expanding hex-faceted shield dome + energy sparks + edge flare
function renderProtectShieldEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const cx = effect.targetX;
  const cy = effect.targetY;
  const isEndure = effect.variant === 'endure';

  // Envelope: fast rise (0→0.25) then hold with gentle pulse (0.25→0.85) then fade (0.85→1)
  let alpha: number;
  if (t < 0.25) {
    alpha = t / 0.25;
  } else if (t < 0.85) {
    alpha = 1.0 - Math.sin(((t - 0.25) / 0.6) * Math.PI) * 0.1; // gentle breathe
  } else {
    alpha = Math.max(0, 1 - (t - 0.85) / 0.15);
  }

  ctx.save();

  const shieldR = 18 + Math.sin(t * Math.PI * 3) * 1.5;

  // --- Outer glowing ring ---
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = effect.color;
  ctx.lineWidth = 2.2;
  ctx.shadowColor = effect.color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, shieldR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // --- Inner fill glow ---
  ctx.globalAlpha = alpha * 0.12;
  ctx.fillStyle = effect.color;
  ctx.beginPath();
  ctx.arc(cx, cy, shieldR - 1, 0, Math.PI * 2);
  ctx.fill();

  // --- Hexagonal facets (6 inner lines from center to edge) ---
  ctx.globalAlpha = alpha * 0.35;
  ctx.strokeStyle = effect.accentColor;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + t * 0.8;
    const r = shieldR - 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 4, cy + Math.sin(angle) * 4);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.stroke();
    // Connect adjacent outer points for hex look
    const nextAngle = ((i + 1) / 6) * Math.PI * 2 + t * 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.lineTo(cx + Math.cos(nextAngle) * r, cy + Math.sin(nextAngle) * r);
    ctx.stroke();
  }

  // --- Orbiting energy sparks ---
  const NUM_SPARKS = isEndure ? 5 : 4;
  for (let i = 0; i < NUM_SPARKS; i++) {
    const sparkT = (t + i / NUM_SPARKS) % 1;
    const angle = sparkT * Math.PI * 2 * (isEndure ? 1.5 : 1.2) + (i * Math.PI * 2) / NUM_SPARKS;
    const sparkR = shieldR + 2 + Math.sin(t * Math.PI * 4 + i) * 2;
    const sx = cx + Math.cos(angle) * sparkR;
    const sy = cy + Math.sin(angle) * sparkR;
    const sparkAlpha = alpha * (0.6 + Math.sin(t * Math.PI * 6 + i) * 0.3);
    ctx.globalAlpha = sparkAlpha;
    ctx.fillStyle = i % 2 === 0 ? effect.color : effect.accentColor;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Flash burst on entry (t < 0.2) ---
  if (t < 0.2) {
    const burstT = t / 0.2;
    const burstAlpha = Math.max(0, 1 - burstT) * 0.55;
    ctx.globalAlpha = burstAlpha;
    ctx.fillStyle = effect.accentColor;
    ctx.beginPath();
    ctx.arc(cx, cy, shieldR * burstT, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --- Double Team ---
// Ghost clones burst outward from center. Uses the Pokemon's actual sprite when available.
function renderDoubleTeamEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const cx = effect.sourceX;
  const cy = effect.sourceY;
  const img = effect.spriteImage ?? null;

  ctx.save();

  const CLONES = 4;
  const finalOffsets = [-30, -15, 15, 30];

  for (let i = 0; i < CLONES; i++) {
    const delay = i * 0.06;
    const pt = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
    if (pt <= 0) continue;

    const slideT = Math.min(1, pt * 2.2);
    const eased = 1 - Math.pow(1 - slideT, 3);
    const ox = finalOffsets[i] * eased;

    const fadeIn = Math.min(1, pt * 5);
    const fadeOut = Math.max(0, 1 - Math.max(0, pt - 0.55) / 0.45);
    const alpha = fadeIn * fadeOut * 0.55;
    if (alpha <= 0) continue;

    if (img) {
      // Draw the actual sprite as a blueish ghost clone
      const sprW = 38;
      const sprH = 38;
      ctx.save();
      ctx.globalAlpha = alpha;
      // Tint blue by drawing sprite then applying a colored overlay
      ctx.drawImage(img, cx + ox - sprW / 2, cy - sprH / 2, sprW, sprH);
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = alpha * 0.45;
      ctx.fillStyle = '#a0c8ff';
      ctx.fillRect(cx + ox - sprW / 2, cy - sprH / 2, sprW, sprH);
      ctx.restore();
    } else {
      // Fallback: silhouette
      const bodyW = 10;
      const bodyH = 15;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = i % 2 === 0 ? effect.accentColor : '#b8d8ff';
      ctx.beginPath();
      ctx.ellipse(cx + ox, cy, bodyW, bodyH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + ox, cy - bodyH * 0.7, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Speed streak
    if (eased < 0.85) {
      const streakAlpha = alpha * (1 - eased / 0.85) * 0.35;
      ctx.globalAlpha = streakAlpha;
      ctx.strokeStyle = effect.accentColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + ox, cy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Flash ring at activation
  if (t < 0.25) {
    const flashPt = t / 0.25;
    ctx.globalAlpha = (1 - flashPt) * 0.5;
    ctx.strokeStyle = effect.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 4 + flashPt * 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

// --- Solar Beam ---
// Phase 0–0.35: Sun glow builds at source
// Phase 0.35–1.0: Wide bright beam fires to target + impact flare
function renderSolarBeamEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const PHASE2 = 0.35;

  ctx.save();

  if (t < PHASE2) {
    const pt = t / PHASE2;
    // Building sun glow at source
    const glowR = 4 + pt * 14;

    ctx.globalAlpha = pt * 0.25;
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.arc(effect.sourceX, effect.sourceY, glowR * 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = pt * 0.7;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(effect.sourceX, effect.sourceY, glowR, 0, Math.PI * 2);
    ctx.stroke();

    // Sun rays
    const numRays = 8;
    for (let i = 0; i < numRays; i++) {
      const angle = (Math.PI * 2 * i) / numRays + pt * 0.8;
      const rayLen = glowR * (0.5 + 0.4 * Math.sin(pt * Math.PI * 3 + i));
      ctx.globalAlpha = pt * 0.6;
      ctx.strokeStyle = effect.accentColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(effect.sourceX + Math.cos(angle) * glowR * 0.7, effect.sourceY + Math.sin(angle) * glowR * 0.7);
      ctx.lineTo(
        effect.sourceX + Math.cos(angle) * (glowR + rayLen),
        effect.sourceY + Math.sin(angle) * (glowR + rayLen),
      );
      ctx.stroke();
    }
  } else {
    const pt = (t - PHASE2) / (1 - PHASE2);
    const fadeAlpha = pt > 0.7 ? Math.max(0, 1 - (pt - 0.7) / 0.3) : 1;

    // Wide beam body
    const beamWidth = 7 - pt * 3;
    ctx.globalAlpha = 0.55 * fadeAlpha;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = beamWidth * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(effect.sourceX, effect.sourceY);
    ctx.lineTo(effect.targetX, effect.targetY);
    ctx.stroke();

    // Bright core
    ctx.globalAlpha = 0.9 * fadeAlpha;
    ctx.strokeStyle = effect.accentColor;
    ctx.lineWidth = beamWidth * 0.5;
    ctx.beginPath();
    ctx.moveTo(effect.sourceX, effect.sourceY);
    ctx.lineTo(effect.targetX, effect.targetY);
    ctx.stroke();

    // Impact flare
    const flareR = 4 + pt * 16;
    ctx.globalAlpha = (1 - pt) * 0.7 * fadeAlpha;
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, flareR, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = (1 - pt) * 0.95 * fadeAlpha;
    ctx.fillStyle = effect.accentColor;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, flareR * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Side scatter lines at target
    const scatter = 6;
    for (let i = 0; i < scatter; i++) {
      const angle = (Math.PI * 2 * i) / scatter + pt;
      const inner = flareR * 0.3;
      const outer = flareR + 5;
      ctx.globalAlpha = (1 - pt) * 0.5 * fadeAlpha;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(effect.targetX + Math.cos(angle) * inner, effect.targetY + Math.sin(angle) * inner);
      ctx.lineTo(effect.targetX + Math.cos(angle) * outer, effect.targetY + Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
  }

  ctx.restore();
}

// --- Rapid Spin ---
// Concentric motion-blur rings + speed lines at attacker position
// (The pokemon sprite itself is spun by the animation director tween)
function renderRapidSpinEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const cx = effect.sourceX;
  const cy = effect.sourceY;
  const rng = seededRng(effect.seed);

  ctx.save();

  // Spinning arc rings (motion blur feel)
  const NUM_RINGS = 3;
  for (let r = 0; r < NUM_RINGS; r++) {
    const rt = Math.max(0, Math.min(1, t - r * 0.08));
    const radius = 8 + r * 5 + rt * 4;
    const startAngle = rt * Math.PI * 6 + (r * Math.PI * 2) / NUM_RINGS;
    const arcLength = Math.PI * 1.2;
    const alpha = Math.max(0, (1 - rt) * 0.6);

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = r === 0 ? '#ffffff' : effect.color;
    ctx.lineWidth = 2 - r * 0.4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + arcLength);
    ctx.stroke();
  }

  // Speed lines radiating outward
  if (t < 0.7) {
    const numLines = 6;
    for (let i = 0; i < numLines; i++) {
      const baseAngle = (Math.PI * 2 * i) / numLines + t * Math.PI * 4 + rng() * 0.3;
      const innerR = 4 + rng() * 3;
      const outerR = 14 + rng() * 8;
      const alpha = (1 - t / 0.7) * (0.4 + rng() * 0.3);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = effect.accentColor;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(baseAngle) * innerR, cy + Math.sin(baseAngle) * innerR);
      ctx.lineTo(cx + Math.cos(baseAngle) * outerR, cy + Math.sin(baseAngle) * outerR);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// --- Twister Spin ---
// Spiral wind vortex at target position
// (The target pokemon sprite is spun by the animation director tween)
function renderTwisterSpinEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const cx = effect.targetX;
  const cy = effect.targetY;
  const rng = seededRng(effect.seed);

  ctx.save();

  // Spiral arms
  const NUM_ARMS = 4;
  for (let arm = 0; arm < NUM_ARMS; arm++) {
    const armOffset = (Math.PI * 2 * arm) / NUM_ARMS;
    const numPoints = 18;
    ctx.beginPath();
    for (let p = 0; p < numPoints; p++) {
      const progress = p / numPoints;
      const angle = armOffset + progress * Math.PI * 3 + t * Math.PI * 5;
      const radius = progress * 20 * (0.6 + t * 0.4);
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius * 0.6;
      if (p === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    const alpha = Math.max(0, 0.6 - t * 0.4);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = arm % 2 === 0 ? effect.color : effect.accentColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Debris particles orbiting center
  const NUM_DEBRIS = 8;
  for (let i = 0; i < NUM_DEBRIS; i++) {
    const debrisSeed = rng();
    const angle = (Math.PI * 2 * i) / NUM_DEBRIS + t * Math.PI * 6 + debrisSeed;
    const radius = (6 + debrisSeed * 14) * (0.5 + t * 0.5);
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius * 0.55;
    const alpha = Math.max(0, (0.7 - t * 0.5) * (0.5 + debrisSeed * 0.5));
    const sz = 1 + debrisSeed * 2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = effect.accentColor;
    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fill();
  }

  // Center condensed glow
  const glowAlpha = Math.max(0, 0.4 - t * 0.3);
  ctx.globalAlpha = glowAlpha;
  ctx.fillStyle = effect.color;
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// --- Icy Wind ---
// Horizontal sweep of ice crystal particles from one side to the other across the target
function renderIcyWindEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const rng = seededRng(effect.seed);

  ctx.save();

  // Direction: attack comes from source side toward target
  const fromLeft = effect.sourceX < effect.targetX;

  // Draw 20 ice crystal particles swept in the wind
  const NUM = 20;
  for (let i = 0; i < NUM; i++) {
    const pSeed = rng();
    const delay = pSeed * 0.35;
    const pt = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
    if (pt <= 0) continue;

    const startX = fromLeft ? effect.sourceX - 10 - pSeed * 20 : effect.sourceX + 10 + pSeed * 20;
    const spanX = (fromLeft ? 1 : -1) * (80 + pSeed * 50);
    const px = startX + spanX * pt;
    const py = effect.targetY - 20 + rng() * 40;
    const alpha = Math.min(1, pt * 3) * Math.max(0, 1 - (pt - 0.65) / 0.35);
    const sz = 1.5 + rng() * 2.5;

    ctx.globalAlpha = alpha * 0.85;
    ctx.fillStyle = rng() > 0.6 ? effect.accentColor : effect.color;
    // Draw small ice shard (diamond shape)
    ctx.beginPath();
    ctx.moveTo(px, py - sz);
    ctx.lineTo(px + sz * 0.6, py);
    ctx.lineTo(px, py + sz);
    ctx.lineTo(px - sz * 0.6, py);
    ctx.closePath();
    ctx.fill();
  }

  // Trailing cold mist streaks
  const NUM_STREAKS = 6;
  for (let i = 0; i < NUM_STREAKS; i++) {
    const sSeed = rng();
    const delay = sSeed * 0.2;
    const pt = Math.max(0, Math.min(1, (t - delay) / (1 - delay)));
    if (pt <= 0) continue;

    const y = effect.targetY - 15 + (i / NUM_STREAKS) * 30;
    const startX2 = fromLeft ? effect.sourceX : effect.sourceX;
    const len = (fromLeft ? 1 : -1) * (30 + sSeed * 25) * pt;
    const alpha = Math.max(0, 0.4 - pt * 0.3) * (0.5 + sSeed * 0.5);

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX2, y);
    ctx.lineTo(startX2 + len, y + (rng() - 0.5) * 4);
    ctx.stroke();
  }

  // Impact burst at target when front arrives
  if (t > 0.55) {
    const burstT = (t - 0.55) / 0.45;
    const radius = 2 + burstT * 14;
    ctx.globalAlpha = Math.max(0, (1 - burstT) * 0.55);
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, (1 - burstT) * 0.2);
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.arc(effect.targetX, effect.targetY, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// --- Electroweb ---
// An expanding hexagonal electric net that captures the target
function renderElectrowebEffect(ctx: CanvasRenderingContext2D, effect: AttackEffect): void {
  const t = effect.timer / effect.duration;
  const cx = effect.targetX;
  const cy = effect.targetY;
  const rng = seededRng(effect.seed);

  ctx.save();

  // Phase 1 (0-0.4): Net shoots from source and expands
  // Phase 2 (0.4-1.0): Net fully covers target and crackles
  const expandT = Math.min(1, t / 0.4);
  const crackleT = Math.max(0, (t - 0.4) / 0.6);

  // Draw hexagonal web grid
  const maxRadius = 22;
  const radius = maxRadius * expandT;
  const fadeAlpha = Math.max(0, 1 - crackleT * 0.6);
  const numRings = 3;

  for (let ring = 1; ring <= numRings; ring++) {
    const r = (radius * ring) / numRings;
    const hexSides = 6;
    ctx.beginPath();
    for (let i = 0; i <= hexSides; i++) {
      const angle = (Math.PI * 2 * i) / hexSides - Math.PI / 6;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r * 0.6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const ringAlpha = fadeAlpha * (1 - (ring - 1) * 0.2);
    ctx.globalAlpha = ringAlpha * 0.8;
    ctx.strokeStyle = ring === 1 ? effect.accentColor : effect.color;
    ctx.lineWidth = ring === 1 ? 1.5 : 1;
    ctx.stroke();
  }

  // Spoke lines from center to hex corners
  if (expandT > 0.3) {
    const hexSides = 6;
    for (let i = 0; i < hexSides; i++) {
      const angle = (Math.PI * 2 * i) / hexSides - Math.PI / 6;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.6;
      ctx.globalAlpha = fadeAlpha * 0.55;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  // Electric crackle sparks on nodes (phase 2)
  if (crackleT > 0) {
    const hexSides = 6;
    for (let i = 0; i < hexSides; i++) {
      const angle = (Math.PI * 2 * i) / hexSides - Math.PI / 6;
      const r = maxRadius;
      const nx = cx + Math.cos(angle) * r;
      const ny = cy + Math.sin(angle) * r * 0.6;
      const flickerAlpha = rng() * crackleT * 0.9;
      ctx.globalAlpha = flickerAlpha;
      ctx.fillStyle = effect.accentColor;
      ctx.beginPath();
      ctx.arc(nx, ny, 1.5 + rng() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Small lightning arcs between nodes
    for (let i = 0; i < 3; i++) {
      if (rng() > 0.5 * crackleT) continue;
      const a1 = (Math.PI * 2 * i) / 6 - Math.PI / 6;
      const a2 = (Math.PI * 2 * (i + 2)) / 6 - Math.PI / 6;
      const x1 = cx + Math.cos(a1) * maxRadius * 0.7;
      const y1 = cy + Math.sin(a1) * maxRadius * 0.7 * 0.6;
      const x2 = cx + Math.cos(a2) * maxRadius * 0.7;
      const y2 = cy + Math.sin(a2) * maxRadius * 0.7 * 0.6;
      ctx.globalAlpha = rng() * 0.6;
      drawLightningPath(ctx, x1, y1, x2, y2, 1, effect.color, effect.accentColor, 0.5, rng);
    }
  }

  ctx.restore();
}

// --- Convenience: Clear all effects ---

export function clearAllPopups(): void {
  popups.length = 0;
}

// =============================================================================
// WEATHER OVERLAY EFFECTS
// =============================================================================

type WeatherConditionId = 'sandstorm' | 'rain' | 'hail' | 'sun';

export function renderWeatherOverlay(
  ctx: CanvasRenderingContext2D,
  weatherType: WeatherConditionId,
  now: number,
): void {
  switch (weatherType) {
    case 'sandstorm':
      renderSandstormOverlay(ctx, now);
      break;
    case 'rain':
      renderRainOverlay(ctx, now);
      break;
    case 'hail':
      renderHailOverlay(ctx, now);
      break;
    case 'sun':
      renderSunOverlay(ctx, now);
      break;
  }
}

function renderSandstormOverlay(ctx: CanvasRenderingContext2D, now: number): void {
  const W = 240;
  const H = 95;
  ctx.save();

  // Base amber haze
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#c89050';
  ctx.fillRect(0, 0, W, H);

  // Large slow dust blobs
  for (let i = 0; i < 5; i++) {
    const speed = 14 + (i % 4) * 7;
    const cx = ((i * 79 + now * speed) % (W + 100)) - 50;
    const cy = ((i * 31) % H) + Math.sin(now * 0.35 + i * 1.4) * 8;
    const rx = 18 + (i % 3) * 12;
    const ry = 5 + (i % 3) * 4;
    ctx.globalAlpha = 0.06 + (i % 3) * 0.025;
    ctx.fillStyle = i % 2 === 0 ? '#d4a060' : '#ba8840';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.sin(now * 0.25 + i * 0.8) * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Medium curved streaks
  ctx.lineCap = 'round';
  for (let i = 0; i < 20; i++) {
    const speed = 52 + (i % 5) * 15;
    const x0 = ((i * 43 + now * speed) % (W + 40)) - 20;
    const y0 = ((i * 19) % H) + Math.sin(now * 1.3 + i * 0.9) * 2.5;
    const len = 8 + (i % 4) * 5;
    const dip = Math.sin(now * 2.2 + i * 1.1) * 2.5;
    ctx.globalAlpha = 0.18 + (i % 5) * 0.055;
    ctx.strokeStyle = i % 3 === 0 ? '#e0b870' : i % 3 === 1 ? '#c8984a' : '#d4a858';
    ctx.lineWidth = 0.5 + (i % 3) * 0.25;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + len * 0.55, y0 + dip, x0 + len, y0 + 1.5);
    ctx.stroke();
  }

  // Fine fast particles
  for (let i = 0; i < 38; i++) {
    const speed = 95 + (i % 7) * 16;
    const px = ((i * 31 + now * speed) % (W + 16)) - 8;
    const py = ((i * 17) % H) + Math.sin(now * 2.8 + i * 1.3) * 3.5;
    const r = 0.35 + (i % 4) * 0.28;
    ctx.globalAlpha = 0.18 + (i % 5) * 0.065;
    ctx.fillStyle = i % 4 === 0 ? '#f0c878' : i % 4 === 1 ? '#d49838' : i % 4 === 2 ? '#c89050' : '#e8b060';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function renderRainOverlay(ctx: CanvasRenderingContext2D, now: number): void {
  const W = 240;
  const H = 95;
  ctx.save();
  // Blue tint
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#3870b0';
  ctx.fillRect(0, 0, W, H);
  // Falling rain drops
  ctx.strokeStyle = '#88c0e8';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 28; i++) {
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

function renderHailOverlay(ctx: CanvasRenderingContext2D, now: number): void {
  const W = 240;
  const H = 95;
  ctx.save();
  // Pale blue tint
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#90b8d8';
  ctx.fillRect(0, 0, W, H);
  // Falling ice pellets
  ctx.fillStyle = '#d8eeff';
  for (let i = 0; i < 18; i++) {
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

function renderSunOverlay(ctx: CanvasRenderingContext2D, now: number): void {
  const W = 240;
  const H = 95;
  ctx.save();
  // Warm golden tint pulsing gently
  const pulse = 0.06 + Math.sin(now * 1.6) * 0.02;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffd860';
  ctx.fillRect(0, 0, W, H);
  // Radial light beams from top-right corner
  ctx.globalAlpha = 0.04 + Math.sin(now * 1.1) * 0.015;
  ctx.fillStyle = '#fff8c0';
  for (let i = 0; i < 5; i++) {
    const baseAngle = Math.PI * 0.55 + i * (Math.PI * 0.12);
    const spread = 0.055;
    const len = 120;
    ctx.beginPath();
    ctx.moveTo(W, 0);
    ctx.lineTo(W + Math.cos(baseAngle - spread) * len, Math.sin(baseAngle - spread) * len);
    ctx.lineTo(W + Math.cos(baseAngle + spread) * len, Math.sin(baseAngle + spread) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
