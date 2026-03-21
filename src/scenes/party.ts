/**
 * PartyScene - Pokemon party management screen.
 *
 * Shows up to 6 Pokemon in a vertical list with sprites, names, levels, HP bars, and type badges.
 * Enter opens detail view (stats, moves, XP). Swap mode lets reorder party.
 * P key from overworld pushes this scene; Escape pops back.
 */

import type { Scene, Pokemon, PokemonType } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawText, drawRect } from '../engine/renderer.js';
import { t } from '../i18n/i18n.js';
import { getPlayerData } from '../systems/game-state.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
const MAX_PARTY = 6;
const SLOT_HEIGHT = 22;
const SLOT_START_Y = 16;
const SLOT_X = 4;
const SLOT_W = SCREEN_W - 8;

/** Type badge color palette. */
const TYPE_COLORS: Record<PokemonType, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  glitch: '#ff00ff',
};

type ViewMode = 'list' | 'detail' | 'swap';

export function createPartyScene(input: InputManager, stateMachine: StateMachine): Scene {
  let cursor = 0;
  let viewMode: ViewMode = 'list';
  let swapFrom = -1;

  function getParty(): Pokemon[] {
    return getPlayerData().party;
  }

  function loadPartySprites(): void {
    const party = getParty();
    for (const pokemon of party) {
      const frontUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
      const iconUrl = `/sprites/pokemon/icons/${pokemon.id}.png`;
      if (!getCachedImage(frontUrl)) loadImage(frontUrl).catch(() => {});
      if (!getCachedImage(iconUrl)) loadImage(iconUrl).catch(() => {});
    }
  }

  function getHpColor(ratio: number): string {
    if (ratio > 0.5) return '#20d860';
    if (ratio > 0.2) return '#f8c030';
    return '#f84038';
  }

  function renderSlot(ctx: CanvasRenderingContext2D, pokemon: Pokemon | null, index: number, isSelected: boolean, isSwapSource: boolean): void {
    const y = SLOT_START_Y + index * SLOT_HEIGHT;
    const bgColor = isSelected ? '#303060' : '#202040';

    fillRect(ctx, SLOT_X, y, SLOT_W, SLOT_HEIGHT - 2, bgColor);

    if (isSwapSource) {
      drawRect(ctx, SLOT_X, y, SLOT_W, SLOT_HEIGHT - 2, '#f8c030', 1);
    }

    if (!pokemon) {
      drawText(ctx, t('party.empty'), SLOT_X + 28, y + 7, { size: 8, color: '#666688' });
      return;
    }

    // Sprite (front sprite scaled for party list)
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sprite, SLOT_X - 8, y - 10, 40, 40);
      ctx.imageSmoothingEnabled = false;
    } else {
      fillRect(ctx, SLOT_X + 2, y + 1, 18, 18, '#445566');
    }

    // Name + Level
    const nameText = `${pokemon.name} Lv.${pokemon.level}`;
    drawText(ctx, nameText, SLOT_X + 24, y + 1, { size: 8, color: '#ffffff' });

    // HP bar
    const hpBarX = SLOT_X + 24;
    const hpBarY = y + 11;
    const hpBarW = 60;
    const hpBarH = 3;
    fillRect(ctx, hpBarX, hpBarY, hpBarW, hpBarH, '#303030');
    const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
    const hpFillW = Math.floor(hpBarW * Math.max(0, Math.min(1, hpRatio)));
    if (hpFillW > 0) {
      fillRect(ctx, hpBarX, hpBarY, hpFillW, hpBarH, getHpColor(hpRatio));
    }

    // HP numbers
    drawText(ctx, `${pokemon.hp}/${pokemon.maxHp}`, hpBarX + hpBarW + 2, hpBarY - 2, { size: 7, color: '#aaaacc' });

    // Type badges
    let typeX = SLOT_X + 160;
    for (const pType of pokemon.types) {
      const color = TYPE_COLORS[pType] || '#888888';
      const badgeW = 30;
      fillRect(ctx, typeX, y + 2, badgeW, 8, color);
      drawText(ctx, pType.toUpperCase().slice(0, 4), typeX + 1, y + 2, { size: 7, color: '#ffffff' });
      typeX += badgeW + 2;
    }
  }

  function renderListView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();

    // Title
    const title = viewMode === 'swap' ? t('party.swap') : t('party.title');
    drawText(ctx, title, SCREEN_W / 2, 3, { size: 8, color: '#ffffff', align: 'center' });

    // Slots
    for (let i = 0; i < MAX_PARTY; i++) {
      const pokemon = i < party.length ? party[i] : null;
      renderSlot(ctx, pokemon, i, i === cursor, viewMode === 'swap' && i === swapFrom);
    }

    // Controls hint
    drawText(ctx, 'ESC:Back  ENTER:Detail/Swap', SLOT_X, SCREEN_H - 10, { size: 7, color: '#666688' });
  }

  function renderDetailView(ctx: CanvasRenderingContext2D): void {
    const party = getParty();
    const pokemon = party[cursor];
    if (!pokemon) return;

    // Sprite (larger, 48x48)
    const spriteUrl = `/sprites/pokemon/front/${pokemon.id}.png`;
    const sprite = getCachedImage(spriteUrl);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, 0, 0, 64, 64);
    } else {
      fillRect(ctx, 8, 8, 48, 48, '#445566');
    }

    // Name + Level
    drawText(ctx, `${pokemon.name}  Lv.${pokemon.level}`, 62, 8, { size: 8, color: '#ffffff' });

    // Types
    let typeX = 62;
    for (const pType of pokemon.types) {
      const color = TYPE_COLORS[pType] || '#888888';
      fillRect(ctx, typeX, 19, 34, 9, color);
      drawText(ctx, pType.toUpperCase(), typeX + 2, 20, { size: 7, color: '#ffffff' });
      typeX += 36;
    }

    // Stats
    const statsX = 62;
    let statsY = 32;
    const statLabels: [string, number][] = [
      [t('party.stats.hp'), pokemon.maxHp],
      [t('party.stats.attack'), pokemon.attack],
      [t('party.stats.defense'), pokemon.defense],
      [t('party.stats.spAtk'), pokemon.specialAttack],
      [t('party.stats.spDef'), pokemon.specialDefense],
      [t('party.stats.speed'), pokemon.speed],
    ];
    for (const [label, value] of statLabels) {
      drawText(ctx, `${label}: ${value}`, statsX, statsY, { size: 7, color: '#ccccee' });
      statsY += 10;
    }

    // HP bar
    drawText(ctx, `${t('party.stats.hp')}: ${pokemon.hp}/${pokemon.maxHp}`, 8, 60, { size: 7, color: '#aaccff' });
    const hpBarX = 8;
    const hpBarY = 70;
    const hpBarW = 50;
    fillRect(ctx, hpBarX, hpBarY, hpBarW, 3, '#303030');
    const hpRatio = pokemon.maxHp > 0 ? pokemon.hp / pokemon.maxHp : 0;
    const hpFillW = Math.floor(hpBarW * Math.max(0, Math.min(1, hpRatio)));
    if (hpFillW > 0) {
      fillRect(ctx, hpBarX, hpBarY, hpFillW, 3, getHpColor(hpRatio));
    }

    // XP bar
    const xpText = t('party.xp', { current: pokemon.xp, next: pokemon.xpToNext });
    drawText(ctx, xpText, 8, 78, { size: 7, color: '#88aaff' });
    const xpBarX = 8;
    const xpBarY = 88;
    const xpBarW = 50;
    fillRect(ctx, xpBarX, xpBarY, xpBarW, 3, '#303030');
    const xpRatio = pokemon.xpToNext > 0 ? pokemon.xp / pokemon.xpToNext : 0;
    const xpFillW = Math.floor(xpBarW * Math.max(0, Math.min(1, xpRatio)));
    if (xpFillW > 0) {
      fillRect(ctx, xpBarX, xpBarY, xpFillW, 3, '#5080ff');
    }

    // Moves
    drawText(ctx, 'MOVES', 8, 98, { size: 8, color: '#ffffff' });
    let moveY = 108;
    for (const move of pokemon.moves) {
      const moveColor = TYPE_COLORS[move.type] || '#888888';
      fillRect(ctx, 8, moveY, 4, 8, moveColor);
      drawText(ctx, `${move.name}`, 14, moveY, { size: 7, color: '#ddddff' });
      drawText(ctx, `PP ${move.currentPp}/${move.pp}`, 120, moveY, { size: 7, color: '#aaaacc' });
      moveY += 10;
    }

    // Controls hint
    drawText(ctx, 'ESC:Back', SLOT_X, SCREEN_H - 10, { size: 7, color: '#666688' });
  }

  return {
    enter(): void {
      cursor = 0;
      viewMode = 'list';
      swapFrom = -1;
      loadPartySprites();
    },

    exit(): void {},

    update(_dt: number): void {
      const party = getParty();
      const partyLen = party.length;

      if (viewMode === 'detail') {
        if (input.isKeyPressed('Escape')) {
          viewMode = 'list';
        }
        return;
      }

      // List or swap mode
      if (input.isKeyPressed('Escape')) {
        if (viewMode === 'swap') {
          viewMode = 'list';
          swapFrom = -1;
        } else {
          stateMachine.pop();
        }
        return;
      }

      if (input.isKeyPressed('ArrowUp')) {
        cursor = cursor > 0 ? cursor - 1 : Math.max(0, partyLen - 1);
      }
      if (input.isKeyPressed('ArrowDown')) {
        cursor = cursor < partyLen - 1 ? cursor + 1 : 0;
      }

      if (input.isKeyPressed('Enter')) {
        if (partyLen === 0) return;
        if (cursor >= partyLen) return;

        if (viewMode === 'swap') {
          // Complete the swap
          if (swapFrom !== cursor && swapFrom >= 0 && swapFrom < partyLen) {
            const temp = party[swapFrom];
            party[swapFrom] = party[cursor];
            party[cursor] = temp;
          }
          viewMode = 'list';
          swapFrom = -1;
        } else {
          // First Enter: open detail. Press S to initiate swap instead.
          viewMode = 'detail';
        }
      }

      // S key to start swap mode
      if (input.isKeyPressed('s') || input.isKeyPressed('S')) {
        if (partyLen > 1 && cursor < partyLen) {
          if (viewMode === 'list') {
            viewMode = 'swap';
            swapFrom = cursor;
          }
        }
      }
    },

    render(ctx: CanvasRenderingContext2D): void {
      clearScreen(ctx, '#181830');

      if (viewMode === 'detail') {
        renderDetailView(ctx);
      } else {
        renderListView(ctx);
      }
    },
  };
}
