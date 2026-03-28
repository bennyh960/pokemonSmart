import type { Scene, Pokemon } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import type { EvolutionStep } from '../services/pokemon-data.js';
import { drawText, fillRect } from '../engine/renderer.js';
import { createTextBox, renderTextBox, updateTextBox } from '../ui/text-box.js';
import { createCaptureSuccessEffect, renderCaptureSuccessEffect, updateCaptureSuccessEffect } from '../ui/battle-animations.js';
import { getPokemonDisplayName } from '../services/pokemon-data.js';
import { applyEvolution } from '../systems/encounter.js';
import { autoSave, getPlayerData, hasActiveGame } from '../systems/game-state.js';
import { getCachedImage, loadImage } from '../engine/sprite-loader.js';
import { isRTL, t } from '../i18n/i18n.js';
import { setPokedexFocus } from './pokedex.js';

interface EvolutionRequest {
  evolution: EvolutionStep;
  onComplete?: () => void;
  pokemon: Pokemon;
}

let pendingEvolutionRequest: EvolutionRequest | null = null;

export function setEvolutionData(
  pokemon: Pokemon,
  evolution: EvolutionStep,
  onComplete?: () => void,
): void {
  pendingEvolutionRequest = { pokemon, evolution, onComplete };
}

type EvolutionPhase = 'animating' | 'message';

export function createEvolutionScene(
  input: InputManager,
  stateMachine: StateMachine,
  audio: AudioManager,
): Scene {
  let request: EvolutionRequest | null = null;
  let phase: EvolutionPhase = 'animating';
  let timer = 0;
  let fromId = 0;
  let toId = 0;
  let evolvedApplied = false;
  let completeFx: ReturnType<typeof createCaptureSuccessEffect> | null = null;
  let textBox: ReturnType<typeof createTextBox> | null = null;

  const CENTER_X = 120;
  const CENTER_Y = 62;
  const EVOLVE_AT = 1.8;
  const MESSAGE_AT = 2.55;

  function finalizeEvolution(): void {
    if (!request || evolvedApplied) return;

    evolvedApplied = true;
    if (applyEvolution(request.pokemon, toId)) {
      if (hasActiveGame()) {
        getPlayerData().pokedex[toId] = true;
      }
      autoSave();
      request.onComplete?.();
    }

    completeFx = createCaptureSuccessEffect(CENTER_X, CENTER_Y + 4);
    audio.playCry(toId);
  }

  function renderBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, 160);
    grad.addColorStop(0, '#160826');
    grad.addColorStop(0.45, '#1d1038');
    grad.addColorStop(1, '#080612');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 240, 160);

    const bandPulse = 0.5 + 0.5 * Math.sin(timer * 2.4);
    ctx.save();
    ctx.globalAlpha = 0.12 + bandPulse * 0.08;
    fillRect(ctx, 0, 18, 240, 10, '#5f48d8');
    fillRect(ctx, 0, 108, 240, 12, '#3ba4ff');
    ctx.restore();

    for (let i = 0; i < 3; i++) {
      const radius = 22 + i * 16 + Math.sin(timer * 2 + i) * 4;
      ctx.save();
      ctx.globalAlpha = 0.08 + i * 0.04;
      ctx.strokeStyle = i % 2 === 0 ? '#7cd8ff' : '#ff79d8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function renderPokemonSprite(ctx: CanvasRenderingContext2D): void {
    const activeId = evolvedApplied ? toId : fromId;
    const sprite = getCachedImage(`/sprites/pokemon/front/${activeId}.png`);

    const introProgress = Math.max(0, Math.min(1, timer / EVOLVE_AT));
    const pulse = 0.5 + 0.5 * Math.sin(timer * 11);
    let scale = 1;
    let alpha = 1;

    if (!evolvedApplied) {
      scale = 1 + introProgress * 0.08 + pulse * 0.06;
    } else {
      const settle = Math.max(0, Math.min(1, (timer - EVOLVE_AT) / (MESSAGE_AT - EVOLVE_AT)));
      scale = 1.18 - settle * 0.18;
      alpha = 0.55 + settle * 0.45;
    }

    const drawW = 64 * scale;
    const drawH = 64 * scale;
    const drawX = CENTER_X - drawW / 2;
    const drawY = CENTER_Y - drawH / 2;

    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      drawText(ctx, getPokemonDisplayName(activeId), CENTER_X, CENTER_Y - 8, {
        size: 8,
        color: '#ffffff',
        align: 'center',
      });
    }

    if (!evolvedApplied) {
      const flashStrength = 0.14 + pulse * 0.16;
      const flashColor = Math.floor(timer * 5) % 2 === 0 ? '#7cd8ff' : '#ff5eb3';
      ctx.save();
      ctx.globalAlpha = flashStrength;
      ctx.fillStyle = flashColor;
      ctx.beginPath();
      ctx.arc(CENTER_X, CENTER_Y, 26 + pulse * 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (timer > EVOLVE_AT - 0.2 && timer < EVOLVE_AT + 0.1) {
      const whiteFlash = 1 - Math.min(1, Math.abs(timer - EVOLVE_AT) / 0.18);
      ctx.save();
      ctx.globalAlpha = whiteFlash * 0.85;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 240, 160);
      ctx.restore();
    }
  }

  return {
    enter(): void {
      request = pendingEvolutionRequest;
      pendingEvolutionRequest = null;
      phase = 'animating';
      timer = 0;
      evolvedApplied = false;
      completeFx = null;
      textBox = null;

      if (!request) return;

      fromId = request.pokemon.id;
      toId = request.evolution.id;
      loadImage(`/sprites/pokemon/front/${fromId}.png`).catch(() => {});
      loadImage(`/sprites/pokemon/front/${toId}.png`).catch(() => {});
      audio.playCry(fromId);
    },

    exit(): void {
      request = null;
      completeFx = null;
      textBox = null;
    },

    update(dt: number): void {
      if (!request) {
        stateMachine.pop();
        return;
      }

      if (completeFx) updateCaptureSuccessEffect(completeFx, dt);

      if (phase === 'animating') {
        timer += dt;
        if (timer >= EVOLVE_AT) {
          finalizeEvolution();
        }
        if (timer >= MESSAGE_AT) {
          phase = 'message';
          textBox = createTextBox([
            t('evolution.congrats', {
              from: getPokemonDisplayName(fromId),
              to: getPokemonDisplayName(toId),
            }),
            t('evolution.openPokedex'),
          ], isRTL());
        }
        return;
      }

      if (textBox && updateTextBox(textBox, input, dt)) {
        setPokedexFocus(toId, true);
        stateMachine.pop();
        stateMachine.push('POKEDEX');
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      renderBackground(ctx);

      drawText(ctx, t('evolution.title'), 120, 10, {
        size: 10,
        color: '#ffffff',
        align: 'center',
      });

      if (!evolvedApplied) {
        drawText(ctx, getPokemonDisplayName(fromId), 120, 24, {
          size: 7,
          color: '#cfe8ff',
          align: 'center',
        });
      } else {
        drawText(ctx, getPokemonDisplayName(toId), 120, 24, {
          size: 7,
          color: '#fff3b8',
          align: 'center',
        });
      }

      renderPokemonSprite(ctx);

      if (completeFx) {
        renderCaptureSuccessEffect(ctx, completeFx);
      }

      if (textBox) {
        renderTextBox(ctx, textBox);
      }
    },
  };
}
