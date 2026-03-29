/**
 * HeroSelectScene - Pick the player character before choosing a starter.
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, drawRect, drawText, fillRect } from '../engine/renderer.js';
import {
  getCharactersByRole,
  getCharacterFrame,
  getDefaultHeroCharacterId,
  loadCharacterSprites,
  type CharacterInfo,
} from '../engine/character-sprites.js';
import { LOGICAL_HEIGHT as SCREEN_H, LOGICAL_WIDTH as SCREEN_W, TILE_SIZE } from '../engine/config.js';
import { getLocale, isRTL, setLocale, t } from '../i18n/i18n.js';
import { getPlayerData } from '../systems/game-state.js';

const HERO_GRID_COLUMNS = 3;
const HERO_CELL_SIZE = 28;
const HERO_CELL_GAP = 6;

function getLocalizedHeroName(hero: CharacterInfo): string {
  const locale = getLocale();
  return hero.name[locale] || hero.name.en || hero.name.he || hero.id;
}

function moveSelection(index: number, dx: number, dy: number, total: number): number {
  if (total <= 0) return 0;
  const row = Math.floor(index / HERO_GRID_COLUMNS);
  const col = index % HERO_GRID_COLUMNS;
  const targetRow = Math.max(0, row + dy);
  let targetCol = Math.max(0, Math.min(HERO_GRID_COLUMNS - 1, col + dx));
  let nextIndex = targetRow * HERO_GRID_COLUMNS + targetCol;

  if (nextIndex >= total) {
    while (targetCol > 0 && nextIndex >= total) {
      targetCol -= 1;
      nextIndex = targetRow * HERO_GRID_COLUMNS + targetCol;
    }
    if (nextIndex >= total) return index;
  }

  if (nextIndex < 0) return index;
  return nextIndex;
}

function applyLocaleShortcut(input: InputManager): void {
  if (input.isKeyPressed('1')) setLocale('en');
  if (input.isKeyPressed('2')) setLocale('he');
}

export function createHeroSelectScene(input: InputManager, stateMachine: StateMachine): Scene {
  let heroes: CharacterInfo[] = [];
  let selectedIndex = 0;
  let fadeAlpha = 1;
  let fadeIn = true;
  let fadeOut = false;
  let previewTimer = 0;

  function getSelectedHeroId(): string {
    return heroes[selectedIndex]?.id ?? getDefaultHeroCharacterId();
  }

  return {
    enter(): void {
      loadCharacterSprites().catch(() => {});
      heroes = getCharactersByRole('hero');
      fadeAlpha = 1;
      fadeIn = true;
      fadeOut = false;
      previewTimer = 0;

      const playerData = getPlayerData();
      const preferredHeroId = playerData.heroCharacterId || getDefaultHeroCharacterId();
      const preferredIndex = heroes.findIndex((hero) => hero.id === preferredHeroId);
      selectedIndex = preferredIndex >= 0 ? preferredIndex : 0;
    },

    exit(): void {},

    update(dt: number): void {
      previewTimer += dt;

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
          stateMachine.change('HERO_NAME_SELECT');
        }
        return;
      }

      applyLocaleShortcut(input);

      if (input.isKeyPressed('Escape')) {
        stateMachine.change('TITLE');
        return;
      }

      if (input.isKeyPressed('ArrowLeft')) {
        selectedIndex = moveSelection(selectedIndex, -1, 0, heroes.length);
      }
      if (input.isKeyPressed('ArrowRight')) {
        selectedIndex = moveSelection(selectedIndex, 1, 0, heroes.length);
      }
      if (input.isKeyPressed('ArrowUp')) {
        selectedIndex = moveSelection(selectedIndex, 0, -1, heroes.length);
      }
      if (input.isKeyPressed('ArrowDown')) {
        selectedIndex = moveSelection(selectedIndex, 0, 1, heroes.length);
      }

      if (input.isKeyPressed('Enter') || input.isTapped()) {
        getPlayerData().heroCharacterId = getSelectedHeroId();
        fadeOut = true;
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#151525');
      const rtl = isRTL();
      const selectedHero = heroes[selectedIndex];
      const directions = ['down', 'left', 'up', 'right'] as const;
      const poses = ['stand', 'walk-1', 'stand', 'walk-2'] as const;
      const facing = directions[Math.floor(previewTimer / 0.7) % directions.length] || 'down';
      const pose = poses[Math.floor(previewTimer / 0.18) % poses.length] || 'stand';
      let previewFrame = selectedHero ? getCharacterFrame(selectedHero.id, facing, pose) : null;
      if (!previewFrame && selectedHero && pose !== 'stand') {
        previewFrame = getCharacterFrame(selectedHero.id, facing, 'stand');
      }

      drawText(ctx, t('heroSelect.title'), SCREEN_W / 2, 10, {
        size: 10,
        color: '#ffffff',
        align: 'center',
        direction: rtl ? 'rtl' : 'ltr',
      });

      fillRect(ctx, 10, 28, 88, 112, '#202038');
      drawRect(ctx, 10, 28, 88, 112, '#4f5fa3', 1);
      fillRect(ctx, 22, 42, 64, 64, '#12121d');
      drawRect(ctx, 22, 42, 64, 64, '#7b88c4', 1);
      drawText(ctx, selectedHero ? getLocalizedHeroName(selectedHero) : '---', 54, 118, {
        size: 8,
        color: '#ffcb05',
        align: 'center',
        direction: rtl ? 'rtl' : 'ltr',
      });
      if (previewFrame) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(previewFrame.image, previewFrame.sx, previewFrame.sy, previewFrame.w, previewFrame.h, 38, 58, TILE_SIZE * 2, TILE_SIZE * 2);
      }

      fillRect(ctx, 108, 28, 122, 112, '#202038');
      drawRect(ctx, 108, 28, 122, 112, '#4f5fa3', 1);

      const gridStartX = 120;
      const gridStartY = 42;
      for (let index = 0; index < heroes.length; index += 1) {
        const hero = heroes[index];
        const col = index % HERO_GRID_COLUMNS;
        const row = Math.floor(index / HERO_GRID_COLUMNS);
        const cellX = gridStartX + col * (HERO_CELL_SIZE + HERO_CELL_GAP);
        const cellY = gridStartY + row * (HERO_CELL_SIZE + HERO_CELL_GAP);
        const isSelected = index === selectedIndex;
        const cellFrame = getCharacterFrame(hero.id, 'down', 'stand');

        fillRect(ctx, cellX, cellY, HERO_CELL_SIZE, HERO_CELL_SIZE, isSelected ? '#2f3b72' : '#12121d');
        drawRect(ctx, cellX, cellY, HERO_CELL_SIZE, HERO_CELL_SIZE, isSelected ? '#ffcb05' : '#5a669d', isSelected ? 2 : 1);
        if (cellFrame) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(cellFrame.image, cellFrame.sx, cellFrame.sy, cellFrame.w, cellFrame.h, cellX + 6, cellY + 4, TILE_SIZE, TILE_SIZE);
        }
      }

      drawText(ctx, t('heroSelect.continueHint'), SCREEN_W / 2, 148, {
        size: getLocale() === 'he' ? 6 : 4,
        color: '#ffcb05',
        align: 'center',
        direction: rtl ? 'rtl' : 'ltr',
      });

      const langColor = getLocale() === 'he' ? '#88aaff' : '#ffcb05';
      drawText(ctx, t('heroSelect.languageHint'), 6, SCREEN_H - 10, {
        size: getLocale() === 'he' ? 6 : 4,
        color: langColor,
        direction: rtl ? 'rtl' : 'ltr',
      });

      if (fadeAlpha > 0) {
        const alpha = Math.floor(fadeAlpha * 255).toString(16).padStart(2, '0');
        fillRect(ctx, 0, 0, SCREEN_W, SCREEN_H, `#000000${alpha}`);
      }
    },
  };
}
