/**
 * PokedexScene - Scrollable list of all 251 Pokemon with detail view.
 * D key in overworld opens this. Shows seen/unseen status from PlayerData.pokedex.
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawRect, drawText } from '../engine/renderer.js';
import { t, isRTL } from '../i18n/i18n.js';
import { getPlayerData, hasActiveGame } from '../systems/game-state.js';
import { getPokemon, getPokemonDisplayName } from '../services/pokemon-data.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
const BG_COLOR = '#301818';
const ENTRY_HEIGHT = 26;
const VISIBLE_ENTRIES = 5;
const TOTAL_POKEMON = 251;

const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a878', fire: '#f08030', water: '#6890f0', grass: '#78c850',
  electric: '#f8d030', ice: '#98d8d8', fighting: '#c03028', poison: '#a040a0',
  ground: '#e0c068', flying: '#a890f0', psychic: '#f85888', bug: '#a8b820',
  rock: '#b8a038', ghost: '#705898', dragon: '#7038f8', dark: '#705848',
  steel: '#b8b8d0', glitch: '#00ff88',
};

type PokedexView = 'list' | 'detail';

export function createPokedexScene(input: InputManager, stateMachine: StateMachine): Scene {
  let cursor = 0;
  let scrollOffset = 0;
  let view: PokedexView = 'list';

  function getPokedex(): Record<number, boolean> {
    if (hasActiveGame()) return getPlayerData().pokedex;
    return {};
  }

  function getSeenCount(): number {
    const pdex = getPokedex();
    let count = 0;
    for (let i = 1; i <= TOTAL_POKEMON; i++) {
      if (pdex[i]) count++;
    }
    return count;
  }

  function isSeen(id: number): boolean {
    return getPokedex()[id] === true;
  }

  function preloadVisibleSprites(): void {
    const pdex = getPokedex();
    for (let i = scrollOffset; i < Math.min(scrollOffset + VISIBLE_ENTRIES + 2, TOTAL_POKEMON); i++) {
      const id = i + 1;
      if (pdex[id]) {
        loadImage(`/sprites/pokemon/front/${id}.png`).catch(() => {});
        loadImage(`/sprites/pokemon/icons/${id}.png`).catch(() => {});
      }
    }
  }

  function formatNumber(id: number): string {
    return '#' + String(id).padStart(3, '0');
  }

  return {
    enter(): void {
      cursor = 0;
      scrollOffset = 0;
      view = 'list';
      preloadVisibleSprites();
    },

    exit(): void {},

    update(_dt: number): void {
      if (view === 'detail') {
        if (input.isKeyPressed('Escape')) {
          view = 'list';
        }
        return;
      }

      // List view controls
      if (input.isKeyPressed('Escape')) {
        stateMachine.pop();
        return;
      }

      if (input.isKeyPressed('ArrowUp')) {
        if (cursor > 0) {
          cursor--;
          if (cursor < scrollOffset) {
            scrollOffset = cursor;
            preloadVisibleSprites();
          }
        }
      }

      if (input.isKeyPressed('ArrowDown')) {
        if (cursor < TOTAL_POKEMON - 1) {
          cursor++;
          if (cursor >= scrollOffset + VISIBLE_ENTRIES) {
            scrollOffset = cursor - VISIBLE_ENTRIES + 1;
            preloadVisibleSprites();
          }
        }
      }

      if (input.isKeyPressed('Enter')) {
        const id = cursor + 1;
        if (isSeen(id)) {
          view = 'detail';
          loadImage(`/sprites/pokemon/front/${id}.png`).catch(() => {});
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, BG_COLOR);

      if (view === 'detail') {
        renderDetailView(ctx, cursor + 1);
        return;
      }

      renderListView(ctx);
    },
  };

  function renderListView(ctx: CanvasRenderingContext2D): void {
    // Title bar
    fillRect(ctx, 0, 0, SCREEN_W, 16, '#481818');
    drawText(ctx, t('pokedex.title'), 4, 3, { size: 8, color: '#ffffff', font: 'monospace' });
    const seenText = t('pokedex.seen', { count: getSeenCount() });
    drawText(ctx, seenText, SCREEN_W - 4, 3, { size: 8, color: '#cccccc', font: 'monospace', align: 'right' });

    // List area
    const listY = 18;
    for (let i = 0; i < VISIBLE_ENTRIES; i++) {
      const index = scrollOffset + i;
      if (index >= TOTAL_POKEMON) break;

      const id = index + 1;
      const y = listY + i * ENTRY_HEIGHT;
      const seen = isSeen(id);
      const isSelected = index === cursor;

      // Highlight bar
      if (isSelected) {
        fillRect(ctx, 2, y, SCREEN_W - 4, ENTRY_HEIGHT - 2, '#582828');
        drawRect(ctx, 2, y, SCREEN_W - 4, ENTRY_HEIGHT - 2, '#f8a878');
      }

      // Number
      const numStr = formatNumber(id);
      drawText(ctx, numStr, 6, y + 3, { size: 8, color: '#f8a878', font: 'monospace' });

      if (seen) {
        // Small sprite
        const sprite = getCachedImage(`/sprites/pokemon/front/${id}.png`);
        if (sprite) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(sprite, 24, y - 8, 40, 40);
          ctx.imageSmoothingEnabled = false;
        } else {
          fillRect(ctx, 34, y + 1, 16, 16, '#584040');
        }

        // Name
        const data = getPokemon(id);
        const name = data ? getPokemonDisplayName(id) : `Pokemon ${id}`;
        drawText(ctx, name, 54, y + 3, { size: 8, color: '#ffffff', font: 'monospace' });

        // Type dots
        if (data?.types) {
          let tx = 54 + ctx.measureText(name).width + 4;
          // measureText won't work without setting font, so use fixed offset
          tx = Math.max(tx, 140);
          for (const type of data.types) {
            const color = TYPE_COLORS[type] || '#a8a878';
            fillRect(ctx, tx, y + 5, 6, 6, color);
            drawRect(ctx, tx, y + 5, 6, 6, '#00000044');
            tx += 9;
          }
        }
      } else {
        // Unknown sprite placeholder
        fillRect(ctx, 34, y + 1, 16, 16, '#201010');
        drawText(ctx, '?', 40, y + 4, { size: 8, color: '#403030', font: 'monospace' });

        // Unknown name
        drawText(ctx, t('pokedex.unknown'), 54, y + 3, { size: 8, color: '#807070', font: 'monospace' });
      }
    }

    // Scroll indicators
    if (scrollOffset > 0) {
      drawText(ctx, '\u25b2', SCREEN_W - 10, listY - 1, { size: 8, color: '#f8a878', font: 'monospace' });
    }
    if (scrollOffset + VISIBLE_ENTRIES < TOTAL_POKEMON) {
      drawText(ctx, '\u25bc', SCREEN_W - 10, listY + VISIBLE_ENTRIES * ENTRY_HEIGHT - 2, { size: 8, color: '#f8a878', font: 'monospace' });
    }

    // Bottom bar
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#481818');
    const rtl = isRTL();
    const helpText = rtl ? 'ESC \u2190 \u2190\u2192 \u05e0\u05d9\u05d5\u05d5\u05d8 / ENTER \u05e4\u05e8\u05d8\u05d9\u05dd' : 'Up/Down: Navigate  Enter: Details  Esc: Back';
    drawText(ctx, helpText, 4, SCREEN_H - 11, { size: 7, color: '#cccccc', font: 'monospace' });
  }

  function renderDetailView(ctx: CanvasRenderingContext2D, id: number): void {
    const seen = isSeen(id);
    const data = getPokemon(id);

    // Title bar
    fillRect(ctx, 0, 0, SCREEN_W, 16, '#481818');
    const numStr = formatNumber(id);
    drawText(ctx, numStr, 4, 3, { size: 8, color: '#f8a878', font: 'monospace' });

    if (!seen || !data) {
      drawText(ctx, t('pokedex.unknown'), 40, 3, { size: 8, color: '#ffffff', font: 'monospace' });
      drawText(ctx, t('pokedex.noData'), SCREEN_W / 2, SCREEN_H / 2 - 4, { size: 8, color: '#807070', font: 'monospace', align: 'center' });
      // Bottom hint
      fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#481818');
      drawText(ctx, 'Esc: Back', 4, SCREEN_H - 11, { size: 7, color: '#cccccc', font: 'monospace' });
      return;
    }

    // Name
    drawText(ctx, getPokemonDisplayName(id), 40, 3, { size: 8, color: '#ffffff', font: 'monospace' });

    // Large sprite
    const sprite = getCachedImage(`/sprites/pokemon/front/${id}.png`);
    const spriteX = 0;
    const spriteY = 14;
    const spriteSize = 64;
    fillRect(ctx, spriteX - 1, spriteY - 1, spriteSize + 2, spriteSize + 2, '#402020');
    if (sprite) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, spriteX, spriteY, spriteSize, spriteSize);
    } else {
      fillRect(ctx, spriteX, spriteY, spriteSize, spriteSize, '#584040');
    }

    // Type badges
    let badgeX = spriteX;
    const badgeY = spriteY + spriteSize + 4;
    for (const type of data.types) {
      const color = TYPE_COLORS[type] || '#a8a878';
      const label = type.toUpperCase();
      const badgeW = label.length * 5 + 6;
      fillRect(ctx, badgeX, badgeY, badgeW, 10, color);
      drawRect(ctx, badgeX, badgeY, badgeW, 10, '#00000044');
      drawText(ctx, label, badgeX + 3, badgeY + 1, { size: 7, color: '#ffffff', font: 'monospace' });
      badgeX += badgeW + 3;
    }

    // Stats panel
    const statsX = 66;
    const statsY = 22;
    const statNames = ['HP', 'ATK', 'DEF', 'SP.A', 'SP.D', 'SPD'];
    const statValues = [
      data.stats.hp, data.stats.attack, data.stats.defense,
      data.stats.specialAttack, data.stats.specialDefense, data.stats.speed,
    ];
    const statColors = ['#f85888', '#f08030', '#f8d030', '#6890f0', '#78c850', '#f85888'];
    const maxStat = 255; // Max base stat possible
    const barMaxW = 80;

    for (let i = 0; i < statNames.length; i++) {
      const sy = statsY + i * 16;
      drawText(ctx, statNames[i], statsX, sy, { size: 7, color: '#cccccc', font: 'monospace' });
      drawText(ctx, String(statValues[i]), statsX + 32, sy, { size: 7, color: '#ffffff', font: 'monospace' });

      // Stat bar background
      const barX = statsX + 50;
      fillRect(ctx, barX, sy + 2, barMaxW, 5, '#402020');
      // Stat bar fill
      const barW = Math.floor((statValues[i] / maxStat) * barMaxW);
      fillRect(ctx, barX, sy + 2, barW, 5, statColors[i]);
    }

    // Bottom hint
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#481818');
    drawText(ctx, 'Esc: Back', 4, SCREEN_H - 11, { size: 7, color: '#cccccc', font: 'monospace' });
  }
}
