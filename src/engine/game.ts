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
import { createInputManager, createVirtualUI, setupMobileControls } from './input';
import { createAudioManager, setGlobalAudio } from '../audio/audio-manager.js';
import { createTitleScene } from '../scenes/title.js';
import { createBattleScene } from '../scenes/battle';
import { createOverworldScene } from '../scenes/overworld.js';
import { createStarterSelectScene } from '../scenes/starter-select.js';
import { createHeroSelectScene } from '../scenes/hero-select.js';
import { createHeroNameSelectScene } from '../scenes/hero-name-select.js';
import { createPartyScene } from '../scenes/party';
import { createPokedexScene } from '../scenes/pokedex';
import { createEvolutionScene } from '../scenes/evolution.js';
import { createBagScene } from '../scenes/bag.js';
import { createPCScene } from '../scenes/pc.js';
import { createWorldMapScene } from '../scenes/world-map.js';
import { createPhoneScene } from '../scenes/phone.js';
import { createGateScene } from '../scenes/gate-scene.js';
import { createSaveSlotsScene } from '../scenes/save-slots.js';
import { createStartMenuScene } from '../scenes/start-menu.js';
import { createEnglishLearningScene } from '../scenes/english-learning.js';
import { initStoryEngine } from '../systems/story-engine.js';
import { showHUD, hideHUD } from '../ui/hud-overlay.js';
// Story content — single entry point; see content/index.ts for all quest files
import '../data/story/content/index.js';
// Global auto-gate config — registers the auto-pokecenter/pokemarket/gym gates + map service tags
import '../data/story/global-gate-config.js';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, RES_SCALE, CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { uiRegistry } from './input/uiRegistry.js';

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
  // const uiOverlay = createVirtualUI();
  // container.appendChild(uiOverlay);
  const input = createInputManager(canvas);

  setupMobileControls(input);
  const stateMachine = createStateMachine();
  const audio = createAudioManager();
  setGlobalAudio(audio);

  // Clear pressed keys on scene transitions to prevent Enter/Escape bleeding between scenes.
  // Also auto-show/hide the HUD: visible only when on the OVERWORLD scene.
  stateMachine.setOnTransition(() => {
    input.endFrame();
    if (stateMachine.currentId() === 'OVERWORLD') {
      showHUD();
    } else {
      hideHUD();
    }
  });

  stateMachine.register('TITLE', createTitleScene(input, stateMachine, audio));
  stateMachine.register('HERO_SELECT', createHeroSelectScene(input, stateMachine));
  stateMachine.register('HERO_NAME_SELECT', createHeroNameSelectScene(input, stateMachine));
  stateMachine.register('BATTLE', createBattleScene(input, stateMachine, canvas, audio));
  stateMachine.register('OVERWORLD', createOverworldScene(input, stateMachine, audio));
  stateMachine.register('STARTER_SELECT', createStarterSelectScene(input, stateMachine));
  stateMachine.register('PARTY', createPartyScene(input, stateMachine));
  stateMachine.register('POKEDEX', createPokedexScene(input, stateMachine));
  stateMachine.register('EVOLUTION', createEvolutionScene(input, stateMachine, audio));
  stateMachine.register('BAG', createBagScene(input, stateMachine));
  stateMachine.register('PC', createPCScene(input, stateMachine));
  stateMachine.register('WORLD_MAP', createWorldMapScene(input, stateMachine));
  stateMachine.register('PHONE', createPhoneScene(input, stateMachine));
  stateMachine.register('GATE', createGateScene(input, stateMachine));
  stateMachine.register('SAVE_SLOTS', createSaveSlotsScene(input, stateMachine));
  stateMachine.register('START_MENU', createStartMenuScene(input, stateMachine));
  stateMachine.register('ENGLISH_LEARNING', createEnglishLearningScene(input, stateMachine, canvas, audio));

  // Initialise story engine with the state machine so it can push scenes
  initStoryEngine(stateMachine);

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

    uiRegistry.clear();

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
    stop(): void {
      running = false;
    },
    destroy(): void {
      running = false;
      window.removeEventListener('resize', handleResize);
      input.destroy();
      container.removeChild(canvas);
    },
  };
}
