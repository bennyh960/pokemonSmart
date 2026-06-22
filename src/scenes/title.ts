/**
 * TitleScene - The game's title screen with Continue/New Game menu.
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input';
import type { StateMachine } from '../engine/state-machine.js';
import type { AudioManager } from '../audio/audio-manager.js';
import { clearScreen, drawText, fillRect } from '../engine/renderer.js';
import { startNewGame } from '../systems/game-state.js';
import { openSaveSlots } from './save-slots.js';
import { getSlotIndex, MAX_SAVE_SLOTS } from '../systems/save.js';
import { signOut } from '../auth/auth-service.js';
import { t, isRTL, getLocale, setLocale, type Locale } from '../i18n/i18n.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
const STAR_COUNT = 60;

interface Star {
  x: number;
  y: number;
  speed: number;
  brightness: number;
  size: number;
}

function createStar(): Star {
  return {
    x: Math.random() * SCREEN_W,
    y: Math.random() * SCREEN_H,
    speed: 0.2 + Math.random() * 0.8,
    brightness: 0.3 + Math.random() * 0.7,
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
  let redirectToSlots = false;

  function buildMenu(): void {
    menuItems = [];
    const slotCount = getSlotIndex().length;
    if (slotCount > 0) menuItems.push(t('title.loadGame'));
    if (slotCount < MAX_SAVE_SLOTS) menuItems.push(t('title.newGame'));
    selectedIndex = 0;
    showMenu = false;
  }

  return {
    enter(): void {
      const slotCount = getSlotIndex().length;
      if (slotCount >= MAX_SAVE_SLOTS) {
        // All slots full — redirect to slot selection on first update tick
        redirectToSlots = true;
        return;
      }
      redirectToSlots = false;
      stars = Array.from({ length: STAR_COUNT }, createStar);
      blinkTimer = 0;
      showPrompt = true;
      titleY = -20;
      entered = false;
      buildMenu();
      audio.playMusic('title');
    },
    exit(): void {},
    update(dt: number): void {
      if (redirectToSlots) {
        redirectToSlots = false;
        openSaveSlots('load', true);
        stateMachine.change('SAVE_SLOTS');
        return;
      }
      if (titleY < titleTargetY) {
        titleY += 40 * dt;
        if (titleY > titleTargetY) titleY = titleTargetY;
      }
      blinkTimer += dt;
      if (blinkTimer >= 0.5) {
        blinkTimer = 0;
        showPrompt = !showPrompt;
      }
      for (const star of stars) {
        star.y += star.speed * 30 * dt;
        if (star.y > SCREEN_H) {
          star.y = 0;
          star.x = Math.random() * SCREEN_W;
        }
        star.brightness = 0.3 + Math.abs(Math.sin(blinkTimer * 3 + star.x)) * 0.7;
      }
      if (entered) return;
      // Language toggle with L key
      if (input.isKeyPressed('l') || input.isKeyPressed('L')) {
        const next: Locale = getLocale() === 'he' ? 'en' : 'he';
        setLocale(next);
        buildMenu();
      }
      // Logout with Q key
      if (input.isKeyPressed('q') || input.isKeyPressed('Q')) {
        signOut()
          .then(() => window.location.reload())
          .catch(() => window.location.reload());
        return;
      }
      if (!showMenu) {
        if (input.isKeyPressed('Enter') || input.isTapped()) showMenu = true;
        return;
      }
      if (input.isKeyPressed('ArrowUp')) selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
      if (input.isKeyPressed('ArrowDown')) selectedIndex = (selectedIndex + 1) % menuItems.length;
      if (input.isKeyPressed('Enter') || input.isTapped()) {
        entered = true;
        const isLoad = getSlotIndex().length > 0 && selectedIndex === 0;
        if (isLoad) {
          openSaveSlots('load', true);
          stateMachine.change('SAVE_SLOTS');
        } else {
          startNewGame();
          stateMachine.change('HERO_SELECT');
        }
      }
    },
    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#0a0a1a');
      for (const star of stars) {
        const hex = Math.floor(star.brightness * 255)
          .toString(16)
          .padStart(2, '0');
        fillRect(ctx, Math.floor(star.x), Math.floor(star.y), star.size, star.size, `#ffffff${hex}`);
      }
      drawText(ctx, t('title.pokemon'), SCREEN_W / 2, Math.floor(titleY), {
        size: 16,
        color: '#ffcb05',
        align: 'center',
      });
      drawText(ctx, t('title.subtitle'), SCREEN_W / 2, Math.floor(titleY) + 20, {
        size: 10,
        color: '#3b5ca8',
        align: 'center',
      });
      drawText(ctx, t('title.hebrewSubtitle'), SCREEN_W / 2, Math.floor(titleY) + 36, {
        size: 8,
        color: '#88aaff',
        align: 'center',
        direction: 'rtl',
      });
      // Language toggle indicator
      const langLabel = getLocale() === 'he' ? 'EN' : 'עב';
      drawText(ctx, `[L] ${langLabel}`, 4, SCREEN_H - 10, { size: 6, color: '#666688' });
      drawText(ctx, '[Q] logout', SCREEN_W / 2, SCREEN_H - 10, { size: 6, color: '#444455', align: 'center' });
      if (!showMenu) {
        if (showPrompt)
          drawText(ctx, t('title.pressEnter'), SCREEN_W / 2, 130, { size: 8, color: '#ffffff', align: 'center' });
      } else {
        const rtl = isRTL();
        for (let i = 0; i < menuItems.length; i++) {
          const y = 110 + i * 14;
          const sel = i === selectedIndex;
          if (sel)
            drawText(ctx, '\u25b6', rtl ? SCREEN_W / 2 + 50 : SCREEN_W / 2 - 50, y, {
              size: 8,
              color: '#ffcb05',
              align: rtl ? 'right' : 'left',
            });
          drawText(ctx, menuItems[i], SCREEN_W / 2, y, {
            size: 8,
            color: sel ? '#ffcb05' : '#aaaaaa',
            align: 'center',
            direction: rtl ? 'rtl' : 'ltr',
          });
        }
      }
      drawText(ctx, 'v0.2.0', SCREEN_W - 4, SCREEN_H - 10, { size: 6, color: '#444466', align: 'right' });
    },
  };
}
