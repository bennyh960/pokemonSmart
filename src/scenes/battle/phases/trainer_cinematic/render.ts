/**
 * Cinematic Pipeline Renderer
 * Manages dual lifecycle presentation (VS layer vs Arena Splitting Layout).
 */

import type { CinematicState } from './state';
import { INTRO_STYLE_RENDERERS } from './intro_styles';
import { getCachedImage } from '../../../../engine/sprite-loader';
import { CINEMATIC_PHASE_CONSTANTS } from './update';
import type { TrainerBattleData } from '../../battle_scene';
import { getPlayerData } from '../../../../systems/game-state';
import { getLocale } from '../../../../i18n/i18n';

const W = 240;
const H = 83; // BTL.FIELD_H reference resolution size

function drawFlash(ctx: CanvasRenderingContext2D, alpha: number) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawPlatform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rX: number,
  rY: number,
  color: string,
  strokeColor: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rX, rY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, rX, rY, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function renderTrainerCinematic(
  ctx: CanvasRenderingContext2D,
  state: CinematicState,
  trainerData: TrainerBattleData | null,
  bgImage: HTMLImageElement | null,
) {
  // ─── Phase B: Dual Quadrant Arena Field Deployment ───────────────────────────
  if (state.battleSceneActive) {
    const bt = state.battleTimer;

    // Split background rendering pipeline (Enemy Top Navy, Player Bottom Forest Green)
    const topG = ctx.createLinearGradient(0, 0, 0, H / 2);
    topG.addColorStop(0, '#0d0d3a');
    topG.addColorStop(1, '#1a1a5a');
    ctx.fillStyle = topG;
    ctx.fillRect(0, 0, W, H / 2);

    const botG = ctx.createLinearGradient(0, H / 2, 0, H);
    botG.addColorStop(0, '#0a2a0a');
    botG.addColorStop(1, '#1a4a1a');
    ctx.fillStyle = botG;
    ctx.fillRect(0, H / 2, W, H / 2);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.restore();

    const arenaProg = Math.min(1, bt / 0.5);
    const ep = 1 - Math.pow(1 - arenaProg, 3); // Clean easeOut calculation execution

    // 1. Enemy Component Array (Top-Right sliding target position = W * 0.55)
    const ex = ep * (W * 0.72);
    const ey = 4;

    drawPlatform(ctx, ex + 24, ey + 44, 24, 5, 'rgba(80,80,200,0.25)', 'rgba(120,120,255,0.3)');

    if (trainerData?.trainerSpriteType) {
      const tImg = getCachedImage(`/sprites/trainers/${trainerData.trainerSpriteType}.png`);
      if (tImg) {
        ctx.save();
        ctx.translate(ex + 24, ey + 24);
        ctx.scale(-1, 1); // Native mirrored Pokémon presentation flip mapping
        ctx.drawImage(tImg, -12, -16, 24, 32);
        ctx.restore();
      }
    }

    // 2. Player Component Array (Bottom-Left sliding target position = W * 0.12)
    const px = W - ep * (W - W * 0.12);
    const py = H / 2 + 4;

    drawPlatform(ctx, px + 24, py + 30, 26, 6, 'rgba(80,200,80,0.25)', 'rgba(120,255,120,0.3)');

    const pImg = getCachedImage(`/sprites/trainers/player.png`);
    if (pImg) {
      ctx.save();
      ctx.drawImage(pImg, px + 12, py, 24, 32);
      ctx.restore();
    }

    // 3. Centralised High-Impact Banner Text Draw
    if (arenaProg >= 1) {
      const textAlpha = Math.min(1, (bt - 0.5) * 4);
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.translate(W / 2, H / 2);
      const pulse = 1 + Math.sin(bt * 10) * 0.04;
      ctx.scale(pulse, pulse);
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const g = ctx.createLinearGradient(-30, 0, 30, 0);
      g.addColorStop(0, '#ffdd00');
      g.addColorStop(1, '#ff6600');
      ctx.fillStyle = g;
      ctx.fillText('BATTLE START!', 0, 0);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.strokeText('BATTLE START!', 0, 0);
      ctx.restore();
    }

    if (bt < 0.15) drawFlash(ctx, ((0.15 - bt) / 0.15) * 0.6);
  }
  // ─── Phase A: Primary Dual Duelist Slide & VS Presentation ───────────────────
  else {
    INTRO_STYLE_RENDERERS[state.introStyle](ctx, state, state.timer);

    if (!state.isLoaded) return;

    const fadeInAlpha = Math.min(1, state.timer * 3);
    ctx.save();
    ctx.globalAlpha = fadeInAlpha;

    const spriteY = H * 0.25;
    const textY = spriteY + 50; // Positioned exactly below the trainers' feet

    // 1. Enemy Character & Name Layout
    ctx.save();
    ctx.translate(state.p2x, spriteY + 16);

    let enemyImg: HTMLImageElement | null = null;
    if (trainerData?.trainerSpriteType) {
      enemyImg = getCachedImage(`/sprites/trainers/${trainerData.trainerSpriteType}.png`);
    }

    if (enemyImg && enemyImg.complete && enemyImg.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = '#ff88ff';
      ctx.shadowBlur = 4;
      ctx.scale(-1.1, 1.1);
      ctx.drawImage(enemyImg, -12, -16, 24, 32);
      ctx.restore();
    }
    ctx.restore();

    // Draw Enemy Name (Slides with the sprite)
    if (trainerData?.trainerName) {
      ctx.save();
      ctx.font = 'bold 8px monospace'; // Small, clean retro-sized font
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      // If getLocal() is a function you call, invoke it. Otherwise use the property directly.
      const enemyName = trainerData.trainerName[getLocale()] || 'TRAINER';
      ctx.fillText(enemyName.toUpperCase(), state.p2x, textY);
      ctx.restore();
    }

    // 2. Player Character & Name Layout
    ctx.save();
    ctx.translate(state.p1x, spriteY + 16);
    ctx.scale(1.1, 1.1);

    const pImg = getCachedImage(`/sprites/trainers/player.png`);
    if (pImg && pImg.complete && pImg.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = '#44ffff';
      ctx.shadowBlur = 4;
      ctx.drawImage(pImg, -12, -16, 24, 32);
      ctx.restore();
    }
    ctx.restore();

    // Draw Player Name (Slides with the sprite)
    const playerData = getPlayerData();
    if (playerData?.name) {
      ctx.save();
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(playerData.name.toUpperCase(), state.p1x, textY);
      ctx.restore();
    }

    ctx.restore(); // Restores total globalAlpha loop layout

    if (
      state.timer > CINEMATIC_PHASE_CONSTANTS.INTRO_SLIDE_DURATION &&
      state.timer < CINEMATIC_PHASE_CONSTANTS.INTRO_SLIDE_DURATION + 0.15
    ) {
      const elapsed = state.timer - CINEMATIC_PHASE_CONSTANTS.INTRO_SLIDE_DURATION;
      drawFlash(ctx, ((0.15 - elapsed) / 0.15) * 0.7);
    }
  }

  // ─── Global Environment Particle Tick Stack ───
  state.particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}
