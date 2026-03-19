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

/** Native GBA-style resolution. */
const NATIVE_WIDTH = 240;
const NATIVE_HEIGHT = 160;
const SCALE = 3;

/** Create and start the game, mounting the canvas to the given container. */
export function createGame(container: HTMLElement) {
  // Create the canvas element
  const canvas = document.createElement('canvas');
  canvas.width = NATIVE_WIDTH;
  canvas.height = NATIVE_HEIGHT;
  canvas.style.width = `${NATIVE_WIDTH * SCALE}px`;
  canvas.style.height = `${NATIVE_HEIGHT * SCALE}px`;
  canvas.style.imageRendering = 'pixelated';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  if (!ctx) {
    throw new Error('Failed to get 2D rendering context.');
  }

  // Disable image smoothing for crisp pixel art
  ctx.imageSmoothingEnabled = false;

  // Initialize systems
  const input = createInputManager(canvas);
  const stateMachine = createStateMachine();

  // Register scenes
  const titleScene = createTitleScene(input, stateMachine);
  stateMachine.register('TITLE', titleScene);

  // TODO: Register remaining scenes as they are implemented
  // stateMachine.register('OVERWORLD', createOverworldScene(input, stateMachine));
  // stateMachine.register('BATTLE', createBattleScene(input, stateMachine));
  // stateMachine.register('DIALOGUE', createDialogueScene(input, stateMachine));

  // Game loop state
  let lastTime = 0;
  let running = false;

  function loop(timestamp: number): void {
    if (!running) return;

    // Calculate delta time in seconds, capped at 100ms to avoid spiral of death
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    // Update
    stateMachine.update(dt);

    // Render
    ctx.imageSmoothingEnabled = false;
    stateMachine.render(ctx);

    // Reset single-frame input states
    input.endFrame();

    requestAnimationFrame(loop);
  }

  return {
    /** Start the game loop and show the title screen. */
    start(): void {
      if (running) return;
      running = true;
      stateMachine.change('TITLE');
      lastTime = performance.now();
      requestAnimationFrame(loop);
    },

    /** Stop the game loop. */
    stop(): void {
      running = false;
    },

    /** Clean up all resources. */
    destroy(): void {
      running = false;
      input.destroy();
      container.removeChild(canvas);
    },
  };
}
