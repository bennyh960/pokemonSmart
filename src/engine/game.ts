/**
 * Game - Main game engine.
 *
 * Creates the canvas element at physical resolution (720x480) with a logical
 * coordinate system of 240x160 applied via ctx.scale(). Runs the game loop
 * with delta-time, and coordinates the state machine and input systems.
 * A responsive resize handler keeps the canvas pixel-perfect at the largest
 * integer scale that fits the viewport.
 */

import { createStateMachine } from './state-machine.js';
import { createInputManager } from './input.js';
import { createAudioManager } from '../audio/audio-manager.js';
import { createTitleScene } from '../scenes/title.js';
import { createBattleScene } from '../scenes/battle.js';
import { createOverworldScene } from '../scenes/overworld.js';
import { createStarterSelectScene } from '../scenes/starter-select.js';
import { createPartyScene } from '../scenes/party.js';
import { createPokedexScene } from '../scenes/pokedex.js';
import {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT,
  RES_SCALE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './config.js';

/** Create and start the game, mounting the canvas to the given container. */
export function createGame(container: HTMLElement) {

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.style.imageRendering = 'pixelated';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('Failed to get 2D rendering context.');

  ctx.imageSmoothingEnabled = false;

  const input = createInputManager(canvas);
  const stateMachine = createStateMachine();
  const audio = createAudioManager();

  stateMachine.register('TITLE', createTitleScene(input, stateMachine, audio));
  stateMachine.register('BATTLE', createBattleScene(input, stateMachine, canvas, audio));
  stateMachine.register('OVERWORLD', createOverworldScene(input, stateMachine, audio));
  stateMachine.register('STARTER_SELECT', createStarterSelectScene(input, stateMachine));
  stateMachine.register('PARTY', createPartyScene(input, stateMachine));
  stateMachine.register('POKEDEX', createPokedexScene(input, stateMachine));

  /** Compute the largest integer scale that fits the viewport and set canvas CSS size. */
  function handleResize(): void {
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const scaleX = Math.floor(maxW / LOGICAL_WIDTH);
    const scaleY = Math.floor(maxH / LOGICAL_HEIGHT);
    const fitScale = Math.max(1, Math.min(scaleX, scaleY));
    canvas.style.width = `${LOGICAL_WIDTH * fitScale}px`;
    canvas.style.height = `${LOGICAL_HEIGHT * fitScale}px`;
  }

  window.addEventListener('resize', handleResize);
  handleResize();

  let lastTime = 0;
  let running = false;

  function loop(timestamp: number): void {
    if (!running) return;

    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    // Mute toggle: M key
    if (input.isKeyPressed('m') || input.isKeyPressed('M')) {
      audio.toggleMute();
    }

    // Debug: Press B to enter battle from any scene
    if (input.isKeyPressed('b') || input.isKeyPressed('B')) {
      if (stateMachine.currentId() !== 'BATTLE') {
        stateMachine.change('BATTLE');
      }
    }

    stateMachine.update(dt);

    // Wrap scene rendering in ctx.scale so all drawing uses logical coords
    ctx.save();
    ctx.scale(RES_SCALE, RES_SCALE);
    ctx.imageSmoothingEnabled = false;
    stateMachine.render(ctx);
    ctx.restore();

    input.endFrame();
    requestAnimationFrame(loop);
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      stateMachine.change('TITLE');
      lastTime = performance.now();
      requestAnimationFrame(loop);
    },
    stop(): void { running = false; },
    destroy(): void {
      running = false;
      window.removeEventListener('resize', handleResize);
      input.destroy();
      container.removeChild(canvas);
    },
  };
}
