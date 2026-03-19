/**
 * Game - Main game engine.
 *
 * Creates the canvas element (240x160 native, scaled 3x to 720x480),
 * runs the game loop with delta-time, and coordinates the state machine
 * and input systems.
 */

import { createStateMachine } from './state-machine.js';
import { createInputManager } from './input.js';
import { createTitleScene } from '../scenes/title.js';
import { createBattleScene } from '../scenes/battle.js';
import { createOverworldScene } from '../scenes/overworld.js';
import { createStarterSelectScene } from '../scenes/starter-select.js';

/** Native GBA-style resolution. */
const NATIVE_WIDTH = 240;
const NATIVE_HEIGHT = 160;
const SCALE = 3;

/** Create and start the game, mounting the canvas to the given container. */
export function createGame(container: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.width = NATIVE_WIDTH;
  canvas.height = NATIVE_HEIGHT;
  canvas.style.width = `${NATIVE_WIDTH * SCALE}px`;
  canvas.style.height = `${NATIVE_HEIGHT * SCALE}px`;
  canvas.style.imageRendering = 'pixelated';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('Failed to get 2D rendering context.');

  ctx.imageSmoothingEnabled = false;

  const input = createInputManager(canvas);
  const stateMachine = createStateMachine();

  stateMachine.register('TITLE', createTitleScene(input, stateMachine));
  stateMachine.register('BATTLE', createBattleScene(input, stateMachine, canvas));
  stateMachine.register('OVERWORLD', createOverworldScene(input, stateMachine));
  stateMachine.register('STARTER_SELECT', createStarterSelectScene(input, stateMachine));

  let lastTime = 0;
  let running = false;

  function loop(timestamp: number): void {
    if (!running) return;

    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    // Debug: Press B to enter battle from any scene
    if (input.isKeyPressed('b') || input.isKeyPressed('B')) {
      if (stateMachine.currentId() !== 'BATTLE') {
        stateMachine.change('BATTLE');
      }
    }

    stateMachine.update(dt);
    ctx.imageSmoothingEnabled = false;
    stateMachine.render(ctx);
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
    destroy(): void { running = false; input.destroy(); container.removeChild(canvas); },
  };
}
