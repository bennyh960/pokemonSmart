/**
 * Cinematic Physics Framework
 * Manages frame rate agnostic time delta updates and conditional texture loading buffers.
 */

import type { TrainerBattleData } from '../..';
import type { InputManager } from '../../../../engine/input';
import { isRTL, t } from '../../../../i18n/i18n';
import { getLocalizedName } from '../../../../services/pokemon-data';
import { createTextBox, updateTextBox, type TextBoxState } from '../../../../ui/text-box';

import type { CinematicState } from './state';

export const CINEMATIC_TOTAL = 3.6;

export const CINEMATIC_PHASE_CONSTANTS = {
  INTRO_SLIDE_DURATION: 0.5,
  VS_START: 0.5,
  VS_END: 2.0,
} as const;

// ── Particle Allocation Helpers ───────────────────────────────────────────────

function spawnBurst(state: CinematicState, x: number, y: number, color: string, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = ((Math.PI * 2) / n) * i + Math.random() * 0.5;
    const spd = 0.8 + Math.random() * 2;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 1,
      color,
      size: 1 + Math.random() * 1.5,
    });
  }
}

function tickParticles(state: CinematicState, dt: number) {
  const decay = dt * 1.8;
  state.particles = state.particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= decay;
    return p.life > 0;
  });
}

// ── Motion Interpolation Functions ─────────────────────────────────────────────

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

const easeBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ── Main Update Lifecycle ──────────────────────────────────────────────────────

export function updateTrainerCinematic(
  state: CinematicState,
  dt: number,
  trainerData: TrainerBattleData,
  textBox: TextBoxState | null,
  input: InputManager,
) {
  const W = 240;

  // ── Single Execution Network Guard ──
  if (!state.loadDispatched) {
    state.loadDispatched = true; // Block subsequent frames from entering this conditional block

    // Fire the asset network retrieval requests exactly ONCE
    if (!textBox) {
      textBox = createTextBox(
        [t('battle.trainerWantsBattle', { name: getLocalizedName(trainerData.trainerName) })],
        isRTL(),
      );
    }
  }

  state.isLoaded = true;
  state.timer += dt;

  // ── Mode 1: Central Duel Screen ──
  if (!state.battleSceneActive) {
    const maxVsTime = CINEMATIC_PHASE_CONSTANTS.VS_END - 0.01;
    // Hard-clamp the timer: Ensure it stops ticking completely at 1.99s
    if (state.timer > maxVsTime) {
      state.timer = maxVsTime;
    }

    const slideProg = clamp(state.timer / CINEMATIC_PHASE_CONSTANTS.INTRO_SLIDE_DURATION, 0, 1);
    const ep = easeOut(slideProg);

    state.p1x = lerp(-50, W * 0.22, ep);
    state.p2x = lerp(W + 50, W * 0.78, ep);

    if (state.timer >= CINEMATIC_PHASE_CONSTANTS.VS_START) {
      state.vsActive = true;
      state.vsTimer += dt;

      if (!state.particlesSpawned) {
        const color = ['#ffdd00', '#ffffff', '#ffff00'][state.introStyle];
        spawnBurst(state, W / 2, 35, color, 18);
        state.particlesSpawned = true;
      }

      const vsProgress = Math.min(1, state.vsTimer / 0.3);
      state.vsScale = easeBack(vsProgress);
      state.vsAngle =
        state.introStyle === 2
          ? Math.sin(state.vsTimer * 14) * 0.07
          : Math.sin(state.vsTimer * 5) * 0.03 * (1 - vsProgress);
    }

    // NATIVELY UPDATE AND INTERRUPT WITH THE TEXTBOX LIFECYCLE
    let textDismissed = false;

    if (textBox) {
      textDismissed = updateTextBox(textBox, input, dt);
    }

    // THE SEPARATION GATE: Only transition when the time is ripe OR the user has dismissed the box
    if (state.timer >= maxVsTime || textDismissed) {
      state.timer = CINEMATIC_PHASE_CONSTANTS.VS_END; // Advance global timer past the gate explicitly
      state.vsActive = false;
      state.battleSceneActive = true;
      state.particles = [];
    }
  }
  // ── Mode 2: Multi-Quadrant Arena Sliding Deployment ──
  else {
    state.battleTimer += dt;
  }

  tickParticles(state, dt);

  return { done: state.timer >= CINEMATIC_TOTAL, textBox };
}
