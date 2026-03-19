/**
 * TitleScene - The game's title screen with Continue/New Game menu.
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { clearScreen, drawText, fillRect } from '../engine/renderer.js';
import { hasSavedGame, startNewGame, loadSavedGame } from '../systems/game-state.js';

const SCREEN_W = 240;
const SCREEN_H = 160;
const STAR_COUNT = 60;

interface Star { x: number; y: number; speed: number; brightness: number; size: number; }

function createStar(): Star {
  return {
    x: Math.random() * SCREEN_W, y: Math.random() * SCREEN_H,
    speed: 0.2 + Math.random() * 0.8, brightness: 0.3 + Math.random() * 0.7,
    size: Math.random() > 0.8 ? 2 : 1,
  };
}

export function createTitleScene(input: InputManager, stateMachine: StateMachine, audio: AudioManager): Scene {
  let stars: Star[] = [];
  let blinkTimer = 0;
  let titleY = -20;
  const titleTargetY = 40;
  let entered = false;
  let menuItems: string[] = [];
  let selectedIndex = 0;
  let showMenu = false;
  let showPrompt = true;

  function buildMenu(): void {
    menuItems = [];
    if (hasSavedGame()) menuItems.push('Continue');
    menuItems.push('New Game');
    selectedIndex = 0;
    showMenu = false;
  }

  return {
    enter(): void {
      stars = Array.from({ length: STAR_COUNT }, createStar);
      blinkTimer = 0; showPrompt = true; titleY = -20; entered = false;
      buildMenu();
      audio.playMusic('title');
    },
    exit(): void {},
    update(dt: number): void {
      if (titleY < titleTargetY) { titleY += 40 * dt; if (titleY > titleTargetY) titleY = titleTargetY; }
      blinkTimer += dt;
      if (blinkTimer >= 0.5) { blinkTimer = 0; showPrompt = !showPrompt; }
      for (const star of stars) {
        star.y += star.speed * 30 * dt;
        if (star.y > SCREEN_H) { star.y = 0; star.x = Math.random() * SCREEN_W; }
        star.brightness = 0.3 + Math.abs(Math.sin(blinkTimer * 3 + star.x)) * 0.7;
      }
      if (entered) return;
      if (!showMenu) {
        if (input.isKeyPressed('Enter') || input.isTapped()) showMenu = true;
        return;
      }
      if (input.isKeyPressed('ArrowUp')) selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
      if (input.isKeyPressed('ArrowDown')) selectedIndex = (selectedIndex + 1) % menuItems.length;
      if (input.isKeyPressed('Enter') || input.isTapped()) {
        entered = true;
        if (menuItems[selectedIndex] === 'Continue') { loadSavedGame(); stateMachine.change('OVERWORLD'); }
        else { startNewGame(); stateMachine.change('STARTER_SELECT'); }
      }
    },
    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#0a0a1a');
      for (const star of stars) {
        const hex = Math.floor(star.brightness * 255).toString(16).padStart(2, '0');
        fillRect(ctx, Math.floor(star.x), Math.floor(star.y), star.size, star.size, `#ffffff${hex}`);
      }
      drawText(ctx, 'POKEMON', SCREEN_W / 2, Math.floor(titleY), { size: 16, color: '#ffcb05', align: 'center', font: 'monospace' });
      drawText(ctx, 'Math Adventure', SCREEN_W / 2, Math.floor(titleY) + 20, { size: 10, color: '#3b5ca8', align: 'center', font: 'monospace' });
      drawText(ctx, '\u05d4\u05e8\u05e4\u05ea\u05e7\u05d4 \u05d1\u05e0\u05d5\u05de\u05e8\u05d9\u05d4', SCREEN_W / 2, Math.floor(titleY) + 36, { size: 8, color: '#88aaff', align: 'center', direction: 'rtl', font: 'monospace' });
      if (!showMenu) {
        if (showPrompt) drawText(ctx, 'Press ENTER', SCREEN_W / 2, 130, { size: 8, color: '#ffffff', align: 'center', font: 'monospace' });
      } else {
        for (let i = 0; i < menuItems.length; i++) {
          const y = 110 + i * 14;
          const sel = i === selectedIndex;
          if (sel) drawText(ctx, '\u25b6', SCREEN_W / 2 - 50, y, { size: 8, color: '#ffcb05', align: 'left', font: 'monospace' });
          drawText(ctx, menuItems[i], SCREEN_W / 2, y, { size: 8, color: sel ? '#ffcb05' : '#aaaaaa', align: 'center', font: 'monospace' });
        }
      }
      drawText(ctx, 'v0.2.0', SCREEN_W - 4, SCREEN_H - 10, { size: 6, color: '#444466', align: 'right', font: 'monospace' });
    },
  };
}
