/**
 * HeroNameSelectScene - Enter the player name after choosing a hero sprite.
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, drawRect, drawText, fillRect } from '../engine/renderer.js';
import { getCharacterFrame, getCharacterInfo, loadCharacterSprites } from '../engine/character-sprites.js';
import { LOGICAL_HEIGHT as SCREEN_H, LOGICAL_WIDTH as SCREEN_W, TILE_SIZE } from '../engine/config.js';
import { getLocale, isRTL, setLocale, t } from '../i18n/i18n.js';
import { getPlayerData } from '../systems/game-state.js';
import { appendToPlayerNameDraft, finalizePlayerName, removeLastPlayerNameChar } from '../systems/player-onboarding.js';

function applyLocaleShortcut(input: InputManager, typedText: string): string {
  let nextTypedText = typedText;
  if (input.isKeyPressed('1')) {
    setLocale('en');
    nextTypedText = nextTypedText.replace(/1/g, '');
  }
  if (input.isKeyPressed('2')) {
    setLocale('he');
    nextTypedText = nextTypedText.replace(/2/g, '');
  }
  return nextTypedText;
}

export function createHeroNameSelectScene(input: InputManager, stateMachine: StateMachine): Scene {
  let draftName = '';
  let fadeAlpha = 1;
  let fadeIn = true;
  let fadeOut = false;
  let cursorTimer = 0;

  return {
    enter(): void {
      loadCharacterSprites().catch(() => {});
      const playerData = getPlayerData();
      draftName = playerData.name;
      fadeAlpha = 1;
      fadeIn = true;
      fadeOut = false;
      cursorTimer = 0;
    },

    exit(): void {},

    update(dt: number): void {
      cursorTimer += dt;

      if (fadeIn) {
        fadeAlpha -= dt * 2;
        if (fadeAlpha <= 0) {
          fadeAlpha = 0;
          fadeIn = false;
        }
        return;
      }

      if (fadeOut) {
        fadeAlpha += dt * 2;
        if (fadeAlpha >= 1) {
          fadeAlpha = 1;
          stateMachine.change('STARTER_SELECT');
        }
        return;
      }

      let typedText = input.getTextInput();
      typedText = applyLocaleShortcut(input, typedText);

      if (input.isKeyPressed('Escape')) {
        stateMachine.change('HERO_SELECT');
        return;
      }

      if (typedText.length > 0) {
        draftName = appendToPlayerNameDraft(draftName, typedText);
      }

      if (input.isKeyPressed('Backspace') && draftName.length > 0) {
        draftName = removeLastPlayerNameChar(draftName);
      }

      if (input.isKeyPressed('Enter') || input.isTapped()) {
        const playerData = getPlayerData();
        playerData.name = finalizePlayerName(draftName, playerData.name || 'Player');
        fadeOut = true;
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#151525');
      const rtl = isRTL();
      const playerData = getPlayerData();
      const heroInfo = getCharacterInfo(playerData.heroCharacterId);
      const heroFrame = getCharacterFrame(playerData.heroCharacterId, 'down', 'stand');
      const cursorVisible = Math.floor(cursorTimer * 2) % 2 === 0;
      const displayedName = `${draftName}${cursorVisible ? '_' : ''}`;
      const heroName = heroInfo ? (heroInfo.name[getLocale()] || heroInfo.name.en || heroInfo.name.he || heroInfo.id) : playerData.heroCharacterId;

      drawText(ctx, t('heroName.title'), SCREEN_W / 2, 18, {
        size: 10,
        color: '#ffffff',
        align: 'center',
        direction: rtl ? 'rtl' : 'ltr',
      });

      fillRect(ctx, 24, 44, 192, 68, '#202038');
      drawRect(ctx, 24, 44, 192, 68, '#4f5fa3', 1);
      if (heroFrame) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(heroFrame.image, heroFrame.sx, heroFrame.sy, heroFrame.w, heroFrame.h, 38, 58, TILE_SIZE * 2, TILE_SIZE * 2);
      }
      drawText(ctx, heroName, 54, 95, {
        size: 7,
        color: '#ffcb05',
        align: 'center',
        direction: rtl ? 'rtl' : 'ltr',
      });

      fillRect(ctx, 88, 66, 108, 22, '#12121d');
      drawRect(ctx, 88, 66, 108, 22, '#7b88c4', 1);
      drawText(ctx, displayedName, rtl ? 190 : 94, 73, {
        size: 8,
        color: '#ffffff',
        align: rtl ? 'right' : 'left',
        direction: rtl ? 'rtl' : 'ltr',
      });

      drawText(ctx, t('heroName.inputHint'), SCREEN_W / 2, 126, {
        size: getLocale() === 'he' ? 6 : 4,
        color: '#9aa3cc',
        align: 'center',
        direction: rtl ? 'rtl' : 'ltr',
      });
      drawText(ctx, t('heroName.languageHint'), SCREEN_W / 2, 137, {
        size: getLocale() === 'he' ? 6 : 4,
        color: getLocale() === 'he' ? '#88aaff' : '#ffcb05',
        align: 'center',
        direction: rtl ? 'rtl' : 'ltr',
      });
      drawText(ctx, `${t('heroName.continueHint')}  ${t('heroName.backHint')}`, SCREEN_W / 2, 149, {
        size: getLocale() === 'he' ? 6 : 4,
        color: '#ffcb05',
        align: 'center',
        direction: rtl ? 'rtl' : 'ltr',
      });

      if (fadeAlpha > 0) {
        const alpha = Math.floor(fadeAlpha * 255).toString(16).padStart(2, '0');
        fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, `#000000${alpha}`);
      }
    },
  };
}
