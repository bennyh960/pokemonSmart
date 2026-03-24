/**
 * PokedexScene - Scrollable list of all 251 Pokemon with tabbed detail view.
 * D key in overworld opens this. Shows seen/unseen status from PlayerData.pokedex.
 *
 * Detail view tabs:
 *   0 = INFO (sprite, types, stats)
 *   1 = EVOLUTION (chain visualization)
 *   2 = TYPE MATCHUPS (weaknesses, resistances, immunities, strengths)
 *   3 = MOVES (learnset — placeholder until data available)
 *   4 = LOCATIONS (spawn areas from encounter tables)
 */

import type { Scene } from '../types/index.js';
import type { InputManager } from '../engine/input.js';
import type { StateMachine } from '../engine/state-machine.js';
import { clearScreen, fillRect, drawRect, drawText } from '../engine/renderer.js';
import { t, isRTL } from '../i18n/i18n.js';
import { getPlayerData, hasActiveGame } from '../systems/game-state.js';
import {
  getPokemon,
  getPokemonDisplayName,
  getMoveDisplayName,
  getEvolutionChain,
  getTypeEffectiveness,
  getAllTypes,
  getSpawnLocations,
  getLearnset,
  getMove,
  getPokemonHeight,
  getPokemonWeight,
  getPokemonCategory,
  getPokemonDescription,
} from '../services/pokemon-data.js';
import { loadImage, getCachedImage } from '../engine/sprite-loader.js';
import { LOGICAL_WIDTH as SCREEN_W, LOGICAL_HEIGHT as SCREEN_H } from '../engine/config.js';
import { TYPE_COLORS, getDamageClassLabel } from '../data/type-constants.js';
import { drawTypeBadge } from '../ui/type-badge.js';
import type { PokemonType } from '../types/index.js';

const BG_COLOR = '#301818';
const ENTRY_HEIGHT = 26;
const VISIBLE_ENTRIES = 5;
const TOTAL_POKEMON = 251;
const TAB_COUNT = 5;

const TAB_LABELS = ['INFO', 'EVO', 'TYPE', 'MOVES', 'AREA'];

type PokedexView = 'list' | 'detail';

export function createPokedexScene(input: InputManager, stateMachine: StateMachine): Scene {
  let cursor = 0;
  let scrollOffset = 0;
  let view: PokedexView = 'list';
  let detailTab = 0;
  let moveScrollOffset = 0;
  let locationScrollOffset = 0;

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

  /** Format a mapId like "route-1" into "Route 1" for display. */
  function formatMapName(mapId: string): string {
    const key = `map.${mapId}.name`;
    const translated = t(key);
    // If t() returned the key itself, it means no translation exists — format manually
    if (translated === key) {
      return mapId
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return translated;
  }

  return {
    enter(): void {
      cursor = 0;
      scrollOffset = 0;
      view = 'list';
      detailTab = 0;
      moveScrollOffset = 0;
      locationScrollOffset = 0;
      preloadVisibleSprites();
    },

    exit(): void {},

    update(_dt: number): void {
      if (view === 'detail') {
        if (input.isKeyPressed('Escape')) {
          view = 'list';
          return;
        }
        if (input.isKeyPressed('ArrowLeft')) {
          detailTab = (detailTab - 1 + TAB_COUNT) % TAB_COUNT;
          moveScrollOffset = 0;
          locationScrollOffset = 0;
        }
        if (input.isKeyPressed('ArrowRight')) {
          detailTab = (detailTab + 1) % TAB_COUNT;
          moveScrollOffset = 0;
          locationScrollOffset = 0;
        }
        // Scrolling within scrollable tabs
        if (input.isKeyPressed('ArrowUp')) {
          if (detailTab === 3) {
            moveScrollOffset = Math.max(0, moveScrollOffset - 1);
          } else if (detailTab === 4) {
            locationScrollOffset = Math.max(0, locationScrollOffset - 1);
          }
        }
        if (input.isKeyPressed('ArrowDown')) {
          if (detailTab === 3) {
            moveScrollOffset++;
          } else if (detailTab === 4) {
            locationScrollOffset++;
          }
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
          detailTab = 0;
          moveScrollOffset = 0;
          locationScrollOffset = 0;
          loadImage(`/sprites/pokemon/front/${id}.png`).catch(() => {});
          // Preload evolution chain sprites
          const chain = getEvolutionChain(id);
          if (chain) {
            for (const stage of chain.stages) {
              loadImage(`/sprites/pokemon/front/${stage.id}.png`).catch(() => {});
            }
          }
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
            const color = TYPE_COLORS[type as PokemonType] || '#a8a878';
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

  // ─── Detail View (tabbed) ────────────────────────────────────────────

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
      fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#481818');
      drawText(ctx, 'Esc: Back', 4, SCREEN_H - 11, { size: 7, color: '#cccccc', font: 'monospace' });
      return;
    }

    // Name in title bar
    drawText(ctx, getPokemonDisplayName(id), 40, 3, { size: 8, color: '#ffffff', font: 'monospace' });

    // Tab indicators (y=16..28)
    renderTabBar(ctx);

    // Tab content area starts at y=30, ends at y=SCREEN_H-14
    const contentY = 30;
    switch (detailTab) {
      case 0: renderTabInfo(ctx, id, data, contentY); break;
      case 1: renderTabEvolution(ctx, id, contentY); break;
      case 2: renderTabTypeMatchups(ctx, data, contentY); break;
      case 3: renderTabMoves(ctx, id, contentY); break;
      case 4: renderTabLocations(ctx, id, contentY); break;
    }

    // Bottom bar
    fillRect(ctx, 0, SCREEN_H - 14, SCREEN_W, 14, '#481818');
    const helpParts: string[] = [];
    helpParts.push('\u25c0\u25b6 Tab');
    if (detailTab === 3 || detailTab === 4) {
      helpParts.push('\u25b2\u25bc Scroll');
    }
    helpParts.push('Esc: Back');
    drawText(ctx, helpParts.join('  '), 4, SCREEN_H - 11, { size: 7, color: '#cccccc', font: 'monospace' });
  }

  function renderTabBar(ctx: CanvasRenderingContext2D): void {
    fillRect(ctx, 0, 16, SCREEN_W, 13, '#401818');
    const tabWidth = SCREEN_W / TAB_COUNT;
    for (let i = 0; i < TAB_COUNT; i++) {
      const x = Math.floor(i * tabWidth);
      const w = Math.floor(tabWidth);
      const isActive = i === detailTab;
      if (isActive) {
        fillRect(ctx, x, 16, w, 13, '#582828');
        fillRect(ctx, x, 27, w, 2, '#f8a878');
      }
      const labelColor = isActive ? '#f8a878' : '#806060';
      const labelX = x + Math.floor(w / 2);
      drawText(ctx, TAB_LABELS[i], labelX, 19, { size: 7, color: labelColor, font: 'monospace', align: 'center' });
    }
  }

  // ─── Tab 0: INFO ─────────────────────────────────────────────────────

  function renderTabInfo(ctx: CanvasRenderingContext2D, id: number, data: NonNullable<ReturnType<typeof getPokemon>>, contentY: number): void {
    // Large sprite
    const sprite = getCachedImage(`/sprites/pokemon/front/${id}.png`);
    const spriteX = 0;
    const spriteY = contentY;
    const spriteSize = 64;
    fillRect(ctx, spriteX - 1, spriteY - 1, spriteSize + 2, spriteSize + 2, '#402020');
    if (sprite) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, spriteX, spriteY, spriteSize, spriteSize);
    } else {
      fillRect(ctx, spriteX, spriteY, spriteSize, spriteSize, '#584040');
    }

    // Type badges below sprite (localized, full mode)
    let badgeX = spriteX;
    const badgeY = spriteY + spriteSize + 4;
    for (const type of data.types) {
      const badgeW = drawTypeBadge(ctx, type as PokemonType, badgeX, badgeY, 'full');
      badgeX += badgeW + 3;
    }

    // Height / Weight below type badges
    let metaY = badgeY + 14;
    const height = getPokemonHeight(id);
    const weight = getPokemonWeight(id);
    if (height !== '?' || weight !== '?') {
      const parts: string[] = [];
      if (height !== '?') parts.push(`Height: ${height}`);
      if (weight !== '?') parts.push(`Weight: ${weight}`);
      drawText(ctx, parts.join('  '), spriteX, metaY, { size: 6, color: '#cccccc', font: 'monospace' });
      metaY += 10;
    }

    // Category
    const category = getPokemonCategory(id);
    if (category) {
      drawText(ctx, category, spriteX, metaY, { size: 6, color: '#a08080', font: 'monospace' });
      metaY += 10;
    }

    // Pokedex description / flavor text (word-wrapped)
    const description = getPokemonDescription(id);
    if (description) {
      const maxLineChars = 30;
      const words = description.split(' ');
      let line = '';
      for (const word of words) {
        const test = line ? line + ' ' + word : word;
        if (test.length > maxLineChars && line) {
          drawText(ctx, line, spriteX, metaY, { size: 6, color: '#a8a8a8', font: 'monospace' });
          metaY += 9;
          line = word;
        } else {
          line = test;
        }
      }
      if (line) {
        drawText(ctx, line, spriteX, metaY, { size: 6, color: '#a8a8a8', font: 'monospace' });
      }
    }

    // Stats panel
    const statsX = 66;
    const statsY = contentY + 4;
    const statNames = ['HP', 'ATK', 'DEF', 'SP.A', 'SP.D', 'SPD'];
    const statValues = [
      data.stats.hp, data.stats.attack, data.stats.defense,
      data.stats.specialAttack, data.stats.specialDefense, data.stats.speed,
    ];
    const statColors = ['#f85888', '#f08030', '#f8d030', '#6890f0', '#78c850', '#f85888'];
    const maxStat = 255;
    const barMaxW = 80;

    for (let i = 0; i < statNames.length; i++) {
      const sy = statsY + i * 16;
      drawText(ctx, statNames[i], statsX, sy, { size: 7, color: '#cccccc', font: 'monospace' });
      drawText(ctx, String(statValues[i]), statsX + 32, sy, { size: 7, color: '#ffffff', font: 'monospace' });

      const barX = statsX + 50;
      fillRect(ctx, barX, sy + 2, barMaxW, 5, '#402020');
      const barW = Math.floor((statValues[i] / maxStat) * barMaxW);
      fillRect(ctx, barX, sy + 2, barW, 5, statColors[i]);
    }
  }

  // ─── Tab 1: EVOLUTION ────────────────────────────────────────────────

  function renderTabEvolution(ctx: CanvasRenderingContext2D, id: number, contentY: number): void {
    const chain = getEvolutionChain(id);

    if (!chain || chain.stages.length <= 1) {
      drawText(ctx, 'Does not evolve', SCREEN_W / 2, contentY + 40, {
        size: 8, color: '#807070', font: 'monospace', align: 'center',
      });
      return;
    }

    const stages = chain.stages;
    const spriteSize = 32;
    const arrowSpace = 30;
    const stageWidth = spriteSize + arrowSpace;
    const totalWidth = stages.length * spriteSize + (stages.length - 1) * arrowSpace;
    const startX = Math.max(4, Math.floor((SCREEN_W - totalWidth) / 2));
    const centerY = contentY + 20;

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const x = startX + i * stageWidth;
      const isCurrent = stage.id === id;

      // Background highlight for current stage
      if (isCurrent) {
        fillRect(ctx, x - 2, centerY - 2, spriteSize + 4, spriteSize + 4, '#582828');
        drawRect(ctx, x - 2, centerY - 2, spriteSize + 4, spriteSize + 4, '#f8a878');
      } else {
        fillRect(ctx, x - 1, centerY - 1, spriteSize + 2, spriteSize + 2, '#402020');
      }

      // Sprite
      const sprite = getCachedImage(`/sprites/pokemon/front/${stage.id}.png`);
      if (sprite) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sprite, x, centerY, spriteSize, spriteSize);
        ctx.imageSmoothingEnabled = false;
      } else {
        fillRect(ctx, x, centerY, spriteSize, spriteSize, '#584040');
      }

      // Name below sprite
      const name = getPokemonDisplayName(stage.id);
      const nameColor = isCurrent ? '#f8a878' : '#cccccc';
      drawText(ctx, name, x + spriteSize / 2, centerY + spriteSize + 4, {
        size: 6, color: nameColor, font: 'monospace', align: 'center',
      });

      // Arrow and evolution info between stages
      if (i < stages.length - 1) {
        const nextStage = stages[i + 1];
        const arrowX = x + spriteSize + 2;
        const arrowY = centerY + spriteSize / 2 - 4;

        drawText(ctx, '\u2192', arrowX + 4, arrowY, { size: 8, color: '#f8a878', font: 'monospace' });

        // Evolution method text
        let evoText = '';
        if (nextStage.minLevel) {
          evoText = `Lv.${nextStage.minLevel}`;
        } else if (nextStage.item) {
          evoText = nextStage.item;
        } else if (nextStage.trigger) {
          evoText = nextStage.trigger;
        }
        if (evoText) {
          drawText(ctx, evoText, arrowX + 4, arrowY + 10, {
            size: 5, color: '#a08080', font: 'monospace',
          });
        }
      }
    }
  }

  // ─── Tab 2: TYPE MATCHUPS ────────────────────────────────────────────

  function renderTabTypeMatchups(ctx: CanvasRenderingContext2D, data: NonNullable<ReturnType<typeof getPokemon>>, contentY: number): void {
    const allTypes = getAllTypes();
    const pokemonTypes = data.types;

    // Compute defensive matchups
    const weakTo: string[] = [];
    const resistantTo: string[] = [];
    const immuneTo: string[] = [];

    for (const atkType of allTypes) {
      let multiplier = 1;
      for (const defType of pokemonTypes) {
        multiplier *= getTypeEffectiveness(atkType as any, defType as any);
      }
      if (multiplier === 0) {
        immuneTo.push(atkType);
      } else if (multiplier >= 2) {
        weakTo.push(atkType);
      } else if (multiplier > 0 && multiplier <= 0.5) {
        resistantTo.push(atkType);
      }
    }

    // Compute offensive matchups (STAB super-effective)
    const strongAgainst: string[] = [];
    for (const stabType of pokemonTypes) {
      for (const defType of allTypes) {
        const eff = getTypeEffectiveness(stabType as any, defType as any);
        if (eff >= 2 && !strongAgainst.includes(defType)) {
          strongAgainst.push(defType);
        }
      }
    }

    let y = contentY;
    const sectionGap = 2;

    y = renderTypeSection(ctx, 'WEAK TO:', weakTo, y);
    y += sectionGap;
    y = renderTypeSection(ctx, 'RESISTS:', resistantTo, y);
    y += sectionGap;
    if (immuneTo.length > 0) {
      y = renderTypeSection(ctx, 'IMMUNE:', immuneTo, y);
      y += sectionGap;
    }
    renderTypeSection(ctx, 'STRONG VS:', strongAgainst, y);
  }

  function renderTypeSection(ctx: CanvasRenderingContext2D, header: string, types: string[], startY: number): number {
    let y = startY;
    drawText(ctx, header, 4, y, { size: 7, color: '#f8a878', font: 'monospace' });
    y += 10;

    if (types.length === 0) {
      drawText(ctx, '\u2014', 8, y, { size: 7, color: '#584040', font: 'monospace' });
      y += 10;
      return y;
    }

    let x = 4;
    for (const type of types) {
      // Estimate badge width for wrapping check
      const estW = 30;
      if (x + estW > SCREEN_W - 4) {
        x = 4;
        y += 12;
      }

      const badgeW = drawTypeBadge(ctx, type as PokemonType, x, y, 'short');
      x += badgeW + 3;
    }
    y += 12;
    return y;
  }

  // ─── Tab 3: MOVES ───────────────────────────────────────────────────

  function renderTabMoves(ctx: CanvasRenderingContext2D, id: number, contentY: number): void {
    const learnset = getLearnset(id);

    if (learnset.length === 0) {
      drawText(ctx, 'No data available', SCREEN_W / 2, contentY + 40, {
        size: 8, color: '#807070', font: 'monospace', align: 'center',
      });
      return;
    }

    const maxVisible = 9;
    const maxScroll = Math.max(0, learnset.length - maxVisible);
    if (moveScrollOffset > maxScroll) moveScrollOffset = maxScroll;

    drawText(ctx, t('pokedex.moves.byLevel'), 4, contentY, { size: 7, color: '#f8a878', font: 'monospace' });

    const rowH = 12;
    const startY = contentY + 12;

    for (let i = 0; i < maxVisible; i++) {
      const idx = moveScrollOffset + i;
      if (idx >= learnset.length) break;

      const entry = learnset[idx];
      const moveData = getMove(entry.moveId);
      const y = startY + i * rowH;

      // Level
      const lvText = entry.levelLearned === 0 ? '  -' : `Lv${String(entry.levelLearned).padStart(2, ' ')}`;
      drawText(ctx, lvText, 4, y, { size: 6, color: '#a08080', font: 'monospace' });

      // Type color bar
      if (moveData) {
        const typeColor = TYPE_COLORS[moveData.type as PokemonType] || '#a8a878';
        fillRect(ctx, 30, y + 1, 4, 6, typeColor);
      }

      // Move name (English from API)
      const moveName = moveData ? getMoveDisplayName(entry.moveId) : `Move #${entry.moveId}`;
      drawText(ctx, moveName, 37, y, { size: 6, color: '#ffffff', font: 'monospace' });

      // Power
      const power = moveData?.power ? String(moveData.power) : '\u2014';
      drawText(ctx, power, 160, y, { size: 6, color: '#cccccc', font: 'monospace' });

      // PP
      if (moveData) {
        drawText(ctx, `PP${moveData.pp}`, 185, y, { size: 6, color: '#aaaacc', font: 'monospace' });
      }

      // Damage class symbol
      if (moveData?.damageClass) {
        const dcLabel = getDamageClassLabel(moveData.damageClass);
        drawText(ctx, dcLabel.symbol, 218, y, { size: 6, color: '#cccccc', font: 'monospace' });
      }
    }

    // Scroll indicators
    if (moveScrollOffset > 0) {
      drawText(ctx, '\u25b2', SCREEN_W - 10, startY - 2, { size: 7, color: '#f8a878', font: 'monospace' });
    }
    if (moveScrollOffset + maxVisible < learnset.length) {
      drawText(ctx, '\u25bc', SCREEN_W - 10, startY + maxVisible * rowH, { size: 7, color: '#f8a878', font: 'monospace' });
    }

    // Learnable moves section (TM/HM/egg — TODO: Add TM/HM/egg move data from PokeAPI)
    if (moveScrollOffset + maxVisible >= learnset.length) {
      const sectionY = startY + Math.min(learnset.length - moveScrollOffset, maxVisible) * rowH + 4;
      drawText(ctx, t('pokedex.moves.learnable'), 4, sectionY, { size: 7, color: '#f8a878', font: 'monospace' });
      drawText(ctx, t('pokedex.moves.noData'), 8, sectionY + 12, { size: 6, color: '#807070', font: 'monospace' });
    }
  }

  // ─── Tab 4: LOCATIONS ────────────────────────────────────────────────

  function renderTabLocations(ctx: CanvasRenderingContext2D, id: number, contentY: number): void {
    const locations = getSpawnLocations(id);

    if (locations.length === 0) {
      drawText(ctx, 'Location unknown', SCREEN_W / 2, contentY + 40, {
        size: 8, color: '#807070', font: 'monospace', align: 'center',
      });
      return;
    }

    // Clamp scroll offset
    const maxVisible = 9;
    const maxScroll = Math.max(0, locations.length - maxVisible);
    if (locationScrollOffset > maxScroll) locationScrollOffset = maxScroll;

    // Header
    drawText(ctx, 'FOUND IN:', 4, contentY, { size: 7, color: '#f8a878', font: 'monospace' });

    const rowH = 12;
    const startY = contentY + 12;

    for (let i = 0; i < maxVisible; i++) {
      const idx = locationScrollOffset + i;
      if (idx >= locations.length) break;

      const loc = locations[idx];
      const y = startY + i * rowH;
      const mapName = formatMapName(loc.mapId);
      const levelRange = `Lv.${loc.minLevel}-${loc.maxLevel}`;

      drawText(ctx, mapName, 8, y, { size: 7, color: '#ffffff', font: 'monospace' });
      drawText(ctx, levelRange, SCREEN_W - 8, y, { size: 7, color: '#cccccc', font: 'monospace', align: 'right' });
    }

    // Scroll indicators
    if (locationScrollOffset > 0) {
      drawText(ctx, '\u25b2', SCREEN_W - 10, startY - 2, { size: 7, color: '#f8a878', font: 'monospace' });
    }
    if (locationScrollOffset + maxVisible < locations.length) {
      drawText(ctx, '\u25bc', SCREEN_W - 10, startY + maxVisible * rowH, { size: 7, color: '#f8a878', font: 'monospace' });
    }
  }
}
