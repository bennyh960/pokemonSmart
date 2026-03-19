/**
 * TitleScene - The game's title screen.
 *
 * Displays "Pokemon Math Adventure" with Hebrew subtitle,
 * animated pixel star background, and blinking "Press ENTER" prompt.
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, drawText, fillRect } from '../engine/renderer.js';

/** Native canvas dimensions. */
const SCREEN_W = 240;
const SCREEN_H = 160;

/** Number of background stars. */
const STAR_COUNT = 60;

/** A single animated star in the background. */
interface Star {
  x: number;
  y: number;
  speed: number;
  brightness: number;
  size: number;
}

/** Create a random star within the screen bounds. */
function createStar(): Star {
  return {
    x: Math.random() * SCREEN_W,
    y: Math.random() * SCREEN_H,
    speed: 0.2 + Math.random() * 0.8,
    brightness: 0.3 + Math.random() * 0.7,
    size: Math.random() > 0.8 ? 2 : 1,
  };
}

/** Create the title screen scene. */
export function createTitleScene(input: InputManager, stateMachine: StateMachine): Scene {
  let stars: Star[] = [];
  let blinkTimer = 0;
  let showPrompt = true;
  let titleY = -20;
  let titleTargetY = 40;
  let entered = false;

  return {
    enter(): void {
      stars = Array.from({ length: STAR_COUNT }, createStar);
      blinkTimer = 0;
      showPrompt = true;
      titleY = -20;
      entered = false;
    },

    exit(): void {
      // No cleanup needed
    },

    update(dt: number): void {
      // Animate title slide-in
      if (titleY < titleTargetY) {
        titleY += 40 * dt;
        if (titleY > titleTargetY) titleY = titleTargetY;
      }

      // Blink the "Press ENTER" text
      blinkTimer += dt;
      if (blinkTimer >= 0.5) {
        blinkTimer = 0;
        showPrompt = !showPrompt;
      }

      // Animate stars drifting downward
      for (const star of stars) {
        star.y += star.speed * 30 * dt;
        if (star.y > SCREEN_H) {
          star.y = 0;
          star.x = Math.random() * SCREEN_W;
        }
        // Twinkle effect
        star.brightness = 0.3 + Math.abs(Math.sin(blinkTimer * 3 + star.x)) * 0.7;
      }

      // Handle ENTER key press
      if (!entered && (input.isKeyPressed('Enter') || input.isTapped())) {
        entered = true;
        stateMachine.change('OVERWORLD');
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      // Dark background
      clearScreen(ctx, '#0a0a1a');

      // Draw stars
      for (const star of stars) {
        const alpha = Math.floor(star.brightness * 255);
        const hex = alpha.toString(16).padStart(2, '0');
        fillRect(ctx, Math.floor(star.x), Math.floor(star.y), star.size, star.size, `#ffffff${hex}`);
      }

      // Title text
      drawText(ctx, 'POKEMON', SCREEN_W / 2, Math.floor(titleY), {
        size: 16,
        color: '#ffcb05',
        align: 'center',
        font: 'monospace',
      });

      drawText(ctx, 'Math Adventure', SCREEN_W / 2, Math.floor(titleY) + 20, {
        size: 10,
        color: '#3b5ca8',
        align: 'center',
        font: 'monospace',
      });

      // Hebrew subtitle
      drawText(ctx, '\u05d4\u05e8\u05e4\u05ea\u05e7\u05d4 \u05d1\u05e0\u05d5\u05de\u05e8\u05d9\u05d4', SCREEN_W / 2, Math.floor(titleY) + 36, {
        size: 8,
        color: '#88aaff',
        align: 'center',
        direction: 'rtl',
        font: 'monospace',
      });

      // Blinking prompt
      if (showPrompt) {
        drawText(ctx, 'Press ENTER to start', SCREEN_W / 2, 130, {
          size: 8,
          color: '#ffffff',
          align: 'center',
          font: 'monospace',
        });
      }

      // Version tag
      drawText(ctx, 'v0.1.0', SCREEN_W - 4, SCREEN_H - 10, {
        size: 6,
        color: '#444466',
        align: 'right',
        font: 'monospace',
      });
    },
  };
}
